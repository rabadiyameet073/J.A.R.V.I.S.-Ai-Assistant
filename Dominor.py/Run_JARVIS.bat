@echo off
title J.A.R.V.I.S. AI Assistant
color 0A
echo.
echo  ========================================
echo     J.A.R.V.I.S. AI Assistant Launcher
echo  ========================================
echo.

REM Go to the folder where this bat file lives
cd /d "%~dp0"

REM Clear any conflicting Python env variables
set PYTHONHOME=
set PYTHONPATH=

REM Launch JARVIS
python main.py

REM If it crashes, keep window open so user can see the error
echo.
echo ========================================
echo  JARVIS has stopped.
echo ========================================
pause
