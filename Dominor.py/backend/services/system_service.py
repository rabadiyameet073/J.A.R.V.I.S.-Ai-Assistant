# filepath: backend/services/system_service.py
"""
System Service — power, volume, display, system info, apps, network.
Cross-platform: macOS + Windows (Linux best-effort).
"""

from __future__ import annotations
import os
import shutil
import subprocess
import platform
import webbrowser
import time
from typing import Dict, Any, Optional

from backend.core.config import IS_WINDOWS, IS_MAC, IS_LINUX
from backend.core.logger import log

# ── Optional imports ───────────────────────────────────────────────────────
try:
    import psutil
    _PSUTIL = True
except ImportError:
    psutil = None   # type: ignore
    _PSUTIL = False
    log.warning("psutil not found — system info limited. pip install psutil")

try:
    import pyautogui
    _PYAUTOGUI = True
except ImportError:
    pyautogui = None  # type: ignore
    _PYAUTOGUI = False


# ═══════════════════════════════════════════════════════════════════════════
# System Info
# ═══════════════════════════════════════════════════════════════════════════

def get_system_info() -> Dict[str, Any]:
    """Return CPU, RAM, disk, battery, platform info."""
    info: Dict[str, Any] = {
        "platform": platform.system(),
        "platform_version": platform.version(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "python_version": platform.python_version(),
        "hostname": platform.node(),
    }

    if _PSUTIL:
        try:
            cpu = psutil.cpu_percent(interval=1)
            mem = psutil.virtual_memory()
            # Use C:\ on Windows, / on Unix
            disk_path = "C:\\" if IS_WINDOWS else "/"
            disk = psutil.disk_usage(disk_path)
            info.update({
                "cpu_percent": cpu,
                "cpu_cores": psutil.cpu_count(logical=True),
                "ram_total_gb": round(mem.total / (1024 ** 3), 2),
                "ram_used_gb": round(mem.used / (1024 ** 3), 2),
                "ram_percent": mem.percent,
                "disk_total_gb": round(disk.total / (1024 ** 3), 2),
                "disk_used_gb": round(disk.used / (1024 ** 3), 2),
                "disk_percent": disk.percent,
                # Frontend-compatible aliases
                "cpu_name": platform.processor() or f"{psutil.cpu_count(logical=True)}-core CPU",
                "cpu_model": platform.processor() or f"{psutil.cpu_count(logical=True)}-core CPU",
                "ram_total": f"{round(mem.total / (1024 ** 3), 1)} GB",
                "ram_used": f"{round(mem.used / (1024 ** 3), 1)} GB",
                "disk_total": f"{round(disk.total / (1024 ** 3), 1)} GB",
                "disk_used": f"{round(disk.used / (1024 ** 3), 1)} GB",
            })
            bat = psutil.sensors_battery()
            if bat:
                info["battery_percent"] = round(bat.percent, 1)
                info["battery_plugged"] = bat.power_plugged
                secs = bat.secsleft
                if secs > 0:
                    info["battery_time_left"] = f"{secs // 3600}h {(secs % 3600) // 60}m"
        except Exception as e:
            log.warning(f"psutil info error: {e}")

    try:
        ip = _get_local_ip()
        info["local_ip"] = ip
        info["ip_address"] = ip   # frontend alias
    except Exception:
        info["local_ip"] = "Unknown"
        info["ip_address"] = "Unknown"

    # Ensure hostname alias is always present
    info["hostname"] = info.get("hostname") or platform.node()

    log.info(f"System info collected: CPU={info.get('cpu_percent', '?')}%")
    return info


def _get_local_ip() -> str:
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


# ═══════════════════════════════════════════════════════════════════════════
# Power Management
# ═══════════════════════════════════════════════════════════════════════════

def power_action(action: str, delay: int = 0) -> Dict[str, Any]:
    """
    Execute a system power command.
    action: shutdown | restart | sleep | hibernate | lock | logout
    """
    action = action.lower().strip()
    msg = ""
    try:
        if IS_WINDOWS:
            if action == "shutdown":
                subprocess.run(["shutdown", "/s", f"/t", str(delay)], check=True)
                msg = f"Shutting down in {delay} seconds, sir."
            elif action == "restart":
                subprocess.run(["shutdown", "/r", "/t", str(delay)], check=True)
                msg = f"Restarting in {delay} seconds, sir."
            elif action == "sleep":
                subprocess.run(["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"], check=True)
                msg = "Sleeping now, sir."
            elif action == "hibernate":
                subprocess.run(["shutdown", "/h"], check=True)
                msg = "Hibernating now, sir."
            elif action == "lock":
                subprocess.run(["rundll32.exe", "user32.dll,LockWorkStation"], check=True)
                msg = "Workstation locked, sir."
            elif action in ("logout", "logoff"):
                subprocess.run(["shutdown", "/l"], check=True)
                msg = "Logging off, sir."
            else:
                return {"success": False, "message": f"Unknown power action: {action}"}

        elif IS_MAC:
            if action == "shutdown":
                subprocess.run(["osascript", "-e", f'tell application "System Events" to shut down'], check=True)
                msg = "Shutting down, sir."
            elif action == "restart":
                subprocess.run(["osascript", "-e", f'tell application "System Events" to restart'], check=True)
                msg = "Restarting, sir."
            elif action == "sleep":
                subprocess.run(["pmset", "sleepnow"], check=True)
                msg = "Sleeping now, sir."
            elif action == "lock":
                subprocess.run(["pmset", "displaysleepnow"], check=True)
                msg = "Display locked, sir."
            elif action in ("logout", "logoff"):
                subprocess.run(["osascript", "-e", 'tell application "System Events" to log out'], check=True)
                msg = "Logging out, sir."
            else:
                return {"success": False, "message": f"Unknown power action: {action}"}

        elif IS_LINUX:
            if action == "shutdown":
                subprocess.run(["systemctl", "poweroff"], check=True)
                msg = "Shutting down, sir."
            elif action == "restart":
                subprocess.run(["systemctl", "reboot"], check=True)
                msg = "Restarting, sir."
            elif action == "sleep":
                subprocess.run(["systemctl", "suspend"], check=True)
                msg = "Sleeping now, sir."
            elif action == "lock":
                subprocess.run(["loginctl", "lock-session"], check=True)
                msg = "Session locked, sir."
            else:
                return {"success": False, "message": f"Unknown power action: {action}"}

        log.info(f"Power action: {action}")
        return {"success": True, "message": msg, "action": action}

    except Exception as e:
        log.error(f"Power action '{action}' failed: {e}")
        return {"success": False, "message": f"Power action failed: {e}", "action": action}


# ═══════════════════════════════════════════════════════════════════════════
# Volume Control
# ═══════════════════════════════════════════════════════════════════════════

def volume_control(action: str, level: Optional[int] = None) -> Dict[str, Any]:
    """
    action: up | down | mute | unmute | set
    level: 0-100 (used when action='set')
    """
    action = action.lower().strip()
    try:
        if IS_WINDOWS:
            from ctypes import cast, POINTER
            try:
                from comtypes import CLSCTX_ALL
                from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
                devices = AudioUtilities.GetSpeakers()
                interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
                volume_obj = cast(interface, POINTER(IAudioEndpointVolume))
                cur = volume_obj.GetMasterVolumeLevelScalar()
                if action == "mute":
                    volume_obj.SetMute(1, None)
                    return {"success": True, "message": "Volume muted, sir.", "action": action}
                elif action == "unmute":
                    volume_obj.SetMute(0, None)
                    return {"success": True, "message": "Volume unmuted, sir.", "action": action}
                elif action == "up":
                    new_vol = min(1.0, cur + 0.10)
                    volume_obj.SetMasterVolumeLevelScalar(new_vol, None)
                    return {"success": True, "message": f"Volume increased to {int(new_vol*100)}%, sir.", "action": action}
                elif action == "down":
                    new_vol = max(0.0, cur - 0.10)
                    volume_obj.SetMasterVolumeLevelScalar(new_vol, None)
                    return {"success": True, "message": f"Volume decreased to {int(new_vol*100)}%, sir.", "action": action}
                elif action == "set" and level is not None:
                    volume_obj.SetMasterVolumeLevelScalar(level / 100.0, None)
                    return {"success": True, "message": f"Volume set to {level}%, sir.", "action": action}
            except ImportError:
                # Fallback: nircmd or keypress
                _win_volume_key(action)
                return {"success": True, "message": f"Volume {action}, sir.", "action": action}

        elif IS_MAC:
            if action == "mute":
                subprocess.run(["osascript", "-e", "set volume output muted true"], check=True)
                return {"success": True, "message": "Volume muted, sir.", "action": action}
            elif action == "unmute":
                subprocess.run(["osascript", "-e", "set volume output muted false"], check=True)
                return {"success": True, "message": "Volume unmuted, sir.", "action": action}
            elif action in ("up", "down"):
                cur_output = subprocess.check_output(["osascript", "-e", "output volume of (get volume settings)"]).decode().strip()
                cur_vol = int(cur_output) if cur_output.isdigit() else 50
                new_vol = min(100, cur_vol + 10) if action == "up" else max(0, cur_vol - 10)
                subprocess.run(["osascript", "-e", f"set volume output volume {new_vol}"], check=True)
                return {"success": True, "message": f"Volume {action} to {new_vol}%, sir.", "action": action}
            elif action == "set" and level is not None:
                subprocess.run(["osascript", "-e", f"set volume output volume {level}"], check=True)
                return {"success": True, "message": f"Volume set to {level}%, sir.", "action": action}

        elif IS_LINUX:
            amixer_action = "5%+" if action == "up" else "5%-"
            if action == "mute":
                subprocess.run(["amixer", "set", "Master", "mute"], check=True)
            elif action == "unmute":
                subprocess.run(["amixer", "set", "Master", "unmute"], check=True)
            elif action in ("up", "down"):
                subprocess.run(["amixer", "set", "Master", amixer_action], check=True)
            elif action == "set" and level is not None:
                subprocess.run(["amixer", "set", "Master", f"{level}%"], check=True)
            return {"success": True, "message": f"Volume {action}, sir.", "action": action}

        return {"success": False, "message": "Volume control unavailable on this platform."}
    except Exception as e:
        log.error(f"Volume '{action}' error: {e}")
        return {"success": False, "message": f"Volume control failed: {e}", "action": action}


def _win_volume_key(action: str) -> None:
    """Fallback Windows volume via pyautogui keys."""
    if not _PYAUTOGUI:
        return
    if action == "up":
        for _ in range(2):
            pyautogui.press("volumeup")
    elif action == "down":
        for _ in range(2):
            pyautogui.press("volumedown")
    elif action == "mute":
        pyautogui.press("volumemute")


# ═══════════════════════════════════════════════════════════════════════════
# Display Control
# ═══════════════════════════════════════════════════════════════════════════

def display_action(action: str) -> Dict[str, Any]:
    """action: off | sleep | brightness_up | brightness_down"""
    action = action.lower().strip()
    try:
        if IS_WINDOWS:
            if action in ("off", "sleep"):
                subprocess.run(["powercfg", "/hibernate", "off"], capture_output=True)
                # Turn off display
                try:
                    import ctypes
                    ctypes.windll.user32.SendMessageW(0xFFFF, 0x0112, 0xF170, 2)
                except Exception:
                    pass
                return {"success": True, "message": "Display turned off, sir."}
        elif IS_MAC:
            if action in ("off", "sleep"):
                subprocess.run(["pmset", "displaysleepnow"], check=True)
                return {"success": True, "message": "Display sleeping, sir."}
            elif action == "brightness_up":
                subprocess.run(["brightness", "0.8"], capture_output=True)
                return {"success": True, "message": "Brightness increased, sir."}
            elif action == "brightness_down":
                subprocess.run(["brightness", "0.3"], capture_output=True)
                return {"success": True, "message": "Brightness decreased, sir."}
        elif IS_LINUX:
            if action in ("off", "sleep"):
                subprocess.run(["xset", "dpms", "force", "off"], check=True)
                return {"success": True, "message": "Display off, sir."}

        return {"success": False, "message": f"Display action '{action}' not supported."}
    except Exception as e:
        log.error(f"Display action '{action}' error: {e}")
        return {"success": False, "message": f"Display action failed: {e}"}


# ═══════════════════════════════════════════════════════════════════════════
# App Launcher
# ═══════════════════════════════════════════════════════════════════════════

_APP_MAP_WINDOWS = {
    "chrome": r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "firefox": r"C:\Program Files\Mozilla Firefox\firefox.exe",
    "edge": r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "paint": "mspaint.exe",
    "word": r"C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE",
    "excel": r"C:\Program Files\Microsoft Office\root\Office16\EXCEL.EXE",
    "powerpoint": r"C:\Program Files\Microsoft Office\root\Office16\POWERPNT.EXE",
    "explorer": "explorer.exe",
    "file explorer": "explorer.exe",
    "windows explorer": "explorer.exe",
    "task manager": "taskmgr.exe",
    "cmd": "cmd.exe",
    "terminal": "wt.exe",
    "spotify": r"C:\Users\%USERNAME%\AppData\Roaming\Spotify\Spotify.exe",
    "vlc": r"C:\Program Files\VideoLAN\VLC\vlc.exe",
    "discord": r"C:\Users\%USERNAME%\AppData\Local\Discord\app-*\Discord.exe",
    "zoom": r"C:\Users\%USERNAME%\AppData\Roaming\Zoom\bin\Zoom.exe",
}


def _resolve_windows_vscode() -> Optional[str]:
    """Return path to VS Code executable, or None."""
    candidates = [
        os.path.expandvars(r"%LocalAppData%\Programs\Microsoft VS Code\Code.exe"),
        r"C:\Program Files\Microsoft VS Code\Code.exe",
        r"C:\Program Files (x86)\Microsoft VS Code\Code.exe",
    ]
    for p in candidates:
        try:
            if p and os.path.isfile(p):
                return p
        except Exception:
            continue
    return shutil.which("code")

_APP_MAP_MAC = {
    "chrome": "/Applications/Google Chrome.app",
    "firefox": "/Applications/Firefox.app",
    "safari": "/Applications/Safari.app",
    "terminal": "/Applications/Utilities/Terminal.app",
    "calculator": "/Applications/Calculator.app",
    "notes": "/Applications/Notes.app",
    "music": "/Applications/Music.app",
    "spotify": "/Applications/Spotify.app",
    "vs code": "/Applications/Visual Studio Code.app",
    "vscode": "/Applications/Visual Studio Code.app",
    "finder": "/System/Library/CoreServices/Finder.app",
    "mail": "/Applications/Mail.app",
    "zoom": "/Applications/zoom.us.app",
    "discord": "/Applications/Discord.app",
    "slack": "/Applications/Slack.app",
    "vlc": "/Applications/VLC.app",
    "word": "/Applications/Microsoft Word.app",
    "excel": "/Applications/Microsoft Excel.app",
    "powerpoint": "/Applications/Microsoft PowerPoint.app",
}


def open_app(app_name: str) -> Dict[str, Any]:
    """Launch an application by name."""
    name = app_name.lower().strip()
    # Clean common prefixes
    for prefix in ("open ", "launch ", "start ", "run "):
        if name.startswith(prefix):
            name = name[len(prefix):]

    try:
        if IS_WINDOWS:
            if name in ("vs code", "vscode", "code"):
                vsc = _resolve_windows_vscode()
                if vsc:
                    subprocess.Popen([vsc], shell=False, close_fds=True)
                    return {"success": True, "message": "Opening Visual Studio Code, sir."}
                return {"success": False, "message": "VS Code not found. Install it or add 'code' to PATH, sir."}

            path = _APP_MAP_WINDOWS.get(name)
            if path:
                exp = os.path.expandvars(path)
                if exp.lower().endswith(".exe"):
                    subprocess.Popen([exp], shell=False, close_fds=True)
                else:
                    os.startfile(exp)  # type: ignore
                return {"success": True, "message": f"Opening {app_name}, sir."}
            # Try shell 'start' command
            subprocess.Popen(["cmd", "/c", "start", "", app_name], shell=True)
            return {"success": True, "message": f"Attempting to open {app_name}, sir."}

        elif IS_MAC:
            path = _APP_MAP_MAC.get(name)
            if path and os.path.exists(path):
                subprocess.Popen(["open", path])
                return {"success": True, "message": f"Opening {app_name}, sir."}
            # Try open -a fallback
            result = subprocess.run(["open", "-a", app_name], capture_output=True)
            if result.returncode == 0:
                return {"success": True, "message": f"Opening {app_name}, sir."}
            return {"success": False, "message": f"Could not find app: {app_name}"}

        elif IS_LINUX:
            subprocess.Popen([name], start_new_session=True)
            return {"success": True, "message": f"Opening {app_name}, sir."}

    except Exception as e:
        log.error(f"open_app '{app_name}' error: {e}")
        return {"success": False, "message": f"Could not open {app_name}: {e}"}

    return {"success": False, "message": f"App launch not supported on this platform."}


# ═══════════════════════════════════════════════════════════════════════════
# Website Opener
# ═══════════════════════════════════════════════════════════════════════════

_WEBSITE_MAP = {
    "youtube": "https://www.youtube.com",
    "google": "https://www.google.com",
    "github": "https://www.github.com",
    "wikipedia": "https://www.wikipedia.org",
    "stackoverflow": "https://stackoverflow.com",
    "instagram": "https://www.instagram.com",
    "twitter": "https://www.twitter.com",
    "linkedin": "https://www.linkedin.com",
    "reddit": "https://www.reddit.com",
    "facebook": "https://www.facebook.com",
    "amazon": "https://www.amazon.com",
    "netflix": "https://www.netflix.com",
    "gmail": "https://mail.google.com",
    "chatgpt": "https://chat.openai.com",
    "whatsapp": "https://web.whatsapp.com",
    "discord": "https://discord.com",
    "spotify": "https://open.spotify.com",
}


def open_website(site: str) -> Dict[str, Any]:
    """Open a known website or URL in the default browser."""
    name = site.lower().strip()
    for prefix in ("open ", "go to ", "visit ", "browse "):
        if name.startswith(prefix):
            name = name[len(prefix):]

    url = _WEBSITE_MAP.get(name)
    if not url:
        if name.startswith("http"):
            url = name
        else:
            url = f"https://www.{name}.com"

    try:
        webbrowser.open(url)
        log.info(f"Opened website: {url}")
        return {"success": True, "message": f"Opening {url} in your browser, sir.", "url": url}
    except Exception as e:
        log.error(f"open_website '{site}' error: {e}")
        return {"success": False, "message": f"Could not open {url}: {e}"}


# ═══════════════════════════════════════════════════════════════════════════
# Network / WiFi / Bluetooth
# ═══════════════════════════════════════════════════════════════════════════

def check_internet() -> Dict[str, Any]:
    """Test internet connectivity by pinging Google DNS."""
    import socket
    try:
        socket.setdefaulttimeout(3)
        socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect(("8.8.8.8", 53))
        return {"connected": True, "message": "Internet connection is active, sir."}
    except Exception:
        return {"connected": False, "message": "No internet connection detected, sir."}


def network_info() -> Dict[str, Any]:
    """Return local IP, hostname, network interfaces."""
    import socket
    info = {
        "hostname": socket.gethostname(),
        "local_ip": _get_local_ip(),
    }
    if _PSUTIL:
        try:
            stats = psutil.net_io_counters()
            info["bytes_sent_mb"] = round(stats.bytes_sent / 1024 / 1024, 2)
            info["bytes_recv_mb"] = round(stats.bytes_recv / 1024 / 1024, 2)
            interfaces = {}
            for iface, addrs in psutil.net_if_addrs().items():
                for addr in addrs:
                    if addr.family == 2:  # AF_INET
                        interfaces[iface] = addr.address
            info["interfaces"] = interfaces
        except Exception as e:
            log.warning(f"network_info psutil error: {e}")
    return info


def toggle_wifi(enable: bool) -> Dict[str, Any]:
    """Enable/disable WiFi. Platform-dependent."""
    state = "on" if enable else "off"
    try:
        if IS_WINDOWS:
            iface = "Wi-Fi"
            subprocess.run(["netsh", "interface", "set", "interface", iface, state], check=True)
        elif IS_MAC:
            action = "on" if enable else "off"
            subprocess.run(["networksetup", "-setairportpower", "en0", action], check=True)
        elif IS_LINUX:
            cmd = ["nmcli", "radio", "wifi", state]
            subprocess.run(cmd, check=True)
        return {"success": True, "message": f"WiFi turned {state}, sir."}
    except Exception as e:
        log.error(f"toggle_wifi {state} error: {e}")
        return {"success": False, "message": f"Could not toggle WiFi: {e}"}


# ═══════════════════════════════════════════════════════════════════════════
# Singleton
# ═══════════════════════════════════════════════════════════════════════════

# (No singleton needed — all functions are stateless module-level utilities)
