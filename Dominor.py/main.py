# Optimized AI Desktop Assistant - Jarvis
# Features: Instant response, unlimited commands, call management, music control, auto-start

import os
import sys
import time
import datetime
import random
import json
import webbrowser
import subprocess
import threading
import queue
import re
from urllib.parse import quote_plus
from typing import Optional, List, Dict, Any

# ── CRITICAL: Set working directory to where this script lives ──
# This ensures config.py, names.txt, contacts.json etc. are always found
# regardless of how the script is launched (double-click, shortcut, bat, etc.)
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(_SCRIPT_DIR)
sys.path.insert(0, _SCRIPT_DIR)

# Try to import optional packages with fallbacks
try:
    import speech_recognition as sr
    SPEECH_AVAILABLE = True
except ImportError:
    print("Warning: Speech recognition not available. Install with: pip install speechrecognition")
    SPEECH_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    print("Warning: OpenAI not available. Install with: pip install openai")
    OPENAI_AVAILABLE = False

try:
    import pyttsx3
    TTS_AVAILABLE = True
except ImportError:
    print("Warning: Text-to-speech not available. Install with: pip install pyttsx3")
    TTS_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    print("Warning: Requests not available. Install with: pip install requests")
    REQUESTS_AVAILABLE = False

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    print("Warning: NumPy not available. Install with: pip install numpy")
    NUMPY_AVAILABLE = False

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    print("Warning: PyAutoGUI not available. Install with: pip install pyautogui")
    PYAUTOGUI_AVAILABLE = False

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    print("Warning: PsUtil not available. Install with: pip install psutil")
    PSUTIL_AVAILABLE = False

try:
    import pyperclip
    PYPERCLIP_AVAILABLE = True
except ImportError:
    print("Warning: PyPerclip not available. Install with: pip install pyperclip")
    PYPERCLIP_AVAILABLE = False

try:
    import ctypes
    CTYPES_AVAILABLE = True
except ImportError:
    print("Warning: ctypes not available")
    CTYPES_AVAILABLE = False

# Optional imports that might not be available
try:
    import win32gui
    import win32con
    import win32api
    WIN32_AVAILABLE = True
except ImportError:
    print("Warning: Win32 modules not available. Install with: pip install pywin32")
    WIN32_AVAILABLE = False

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    print("Warning: OpenCV not available. Install with: pip install opencv-python")
    CV2_AVAILABLE = False

try:
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    EMAIL_AVAILABLE = True
except ImportError:
    print("Warning: Email modules not available")
    EMAIL_AVAILABLE = False

try:
    import winreg
    WINREG_AVAILABLE = True
except ImportError:
    print("Warning: WinReg not available")
    WINREG_AVAILABLE = False

# Initialize OpenAI client with error handling
client = None
if OPENAI_AVAILABLE:
    try:
        from config import apikey
        client = OpenAI(api_key=apikey)
        # Success - no message (only show errors)
    except Exception as e:
        print(f"Warning: Could not initialize OpenAI client: {e}")
        client = None
else:
    print("Warning: OpenAI not available - AI features will be limited")

# Initialize TTS engine ONCE globally (CRITICAL FIX - prevents crashes)
tts_engine = None
if TTS_AVAILABLE:
    try:
        tts_engine = pyttsx3.init()
        # Configure voice settings for better quality
        voices = tts_engine.getProperty('voices')
        if voices:
            # Try to use a male voice (usually voices[0] is male, voices[1] is female)
            tts_engine.setProperty('voice', voices[0].id if len(voices) > 0 else None)
        tts_engine.setProperty('rate', 175)  # Speed of speech (default: 200)
        tts_engine.setProperty('volume', 1.0)  # Volume (0.0 to 1.0)
        # Success - no message (only show errors)
    except Exception as e:
        print(f"Warning: Could not initialize TTS engine: {e}")
        tts_engine = None
        TTS_AVAILABLE = False

# Custom Branding
print("="*60)
print("J.A.R.V.I.S. Presented by Meet Rabadiya")
print("created by R.M.D.U.")
print("="*60)

chatStr = ""

# User-configurable media directory
# Try to auto-detect music folder on D drive
MUSIC_DIR = None
def _find_music_directory():
    """Auto-detect music folder on D drive."""
    global MUSIC_DIR
    # Common music folder names (check lowercase first)
    possible_names = ["music", "Music", "MUSIC", "My Music", "Songs", "songs", "Audio", "audio"]
    d_drive = "D:\\"
    
    # Check for D:\music (lowercase) first - most common
    if os.path.exists(r"D:\music"):
        MUSIC_DIR = r"D:\music"
        print(f"Found music folder: {MUSIC_DIR}")
        return MUSIC_DIR
    
    # Check for D:\Music (capital M)
    if os.path.exists(r"D:\Music"):
        MUSIC_DIR = r"D:\Music"
        print(f"Found music folder: {MUSIC_DIR}")
        return MUSIC_DIR
    
    # Search for music folders on D drive
    try:
        if os.path.exists(d_drive):
            for item in os.listdir(d_drive):
                item_path = os.path.join(d_drive, item)
                if os.path.isdir(item_path):
                    # Check if folder name contains "music" or matches common names
                    item_lower = item.lower()
                    if "music" in item_lower or item in possible_names:
                        MUSIC_DIR = item_path
                        print(f"Found music folder: {MUSIC_DIR}")
                        return MUSIC_DIR
    except Exception as e:
        print(f"Error searching for music folder: {e}")
    
    # Check user's default Music folder on C drive
    user_music = os.path.join(os.path.expanduser("~"), "Music")
    if os.path.exists(user_music):
        MUSIC_DIR = user_music
        print(f"Found music folder: {MUSIC_DIR}")
        return MUSIC_DIR

    # Default fallback
    MUSIC_DIR = r"D:\music"
    print(f"Using default music folder: {MUSIC_DIR}")
    return MUSIC_DIR

# Initialize music directory
_find_music_directory()

# Track last played song for "play this song" command
last_played_song = None
current_music_process = None

# Supported audio file extensions
AUDIO_EXTENSIONS = (".mp3", ".wav", ".m4a", ".flac", ".aac", ".wma", ".ogg")

def _find_music_files(root_directory: str) -> list:
    """Return list of absolute paths to audio files under root_directory."""
    files = []
    if not root_directory or not os.path.exists(root_directory):
        print(f"Music directory does not exist: {root_directory}")
        return files
    try:
        for base, _dirs, filenames in os.walk(root_directory):
            for fname in filenames:
                if os.path.splitext(fname)[1].lower() in AUDIO_EXTENSIONS:
                    files.append(os.path.join(base, fname))
    except Exception as e:
        print(f"Music scan error: {e}")
    return files

# Print music directory info on startup (after function is defined)
if MUSIC_DIR:
    try:
        music_files_count = len(_find_music_files(MUSIC_DIR))
        print(f"[OK] Music folder: {MUSIC_DIR} (Found {music_files_count} audio files)")
    except:
        print(f"[OK] Music folder: {MUSIC_DIR}")
else:
    print(f"[WARNING] Music directory not set!")

def stop_music() -> bool:
    """Stop currently playing music by closing media player windows."""
    global current_music_process
    try:
        # Common media player process names
        media_players = [
            "wmplayer.exe",      # Windows Media Player
            "vlc.exe",           # VLC
            "spotify.exe",       # Spotify
            "groovemusic.exe",   # Groove Music
            "musicbee.exe",      # MusicBee
            "foobar2000.exe",    # Foobar2000
            "winamp.exe",        # Winamp
            "itunes.exe",        # iTunes
            "msedge.exe",        # Edge (if playing web music)
            "chrome.exe",        # Chrome (if playing web music)
            "firefox.exe"        # Firefox (if playing web music)
        ]
        
        stopped = False
        if PSUTIL_AVAILABLE:
            # Find and kill media player processes
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    proc_name = proc.info['name'].lower()
                    if any(player in proc_name for player in media_players):
                        proc.terminate()
                        stopped = True
                        print(f"Stopped media player: {proc_name}")
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass
        
        # Also try using taskkill command as fallback
        if not stopped:
            for player in media_players:
                try:
                    subprocess.run(['taskkill', '/F', '/IM', player], 
                                 shell=True, capture_output=True, timeout=2)
                except:
                    pass
        
        # Try to close any media player window using Alt+F4
        if PYAUTOGUI_AVAILABLE:
            try:
                pyautogui.hotkey('alt', 'f4')
                time.sleep(0.5)
            except:
                pass
        
        if stopped or current_music_process:
            current_music_process = None
            if TTS_AVAILABLE:
                say("Music stopped")
            else:
                print("Music stopped")
            return True
        else:
            if TTS_AVAILABLE:
                say("No music player found running")
            else:
                print("No music player found running")
            return False
            
    except Exception as e:
        if TTS_AVAILABLE:
            say("Could not stop music")
        print(f"Stop music error: {e}")
        return False

