# filepath: backend/models/responses.py
"""
JARVIS API — Pydantic response models.
All responses include success + message for consistent frontend handling.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class BaseResponse(BaseModel):
    success: bool
    message: str = ""
    song: Optional[str] = None
    file: Optional[str] = None


class StatusResponse(BaseModel):
    online: bool = True
    version: str = "2.0.0"
    name: str = "J.A.R.V.I.S."
    platform: str = ""
    uptime_secs: float = 0.0
    tts_available: bool = False
    asr_available: bool = False
    ai_available: bool = False
    wake_word: str = "jarvis"


class ChatResponse(BaseModel):
    success: bool = True
    message: str
    intent: Optional[str] = None
    confidence: Optional[float] = None
    params: Optional[Dict[str, Any]] = None
    response: str = ""


class SystemInfoResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any] = {}
    message: str = ""


class MusicStatusResponse(BaseModel):
    playing: bool = False
    current_song: Optional[str] = None
    current_file: Optional[str] = None


class TimerResponse(BaseModel):
    success: bool
    message: str = ""
    timer_id: Optional[str] = None
    duration_secs: Optional[float] = None
    fires_at: Optional[str] = None
    timers: Optional[List[Dict[str, Any]]] = None


class WeatherResponse(BaseModel):
    success: bool
    city: str = ""
    summary: str = ""
    detailed: str = ""
    structured: Dict[str, Any] = {}
    message: str = ""
    forecast: Optional[List[Dict[str, Any]]] = None


class FileListResponse(BaseModel):
    success: bool
    results: List[Dict[str, Any]] = []
    message: str = ""
    total: Optional[int] = None


class ContactsResponse(BaseModel):
    success: bool
    contacts: Dict[str, Any] = {}
    count: int = 0
    message: str = ""
