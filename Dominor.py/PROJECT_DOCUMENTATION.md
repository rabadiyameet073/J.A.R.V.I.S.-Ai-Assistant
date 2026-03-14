# J.A.R.V.I.S. AI Assistant — Complete Project Documentation

> **Author:** Dominor  
> **Type:** Hybrid Desktop AI Assistant (Python Backend + React Web Frontend)  
> **Platform:** Windows  

---

## Table of Contents

1. [Project Overview](#project-overview)  
2. [Architecture](#architecture)  
3. [Tech Stack & Libraries](#tech-stack--libraries)  
4. [File Structure](#file-structure)  
5. [Backend — Python (main.py)](#backend--python-mainpy)  
   - [Core Systems](#core-systems)  
   - [All Functions & Methods](#all-functions--methods)  
   - [CommandListener Class](#commandlistener-class)  
   - [Music System](#music-system)  
   - [AI Chat System](#ai-chat-system)  
   - [System Control](#system-control)  
   - [Communication](#communication)  
   - [File Operations](#file-operations)  
   - [Voice Commands (Complete List)](#voice-commands-complete-list)  
6. [Frontend — React Web UI](#frontend--react-web-ui)  
   - [Pages](#pages)  
   - [Components](#components)  
   - [Custom Hooks](#custom-hooks)  
   - [API Layer](#api-layer)  
   - [Styling & Theming](#styling--theming)  
7. [Configuration](#configuration)  
8. [Startup & Autostart Scripts](#startup--autostart-scripts)  
9. [Dependencies (requirements.txt)](#dependencies-requirementstxt)  
10. [How Everything Connects](#how-everything-connects)  

---

## Project Overview

J.A.R.V.I.S. is a full-featured **voice + keyboard controlled AI desktop assistant** for Windows. It can:

- Listen to voice commands or typed input simultaneously  
- Chat with OpenAI GPT-3.5-turbo  
- Control system (shutdown, restart, sleep, lock, volume, brightness, display)  
- Play music from local folders  
- Open 30+ applications and 15+ websites  
- Toggle WiFi and Bluetooth  
- Make WhatsApp calls, send emails  
- Search the web (Google, DuckDuckGo, Wikipedia)  
- Create folders, search files, take screenshots  
- Set timers, alarms, reminders  
- Show system info (CPU, RAM, battery, disk, network, IP)  
- Has a full React web dashboard UI  

---

## Architecture

```
┌──────────────────────────────────────────────┐
│              React Web UI (Vite)              │
│           http://localhost:3000               │
│  Dashboard | Chat | Music | System | Files   │
│  Communication | Timers | Settings           │
└──────────────┬───────────────────────────────┘
               │  HTTP (POST /api/run, GET /api/status)
               │  WebSocket (/ws)
┌──────────────▼───────────────────────────────┐
│           Python Backend (main.py)            │
│  Voice Listener | Keyboard Listener           │
│  pyttsx3 TTS | Google Speech Recognition      │
│  OpenAI GPT-3.5 | System Control              │
│  Music Player | App Launcher | File Manager   │
└──────────────────────────────────────────────┘
               │
       Windows OS / Win32 API
```

**Dual Input System:** Voice and keyboard run on separate threads simultaneously. Whichever input comes first wins (threading mechanism).

---

## Tech Stack & Libraries

### Backend (Python)

| Category | Technology | Purpose |
|----------|-----------|---------|
| Speech Recognition | `speechrecognition` + Google Speech API | Voice-to-text |
| Text-to-Speech | `pyttsx3` | Speak responses out loud |
| AI Chat | `openai` (GPT-3.5-turbo) | Conversational AI |
| System Control | `pyautogui` | Keyboard/mouse automation |
| System Info | `psutil` | CPU, memory, battery, disk stats |
| Clipboard | `pyperclip` | Copy/paste operations |
| Windows API | `pywin32` (ctypes, win32api) | Lock screen, display off, Bluetooth/WiFi |
| Web Requests | `requests` | HTTP calls, internet check |
| Audio | `PyAudio` | Microphone input |
| Image | `Pillow` | Screenshot capture |
| Math/Array | `numpy` | Audio processing |
| Subprocess | `subprocess`, `os` | Launch apps, system commands |
| Threading | `threading` | Simultaneous voice + keyboard |
| JSON | `json` | Data handling |
| Datetime | `datetime` | Time, date, reminders |
| Webbrowser | `webbrowser` | Open URLs |
| Socket | `socket` | Network/IP detection |
| Platform | `platform` | OS detection |

### Frontend (React)

| Category | Technology | Purpose |
|----------|-----------|---------|
| Framework | React 18.2.0 | UI framework |
| Routing | React Router v6 | Page navigation |
| Build Tool | Vite 5.0.0 | Dev server & bundling |
| Styling | Custom CSS (60+ variables) | Dark/light themes |
| State | React hooks (useState, useEffect) | State management |
| API | Fetch API + WebSocket | Backend communication |
| Icons | Custom SVG components | 30+ inline icons |
| Storage | localStorage | Theme persistence |

---

## File Structure

```
Dominor.py/
│
├── main.py                      # Main backend (~2500 lines, 50+ functions)
├── config.py                    # API keys (OPENAI_API_KEY)
├── config_example.py            # Template for config.py
├── names.txt                    # 34 song name aliases for music system
├── requirements.txt             # Python dependencies (20+)
│
├── Run_JARVIS.bat               # Launch script (python main.py)
├── start_jarvis_autorun.bat     # Autostart on Windows login
├── start_jarvis.vbs             # VBScript launcher (disabled - exit only)
├── FIX_POPUP.bat                # Removes duplicate scheduled task
├── setup_immediate_autostart.py # Adds to Windows registry autostart
│
├── __pycache__/                 # Python compiled files
│
└── jarvis-web-ui/               # React frontend
    ├── index.html               # HTML entry point
    ├── package.json             # Node.js dependencies
    ├── vite.config.js           # Vite config (port 3000)
    │
    └── src/
        ├── main.jsx             # React entry point
        ├── App.jsx              # Router setup (8 routes)
        ├── App.css              # Component styles
        ├── index.css            # Global styles + CSS variables
        │
        ├── components/
        │   ├── Layout/
        │   │   ├── Layout.jsx   # Main layout wrapper
        │   │   ├── Header.jsx   # Top bar (title, theme toggle, voice)
        │   │   └── Sidebar.jsx  # Side navigation (8 links)
        │   ├── Icons/
        │   │   └── Icons.jsx    # 30+ SVG icon components
        │   └── UI/
        │       └── Modal.jsx    # Reusable modal dialog
        │
        ├── pages/
        │   ├── Dashboard.jsx    # Home page with category cards
        │   ├── AIChat.jsx       # Chat interface with GPT
        │   ├── Music.jsx        # Music player + A-Z grid
        │   ├── System.jsx       # System actions + app launcher
        │   ├── Communication.jsx # Email, search, WhatsApp
        │   ├── Files.jsx        # File operations
        │   ├── Timers.jsx       # Timer, alarm, calculator
        │   └── Settings.jsx     # Config + function list
        │
        ├── hooks/
        │   ├── useApi.js        # API call hook (execute actions)
        │   ├── useLogger.js     # Activity log (100 max, download)
        │   ├── useTheme.js      # Dark/light theme toggle
        │   └── useVoice.js      # Browser speech recognition
        │
        └── utils/
            └── api.js           # Fetch wrapper + timeout handling
```

---

## Backend — Python (main.py)

### Core Systems

#### 1. Speech Engine (pyttsx3)
- Single global `pyttsx3` engine instance (prevents crashes from multiple instances)
- `say(text)` function wraps `engine.say()` + `engine.runAndWait()`
- Used everywhere to speak responses aloud

#### 2. Voice Recognition (speechrecognition)
- Uses Google Speech Recognition API (free, no key needed)
- `CommandListener` class handles microphone setup
- Auto-calibrates ambient noise on startup
- Energy threshold: 300 (with dynamic adjustment, damping 0.15)
- Listen timeout: 8 seconds, phrase time limit: 10 seconds

#### 3. Dual Input (Threading)
- Voice input and keyboard input run on separate threads
- Both threads race — first input wins
- If microphone not found, falls back to keyboard only
- After 3 consecutive voice failures, shows typing prompt

---

### All Functions & Methods

#### Speech & Input
| Function | What It Does |
|----------|-------------|
| `say(text)` | Speak text out loud using pyttsx3 |
| `takeCommand()` | Listen for voice command via microphone |
| `get_input()` | Combined voice + keyboard input (threading) |
| `CommandListener.__init__()` | Initialize microphone + calibrate |
| `CommandListener.listen()` | Listen for one voice command |
| `CommandListener.calibrate()` | Re-calibrate microphone noise level |

#### Greeting & Time
| Function | What It Does |
|----------|-------------|
| `wishMe()` | Greet user based on time of day (Good Morning/Afternoon/Evening) |
| `get_time()` | Return current time as string |
| `get_date()` | Return current date as string |

#### AI & Search
| Function | What It Does |
|----------|-------------|
| `chat(query)` | Send query to OpenAI GPT-3.5-turbo, get response |
| `ai(prompt)` | Extended AI prompt with file saving |
| `search_web(query)` | DuckDuckGo search + Wikipedia fallback |
| `google_search(query)` | Open Google search in browser |

#### Music Control
| Function | What It Does |
|----------|-------------|
| `find_music_folder()` | Auto-detect music folder (D:\music → D:\Music → search D:\ → C:\Users\Music) |
| `get_music_files()` | List all audio files (.mp3, .wav, .m4a, .flac, .aac, .wma, .ogg) |
| `play_song_by_name(name)` | Search and play song (alias → exact → substring → word match) |
| `play_song_by_letter(letter)` | Play first song starting with given letter |
| `stop_music()` | Kill all running media players |
| `open_music_folder()` | Open music folder in Explorer |

#### System Control
| Function | What It Does |
|----------|-------------|
| `shutdown_system(delay)` | Shutdown Windows with optional delay (seconds) |
| `restart_system()` | Restart Windows |
| `sleep_system()` | Put system to sleep (rundll32) |
| `hibernate_system()` | Hibernate system |
| `lock_system()` | Lock workstation (ctypes LockWorkStation) |
| `logoff_system()` | Log off current user |
| `turn_off_display()` | Turn off monitor (Win32 SendMessage) |

#### Volume & Display
| Function | What It Does |
|----------|-------------|
| `volume_up()` | Increase volume (pyautogui VK_VOLUME_UP) |
| `volume_down()` | Decrease volume (pyautogui VK_VOLUME_DOWN) |
| `volume_mute()` | Mute/unmute (pyautogui VK_VOLUME_MUTE) |
| `brightness_up()` | Increase brightness |
| `brightness_down()` | Decrease brightness |

#### Network & Hardware
| Function | What It Does |
|----------|-------------|
| `toggle_wifi(state)` | Enable/disable WiFi via netsh |
| `get_wifi_status()` | Check WiFi connection status |
| `toggle_bluetooth(state)` | Enable/disable Bluetooth via PowerShell |
| `get_bluetooth_status()` | Check Bluetooth status |
| `check_internet()` | Ping google.com to verify connectivity |
| `get_ip_address()` | Get local IP via socket |

#### System Information
| Function | What It Does |
|----------|-------------|
| `get_system_info()` | CPU%, memory%, disk usage |
| `get_system_status()` | Extended: CPU, memory, battery, disk, network, IP |
| `get_battery()` | Battery percentage + charging status |
| `get_cpu_usage()` | CPU usage percentage (psutil) |
| `get_memory_usage()` | RAM usage percentage (psutil) |
| `get_disk_usage()` | Disk space used/total (psutil) |

#### Communication
| Function | What It Does |
|----------|-------------|
| `whatsapp_call(name)` | Call contact on WhatsApp (Web or Desktop) |
| `phone_call(number)` | Call via Phone app or Skype |
| `open_whatsapp()` | Open WhatsApp Desktop or Web |
| `send_email()` | Open email composer (template) |

#### File Operations
| Function | What It Does |
|----------|-------------|
| `create_folder(name)` | Create folder on Desktop |
| `search_file(name)` | Search file via Windows Explorer |
| `open_folder(path)` | Open folder in Explorer |
| `read_file(path)` | Read text or PDF file content |
| `take_screenshot()` | Capture screen + save with timestamp |

#### Timers & Reminders
| Function | What It Does |
|----------|-------------|
| `set_timer(duration)` | Countdown timer with notification |
| `set_alarm(time)` | Alarm at specified time |
| `set_reminder(task, time)` | Create reminder for a task |
| `calculate(expression)` | Evaluate math expression |

#### Application Launcher
| Function | What It Does |
|----------|-------------|
| `open_application(name)` | Launch any of 30+ apps by name |

**Supported Applications:**
Chrome, Firefox, Edge, Excel, Word, PowerPoint, Teams, Zoom, Skype, Discord, Spotify, VLC, Notepad, Notepad++, VS Code, Calculator, Paint, Settings, Task Manager, File Explorer, Terminal, PowerShell, Command Prompt, Control Panel, Snipping Tool, OBS, Steam, Epic Games, Telegram, Slack, OneNote, Outlook

#### Website Opener
| Function | What It Does |
|----------|-------------|
| `open_website(name)` | Open any of 15+ websites in browser |

**Supported Websites:**
YouTube, Wikipedia, Google, GitHub, StackOverflow, Instagram, Twitter/X, LinkedIn, Facebook, Reddit, Amazon, Netflix, Spotify Web, Gmail, ChatGPT

#### Main Loop
| Function | What It Does |
|----------|-------------|
| `main()` | Entry point — greets user, starts command loop |
| `process_command(query)` | Routes voice/text command to correct function |
| `show_help()` | Display all available commands |
| `reset_chat()` | Clear AI conversation history |

---

### CommandListener Class

```
Class: CommandListener
├── __init__(self)
│   ├── Initialize speech_recognition.Recognizer
│   ├── Detect microphone (sr.Microphone)
│   ├── Set energy_threshold = 300
│   ├── Set dynamic_energy_threshold = True
│   ├── Set dynamic_energy_adjustment_damping = 0.15
│   └── Calibrate ambient noise (1 second)
│
├── listen(self)
│   ├── Listen with timeout=8, phrase_time_limit=10
│   ├── Recognize using Google Speech API
│   ├── Return text lowercase
│   └── On failure → return None
│
└── calibrate(self)
    └── Re-adjust for ambient noise (1 second)
```

---

### Music System

**Folder Auto-Detection Priority:**
1. `D:\music` (lowercase)
2. `D:\Music` (capitalized)
3. `D:\*` (search all D: drive folders for "music" in name)
4. `C:\Users\{username}\Music` (Windows default)

**Supported Audio Formats:**
`.mp3`, `.wav`, `.m4a`, `.flac`, `.aac`, `.wma`, `.ogg`

**Song Matching Algorithm (play_song_by_name):**
1. **Alias match** — Check `names.txt` for aliases (e.g., "believer" → "Believer - Imagine Dragons.mp3")
2. **Exact match** — Filename without extension matches exactly
3. **Substring match** — Query is contained in filename
4. **Word match** — Each word of query found in filename

**names.txt Format (34 aliases):**
```
song alias | actual filename
believer | Believer - Imagine Dragons
shape of you | Shape of You - Ed Sheeran
...
```

**Media Player Kill List (stop_music):**
wmplayer, vlc, spotify, groovemusic, musicbee, foobar2000, winamp, itunes, msedge, chrome, firefox

---

### AI Chat System

- **Model:** GPT-3.5-turbo via OpenAI API
- **API Key:** Stored in `config.py` → `OPENAI_API_KEY`
- **Conversation History:** Stored in global `chatStr` variable
- **System Prompt:** Acts as "Jarvis, a helpful AI assistant"
- **Reset:** `reset chat` command clears `chatStr`
- **Fallback:** If API fails, falls back to DuckDuckGo search + Wikipedia

---

### System Control

**Methods Used:**

| Action | Method |
|--------|--------|
| Shutdown | `subprocess: shutdown /s /t {delay}` |
| Restart | `subprocess: shutdown /r /t 0` |
| Sleep | `subprocess: rundll32.exe powrprof.dll,SetSuspendState 0,1,0` |
| Hibernate | `subprocess: shutdown /h` |
| Lock | `ctypes.windll.user32.LockWorkStation()` |
| Logoff | `subprocess: shutdown /l` |
| Display Off | `ctypes: SendMessageW(HWND_BROADCAST, WM_SYSCOMMAND, SC_MONITORPOWER, 2)` |
| WiFi On | `subprocess: netsh interface set interface "Wi-Fi" enabled` |
| WiFi Off | `subprocess: netsh interface set interface "Wi-Fi" disabled` |
| WiFi Status | `subprocess: netsh interface show interface "Wi-Fi"` |
| Bluetooth On | `subprocess: PowerShell Start-Service bthserv` |
| Bluetooth Off | `subprocess: PowerShell Stop-Service bthserv` |
| Volume Up | `pyautogui.press('volumeup')` |
| Volume Down | `pyautogui.press('volumedown')` |
| Volume Mute | `pyautogui.press('volumemute')` |

---

### Communication

**WhatsApp Call Flow:**
1. Search `names.txt` or contacts for phone number
2. Try WhatsApp Desktop (`whatsapp://send?phone=`)
3. Fallback to WhatsApp Web (`web.whatsapp.com/send?phone=`)
4. Open chat → trigger call button via pyautogui

**Email Flow:**
1. Open default email client or Gmail
2. Compose with template (subject, body)

---

### Voice Commands (Complete List)

#### Greetings
- `hey jarvis` / `hello jarvis` → Acknowledgment
- `good morning` / `good afternoon` / `good evening` / `good night` → Time greeting
- `thank you` / `thanks` → Welcome response

#### Music
- `play [song name]` → Search and play song
- `play [A-Z]` → Play first song starting with that letter
- `stop music` / `stop song` → Kill all media players
- `open music` / `music folder` → Open music directory

#### Web / Search
- `open youtube` / `open google` / `open github` / etc. → Open website
- `search for [query]` / `google [query]` → Google search
- `web search [query]` → DuckDuckGo + Wikipedia search

#### AI Chat
- `[any question]` → GPT-3.5-turbo answer
- `using artificial intelligence [prompt]` → Extended AI response
- `reset chat` → Clear conversation history

#### System Power
- `shutdown` / `shutdown in [X] seconds` → Shutdown with optional delay
- `restart` / `reboot` → Restart system
- `sleep` → System sleep
- `hibernate` → System hibernate
- `lock` / `lock screen` → Lock workstation
- `logoff` / `log off` / `sign out` → Log off user

#### Network
- `wifi on` / `enable wifi` → Turn on WiFi
- `wifi off` / `disable wifi` → Turn off WiFi
- `wifi status` → Check WiFi
- `bluetooth on` / `enable bluetooth` → Turn on Bluetooth
- `bluetooth off` / `disable bluetooth` → Turn off Bluetooth
- `bluetooth status` → Check Bluetooth
- `check internet` → Test connectivity

#### Display & Volume
- `turn off display` / `display off` → Monitor off
- `volume up` → Increase volume
- `volume down` → Decrease volume
- `mute` / `unmute` → Toggle mute

#### System Info
- `system info` → CPU, memory, disk
- `system status` → Full system report
- `battery` / `battery status` → Battery level
- `what time is it` / `time` → Current time
- `what date is it` / `today's date` / `date` → Current date
- `what is my ip` / `ip address` → Local IP

#### Applications
- `open chrome` / `open firefox` / `open edge` → Browsers
- `open excel` / `open word` / `open powerpoint` → Office
- `open teams` / `open zoom` / `open skype` → Meetings
- `open discord` / `open telegram` / `open slack` → Chat apps
- `open spotify` / `open vlc` → Media
- `open notepad` / `open notepad++` / `open vs code` → Editors
- `open calculator` / `open paint` / `open settings` → Utilities
- `open task manager` / `open file explorer` / `open terminal` → System tools

#### Communication
- `call [name] on whatsapp` → WhatsApp voice call
- `call [number]` → Phone/Skype call
- `open whatsapp` → Open WhatsApp
- `send email` → Email composer

#### Files
- `create folder [name]` → New folder on Desktop
- `search file [name]` → Windows Explorer search
- `open folder [path]` → Open in Explorer
- `screenshot` / `take screenshot` → Capture screen
- `read file [path]` → Read text/PDF content

#### Timers & Math
- `set timer [duration]` → Countdown timer
- `set alarm [time]` → Alarm at time
- `remind me to [task]` → Create reminder
- `calculate [expression]` / `calculator` → Math

#### Special
- `help` / `what can you do` → Show command list
- `password manager` → Open Passky
- `video call` / `facetime` → Video calling apps
- `jarvis quit` / `exit` / `goodbye` / `bye` → Shutdown assistant

---

## Frontend — React Web UI

### Pages

#### 1. Dashboard (`Dashboard.jsx`)
- Hero section with J.A.R.V.I.S. branding
- 6 category cards: AI Chat, Music, System, Communication, Files, Timers
- Each card links to its page
- Voice control microphone permission button
- Activity log panel

#### 2. AI Chat (`AIChat.jsx`)
- Real-time chat via WebSocket (`/ws`)
- Fallback to HTTP POST (`/api/chat`)
- Quick command buttons (time, date, battery, joke, news)
- Message history with user/assistant bubbles
- Input field + send button
- Typing indicator animation

#### 3. Music (`Music.jsx`)
- "Now Playing" card with spinning album art animation
- A-Z letter grid (26 buttons) — plays first song starting with letter
- Song name search input
- Stop music button
- Open music folder button
- Progress bar visualization

#### 4. System (`System.jsx`)
- 7 Quick Actions: Shutdown, Restart, Sleep, Lock, Hibernate, Display Off, Logoff
- App Launcher: 8 app shortcut buttons
- WiFi toggle + status indicator
- Bluetooth toggle + status indicator
- System info display

#### 5. Communication (`Communication.jsx`)
- Email composer form (to, subject, body)
- Google search box
- WhatsApp contact search + call
- Open WhatsApp button

#### 6. Files (`Files.jsx`)
- Create folder form (name input → creates on Desktop)
- File search input
- Read file path input (text/PDF)
- Screenshot capture button
- Open folder button

#### 7. Timers (`Timers.jsx`)
- Timer with duration input + 6 presets (1m, 5m, 10m, 15m, 30m, 1h)
- Alarm with time picker
- Calculator with expression input
- Visual countdown display

#### 8. Settings (`Settings.jsx`)
- OpenAI API key configuration
- Backend connection status
- Available functions list (from GET `/api/functions`)
- Version info
- Theme control

---

### Components

#### Layout Components
| Component | Purpose |
|-----------|---------|
| `Layout.jsx` | Main wrapper — sidebar + header + content area |
| `Header.jsx` | Top bar: page title, theme toggle (sun/moon), voice mic button |
| `Sidebar.jsx` | Navigation: 8 page links with icons, active state highlight, collapsible on mobile |

#### UI Components
| Component | Purpose |
|-----------|---------|
| `Modal.jsx` | Reusable popup: title, content, confirm/cancel buttons, backdrop click to close |

#### Icons (`Icons.jsx`)
30+ SVG icon components, all exported individually:
`DashboardIcon`, `ChatIcon`, `MusicIcon`, `SystemIcon`, `CommIcon`, `FilesIcon`, `TimerIcon`, `SettingsIcon`, `MicIcon`, `SendIcon`, `PlayIcon`, `StopIcon`, `SearchIcon`, `FolderIcon`, `ScreenshotIcon`, `PowerIcon`, `LockIcon`, `SleepIcon`, `RestartIcon`, `WifiIcon`, `BluetoothIcon`, `VolumeIcon`, `SunIcon`, `MoonIcon`, `MenuIcon`, `CloseIcon`, `DownloadIcon`, `TrashIcon`, `CalculatorIcon`, `AlarmIcon`, `EmailIcon`, `PhoneIcon`

---

### Custom Hooks

#### `useApi.js`
```
Hook: useApi()
├── state: loading, error, result
├── execute(action, params) → POST /api/run
├── checkStatus() → GET /api/status
└── Returns: { loading, error, result, execute, checkStatus }
```

#### `useLogger.js`
```
Hook: useLogger()
├── state: logs[] (max 100 entries)
├── addLog(message, type) → Add timestamped entry
├── clearLogs() → Clear all entries
├── downloadLogs() → Export as .txt file
└── Returns: { logs, addLog, clearLogs, downloadLogs }
```

#### `useTheme.js`
```
Hook: useTheme()
├── state: theme ('dark' | 'light')
├── toggleTheme() → Switch theme
├── Persists in localStorage
├── Adds 'light-theme' class to document.body
└── Returns: { theme, toggleTheme }
```

#### `useVoice.js`
```
Hook: useVoice()
├── state: isListening, transcript, isSupported
├── startListening() → Begin browser speech recognition
├── stopListening() → Stop recognition
├── Uses Web Speech API (webkitSpeechRecognition)
└── Returns: { isListening, transcript, isSupported, startListening, stopListening }
```

---

### API Layer

#### `utils/api.js`
- Base URL: `http://localhost:5000`
- Fetch wrapper with 10-second timeout
- Error handling and JSON parsing
- Functions exported: `apiCall(endpoint, options)`

#### Expected Backend Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/run` | Execute any action `{ action, params }` |
| GET | `/api/status` | Health check |
| GET | `/api/functions` | List all available functions |
| POST | `/api/chat` | Send chat message |
| WS | `/ws` | WebSocket for real-time updates |

---

### Styling & Theming

#### CSS Variables (60+)
**Dark Theme (default):**
- Background: `#0a0e27` (deep navy)
- Surface: `#0f1535` 
- Primary accent: `#00d9ff` (cyan)
- Secondary accent: `#7c3aed` (purple)
- Text: `#e2e8f0`

**Light Theme:**
- Background: `#f0f4f8`
- Surface: `#ffffff`
- Primary accent: `#0066cc`
- Text: `#1a202c`

#### Animations
- `pulse` — Status indicator breathing effect
- `spin` — Music album art rotation
- `typing` — Chat typing dots animation
- `fadeIn` — Page transition
- `slideIn` — Sidebar entrance

#### Responsive
- Sidebar hides on screens < 768px
- Header shows hamburger menu on mobile
- Cards stack vertically on small screens

---

## Configuration

### `config.py`
```python
OPENAI_API_KEY = "your-api-key-here"
```

### `config_example.py`
```python
# Copy this to config.py and add your API key
OPENAI_API_KEY = ""
```

### `names.txt` (Song Aliases)
34 entries mapping song nicknames to filenames:
```
believer | Believer - Imagine Dragons
shape of you | Shape of You - Ed Sheeran
blinding lights | Blinding Lights - The Weeknd
... (34 total)
```

---

## Startup & Autostart Scripts

### `Run_JARVIS.bat`
Simple launcher:
```batch
@echo off
cd /d "%~dp0"
python main.py
pause
```

### `start_jarvis_autorun.bat`
Auto-start version:
```batch
@echo off
cd /d "%~dp0"
start /min python main.py
```

### `start_jarvis.vbs`
VBScript launcher (currently disabled — contains only exit):
```vbs
' Disabled
WScript.Quit
```

### `FIX_POPUP.bat`
Removes duplicate scheduled task:
```batch
schtasks /delete /tn "JarvisAutoStart" /f
```

### `setup_immediate_autostart.py`
Adds J.A.R.V.I.S. to Windows Registry startup:
- Registry key: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- Value name: `JarvisAssistant`
- Value: path to `start_jarvis_autorun.bat`

---

## Dependencies (requirements.txt)

### Core
| Package | Version | Purpose |
|---------|---------|---------|
| `openai` | >=1.0.0 | GPT-3.5-turbo API |
| `speechrecognition` | >=3.10.0 | Voice recognition |
| `pyttsx3` | >=2.90 | Text-to-speech |
| `PyAudio` | >=0.2.14 | Microphone input |
| `pyautogui` | >=0.9.54 | Keyboard/mouse automation |
| `psutil` | >=5.9.0 | System stats |
| `pyperclip` | >=1.8.2 | Clipboard |
| `pywin32` | >=306 | Windows API |
| `requests` | >=2.31.0 | HTTP requests |
| `numpy` | >=1.24.0 | Audio processing |
| `Pillow` | >=10.0.0 | Screenshots |

### Optional
| Package | Purpose |
|---------|---------|
| `opencv-python` | Computer vision (optional) |
| `pocketsphinx` | Offline speech recognition (optional) |
| `google-cloud-speech` | Google Cloud STT (optional) |

### Dev
| Package | Purpose |
|---------|---------|
| `pytest` | Testing |
| `black` | Code formatting |
| `flake8` | Linting |

### Frontend (package.json)
| Package | Version |
|---------|---------|
| `react` | ^18.2.0 |
| `react-dom` | ^18.2.0 |
| `react-router-dom` | ^6.x |
| `vite` | ^5.0.0 |
| `@vitejs/plugin-react` | ^4.2.0 |

---

## How Everything Connects

```
1. User launches Run_JARVIS.bat (or autostart)
       ↓
2. Python main.py starts
       ↓
3. pyttsx3 engine initializes (TTS)
4. CommandListener initializes (microphone calibration)
5. wishMe() greets based on time
       ↓
6. Main loop starts:
   ┌─────────────────────────────────┐
   │  get_input()                     │
   │  ├── Thread 1: Voice (Google)    │
   │  └── Thread 2: Keyboard (input)  │
   │  First response wins             │
   └──────────┬──────────────────────┘
              ↓
7. process_command(query)
   ├── Matches keyword → calls function
   ├── No match → sends to OpenAI GPT
   └── API fail → DuckDuckGo/Wikipedia
              ↓
8. say(response) → speaks result
9. Loop back to step 6
```

**Web UI Connection:**
```
React UI (port 3000) ←→ Python Backend (port 5000)
  POST /api/run { action: "play_music", params: { name: "believer" } }
  ← { success: true, message: "Playing Believer" }
```

---

*This document covers every function, method, technology, command, and system used in the J.A.R.V.I.S. AI Assistant project.*