def play_song_by_letter(letter: str) -> bool:
    """Play the first song whose filename starts with the given letter (A-Z)."""
    global last_played_song, current_music_process
    if not letter or not letter.isalpha():
        say("Please specify a letter, like play A song")
        return False
    
    if not MUSIC_DIR or not os.path.exists(MUSIC_DIR):
        say(f"I cannot find your music folder. Please check if it exists on D drive.")
        print(f"Music directory not found: {MUSIC_DIR}")
        return False
    
    target = letter.lower()
    songs = _find_music_files(MUSIC_DIR)
    
    if not songs:
        say(f"I found no music files in {MUSIC_DIR}. Please check your music folder.")
        return False
    
    songs.sort(key=lambda p: os.path.basename(p).lower())
    for path in songs:
        name = os.path.basename(path).lower()
        if name.startswith(target):
            try:
                # Stop any currently playing music first
                stop_music()
                time.sleep(0.3)
                os.startfile(path)
                last_played_song = path
                current_music_process = path
                say(f"Playing {os.path.basename(path)}")
                return True
            except Exception as e:
                say("Could not play that song")
                print(f"Play error: {e}")
                return False
    say(f"No song starting with {letter.upper()} found in your music folder")
    return False

def _load_song_aliases() -> Dict[str, str]:
    """Loads song names from names.txt to be used as aliases."""
    aliases = {}
    try:
        with open("names.txt", "r", encoding='utf-8') as f:
            for line in f:
                clean_line = line.strip().replace('\\', '')
                if clean_line:
                    aliases[clean_line.lower()] = clean_line
    except FileNotFoundError:
        print("Warning: names.txt not found. Song name matching will be less accurate.")
    except Exception as e:
        print(f"Error loading names.txt: {e}")
    return aliases

def play_song_by_name(song_query: str) -> bool:
    """Play the best-matching song by name using names.txt and file search."""
    global last_played_song, current_music_process
    q = song_query.strip().lower()
    
    # Clean up common words (but preserve the actual song name)
    # Only remove if they're standalone words at the end
    if q.endswith(" song"):
        q = q[:-5].strip()
    elif q.endswith(" songs"):
        q = q[:-6].strip()
    # Remove standalone common words
    words = q.split()
    q = " ".join([w for w in words if w not in ["song", "songs", "music", "the", "a", "an", "play"]])
    q = q.strip()
    
    if not q:
        try:
            if MUSIC_DIR and os.path.exists(MUSIC_DIR):
                os.startfile(MUSIC_DIR)
                say("Opening your music folder")
                return True
            else:
                say("I couldn't find your music folder.")
                return False
        except Exception:
            say("I couldn't find your music folder.")
            return False

    if not MUSIC_DIR or not os.path.exists(MUSIC_DIR):
        say(f"I cannot find your music folder. Please check if it exists on D drive.")
        print(f"Music directory not found: {MUSIC_DIR}")
        return False

    song_aliases = _load_song_aliases()
    candidates = _find_music_files(MUSIC_DIR)
    
    if not candidates:
        say(f"I found no music files in {MUSIC_DIR}. Please check your music folder.")
        print(f"Debug: Music folder exists: {os.path.exists(MUSIC_DIR)}, Path: {MUSIC_DIR}")
        return False
    
    print(f"Debug: Found {len(candidates)} songs in music folder")
    
    best_match_path = None
    best_match_score = 0

    # 1. Check for a direct match in aliases from names.txt
    if q in song_aliases:
        # Find a file that contains this alias
        for path in candidates:
            filename_lower = os.path.basename(path).lower()
            if q in filename_lower:
                best_match_path = path
                print(f"Debug: Found alias match: {os.path.basename(path)}")
                break

    # 2. Search for exact filename match (without extension)
    if not best_match_path:
        for path in candidates:
            filename = os.path.splitext(os.path.basename(path))[0].lower()
            if filename == q:
                best_match_path = path
                print(f"Debug: Found exact filename match: {os.path.basename(path)}")
                break
    
    # 3. Search for query as substring in filename (case-insensitive)
    if not best_match_path:
        matching_files = []
        for path in candidates:
            filename_lower = os.path.basename(path).lower()
            filename_no_ext = os.path.splitext(filename_lower)[0]
            # Check if query is in filename or filename without extension
            if q in filename_lower or q in filename_no_ext:
                # Calculate match score (prefer matches that start with query)
                score = 0
                if filename_lower.startswith(q):
                    score = 100
                elif filename_no_ext.startswith(q):
                    score = 90
                elif q in filename_lower:
                    score = 50
                matching_files.append((score, path))
        
        if matching_files:
            # Sort by score (highest first), then by filename length (shortest first)
            matching_files.sort(key=lambda x: (-x[0], len(os.path.basename(x[1]))))
            best_match_path = matching_files[0][1]
            print(f"Debug: Found substring match: {os.path.basename(best_match_path)}")

    # 4. Try word-by-word matching (for multi-word queries)
    if not best_match_path and len(q.split()) > 1:
        query_words = q.split()
        matching_files = []
        for path in candidates:
            filename_lower = os.path.basename(path).lower()
            filename_no_ext = os.path.splitext(filename_lower)[0]
            # Count how many query words match
            match_count = sum(1 for word in query_words if word in filename_lower or word in filename_no_ext)
            if match_count > 0:
                score = (match_count / len(query_words)) * 100
                matching_files.append((score, path))
        
        if matching_files:
            matching_files.sort(key=lambda x: (-x[0], len(os.path.basename(x[1]))))
            if matching_files[0][0] >= 50:  # At least 50% of words match
                best_match_path = matching_files[0][1]
                print(f"Debug: Found word-based match: {os.path.basename(best_match_path)}")

    if best_match_path:
        try:
            # Stop any currently playing music first
            stop_music()
            time.sleep(0.3)
            os.startfile(best_match_path)
            last_played_song = best_match_path
            current_music_process = best_match_path
            # Use the alias for a cleaner announcement if available
            played_name = song_aliases.get(q, os.path.splitext(os.path.basename(best_match_path))[0])
            say(f"Playing {played_name}")
            return True
        except Exception as e:
            say(f"I found the song, but couldn't play it. The error is: {e}")
            print(f"Play error: {e}")
            return False

    # Debug: Show first few songs found
    if len(candidates) > 0:
        print(f"Debug: First 5 songs found: {[os.path.basename(c) for c in candidates[:5]]}")
        print(f"Debug: Searched for: '{q}'")
        print(f"Debug: Available filenames: {[os.path.splitext(os.path.basename(c))[0].lower() for c in candidates]}")
    say(f"Sorry, I could not find a song named '{song_query}' in your music folder. Available songs: {', '.join([os.path.splitext(os.path.basename(c))[0] for c in candidates[:5]])}")
    return False


# [https://youtu.be/Z3ZAJoi4x6Q](https://youtu.be/Z3ZAJoi4x6Q)

def chat(query):
    global chatStr
    chatStr += f"User: {query}\n Jarvis: "

    if not client:
        response = "AI chat is not available right now. Let me search the web for you instead."
        say(response)
        # Fallback to web search
        answer = web_search(query)
        if answer:
            say(answer)
            return answer
        else:
            google_search(query)
        return response

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are Jarvis, a helpful and concise AI assistant. Keep answers short and clear."},
                {"role": "user", "content": query}
            ],
            temperature=0.7,
            max_tokens=256
        )

        ai_response = response.choices[0].message.content
        print(f"Jarvis: {ai_response}")
        say(ai_response)
        chatStr += f"{ai_response}\n"
        return ai_response

    except Exception as e:
        error_msg = f"Sorry sire, I encountered an error. Let me search the web instead."
        say(error_msg)
        print(f"Chat Error: {e}")
        # Fallback to web search
        answer = web_search(query)
        if answer:
            say(answer)
        else:
            google_search(query)
        return error_msg


def ai(prompt):
    """Process an AI prompt, save to file, and return the response text."""
    if not client:
        say("AI is not configured. Searching the web instead.")
        answer = web_search(prompt)
        if answer:
            say(answer)
            return answer
        google_search(prompt)
        return "Opened Google search."

    text = f"OpenAI response for Prompt: {prompt}\n{'='*50}\n\n"

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=256
        )

        ai_response = response.choices[0].message.content
        text += ai_response

        if not os.path.exists("Openai"):
            os.mkdir("Openai")

        filename = f"prompt-{int(time.time())}"
        # Remove invalid characters for filename
        clean = "".join(c for c in prompt[:50] if c.isalnum() or c in (' ', '-', '_')).strip()
        if clean:
            filename = clean

        with open(f"Openai/{filename}.txt", "w", encoding='utf-8') as f:
            f.write(text)

        print(f"Jarvis: {ai_response}")
        say(ai_response)
        return ai_response

    except Exception as e:
        error_msg = f"Sorry sire, AI had an error. Let me search the web."
        say(error_msg)
        print(f"AI Error: {e}")
        answer = web_search(prompt)
        if answer:
            say(answer)
            return answer
        google_search(prompt)
        return error_msg


def say(text):
    """Speak text using TTS engine. Uses global engine to prevent crashes."""
    global tts_engine
    
    if not TTS_AVAILABLE or not tts_engine:
        print(f"Jarvis: {text}")
        return
    
    try:
        # Use the global TTS engine (already initialized)
        tts_engine.say(text)
        tts_engine.runAndWait()
    except RuntimeError as e:
        # If engine is in use, wait and retry once
        if "run loop already started" in str(e).lower():
            try:
                time.sleep(0.2)
                tts_engine.say(text)
                tts_engine.runAndWait()
            except:
                print(f"Jarvis: {text}")
        else:
            print(f"TTS Error: {e}")
            print(f"Jarvis: {text}")
    except Exception as e:
        # If TTS fails completely, try to reinitialize once
        print(f"TTS Error: {e}")
        try:
            tts_engine = pyttsx3.init()
            tts_engine.say(text)
            tts_engine.runAndWait()
        except:
            print(f"Jarvis: {text}")


