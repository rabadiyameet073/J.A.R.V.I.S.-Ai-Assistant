# filepath: backend/services/weather_service.py
"""
Weather Service — real-time weather via wttr.in (no API key needed).
"""

from __future__ import annotations
from typing import Dict, Any
from backend.core.logger import log

try:
    import requests as _req
    _REQUESTS = True
except ImportError:
    _req = None   # type: ignore
    _REQUESTS = False
    log.warning("requests not found — weather disabled. pip install requests")


def get_weather(city: str = "") -> Dict[str, Any]:
    """
    Fetch current weather for city (or auto-detected location if empty).
    Uses wttr.in public API — no key required.
    Returns a dict with raw text and structured fields.
    """
    if not _REQUESTS:
        return {"success": False, "message": "Weather requires: pip install requests"}

    from urllib.parse import quote_plus
    loc = quote_plus(city.strip()) if city.strip() else ""

    # ── Short one-line format ──────────────────────────────────────────────
    try:
        url_short = f"https://wttr.in/{loc}?format=3"
        resp = _req.get(url_short, timeout=10, headers={"User-Agent": "JarvisAssistant/2.0"})
        if resp.status_code == 200 and resp.text.strip():
            short = resp.text.strip()
        else:
            short = ""
    except Exception as e:
        log.warning(f"wttr.in short format error: {e}")
        short = ""

    # ── Detailed structured format ─────────────────────────────────────────
    try:
        url_detail = f"https://wttr.in/{loc}?format=%l:+%C+%t,+humidity+%h,+wind+%w"
        resp2 = _req.get(url_detail, timeout=10, headers={"User-Agent": "JarvisAssistant/2.0"})
        if resp2.status_code == 200:
            detailed = resp2.text.strip()
        else:
            detailed = ""
    except Exception as e:
        log.warning(f"wttr.in detail format error: {e}")
        detailed = ""

    # ── JSON format for structured data ───────────────────────────────────
    structured: Dict[str, Any] = {}
    try:
        url_json = f"https://wttr.in/{loc}?format=j1"
        resp3 = _req.get(url_json, timeout=10, headers={"User-Agent": "JarvisAssistant/2.0"})
        if resp3.status_code == 200:
            data = resp3.json()
            current = data.get("current_condition", [{}])[0]
            area = data.get("nearest_area", [{}])[0]
            area_name = area.get("areaName", [{}])[0].get("value", city)
            structured = {
                "location": area_name,
                "temp_c": current.get("temp_C"),
                "temp_f": current.get("temp_F"),
                "feels_like_c": current.get("FeelsLikeC"),
                "humidity": current.get("humidity"),
                "wind_kmph": current.get("windspeedKmph"),
                "wind_dir": current.get("winddir16Point"),
                "description": current.get("weatherDesc", [{}])[0].get("value", ""),
                "visibility_km": current.get("visibility"),
                "uv_index": current.get("uvIndex"),
            }
    except Exception as e:
        log.debug(f"wttr.in json parse: {e}")

    summary = short or detailed or f"Could not retrieve weather for {city or 'your location'}."
    tts_message = f"Current weather: {summary}"

    log.info(f"Weather fetched for '{city or 'auto'}': {summary}")
    return {
        "success": True,
        "city": city or "auto-detected",
        "summary": summary,
        "detailed": detailed,
        "structured": structured,
        "message": tts_message,
    }


def get_forecast(city: str = "", days: int = 3) -> Dict[str, Any]:
    """
    Get multi-day forecast summary.
    """
    if not _REQUESTS:
        return {"success": False, "message": "Weather requires: pip install requests"}

    from urllib.parse import quote_plus
    loc = quote_plus(city.strip()) if city.strip() else ""

    try:
        url = f"https://wttr.in/{loc}?format=j1"
        resp = _req.get(url, timeout=10, headers={"User-Agent": "JarvisAssistant/2.0"})
        if resp.status_code != 200:
            return {"success": False, "message": "Could not get forecast data."}

        data = resp.json()
        weather_arr = data.get("weather", [])
        forecast = []
        for day_data in weather_arr[:days]:
            desc = day_data.get("hourly", [{}])[4].get("weatherDesc", [{}])[0].get("value", "")
            forecast.append({
                "date": day_data.get("date"),
                "max_c": day_data.get("maxtempC"),
                "min_c": day_data.get("mintempC"),
                "description": desc,
            })
        return {"success": True, "city": city or "auto", "forecast": forecast}
    except Exception as e:
        log.error(f"get_forecast error: {e}")
        return {"success": False, "message": f"Forecast error: {e}"}
