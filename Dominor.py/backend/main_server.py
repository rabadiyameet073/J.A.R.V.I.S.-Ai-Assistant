# filepath: backend/main_server.py
"""
J.A.R.V.I.S. FastAPI Server — Entry point
──────────────────────────────────────────────────────────────────
Starts:
  • All REST routers (system, media, files, communication, timers, ai, voice, settings)
  • WebSocket /ws  — real-time pipeline events to React dashboard
  • Legacy /api/*  — backward-compat endpoints the existing frontend already calls
  • Voice pipeline (ASR wake-word listener thread) on startup
──────────────────────────────────────────────────────────────────
Run:
  cd Dominor.py
  uvicorn backend.main_server:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations
import asyncio
import datetime
import json
import time
import os
import sys
from typing import Set
from concurrent.futures import ThreadPoolExecutor

# ── Ensure project root is on sys.path ────────────────────────────────────
_HERE = os.path.dirname(os.path.abspath(__file__))        # …/backend
_PROJECT = os.path.dirname(_HERE)                          # …/Dominor.py
if _PROJECT not in sys.path:
    sys.path.insert(0, _PROJECT)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.core.logger import log
from backend.core.config import HOST, PORT, WAKE_WORD, PLATFORM
from backend.core.intent_classifier import classify

# ── Routers ───────────────────────────────────────────────────────────────
from backend.routers.voice         import router as voice_router
from backend.routers.system        import router as system_router
from backend.routers.media         import router as media_router
from backend.routers.files         import router as files_router
from backend.routers.communication import router as comm_router
from backend.routers.timers        import router as timers_router
from backend.routers.ai            import router as ai_router
from backend.routers.settings      import router as settings_router
from backend.routers.ai_automation import router as ai_automation_router

# ── Services ──────────────────────────────────────────────────────────────
from backend.services.tts_service  import get_tts
from backend.services.asr_service  import get_asr
from backend.services.ai_service   import get_ai
from backend.models.requests       import CommandRequest, ChatRequest, SpeakRequest

# ── Voice pipeline ────────────────────────────────────────────────────────
from backend.voice_pipeline        import process_command, set_ws_broadcast, start_voice_pipeline

_START_TIME = time.time()
_bg_pool = ThreadPoolExecutor(max_workers=4)

# ═══════════════════════════════════════════════════════════════════════════
# FastAPI App
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="J.A.R.V.I.S. API",
    description="Just A Rather Very Intelligent System — Backend API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS — allow React dev server on any port ─────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount all routers ─────────────────────────────────────────────────────
app.include_router(voice_router)
app.include_router(system_router)
app.include_router(media_router)
app.include_router(files_router)
app.include_router(comm_router)
app.include_router(timers_router)
app.include_router(ai_router)
app.include_router(settings_router)
app.include_router(ai_automation_router)


# ═══════════════════════════════════════════════════════════════════════════
# WebSocket Manager
# ═══════════════════════════════════════════════════════════════════════════

class _WSManager:
    def __init__(self):
        self._clients: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.add(ws)
        log.info(f"WS client connected ({len(self._clients)} total)")

    def disconnect(self, ws: WebSocket) -> None:
        self._clients.discard(ws)
        log.info(f"WS client disconnected ({len(self._clients)} remaining)")

    async def broadcast(self, data: dict) -> None:
        if not self._clients:
            return
        message = json.dumps(data)
        dead: list[WebSocket] = []
        for ws in list(self._clients):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._clients.discard(ws)

    def broadcast_sync(self, data: dict) -> None:
        """Thread-safe sync wrapper — schedules on the event loop."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(self.broadcast(data), loop)
        except Exception as e:
            log.debug(f"WS sync broadcast failed: {e}")


_ws_manager = _WSManager()