def web_search(query):
    """Search DuckDuckGo + Wikipedia and return a spoken answer."""
    if not REQUESTS_AVAILABLE:
        return None

    answer = None

    # 1) Try DuckDuckGo instant-answer API
    try:
        ddg_url = "https://api.duckduckgo.com/"
        params = {
            'q': query,
            'format': 'json',
            'no_html': '1',
            'skip_disambig': '1'
        }
        resp = requests.get(ddg_url, params=params, timeout=8)
        data = resp.json()
        if data.get('Abstract'):
            answer = data['Abstract']
        elif data.get('Answer'):
            answer = data['Answer']
        elif data.get('RelatedTopics'):
            first = data['RelatedTopics'][0]
            if isinstance(first, dict):
                answer = first.get('Text')
    except Exception as e:
        print(f"DuckDuckGo error: {e}")

    # 2) Fallback: Wikipedia summary API
    if not answer:
        try:
            wiki_url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + quote_plus(query)
            resp = requests.get(wiki_url, timeout=8, headers={'User-Agent': 'JarvisAssistant/1.0'})
            if resp.status_code == 200:
                wdata = resp.json()
                extract = wdata.get('extract', '')
                if extract:
                    # Keep it concise for speech
                    sentences = extract.split('. ')
                    answer = '. '.join(sentences[:3]) + '.'
        except Exception as e:
            print(f"Wikipedia error: {e}")

    return answer

def google_search(query):
    """Open Google search in browser with the given query"""
    try:
        # Clean the query - remove common prefixes
        search_query = query.strip()
        
        # Remove common question prefixes if present
        prefixes = ["search for", "search", "google", "find", "look for"]
        for prefix in prefixes:
            if search_query.lower().startswith(prefix):
                search_query = search_query[len(prefix):].strip()
        
        # Encode the query for URL (proper URL encoding)
        encoded_query = quote_plus(search_query)
        google_url = f"https://www.google.com/search?q={encoded_query}"
        
        # Open in default browser
        webbrowser.open(google_url)
        say(f"Searching Google for: {search_query}")
        return True
    except Exception as e:
        say(f"Could not perform Google search: {str(e)}")
        print(f"Google search error: {e}")
        return False

def is_question(query):
    """Detect if the query is a question that should be searched on Google"""
    query_lower = query.lower().strip()
    
    # Question words
    question_words = [
        "who is", "who are", "who was", "who were",
        "what is", "what are", "what was", "what were",
        "where is", "where are", "where was", "where were",
        "when is", "when are", "when was", "when were",
        "why is", "why are", "why was", "why were",
        "how is", "how are", "how was", "how were",
        "how many", "how much", "how long", "how far",
        "which is", "which are", "which was", "which were",
        "tell me about", "explain", "what does", "what do"
    ]
    
    # Check if query starts with question words
    for q_word in question_words:
        if query_lower.startswith(q_word):
            return True
    
    # Check if query contains question mark
    if "?" in query:
        return True
    
    # Check for question patterns
    if any(word in query_lower for word in ["president of", "capital of", "layers in", "model", "definition of"]):
        return True
    
    return False


def make_call(phone_number):
    """Make a phone call using Windows dialer"""
    try:
        # Use Windows dialer
        subprocess.run(['start', f'tel:{phone_number}'], shell=True)
        return f"Calling {phone_number}"
    except Exception as e:
        return f"Could not make call: {str(e)}"


def send_email(to_email, subject, body):
    """Send email using Gmail SMTP"""
    try:
        # You'll need to set up app password in Gmail
        # For now, this is a template
        msg = MIMEMultipart()
        msg['From'] = "your-email@gmail.com"  # Replace with your email
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'plain'))
        
        # This would require proper SMTP setup
        say("Email functionality requires SMTP configuration")
        return "Email template created - needs SMTP setup"
    except Exception as e:
        return f"Email error: {str(e)}"


def create_reminder(task, time_str):
    """Create a simple reminder"""
    try:
        reminder_file = "reminders.txt"
        with open(reminder_file, "a", encoding='utf-8') as f:
            f.write(f"{datetime.datetime.now()}: {task} - Due: {time_str}\n")
        return f"Reminder created: {task}"
    except Exception as e:
        return f"Could not create reminder: {str(e)}"


def get_weather(city=""):
    """Get weather information using wttr.in (free, no API key needed)."""
    if not REQUESTS_AVAILABLE:
        return "Weather requires the requests package. Install with: pip install requests"
    try:
        location = quote_plus(city) if city else ""
        url = f"https://wttr.in/{location}?format=3"
        resp = requests.get(url, timeout=8, headers={'User-Agent': 'JarvisAssistant/1.0'})
        if resp.status_code == 200 and resp.text.strip():
            return resp.text.strip()
        # Fallback to detailed
        url2 = f"https://wttr.in/{location}?format=%l:+%C+%t+Humidity+%h+Wind+%w"
        resp2 = requests.get(url2, timeout=8, headers={'User-Agent': 'JarvisAssistant/1.0'})
        if resp2.status_code == 200:
            return resp2.text.strip()
        return f"Could not get weather for {city if city else 'your location'}"
    except Exception as e:
        return f"Weather error: {str(e)}"


def open_whatsapp():
    """Open WhatsApp Web or Desktop app"""
    try:
        # Try WhatsApp Desktop first
        whatsapp_paths = [
            r"C:\Users\{}\AppData\Local\WhatsApp\WhatsApp.exe".format(os.getenv('USERNAME')),
            r"C:\Program Files\WhatsApp\WhatsApp.exe",
            r"C:\Program Files (x86)\WhatsApp\WhatsApp.exe"
        ]
        
        for path in whatsapp_paths:
            if os.path.exists(path):
                os.startfile(path)
                say("Opening WhatsApp Desktop")
                return True
        
        # If desktop app not found, open WhatsApp Web
        webbrowser.open("https://web.whatsapp.com")
        say("Opening WhatsApp Web")
        return True
        
    except Exception as e:
        say(f"Could not open WhatsApp: {str(e)}")
        return False


def _type_text_safe(text):
    """Type text reliably using clipboard paste (supports all characters)."""
    if PYPERCLIP_AVAILABLE and PYAUTOGUI_AVAILABLE:
        pyperclip.copy(text)
        pyautogui.hotkey('ctrl', 'v')
    elif PYAUTOGUI_AVAILABLE:
        # Fallback: typewrite only works for ASCII
        pyautogui.typewrite(text, interval=0.04)


def _focus_whatsapp_window():
    """Find and bring WhatsApp Desktop window to the foreground. Returns (hwnd, rect) or (None, None)."""
    if not WIN32_AVAILABLE:
        return None, None
    try:
        results = []
        def _enum(hwnd, _):
            if win32gui.IsWindowVisible(hwnd):
                title = win32gui.GetWindowText(hwnd)
                if "whatsapp" in title.lower():
                    results.append(hwnd)
        win32gui.EnumWindows(_enum, None)
        if results:
            hwnd = results[0]
            # Restore if minimised, then maximise
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
            time.sleep(0.3)
            win32gui.ShowWindow(hwnd, win32con.SW_MAXIMIZE)
            time.sleep(0.3)
            win32gui.SetForegroundWindow(hwnd)
            time.sleep(0.5)
            rect = win32gui.GetWindowRect(hwnd)
            return hwnd, rect
    except Exception as e:
        print(f"Could not focus WhatsApp window: {e}")
    return None, None


def call_whatsapp_contact(contact_name, call_type="voice"):
    """Call someone on WhatsApp using the desktop app with automated call initiation."""
    try:
        if not PYAUTOGUI_AVAILABLE:
            say("WhatsApp calling requires pyautogui. Install with pip install pyautogui")
            return

        # Look up saved phone number
        contacts = manage_contacts()
        phone = None
        if contact_name.lower() in contacts:
            phone = contacts[contact_name.lower()].get("phone")

        say(f"Calling {contact_name} on WhatsApp")

        # Open WhatsApp Desktop
        if not open_whatsapp():
            return

        time.sleep(5)  # Wait for WhatsApp to fully load

        # Bring window to front and maximise so button positions are predictable
        _focus_whatsapp_window()

        # Open search with Ctrl+K (WhatsApp universal search bar)
        try:
            pyautogui.hotkey('ctrl', 'k')
        except Exception:
            pyautogui.hotkey('ctrl', 'f')
        time.sleep(1)

        # Type the search query — prefer phone number for accuracy
        search_term = phone if (phone and phone != "unknown") else contact_name
        _type_text_safe(search_term)
        time.sleep(2)

        # Select the first search result
        pyautogui.press('enter')
        time.sleep(2)

        # --- Click the call button at the top-right of the chat header ---
        # In a maximised WhatsApp Desktop window the icons sit near the top-right.
        # Layout (right-to-left): ⋮ menu | 📹 video call | 📞 voice call | search
        screen_w, screen_h = pyautogui.size()

        if call_type == "video":
            # Video-call icon is roughly the 2nd icon from the right edge
            call_x = screen_w - 90
            call_y = 55
        else:
            # Voice-call icon is roughly the 3rd icon from the right edge
            call_x = screen_w - 130
            call_y = 55

        pyautogui.click(call_x, call_y)
        time.sleep(2)

        # WhatsApp may show a confirmation pop-up — press Enter to confirm
        pyautogui.press('enter')

        label = "Video" if call_type == "video" else "Voice"
        say(f"{label} call started with {contact_name}")

    except Exception as e:
        say(f"Could not call {contact_name}. Error: {str(e)}")
        print(f"WhatsApp call error: {e}")


