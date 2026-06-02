# filepath: backend/services/ai_automation_service.py
"""
J.A.R.V.I.S. AI Automation Service
─────────────────────────────────────────────────────────────────────────────
Feature 1 — Smart Dynamic App Launcher
  • Resolve fuzzy app names to real executables across macOS / Windows / Linux
  • Launch apps, bring them to focus, or open URLs in default browser
  • Maintain a learned launch-history for smarter suggestions

Feature 2 — AI Prompt Generator
  • Generate context-aware prompts for ChatGPT, Midjourney, coding, email,
    cover letters, social media, and any custom role
  • Built-in template library with variable substitution
  • Optional GPT enhancement (if API key present)

Feature 3 — AI Tool Integration / Automation
  • Clipboard read / write
  • Type text into the focused window  (pyautogui)
  • Run a shell command and return stdout
  • Chain actions:  generate prompt → copy to clipboard → inject into app
─────────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import json
import os
import platform
import re
import shutil
import subprocess
import sys
import time
import webbrowser
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from backend.core.logger import log

# ── Platform detection ─────────────────────────────────────────────────────
_PLATFORM = platform.system()  # "Darwin" | "Windows" | "Linux"

# ── History file (per-user) ────────────────────────────────────────────────
_HISTORY_FILE = Path.home() / ".jarvis_launch_history.json"


# ═══════════════════════════════════════════════════════════════════════════
# 1.  SMART DYNAMIC APP LAUNCHER
# ═══════════════════════════════════════════════════════════════════════════

# --- Known app registries ---------------------------------------------------
_MAC_APPS: Dict[str, str] = {
    # Browser
    "chrome": "Google Chrome",
    "google chrome": "Google Chrome",
    "firefox": "Firefox",
    "safari": "Safari",
    "edge": "Microsoft Edge",
    "brave": "Brave Browser",
    "opera": "Opera",
    # Dev tools
    "vscode": "Visual Studio Code",
    "vs code": "Visual Studio Code",
    "code": "Visual Studio Code",
    "xcode": "Xcode",
    "terminal": "Terminal",
    "iterm": "iTerm",
    "iterm2": "iTerm",
    "pycharm": "PyCharm",
    "intellij": "IntelliJ IDEA",
    "webstorm": "WebStorm",
    "sublime": "Sublime Text",
    "atom": "Atom",
    "cursor": "Cursor",
    # Productivity
    "notes": "Notes",
    "calendar": "Calendar",
    "reminders": "Reminders",
    "mail": "Mail",
    "messages": "Messages",
    "facetime": "FaceTime",
    "finder": "Finder",
    "preview": "Preview",
    "pages": "Pages",
    "numbers": "Numbers",
    "keynote": "Keynote",
    "word": "Microsoft Word",
    "excel": "Microsoft Excel",
    "powerpoint": "Microsoft PowerPoint",
    "outlook": "Microsoft Outlook",
    "teams": "Microsoft Teams",
    "onenote": "Microsoft OneNote",
    # Media
    "spotify": "Spotify",
    "music": "Music",
    "vlc": "VLC",
    "photos": "Photos",
    "quicktime": "QuickTime Player",
    "imovie": "iMovie",
    "garage band": "GarageBand",
    "garageband": "GarageBand",
    # Communication
    "slack": "Slack",
    "discord": "Discord",
    "zoom": "Zoom",
    "skype": "Skype",
    "telegram": "Telegram",
    "whatsapp": "WhatsApp",
    "signal": "Signal",
    # Utilities
    "calculator": "Calculator",
    "system preferences": "System Preferences",
    "system settings": "System Preferences",
    "activity monitor": "Activity Monitor",
    "disk utility": "Disk Utility",
    "app store": "App Store",
    "settings": "System Preferences",
    "screenshot": "Screenshot",
    "textedit": "TextEdit",
    "text edit": "TextEdit",
    "automator": "Automator",
    "script editor": "Script Editor",
    "console": "Console",
    "keychain": "Keychain Access",
    "postman": "Postman",
    "docker": "Docker",
    "figma": "Figma",
    "notion": "Notion",
    "obsidian": "Obsidian",
    "1password": "1Password",
    "lastpass": "LastPass",
    "nordvpn": "NordVPN",
    "warp": "Warp",
}

_WIN_APPS: Dict[str, str] = {
    "chrome": "chrome",
    "google chrome": "chrome",
    "firefox": "firefox",
    "edge": "msedge",
    "notepad": "notepad",
    "calculator": "calc",
    "paint": "mspaint",
    "word": "winword",
    "excel": "excel",
    "powerpoint": "powerpnt",
    "outlook": "outlook",
    "teams": "teams",
    "zoom": "zoom",
    "discord": "discord",
    "spotify": "spotify",
    "vlc": "vlc",
    "vscode": "code",
    "vs code": "code",
    "code": "code",
    "terminal": "wt",
    "powershell": "powershell",
    "cmd": "cmd",
    "explorer": "explorer",
    "task manager": "taskmgr",
    "settings": "ms-settings:",
    "control panel": "control",
    "snipping tool": "snippingtool",
    "notepad++": "notepad++",
    "7zip": "7zfm",
    "winrar": "winrar",
    "skype": "skype",
    "slack": "slack",
    "telegram": "telegram",
    "whatsapp": "whatsapp",
    "signal": "signal",
    "pycharm": "pycharm",
    "intellij": "idea",
    "webstorm": "webstorm",
    "sublime": "sublime_text",
    "atom": "atom",
    "gimp": "gimp",
    "obs": "obs64",
    "steam": "steam",
    "epic games": "epicgameslauncher",
}

_LINUX_APPS: Dict[str, str] = {
    "chrome": "google-chrome",
    "google chrome": "google-chrome",
    "firefox": "firefox",
    "terminal": "gnome-terminal",
    "vscode": "code",
    "vs code": "code",
    "code": "code",
    "files": "nautilus",
    "gedit": "gedit",
    "calculator": "gnome-calculator",
    "settings": "gnome-control-center",
    "discord": "discord",
    "spotify": "spotify",
    "vlc": "vlc",
    "gimp": "gimp",
    "zoom": "zoom",
    "slack": "slack",
    "skype": "skype",
    "telegram": "telegram-desktop",
    "kate": "kate",
    "vim": "vim",
    "nano": "nano",
    "htop": "htop",
    "thunar": "thunar",
}

# Fuzzy score threshold (0–100)
_FUZZY_THRESHOLD = 60


def _fuzzy_score(a: str, b: str) -> int:
    """Very lightweight Levenshtein-ratio scorer (avoids extra deps)."""
    a, b = a.lower(), b.lower()
    if a == b:
        return 100
    if a in b or b in a:
        return 85
    # Count matching chars
    matches = sum(c in b for c in a)
    ratio = (2 * matches) / (len(a) + len(b)) if (len(a) + len(b)) > 0 else 0
    return int(ratio * 100)


def _resolve_app_name(query: str) -> Optional[str]:
    """Return a platform-specific app name/command for a fuzzy query."""
    q = query.lower().strip()

    if _PLATFORM == "Darwin":
        registry = _MAC_APPS
    elif _PLATFORM == "Windows":
        registry = _WIN_APPS
    else:
        registry = _LINUX_APPS

    # Exact match first
    if q in registry:
        return registry[q]

    # Partial / fuzzy match
    best_score = 0
    best_match = None
    for key, val in registry.items():
        score = _fuzzy_score(q, key)
        if score > best_score:
            best_score = score
            best_match = val

    if best_score >= _FUZZY_THRESHOLD:
        return best_match

    # Final fallback: if a real command exists on PATH, use it directly
    if shutil.which(q):
        return q

    return None


def _load_history() -> Dict[str, int]:
    try:
        if _HISTORY_FILE.exists():
            return json.loads(_HISTORY_FILE.read_text())
    except Exception:
        pass
    return {}


def _save_history(history: Dict[str, int]) -> None:
    try:
        _HISTORY_FILE.write_text(json.dumps(history, indent=2))
    except Exception:
        pass


def _record_launch(app: str) -> None:
    h = _load_history()
    h[app] = h.get(app, 0) + 1
    _save_history(h)


# ── Public API ─────────────────────────────────────────────────────────────

def launch_app(query: str) -> Dict[str, Any]:
    """
    Resolve *query* to a real app and launch it.
    Returns {"success": bool, "app": str, "message": str}
    """
    resolved = _resolve_app_name(query)
    if not resolved:
        return {
            "success": False,
            "app": query,
            "message": f"Could not find an app matching '{query}'. Try a more specific name.",
        }

    try:
        if _PLATFORM == "Darwin":
            # Use `open -a` for .app bundles
            result = subprocess.Popen(
                ["open", "-a", resolved],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
            )
            time.sleep(0.3)
            if result.poll() is not None and result.returncode != 0:
                err = result.stderr.read().decode().strip()
                # Try as a direct command
                subprocess.Popen([resolved], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        elif _PLATFORM == "Windows":
            os.startfile(resolved) if resolved.endswith(":") else subprocess.Popen(
                [resolved], shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
        else:  # Linux
            subprocess.Popen(
                [resolved],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )

        _record_launch(resolved)
        log.info(f"[AppLauncher] Launched '{resolved}' for query '{query}'")
        return {
            "success": True,
            "app": resolved,
            "query": query,
            "message": f"Launching {resolved}…",
        }

    except FileNotFoundError:
        return {
            "success": False,
            "app": resolved,
            "message": f"'{resolved}' is installed in the registry but not found on this system.",
        }
    except Exception as e:
        log.error(f"[AppLauncher] Error launching '{resolved}': {e}")
        return {"success": False, "app": resolved, "message": str(e)}


def get_launch_suggestions(partial: str = "", limit: int = 10) -> List[Dict[str, str]]:
    """Return app suggestions sorted by launch frequency + fuzzy match."""
    history = _load_history()

    if _PLATFORM == "Darwin":
        registry = _MAC_APPS
    elif _PLATFORM == "Windows":
        registry = _WIN_APPS
    else:
        registry = _LINUX_APPS

    candidates = []
    for key, val in registry.items():
        score = _fuzzy_score(partial, key) if partial else 50
        freq = history.get(val, 0)
        candidates.append({
            "label": key.title(),
            "value": val,
            "score": score + freq * 5,
        })

    candidates.sort(key=lambda x: x["score"], reverse=True)
    return [{"label": c["label"], "value": c["value"]} for c in candidates[:limit]]


def get_launch_history(limit: int = 10) -> List[Dict[str, Any]]:
    """Return most-launched apps."""
    history = _load_history()
    sorted_h = sorted(history.items(), key=lambda x: x[1], reverse=True)
    return [{"app": k, "count": v} for k, v in sorted_h[:limit]]


# ═══════════════════════════════════════════════════════════════════════════
# 2.  AI PROMPT GENERATOR
# ═══════════════════════════════════════════════════════════════════════════

# Template library  {category: {template_name: template_string}}
# Variables use {CAPS} convention so users can see what to fill in
PROMPT_TEMPLATES: Dict[str, Dict[str, str]] = {
    "writing": {
        "blog_post": (
            "Write a detailed, engaging blog post about {TOPIC}. "
            "Target audience: {AUDIENCE}. Tone: {TONE}. "
            "Include an attention-grabbing headline, introduction, 3–5 main sections "
            "with subheadings, and a conclusion with a call-to-action. "
            "Word count: approximately {WORD_COUNT} words."
        ),
        "email_professional": (
            "Write a professional email to {RECIPIENT} regarding {SUBJECT}. "
            "Key points to include: {KEY_POINTS}. "
            "Tone should be {TONE}. Keep it concise and action-oriented."
        ),
        "cover_letter": (
            "Write a compelling cover letter for the position of {JOB_TITLE} at {COMPANY}. "
            "My background: {BACKGROUND}. "
            "Key skills: {SKILLS}. "
            "Why I want this role: {MOTIVATION}. "
            "Keep it to one page, professional yet personable."
        ),
        "social_media_post": (
            "Create an engaging {PLATFORM} post about {TOPIC}. "
            "Brand voice: {TONE}. "
            "Include relevant hashtags, a hook in the first line, and a call-to-action. "
            "Target audience: {AUDIENCE}."
        ),
        "product_description": (
            "Write a persuasive product description for {PRODUCT_NAME}. "
            "Key features: {FEATURES}. Target customer: {TARGET_CUSTOMER}. "
            "Highlight benefits over features. Include a clear value proposition. "
            "Tone: {TONE}."
        ),
    },
    "coding": {
        "code_review": (
            "Review the following {LANGUAGE} code and provide: "
            "1) A summary of what it does, "
            "2) Potential bugs or issues, "
            "3) Performance improvements, "
            "4) Best practice suggestions, "
            "5) Security concerns if any.\n\nCode:\n```{LANGUAGE}\n{CODE}\n```"
        ),
        "debug_help": (
            "I'm getting the following error in my {LANGUAGE} code:\n\nError: {ERROR_MESSAGE}\n\n"
            "Here's the relevant code:\n```{LANGUAGE}\n{CODE}\n```\n\n"
            "Please explain what's causing this error and provide a corrected version."
        ),
        "generate_function": (
            "Write a {LANGUAGE} function that {DESCRIPTION}. "
            "Requirements: {REQUIREMENTS}. "
            "Include proper error handling, type hints (if applicable), "
            "and a docstring. Add example usage in comments."
        ),
        "refactor_code": (
            "Refactor the following {LANGUAGE} code to improve readability, "
            "performance, and maintainability. Follow {STYLE_GUIDE} conventions.\n\n"
            "Original code:\n```{LANGUAGE}\n{CODE}\n```\n\n"
            "Explain each change you make."
        ),
        "unit_tests": (
            "Generate comprehensive unit tests for the following {LANGUAGE} code using {TEST_FRAMEWORK}. "
            "Cover: happy path, edge cases, error cases, and boundary conditions.\n\n"
            "Code to test:\n```{LANGUAGE}\n{CODE}\n```"
        ),
        "api_design": (
            "Design a RESTful API for {SERVICE_NAME}. "
            "Include: endpoints, HTTP methods, request/response schemas, "
            "authentication approach, error codes, and example requests. "
            "Technology stack: {TECH_STACK}. "
            "Key features: {FEATURES}."
        ),
    },
    "image_generation": {
        "realistic_photo": (
            "Ultra-realistic photograph of {SUBJECT}, {SETTING}. "
            "Lighting: {LIGHTING}. Camera: {CAMERA} with {LENS} lens. "
            "Style: photojournalistic. "
            "Ultra-detailed, 8K resolution, RAW format."
        ),
        "digital_art": (
            "Digital artwork of {SUBJECT}. Style: {ART_STYLE}. "
            "Color palette: {COLORS}. Mood: {MOOD}. "
            "Trending on ArtStation, highly detailed, professional quality, "
            "concept art, 4K resolution."
        ),
        "logo_design": (
            "Minimalist logo design for {COMPANY_NAME}, a {INDUSTRY} company. "
            "Style: {STYLE}. Colors: {COLORS}. "
            "Clean, professional, scalable vector style, white background, "
            "suitable for both digital and print."
        ),
        "character_design": (
            "Character design of {CHARACTER_DESCRIPTION}. "
            "Art style: {ART_STYLE}. Setting/world: {WORLD}. "
            "Full body, dynamic pose, detailed costume, "
            "professional character sheet, multiple angles."
        ),
    },
    "business": {
        "business_plan": (
            "Create a comprehensive business plan outline for {BUSINESS_NAME}, "
            "a {BUSINESS_TYPE} in the {INDUSTRY} industry. "
            "Include: executive summary, market analysis, value proposition, "
            "revenue model, marketing strategy, competitive analysis, "
            "and financial projections for 3 years. "
            "Target market: {TARGET_MARKET}."
        ),
        "market_research": (
            "Conduct a market research analysis for {PRODUCT_OR_SERVICE} "
            "in the {MARKET} market. Include: market size, growth trends, "
            "target demographics, competitor landscape, "
            "customer pain points, and opportunities. "
            "Geographic focus: {GEOGRAPHY}."
        ),
        "sales_pitch": (
            "Write a compelling sales pitch for {PRODUCT_OR_SERVICE} "
            "targeting {TARGET_AUDIENCE}. "
            "Key pain points to address: {PAIN_POINTS}. "
            "Our unique value: {VALUE_PROPOSITION}. "
            "Include: attention hook, problem statement, solution, "
            "social proof, and clear CTA. Duration: {DURATION}."
        ),
        "swot_analysis": (
            "Perform a detailed SWOT analysis for {COMPANY_OR_PRODUCT} "
            "in the {INDUSTRY} industry. "
            "For each quadrant, provide 5–7 specific, actionable points. "
            "Context: {CONTEXT}."
        ),
    },
    "learning": {
        "explain_concept": (
            "Explain {CONCEPT} to someone with a {KNOWLEDGE_LEVEL} background in {FIELD}. "
            "Use analogies, real-world examples, and a step-by-step breakdown. "
            "End with 3 key takeaways and suggest 2 resources for further learning."
        ),
        "study_plan": (
            "Create a {DURATION} study plan to learn {TOPIC} for someone "
            "with {CURRENT_LEVEL} knowledge. "
            "Include: daily/weekly goals, recommended resources (books, courses, projects), "
            "milestone checkpoints, and practice exercises."
        ),
        "quiz_generator": (
            "Generate a quiz with {NUM_QUESTIONS} questions about {TOPIC} "
            "at {DIFFICULTY} difficulty level. "
            "Mix question types: multiple choice, true/false, and short answer. "
            "Include answer key with explanations."
        ),
    },
    "personal": {
        "resume_bullet": (
            "Transform this job duty into a powerful resume bullet point: '{JOB_DUTY}'. "
            "Use strong action verbs, include quantifiable metrics where possible, "
            "and highlight impact. Role: {JOB_TITLE} at {COMPANY}."
        ),
        "speech_writing": (
            "Write a {DURATION} speech for {OCCASION}. "
            "Speaker: {SPEAKER_ROLE}. Audience: {AUDIENCE}. "
            "Key message: {KEY_MESSAGE}. Tone: {TONE}. "
            "Include an opening hook, 3 main points, personal anecdote, and memorable closing."
        ),
        "custom": (
            "Act as {ROLE}. {TASK_DESCRIPTION}. "
            "Context: {CONTEXT}. "
            "Constraints: {CONSTRAINTS}. "
            "Output format: {OUTPUT_FORMAT}."
        ),
    },
}


def list_prompt_categories() -> List[str]:
    return list(PROMPT_TEMPLATES.keys())


def list_prompt_templates(category: str) -> List[str]:
    return list(PROMPT_TEMPLATES.get(category, {}).keys())


def get_prompt_template(category: str, template_name: str) -> Optional[str]:
    return PROMPT_TEMPLATES.get(category, {}).get(template_name)


def generate_prompt(
    category: str,
    template_name: str,
    variables: Dict[str, str],
    enhance_with_ai: bool = False,
) -> Dict[str, Any]:
    """
    Fill a prompt template with provided variables.
    If enhance_with_ai=True and OpenAI is configured, send the base prompt
    to GPT to get an improved version.
    Returns:
        {"success": bool, "prompt": str, "category": str,
         "template": str, "unfilled_vars": list, "enhanced": bool}
    """
    template = get_prompt_template(category, template_name)
    if not template:
        # Try to find closest match
        all_templates = []
        for cat, tmps in PROMPT_TEMPLATES.items():
            for name in tmps:
                all_templates.append((cat, name))
        return {
            "success": False,
            "message": f"Template '{template_name}' not found in category '{category}'. "
                       f"Available: {list(PROMPT_TEMPLATES.get(category, {}).keys())}",
        }

    # Fill in variables
    filled = template
    for key, value in variables.items():
        filled = filled.replace(f"{{{key.upper()}}}", value)
        filled = filled.replace(f"{{{key}}}", value)

    # Check for unfilled variables
    unfilled = re.findall(r"\{([A-Z_]+)\}", filled)

    enhanced = False
    if enhance_with_ai and not unfilled:
        try:
            from backend.services.ai_service import get_ai
            ai = get_ai()
            meta_prompt = (
                f"You are a prompt engineering expert. "
                f"Improve the following prompt to make it more specific, clear, and effective "
                f"while preserving its intent:\n\n{filled}"
            )
            result = ai.chat(meta_prompt)
            if result.get("success"):
                filled = result["response"]
                enhanced = True
        except Exception as e:
            log.warning(f"[PromptGen] AI enhancement failed: {e}")

    return {
        "success": True,
        "prompt": filled,
        "category": category,
        "template": template_name,
        "unfilled_vars": unfilled,
        "enhanced": enhanced,
        "char_count": len(filled),
        "word_count": len(filled.split()),
    }


def quick_generate_prompt(user_description: str) -> Dict[str, Any]:
    """
    Given a natural-language description, auto-select the best template
    and generate a prompt. Uses simple keyword matching.
    """
    desc = user_description.lower()

    # Auto-detect category
    if any(w in desc for w in ["code", "function", "bug", "debug", "api", "test", "refactor"]):
        category = "coding"
        if "test" in desc:
            template = "unit_tests"
        elif "debug" in desc or "error" in desc:
            template = "debug_help"
        elif "api" in desc:
            template = "api_design"
        elif "refactor" in desc:
            template = "refactor_code"
        else:
            template = "generate_function"
    elif any(w in desc for w in ["email", "cover letter", "blog", "social", "post", "write"]):
        category = "writing"
        if "email" in desc:
            template = "email_professional"
        elif "cover letter" in desc:
            template = "cover_letter"
        elif "social" in desc or "instagram" in desc or "twitter" in desc:
            template = "social_media_post"
        else:
            template = "blog_post"
    elif any(w in desc for w in ["image", "photo", "art", "logo", "design", "picture"]):
        category = "image_generation"
        if "logo" in desc:
            template = "logo_design"
        elif "character" in desc or "person" in desc:
            template = "character_design"
        elif "art" in desc:
            template = "digital_art"
        else:
            template = "realistic_photo"
    elif any(w in desc for w in ["business", "startup", "plan", "market", "sales", "pitch"]):
        category = "business"
        if "plan" in desc:
            template = "business_plan"
        elif "sales" in desc or "pitch" in desc:
            template = "sales_pitch"
        elif "market" in desc:
            template = "market_research"
        else:
            template = "swot_analysis"
    elif any(w in desc for w in ["learn", "study", "explain", "quiz", "teach"]):
        category = "learning"
        if "quiz" in desc:
            template = "quiz_generator"
        elif "study" in desc or "plan" in desc:
            template = "study_plan"
        else:
            template = "explain_concept"
    else:
        category = "personal"
        template = "custom"

    base_template = PROMPT_TEMPLATES[category][template]

    # Auto-fill with the user's description where possible
    vars_needed = re.findall(r"\{([A-Z_]+)\}", base_template)
    auto_vars = {}
    for var in vars_needed:
        # For the first unfilled variable, inject user description
        auto_vars[var] = user_description if not auto_vars else f"[{var}]"

    return generate_prompt(category, template, auto_vars)


# ═══════════════════════════════════════════════════════════════════════════
# 3.  AI TOOL INTEGRATION / AUTOMATION
# ═══════════════════════════════════════════════════════════════════════════

def clipboard_read() -> Dict[str, Any]:
    """Read current clipboard content."""
    try:
        if _PLATFORM == "Darwin":
            result = subprocess.run(["pbpaste"], capture_output=True, text=True)
            content = result.stdout
        elif _PLATFORM == "Windows":
            import tkinter as tk
            root = tk.Tk()
            root.withdraw()
            content = root.clipboard_get()
            root.destroy()
        else:
            result = subprocess.run(
                ["xclip", "-selection", "clipboard", "-o"],
                capture_output=True, text=True
            )
            content = result.stdout
        return {"success": True, "content": content, "length": len(content)}
    except Exception as e:
        return {"success": False, "error": str(e)}


def clipboard_write(text: str) -> Dict[str, Any]:
    """Write text to clipboard."""
    try:
        if _PLATFORM == "Darwin":
            proc = subprocess.Popen(["pbcopy"], stdin=subprocess.PIPE)
            proc.communicate(text.encode("utf-8"))
        elif _PLATFORM == "Windows":
            import tkinter as tk
            root = tk.Tk()
            root.withdraw()
            root.clipboard_clear()
            root.clipboard_append(text)
            root.update()
            root.destroy()
        else:
            proc = subprocess.Popen(
                ["xclip", "-selection", "clipboard"],
                stdin=subprocess.PIPE
            )
            proc.communicate(text.encode("utf-8"))

        log.info(f"[Automation] Clipboard written ({len(text)} chars)")
        return {"success": True, "message": f"Copied {len(text)} characters to clipboard.", "length": len(text)}
    except Exception as e:
        log.error(f"[Automation] Clipboard write error: {e}")
        return {"success": False, "error": str(e)}


def type_text(text: str, interval: float = 0.03) -> Dict[str, Any]:
    """
    Type text into the currently focused window using pyautogui.
    Falls back to clipboard paste if pyautogui is unavailable.
    """
    try:
        import pyautogui
        pyautogui.FAILSAFE = True
        pyautogui.typewrite(text, interval=interval)
        return {"success": True, "message": f"Typed {len(text)} characters.", "method": "pyautogui"}
    except ImportError:
        # Fallback: copy to clipboard and simulate Cmd/Ctrl+V
        clip_result = clipboard_write(text)
        if not clip_result["success"]:
            return clip_result
        try:
            import pyautogui
        except ImportError:
            return {
                "success": True,
                "message": "Text copied to clipboard (pyautogui not installed — paste manually).",
                "method": "clipboard_fallback",
            }
        try:
            import pyautogui
            key = "command" if _PLATFORM == "Darwin" else "ctrl"
            pyautogui.hotkey(key, "v")
            return {"success": True, "message": "Text pasted via clipboard.", "method": "clipboard_paste"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    except Exception as e:
        log.error(f"[Automation] type_text error: {e}")
        return {"success": False, "error": str(e)}


def run_shell_command(command: str, timeout: int = 15) -> Dict[str, Any]:
    """
    Execute a shell command safely and return stdout/stderr.
    Blocked commands: rm -rf, format, del /f, etc.
    """
    # Safety check — block destructive commands
    _BLOCKED = [
        r"rm\s+-rf\s+/",
        r"rm\s+-rf\s+~",
        r"format\s+[a-z]:",
        r"del\s+/[sf]",
        r"mkfs",
        r"dd\s+if=",
        r"shutdown",
        r"reboot",
        r"halt",
        r":(){:|:&};:",  # fork bomb
        r"wget.*\|.*sh",
        r"curl.*\|.*sh",
    ]
    for pattern in _BLOCKED:
        if re.search(pattern, command, re.IGNORECASE):
            return {
                "success": False,
                "error": "Command blocked for safety reasons.",
                "command": command,
            }

    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
            "returncode": result.returncode,
            "command": command,
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": f"Command timed out after {timeout}s", "command": command}
    except Exception as e:
        return {"success": False, "error": str(e), "command": command}


def generate_and_inject(
    category: str,
    template_name: str,
    variables: Dict[str, str],
    target_app: Optional[str] = None,
    action: str = "clipboard",   # "clipboard" | "type" | "launch_and_type"
) -> Dict[str, Any]:
    """
    Full automation chain:
      1. Generate a prompt from template
      2. Copy to clipboard OR type into focused window
      3. Optionally launch a target app first

    Returns combined result dict.
    """
    # Step 1: Generate prompt
    gen_result = generate_prompt(category, template_name, variables)
    if not gen_result["success"]:
        return gen_result

    prompt_text = gen_result["prompt"]
    steps: List[Dict[str, Any]] = [{"step": "generate_prompt", "result": gen_result}]

    # Step 2: Launch app if requested
    if target_app and action == "launch_and_type":
        launch_result = launch_app(target_app)
        steps.append({"step": "launch_app", "result": launch_result})
        if launch_result["success"]:
            time.sleep(1.5)  # Give app time to open

    # Step 3: Copy or type
    if action in ("clipboard", "launch_and_type"):
        inject_result = clipboard_write(prompt_text)
        steps.append({"step": "clipboard_write", "result": inject_result})
    elif action == "type":
        inject_result = type_text(prompt_text)
        steps.append({"step": "type_text", "result": inject_result})
    else:
        inject_result = clipboard_write(prompt_text)
        steps.append({"step": "clipboard_write", "result": inject_result})

    overall_success = all(s["result"].get("success", False) for s in steps)
    return {
        "success": overall_success,
        "prompt": prompt_text,
        "steps": steps,
        "message": (
            f"Generated prompt and {'copied to clipboard' if action != 'type' else 'typed into window'}."
            + (f" App '{target_app}' launched." if target_app and action == "launch_and_type" else "")
        ),
    }
