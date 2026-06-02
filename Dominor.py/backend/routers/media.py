# filepath: backend/routers/media.py
"""
Media Router — music playback (play, stop, pause, resume, random, list).
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter
from backend.models.requests import MusicRequest
from backend.models.responses import BaseResponse, MusicStatusResponse
from backend.services.music_service import get_music
from backend.services.tts_service import get_tts

router = APIRouter(prefix="/api/music", tags=["Music"])
_executor = ThreadPoolExecutor(max_workers=2)


def _speak_bg(text: str) -> None:
    asyncio.get_event_loop().run_in_executor(_executor, get_tts().speak, text)


@router.post("/play", response_model=BaseResponse)
async def play(req: MusicRequest):
    music = get_music()

    if req.action == "stop":
        result = music.stop()
    elif req.action == "pause":
        result = music.pause()
    elif req.action == "resume":
        result = music.resume()
    elif req.action == "random":
        result = music.play_random([req.music_dir] if req.music_dir else None)
    else:
        # Default: play by name
        if not req.query:
            result = music.play_random([req.music_dir] if req.music_dir else None)
        else:
            result = music.play(req.query, [req.music_dir] if req.music_dir else None)

    _speak_bg(result["message"])
    return BaseResponse(**result)


@router.post("/stop", response_model=BaseResponse)
async def stop():
    result = get_music().stop()
    _speak_bg(result["message"])
    return BaseResponse(**result)


@router.post("/pause", response_model=BaseResponse)
async def pause():
    result = get_music().pause()
    return BaseResponse(**result)


@router.post("/resume", response_model=BaseResponse)
async def resume():
    result = get_music().resume()
    return BaseResponse(**result)


@router.get("/status", response_model=MusicStatusResponse)
async def status():
    return MusicStatusResponse(**get_music().get_status())


@router.get("/list")
async def list_songs(limit: int = 50):
    return get_music().list_songs(limit=limit)
