# filepath: backend/routers/settings.py
"""
Settings Router — read/write runtime settings (voice, TTS, theme, API key check).
"""

from __future__ import annotations
import asyncio
import platform
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from backend.core import config as cfg
from backend.services.tts_service import get_tts, localized_assistant_phrase
from backend.services.asr_service import get_asr
from backend.services.ai_service import get_ai
from backend.core.logger import log

router = APIRouter(prefix="/api/settings", tags=["Settings"])
_executor = ThreadPoolExecutor(max_workers=2)


def _speak_bg(text: str) -> None:
    asyncio.get_event_loop().run_in_executor(_executor, get_tts().speak, text)


class VoiceSettings(BaseModel):
    tts_rate: Optional[int] = None
    tts_volume: Optional[float] = None
    wake_word: Optional[str] = None
    asr_language: Optional[str] = None


@router.get("/")
async def get_settings():
    """Return current runtime settings."""
    tts = get_tts()
    asr = get_asr()
    ai = get_ai()
    presets = getattr(cfg, "ASR_LANGUAGE_PRESETS", {"English (US)": "en-US"})
    return {
        "success": True,
        "settings": {
            "tts_rate": cfg.TTS_RATE,
            "tts_volume": cfg.TTS_VOLUME,
            "tts_voice_index": cfg.TTS_VOICE_INDEX,
            "wake_word": cfg.WAKE_WORD,
            "wake_word_aliases": cfg.WAKE_WORD_ALIASES,
            "asr_language": cfg.ASR_LANGUAGE,
            "asr_language_presets": presets,
            "asr_timeout": cfg.ASR_TIMEOUT,
            "asr_phrase_limit": cfg.ASR_PHRASE_LIMIT,
            "openai_model": cfg.OPENAI_MODEL,
            "openai_temperature": cfg.OPENAI_TEMPERATURE,
            "openai_max_tokens": cfg.OPENAI_MAX_TOKENS,
            "music_search_paths": cfg.MUSIC_SEARCH_PATHS,
            "platform": cfg.PLATFORM,
        },
        "status": {
            "tts_available": tts._available,
            "asr_available": asr._available,
            "asr_running": asr._running,
            "ai_available": ai._available,
        }
    }


@router.post("/voice")
async def update_voice_settings(req: VoiceSettings):
    """Update TTS/ASR runtime settings."""
    tts = get_tts()
    updated = {}

    if req.tts_rate is not None and tts._engine:
        try:
            tts._engine.setProperty("rate", req.tts_rate)  # type: ignore
            cfg.TTS_RATE = req.tts_rate  # type: ignore
            updated["tts_rate"] = req.tts_rate
        except Exception as e:
            log.warning(f"Could not set TTS rate: {e}")

    if req.tts_volume is not None and tts._engine:
        try:
            vol = max(0.0, min(1.0, req.tts_volume))
            tts._engine.setProperty("volume", vol)  # type: ignore
            cfg.TTS_VOLUME = vol  # type: ignore
            updated["tts_volume"] = vol
        except Exception as e:
            log.warning(f"Could not set TTS volume: {e}")

    if req.wake_word is not None:
        cfg.WAKE_WORD = req.wake_word.lower()  # type: ignore
        updated["wake_word"] = req.wake_word.lower()

    if req.asr_language is not None:
        lang = (req.asr_language or "").strip() or "en-US"
        cfg.ASR_LANGUAGE = lang  # type: ignore
        updated["asr_language"] = lang
        try:
            vr = tts.apply_assistant_language(lang)
            if vr.get("success"):
                updated["tts_voice"] = vr.get("voice_name") or vr.get("message")
        except Exception as e:
            log.warning(f"Could not switch TTS voice for {lang}: {e}")

    confirm = localized_assistant_phrase("settings_saved", getattr(cfg, "ASR_LANGUAGE", "en-US"))
    _speak_bg(confirm)
    return {"success": True, "updated": updated, "message": confirm}


@router.get("/voices")
async def list_voices():
    """List all available TTS voices."""
    tts = get_tts()
    if not tts._available or not tts._engine:
        return {"success": False, "voices": [], "message": "TTS not available."}
    try:
        voices = tts._engine.getProperty("voices")  # type: ignore
        voice_list = [
            {"index": i, "id": v.id, "name": v.name, "languages": getattr(v, "languages", [])}
            for i, v in enumerate(voices)
        ]
        return {"success": True, "voices": voice_list}
    except Exception as e:
        return {"success": False, "voices": [], "message": str(e)}


@router.post("/voice-index")
async def set_voice_index(index: int):
    """Switch TTS voice by index."""
    tts = get_tts()
    if not tts._available or not tts._engine:
        return {"success": False, "message": "TTS not available."}
    try:
        voices = tts._engine.getProperty("voices")  # type: ignore
        if index < 0 or index >= len(voices):
            return {"success": False, "message": f"Voice index {index} out of range (0-{len(voices)-1})."}
        tts._engine.setProperty("voice", voices[index].id)  # type: ignore
        cfg.TTS_VOICE_INDEX = index  # type: ignore
        _speak_bg("Voice changed successfully, sir.")
        return {"success": True, "message": f"Voice changed to index {index}, sir."}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.post("/test-voice")
async def test_voice(text: str = "Hello sir. I am J.A.R.V.I.S., your AI assistant. All systems are operational."):
    """Test TTS by speaking a phrase."""
    tts = get_tts()
    if not tts._available:
        return {"success": False, "message": "TTS engine not available."}
    _speak_bg(text)
    return {"success": True, "message": f"Speaking: {text[:80]}"}


@router.get("/system-info")
async def system_info():
    return {
        "platform": platform.system(),
        "platform_version": platform.version(),
        "python_version": platform.python_version(),
        "hostname": platform.node(),
        "machine": platform.machine(),
    }

