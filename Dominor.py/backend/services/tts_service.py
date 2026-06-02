"""
TTS Service — thread-safe Text-to-Speech using pyttsx3.
Single engine instance, runs speech in a dedicated thread to avoid blocking.
"""

from __future__ import annotations
import threading
import queue
import time
from typing import Optional, Dict, Any, List, Tuple
from backend.core.logger import log
from backend.core import config as cfg
from backend.core.config import TTS_RATE, TTS_VOLUME, TTS_VOICE_INDEX


def _get_asr():
    """Lazy import to avoid circular dependency TTS → ASR."""
    try:
        from backend.services.asr_service import get_asr
        return get_asr()
    except Exception:
        return None

# ── Try to import pyttsx3 ─────────────────────────────────────────────────
try:
    import pyttsx3
    _TTS_AVAILABLE = True
except ImportError:
    pyttsx3 = None  # type: ignore
    _TTS_AVAILABLE = False
    log.warning("pyttsx3 not found — TTS disabled. Install: pip install pyttsx3")


def _bcp_primary(bcp47: str) -> str:
    s = (bcp47 or "en-US").strip().lower().replace("_", "-")
    return s.split("-")[0] if s else "en"


def assistant_voice_hints(bcp47: str) -> List[str]:
    """Lowercase substrings to match against pyttsx3 voice id + name (Windows SAPI / OneCore)."""
    p = _bcp_primary(bcp47)
    if p == "hi":
        return [
            "hindi", "hi-in", "hi_in", "hemant", "kalpana", "madhur",
            "microsoft hemant", "microsoft kalpana", "india",
        ]
    if p == "gu":
        return [
            "gujarati", "gu-in", "gu_in", "swara", "dhwani", "niranjan",
            "microsoft swara", "india",
        ]
    return [
        "english", "en-us", "en-gb", "en_us", "zira", "david", "mark",
        "susan", "hazel", "george", "microsoft zira", "microsoft david",
    ]


def localized_assistant_phrase(key: str, bcp47: str) -> str:
    """Short TTS lines for wake / settings — keyed by assistant language."""
    p = _bcp_primary(bcp47)
    wake = {
        "en": "Yes sir?",
        "hi": "जी सर, बताइए।",
        "gu": "હા સર, કહો.",
    }
    saved = {
        "en": "Settings updated, sir.",
        "hi": "सेटिंग अपडेट हो गई, सर।",
        "gu": "સેટિંગ્સ અપડેટ થઈ, સર.",
    }
    if key == "wake":
        return wake.get(p, wake["en"])
    if key == "settings_saved":
        return saved.get(p, saved["en"])
    return saved["en"]


