"""
JARVIS Intent Classifier
Rule-based + keyword hybrid. Classifies any text command into a structured intent.
"""

from __future__ import annotations
import re
from dataclasses import dataclass, field
from typing import Optional, Dict, Any


# ── Intent category constants ──────────────────────────────────────────────
class Intent:
    GREETING      = "greeting"
    FAREWELL      = "farewell"
    SYSTEM_POWER  = "system_power"
    SYSTEM_INFO   = "system_info"
    NETWORK       = "network"
    VOLUME        = "volume"
    DISPLAY       = "display"
    MEDIA         = "media"
    FILES         = "files"
    COMMUNICATION = "communication"
    TIME          = "time"
    TIMER         = "timer"
    ALARM         = "alarm"
    CALCULATOR    = "calculator"
    WEATHER       = "weather"
    WEB_SEARCH    = "web_search"
    OPEN_APP      = "open_app"
    OPEN_WEBSITE  = "open_website"
    AI_CHAT       = "ai_chat"
    RESET_CHAT    = "reset_chat"
    SCREENSHOT    = "screenshot"
    REMINDER      = "reminder"
    HELP          = "help"
    APP_LAUNCH    = "app_launch"
    PROMPT_GEN    = "prompt_generation"
    AUTOMATION    = "automation"
    UNKNOWN       = "unknown"


@dataclass
class IntentResult:
    intent: str
    confidence: float          # 0.0 – 1.0
    params: Dict[str, Any] = field(default_factory=dict)
    raw_text: str = ""


# ── Keyword maps ───────────────────────────────────────────────────────────
_INTENT_RULES: list[tuple[str, list[str], float]] = [
    # (intent, keyword_triggers, base_confidence)

    # Greeting / farewell
    (Intent.GREETING,     ["hello", "hi jarvis", "hey jarvis", "good morning", "good afternoon", "good evening", "good night"], 0.95),
    (Intent.FAREWELL,     ["goodbye", "bye jarvis", "exit jarvis", "quit jarvis", "jarvis quit", "shut down jarvis", "stop jarvis"], 0.95),

    # Media — put BEFORE system power so "stop music" wins over "stop"
    (Intent.MEDIA,        [
        "play music", "play song", "play the song", "start playing",
        "stop music", "stop song", "stop the song", "stop the music", "stop playing",
        "pause music", "pause song", "pause the music", "pause the song",
        "resume music", "resume song", "continue music", "unpause", "resume playing",
        "next song", "next track", "skip song", "skip track", "previous song",
        "previous track", "last song", "go back song",
        "play random", "shuffle music", "random song",
        "open music", "music folder", "play",
    ], 0.92),

    # System power
    (Intent.SYSTEM_POWER, ["shutdown", "shut down", "restart", "reboot", "sleep", "hibernate", "lock", "logoff", "log off", "sign out"], 0.9),

    # System info
    (Intent.SYSTEM_INFO,  ["system info", "system status", "cpu", "ram", "memory", "battery", "disk", "storage", "ip address", "system information", "pc info", "computer info"], 0.9),

    # Network
    (Intent.NETWORK,      ["wifi", "wi-fi", "bluetooth", "internet", "check internet", "network"], 0.9),

    # Volume
    (Intent.VOLUME,       ["volume up", "volume down", "increase volume", "decrease volume", "mute", "unmute", "louder", "quieter"], 0.95),

    # Display
    (Intent.DISPLAY,      ["turn off display", "display off", "monitor off", "brightness up", "brightness down"], 0.9),

    # Files
    (Intent.FILES,        ["create folder", "make folder", "search file", "find file", "read file", "open folder", "screenshot", "take screenshot", "screen capture"], 0.9),

    # Communication
    (Intent.COMMUNICATION, ["call", "whatsapp", "send email", "email", "open whatsapp", "message"], 0.9),

    # Time
    (Intent.TIME,         ["what time", "current time", "time now", "what date", "today date", "today's date", "current date", "what day"], 0.95),

    # Timer
    (Intent.TIMER,        ["set timer", "start timer", "timer for", "countdown", "timer"], 0.9),

    # Alarm
    (Intent.ALARM,        ["set alarm", "wake me up", "alarm at", "alarm for"], 0.9),

    # Calculator
    (Intent.CALCULATOR,   ["calculate", "what is", "how much is", "compute", "calculator", "math", "plus", "minus", "times", "divided by", "percent", "square root"], 0.85),

    # Weather
    (Intent.WEATHER,      ["weather", "temperature", "forecast", "raining", "sunny", "humidity"], 0.9),

    # Web search (put specific phrases before bare "google" to avoid stealing "open google")
    (Intent.WEB_SEARCH,   ["google search", "search google for", "search on google",
                           "search for", "look up", "find information", "web search",
                           "who is", "what is", "where is", "when is", "why is", "how is",
                           "how many", "how much", "explain", "tell me about", "search", "google"], 0.8),

    # Open app
    (Intent.OPEN_APP,     ["open file explorer", "open windows explorer", "open chrome", "open firefox",
                           "open edge", "open notepad", "open calculator", "open paint", "open word",
                           "open excel", "open powerpoint", "open teams", "open zoom", "open discord",
                           "open spotify", "open vlc", "open terminal", "open explorer", "open task manager",
                           "open settings", "open vs code", "open vscode", "open code", "launch", "start app"], 0.9),

    # Open website
    (Intent.OPEN_WEBSITE, ["open youtube", "open google", "open github", "open wikipedia", "open stackoverflow", "open instagram", "open twitter", "open linkedin", "open reddit", "open facebook", "open amazon", "open netflix", "open gmail", "open chatgpt"], 0.9),

    # AI chat
    (Intent.AI_CHAT,      ["using artificial intelligence", "ask ai", "ai answer", "chatgpt", "ask gpt", "using ai"], 0.9),

    # Reset chat
    (Intent.RESET_CHAT,   ["reset chat", "clear chat", "new conversation", "forget conversation"], 0.9),

    # Screenshot
    (Intent.SCREENSHOT,   ["screenshot", "take screenshot", "capture screen", "screen grab"], 0.95),

    # Reminder
    (Intent.REMINDER,     ["remind me", "set reminder", "reminder to", "remember to"], 0.9),

    # Help
    (Intent.HELP,         ["help", "what can you do", "commands", "show commands", "list commands", "what do you do"], 0.95),

    # App launch (smart launcher)
    (Intent.APP_LAUNCH,   ["launch app", "launch application", "open app", "start application",
                            "run app", "run application", "quick launch", "smart launch",
                            "launch", "open application"], 0.92),

    # Prompt generation
    (Intent.PROMPT_GEN,   ["generate prompt", "create prompt", "make a prompt", "prompt for",
                            "write a prompt", "ai prompt", "chatgpt prompt", "midjourney prompt",
                            "prompt generator", "generate a prompt", "create a prompt",
                            "prompt template", "generate template"], 0.92),

    # Automation / tool actions
    (Intent.AUTOMATION,   ["copy to clipboard", "clipboard", "type text", "inject text",
                            "run command", "shell command", "automate", "automation",
                            "execute command", "generate and inject", "prompt and paste",
                            "write to clipboard", "paste prompt"], 0.90),
]


