# filepath: backend/voice_pipeline.py
"""
JARVIS Voice Pipeline Orchestrator
────────────────────────────────────────────────────────────────
Flow:
  Wake Word → Voice Capture → ASR → Validation →
  NLP (intent_classifier) → Intent Detection →
  Action Routing → Execute → TTS Response → Loop

This module is the single glue layer. It:
  1. Registers itself as the ASR on_command callback
  2. Classifies the command via intent_classifier
  3. Routes to the correct service function
  4. Speaks the response via TTS
  5. Broadcasts the result to all active WebSocket clients
────────────────────────────────────────────────────────────────
"""

from __future__ import annotations
import datetime
import time
from typing import Any, Dict, Optional, Callable, Set
from backend.core.intent_classifier import classify, Intent, IntentResult
from backend.core.logger import log
from backend.services.tts_service import get_tts, localized_assistant_phrase
from backend.core import config as cfg
from backend.services.asr_service import get_asr
from backend.services.ai_service import get_ai


# ── WebSocket broadcast registry ─────────────────────────────────────────
# The FastAPI server injects a broadcast callback so we can push pipeline
# events to the React dashboard in real-time.
_ws_broadcast: Optional[Callable[[dict], None]] = None


def set_ws_broadcast(callback: Callable[[dict], None]) -> None:
    """Register the WS broadcast function (called by main_server on startup)."""
    global _ws_broadcast
    _ws_broadcast = callback


def _broadcast(event: dict) -> None:
    if _ws_broadcast:
        try:
            _ws_broadcast(event)
        except Exception as e:
            log.debug(f"WS broadcast error: {e}")


# ═══════════════════════════════════════════════════════════════════════════
# Pipeline entry point
# ═══════════════════════════════════════════════════════════════════════════

def process_command(text: str, speak: bool = True, suppress_final_broadcast: bool = False) -> Dict[str, Any]:
    """
    Full pipeline: text → intent → action → TTS.
    Returns a dict with intent, params, response, success.
    """
    if not text or not text.strip():
        return {"success": False, "response": "", "intent": Intent.UNKNOWN}

    log.info(f"[Pipeline] Input: {text!r}")
    _broadcast({"type": "command", "text": text, "timestamp": _ts(), "channel": "pipeline"})

    # ── 1. Classify intent ────────────────────────────────────────────────
    result: IntentResult = classify(text)
    log.info(f"[Pipeline] Intent={result.intent} conf={result.confidence:.2f} params={result.params}")
    _broadcast({
        "type": "intent",
        "intent": result.intent,
        "confidence": result.confidence,
        "params": result.params,
        "timestamp": _ts(),
        "channel": "pipeline",
    })

    # ── 2. Route to action ────────────────────────────────────────────────
    response_text = _route(result)

    # ── 3. TTS ────────────────────────────────────────────────────────────
    if speak and response_text:
        get_tts().speak(response_text)

    if not suppress_final_broadcast:
        _broadcast({
            "type": "response",
            "response": response_text,
            "message": response_text,
            "intent": result.intent,
            "timestamp": _ts(),
            "channel": "command",
        })

    return {
        "success": True,
        "intent": result.intent,
        "confidence": result.confidence,
        "params": result.params,
        "response": response_text,
        "raw_text": text,
    }


def _ts() -> str:
    return datetime.datetime.now().isoformat(timespec="seconds")


# ═══════════════════════════════════════════════════════════════════════════
# Action Router
# ═══════════════════════════════════════════════════════════════════════════