def _nl_command_from_action(action: str, args: dict) -> str:
    """Map legacy /api/run action + args to a natural-language string for the pipeline."""
    args = args or {}
    _action_map = {
        "shutdown":          "shutdown the computer",
        "restart":           "restart the computer",
        "sleep":             "sleep",
        "lock":              "lock the computer",
        "system_info":       "system info",
        "volume_up":         "volume up",
        "volume_down":       "volume down",
        "mute":              "mute",
        "unmute":            "unmute",
        "screenshot":        "take a screenshot",
        "check_internet":    "check internet",
        "stop_music":        "stop music",
        "pause_music":       "pause music",
        "play_music":        f"play {args.get('song') or args.get('query') or 'music'}",
        "open_app":          f"open {args.get('app_name', '')}",
        "open_website":      f"open {args.get('site', '')}",
        "weather":           f"weather in {args.get('city', '')}",
        "set_timer":         f"set timer for {args.get('duration', '5 minutes')}",
        "set_alarm":         f"set alarm for {args.get('time', '8:00 AM')}",
        "calculate":         f"calculate {args.get('expression', '')}",
        "create_folder":     f"create folder {args.get('folder_name', 'New Folder')}",
        "search_file":       f"search file {args.get('filename', '')}",
        "send_whatsapp":     f"send whatsapp to {args.get('contact', '')} {args.get('message', '')}",
        "web_search":        f"search for {args.get('query', '')}",
        "ai_chat":           args.get("query", ""),
        "greet":             "hello jarvis",
        "time":              "what time is it",
        "date":              "what is today's date",
        "motivational_quote":"give me a motivational quote",
        "reset_chat":        "reset chat",
    }
    return (_action_map.get(action) or action or "").strip()


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await _ws_manager.connect(ws)
    # Send welcome ping
    await ws.send_text(json.dumps({
        "type": "connected",
        "message": "JARVIS WebSocket connected",
        "timestamp": datetime.datetime.now().isoformat(),
    }))
    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                data = {"message": raw}

            msg_type = data.get("type", "command")
            msg = (data.get("message") or data.get("text") or data.get("command") or "").strip()
            action = (data.get("action") or "").strip()
            args = data.get("args") if isinstance(data.get("args"), dict) else {}
            reply_channel = (data.get("replyChannel") or "command").strip() or "command"

            if msg_type == "command" and not msg and action:
                msg = _nl_command_from_action(action, args)

            if msg:
                loop = asyncio.get_event_loop()
                if msg_type == "chat":
                    loop.run_in_executor(_bg_pool, _ws_ai_chat, msg)
                else:
                    loop.run_in_executor(
                        _bg_pool,
                        lambda t=msg, rc=reply_channel: _ws_process_command(t, reply_channel=rc),
                    )
            elif msg_type == "command" and action:
                _ws_manager.broadcast_sync({
                    "type": "error",
                    "message": f"Could not build a command from action '{action}'.",
                    "channel": reply_channel,
                    "timestamp": datetime.datetime.now().isoformat(),
                })
    except WebSocketDisconnect:
        _ws_manager.disconnect(ws)


def _ws_ai_chat(text: str) -> None:
    """Handle AI chat messages via WebSocket."""
    try:
        ai = get_ai()
        answer = ai.chat(text)
        get_tts().speak(answer)
        ts = datetime.datetime.now().isoformat()
        _ws_manager.broadcast_sync({
            "type": "response",
            "message": answer,
            "response": answer,
            "channel": "chat",
            "timestamp": ts,
        })
    except Exception as e:
        log.error(f"WS AI chat error: {e}")
        _ws_manager.broadcast_sync({
            "type": "error",
            "message": f"AI error: {str(e)[:200]}",
            "channel": "chat",
            "timestamp": datetime.datetime.now().isoformat(),
        })


def _ws_process_command(text: str, reply_channel: str = "command") -> None:
    result = process_command(text, speak=True, suppress_final_broadcast=True)
    ts = datetime.datetime.now().isoformat()
    resp = result.get("response", "") or ""
    _ws_manager.broadcast_sync({
        "type": "result",
        "message": resp,
        "response": resp,
        "result": result,
        "channel": reply_channel,
        "timestamp": ts,
    })


