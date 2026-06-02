"""
AI Chat Service — OpenAI GPT conversation + web search fallback.
"""

from __future__ import annotations
import time
import os
from typing import Optional, List, Dict
from urllib.parse import quote_plus
from backend.core import config as cfg
from backend.core.config import (
    OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TEMPERATURE,
    OPENAI_MAX_TOKENS, OPENAI_SAVES_DIR,
)
from backend.core.logger import log

# ── Optional imports ───────────────────────────────────────────────────────
try:
    from openai import OpenAI
    _OPENAI_AVAILABLE = True
except ImportError:
    OpenAI = None  # type: ignore
    _OPENAI_AVAILABLE = False
    log.warning("openai package not found. Install: pip install openai")

try:
    import requests as _req
    _REQUESTS_AVAILABLE = True
except ImportError:
    _req = None  # type: ignore
    _REQUESTS_AVAILABLE = False

_SYSTEM_PROMPT_BASE = (
    "You are JARVIS, a helpful, concise and professional AI assistant. "
    "Keep answers short and clear — suitable for text-to-speech output."
)


def _system_prompt_for_assistant_language() -> str:
    """Extend base prompt so spoken replies match the user's assistant language (en/hi/gu)."""
    lang = (getattr(cfg, "ASR_LANGUAGE", None) or "en-US").strip().lower().replace("_", "-")
    if lang.startswith("hi"):
        return (
            _SYSTEM_PROMPT_BASE
            + " Always reply in Hindi using Devanagari script. "
            "Address the user respectfully (e.g. जी, सर). "
            "If they write in English, you may still answer in Hindi unless they insist on English."
        )
    if lang.startswith("gu"):
        return (
            _SYSTEM_PROMPT_BASE
            + " Always reply in Gujarati using Gujarati script. "
            "Address the user respectfully (e.g. સર). "
            "If they write in English, you may still answer in Gujarati unless they insist on English."
        )
    return (
        _SYSTEM_PROMPT_BASE
        + " Use clear English. Address the user as 'sir' or 'sire'."
    )


class AIService:
    def __init__(self) -> None:
        self._client: Optional[object] = None
        self._available = False
        self._chat_history: List[Dict[str, str]] = []

        if _OPENAI_AVAILABLE and OPENAI_API_KEY:
            try:
                self._client = OpenAI(api_key=OPENAI_API_KEY)  # type: ignore
                self._available = True
                log.info("OpenAI client initialised")
            except Exception as e:
                log.error(f"OpenAI init failed: {e}")
        else:
            if not _OPENAI_AVAILABLE:
                log.warning("openai package missing")
            else:
                log.warning("OpenAI API key missing in config.py")

    # ── Chat ───────────────────────────────────────────────────────────────

    def chat(self, query: str, save_to_file: bool = False) -> str:
        """Send query to GPT. Falls back to web search on failure."""
        if not query.strip():
            return "Please provide a question or command, sir."

        if self._available and self._client:
            try:
                self._chat_history.append({"role": "user", "content": query})
                messages = [{"role": "system", "content": _system_prompt_for_assistant_language()}] + self._chat_history[-10:]

                resp = self._client.chat.completions.create(  # type: ignore
                    model=OPENAI_MODEL,
                    messages=messages,
                    temperature=OPENAI_TEMPERATURE,
                    max_tokens=OPENAI_MAX_TOKENS,
                )
                answer = resp.choices[0].message.content.strip()
                self._chat_history.append({"role": "assistant", "content": answer})

                if save_to_file:
                    self._save_response(query, answer)

                log.info(f"AI response: {answer[:80]}...")
                return answer

            except Exception as e:
                log.error(f"OpenAI error: {e}")
                emsg = str(e).lower()
                if "insufficient_quota" in emsg or "exceeded your current quota" in emsg or "429" in emsg:
                    return (
                        "OpenAI quota limit reached for this API key, sir. "
                        "Please add billing or use a new key in your backend settings."
                    )
                # Fall through to web search

        # Fallback chain
        answer = self._web_search(query)
        if answer:
            return answer

        return f"I'm unable to answer that right now. Let me search Google for '{query}' instead."

    def quick_prompt(self, prompt: str) -> str:
        """One-shot prompt — does not use chat history."""
        if not self._available or not self._client:
            return self._web_search(prompt) or f"I couldn't get an answer for: {prompt}"
        try:
            resp = self._client.chat.completions.create(  # type: ignore
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": _system_prompt_for_assistant_language()},
                    {"role": "user", "content": prompt},
                ],
                temperature=OPENAI_TEMPERATURE,
                max_tokens=OPENAI_MAX_TOKENS,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            log.error(f"OpenAI quick_prompt error: {e}")
            return self._web_search(prompt) or "AI unavailable right now."

    def get_motivational_quote(self) -> str:
        return self.quick_prompt(
            "Give me a short, powerful motivational quote (one sentence). "
            "Do not add commentary."
        )

    def reset_history(self) -> None:
        self._chat_history.clear()
        log.info("Chat history cleared")

    def get_history(self) -> List[Dict[str, str]]:
        return list(self._chat_history)

    # ── Web search fallback ────────────────────────────────────────────────

    def _web_search(self, query: str) -> Optional[str]:
        if not _REQUESTS_AVAILABLE:
            return None
        answer = self._duckduckgo(query)
        if not answer:
            answer = self._wikipedia(query)
        return answer

    def _duckduckgo(self, query: str) -> Optional[str]:
        try:
            resp = _req.get(  # type: ignore
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": "1", "skip_disambig": "1"},
                timeout=8,
            )
            data = resp.json()
            return data.get("Abstract") or data.get("Answer") or (
                data["RelatedTopics"][0].get("Text") if data.get("RelatedTopics") else None
            )
        except Exception:
            return None

    def _wikipedia(self, query: str) -> Optional[str]:
        try:
            resp = _req.get(  # type: ignore
                f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote_plus(query)}",
                headers={"User-Agent": "JarvisAssistant/2.0"},
                timeout=8,
            )
            if resp.status_code == 200:
                extract = resp.json().get("extract", "")
                sentences = extract.split(". ")
                return ". ".join(sentences[:3]) + "." if sentences else None
        except Exception:
            return None
        return None

    # ── File save ─────────────────────────────────────────────────────────

    def _save_response(self, prompt: str, response: str) -> None:
        try:
            os.makedirs(OPENAI_SAVES_DIR, exist_ok=True)
            safe_name = "".join(c for c in prompt[:50] if c.isalnum() or c in " _-").strip()
            fname = f"{safe_name or int(time.time())}.txt"
            path = os.path.join(OPENAI_SAVES_DIR, fname)
            with open(path, "w", encoding="utf-8") as f:
                f.write(f"Prompt: {prompt}\n{'='*50}\n\n{response}\n")
            log.info(f"AI response saved: {fname}")
        except Exception as e:
            log.warning(f"Could not save AI response: {e}")

    @property
    def available(self) -> bool:
        return self._available


# ── Singleton ──────────────────────────────────────────────────────────────
_ai_instance: Optional[AIService] = None


def get_ai() -> AIService:
    global _ai_instance
    if _ai_instance is None:
        _ai_instance = AIService()
    return _ai_instance
