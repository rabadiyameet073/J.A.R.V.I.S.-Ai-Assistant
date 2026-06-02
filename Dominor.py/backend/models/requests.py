# filepath: backend/models/requests.py
"""
JARVIS API — Pydantic request models.
All fields include sensible defaults so callers only provide what they need.
"""

from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, Field


class CommandRequest(BaseModel):
    """General natural-language command — goes through full pipeline."""
    message: str = Field(..., min_length=1, description="Natural language command text")
    speak: bool = Field(True, description="Whether to voice the response via TTS")


class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: Optional[List[dict]] = Field(None, description="Optional prior messages [{role, content}]")
    save_to_file: bool = False


# ── System ─────────────────────────────────────────────────────────────────

class PowerRequest(BaseModel):
    action: str = Field(..., description="shutdown | restart | sleep | hibernate | lock | logout")
    delay: int = Field(0, ge=0, le=300, description="Seconds delay (Windows only)")


class VolumeRequest(BaseModel):
    action: str = Field(..., description="up | down | mute | unmute | set")
    level: Optional[int] = Field(None, ge=0, le=100, description="Target level 0-100 (action=set)")


class AppRequest(BaseModel):
    app_name: str = Field(..., description="App name to launch, e.g. 'chrome', 'notepad'")


class WebsiteRequest(BaseModel):
    site: str = Field(..., description="Site name or URL, e.g. 'youtube', 'https://example.com'")


# ── Music ──────────────────────────────────────────────────────────────────

class MusicRequest(BaseModel):
    query: Optional[str] = Field(None, description="Song name to search & play")
    action: str = Field("play", description="play | stop | pause | resume | random")
    music_dir: Optional[str] = Field(None, description="Override music directory path")


# ── Files ──────────────────────────────────────────────────────────────────

class FolderRequest(BaseModel):
    folder_name: str = Field(..., min_length=1)
    parent_path: Optional[str] = None


class FileSearchRequest(BaseModel):
    filename: str = Field(..., min_length=1)
    search_path: Optional[str] = None
    max_results: int = Field(20, ge=1, le=100)


class FileReadRequest(BaseModel):
    filepath: str = Field(..., min_length=1)
    max_chars: int = Field(2000, ge=100, le=50000)


class ScreenshotRequest(BaseModel):
    save_dir: Optional[str] = None
    filename: Optional[str] = None


# ── Communication ──────────────────────────────────────────────────────────

class WhatsAppRequest(BaseModel):
    contact_name: str = Field(..., min_length=1)
    message: Optional[str] = Field(None, description="Message to send (omit for call)")
    action: str = Field("message", description="message | call | open")


class EmailRequest(BaseModel):
    to_email: str = Field(..., description="Recipient email address")
    subject: str = Field("Message from JARVIS")
    body: str = Field(..., min_length=1)
    from_email: Optional[str] = None
    app_password: Optional[str] = None


class ContactRequest(BaseModel):
    name: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=1)
    platform: str = Field("whatsapp")


# ── Timers ─────────────────────────────────────────────────────────────────

class TimerRequest(BaseModel):
    duration: str = Field(..., description="e.g. '5 minutes', '1 hour 30 minutes', '90 seconds'")
    label: Optional[str] = None


class AlarmRequest(BaseModel):
    time_str: str = Field(..., description="e.g. '7:30 AM', '14:00', '9pm'")
    label: Optional[str] = None


class CalculatorRequest(BaseModel):
    expression: str = Field(..., min_length=1, description="Math expression or natural language e.g. '5 plus 3'")


# ── Weather ────────────────────────────────────────────────────────────────

class WeatherRequest(BaseModel):
    city: str = Field("", description="City name; leave empty for auto-detect")
    days: int = Field(1, ge=1, le=7, description="Forecast days (1 = current only)")