# ── Question word patterns that map to web_search ─────────────────────────
_QUESTION_PATTERNS = re.compile(
    r"^(who|what|where|when|why|how|which|whose|whom)\b", re.IGNORECASE
)


def classify(text: str) -> IntentResult:
    """
    Classify a command string into an IntentResult.
    Falls back to ai_chat if nothing matches.
    """
    if not text or not text.strip():
        return IntentResult(intent=Intent.UNKNOWN, confidence=0.0, raw_text=text)

    lowered = text.lower().strip()
    best_intent = Intent.UNKNOWN
    best_conf = 0.0
    best_params: Dict[str, Any] = {}

    for intent_name, keywords, base_conf in _INTENT_RULES:
        for kw in keywords:
            if kw in lowered:
                score = base_conf
                # Boost confidence if keyword is at start of string
                if lowered.startswith(kw):
                    score = min(score + 0.04, 1.0)
                if score > best_conf:
                    best_conf = score
                    best_intent = intent_name
                    break

    # If still unknown, check for question patterns → web search
    if best_intent == Intent.UNKNOWN and _QUESTION_PATTERNS.match(lowered):
        best_intent = Intent.WEB_SEARCH
        best_conf = 0.75

    # Extract params based on intent
    if best_intent == Intent.SYSTEM_POWER:
        best_params = _extract_power_params(lowered)
    elif best_intent == Intent.MEDIA:
        best_params = _extract_media_params(lowered)
    elif best_intent == Intent.OPEN_APP:
        best_params = _extract_app_name(lowered)
    elif best_intent == Intent.OPEN_WEBSITE:
        best_params = _extract_website(lowered)
    elif best_intent == Intent.VOLUME:
        best_params = _extract_volume_action(lowered)
    elif best_intent == Intent.NETWORK:
        best_params = _extract_network_action(lowered)
    elif best_intent == Intent.TIMER:
        best_params = _extract_timer_params(lowered)
    elif best_intent == Intent.REMINDER:
        best_params = _extract_reminder_params(lowered)
    elif best_intent == Intent.FILES:
        best_params = _extract_file_params(lowered)
    elif best_intent == Intent.COMMUNICATION:
        best_params = _extract_comm_params(lowered)
    elif best_intent == Intent.CALCULATOR:
        best_params = {"expression": lowered}
    elif best_intent == Intent.WEATHER:
        best_params = _extract_city(lowered)
    elif best_intent in (Intent.WEB_SEARCH, Intent.AI_CHAT):
        best_params = {"query": text}
    elif best_intent == Intent.APP_LAUNCH:
        best_params = _extract_app_launch_params(lowered)
    elif best_intent == Intent.PROMPT_GEN:
        best_params = _extract_prompt_gen_params(lowered)
    elif best_intent == Intent.AUTOMATION:
        best_params = {"query": text, "action": "clipboard"}

    # Fallback everything unrecognised to AI chat
    if best_intent == Intent.UNKNOWN:
        best_intent = Intent.AI_CHAT
        best_conf = 0.5
        best_params = {"query": text}

    return IntentResult(intent=best_intent, confidence=best_conf, params=best_params, raw_text=text)