def _route(result: IntentResult) -> str:
    intent = result.intent
    params = result.params
    text   = result.raw_text.lower()

    try:
        # ── Greeting / farewell ───────────────────────────────────────────
        if intent == Intent.GREETING:
            return _greet()

        if intent == Intent.FAREWELL:
            return "Goodbye, sir. Shutting down JARVIS. Have a great day!"

        # ── Time / Date ───────────────────────────────────────────────────
        if intent == Intent.TIME:
            now = datetime.datetime.now()
            if any(w in text for w in ["date", "day", "today"]):
                return f"Today is {now.strftime('%A, %d %B %Y')}, sir."
            return f"The current time is {now.strftime('%I:%M %p')}, sir."

        # ── System power ──────────────────────────────────────────────────
        if intent == Intent.SYSTEM_POWER:
            from backend.services.system_service import power_action
            action = params.get("action", "shutdown")
            res = power_action(action)
            return res["message"]

        # ── System info ───────────────────────────────────────────────────
        if intent == Intent.SYSTEM_INFO:
            from backend.services.system_service import get_system_info
            info = get_system_info()
            parts = []
            if "cpu_percent" in info:
                parts.append(f"CPU at {info['cpu_percent']}%")
            if "ram_percent" in info:
                parts.append(f"RAM at {info['ram_percent']}%")
            if "battery_percent" in info:
                plug = "charging" if info.get("battery_plugged") else "on battery"
                parts.append(f"battery {info['battery_percent']}% {plug}")
            if "local_ip" in info:
                parts.append(f"local IP {info['local_ip']}")
            summary = ", ".join(parts) if parts else "System info collected."
            return f"System status: {summary}, sir."

        # ── Volume ────────────────────────────────────────────────────────
        if intent == Intent.VOLUME:
            from backend.services.system_service import volume_control
            action = params.get("action", "up")
            level = params.get("level")
            res = volume_control(action, level)
            return res["message"]

        # ── Display ───────────────────────────────────────────────────────
        if intent == Intent.DISPLAY:
            from backend.services.system_service import display_action
            action = params.get("action", "off")
            res = display_action(action)
            return res["message"]

        # ── Network ───────────────────────────────────────────────────────
        if intent == Intent.NETWORK:
            from backend.services.system_service import check_internet, network_info
            internet = check_internet()
            net = network_info()
            return f"{internet['message']} Your local IP is {net.get('local_ip', 'unknown')}, sir."

        # ── Open App ──────────────────────────────────────────────────────
        if intent == Intent.OPEN_APP:
            from backend.services.system_service import open_app
            app = params.get("app_name") or params.get("app") or text
            res = open_app(app)
            return res["message"]

        # ── Open Website ──────────────────────────────────────────────────
        if intent == Intent.OPEN_WEBSITE:
            from backend.services.system_service import open_website
            site = params.get("url") or params.get("site_name") or params.get("site") or text
            res = open_website(site)
            return res["message"]

        # ── Media ─────────────────────────────────────────────────────────
        if intent == Intent.MEDIA:
            return _handle_media(params, text)

        # ── Files ─────────────────────────────────────────────────────────
        if intent == Intent.FILES:
            return _handle_files(params, text)

        # ── Screenshot ────────────────────────────────────────────────────
        if intent == Intent.SCREENSHOT:
            from backend.services.files_service import take_screenshot
            res = take_screenshot()
            return res["message"]

        # ── Communication ─────────────────────────────────────────────────
        if intent == Intent.COMMUNICATION:
            return _handle_communication(params, text)

        # ── Timer ─────────────────────────────────────────────────────────
        if intent == Intent.TIMER:
            from backend.services.timers_service import get_timers
            duration_str = params.get("duration", text)
            timers = get_timers()
            timers.set_speak_callback(get_tts().speak)
            res = timers.set_timer(duration_str)
            return res["message"]

        # ── Alarm ─────────────────────────────────────────────────────────
        if intent == Intent.ALARM:
            from backend.services.timers_service import get_timers
            time_str = params.get("time", text)
            res = get_timers().set_alarm(time_str)
            return res["message"]

        # ── Calculator ────────────────────────────────────────────────────
        if intent == Intent.CALCULATOR:
            from backend.services.timers_service import calculate
            res = calculate(params.get("expression", text))
            if res.get("success"):
                return f"The answer is {res['answer']}, sir."
            return res.get("message", "I could not compute that, sir.")

        # ── Weather ───────────────────────────────────────────────────────
        if intent == Intent.WEATHER:
            from backend.services.weather_service import get_weather
            city = params.get("city", "")
            res = get_weather(city)
            return res.get("message", "Could not get weather.")

        # ── Web Search ────────────────────────────────────────────────────
        if intent == Intent.WEB_SEARCH:
            from backend.services.communication_service import web_search
            query = params.get("query", text)
            res = web_search(query)
            # Also try to get an AI/web answer
            ai_answer = get_ai().quick_prompt(query)
            if ai_answer:
                return ai_answer
            return res.get("message", f"Searching for {query}, sir.")

        # ── AI Chat ───────────────────────────────────────────────────────
        if intent == Intent.AI_CHAT:
            query = params.get("query", text)
            return get_ai().chat(query)

        # ── Reset Chat ────────────────────────────────────────────────────
        if intent == Intent.RESET_CHAT:
            get_ai().reset_history()
            return "Conversation history cleared, sir."

        # ── Reminder ──────────────────────────────────────────────────────
        if intent == Intent.REMINDER:
            task = params.get("task", text)
            time_str = params.get("time", "")
            _save_reminder(task, time_str)
            return f"Reminder set: {task}, sir."

        # ── Help ──────────────────────────────────────────────────────────
        if intent == Intent.HELP:
            return _help_text()

        # ── Fallback ──────────────────────────────────────────────────────
        return get_ai().chat(text)

    except Exception as e:
        log.error(f"[Pipeline] Route error for intent={intent}: {e}", exc_info=True)
        return f"I encountered an error processing that request, sir. {str(e)[:80]}"