class TTSService:
    """
    Thread-safe TTS wrapper.
    All speak() calls are queued and processed by a single background thread,
    preventing pyttsx3's 'run loop already started' error.
    """

    def __init__(self) -> None:
        self._engine: Optional[object] = None
        self._queue: queue.Queue[Optional[str]] = queue.Queue()
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self._available = _TTS_AVAILABLE
        self._running = False

        if self._available:
            self._init_engine()
            self._start_worker()

    # ── Initialise pyttsx3 engine ──────────────────────────────────────────
    def _init_engine(self) -> None:
        try:
            self._engine = pyttsx3.init()
            voices = self._engine.getProperty("voices")  # type: ignore
            if voices and len(voices) > TTS_VOICE_INDEX:
                self._engine.setProperty("voice", voices[TTS_VOICE_INDEX].id)  # type: ignore
            self._engine.setProperty("rate", TTS_RATE)    # type: ignore
            self._engine.setProperty("volume", TTS_VOLUME)  # type: ignore
            log.info(f"TTS engine initialised (rate={TTS_RATE}, volume={TTS_VOLUME})")
            # Match installed voice to current assistant language (same as ASR_LANGUAGE in config)
            try:
                lang = getattr(cfg, "ASR_LANGUAGE", "en-US") or "en-US"
                self.apply_assistant_language(lang)
            except Exception as e:
                log.debug(f"TTS initial voice locale skip: {e}")
        except Exception as e:
            log.error(f"TTS init failed: {e}")
            self._engine = None
            self._available = False

    # ── Background worker thread ────────────────────────────────────────────
    def _mute_asr(self, muted: bool) -> None:
        """Tell the ASR service to mute/unmute during TTS speech to avoid echo."""
        try:
            asr = _get_asr()
            if asr:
                asr.set_muted(muted)
        except Exception:
            pass

    def _worker(self) -> None:
        while self._running:
            try:
                text = self._queue.get(timeout=0.5)
                if text is None:          # sentinel → shutdown
                    break
                if self._engine and text.strip():
                    self._mute_asr(True)   # Mute mic while speaking
                    try:
                        with self._lock:
                            self._engine.say(text)   # type: ignore
                            self._engine.runAndWait()  # type: ignore
                    except RuntimeError as e:
                        if "run loop already started" in str(e).lower():
                            time.sleep(0.3)
                            try:
                                with self._lock:
                                    self._engine.say(text)   # type: ignore
                                    self._engine.runAndWait()  # type: ignore
                            except Exception:
                                log.warning(f"TTS retry failed: {e}")
                        else:
                            log.error(f"TTS RuntimeError: {e}")
                    except Exception as e:
                        log.error(f"TTS speak error: {e}")
                    finally:
                        # Un-mute after a brief cooldown so echo doesn't get captured
                        time.sleep(0.4)
                        self._mute_asr(False)
                else:
                    log.info(f"[JARVIS TTS] {text}")
                self._queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                log.error(f"TTS worker error: {e}")

    def _start_worker(self) -> None:
        self._running = True
        self._thread = threading.Thread(target=self._worker, daemon=True, name="tts-worker")
        self._thread.start()

    # ── Public API ─────────────────────────────────────────────────────────
    def speak(self, text: str) -> None:
        """Queue text for speech output. Non-blocking."""
        if not text or not text.strip():
            return
        log.info(f"[JARVIS] {text}")
        if self._available and self._engine:
            self._queue.put(text)
        else:
            print(f"JARVIS: {text}")

    def speak_sync(self, text: str, timeout: float = 15.0) -> None:
        """Speak and block until done (with timeout)."""
        self.speak(text)
        try:
            self._queue.join()
        except Exception:
            pass

    def shutdown(self) -> None:
        self._running = False
        if self._available:
            self._queue.put(None)  # sentinel
        if self._thread:
            self._thread.join(timeout=3)

    @property
    def available(self) -> bool:
        return self._available

    def apply_assistant_language(self, bcp47: str) -> Dict[str, Any]:
        """
        Select best installed voice for English / Hindi / Gujarati (BCP-47 tag).
        Updates pyttsx3 voice and cfg.TTS_VOICE_INDEX when possible.
        """
        out: Dict[str, Any] = {"success": False, "bcp47": bcp47, "voice_index": None, "voice_name": None}
        if not self._engine:
            return out
        bcp = (bcp47 or "en-US").strip().replace("_", "-") or "en-US"
        hints = assistant_voice_hints(bcp)
        try:
            voices = self._engine.getProperty("voices")  # type: ignore
        except Exception as e:
            log.warning(f"TTS list voices failed: {e}")
            return out
        if not voices:
            return out

        best: Tuple[int, int, str, str] = (-1, -1, "", "")  # score, index, id, name

        for i, v in enumerate(voices):
            vid = getattr(v, "id", "") or ""
            vname = getattr(v, "name", "") or ""
            langs = getattr(v, "languages", None) or []
            blob = f"{vid} {vname} {' '.join(str(x) for x in langs)}".lower()
            score = sum(1 for h in hints if h in blob)
            if _bcp_primary(bcp) == "en" and ("hindi" in blob or "gujarati" in blob):
                score = max(0, score - 2)
            if score > best[0]:
                best = (score, i, vid, vname)

        idx, vid, vname = best[1], best[2], best[3]
        if best[0] <= 0:
            idx, vid, vname = 0, getattr(voices[0], "id", ""), getattr(voices[0], "name", "")

        try:
            self._engine.setProperty("voice", vid)  # type: ignore
            cfg.TTS_VOICE_INDEX = idx  # type: ignore
            out.update({
                "success": True,
                "voice_index": idx,
                "voice_name": vname,
                "message": f"Using voice: {vname or vid}",
            })
            log.info(f"TTS voice set for {bcp!r} -> index {idx} ({vname})")
        except Exception as e:
            log.warning(f"TTS setProperty voice failed: {e}")
        return out


# ── Module-level singleton ─────────────────────────────────────────────────
_tts_instance: Optional[TTSService] = None


def get_tts() -> TTSService:
    global _tts_instance
    if _tts_instance is None:
        _tts_instance = TTSService()
    return _tts_instance
