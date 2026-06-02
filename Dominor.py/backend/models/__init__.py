# filepath: backend/models/__init__.py
"""Pydantic request/response models for JARVIS API."""

from .requests import (
    CommandRequest,
    SpeakRequest,
    ChatRequest,
    TimerRequest,
    AlarmRequest,
    VolumeRequest,
    PowerRequest,
    AppRequest,
    WebsiteRequest,
    MusicRequest,
    FolderRequest,
    FileSearchRequest,
    FileReadRequest,
    WhatsAppRequest,
    EmailRequest,
    ContactRequest,
    WeatherRequest,
    CalculatorRequest,
    ScreenshotRequest,
)

from .responses import (
    BaseResponse,
    StatusResponse,
    ChatResponse,
    SystemInfoResponse,
    MusicStatusResponse,
    TimerResponse,
    WeatherResponse,
    FileListResponse,
    ContactsResponse,
)

__all__ = [
    # Requests
    "CommandRequest", "SpeakRequest", "ChatRequest",
    "TimerRequest", "AlarmRequest", "VolumeRequest",
    "PowerRequest", "AppRequest", "WebsiteRequest",
    "MusicRequest", "FolderRequest", "FileSearchRequest",
    "FileReadRequest", "WhatsAppRequest", "EmailRequest",
    "ContactRequest", "WeatherRequest", "CalculatorRequest",
    "ScreenshotRequest",
    # Responses
    "BaseResponse", "StatusResponse", "ChatResponse",
    "SystemInfoResponse", "MusicStatusResponse", "TimerResponse",
    "WeatherResponse", "FileListResponse", "ContactsResponse",
]
