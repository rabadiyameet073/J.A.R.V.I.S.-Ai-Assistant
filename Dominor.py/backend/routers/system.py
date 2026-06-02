# filepath: backend/routers/system.py
"""
System Router — power, volume, display, system info, apps, websites, network.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter
from backend.models.requests import (
    PowerRequest, VolumeRequest, AppRequest, WebsiteRequest
)
from backend.models.responses import BaseResponse, SystemInfoResponse
from backend.services import system_service as sys_svc
from backend.services.tts_service import get_tts

router = APIRouter(prefix="/api/system", tags=["System"])
_executor = ThreadPoolExecutor(max_workers=2)


def _speak_bg(text: str) -> None:
    """Speak in background — non-blocking."""
    asyncio.get_event_loop().run_in_executor(_executor, get_tts().speak, text)


@router.get("/info", response_model=SystemInfoResponse)
async def system_info():
    """Return CPU, RAM, disk, battery, IP, platform info."""
    loop = asyncio.get_event_loop()
    data = await loop.run_in_executor(_executor, sys_svc.get_system_info)
    return SystemInfoResponse(success=True, data=data, message="System info retrieved.")


@router.post("/power", response_model=BaseResponse)
async def power(req: PowerRequest):
    result = sys_svc.power_action(req.action, req.delay)
    _speak_bg(result["message"])
    return BaseResponse(**result)


@router.post("/volume", response_model=BaseResponse)
async def volume(req: VolumeRequest):
    result = sys_svc.volume_control(req.action, req.level)
    _speak_bg(result["message"])
    return BaseResponse(**result)


@router.post("/display", response_model=BaseResponse)
async def display(action: str = "off"):
    result = sys_svc.display_action(action)
    _speak_bg(result["message"])
    return BaseResponse(**result)


@router.post("/open-app", response_model=BaseResponse)
async def open_app(req: AppRequest):
    result = sys_svc.open_app(req.app_name)
    _speak_bg(result["message"])
    return BaseResponse(**result)


@router.post("/open-website", response_model=BaseResponse)
async def open_website(req: WebsiteRequest):
    result = sys_svc.open_website(req.site)
    _speak_bg(result["message"])
    return BaseResponse(**result)


@router.get("/network")
async def network():
    """Return network info and internet connectivity status."""
    loop = asyncio.get_event_loop()
    internet = await loop.run_in_executor(_executor, sys_svc.check_internet)
    net_info = await loop.run_in_executor(_executor, sys_svc.network_info)
    return {"success": True, **internet, **net_info}


@router.post("/wifi", response_model=BaseResponse)
async def wifi(enable: bool = True):
    result = sys_svc.toggle_wifi(enable)
    _speak_bg(result["message"])
    return BaseResponse(**result)

