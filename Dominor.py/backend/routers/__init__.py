# filepath: backend/routers/__init__.py
"""Router package — all FastAPI routers exported here."""
from .voice import router as voice_router
from .system import router as system_router
from .media import router as media_router
from .files import router as files_router
from .communication import router as communication_router
from .timers import router as timers_router
from .ai import router as ai_router
from .settings import router as settings_router
from .ai_automation import router as ai_automation_router

__all__ = [
    "voice_router",
    "system_router",
    "media_router",
    "files_router",
    "communication_router",
    "timers_router",
    "ai_router",
    "settings_router",
    "ai_automation_router",
]