# ═══════════════════════════════════════════════════════════════════════════
# Sub-handlers
# ═══════════════════════════════════════════════════════════════════════════

def _greet() -> str:
    hour = datetime.datetime.now().hour
    if 5 <= hour < 12:
        period = "morning"
    elif 12 <= hour < 17:
        period = "afternoon"
    elif 17 <= hour < 21:
        period = "evening"
    else:
        period = "night"
    return f"Good {period}, sir. J.A.R.V.I.S. is online and ready. How may I assist you?"


def _handle_media(params: dict, text: str) -> str:
    from backend.services.music_service import get_music
    music = get_music()
    action = params.get("action", "play_name")

    # ── Stop / pause ──────────────────────────────────────────────────────
    stop_words  = ["stop", "stop music", "stop song", "stop the music", "stop the song",
                   "stop playing", "end music", "end song", "kill music", "cancel music"]
    pause_words = ["pause", "pause music", "pause song", "pause the music", "hold on"]
    resume_words = ["resume", "resume music", "resume song", "continue music", "continue song",
                    "unpause", "resume playing", "keep playing"]
    next_words  = ["next", "next song", "next track", "skip", "skip song", "skip track"]
    prev_words  = ["previous", "previous song", "previous track", "last song", "go back",
                   "back song", "earlier song"]

    if any(w in text for w in stop_words):
        return music.stop()["message"]
    if any(w in text for w in pause_words):
        return music.pause()["message"]
    if any(w in text for w in resume_words):
        return music.resume()["message"]

    # Next / previous (scan library and play next/prev alphabetically)
    if any(w in text for w in next_words):
        status = music.get_status()
        cur = status.get("current_file")
        if cur:
            import os, glob
            from backend.core.config import AUDIO_EXTENSIONS, MUSIC_SEARCH_PATHS
            files: list = []
            for folder in MUSIC_SEARCH_PATHS:
                folder = os.path.expandvars(os.path.expanduser(folder))
                if not os.path.isdir(folder):
                    continue
                for ext in AUDIO_EXTENSIONS:
                    files.extend(glob.glob(os.path.join(folder, "**", f"*{ext}"), recursive=True))
            files.sort(key=lambda f: os.path.basename(f).lower())
            try:
                idx = files.index(cur)
                nxt = files[(idx + 1) % len(files)]
            except ValueError:
                import random
                nxt = random.choice(files) if files else None
            if nxt:
                return music.play_file(nxt)["message"]
        res = music.play_random()
        return res["message"]

    if any(w in text for w in prev_words):
        status = music.get_status()
        cur = status.get("current_file")
        if cur:
            import os, glob
            from backend.core.config import AUDIO_EXTENSIONS, MUSIC_SEARCH_PATHS
            files: list = []
            for folder in MUSIC_SEARCH_PATHS:
                folder = os.path.expandvars(os.path.expanduser(folder))
                if not os.path.isdir(folder):
                    continue
                for ext in AUDIO_EXTENSIONS:
                    files.extend(glob.glob(os.path.join(folder, "**", f"*{ext}"), recursive=True))
            files.sort(key=lambda f: os.path.basename(f).lower())
            try:
                idx = files.index(cur)
                prv = files[(idx - 1) % len(files)]
            except ValueError:
                import random
                prv = random.choice(files) if files else None
            if prv:
                return music.play_file(prv)["message"]
        res = music.play_random()
        return res["message"]

    if action == "open_folder":
        return "Opening your music folder is not wired in the web build, sir."

    if action == "play_letter":
        letter = (params.get("letter") or "").strip()
        if letter and letter[0].isalpha():
            res = music.play(letter[0])
            return res["message"]
        res = music.play_random()
        return res["message"]

    if action == "play_name":
        query = (params.get("query") or "").strip()
        if query:
            res = music.play(query)
            return res["message"]
        res = music.play_random()
        return res["message"]

    song = (params.get("song") or "").strip()
    if song:
        res = music.play(song)
        return res["message"]
    res = music.play_random()
    return res["message"]



