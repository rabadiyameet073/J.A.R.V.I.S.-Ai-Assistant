# filepath: backend/services/music_service.py
"""
Music Service — local file playback using pygame or playsound.
Supports play by name, stop, next/prev, fuzzy title matching.
"""

from __future__ import annotations
import os
import glob
import threading
import random
from typing import Optional, List, Dict, Any

from backend.core.config import AUDIO_EXTENSIONS, MUSIC_SEARCH_PATHS
from backend.core.logger import log

# ── Try pygame first, then playsound ──────────────────────────────────────
try:
    import pygame
    pygame.mixer.init()
    _PYGAME = True
    _PLAYSOUND = False
    log.info("pygame mixer ready for music playback")
except Exception:
    _PYGAME = False
    try:
        from playsound import playsound as _ps
        _PLAYSOUND = True
        log.info("playsound ready for music playback")
    except ImportError:
        _PLAYSOUND = False
        log.warning("Neither pygame nor playsound found — music disabled. pip install pygame")


class MusicService:
    """Thread-safe music player with queue, shuffle, stop."""

    def __init__(self) -> None:
        self._current_file: Optional[str] = None
        self._playlist: List[str] = []
        self._playlist_index: int = 0
        self._playing = False
        self._lock = threading.Lock()
        self._play_thread: Optional[threading.Thread] = None

    # ── Library scan ───────────────────────────────────────────────────────

    def scan_library(self, extra_paths: Optional[List[str]] = None) -> List[str]:
        """Scan known music directories and return all audio file paths."""
        search = list(MUSIC_SEARCH_PATHS)
        if extra_paths:
            search.extend(extra_paths)

        files: List[str] = []
        for folder in search:
            folder = os.path.expandvars(os.path.expanduser(folder))
            if not os.path.isdir(folder):
                continue
            for ext in AUDIO_EXTENSIONS:
                pattern = os.path.join(folder, "**", f"*{ext}")
                found = glob.glob(pattern, recursive=True)
                files.extend(found)

        log.info(f"Music library scan: {len(files)} files found")
        return files

    def find_song(self, query: str, extra_paths: Optional[List[str]] = None) -> Optional[str]:
        """Find the best-matching song file for the given search query."""
        query_lower = query.lower().strip()
        files = self.scan_library(extra_paths)
        if not files:
            return None

        # Single letter: only titles whose basename starts with that letter (web A–Z grid)
        if len(query_lower) == 1 and query_lower.isalpha():
            prefix_matches: List[str] = []
            for f in files:
                title = os.path.splitext(os.path.basename(f))[0].lower()
                if title.startswith(query_lower):
                    prefix_matches.append(f)
            if prefix_matches:
                prefix_matches.sort(key=lambda p: os.path.basename(p).lower())
                return random.choice(prefix_matches)
            return None

        # Exact name match first
        for f in files:
            if os.path.splitext(os.path.basename(f))[0].lower() == query_lower:
                return f

        # Substring match
        for f in files:
            if query_lower in os.path.basename(f).lower():
                return f

        # Word-level match (any word in query found in filename)
        words = query_lower.split()
        for f in files:
            fname = os.path.basename(f).lower()
            if all(w in fname for w in words):
                return f

        # Single-word partial match
        for f in files:
            fname = os.path.basename(f).lower()
            if any(w in fname for w in words):
                return f

        return None

    # ── Playback ───────────────────────────────────────────────────────────

    def play(self, song_query: str, extra_paths: Optional[List[str]] = None) -> Dict[str, Any]:
        """Find and play a song by name."""
        path = self.find_song(song_query, extra_paths)
        if not path:
            msg = f"I couldn't find '{song_query}' in your music library, sir."
            log.warning(msg)
            return {"success": False, "message": msg}
        return self.play_file(path)

    def play_file(self, filepath: str) -> Dict[str, Any]:
        """Play a specific file path."""
        if not os.path.isfile(filepath):
            return {"success": False, "message": f"File not found: {filepath}"}

        self.stop()
        with self._lock:
            self._current_file = filepath
            self._playing = True

        if _PYGAME:
            try:
                pygame.mixer.music.load(filepath)
                pygame.mixer.music.play()
                name = os.path.basename(filepath)
                display = os.path.splitext(name)[0]
                log.info(f"Playing: {name}")
                return {
                    "success": True,
                    "message": f"Playing {name}, sir.",
                    "file": filepath,
                    "song": display,
                }
            except Exception as e:
                log.error(f"pygame play error: {e}")
                return {"success": False, "message": f"Playback error: {e}"}

        elif _PLAYSOUND:
            def _run():
                try:
                    _ps(filepath)
                except Exception as e:
                    log.error(f"playsound error: {e}")
            self._play_thread = threading.Thread(target=_run, daemon=True)
            self._play_thread.start()
            name = os.path.basename(filepath)
            display = os.path.splitext(name)[0]
            return {
                "success": True,
                "message": f"Playing {name}, sir.",
                "file": filepath,
                "song": display,
            }

        return {"success": False, "message": "No audio backend available. Install pygame."}

    def stop(self) -> Dict[str, Any]:
        """Stop current playback."""
        with self._lock:
            self._playing = False
        if _PYGAME:
            try:
                pygame.mixer.music.stop()
            except Exception:
                pass
        log.info("Music stopped")
        return {"success": True, "message": "Music stopped, sir."}

    def pause(self) -> Dict[str, Any]:
        if _PYGAME:
            try:
                pygame.mixer.music.pause()
                return {"success": True, "message": "Music paused, sir."}
            except Exception as e:
                return {"success": False, "message": str(e)}
        return {"success": False, "message": "Pause not supported with current audio backend."}

    def resume(self) -> Dict[str, Any]:
        if _PYGAME:
            try:
                pygame.mixer.music.unpause()
                return {"success": True, "message": "Music resumed, sir."}
            except Exception as e:
                return {"success": False, "message": str(e)}
        return {"success": False, "message": "Resume not supported with current audio backend."}

    def get_status(self) -> Dict[str, Any]:
        """Return current playback status."""
        is_playing = False
        if _PYGAME:
            try:
                is_playing = pygame.mixer.music.get_busy()
            except Exception:
                pass

        return {
            "playing": is_playing,
            "current_file": self._current_file,
            "current_song": os.path.basename(self._current_file) if self._current_file else None,
        }

    def play_random(self, extra_paths: Optional[List[str]] = None) -> Dict[str, Any]:
        """Play a random song from the library."""
        files = self.scan_library(extra_paths)
        if not files:
            return {"success": False, "message": "No music files found in library, sir."}
        chosen = random.choice(files)
        return self.play_file(chosen)

    def list_songs(self, extra_paths: Optional[List[str]] = None, limit: int = 50) -> Dict[str, Any]:
        """Return list of songs in library."""
        files = self.scan_library(extra_paths)
        songs = [
            {"name": os.path.splitext(os.path.basename(f))[0], "path": f}
            for f in files[:limit]
        ]
        return {"success": True, "songs": songs, "total": len(files)}


# ── Singleton ──────────────────────────────────────────────────────────────
_music_instance: Optional[MusicService] = None
_music_lock = threading.Lock()


def get_music() -> MusicService:
    global _music_instance
    with _music_lock:
        if _music_instance is None:
            _music_instance = MusicService()
    return _music_instance