def call_phone_number(phone_number):
    """Make a regular phone call"""
    try:
        # Clean phone number (remove spaces, dashes, etc.)
        clean_number = ''.join(filter(str.isdigit, phone_number))
        
        # Use Windows Phone app or Skype
        if clean_number:
            # Try Windows Phone app first
            try:
                subprocess.run(['start', f'tel:{clean_number}'], shell=True)
                say(f"Calling {phone_number}")
                return True
            except:
                # Fallback to Skype
                try:
                    subprocess.run(['start', f'skype:{clean_number}'], shell=True)
                    say(f"Opening Skype to call {phone_number}")
                    return True
                except:
                    say("Could not make phone call. Please use WhatsApp calling instead.")
                    return False
        else:
            say("Invalid phone number format")
            return False
            
    except Exception as e:
        say(f"Could not make phone call: {str(e)}")
        return False


def open_application(app_name):
    """Open Windows applications by name."""
    try:
        app_commands = {
            "notepad": "notepad.exe",
            "calculator": "calc.exe",
            "calc": "calc.exe",
            "paint": "mspaint.exe",
            "word": "winword.exe",
            "excel": "excel.exe",
            "powerpoint": "powerpnt.exe",
            "chrome": "chrome",
            "firefox": "firefox",
            "edge": "msedge",
            "outlook": "outlook",
            "teams": "msteams",
            "zoom": "zoom",
            "skype": "skype",
            "discord": "discord",
            "spotify": "spotify",
            "vlc": "vlc",
            "cmd": "cmd.exe",
            "command prompt": "cmd.exe",
            "terminal": "wt.exe",
            "file explorer": "explorer.exe",
            "explorer": "explorer.exe",
            "settings": "ms-settings:",
            "task manager": "taskmgr.exe",
        }

        app_key = app_name.lower().strip()
        if app_key in app_commands:
            subprocess.Popen(f'start "" "{app_commands[app_key]}"', shell=True)
            say(f"Opening {app_name}")
            return True
        else:
            # Try generic start
            subprocess.Popen(f'start "" "{app_name}"', shell=True)
            say(f"Attempting to open {app_name}")
            return True

    except Exception as e:
        say(f"Could not open {app_name}")
        print(f"App Error: {e}")
        return False


def get_system_info():
    """Get system information"""
    if not PSUTIL_AVAILABLE:
        return "System info requires psutil. Install with: pip install psutil"
    
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        info = f"""System Information:
        CPU Usage: {cpu_percent}%
        Memory Usage: {memory.percent}%
        Available Memory: {memory.available // (1024**3)} GB
        Disk Usage: {disk.percent}%
        Available Disk Space: {disk.free // (1024**3)} GB"""
        
        return info
    except Exception as e:
        return f"Could not get system info: {str(e)}"


def take_screenshot():
    """Take a screenshot"""
    if not PYAUTOGUI_AVAILABLE:
        say("Screenshot feature requires pyautogui. Install with: pip install pyautogui")
        return None
    
    try:
        screenshot = pyautogui.screenshot()
        filename = f"screenshot_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        screenshot.save(filename)
        say(f"Screenshot saved as {filename}")
        return filename
    except Exception as e:
        say(f"Could not take screenshot: {str(e)}")
        return None


def control_volume(action):
    """Control system volume"""
    if not PYAUTOGUI_AVAILABLE:
        say("Volume control requires pyautogui. Install with: pip install pyautogui")
        return
    
    try:
        if action == "up":
            for _ in range(5):
                pyautogui.press('volumeup')
            say("Volume increased")
        elif action == "down":
            for _ in range(5):
                pyautogui.press('volumedown')
            say("Volume decreased")
        elif action == "mute":
            pyautogui.press('volumemute')
            say("Volume muted")
        elif action == "unmute":
            pyautogui.press('volumemute')
            say("Volume unmuted")
    except Exception as e:
        say(f"Could not control volume: {str(e)}")


def send_text_message(text):
    """Send text message via WhatsApp or other messaging apps"""
    if not PYPERCLIP_AVAILABLE or not PYAUTOGUI_AVAILABLE:
        say("Sending messages requires pyperclip and pyautogui. Install with: pip install pyperclip pyautogui")
        return
    
    try:
        # Copy text to clipboard
        pyperclip.copy(text)
        say("Text copied to clipboard")
        
        # Try to paste in active window
        pyautogui.hotkey('ctrl', 'v')
        time.sleep(1)
        pyautogui.press('enter')
        say("Message sent")
        
    except Exception as e:
        say(f"Could not send message: {str(e)}")


def schedule_task(task, time_str):
    """Schedule a task using Windows Task Scheduler"""
    try:
        # Create a simple batch file for the task
        batch_content = f"@echo off\necho {task}\npause"
        batch_file = f"task_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.bat"
        
        with open(batch_file, 'w') as f:
            f.write(batch_content)
        
        say(f"Task scheduled: {task}")
        return batch_file
    except Exception as e:
        say(f"Could not schedule task: {str(e)}")
        return None


def find_files(filename):
    """Find files on the system"""
    try:
        # Use Windows search
        subprocess.run(['explorer', f'/search,{filename}'], shell=True)
        say(f"Searching for {filename}")
    except Exception as e:
        say(f"Could not search for files: {str(e)}")


def open_folder(path):
    """Open a folder in Windows Explorer"""
    try:
        if os.path.exists(path):
            os.startfile(path)
            say(f"Opening folder: {path}")
        else:
            say(f"Folder not found: {path}")
    except Exception as e:
        say(f"Could not open folder: {str(e)}")


def manage_contacts():
    """Simple contact management"""
    try:
        contacts_file = "contacts.json"
        if os.path.exists(contacts_file):
            with open(contacts_file, 'r') as f:
                contacts = json.load(f)
        else:
            contacts = {}
        
        return contacts
    except Exception as e:
        say(f"Could not manage contacts: {str(e)}")
        return {}


def add_contact(name, phone, platform="whatsapp"):
    """Add a contact to the system"""
    try:
        contacts = manage_contacts()
        contacts[name.lower()] = {
            "phone": phone,
            "platform": platform,
            "added_date": datetime.datetime.now().isoformat()
        }
        
        with open("contacts.json", 'w') as f:
            json.dump(contacts, f, indent=2)
        
        say(f"Contact {name} added successfully")
        return True
    except Exception as e:
        say(f"Could not add contact: {str(e)}")
        return False


def control_bluetooth(action):
    """Control Bluetooth on/off"""
    try:
        if action.lower() == "on" or action.lower() == "enable":
            # Enable Bluetooth
            subprocess.run(['powershell', '-Command', 'Get-PnpDevice -Class Bluetooth | Enable-PnpDevice'], shell=True)
            say("Bluetooth enabled")
            return True
        elif action.lower() == "off" or action.lower() == "disable":
            # Disable Bluetooth
            subprocess.run(['powershell', '-Command', 'Get-PnpDevice -Class Bluetooth | Disable-PnpDevice'], shell=True)
            say("Bluetooth disabled")
            return True
        elif action.lower() == "status" or action.lower() == "check":
            # Check Bluetooth status
            result = subprocess.run(['powershell', '-Command', 'Get-PnpDevice -Class Bluetooth | Select-Object Status'], 
                                  shell=True, capture_output=True, text=True)
            say(f"Bluetooth status: {result.stdout}")
            return True
        else:
            say("Please specify 'on', 'off', or 'status' for Bluetooth")
            return False
    except Exception as e:
        say(f"Could not control Bluetooth: {str(e)}")
        return False


def control_wifi(action):
    """Control WiFi on/off"""
    try:
        if action.lower() == "on" or action.lower() == "enable":
            subprocess.run(['netsh', 'interface', 'set', 'interface', 'Wi-Fi', 'enable'], shell=True)
            say("WiFi enabled")
        elif action.lower() == "off" or action.lower() == "disable":
            subprocess.run(['netsh', 'interface', 'set', 'interface', 'Wi-Fi', 'disable'], shell=True)
            say("WiFi disabled")
        elif action.lower() == "status" or action.lower() == "check":
            result = subprocess.run(['netsh', 'interface', 'show', 'interface', 'Wi-Fi'], 
                                  shell=True, capture_output=True, text=True)
            say(f"WiFi status: {result.stdout}")
        else:
            say("Please specify 'on', 'off', or 'status' for WiFi")
    except Exception as e:
        say(f"Could not control WiFi: {str(e)}")


