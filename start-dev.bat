@echo off
REM ATİS Dev Server Launcher for Windows
REM This script starts the dev system with auto-data-recovery using Git Bash

echo.
echo ========================================
echo   ATİS Dev System - Windows Launcher
echo ========================================
echo.

REM Check if Git Bash exists
set "BASH_PATH=C:\Program Files\Git\usr\bin\bash.exe"
if not exist "%BASH_PATH%" (
    echo [ERROR] Git Bash tapılmadı!
    echo Zəhmət olmasa Git quraşdırın: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Run the dev bash script
echo [STATUS] Sistemi başladır və bazanı yoxlayır...
"%BASH_PATH%" ./start-dev.sh

echo.
echo ========================================
echo   ATİS Dev Mühit Hazırdır!
echo ========================================
echo.
pause
