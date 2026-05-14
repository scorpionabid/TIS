@echo off
REM ATİS Windows Start Script
REM This file is Windows-specific and safe to use locally

echo.
echo ========================================
echo   ATİS System - Windows Launcher
echo ========================================
echo.

REM Check if Git Bash exists
set "BASH_PATH=C:\Program Files\Git\usr\bin\bash.exe"
if not exist "%BASH_PATH%" (
    echo [ERROR] Git Bash not found at: %BASH_PATH%
    echo.
    echo Please install Git for Windows from:
    echo https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Docker Desktop is not running.
    echo Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Waiting for Docker to start...
    timeout /t 10 /nobreak >nul

    REM Check again
    docker info >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Docker failed to start. Please start Docker Desktop manually.
        pause
        exit /b 1
    )
)

echo [OK] Docker is running
echo.

REM Run the bash script using Git Bash
echo Starting ATİS system...
echo.
"%BASH_PATH%" ./start.sh

echo.
echo ========================================
echo   ATİS System Started Successfully
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo.
echo Press any key to view logs (or close this window)...
pause >nul

REM Show logs
docker-compose logs -f
