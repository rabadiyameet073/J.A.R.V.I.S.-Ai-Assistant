"""
JARVIS Core Configuration
Central config loaded once at startup — all modules import from here.
"""

import os
import sys

# ── Paths ──────────────────────────────────────────────────────────────────
# Backend root = Dominor.py/backend/
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))  # …/backend/core
BACKEND_ROOT = os.path.dirname(BACKEND_DIR)               # …/backend
PROJECT_ROOT = os.path.dirname(BACKEND_ROOT)               # …/Dominor.py

# ── OpenAI API Key ─────────────────────────────────────────────────────────
def _load_api_key() -> str:
    """Load OpenAI key from config.py next to main.py."""
    config_path = os.path.join(PROJECT_ROOT, "config.py")
    if not os.path.exists(config_path):
        return ""
    try:
        sys.path.insert(0, PROJECT_ROOT)
        from config import apikey  # type: ignore
        return apikey.strip() if apikey else ""
    except Exception:
        return ""

OPENAI_API_KEY: str = _load_api_key()

# ── Server ─────────────────────────────────────────────────────────────────
HOST: str = "0.0.0.0"
PORT: int = 8000
RELOAD: bool = True

# ── Voice Pipeline ─────────────────────────────────────────────────────────
WAKE_WORD: str = "jarvis"               # primary wake token (Latin)
# Latin + Hindi + Gujarati (Google STT returns script matching chosen ASR_LANGUAGE)
WAKE_WORD_ALIASES: list = [
    "hey jarvis", "jarvis", "hello jarvis", "ok jarvis", "hi jarvis",
    "hey jervis",  # common mis-hear
    "\u0939\u0947 \u091c\u093e\u0930\u094d\u0935\u093f\u0938",   # हे जार्विस
    "\u0939\u0947\u0932\u094b \u091c\u093e\u0930\u094d\u0935\u093f\u0938",  # हेलो जार्विस
    "\u091c\u093e\u0930\u094d\u0935\u093f\u0938",               # जार्विस
    "\u0a39\u0a47 \u0a1c\u0a3e\u0a30\u0a35\u0a3f\u0a38",         # હે જારવિસ (Gujarati)
    "\u0a1c\u0a3e\u0a30\u0a35\u0a3f\u0a38",                     # જારવિસ
]

# Google Speech Recognition BCP-47 codes (used by backend ASR + suggested for browser STT)
ASR_LANGUAGE_PRESETS: dict[str, str] = {
    "English (US)": "en-US",
    "Hindi (India)": "hi-IN",
    "Gujarati (India)": "gu-IN",
}
ASR_LANGUAGE: str = "en-US"
ASR_TIMEOUT: float = 8.0               # seconds to wait for speech to start
ASR_PHRASE_LIMIT: float = 12.0          # max seconds per phrase
ASR_MAX_RETRIES: int = 2
ENERGY_THRESHOLD: int = 300
DYNAMIC_ENERGY: bool = True

# ── TTS ───────────────────────────────────────────────────────────────────
TTS_RATE: int = 175
TTS_VOLUME: float = 1.0
TTS_VOICE_INDEX: int = 0               # 0 = first voice (usually male)

# ── Music ─────────────────────────────────────────────────────────────────
AUDIO_EXTENSIONS = (".mp3", ".wav", ".m4a", ".flac", ".aac", ".wma", ".ogg")
MUSIC_SEARCH_PATHS = [
    r"D:\music",
    r"D:\Music",
    os.path.join(os.path.expanduser("~"), "Music"),
]

# ── AI Chat ───────────────────────────────────────────────────────────────
OPENAI_MODEL: str = "gpt-3.5-turbo"
OPENAI_TEMPERATURE: float = 0.7
OPENAI_MAX_TOKENS: int = 300

# ── Logging ───────────────────────────────────────────────────────────────
LOG_LEVEL: str = "INFO"
LOG_FILE: str = os.path.join(PROJECT_ROOT, "jarvis.log")

# ── Contacts ──────────────────────────────────────────────────────────────
CONTACTS_FILE: str = os.path.join(PROJECT_ROOT, "contacts.json")
NAMES_FILE: str = os.path.join(PROJECT_ROOT, "names.txt")
REMINDERS_FILE: str = os.path.join(PROJECT_ROOT, "reminders.txt")
SCREENSHOTS_DIR: str = PROJECT_ROOT
OPENAI_SAVES_DIR: str = os.path.join(PROJECT_ROOT, "Openai")

# ── Platform ──────────────────────────────────────────────────────────────
import platform
PLATFORM = platform.system()           # "Windows" | "Darwin" | "Linux"
IS_WINDOWS = PLATFORM == "Windows"
IS_MAC = PLATFORM == "Darwin"
IS_LINUX = PLATFORM == "Linux"
