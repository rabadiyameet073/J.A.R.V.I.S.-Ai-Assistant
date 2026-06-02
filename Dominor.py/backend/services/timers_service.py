# filepath: backend/services/timers_service.py
"""
Timers Service — countdown timers, alarms, stopwatch, calculator.
All timer state is stored in-memory; TTS callback fires when they fire.
"""

from __future__ import annotations
import time
import threading
import math
import re
import operator
from typing import Dict, Any, Optional, List, Callable
from backend.core.logger import log


# ═══════════════════════════════════════════════════════════════════════════
# Timer / Countdown
# ═══════════════════════════════════════════════════════════════════════════

class TimerEntry:
    def __init__(self, timer_id: str, label: str, duration_secs: float, callback: Optional[Callable] = None):
        self.id = timer_id
        self.label = label
        self.duration_secs = duration_secs
        self.started_at = time.time()
        self.remaining = duration_secs
        self.finished = False
        self.cancelled = False
        self.callback = callback
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, daemon=True, name=f"timer-{self.id}")
        self._thread.start()

    def _run(self) -> None:
        end_time = time.time() + self.duration_secs
        while time.time() < end_time:
            if self.cancelled:
                log.info(f"Timer '{self.label}' cancelled")
                return
            self.remaining = max(0, end_time - time.time())
            time.sleep(0.5)
        if not self.cancelled:
            self.finished = True
            self.remaining = 0
            log.info(f"Timer '{self.label}' finished")
            if self.callback:
                try:
                    self.callback(f"Timer finished: {self.label}")
                except Exception as e:
                    log.error(f"Timer callback error: {e}")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "duration_secs": self.duration_secs,
            "remaining_secs": round(self.remaining, 1),
            "finished": self.finished,
            "cancelled": self.cancelled,
        }