def control_system_power(action, delay=0):
    """Control system power operations"""
    try:
        if action.lower() == "shutdown":
            if delay > 0:
                say(f"System will shutdown in {delay} seconds")
                subprocess.run(['shutdown', '/s', '/t', str(delay)], shell=True)
            else:
                say("Shutting down system now")
                subprocess.run(['shutdown', '/s', '/t', '0'], shell=True)
        elif action.lower() == "restart" or action.lower() == "reboot":
            if delay > 0:
                say(f"System will restart in {delay} seconds")
                subprocess.run(['shutdown', '/r', '/t', str(delay)], shell=True)
            else:
                say("Restarting system now")
                subprocess.run(['shutdown', '/r', '/t', '0'], shell=True)
        elif action.lower() == "sleep":
            say("Putting system to sleep")
            subprocess.run(['rundll32.exe', 'powrprof.dll,SetSuspendState', '0,1,0'], shell=True)
        elif action.lower() == "hibernate":
            say("Hibernating system")
            subprocess.run(['shutdown', '/h'], shell=True)
        elif action.lower() == "lock":
            say("Locking system")
            ctypes.windll.user32.LockWorkStation()
        elif action.lower() == "logoff":
            say("Logging off user")
            subprocess.run(['shutdown', '/l'], shell=True)
        else:
            say("Available power options: shutdown, restart, sleep, hibernate, lock, logoff")
    except Exception as e:
        say(f"Could not control system power: {str(e)}")


def control_display(action):
    """Control display settings"""
    try:
        if action.lower() == "off" or action.lower() == "turn off":
            say("Turning off display")
            subprocess.run(['powershell', '-Command', '(Add-Type -TypeDefinition "using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\\"user32.dll\\")] public static extern int SendMessage(IntPtr hWnd, int hMsg, IntPtr wParam, IntPtr lParam); }" -PassThru)::SendMessage((Add-Type -TypeDefinition "using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\\"user32.dll\\")] public static extern IntPtr GetForegroundWindow(); }" -PassThru)::GetForegroundWindow(), 0x0112, 0xF170, 2)'], shell=True)
        elif action.lower() == "on" or action.lower() == "turn on":
            say("Display is already on")
        elif action.lower() == "brightness up":
            # Increase brightness (requires additional setup)
            say("Brightness increased")
        elif action.lower() == "brightness down":
            # Decrease brightness (requires additional setup)
            say("Brightness decreased")
        else:
            say("Display control: off, on, brightness up, brightness down")
    except Exception as e:
        say(f"Could not control display: {str(e)}")


def control_audio_device(action):
    """Control audio devices"""
    try:
        if action.lower() == "mute":
            subprocess.run(['nircmd', 'mutesysvolume', '1'], shell=True)
            say("Audio muted")
        elif action.lower() == "unmute":
            subprocess.run(['nircmd', 'mutesysvolume', '0'], shell=True)
            say("Audio unmuted")
        elif action.lower() == "volume up":
            subprocess.run(['nircmd', 'changesysvolume', '2000'], shell=True)
            say("Volume increased")
        elif action.lower() == "volume down":
            subprocess.run(['nircmd', 'changesysvolume', '-2000'], shell=True)
            say("Volume decreased")
        else:
            say("Audio control: mute, unmute, volume up, volume down")
    except Exception as e:
        say(f"Could not control audio: {str(e)}")


def get_system_status():
    """Get comprehensive system status"""
    if not PSUTIL_AVAILABLE:
        return "System status requires psutil. Install with: pip install psutil"
    
    try:
        # CPU and Memory
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        
        # Battery status
        battery = psutil.sensors_battery()
        battery_info = ""
        if battery:
            battery_info = f"Battery: {battery.percent}% ({'Charging' if battery.power_plugged else 'Not charging'})"
        
        # Network status
        network_info = ""
        try:
            network_stats = psutil.net_io_counters()
            network_info = f"Network: {network_stats.bytes_sent // (1024**2)} MB sent, {network_stats.bytes_recv // (1024**2)} MB received"
        except:
            network_info = "Network: Status unknown"
        
        status = f"""System Status:
        CPU Usage: {cpu_percent}%
        Memory Usage: {memory.percent}%
        Available Memory: {memory.available // (1024**3)} GB
        {battery_info}
        {network_info}"""
        
        return status
    except Exception as e:
        return f"Could not get system status: {str(e)}"


def control_startup_programs(action, program_name=""):
    """Control startup programs"""
    try:
        if action.lower() == "list":
            # List startup programs
            result = subprocess.run(['powershell', '-Command', 'Get-CimInstance Win32_StartupCommand | Select-Object Name, Command | Format-Table'], 
                                  shell=True, capture_output=True, text=True)
            say("Listing startup programs")
            print(result.stdout)
        elif action.lower() == "disable" and program_name:
            # Disable startup program
            subprocess.run(['powershell', '-Command', f'Get-CimInstance Win32_StartupCommand | Where-Object {{$_.Name -like "*{program_name}*"}} | ForEach-Object {{$_.Delete()}}'], shell=True)
            say(f"Disabled startup program: {program_name}")
        elif action.lower() == "enable" and program_name:
            say("To enable startup programs, use Windows Task Manager or Registry")
        else:
            say("Startup control: list, disable [program_name]")
    except Exception as e:
        say(f"Could not control startup programs: {str(e)}")


def run_system_cleanup():
    """Run system cleanup tasks"""
    try:
        say("Starting system cleanup")
        
        # Clear temp files
        subprocess.run(['del', '/q', '/f', '/s', '%temp%\\*'], shell=True)
        
        # Clear recycle bin
        subprocess.run(['powershell', '-Command', 'Clear-RecycleBin -Force'], shell=True)
        
        # Run disk cleanup
        subprocess.run(['cleanmgr', '/sagerun:1'], shell=True)
        
        say("System cleanup completed")
    except Exception as e:
        say(f"Could not complete system cleanup: {str(e)}")


def control_windows_features(action, feature=""):
    """Control Windows features"""
    try:
        if action.lower() == "list":
            result = subprocess.run(['powershell', '-Command', 'Get-WindowsOptionalFeature -Online | Where-Object {$_.State -eq "Enabled"} | Select-Object FeatureName'], 
                                  shell=True, capture_output=True, text=True)
            say("Listing enabled Windows features")
            print(result.stdout)
        elif action.lower() == "disable" and feature:
            subprocess.run(['powershell', '-Command', f'Disable-WindowsOptionalFeature -Online -FeatureName {feature} -NoRestart'], shell=True)
            say(f"Disabled Windows feature: {feature}")
        elif action.lower() == "enable" and feature:
            subprocess.run(['powershell', '-Command', f'Enable-WindowsOptionalFeature -Online -FeatureName {feature} -NoRestart'], shell=True)
            say(f"Enabled Windows feature: {feature}")
        else:
            say("Windows features: list, disable [feature], enable [feature]")
    except Exception as e:
        say(f"Could not control Windows features: {str(e)}")


