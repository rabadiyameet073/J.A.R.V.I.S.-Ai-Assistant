"""
ASR (Automatic Speech Recognition) Service
Thread-safe microphone listener with wake-word detection.
Pipeline: Mic stream → Wake word → Phrase capture → Google STT → text
"""

from __future__ import annotations
import threading
import queue
import time
from typing import Optional, Callable
from backend.core.logger import log
from backend.core.config import (
    ASR_TIMEOUT, ASR_PHRASE_LIMIT,
    ASR_MAX_RETRIES, ENERGY_THRESHOLD, DYNAMIC_ENERGY,
)
from backend.core import config as cfg

# ── Optional imports ───────────────────────────────────────────────────────
try:
    import speech_recognition as sr
    _SR_AVAILABLE = True
except ImportError:
    sr = None  # type: ignore
    _SR_AVAILABLE = False
    log.warning("speechrecognition not found. Install: pip install speechrecognition pyaudio")


def _transcript_matches_wake(text: str) -> bool:
    """Match wake aliases: ASCII substrings are case-insensitive; Unicode aliases exact in transcript."""
    t = text.strip()
    t_lower = t.lower()
    ww = (getattr(cfg, "WAKE_WORD", "") or "").strip().lower()
    if ww and len(ww) > 1 and ww in t_lower:
        return True
    for alias in cfg.WAKE_WORD_ALIASES:
        if not alias:
            continue
        if alias.isascii():
            if alias.lower() in t_lower:
                return True
        elif alias in t:
            return True
    return False