# ═══════════════════════════════════════════════════════════════════════════
# Legacy / Compatibility endpoints (existing React frontend calls these)
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/status")
async def api_status():
    """Health check — React dashboard polls this on startup."""
    tts = get_tts()
    asr = get_asr()
    ai  = get_ai()
    return {
        "online": True,
        "version": "2.0.0",
        "name": "J.A.R.V.I.S.",
        "platform": PLATFORM,
        "uptime_secs": round(time.time() - _START_TIME, 1),
        "tts_available": tts._available,
        "asr_available": asr._available,
        "ai_available": ai._available,
        "wake_word": WAKE_WORD,
    }


@app.get("/api/greet")
async def api_greet():
    """Return contextual greeting based on time of day."""
    hour = datetime.datetime.now().hour
    if 5 <= hour < 12:
        g = "Good morning, sir. JARVIS is online and ready."
    elif 12 <= hour < 17:
        g = "Good afternoon, sir. How may I assist you?"
    elif 17 <= hour < 21:
        g = "Good evening, sir. What can I do for you?"
    else:
        g = "Good night, sir. JARVIS is standing by."
    asyncio.get_event_loop().run_in_executor(_bg_pool, get_tts().speak, g)
    return {"greeting": g}


@app.post("/api/command")
async def api_command(req: CommandRequest):
    """
    Natural-language command endpoint — full pipeline.
    The React frontend sendCommand() calls this.
    """
    result = process_command(req.message, speak=req.speak)
    return {
        "ok": result["success"],
        "response": result["response"],
        "intent": result["intent"],
        "confidence": result["confidence"],
        "params": result["params"],
        "message": result["response"],
    }


@app.post("/api/chat")
async def api_chat(req: ChatRequest):
    """AI chat endpoint — React AIChat page calls this."""
    ai = get_ai()
    try:
        loop = asyncio.get_event_loop()
        answer = await asyncio.wait_for(
            loop.run_in_executor(_bg_pool, ai.chat, req.message),
            timeout=25.0
        )
    except asyncio.TimeoutError:
        answer = "I'm sorry, sir. The response timed out. Please try again."
    except Exception as e:
        answer = f"I encountered an error, sir: {str(e)[:100]}"
    asyncio.get_event_loop().run_in_executor(_bg_pool, get_tts().speak, answer)
    return {"ok": True, "response": answer, "message": answer}


@app.post("/api/speak")
async def api_speak(text: str = ""):
    """Direct TTS endpoint."""
    if not text:
        raise HTTPException(status_code=400, detail="text query param required")
    asyncio.get_event_loop().run_in_executor(_bg_pool, get_tts().speak, text)
    return {"ok": True, "message": f"Speaking: {text[:60]}"}