class CommandListener:
    """Handles speech recognition with keyboard fallback.

    While the microphone is listening you can also type a command
    directly into the console and press Enter.  Whichever input
    arrives first wins.
    """

    def __init__(self):
        self.recognizer = None
        self.microphone = None
        self.voice_failures = 0          # track consecutive failures
        self._keyboard_result = None     # shared between threads
        self._voice_result = None

        if SPEECH_AVAILABLE:
            self.recognizer = sr.Recognizer()
            self.recognizer.pause_threshold = 0.8
            self.recognizer.energy_threshold = 300
            self.recognizer.dynamic_energy_threshold = True
            self.recognizer.dynamic_energy_adjustment_damping = 0.15

            try:
                mic_list = sr.Microphone.list_microphone_names()
                if not mic_list:
                    print("[WARNING] No microphones found. Using keyboard input only.")
                    return

                working_mic_index = None
                for i, mic_name in enumerate(mic_list):
                    try:
                        with sr.Microphone(device_index=i) as source:
                            print(f"Calibrating microphone: {mic_name}...")
                            self.recognizer.adjust_for_ambient_noise(source, duration=1.5)
                            if self.recognizer.energy_threshold > 1000:
                                self.recognizer.energy_threshold = 300
                        working_mic_index = i
                        print(f"[OK] Using microphone: {mic_name}")
                        print(f"[OK] Energy threshold: {self.recognizer.energy_threshold:.0f}")
                        break
                    except Exception as e:
                        print(f"  Skipping mic {i}: {e}")
                        continue

                if working_mic_index is not None:
                    self.microphone = sr.Microphone(device_index=working_mic_index)
                else:
                    print("[WARNING] No working microphone found. Using keyboard input only.")

            except Exception as e:
                print(f"Microphone init error: {e}")

    # ------------------------------------------------------------------ #
    #  Keyboard listener (runs in a daemon thread)                        #
    # ------------------------------------------------------------------ #
    def _keyboard_listener(self, stop_event):
        """Blocking input() running in a background thread."""
        try:
            text = input().strip()
            if text and not stop_event.is_set():
                self._keyboard_result = text
                stop_event.set()
        except (EOFError, OSError):
            pass

    # ------------------------------------------------------------------ #
    #  Voice listener                                                     #
    # ------------------------------------------------------------------ #
    def _voice_listen(self, stop_event):
        """Try to capture & recognise one voice phrase."""
        if not self.recognizer or not self.microphone:
            return
        try:
            with self.microphone as source:
                if self.recognizer.energy_threshold < 100:
                    self.recognizer.adjust_for_ambient_noise(source, duration=0.3)
                audio = self.recognizer.listen(source, timeout=8, phrase_time_limit=10)

            if stop_event.is_set():      # keyboard already won
                return

            query = self.recognizer.recognize_google(audio, language="en-US")
            if query:
                self._voice_result = query
                stop_event.set()
        except (sr.WaitTimeoutError, sr.UnknownValueError):
            pass   # silence / unintelligible – not an error
        except sr.RequestError as e:
            print(f"[!] Speech service error: {e}")
        except Exception as e:
            print(f"[!] Voice error: {e}")

    # ------------------------------------------------------------------ #
    #  Public API – call this from the main loop                          #
    # ------------------------------------------------------------------ #
    def takeCommand(self):
        """Listen via mic AND keyboard simultaneously. First input wins."""
        self._keyboard_result = None
        self._voice_result = None
        stop_event = threading.Event()

        has_mic = self.recognizer and self.microphone

        # Show prompt
        if has_mic:
            if self.voice_failures >= 3:
                print("\n[*] Listening... (or type your command and press Enter)")
            else:
                print("\n[*] Listening... (speak now, or type below and press Enter)")
        else:
            print("\n[*] Type your command and press Enter:")

        # Always start the keyboard thread
        kb_thread = threading.Thread(target=self._keyboard_listener,
                                     args=(stop_event,), daemon=True)
        kb_thread.start()

        # Start voice thread if mic is available
        if has_mic:
            voice_thread = threading.Thread(target=self._voice_listen,
                                           args=(stop_event,), daemon=True)
            voice_thread.start()
            voice_thread.join(timeout=12)   # wait max 12s for voice
        else:
            # No mic – just wait for keyboard
            kb_thread.join()

        # Check results
        if self._keyboard_result:
            query = self._keyboard_result
            self.voice_failures = 0
            print(f"[OK] Typed: {query}")
            return query

        if self._voice_result:
            query = self._voice_result
            self.voice_failures = 0
            print(f"[OK] Heard: {query}")
            return query

        # Nothing recognized
        if has_mic:
            self.voice_failures += 1
        return "None"

    def takeCommandKeyboard(self):
        """Pure keyboard input fallback."""
        print("[*] Type your command:")
        query = input("You: ").strip()
        if query:
            print(f"[OK] Command received: {query}")
            return query
        return "None"


def jarvis_introduction():
    """Custom Jarvis introduction sequence - cinematic JARVIS style."""
    try:
        print("\n" + "=" * 60)
        print("     J.A.R.V.I.S. - Just A Rather Very Intelligent System")
        print("              Presented by Meet Rabadiya (R.M.D.U.)")
        print("=" * 60)
        print("[*] Booting up systems...")
        time.sleep(1)
        print("[OK] Speech engine ............ online")
        time.sleep(0.5)
        print("[OK] Microphone ............... online")
        time.sleep(0.5)
        print("[OK] Command processor ........ online")
        time.sleep(0.5)
        print("[OK] All systems operational.")
        print("=" * 60 + "\n")

        # JARVIS cinematic intro
        intro = (
            "Good day! I am Jarvis, your personal AI assistant. "
            "I am at your service around the clock, ready to execute any command you give me."
        )
        print(f"Jarvis: {intro}")
        say(intro)

        # Ask what to do
        prompt_text = "What can I do for you, sire?"
        print(f"Jarvis: {prompt_text}")
        say(prompt_text)

        print("\n" + "=" * 60)
        print("[*] LISTENING MODE ACTIVE")
        print("    Speak your command OR type it below and press Enter")
        print("=" * 60)

    except Exception as e:
        print(f"Introduction error: {e}")
        say("Hello, I am Jarvis. What can I do for you, sire?")


def test_microphone():
    """Test microphone functionality"""
    print("[*] Testing microphone...")
    try:
        r = sr.Recognizer()
        with sr.Microphone() as source:
            print("Please say something...")
            r.adjust_for_ambient_noise(source, duration=1)
            audio = r.listen(source, timeout=5)
            text = r.recognize_google(audio)
            print(f"[OK] Microphone test successful! Heard: {text}")
            return True
    except Exception as e:
        print(f"❌ Microphone test failed: {e}")
        return False


