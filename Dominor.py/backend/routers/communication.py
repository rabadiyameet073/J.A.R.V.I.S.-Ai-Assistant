# filepath: backend/routers/communication.py
"""
Communication Router — WhatsApp, email, contacts, web search.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter
from backend.models.requests import (
    WhatsAppRequest, EmailRequest, ContactRequest
)
from backend.models.responses import BaseResponse, ContactsResponse
from backend.services import communication_service as comm
from backend.services.tts_service import get_tts

router = APIRouter(prefix="/api/communication", tags=["Communication"])
_executor = ThreadPoolExecutor(max_workers=2)


def _speak_bg(text: str) -> None:
    asyncio.get_event_loop().run_in_executor(_executor, get_tts().speak, text)


@router.post("/whatsapp", response_model=BaseResponse)
async def whatsapp(req: WhatsAppRequest):
    if req.action == "open":
        result = comm.open_whatsapp()
    elif req.action == "call":
        result = comm.call_whatsapp(req.contact_name)
    else:
        msg = req.message or "Hello! This is JARVIS."
        result = comm.send_whatsapp_message(req.contact_name, msg)
    _speak_bg(result["message"])
    return BaseResponse(**result)


@router.post("/email", response_model=BaseResponse)
async def send_email(req: EmailRequest):
    result = comm.send_email(
        to_email=req.to_email,
        subject=req.subject,
        body=req.body,
        from_email=req.from_email,
        app_password=req.app_password,
    )
    _speak_bg(result["message"])
    return BaseResponse(**result)


@router.get("/contacts", response_model=ContactsResponse)
async def get_contacts():
    return ContactsResponse(**comm.get_contacts())


@router.post("/contacts", response_model=BaseResponse)
async def add_contact(req: ContactRequest):
    result = comm.add_contact(req.name, req.phone, req.platform)
    return BaseResponse(**result)


@router.post("/search", response_model=BaseResponse)
async def web_search(query: str = ""):
    """Web search — accepts query from URL param: POST /api/communication/search?query=..."""
    if not query:
        return BaseResponse(success=False, message="Please provide a search query.")
    result = comm.web_search(query)
    _speak_bg(result["message"])
    return BaseResponse(**result)


@router.get("/search", response_model=BaseResponse)
async def web_search_get(query: str = ""):
    """Web search via GET — GET /api/communication/search?query=..."""
    if not query:
        return BaseResponse(success=False, message="Please provide a search query.")
    result = comm.web_search(query)
    return BaseResponse(**result)


@router.post("/open-gmail", response_model=BaseResponse)
async def open_gmail():
    result = comm.open_gmail()
    _speak_bg(result["message"])
    return BaseResponse(**result)