@app.get("/api/functions")
async def api_functions():
    """Return list of available JARVIS capabilities (React Dashboard uses this)."""
    functions = [
        {"name": "shutdown",         "category": "System",        "description": "Shut down the computer"},
        {"name": "restart",          "category": "System",        "description": "Restart the computer"},
        {"name": "sleep",            "category": "System",        "description": "Put computer to sleep"},
        {"name": "lock",             "category": "System",        "description": "Lock the workstation"},
        {"name": "system_info",      "category": "System",        "description": "Get CPU, RAM, battery info"},
        {"name": "volume_up",        "category": "System",        "description": "Increase volume"},
        {"name": "volume_down",      "category": "System",        "description": "Decrease volume"},
        {"name": "mute",             "category": "System",        "description": "Mute/unmute audio"},
        {"name": "open_app",         "category": "System",        "description": "Launch any application"},
        {"name": "open_website",     "category": "System",        "description": "Open website in browser"},
        {"name": "check_internet",   "category": "Network",       "description": "Check internet connectivity"},
        {"name": "play_music",       "category": "Music",         "description": "Play music by name"},
        {"name": "stop_music",       "category": "Music",         "description": "Stop music playback"},
        {"name": "pause_music",      "category": "Music",         "description": "Pause music"},
        {"name": "create_folder",    "category": "Files",         "description": "Create a new folder"},
        {"name": "search_file",      "category": "Files",         "description": "Search for files"},
        {"name": "read_file",        "category": "Files",         "description": "Read a file's contents"},
        {"name": "screenshot",       "category": "Files",         "description": "Take a screenshot"},
        {"name": "send_whatsapp",    "category": "Communication", "description": "Send WhatsApp message"},
        {"name": "send_email",       "category": "Communication", "description": "Send an email"},
        {"name": "web_search",       "category": "Communication", "description": "Search the web"},
        {"name": "set_timer",        "category": "Timers",        "description": "Set a countdown timer"},
        {"name": "set_alarm",        "category": "Timers",        "description": "Set an alarm"},
        {"name": "stopwatch",        "category": "Timers",        "description": "Start/stop stopwatch"},
        {"name": "calculator",       "category": "Timers",        "description": "Evaluate math expressions"},
        {"name": "weather",          "category": "Weather",       "description": "Get weather info"},
        {"name": "ai_chat",          "category": "AI",            "description": "Chat with JARVIS AI"},
        {"name": "motivational_quote","category": "AI",           "description": "Get a motivational quote"},
        {"name": "time_date",        "category": "General",       "description": "Get current time/date"},
    ]
    return {"functions": functions, "count": len(functions)}


@app.post("/api/run")
async def api_run(payload: dict):
    """
    Legacy action runner — existing React frontend calls /api/run with {action, args}.
    Maps action names to pipeline commands.
    """
    action: str = payload.get("action", "")
    args: dict  = payload.get("args", {})

    if not action:
        raise HTTPException(status_code=400, detail="action field required")

    command_text = _nl_command_from_action(action, args)
    if not command_text.strip():
        return {"ok": False, "error": f"Unknown action: {action}"}

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(_bg_pool, process_command, command_text, True)
    return {
        "ok": result["success"],
        "result": result["response"],
        "response": result["response"],
        "intent": result["intent"],
        "message": result["response"],
    }


# ── Music status (legacy endpoint) ────────────────────────────────────────
@app.get("/api/music/status")
async def music_status_legacy():
    from backend.services.music_service import get_music
    return get_music().get_status()


# ═══════════════════════════════════════════════════════════════════════════
# Startup / Shutdown
# ═══════════════════════════════════════════════════════════════════════════

@app.on_event("startup")
async def on_startup():
    log.info("=" * 60)
    log.info("  J.A.R.V.I.S. v2.0.0 starting up")
    log.info(f"  Platform : {PLATFORM}")
    log.info(f"  Wake word: '{WAKE_WORD}'")
    log.info("=" * 60)

    # Wire WS broadcast into voice pipeline
    set_ws_broadcast(_ws_manager.broadcast_sync)

    # ── Pre-initialize singletons on the MAIN thread ──────────────────────
    # This prevents a race condition where TTS._get_asr() and
    # start_voice_pipeline() could both call get_asr() simultaneously
    # from different executor threads, creating two ASR instances.
    get_asr()   # creates singleton now, on main thread
    get_tts()   # same for TTS
    get_ai()    # same for AI

    # Start voice pipeline in background (non-blocking)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _safe_start_pipeline)

    # Startup greeting (singletons already created — no race possible)
    loop.run_in_executor(None, lambda: get_tts().speak(
        "J.A.R.V.I.S. is online. All systems ready, sir."
    ))


def _safe_start_pipeline() -> None:
    try:
        start_voice_pipeline()
    except Exception as e:
        log.warning(f"Voice pipeline could not start: {e}")


@app.on_event("shutdown")
async def on_shutdown():
    log.info("JARVIS shutting down...")
    try:
        get_asr().stop()
        get_tts().shutdown()
    except Exception:
        pass


# ═══════════════════════════════════════════════════════════════════════════
# Dev entry point
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main_server:app",
        host=HOST,
        port=PORT,
        reload=False,
        log_level="info",
    )
