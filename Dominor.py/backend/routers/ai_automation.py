# filepath: backend/routers/ai_automation.py
"""
J.A.R.V.I.S. AI Automation Router
──────────────────────────────────────────────────────────────────────────
Prefix: /api/automation

Endpoints:
  POST /api/automation/launch-app        — Smart dynamic app launcher
  GET  /api/automation/app-suggestions   — Fuzzy app suggestions
  GET  /api/automation/launch-history    — Most-launched apps
  GET  /api/automation/prompt-categories — List prompt template categories
  GET  /api/automation/prompt-templates  — List templates in a category
  GET  /api/automation/prompt-template   — Get raw template
  POST /api/automation/generate-prompt   — Fill template with variables
  POST /api/automation/quick-prompt      — Auto-detect + fill from description
  POST /api/automation/clipboard-read    — Read clipboard content
  POST /api/automation/clipboard-write   — Write text to clipboard
  POST /api/automation/type-text         — Type text into focused window
  POST /api/automation/run-command       — Execute shell command
  POST /api/automation/generate-inject   — Chain: generate + copy/type/launch
──────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from backend.core.logger import log
from backend.services.ai_automation_service import (
    launch_app,
    get_launch_suggestions,
    get_launch_history,
    list_prompt_categories,
    list_prompt_templates,
    get_prompt_template,
    generate_prompt,
    quick_generate_prompt,
    clipboard_read,
    clipboard_write,
    type_text,
    run_shell_command,
    generate_and_inject,
    PROMPT_TEMPLATES,
)

router = APIRouter(prefix="/api/automation", tags=["AI Automation"])


# ── Request models ─────────────────────────────────────────────────────────

class LaunchAppRequest(BaseModel):
    app_name: str = Field(..., description="App name to launch (fuzzy-matched)")


class GeneratePromptRequest(BaseModel):
    category: str = Field(..., description="Template category")
    template_name: str = Field(..., description="Template key within the category")
    variables: Dict[str, str] = Field(default_factory=dict, description="Variable substitutions")
    enhance_with_ai: bool = Field(False, description="Use GPT to improve the prompt")


class QuickPromptRequest(BaseModel):
    description: str = Field(..., description="Natural language description of what you need")


class ClipboardWriteRequest(BaseModel):
    text: str = Field(..., description="Text to copy to clipboard")


class TypeTextRequest(BaseModel):
    text: str = Field(..., description="Text to type into focused window")
    interval: float = Field(0.03, description="Seconds between keystrokes")


class RunCommandRequest(BaseModel):
    command: str = Field(..., description="Shell command to execute")
    timeout: int = Field(15, description="Timeout in seconds")


class GenerateInjectRequest(BaseModel):
    category: str
    template_name: str
    variables: Dict[str, str] = Field(default_factory=dict)
    target_app: Optional[str] = Field(None, description="App to launch before injecting")
    action: str = Field("clipboard", description="'clipboard' | 'type' | 'launch_and_type'")


# ── Routes ─────────────────────────────────────────────────────────────────

# ── Feature 1: App Launcher ────────────────────────────────────────────────

@router.post("/launch-app")
async def route_launch_app(req: LaunchAppRequest) -> Dict[str, Any]:
    """Smart fuzzy-match app launcher."""
    log.info(f"[AutoRouter] launch-app: {req.app_name}")
    result = launch_app(req.app_name)
    return result


@router.get("/app-suggestions")
async def route_app_suggestions(
    q: str = Query("", description="Partial app name for suggestions"),
    limit: int = Query(10, description="Max results"),
) -> Dict[str, Any]:
    """Return ranked app suggestions based on partial query + launch history."""
    suggestions = get_launch_suggestions(partial=q, limit=limit)
    return {"success": True, "suggestions": suggestions, "query": q}


@router.get("/launch-history")
async def route_launch_history(
    limit: int = Query(10, description="Max results"),
) -> Dict[str, Any]:
    """Return most-frequently launched apps."""
    history = get_launch_history(limit=limit)
    return {"success": True, "history": history}


# ── Feature 2: Prompt Generator ───────────────────────────────────────────

@router.get("/prompt-categories")
async def route_prompt_categories() -> Dict[str, Any]:
    """List all prompt template categories."""
    categories = list_prompt_categories()
    return {
        "success": True,
        "categories": categories,
        "count": len(categories),
    }


@router.get("/prompt-templates")
async def route_prompt_templates(
    category: str = Query(..., description="Category name"),
) -> Dict[str, Any]:
    """List template names within a category."""
    templates = list_prompt_templates(category)
    if not templates:
        return {
            "success": False,
            "message": f"No templates found for category '{category}'",
            "available_categories": list_prompt_categories(),
        }
    return {"success": True, "category": category, "templates": templates}


@router.get("/prompt-template")
async def route_get_template(
    category: str = Query(...),
    template_name: str = Query(...),
) -> Dict[str, Any]:
    """Return the raw template string."""
    tmpl = get_prompt_template(category, template_name)
    if not tmpl:
        return {"success": False, "message": f"Template not found: {category}/{template_name}"}
    import re
    variables = re.findall(r"\{([A-Z_]+)\}", tmpl)
    return {
        "success": True,
        "category": category,
        "template_name": template_name,
        "template": tmpl,
        "variables": variables,
    }


@router.get("/all-templates")
async def route_all_templates() -> Dict[str, Any]:
    """Return the full template library tree."""
    tree: Dict[str, Any] = {}
    import re
    for cat, templates in PROMPT_TEMPLATES.items():
        tree[cat] = {}
        for name, tmpl in templates.items():
            vars_found = re.findall(r"\{([A-Z_]+)\}", tmpl)
            tree[cat][name] = {
                "preview": tmpl[:120] + ("…" if len(tmpl) > 120 else ""),
                "variables": vars_found,
            }
    return {"success": True, "categories": tree}


@router.post("/generate-prompt")
async def route_generate_prompt(req: GeneratePromptRequest) -> Dict[str, Any]:
    """Fill a template with variables, optionally enhance with AI."""
    log.info(f"[AutoRouter] generate-prompt: {req.category}/{req.template_name}")
    result = generate_prompt(
        req.category,
        req.template_name,
        req.variables,
        enhance_with_ai=req.enhance_with_ai,
    )
    return result


@router.post("/quick-prompt")
async def route_quick_prompt(req: QuickPromptRequest) -> Dict[str, Any]:
    """Auto-detect best template + generate from a plain description."""
    log.info(f"[AutoRouter] quick-prompt: {req.description[:60]}")
    result = quick_generate_prompt(req.description)
    return result


# ── Feature 3: Automation / Tool Integration ──────────────────────────────

@router.get("/clipboard-read")
async def route_clipboard_read() -> Dict[str, Any]:
    """Read the current clipboard content."""
    return clipboard_read()


@router.post("/clipboard-write")
async def route_clipboard_write(req: ClipboardWriteRequest) -> Dict[str, Any]:
    """Write text to clipboard."""
    return clipboard_write(req.text)


@router.post("/type-text")
async def route_type_text(req: TypeTextRequest) -> Dict[str, Any]:
    """Type text into the currently focused window."""
    return type_text(req.text, interval=req.interval)


@router.post("/run-command")
async def route_run_command(req: RunCommandRequest) -> Dict[str, Any]:
    """Execute a shell command and return stdout/stderr."""
    log.info(f"[AutoRouter] run-command: {req.command[:80]}")
    return run_shell_command(req.command, timeout=req.timeout)


@router.post("/generate-inject")
async def route_generate_inject(req: GenerateInjectRequest) -> Dict[str, Any]:
    """
    Full automation chain: generate a prompt and inject it.
    action: 'clipboard' | 'type' | 'launch_and_type'
    """
    log.info(f"[AutoRouter] generate-inject: {req.category}/{req.template_name} → {req.action}")
    return generate_and_inject(
        req.category,
        req.template_name,
        req.variables,
        target_app=req.target_app,
        action=req.action,
    )
