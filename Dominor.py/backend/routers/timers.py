# filepath: backend/routers/timers.py
"""
Timers Router — set/cancel timers, set alarms, stopwatch, calculator, weather.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter
from backend.models.requests import (
    TimerRequest, AlarmRequest, CalculatorRequest, WeatherRequest
)
from backend.models.responses import BaseResponse, TimerResponse, WeatherResponse
from backend.services.timers_service import get_timers, calculate
from backend.services import weather_service as wx
from backend.services.tts_service import get_tts

router = APIRouter(prefix="/api/timers", tags=["Timers"])
_executor = ThreadPoolExecutor(max_workers=2)


def _speak_bg(text: str) -> None:
    asyncio.get_event_loop().run_in_executor(_executor, get_tts().speak, text)


@router.post("/set", response_model=TimerResponse)
async def set_timer(req: TimerRequest):
    result = get_timers().set_timer(req.duration, req.label or "")
    _speak_bg(result["message"])
    return TimerResponse(**result)


@router.post("/cancel/{timer_id}", response_model=BaseResponse)
async def cancel_timer(timer_id: str):
    result = get_timers().cancel_timer(timer_id)
    return BaseResponse(**result)


@router.get("/list", response_model=TimerResponse)
async def list_timers():
    return TimerResponse(**get_timers().list_timers())


@router.post("/alarm", response_model=TimerResponse)
async def set_alarm(req: AlarmRequest):
    result = get_timers().set_alarm(req.time_str, req.label or "")
    _speak_bg(result["message"])
    return TimerResponse(**result)


@router.post("/stopwatch/start", response_model=BaseResponse)
async def stopwatch_start():
    result = get_timers().start_stopwatch()
    _speak_bg(result["message"])
    return BaseResponse(**result)


@router.post("/stopwatch/stop", response_model=BaseResponse)
async def stopwatch_stop():
    result = get_timers().stop_stopwatch()
    _speak_bg(result["message"])
    return BaseResponse(**result)


@router.get("/stopwatch/read", response_model=BaseResponse)
async def stopwatch_read():
    return BaseResponse(**get_timers().read_stopwatch())


@router.post("/calculate")
async def calculator(req: CalculatorRequest):
    result = calculate(req.expression)
    if result.get("success"):
        msg = f"The answer is {result['answer']}, sir."
        _speak_bg(msg)
        result["message"] = msg
    else:
        _speak_bg(result.get("message", "Calculation failed."))
    return result


# ── Weather (logically grouped with tools) ────────────────────────────────

@router.post("/weather", response_model=WeatherResponse)
async def weather(req: WeatherRequest):
    if req.days > 1:
        result = wx.get_forecast(req.city, req.days)
        if result.get("success"):
            msg = f"Forecast for {req.city or 'your location'} retrieved, sir."
            result["message"] = msg
            result.setdefault("summary", msg)
            result.setdefault("detailed", "")
            result.setdefault("structured", {})
        _speak_bg(result.get("message", ""))
        return WeatherResponse(**result)
    else:
        result = wx.get_weather(req.city)
        _speak_bg(result.get("message", ""))
        return WeatherResponse(**result)