def _handle_files(params: dict, text: str) -> str:
    from backend.services.files_service import (
        create_folder, search_file, read_file, take_screenshot
    )
    action = params.get("action", "")
    if "screenshot" in text:
        return take_screenshot()["message"]
    if any(w in text for w in ["create folder", "make folder", "new folder"]):
        name = params.get("folder_name", "New Folder")
        return create_folder(name)["message"]
    if any(w in text for w in ["search", "find file"]):
        fname = params.get("filename", "")
        if fname:
            res = search_file(fname)
            return res["message"]
        return "Please tell me the file name to search for, sir."
    if "read" in text:
        fpath = params.get("filepath", "")
        if fpath:
            res = read_file(fpath)
            return res.get("preview", res.get("message", "File read."))
        return "Please tell me the file path to read, sir."
    return "File operation not recognised. Try: 'create folder', 'search file', or 'read file', sir."


def _handle_communication(params: dict, text: str) -> str:
    from backend.services.communication_service import (
        open_whatsapp, send_whatsapp_message, call_whatsapp, web_search, open_gmail
    )
    if any(w in text for w in ["whatsapp", "whats app"]):
        contact = params.get("contact", "")
        if contact and "call" in text:
            return call_whatsapp(contact)["message"]
        if contact:
            msg = params.get("message", "Hello! Message from JARVIS.")
            return send_whatsapp_message(contact, msg)["message"]
        return open_whatsapp()["message"]
    if "email" in text or "gmail" in text:
        return open_gmail()["message"]
    query = params.get("query", text)
    return web_search(query)["message"]


def _save_reminder(task: str, time_str: str) -> None:
    from backend.core.config import REMINDERS_FILE
    try:
        with open(REMINDERS_FILE, "a", encoding="utf-8") as f:
            f.write(f"{datetime.datetime.now().isoformat()} | {task} | {time_str}\n")
    except Exception as e:
        log.warning(f"Could not save reminder: {e}")


def _help_text() -> str:
    return (
        "I can help you with: system control, music playback, file management, "
        "WhatsApp and email, timers and alarms, calculator, weather, web search, "
        "and AI chat. Just speak naturally or type your command, sir."
    )


# ═══════════════════════════════════════════════════════════════════════════
# ASR Integration — register pipeline as the voice callback
# ═══════════════════════════════════════════════════════════════════════════

def start_voice_pipeline() -> None:
    """
    Start the ASR listener and wire its callback to process_command.
    Call this once from main_server on startup.
    """
    asr = get_asr()
    tts = get_tts()

    # Wire timer TTS callback
    from backend.services.timers_service import get_timers
    get_timers().set_speak_callback(tts.speak)

    def on_command(text: str) -> None:
        """Called by ASR when a command phrase is captured after wake word."""
        _broadcast({"type": "listening", "active": False, "timestamp": _ts(), "channel": "pipeline"})
        process_command(text, speak=True)

    def on_wake() -> None:
        """Called when wake word is detected."""
        lang = getattr(cfg, "ASR_LANGUAGE", "en-US") or "en-US"
        tts.speak(localized_assistant_phrase("wake", lang))
        _broadcast({"type": "wake_word", "detected": True, "timestamp": _ts(), "channel": "pipeline"})

    def on_listening(active: bool) -> None:
        """Called when mic starts/stops."""
        _broadcast({"type": "listening", "active": active, "timestamp": _ts(), "channel": "pipeline"})

    asr.register_callbacks(
        on_command=on_command,
        on_wake=on_wake,
        on_listening=on_listening,
    )
    asr.start()
    log.info("[Pipeline] Voice pipeline started — listening for wake word.")