class TimersService:
    def __init__(self) -> None:
        self._timers: Dict[str, TimerEntry] = {}
        self._lock = threading.Lock()
        self._counter = 0
        self._speak_callback: Optional[Callable[[str], None]] = None
        self._stopwatch_start: Optional[float] = None
        self._stopwatch_running = False

    def set_speak_callback(self, cb: Callable[[str], None]) -> None:
        """Register TTS callback that fires when a timer/alarm finishes."""
        self._speak_callback = cb

    # ── Timers ─────────────────────────────────────────────────────────────

    def _new_id(self) -> str:
        self._counter += 1
        return f"timer_{self._counter}"

    def set_timer(self, duration_str: str, label: str = "") -> Dict[str, Any]:
        """
        Parse a duration string like "5 minutes", "90 seconds", "1 hour 30 minutes"
        and start a countdown timer.
        """
        secs = parse_duration(duration_str)
        if secs <= 0:
            return {"success": False, "message": f"Could not parse duration: '{duration_str}'"}

        tid = self._new_id()
        display_label = label or duration_str
        entry = TimerEntry(tid, display_label, secs, callback=self._speak_callback)
        with self._lock:
            self._timers[tid] = entry
        entry.start()

        mins, s = divmod(int(secs), 60)
        h, m = divmod(mins, 60)
        parts = []
        if h:
            parts.append(f"{h} hour{'s' if h != 1 else ''}")
        if m:
            parts.append(f"{m} minute{'s' if m != 1 else ''}")
        if s and not h:
            parts.append(f"{s} second{'s' if s != 1 else ''}")
        human = " and ".join(parts) or f"{secs} seconds"

        log.info(f"Timer set: {tid} ({human})")
        return {"success": True, "message": f"Timer set for {human}, sir.", "timer_id": tid, "duration_secs": secs}

    def cancel_timer(self, timer_id: str) -> Dict[str, Any]:
        with self._lock:
            entry = self._timers.get(timer_id)
        if not entry:
            return {"success": False, "message": f"Timer '{timer_id}' not found."}
        entry.cancelled = True
        return {"success": True, "message": f"Timer '{entry.label}' cancelled, sir."}

    def list_timers(self) -> Dict[str, Any]:
        with self._lock:
            timers = [e.to_dict() for e in self._timers.values() if not e.cancelled]
        return {"success": True, "timers": timers}

    # ── Alarm ──────────────────────────────────────────────────────────────

    def set_alarm(self, time_str: str, label: str = "") -> Dict[str, Any]:
        """
        Set an alarm at an absolute time like "7:30 AM", "14:00", "9pm".
        Calculates seconds until that time.
        """
        import datetime
        now = datetime.datetime.now()
        target = _parse_alarm_time(time_str)
        if target is None:
            return {"success": False, "message": f"Could not parse alarm time: '{time_str}'"}

        # If target is earlier today, schedule for tomorrow
        if target <= now:
            target = target + datetime.timedelta(days=1)

        delta = (target - now).total_seconds()
        tid = self._new_id()
        display_label = label or f"Alarm {time_str}"
        entry = TimerEntry(tid, display_label, delta, callback=self._speak_callback)
        with self._lock:
            self._timers[tid] = entry
        entry.start()

        log.info(f"Alarm set for {target.strftime('%H:%M')} ({tid})")
        return {
            "success": True,
            "message": f"Alarm set for {target.strftime('%I:%M %p')}, sir.",
            "timer_id": tid,
            "fires_at": target.strftime("%Y-%m-%d %H:%M:%S"),
        }

    # ── Stopwatch ──────────────────────────────────────────────────────────

    def start_stopwatch(self) -> Dict[str, Any]:
        self._stopwatch_start = time.time()
        self._stopwatch_running = True
        return {"success": True, "message": "Stopwatch started, sir."}

    def stop_stopwatch(self) -> Dict[str, Any]:
        if not self._stopwatch_running or self._stopwatch_start is None:
            return {"success": False, "message": "Stopwatch is not running, sir."}
        elapsed = time.time() - self._stopwatch_start
        self._stopwatch_running = False
        mins, secs = divmod(int(elapsed), 60)
        h, m = divmod(mins, 60)
        if h:
            human = f"{h}h {m}m {secs}s"
        elif m:
            human = f"{m}m {secs}s"
        else:
            human = f"{secs}s"
        return {"success": True, "message": f"Stopwatch stopped at {human}, sir.", "elapsed_secs": round(elapsed, 2)}

    def read_stopwatch(self) -> Dict[str, Any]:
        if not self._stopwatch_running or self._stopwatch_start is None:
            return {"success": False, "message": "Stopwatch is not running, sir.", "elapsed_secs": 0}
        elapsed = time.time() - self._stopwatch_start
        mins, secs = divmod(int(elapsed), 60)
        h, m = divmod(mins, 60)
        if h:
            human = f"{h}h {m}m {secs}s"
        elif m:
            human = f"{m}m {secs}s"
        else:
            human = f"{secs}s"
        return {"success": True, "message": f"Elapsed: {human}, sir.", "elapsed_secs": round(elapsed, 2)}


# ═══════════════════════════════════════════════════════════════════════════
# Calculator
# ═══════════════════════════════════════════════════════════════════════════

# Safe eval operator map
_OPS = {
    "+": operator.add,
    "-": operator.sub,
    "*": operator.mul,
    "/": operator.truediv,
    "**": operator.pow,
    "%": operator.mod,
}

_SAFE_MATH = {
    "sqrt": math.sqrt,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "log": math.log10,
    "ln": math.log,
    "abs": abs,
    "pi": math.pi,
    "e": math.e,
}

# Word-to-symbol normalization
_WORD_REPLACEMENTS = [
    (r"\bplus\b",        "+"),
    (r"\bminus\b",       "-"),
    (r"\btimes\b",       "*"),
    (r"\binto\b",        "*"),
    (r"\bmultiplied by\b", "*"),
    (r"\bdivided by\b",  "/"),
    (r"\bover\b",        "/"),
    (r"\bpercent of\b",  "/100 *"),
    (r"\bpercent\b",     "/100"),
    (r"\bsquared\b",     "**2"),
    (r"\bcubed\b",       "**3"),
    (r"\bsquare root of\b", "sqrt("),
    (r"\bsqrt\b",        "sqrt("),
    (r"\bto the power of\b", "**"),
    (r"\bpower\b",       "**"),
]


