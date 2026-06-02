# filepath: backend/routers/voice.py
"""
Voice Router — ASR control, voice pipeline trigger, listen-once endpoint.
"""

from fastapi import APIRouter, HTTPException
from backend.models.requests import CommandRequest, SpeakRequest
from backend.models.responses import BaseResponse, ChatResponse
from backend.services.tts_service import get_tts
from backend.services.asr_service import get_asr
from backend.core.logger import log

router = APIRouter(prefix="/api/voice", tags=["Voice"])


@router.post("/speak", response_model=BaseResponse)
async def speak(req: SpeakRequest):
    """Queue text for TTS speech output."""
    tts = get_tts()
    tts.speak(req.text)
    return BaseResponse(success=True, message=f"Speaking: {req.text[:60]}")


@router.get("/listen", response_model=BaseResponse)
async def listen_once():
    """
    Trigger a single one-shot voice capture (no wake word required).
    Returns the transcribed text.
    """
    asr = get_asr()
    text = asr.listen_once()
    if text:
        log.info(f"listen_once: {text}")
        return BaseResponse(success=True, message=text)
    return BaseResponse(success=False, message="No speech detected or ASR unavailable.")


@router.get("/status")
async def voice_status():
    """Return ASR/TTS availability and state."""
    asr = get_asr()
    tts = get_tts()
    return {
        "asr_available": asr._available,
        "asr_running": asr._running,
        "tts_available": tts._available,
        "wake_word": "jarvis",
    }


@router.post("/start")
async def start_listening():
    """Start the continuous ASR wake-word listener."""
    asr = get_asr()
    if not asr._available:
        raise HTTPException(status_code=503, detail="ASR not available — no microphone or speechrecognition package missing.")
    asr.start()
    return {"success": True, "message": "Continuous listener started. Say 'Hey Jarvis' to wake."}


@router.post("/stop")
async def stop_listening():
    """Stop the continuous ASR listener."""
    asr = get_asr()
    asr.stop()
    return {"success": True, "message": "ASR listener stopped."}
