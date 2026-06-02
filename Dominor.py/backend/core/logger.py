"""
JARVIS Central Logger
Single logging setup imported by all modules.
"""

import logging
import sys
from logging.handlers import RotatingFileHandler
from backend.core.config import LOG_LEVEL, LOG_FILE


def _build_logger() -> logging.Logger:
    logger = logging.getLogger("jarvis")
    if logger.handlers:
        return logger  # already configured

    level = getattr(logging, LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)

    fmt = logging.Formatter(
        "[%(asctime)s] %(levelname)-8s %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    # Rotating file handler (5 MB × 3 backups)
    try:
        fh = RotatingFileHandler(LOG_FILE, maxBytes=5_000_000, backupCount=3, encoding="utf-8")
        fh.setFormatter(fmt)
        logger.addHandler(fh)
    except Exception:
        pass  # Non-critical if file logging fails

    return logger


log = _build_logger()
