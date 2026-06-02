# filepath: backend/routers/files.py
"""
Files Router — folder creation, file search, file reading, screenshots.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter
from backend.models.requests import (
    FolderRequest, FileSearchRequest, FileReadRequest, ScreenshotRequest
)
from backend.models.responses import BaseResponse, FileListResponse
from backend.services import files_service as fs
from backend.services.tts_service import get_tts

router = APIRouter(prefix="/api/files", tags=["Files"])
_executor = ThreadPoolExecutor(max_workers=2)


def _speak_bg(text: str) -> None:
    asyncio.get_event_loop().run_in_executor(_executor, get_tts().speak, text)


@router.post("/create-folder", response_model=BaseResponse)
async def create_folder(req: FolderRequest):
    result = fs.create_folder(req.folder_name, req.parent_path)
    _speak_bg(result["message"])
    return BaseResponse(**result)


@router.post("/search", response_model=FileListResponse)
async def search_file(req: FileSearchRequest):
    result = fs.search_file(req.filename, req.search_path, req.max_results)
    return FileListResponse(**result)


@router.post("/read")
async def read_file(req: FileReadRequest):
    return fs.read_file(req.filepath, req.max_chars)


@router.post("/screenshot", response_model=BaseResponse)
async def screenshot(req: ScreenshotRequest = ScreenshotRequest()):
    result = fs.take_screenshot(req.save_dir, req.filename)
    _speak_bg(result["message"])
    return BaseResponse(**result)


@router.get("/desktop", response_model=FileListResponse)
async def desktop_files():
    result = fs.list_desktop_files()
    return FileListResponse(**result)


@router.post("/open-folder", response_model=BaseResponse)
async def open_folder(path: str):
    result = fs.open_folder(path)
    _speak_bg(result["message"])
    return BaseResponse(**result)