def calculate(expression: str) -> Dict[str, Any]:
    """
    Evaluate a mathematical expression from natural language or symbolic form.
    Returns the numeric result and a spoken answer.
    """
    # Remove 'calculate', 'what is', 'compute', etc.
    cleaned = re.sub(r"^(calculate|compute|what is|how much is|evaluate|solve)\s+", "", expression.strip(), flags=re.IGNORECASE)

    # Normalize word operators
    for pattern, replacement in _WORD_REPLACEMENTS:
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)

    # Balance parentheses opened by sqrt replacement
    open_count = cleaned.count("(") - cleaned.count(")")
    cleaned += ")" * open_count

    # Remove any characters that aren't in safe set
    safe_expr = re.sub(r"[^0-9+\-*/().%\s]", "", cleaned).strip()

    if not safe_expr:
        # Try to handle special functions via safe eval
        try:
            result = _safe_eval(cleaned)
            answer = _format_result(result)
            return {"success": True, "result": result, "answer": answer, "expression": expression}
        except Exception:
            return {"success": False, "message": f"Could not evaluate: '{expression}'"}

    try:
        result = _safe_eval(safe_expr)
        answer = _format_result(result)
        log.info(f"Calculator: {safe_expr} = {result}")
        return {"success": True, "result": result, "answer": answer, "expression": safe_expr}
    except ZeroDivisionError:
        return {"success": False, "message": "Division by zero is undefined, sir."}
    except Exception as e:
        return {"success": False, "message": f"Calculation error: {e}"}


def _safe_eval(expr: str) -> float:
    """Evaluate an expression with only basic math functions allowed."""
    # Use compile + restricted globals
    allowed_names = {k: v for k, v in _SAFE_MATH.items()}
    code = compile(expr.strip(), "<string>", "eval")
    for name in code.co_names:
        if name not in allowed_names:
            raise ValueError(f"Name '{name}' is not allowed")
    return float(eval(code, {"__builtins__": {}}, allowed_names))


def _format_result(result: float) -> str:
    """Format a number for TTS — integer if whole, else 4dp."""
    if result == int(result):
        return str(int(result))
    return f"{result:.4f}".rstrip("0").rstrip(".")


# ═══════════════════════════════════════════════════════════════════════════
# Duration / Time Parsers
# ═══════════════════════════════════════════════════════════════════════════

def parse_duration(text: str) -> float:
    """
    Convert a natural-language duration string to total seconds.
    Examples: "5 minutes", "1 hour 30 minutes", "90 seconds", "2h", "10m"
    Returns 0 if unparseable.
    """
    text = text.lower().strip()
    total = 0.0

    patterns = [
        (r"(\d+(?:\.\d+)?)\s*(?:hour|hr|h)\b",        3600),
        (r"(\d+(?:\.\d+)?)\s*(?:minute|min|m)\b",      60),
        (r"(\d+(?:\.\d+)?)\s*(?:second|sec|s)\b",      1),
    ]
    for pattern, multiplier in patterns:
        m = re.search(pattern, text)
        if m:
            total += float(m.group(1)) * multiplier

    # Fallback: bare number → minutes
    if total == 0:
        m = re.match(r"^(\d+(?:\.\d+)?)$", text.strip())
        if m:
            total = float(m.group(1)) * 60

    return total


def _parse_alarm_time(text: str):
    """Parse alarm time strings like '7:30 AM', '14:00', '9pm', '9 am'."""
    import datetime
    text = text.strip().lower()
    now = datetime.datetime.now()

    # Try various formats
    formats = ["%I:%M %p", "%I:%M%p", "%H:%M", "%I %p", "%I%p"]
    for fmt in formats:
        try:
            parsed = datetime.datetime.strptime(text, fmt)
            return now.replace(hour=parsed.hour, minute=parsed.minute, second=0, microsecond=0)
        except ValueError:
            continue

    # Handle "9 am", "9pm", "nine pm" etc.
    m = re.match(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", text)
    if m:
        hour = int(m.group(1))
        minute = int(m.group(2)) if m.group(2) else 0
        meridiem = m.group(3)
        if meridiem == "pm" and hour != 12:
            hour += 12
        elif meridiem == "am" and hour == 12:
            hour = 0
        return now.replace(hour=hour % 24, minute=minute, second=0, microsecond=0)

    return None


# ── Singleton ──────────────────────────────────────────────────────────────
_timers_instance: Optional[TimersService] = None
_timers_lock = threading.Lock()


def get_timers() -> TimersService:
    global _timers_instance
    with _timers_lock:
        if _timers_instance is None:
            _timers_instance = TimersService()
    return _timers_instance
