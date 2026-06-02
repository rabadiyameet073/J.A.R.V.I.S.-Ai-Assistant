# filepath: backend/services/communication_service.py
"""
Communication Service — WhatsApp Web, email via SMTP, contacts management.
"""

from __future__ import annotations
import os
import json
import time
import smtplib
import webbrowser
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from urllib.parse import quote_plus
from typing import Dict, Any, Optional

from backend.core.config import CONTACTS_FILE, IS_WINDOWS, IS_MAC
from backend.core.logger import log

# ── Optional imports ───────────────────────────────────────────────────────
try:
    import pyautogui
    _PYAUTOGUI = True
except ImportError:
    pyautogui = None   # type: ignore
    _PYAUTOGUI = False

try:
    import pyperclip
    _PYPERCLIP = True
except ImportError:
    pyperclip = None   # type: ignore
    _PYPERCLIP = False


# ═══════════════════════════════════════════════════════════════════════════
# Contacts
# ═══════════════════════════════════════════════════════════════════════════

def _load_contacts() -> Dict[str, Any]:
    if not os.path.isfile(CONTACTS_FILE):
        return {}
    try:
        with open(CONTACTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        log.error(f"load_contacts error: {e}")
        return {}


def _save_contacts(contacts: Dict[str, Any]) -> None:
    try:
        os.makedirs(os.path.dirname(CONTACTS_FILE), exist_ok=True)
        with open(CONTACTS_FILE, "w", encoding="utf-8") as f:
            json.dump(contacts, f, indent=2)
    except Exception as e:
        log.error(f"save_contacts error: {e}")


def get_contacts() -> Dict[str, Any]:
    contacts = _load_contacts()
    return {"success": True, "contacts": contacts, "count": len(contacts)}


def add_contact(name: str, phone: str, platform: str = "whatsapp") -> Dict[str, Any]:
    contacts = _load_contacts()
    contacts[name.lower()] = {
        "phone": phone,
        "platform": platform,
        "added_date": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    _save_contacts(contacts)
    log.info(f"Contact added: {name}")
    return {"success": True, "message": f"Contact '{name}' saved, sir."}


def lookup_contact(name: str) -> Optional[Dict[str, Any]]:
    contacts = _load_contacts()
    key = name.lower().strip()
    if key in contacts:
        return contacts[key]
    # Partial match
    for k, v in contacts.items():
        if key in k or k in key:
            return v
    return None


# ═══════════════════════════════════════════════════════════════════════════
# WhatsApp
# ═══════════════════════════════════════════════════════════════════════════

def open_whatsapp() -> Dict[str, Any]:
    """Open WhatsApp Web in browser."""
    try:
        webbrowser.open("https://web.whatsapp.com")
        log.info("Opened WhatsApp Web")
        return {"success": True, "message": "Opening WhatsApp Web, sir."}
    except Exception as e:
        log.error(f"open_whatsapp error: {e}")
        return {"success": False, "message": f"Could not open WhatsApp: {e}"}


def send_whatsapp_message(contact_name: str, message: str) -> Dict[str, Any]:
    """
    Send WhatsApp message via wa.me link (works on desktop + mobile).
    Looks up phone number from contacts.json.
    """
    contact = lookup_contact(contact_name)
    if not contact:
        # Try direct WhatsApp Web search if no contact found
        url = f"https://web.whatsapp.com/search/{quote_plus(contact_name)}"
        webbrowser.open(url)
        return {
            "success": True,
            "message": f"Contact '{contact_name}' not found. Opening WhatsApp search, sir.",
        }

    phone = contact.get("phone", "")
    if not phone or phone == "unknown":
        webbrowser.open("https://web.whatsapp.com")
        return {
            "success": False,
            "message": f"No phone number for {contact_name}. Please add it in contacts, sir.",
        }

    # Clean phone — keep only digits and leading +
    clean_phone = "+" + "".join(filter(str.isdigit, phone)) if phone.startswith("+") else "".join(filter(str.isdigit, phone))
    encoded_msg = quote_plus(message)
    url = f"https://wa.me/{clean_phone}?text={encoded_msg}"

    try:
        webbrowser.open(url)
        log.info(f"WhatsApp message to {contact_name} ({clean_phone})")
        return {"success": True, "message": f"Opening WhatsApp message to {contact_name}, sir."}
    except Exception as e:
        log.error(f"send_whatsapp_message error: {e}")
        return {"success": False, "message": f"WhatsApp error: {e}"}


def call_whatsapp(contact_name: str) -> Dict[str, Any]:
    """Open WhatsApp and attempt a voice call via wa.me."""
    contact = lookup_contact(contact_name)
    phone = contact.get("phone", "") if contact else ""

    if phone and phone != "unknown":
        clean_phone = "+" + "".join(filter(str.isdigit, phone)) if phone.startswith("+") else "".join(filter(str.isdigit, phone))
        url = f"https://wa.me/{clean_phone}"
        webbrowser.open(url)
        return {"success": True, "message": f"Opening WhatsApp for {contact_name}. Please tap the call button, sir."}

    webbrowser.open("https://web.whatsapp.com")
    return {"success": True, "message": f"Could not find {contact_name}'s number. Opening WhatsApp Web, sir."}


# ═══════════════════════════════════════════════════════════════════════════
# Email
# ═══════════════════════════════════════════════════════════════════════════

def send_email(
    to_email: str,
    subject: str,
    body: str,
    from_email: Optional[str] = None,
    app_password: Optional[str] = None,
    smtp_host: str = "smtp.gmail.com",
    smtp_port: int = 587,
) -> Dict[str, Any]:
    """
    Send email via Gmail SMTP (or any SMTP server).
    from_email + app_password can be passed or loaded from environment.
    """
    sender = from_email or os.environ.get("JARVIS_EMAIL_FROM", "")
    password = app_password or os.environ.get("JARVIS_EMAIL_PASS", "")

    if not sender or not password:
        # Fallback — open Gmail compose in browser
        encoded_subject = quote_plus(subject)
        encoded_body = quote_plus(body)
        gmail_url = f"https://mail.google.com/mail/?view=cm&to={to_email}&su={encoded_subject}&body={encoded_body}"
        webbrowser.open(gmail_url)
        log.info(f"Email credentials not set — opened Gmail compose for {to_email}")
        return {
            "success": True,
            "message": f"Gmail compose opened for {to_email}. Set JARVIS_EMAIL_FROM/PASS env vars for automated sending, sir.",
        }

    try:
        msg = MIMEMultipart()
        msg["From"] = sender
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(sender, password)
            server.sendmail(sender, to_email, msg.as_string())

        log.info(f"Email sent to {to_email}: {subject}")
        return {"success": True, "message": f"Email sent to {to_email}, sir."}
    except Exception as e:
        log.error(f"send_email error: {e}")
        return {"success": False, "message": f"Email failed: {e}"}


def open_gmail() -> Dict[str, Any]:
    try:
        webbrowser.open("https://mail.google.com")
        return {"success": True, "message": "Opening Gmail, sir."}
    except Exception as e:
        return {"success": False, "message": str(e)}


# ═══════════════════════════════════════════════════════════════════════════
# Web Search (helper)
# ═══════════════════════════════════════════════════════════════════════════

def web_search(query: str) -> Dict[str, Any]:
    """Open a Google search for the given query."""
    try:
        url = f"https://www.google.com/search?q={quote_plus(query)}"
        webbrowser.open(url)
        log.info(f"Web search: {query}")
        return {"success": True, "message": f"Searching Google for '{query}', sir.", "url": url}
    except Exception as e:
        return {"success": False, "message": f"Search failed: {e}"}