# ── Param extractors ───────────────────────────────────────────────────────

def _extract_power_params(text: str) -> dict:
    action = "shutdown"
    if any(w in text for w in ["restart", "reboot"]):
        action = "restart"
    elif "sleep" in text:
        action = "sleep"
    elif "hibernate" in text:
        action = "hibernate"
    elif "lock" in text:
        action = "lock"
    elif any(w in text for w in ["logoff", "log off", "sign out"]):
        action = "logoff"

    # Extract delay seconds
    delay = 0
    m = re.search(r"in\s+(\d+)\s*(second|sec|minute|min)?", text)
    if m:
        n = int(m.group(1))
        unit = m.group(2) or "second"
        delay = n * 60 if "min" in unit else n

    return {"action": action, "delay": delay}


def _extract_media_params(text: str) -> dict:
    if any(w in text for w in ["stop", "pause"]):
        return {"action": "stop"}
    if "open music" in text or "music folder" in text:
        return {"action": "open_folder"}
    if "play" in text:
        # Try to extract song name / letter
        parts = text.split("play", 1)
        query = parts[1].strip() if len(parts) > 1 else ""
        for junk in ["song", "songs", "music", "the", "a", "an"]:
            query = re.sub(rf"\b{junk}\b", "", query).strip()
        # Single letter
        if len(query) == 1 and query.isalpha():
            return {"action": "play_letter", "letter": query.upper()}
        return {"action": "play_name", "query": query}
    return {"action": "play_name", "query": ""}


def _extract_app_name(text: str) -> dict:
    apps = [
        "file explorer", "windows explorer", "vs code", "vscode",
        "chrome", "firefox", "edge", "notepad", "calculator",
        "paint", "word", "excel", "powerpoint", "teams", "zoom",
        "discord", "spotify", "vlc", "terminal", "explorer",
        "task manager", "settings", "code", "skype",
    ]
    for app in sorted(apps, key=len, reverse=True):
        if app in text:
            return {"app_name": app}
    # Generic: "open X"
    m = re.search(r"(?:open|launch|start)\s+(.+)", text)
    if m:
        return {"app_name": m.group(1).strip()}
    return {"app_name": ""}


def _extract_website(text: str) -> dict:
    site_map = {
        "youtube": "https://www.youtube.com",
        "google": "https://www.google.com",
        "github": "https://www.github.com",
        "wikipedia": "https://www.wikipedia.org",
        "stackoverflow": "https://stackoverflow.com",
        "instagram": "https://www.instagram.com",
        "twitter": "https://twitter.com",
        "linkedin": "https://www.linkedin.com",
        "reddit": "https://www.reddit.com",
        "facebook": "https://www.facebook.com",
        "amazon": "https://www.amazon.com",
        "netflix": "https://www.netflix.com",
        "gmail": "https://mail.google.com",
        "chatgpt": "https://chat.openai.com",
    }
    for name, url in site_map.items():
        if name in text:
            return {"site_name": name, "url": url}
    return {"site_name": "", "url": ""}


def _extract_volume_action(text: str) -> dict:
    if any(w in text for w in ["mute", "silence"]):
        return {"action": "mute"}
    if any(w in text for w in ["unmute", "sound on"]):
        return {"action": "unmute"}
    if any(w in text for w in ["up", "increase", "louder", "raise"]):
        return {"action": "up"}
    if any(w in text for w in ["down", "decrease", "quieter", "lower"]):
        return {"action": "down"}
    return {"action": "up"}


