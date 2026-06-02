"""JARVIS Services Package — all service singletons."""

from .tts_service    import get_tts, TTSService
from .asr_service    import get_asr, ASRService
from .ai_service     import get_ai, AIService
from .music_service  import get_music, MusicService
from .timers_service import get_timers, TimersService

__all__ = [
    "get_tts",  "TTSService",
    "get_asr",  "ASRService",
    "get_ai",   "AIService",
    "get_music","MusicService",
    "get_timers","TimersService",
]
