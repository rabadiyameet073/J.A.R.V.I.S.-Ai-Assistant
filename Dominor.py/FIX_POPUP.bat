@echo off
echo ==================================================
echo      REMOVING DUPLICATE JARVIS STARTUP TASK
echo ==================================================
echo.
echo This script removes the "JarvishAutoStart" task that
echo is causing the permission popup.
echo.

REM Try to delete the task
schtasks /Delete /TN "JarvishAutoStart" /F

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Duplicate task removed!
    echo The popup should be gone now.
) else (
    echo.
    echo [ERROR] Could not delete task.
    echo.
    echo *** IMPORTANT ***
    echo Please right-click this file and select "Run as Administrator"
    echo.
)

pause
