# filepath: backend/services/files_service.py
"""
Files Service — folder creation, file search, file reading, screenshots.
"""

from __future__ import annotations
import os
import glob
import time
import platform
from typing import Optional, List, Dict, Any

from backend.core.config import SCREENSHOTS_DIR, PROJECT_ROOT
from backend.core.logger import log

# ── Optional screenshot imports ────────────────────────────────────────────
try:
    import pyautogui
    _PYAUTOGUI = True
except ImportError:
    pyautogui = None   # type: ignore
    _PYAUTOGUI = False

try:
    from PIL import ImageGrab
    _PIL = True
except ImportError:
    ImageGrab = None   # type: ignore
    _PIL = False


# ═══════════════════════════════════════════════════════════════════════════
# Folder / File Operations
# ═══════════════════════════════════════════════════════════════════════════

def create_folder(folder_name: str, parent_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a folder on the Desktop (default) or inside parent_path.
    Creates intermediate directories automatically.
    """
    if parent_path:
        base = os.path.expandvars(os.path.expanduser(parent_path))
    else:
        base = os.path.join(os.path.expanduser("~"), "Desktop")
        if not os.path.isdir(base):          # Desktop may not exist (CI / server)
            base = os.path.expanduser("~")

    target = os.path.join(base, folder_name)
    try:
        os.makedirs(target, exist_ok=True)
        log.info(f"Folder created: {target}")
        return {"success": True, "message": f"Folder '{folder_name}' created at {base}, sir.", "path": target}
    except Exception as e:
        log.error(f"create_folder error: {e}")
        return {"success": False, "message": f"Could not create folder: {e}"}


def search_file(filename: str, search_path: Optional[str] = None, max_results: int = 20) -> Dict[str, Any]:
    """
    Search for files matching *filename* (supports glob patterns) under search_path.
    Default search path: user home directory.
    """
    base = os.path.expandvars(os.path.expanduser(search_path or "~"))
    pattern = os.path.join(base, "**", f"*{filename}*")

    try:
        found = glob.glob(pattern, recursive=True)
        found = found[:max_results]
        if not found:
            return {"success": True, "results": [], "message": f"No files found matching '{filename}', sir."}
        results = [{"name": os.path.basename(f), "path": f, "size_kb": round(os.path.getsize(f) / 1024, 1)} for f in found]
        log.info(f"File search '{filename}': {len(results)} results")
        return {"success": True, "results": results, "message": f"Found {len(results)} file(s) matching '{filename}', sir."}
    except Exception as e:
        log.error(f"search_file error: {e}")
        return {"success": False, "message": f"Search failed: {e}", "results": []}


def read_file(filepath: str, max_chars: int = 2000) -> Dict[str, Any]:
    """
    Read a text / PDF / document file and return content string.
    Supports: .txt, .md, .py, .json, .csv, .log, .pdf (via PyMuPDF or pdfplumber)
    """
    path = os.path.expandvars(os.path.expanduser(filepath))
    if not os.path.isfile(path):
        return {"success": False, "message": f"File not found: {path}"}

    ext = os.path.splitext(path)[1].lower()
    content = ""

    try:
        if ext == ".pdf":
            content = _read_pdf(path, max_chars)
        elif ext in (".docx",):
            content = _read_docx(path, max_chars)
        else:
            # Plain text fallback
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read(max_chars)

        preview = content[:500] + ("..." if len(content) > 500 else "")
        log.info(f"File read: {os.path.basename(path)} ({len(content)} chars)")
        return {"success": True, "filename": os.path.basename(path), "content": content, "preview": preview}
    except Exception as e:
        log.error(f"read_file error: {e}")
        return {"success": False, "message": f"Could not read file: {e}"}


def _read_pdf(path: str, max_chars: int) -> str:
    try:
        import fitz   # PyMuPDF
        doc = fitz.open(path)
        text = ""
        for page in doc:
            text += page.get_text()
            if len(text) >= max_chars:
                break
        return text[:max_chars]
    except ImportError:
        pass
    try:
        import pdfplumber
        with pdfplumber.open(path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() or ""
                if len(text) >= max_chars:
                    break
        return text[:max_chars]
    except ImportError:
        return f"PDF reading requires: pip install PyMuPDF\nFile: {path}"


def _read_docx(path: str, max_chars: int) -> str:
    try:
        import docx
        doc = docx.Document(path)
        text = "\n".join(p.text for p in doc.paragraphs)
        return text[:max_chars]
    except ImportError:
        return f"DOCX reading requires: pip install python-docx\nFile: {path}"


def open_folder(folder_path: str) -> Dict[str, Any]:
    """Open a folder in the OS file explorer."""
    path = os.path.expandvars(os.path.expanduser(folder_path))
    if not os.path.isdir(path):
        return {"success": False, "message": f"Folder not found: {path}"}
    try:
        import subprocess
        if platform.system() == "Windows":
            os.startfile(path)  # type: ignore
        elif platform.system() == "Darwin":
            subprocess.Popen(["open", path])
        else:
            subprocess.Popen(["xdg-open", path])
        return {"success": True, "message": f"Opened folder: {path}", "path": path}
    except Exception as e:
        return {"success": False, "message": f"Could not open folder: {e}"}


# ═══════════════════════════════════════════════════════════════════════════
# Screenshots
# ═══════════════════════════════════════════════════════════════════════════

def take_screenshot(save_dir: Optional[str] = None, filename: Optional[str] = None) -> Dict[str, Any]:
    """
    Capture the screen and save to disk.
    Returns the filepath.
    """
    save_path = save_dir or SCREENSHOTS_DIR
    os.makedirs(save_path, exist_ok=True)
    ts = time.strftime("%Y%m%d_%H%M%S")
    fname = filename or f"screenshot_{ts}.png"
    full_path = os.path.join(save_path, fname)

    try:
        if _PYAUTOGUI:
            img = pyautogui.screenshot()
            img.save(full_path)
            log.info(f"Screenshot saved: {full_path}")
            return {"success": True, "message": f"Screenshot saved as {fname}, sir.", "path": full_path}

        elif _PIL:
            img = ImageGrab.grab()
            img.save(full_path)
            log.info(f"Screenshot saved: {full_path}")
            return {"success": True, "message": f"Screenshot saved as {fname}, sir.", "path": full_path}

        # macOS fallback — screencapture
        if platform.system() == "Darwin":
            import subprocess
            subprocess.run(["screencapture", "-x", full_path], check=True)
            log.info(f"Screenshot saved via screencapture: {full_path}")
            return {"success": True, "message": f"Screenshot saved as {fname}, sir.", "path": full_path}

        return {"success": False, "message": "No screenshot library available. pip install pyautogui"}

    except Exception as e:
        log.error(f"take_screenshot error: {e}")
        return {"success": False, "message": f"Screenshot failed: {e}"}


def list_desktop_files(limit: int = 30) -> Dict[str, Any]:
    """Return files on the user's Desktop."""
    desktop = os.path.join(os.path.expanduser("~"), "Desktop")
    if not os.path.isdir(desktop):
        return {"success": False, "message": "Desktop folder not found.", "files": []}
    items = []
    for name in os.listdir(desktop)[:limit]:
        fp = os.path.join(desktop, name)
        items.append({
            "name": name,
            "path": fp,
            "is_dir": os.path.isdir(fp),
            "size_kb": round(os.path.getsize(fp) / 1024, 1) if os.path.isfile(fp) else 0
        })
    return {"success": True, "files": items}