class ASRService:
    """
    Continuous microphone listener.
    Detects wake word then captures full command phrase.
    Callback-driven: register on_command(text) handler.
    """

    def __init__(self) -> None:
        self._available = _SR_AVAILABLE
        self._recognizer: Optional[object] = None
        self._microphone: Optional[object] = None
        self._running = False
        self._listen_thread: Optional[threading.Thread] = None
        self._command_queue: queue.Queue[str] = queue.Queue()
        self._voice_failures = 0
        self._wake_mode = True          # True = waiting for wake word
        self._on_command: Optional[Callable[[str], None]] = None
        self._on_wake: Optional[Callable[[], None]] = None
        self._on_listening: Optional[Callable[[bool], None]] = None
        # Mute flag: set to True while TTS is speaking to avoid echo
        self._muted = False
        self._processing_command = False  # Guard: prevent overlapping command processing

        if self._available:
            self._init_recognizer()

    def _init_recognizer(self) -> None:
        try:
            self._recognizer = sr.Recognizer()  # type: ignore
            self._recognizer.energy_threshold = ENERGY_THRESHOLD  # type: ignore
            self._recognizer.dynamic_energy_threshold = DYNAMIC_ENERGY  # type: ignore
            self._recognizer.dynamic_energy_adjustment_damping = 0.15  # type: ignore
            self._recognizer.pause_threshold = 0.8  # type: ignore

            mic_list = sr.Microphone.list_microphone_names()  # type: ignore
            if not mic_list:
                log.warning("No microphones found — keyboard-only mode")
                self._available = False
                return

            for i, name in enumerate(mic_list):
                try:
                    with sr.Microphone(device_index=i) as source:  # type: ignore
                        self._recognizer.adjust_for_ambient_noise(source, duration=1.5)  # type: ignore
                        if self._recognizer.energy_threshold > 1000:  # type: ignore
                            self._recognizer.energy_threshold = ENERGY_THRESHOLD  # type: ignore
                    self._microphone = sr.Microphone(device_index=i)  # type: ignore
                    log.info(f"Microphone ready: {name} (threshold={self._recognizer.energy_threshold:.0f})")  # type: ignore
                    break
                except Exception as e:
                    log.debug(f"Skipping mic {i}: {e}")
                    continue

            if self._microphone is None:
                log.warning("No working microphone — keyboard-only mode")
                self._available = False
        except Exception as e:
            log.error(f"ASR init error: {e}")
            self._available = False

    # ── Public API ─────────────────────────────────────────────────────────

    def register_callbacks(
        self,
        on_command: Optional[Callable[[str], None]] = None,
        on_wake: Optional[Callable[[], None]] = None,
        on_listening: Optional[Callable[[bool], None]] = None,
    ) -> None:
        self._on_command = on_command
        self._on_wake = on_wake
        self._on_listening = on_listening

    def set_muted(self, muted: bool) -> None:
        """Temporarily suppress ASR capture while TTS is speaking."""
        self._muted = muted

    def start(self) -> None:
        """Start the continuous listener thread."""
        if not self._available:
            log.info("ASR not available — listening thread skipped")
            return
        if self._running:
            return
        self._running = True
        self._listen_thread = threading.Thread(
            target=self._listen_loop, daemon=True, name="asr-listener"
        )
        self._listen_thread.start()
        log.info("ASR listening thread started")

    def stop(self) -> None:
        self._running = False
        if self._listen_thread:
            self._listen_thread.join(timeout=5)
        log.info("ASR stopped")

    def listen_once(self, timeout: float = ASR_TIMEOUT) -> Optional[str]:
        """
        Blocking: capture one phrase and return transcribed text.
        Returns None on failure. Called by HTTP endpoints for command input.
        """
        if not self._available:
            return None
        return self._capture_phrase(timeout=timeout, retries=ASR_MAX_RETRIES)

    # ── Internal ───────────────────────────────────────────────────────────

    def _listen_loop(self) -> None:
        """
        Continuous loop:
          WAKE_MODE  → listen for wake word phrase → on wake detected → COMMAND_MODE
          COMMAND_MODE → capture full command → pass to callback → back to WAKE_MODE

        Improvements:
          - Skips capture while _muted (TTS speaking / music playing)
          - Guards against overlapping command processing
          - Always resets to wake mode after any command (success or failure)
        """
        log.info("ASR loop running — say 'Hey Jarvis' to activate")
        _was_muted = False  # track transition muted → unmuted
        while self._running:
            try:
                # While muted (TTS speaking), pause and retry
                if self._muted:
                    _was_muted = True
                    time.sleep(0.3)
                    continue

                # Post-unmute cooldown: Windows SAPI5 holds the audio device
                # briefly after runAndWait() returns. Wait before reopening mic.
                if _was_muted:
                    _was_muted = False
                    time.sleep(0.6)   # let audio device fully release
                    continue

                text = self._capture_phrase(timeout=ASR_TIMEOUT)
                if text is None:
                    continue

                # Discard echo of TTS output (happens right after speaking)
                if self._muted:
                    log.debug(f"ASR discarded echo while muted: '{text}'")
                    _was_muted = True
                    continue

                if self._wake_mode:
                    # Check for wake word (supports Hindi/Gujarati script in aliases)
                    if _transcript_matches_wake(text):
                        log.info(f"Wake word detected: '{text}'")
                        self._wake_mode = False
                        if self._on_wake:
                            self._on_wake()
                    # else: keep waiting silently
                else:
                    # Command mode — guard against overlapping calls
                    if self._processing_command:
                        log.debug("ASR: already processing, discarding duplicate")
                        self._wake_mode = True
                        continue

                    log.info(f"Voice command received: '{text}'")
                    self._voice_failures = 0
                    self._processing_command = True
                    try:
                        if self._on_command:
                            self._on_command(text)
                    except Exception as ce:
                        log.error(f"ASR on_command error: {ce}", exc_info=True)
                    finally:
                        self._processing_command = False
                        self._wake_mode = True   # ALWAYS return to wake-word mode

            except Exception as e:
                log.error(f"ASR loop error: {e}")
                self._wake_mode = True  # Reset on error too
                self._processing_command = False
                time.sleep(1)

    def _capture_phrase(self, timeout: float = ASR_TIMEOUT, retries: int = ASR_MAX_RETRIES) -> Optional[str]:
        """Capture a phrase from microphone and return recognised text."""
        if not self._recognizer or not self._microphone:
            return None

        for attempt in range(1, retries + 2):
            try:
                if self._on_listening:
                    self._on_listening(True)

                with self._microphone as source:  # type: ignore
                    if self._recognizer.energy_threshold < 100:  # type: ignore
                        self._recognizer.adjust_for_ambient_noise(source, duration=0.3)  # type: ignore
                    audio = self._recognizer.listen(  # type: ignore
                        source,
                        timeout=timeout,
                        phrase_time_limit=ASR_PHRASE_LIMIT,
                    )

                if self._on_listening:
                    self._on_listening(False)

                text = self._recognizer.recognize_google(audio, language=cfg.ASR_LANGUAGE)  # type: ignore
                return text.strip()

            except Exception as e:
                if self._on_listening:
                    self._on_listening(False)

                # ── Classify the exception by TYPE NAME + message ────────────
                # WaitTimeoutError, RequestError etc. sometimes have empty messages
                exc_type = type(e).__name__.lower()          # e.g. "waittimeouterror"
                err_msg  = str(e).lower()                    # the message (may be "")
                err_both = exc_type + " " + err_msg         # combine for matching

                # Normal silence / no-speech timeout — not an error
                if any(t in err_both for t in ["waittimeout", "wait_timeout", "timeout"]):
                    return None

                # Speech not recognised clearly — return None silently (background noise, etc.)
                if any(t in err_both for t in ["unknown value", "unknownvalueerror",
                                               "could not understand", "recognition"]):
                    return None   # not an error — just noise / silence

                # Google API / network error
                if any(t in err_both for t in ["request", "connection", "network", "httperror", "urlerror"]):
                    log.warning(f"ASR API error ({type(e).__name__}): {e or 'no message'}")
                    time.sleep(1)   # back-off before retry
                    return None

                # Audio device / OS errors — log clearly and recover
                if any(t in err_both for t in ["oserror", "ioerror", "audio", "pyaudio", "stream"]):
                    log.warning(f"ASR audio device error ({type(e).__name__}): {e or 'no message'} — recovering")
                    time.sleep(1)
                    return None

                # Genuinely unexpected — log with full type so we can debug
                log.error(f"ASR unexpected error ({type(e).__name__}): {repr(e)}")
                time.sleep(0.5)

        return None

    def get_command_from_queue(self, timeout: float = 0.1) -> Optional[str]:
        """Non-blocking read from command queue."""
        try:
            return self._command_queue.get_nowait()
        except queue.Empty:
            return None

    @property
    def available(self) -> bool:
        return self._available

    @property
    def is_running(self) -> bool:
        return self._running


# ── Module-level singleton (thread-safe) ──────────────────────────────────
_asr_instance: Optional[ASRService] = None
_asr_lock = threading.Lock()


def get_asr() -> ASRService:
    global _asr_instance
    if _asr_instance is None:
        with _asr_lock:
            # Double-checked locking — re-check inside lock
            if _asr_instance is None:
                _asr_instance = ASRService()
    return _asr_instance