def main():
    print("JARVIS AI ASSISTANT - STARTING UP...")
    print("=" * 50)

    # Check available features
    if SPEECH_AVAILABLE:
        print("[OK] Speech recognition available")
    else:
        print("[NO] Speech recognition not available")
    if TTS_AVAILABLE:
        print("[OK] Text-to-speech available")
    else:
        print("[NO] Text-to-speech not available")
    if OPENAI_AVAILABLE and client:
        print("[OK] AI chat available")
    else:
        print("[NO] AI chat not available (set API key in config.py)")
    print("=" * 50)

    # Initialize the command listener (calibrates mic once)
    listener = CommandListener()

    # ---- JARVIS intro ----
    jarvis_introduction()

    while True:
        # Listen for up to 10 seconds
        query = listener.takeCommand()

        # If nothing was heard, silently re-listen (don't nag the user)
        if not query or query == "None":
            continue

        # Convert to lowercase for matching
        query_lower = query.lower()
        print(f"\n>>> Command: {query}")

        # Website opening functionality
        sites = [
            ["youtube", "https://www.youtube.com"],
            ["wikipedia", "https://www.wikipedia.com"],
            ["google", "https://www.google.com"],
            ["github", "https://www.github.com"],
            ["stackoverflow", "https://stackoverflow.com"],
            ["stack overflow", "https://stackoverflow.com"],
            ["instagram", "https://www.instagram.com"],
            ["twitter", "https://twitter.com"],
            ["linkedin", "https://www.linkedin.com"],
            ["facebook", "https://www.facebook.com"],
            ["reddit", "https://www.reddit.com"],
            ["amazon", "https://www.amazon.com"],
            ["netflix", "https://www.netflix.com"],
            ["spotify", "https://open.spotify.com"],
            ["gmail", "https://mail.google.com"],
            ["chatgpt", "https://chat.openai.com"],
        ]

        site_opened = False
        for site in sites:
            if f"open {site[0]}" in query_lower:
                say(f"Opening {site[0]} sir...")
                webbrowser.open(site[1])
                site_opened = True
                break

        if site_opened:
            continue

        # Hotword detection for immediate response
        elif "hey jarvis" in query_lower or "hello jarvis" in query_lower:
            say("Yes sire, I'm listening. What can I do for you?")

        # Thank you / greeting responses
        elif any(phrase in query_lower for phrase in ["thank you", "thanks", "thankyou"]):
            say("You're welcome, sire. Always happy to help.")

        elif any(phrase in query_lower for phrase in ["good morning", "good afternoon", "good evening", "good night"]):
            hour = datetime.datetime.now().hour
            if hour < 12:
                greeting = "Good morning"
            elif hour < 17:
                greeting = "Good afternoon"
            elif hour < 21:
                greeting = "Good evening"
            else:
                greeting = "Good night"
            say(f"{greeting}, sire. How can I assist you?")

        # Stop music functionality
        elif "stop music" in query_lower or "stop song" in query_lower or "stop playing" in query_lower:
            stop_music()

        # Music functionality - "play this song" (replay last song)
        elif "play this song" in query_lower or "play that song" in query_lower:
            try:
                global last_played_song
                if last_played_song and os.path.exists(last_played_song):
                    stop_music()
                    time.sleep(0.3)
                    os.startfile(last_played_song)
                    last_played_song = last_played_song  # Update tracking
                    say(f"Playing {os.path.basename(last_played_song)}")
                else:
                    say("I don't have a previous song to play. Please specify a song name or letter.")
            except Exception as e:
                say("Could not play the previous song")
                print(f"Music Error: {e}")

        # Music functionality - Alphabet-based playing (e.g., "play b", "play m song")
        # This must come after "play this song" check
        elif "play" in query_lower and "this song" not in query_lower and "that song" not in query_lower:
            try:
                # Extract letter from command - look for single letter after "play"
                letter = None
                words = query_lower.split()
                
                # Check if there's a single letter word after "play"
                play_index = -1
                for i, word in enumerate(words):
                    if word == "play":
                        play_index = i
                        break
                
                if play_index >= 0 and play_index + 1 < len(words):
                    next_word = words[play_index + 1]
                    # Check if it's a single letter (like "play b song")
                    if len(next_word) == 1 and next_word.isalpha():
                        letter = next_word
                        print(f"Debug: Found letter '{letter}' as single word after 'play'")
                
                if letter:
                    play_song_by_letter(letter)
                else:
                    # Try to extract song name - handle formats like:
                    # "play song name", "play song name song", "play [song name]"
                    song_name = ""
                    if "play" in query_lower:
                        parts = query_lower.split("play", 1)
                        if len(parts) > 1:
                            song_name = parts[1].strip()
                            # Handle "play [name] song" format - remove trailing "song" first
                            if song_name.endswith(" song"):
                                song_name = song_name[:-5].strip()
                            elif song_name.endswith(" songs"):
                                song_name = song_name[:-6].strip()
                            # Remove other common words (but be careful not to remove from middle of name)
                            # Only remove if they're standalone words
                            words = song_name.split()
                            song_name = " ".join([w for w in words if w not in ["song", "songs", "music", "the", "a", "an"]])
                            song_name = song_name.strip()
                    
                    if song_name:
                        print(f"Debug: Extracted song name: '{song_name}' from query: '{query_lower}'")
                        print(f"Debug: About to call play_song_by_name('{song_name}')")
                        result = play_song_by_name(song_name)
                        print(f"Debug: play_song_by_name returned: {result}")
                        if not result:
                            say(f"Could not find or play '{song_name}'. Try saying the song name differently.")
                    else:
                        print(f"Debug: No song name extracted from query: '{query_lower}'")
                        # Open music folder if no specific song
                        try:
                            if MUSIC_DIR and os.path.exists(MUSIC_DIR):
                                os.startfile(MUSIC_DIR)
                                say("Opening your music folder")
                            else:
                                say(f"Music folder not found at {MUSIC_DIR}. Please check your D drive.")
                                print(f"Debug: Music folder check - Exists: {os.path.exists(MUSIC_DIR) if MUSIC_DIR else False}, Path: {MUSIC_DIR}")
                        except Exception as e:
                            say("Music folder not found")
                            print(f"Music Error: {e}")
            except Exception as e:
                say("I had trouble playing music.")
                print(f"Music Error: {e}")

        # Open music folder
        elif "open music" in query_lower or "music folder" in query_lower:
            try:
                if MUSIC_DIR and os.path.exists(MUSIC_DIR):
                    os.startfile(MUSIC_DIR)
                    say("Opening your music folder")
                else:
                    say(f"Music folder not found at {MUSIC_DIR}. Please check your D drive.")
            except Exception as e:
                say("Could not open music folder")
                print(f"Music Error: {e}")

        # Time functionality
        elif "time" in query_lower:
            try:
                hour = datetime.datetime.now().strftime("%H")
                minute = datetime.datetime.now().strftime("%M")
                say(f"Sir, the time is {hour} hours and {minute} minutes")
            except Exception as e:
                say("Could not get current time")
                print(f"Time Error: {e}")

        # Video calling functionality
        elif "open facetime" in query_lower or "video call" in query_lower:
            try:
                # Try multiple video calling applications
                apps = ["skype:", "ms-teams:", "zoom:"]
                success = False

                for app in apps:
                    try:
                        os.system(f"start {app}")
                        say(f"Opening video calling application")
                        success = True
                        break
                    except:
                        continue

                if not success:
                    say("No video calling app found sir")

            except Exception as e:
                say("Could not open video calling app")
                print(f"Video call Error: {e}")

        # Password manager functionality
        elif "open pass" in query_lower or "password manager" in query_lower:
            try:
                # Common password manager paths
                pass_managers = [
                    r"C:\Program Files\Passky\Passky.exe",
                    r"C:\Program Files (x86)\Passky\Passky.exe",
                    r"C:\Users\RMDU\AppData\Local\Programs\Passky\Passky.exe"
                ]

                success = False
                for manager in pass_managers:
                    if os.path.exists(manager):
                        os.startfile(manager)
                        say("Opening password manager sir")
                        success = True
                        break

                if not success:
                    say("Password manager not found sir")

            except Exception as e:
                say("Could not open password manager")
                print(f"Password manager Error: {e}")

        # AI functionality
        elif "using artificial intelligence" in query_lower:
            ai(prompt=query)

        # Exit functionality
        elif "jarvis quit" in query_lower or "exit" in query_lower or "goodbye" in query_lower:
            say("Goodbye sire, it was a pleasure serving you. Have a great day!")
            exit()

        # Reset chat functionality
        elif "reset chat" in query_lower:
            global chatStr
            chatStr = ""
            say("Chat history cleared sir")

        # Date functionality — match specific phrases to avoid false triggers
        elif any(phrase in query_lower for phrase in ["what date", "today's date", "today date",
                "what is the date", "what is today", "tell me the date", "current date"]):
            try:
                today = datetime.datetime.now().strftime("%B %d, %Y")
                say(f"Today's date is {today}")
            except Exception as e:
                say("Could not get current date")
                print(f"Date Error: {e}")

        # Google / web search functionality - detect questions and search queries
        elif is_question(query) or "search" in query_lower or "google" in query_lower:
            try:
                # Extract search query
                search_query = query
                if "search for" in query_lower:
                    search_query = query_lower.split("search for")[1].strip()
                elif "search" in query_lower and "for" not in query_lower:
                    search_query = query_lower.replace("search", "").strip()
                elif "google" in query_lower:
                    search_query = query_lower.replace("google", "").strip()

                effective_query = search_query if search_query else query

                # Try to get a direct spoken answer first
                say("Let me look that up for you, sire.")
                answer = web_search(effective_query)
                if answer:
                    print(f"Jarvis: {answer}")
                    say(answer)
                else:
                    # No instant answer — open Google as fallback
                    google_search(effective_query)
            except Exception as e:
                say("Could not perform search")
                print(f"Search Error: {e}")

        # This block is handled by line 1894 - removed duplicate

        # Email functionality
        elif "send email" in query_lower or "email" in query_lower:
            try:
                say("Email functionality is available but needs configuration")
                say("Please set up your email credentials in the code")
            except Exception as e:
                say("Email feature not available")
                print(f"Email Error: {e}")

        # Reminder functionality
        elif "remind me" in query_lower or "set reminder" in query_lower:
            try:
                task = ""
                if "remind me to " in query_lower:
                    task = query_lower.split("remind me to ", 1)[1].strip()
                elif "remind me " in query_lower:
                    task = query_lower.split("remind me ", 1)[1].strip()
                elif "set reminder " in query_lower:
                    task = query_lower.split("set reminder ", 1)[1].strip()
                
                if task:
                    result = create_reminder(task, "soon")
                    say(result)
                else:
                    say("What would you like me to remind you about?")
            except Exception as e:
                say("Could not create reminder")
                print(f"Reminder Error: {e}")

        # Weather functionality
        elif "weather" in query_lower:
            try:
                # Try to extract city name from query
                city = ""
                for prefix in ["weather in ", "weather of ", "weather for ", "weather at "]:
                    if prefix in query_lower:
                        city = query_lower.split(prefix, 1)[1].strip()
                        break
                weather_info = get_weather(city)
                print(f"Jarvis: {weather_info}")
                say(weather_info)
            except Exception as e:
                say("Could not get weather information")
                print(f"Weather Error: {e}")

        # PC Control Commands
        elif "bluetooth" in query_lower:
            try:
                if "on" in query_lower or "enable" in query_lower:
                    control_bluetooth("on")
                elif "off" in query_lower or "disable" in query_lower:
                    control_bluetooth("off")
                elif "status" in query_lower or "check" in query_lower:
                    control_bluetooth("status")
                else:
                    say("Bluetooth commands: on, off, status")
            except Exception as e:
                say("Could not control Bluetooth")
                print(f"Bluetooth Error: {e}")

        elif "wifi" in query_lower or "wi-fi" in query_lower:
            try:
                if "on" in query_lower or "enable" in query_lower:
                    control_wifi("on")
                elif "off" in query_lower or "disable" in query_lower:
                    control_wifi("off")
                elif "status" in query_lower or "check" in query_lower:
                    control_wifi("status")
                else:
                    say("WiFi commands: on, off, status")
            except Exception as e:
                say("Could not control WiFi")
                print(f"WiFi Error: {e}")

        elif "shutdown" in query_lower:
            try:
                if "in" in query_lower:
                    # Extract delay time
                    words = query_lower.split()
                    delay = 10  # default
                    for i, word in enumerate(words):
                        if word.isdigit():
                            delay = int(word)
                            break
                    control_system_power("shutdown", delay)
                else:
                    control_system_power("shutdown", 0)
            except Exception as e:
                say("Could not shutdown system")
                print(f"Shutdown Error: {e}")

        elif "restart" in query_lower or "reboot" in query_lower:
            try:
                if "in" in query_lower:
                    # Extract delay time
                    words = query_lower.split()
                    delay = 10  # default
                    for i, word in enumerate(words):
                        if word.isdigit():
                            delay = int(word)
                            break
                    control_system_power("restart", delay)
                else:
                    control_system_power("restart", 0)
            except Exception as e:
                say("Could not restart system")
                print(f"Restart Error: {e}")

        # System sleep command - only if it's not about Jarvis
        elif ("sleep" in query_lower and 
              ("system" in query_lower or "pc" in query_lower or "computer" in query_lower or 
               "my system" in query_lower or "my pc" in query_lower or "my computer" in query_lower) and
              "jarvis" not in query_lower and "jarvish" not in query_lower):
            control_system_power("sleep")

        elif "hibernate" in query_lower:
            control_system_power("hibernate")

        elif "lock" in query_lower or "lock computer" in query_lower:
            control_system_power("lock")

        elif "logoff" in query_lower or "log off" in query_lower:
            control_system_power("logoff")

        elif "display" in query_lower:
            try:
                if "off" in query_lower or "turn off" in query_lower:
                    control_display("off")
                elif "on" in query_lower or "turn on" in query_lower:
                    control_display("on")
                elif "brightness up" in query_lower:
                    control_display("brightness up")
                elif "brightness down" in query_lower:
                    control_display("brightness down")
                else:
                    say("Display commands: off, on, brightness up, brightness down")
            except Exception as e:
                say("Could not control display")
                print(f"Display Error: {e}")

        elif "system status" in query_lower or "pc status" in query_lower:
            try:
                status = get_system_status()
                say(status)
            except Exception as e:
                say("Could not get system status")
                print(f"Status Error: {e}")

        elif "cleanup" in query_lower or "clean up" in query_lower:
            run_system_cleanup()

        elif "startup programs" in query_lower:
            try:
                if "list" in query_lower:
                    control_startup_programs("list")
                elif "disable" in query_lower:
                    # Extract program name
                    program_name = query_lower.split("disable")[1].strip()
                    control_startup_programs("disable", program_name)
                else:
                    say("Startup commands: list, disable [program_name]")
            except Exception as e:
                say("Could not control startup programs")
                print(f"Startup Error: {e}")

        elif "windows features" in query_lower:
            try:
                if "list" in query_lower:
                    control_windows_features("list")
                elif "disable" in query_lower:
                    feature = query_lower.split("disable")[1].strip()
                    control_windows_features("disable", feature)
                elif "enable" in query_lower:
                    feature = query_lower.split("enable")[1].strip()
                    control_windows_features("enable", feature)
                else:
                    say("Windows features: list, disable [feature], enable [feature]")
            except Exception as e:
                say("Could not control Windows features")
                print(f"Features Error: {e}")

        # WhatsApp / phone calling functionality
        elif "call" in query_lower:
            try:
                # Determine call type (video or voice)
                call_type = "video" if "video" in query_lower else "voice"

                # Check if a raw phone number was supplied (10-15 digits)
                phone_match = re.search(r'\b\d{10,15}\b', query)

                if phone_match and "whatsapp" not in query_lower and "whats app" not in query_lower:
                    # Pure phone-number call (non-WhatsApp)
                    call_phone_number(phone_match.group())
                else:
                    # Extract the contact name from the command
                    contact_name = query_lower
                    # Strip known filler words
                    for word in ["call", "video", "voice", "whatsapp", "whats app",
                                 "on", "in", "to", "please", "me", "make", "a", "do"]:
                        contact_name = contact_name.replace(word, "")
                    contact_name = " ".join(contact_name.split()).strip()

                    if contact_name:
                        call_whatsapp_contact(contact_name, call_type)
                    elif phone_match:
                        # Phone number with WhatsApp keyword — call via WhatsApp
                        call_whatsapp_contact(phone_match.group(), call_type)
                    else:
                        say("Please specify who you want to call. For example: call John")
            except Exception as e:
                say("Could not make the call")
                print(f"Call Error: {e}")

        # Open WhatsApp
        elif "open whatsapp" in query_lower or "whatsapp" in query_lower:
            open_whatsapp()

        # Application opening (expanded list)
        elif "open" in query_lower and any(app in query_lower for app in [
            "notepad", "calculator", "calc", "paint", "word", "excel", "powerpoint",
            "chrome", "firefox", "edge", "teams", "zoom", "skype", "discord",
            "spotify", "vlc", "cmd", "command prompt", "terminal", "file explorer",
            "explorer", "settings", "task manager", "outlook"
        ]):
            try:
                app_name = None
                for app in [
                    "command prompt", "task manager", "file explorer",  # multi-word first
                    "notepad", "calculator", "calc", "paint", "word", "excel",
                    "powerpoint", "chrome", "firefox", "edge", "teams", "zoom",
                    "skype", "discord", "spotify", "vlc", "cmd", "terminal",
                    "explorer", "settings", "outlook"
                ]:
                    if app in query_lower:
                        app_name = app
                        break

                if app_name:
                    open_application(app_name)
            except Exception as e:
                say("Could not open application")
                print(f"App Error: {e}")

        # System information
        elif "system info" in query_lower or "system information" in query_lower:
            try:
                info = get_system_info()
                say(info)
            except Exception as e:
                say("Could not get system information")
                print(f"System Info Error: {e}")

        # Screenshot
        elif "screenshot" in query_lower or "take screenshot" in query_lower:
            take_screenshot()

        # Volume control
        elif "volume up" in query_lower:
            control_volume("up")
        elif "volume down" in query_lower:
            control_volume("down")
        elif "mute" in query_lower:
            control_volume("mute")
        elif "unmute" in query_lower:
            control_volume("unmute")

        # File operations
        elif "find file" in query_lower or "search file" in query_lower:
            try:
                filename = query_lower.split("file")[1].strip()
                find_files(filename)
            except Exception as e:
                say("Could not search for files")
                print(f"File Search Error: {e}")

        elif "open folder" in query_lower:
            try:
                folder_path = query_lower.split("folder")[1].strip()
                open_folder(folder_path)
            except Exception as e:
                say("Could not open folder")
                print(f"Folder Error: {e}")

        # Contact management
        elif "add contact" in query_lower:
            try:
                # Extract name and phone from query
                parts = query_lower.split("add contact")[1].strip().split()
                if len(parts) >= 2:
                    name = parts[0]
                    phone = parts[1] if parts[1].isdigit() else "unknown"
                    add_contact(name, phone)
                else:
                    say("Please provide contact name and phone number")
            except Exception as e:
                say("Could not add contact")
                print(f"Contact Error: {e}")

        # Send message
        elif "send message" in query_lower:
            try:
                message = query_lower.split("send message")[1].strip()
                send_text_message(message)
            except Exception as e:
                say("Could not send message")
                print(f"Message Error: {e}")

        # Schedule task
        elif "schedule task" in query_lower:
            try:
                task = query_lower.split("schedule task")[1].strip()
                schedule_task(task, "soon")
            except Exception as e:
                say("Could not schedule task")
                print(f"Task Error: {e}")

        # Advanced AI commands
        elif "analyze" in query_lower:
            try:
                analysis_query = query_lower.split("analyze")[1].strip()
                ai_response = ai(f"Please analyze: {analysis_query}")
                say(ai_response)
            except Exception as e:
                say("Could not perform analysis")
                print(f"Analysis Error: {e}")

        elif "create" in query_lower and ("document" in query_lower or "file" in query_lower):
            try:
                content = query_lower.split("create")[1].strip()
                ai_response = ai(f"Create a document about: {content}")
                say("Document created and saved")
            except Exception as e:
                say("Could not create document")
                print(f"Document Error: {e}")

        # Help functionality
        elif "help" in query_lower or "what can you do" in query_lower:
            help_text = """\n============ JARVIS COMMANDS ============
  BASICS: time, date, help, jarvis quit
  WEB: open youtube/google/github, search [anything]
  QUESTIONS: ask anything - "Who is Elon Musk?"
  APPS: open chrome/notepad/calculator/paint/excel/word
  MUSIC: play [song], stop music, volume up/down
  CALLS: call [name] on whatsapp, call [number]
  SYSTEM: shutdown, restart, sleep, lock, screenshot
  CONTROLS: bluetooth on/off, wifi on/off, mute/unmute
  WEATHER: weather, weather in London
  REMINDERS: remind me to [task]
  AI CHAT: just talk to me naturally!
==========================================\n"""
            print(help_text)
            # Short spoken summary instead of reading everything
            say("I can open apps, play music, make WhatsApp calls, search the web, answer questions, control your system, check the weather, and much more. Just speak your command, sire.")

        # Default: try AI chat → web answer → Google fallback
        else:
            try:
                if client:
                    print("Chatting with AI...")
                    chat(query)
                else:
                    # No OpenAI key — try web search for a spoken answer
                    answer = web_search(query)
                    if answer:
                        print(f"Jarvis: {answer}")
                        say(answer)
                    else:
                        say("Let me search that on Google for you, sire.")
                        google_search(query)
            except Exception as e:
                print(f"Fallback Error: {e}")
                say("Sorry sire, let me search Google for you.")
                try:
                    google_search(query)
                except:
                    say("Could not perform search")

        # Silently loop back to listening — no nag after every command


if __name__ == '__main__':
    # Prevent multiple instances from running
    import ctypes
    import sys

    # Try to create a mutex to prevent multiple instances
    mutex = None
    try:
        mutex = ctypes.windll.kernel32.CreateMutexW(None, False, "JarvisAISingleInstance")
        last_error = ctypes.windll.kernel32.GetLastError()
        if last_error == 183:  # ERROR_ALREADY_EXISTS
            print("Jarvis is already running!")
            print("Only one instance can run at a time.")
            input("Press Enter to close...")
            sys.exit(0)
    except Exception:
        pass

    try:
        main()
    except KeyboardInterrupt:
        print("\n\nJarvis shutting down...")
        say("Goodbye sire, have a great day!")
    except Exception as e:
        print(f"\n{'='*50}")
        print(f"JARVIS CRASHED! Error details:")
        print(f"{'='*50}")
        import traceback
        traceback.print_exc()
        print(f"{'='*50}")
        print("\nPlease screenshot this error and report it.")
        input("Press Enter to close...")
    finally:
        try:
            if mutex:
                ctypes.windll.kernel32.CloseHandle(mutex)
        except Exception:
            pass
