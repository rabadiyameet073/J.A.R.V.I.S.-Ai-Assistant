@echo off
REM Jarvis Autostart Script
REM Automatically finds the correct directory based on where this .bat file is
cd /d "%~dp0"

REM Clear conflicting environment variables
set PYTHONHOME=
set PYTHONPATH=

REM Run Jarvis using system Python
python main.py

REM Keep window open if there's an error
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Jarvis failed to start!
    echo Press any key to close...
    pause >nul
)