def _extract_network_action(text: str) -> dict:
    device = "wifi" if "wifi" in text or "wi-fi" in text else "bluetooth"
    if any(w in text for w in ["on", "enable", "turn on"]):
        action = "on"
    elif any(w in text for w in ["off", "disable", "turn off"]):
        action = "off"
    else:
        action = "status"
    return {"device": device, "action": action}


def _extract_timer_params(text: str) -> dict:
    m = re.search(r"(\d+)\s*(second|sec|minute|min|hour|hr)?", text)
    if m:
        n = int(m.group(1))
        unit = (m.group(2) or "second").lower()
        if "min" in unit:
            seconds = n * 60
        elif "hour" in unit or unit == "hr":
            seconds = n * 3600
        else:
            seconds = n
        return {"seconds": seconds}
    return {"seconds": 60}


def _extract_reminder_params(text: str) -> dict:
    task = ""
    for phrase in ["remind me to ", "remind me ", "set reminder ", "remember to "]:
        if phrase in text:
            task = text.split(phrase, 1)[1].strip()
            break
    return {"task": task, "time": "soon"}


def _extract_file_params(text: str) -> dict:
    if "create folder" in text or "make folder" in text:
        m = re.search(r"(?:create|make)\s+folder\s+(.+)", text)
        name = m.group(1).strip() if m else "New Folder"
        return {"action": "create_folder", "name": name}
    if any(w in text for w in ["screenshot", "screen capture", "screen grab"]):
        return {"action": "screenshot"}
    if "read file" in text:
        m = re.search(r"read file\s+(.+)", text)
        path = m.group(1).strip() if m else ""
        return {"action": "read_file", "path": path}
    if any(w in text for w in ["search file", "find file"]):
        m = re.search(r"(?:search|find)\s+file\s+(.+)", text)
        name = m.group(1).strip() if m else ""
        return {"action": "search_file", "name": name}
    return {"action": "screenshot"}


def _extract_comm_params(text: str) -> dict:
    if "whatsapp" in text or "call" in text:
        # Try to extract contact name
        for noise in ["call", "whatsapp", "on", "please", "video", "voice", "make", "a"]:
            text = text.replace(noise, "")
        contact = " ".join(text.split()).strip()
        call_type = "video" if "video" in text else "voice"
        return {"action": "whatsapp_call", "contact": contact, "call_type": call_type}
    if "email" in text:
        return {"action": "open_email"}
    return {"action": "open_whatsapp"}


def _extract_city(text: str) -> dict:
    for prefix in ["weather in ", "weather of ", "weather for ", "temperature in "]:
        if prefix in text:
            city = text.split(prefix, 1)[1].strip()
            return {"city": city}
    return {"city": ""}


def _extract_app_launch_params(text: str) -> dict:
    """Extract app name from a smart-launch command."""
    for phrase in ["launch app ", "open app ", "launch application ", "start application ",
                   "run app ", "run application ", "quick launch ", "launch ", "open application "]:
        if phrase in text:
            app = text.split(phrase, 1)[1].strip()
            return {"app_name": app}
    # Generic fallback: take everything after "open" / "launch" / "start"
    m = re.search(r"(?:open|launch|start|run)\s+(.+)", text)
    if m:
        return {"app_name": m.group(1).strip()}
    return {"app_name": text.strip()}


def _extract_prompt_gen_params(text: str) -> dict:
    """Extract category / description for prompt generation."""
    # Try to detect category
    category_keywords = {
        "coding": ["code", "function", "debug", "api", "test", "refactor", "programming"],
        "writing": ["email", "blog", "cover letter", "social", "post", "write"],
        "image_generation": ["image", "photo", "art", "logo", "design", "picture"],
        "business": ["business", "startup", "plan", "market", "sales", "pitch"],
        "learning": ["learn", "study", "explain", "quiz", "teach"],
        "personal": ["resume", "speech", "custom"],
    }
    detected_category = "personal"
    for cat, keywords in category_keywords.items():
        if any(kw in text for kw in keywords):
            detected_category = cat
            break

    # Extract description (everything after "prompt for" / "prompt about" / "generate prompt")
    description = text
    for phrase in ["generate prompt for ", "generate prompt about ", "create prompt for ",
                   "prompt for ", "prompt about ", "write a prompt for ", "make a prompt for "]:
        if phrase in text:
            description = text.split(phrase, 1)[1].strip()
            break

    return {"category": detected_category, "description": description, "query": text}
