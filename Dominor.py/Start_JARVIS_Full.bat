@echo off
title J.A.R.V.I.S. Full Launcher v2.0
color 0A
setlocal

REM ================================================================
REM  J.A.R.V.I.S. Full Stack Launcher
REM  Starts: FastAPI Backend (port 8000) + React Frontend (port 3000)
REM  Created by: R.M.D.U.
REM ================================================================

cd /d "%~dp0"

echo.
echo  ================================================================
echo      J.A.R.V.I.S. AI Assistant - Full Stack Launcher v2.0
echo      Presented by Meet Rabadiya (R.M.D.U.)
echo  ================================================================
echo.

REM Clear conflicting env vars
set PYTHONHOME=
set PYTHONPATH=

REM ── Step 1: Check Python ─────────────────────────────────────────
echo  [1/5] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Python not found. Install Python 3.8+ from python.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version') do echo  Found: %%v

REM ── Step 2: Check Node.js ────────────────────────────────────────
echo  [2/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found. Install Node.js from nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo  Found: Node %%v

REM ── Step 3: Install Backend Dependencies ────────────────────────
echo.
echo  [3/5] Installing backend dependencies...
echo  (This may take a few minutes on first run)
echo.
python -m pip install --upgrade pip -q
python -m pip install -r requirements_backend.txt -q
if errorlevel 1 (
    echo  WARNING: Some backend packages may have failed to install.
    echo  Continuing anyway...
)
echo  Backend dependencies ready.

REM ── Step 4: Install Frontend Dependencies ───────────────────────
echo.
echo  [4/5] Installing frontend dependencies...
if not exist "jarvis-web-ui\node_modules" (
    echo  Running npm install - first time setup...
    cd jarvis-web-ui
    npm install
    cd ..
) else (
    echo  node_modules exists, skipping npm install.
)
echo  Frontend dependencies ready.

REM ── Step 5: Launch Everything ───────────────────────────────────
echo.
echo  [5/5] Launching J.A.R.V.I.S. services...
echo.
echo  Starting FastAPI backend on http://localhost:8000 ...
start "JARVIS Backend" cmd /k "cd /d "%~dp0" && title JARVIS Backend ^| Port 8000 && python -m uvicorn backend.main_server:app --host 0.0.0.0 --port 8000 --reload"

REM Wait 3 seconds for backend to start
echo  Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

echo  Starting React frontend on http://localhost:3000 ...
start "JARVIS Frontend" cmd /k "cd /d "%~dp0jarvis-web-ui" && title JARVIS Frontend ^| Port 3000 && npm run dev"

REM Wait 4 seconds for frontend to start
echo  Waiting for frontend to initialize...
timeout /t 4 /nobreak >nul

echo.
echo  ================================================================
echo   J.A.R.V.I.S. is now running!
echo.
echo   Backend  API: http://localhost:8000
echo   Frontend UI:  http://localhost:3000
echo   API Docs:     http://localhost:8000/docs
echo   WebSocket:    ws://localhost:8000/ws
echo.
echo   Close the backend and frontend windows to stop JARVIS.
echo  ================================================================
echo.
pause
