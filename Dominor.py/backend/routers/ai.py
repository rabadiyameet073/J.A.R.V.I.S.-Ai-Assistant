# filepath: backend/routers/ai.py
"""
AI Router — chat, quick prompts, motivational quotes, history reset.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter
from backend.models.requests import ChatRequest
from backend.models.responses import ChatResponse, BaseResponse
from backend.services.ai_service import get_ai
from backend.services.tts_service import get_tts
from backend.core.logger import log

router = APIRouter(prefix="/api/ai", tags=["AI"])

# Thread pool for blocking AI/TTS calls
_executor = ThreadPoolExecutor(max_workers=4)


async def _run_in_thread(func, *args):
    """Run a blocking function in a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, func, *args)


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Send a message to JARVIS AI and get a response."""
    try:
        # Run blocking AI call in thread pool with 25 second timeout
        ai = get_ai()
        answer = await asyncio.wait_for(
            _run_in_thread(ai.chat, req.message),
            timeout=25.0
        )
    except asyncio.TimeoutError:
        log.warning("AI chat timed out after 25 seconds")
        answer = "I'm sorry, sir. The AI response timed out. Please try again."
    except Exception as e:
        log.error(f"AI chat error: {e}")
        answer = f"I encountered an error, sir. Please try again."

    # Speak in background (non-blocking)
    asyncio.get_event_loop().run_in_executor(_executor, get_tts().speak, answer)

    return ChatResponse(
        success=True,
        message=answer,
        response=answer,
    )


@router.post("/quick", response_model=ChatResponse)
async def quick_prompt(prompt: str):
    """One-shot AI prompt without chat history."""
    try:
        ai = get_ai()
        answer = await asyncio.wait_for(
            _run_in_thread(ai.quick_prompt, prompt),
            timeout=20.0
        )
    except asyncio.TimeoutError:
        answer = "Request timed out, sir."
    except Exception as e:
        answer = f"Error: {e}"

    asyncio.get_event_loop().run_in_executor(_executor, get_tts().speak, answer)
    return ChatResponse(success=True, message=answer, response=answer)


@router.post("/reset", response_model=BaseResponse)
async def reset_chat():
    """Clear the conversation history."""
    get_ai().reset_history()
    return BaseResponse(success=True, message="Conversation history cleared, sir.")


@router.get("/quote", response_model=ChatResponse)
async def motivational_quote():
    """Return a motivational quote."""
    try:
        ai = get_ai()
        quote = await asyncio.wait_for(
            _run_in_thread(ai.get_motivational_quote),
            timeout=20.0
        )
    except asyncio.TimeoutError:
        quote = "Keep going, sir. Every great journey begins with a single step."
    except Exception:
        quote = "Stay focused, stay disciplined, and success will follow, sir."

    asyncio.get_event_loop().run_in_executor(_executor, get_tts().speak, quote)
    return ChatResponse(success=True, message=quote, response=quote)


@router.get("/status")
async def ai_status():
    ai = get_ai()
    return {
        "available": ai._available,
        "model": "gpt-3.5-turbo",
        "history_length": len(ai._chat_history),
    }

