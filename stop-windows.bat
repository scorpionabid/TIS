@echo off
REM ATİS Windows Stop Script
REM This file is Windows-specific and safe to use locally

echo.
echo ========================================
echo   ATİS System - Stopping...
echo ========================================
echo.

REM Check if Git Bash exists
set "BASH_PATH=C:\Program Files\Git\usr\bin\bash.exe"
if not exist "%BASH_PATH%" (
    REM Fallback to docker-compose directly
    echo Using docker-compose directly...
    docker-compose down
    goto :end
)

REM Use stop.sh if available
if exist stop.sh (
    "%BASH_PATH%" ./stop.sh
) else (
    echo stop.sh not found, using docker-compose directly...
    docker-compose down
)

:end
echo.
echo [OK] ATİS System Stopped
echo.
pause
