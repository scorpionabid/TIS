@echo off
REM ATİS - PHP & Composer Setup for Windows 11
REM This script installs PHP and Composer for local development

echo.
echo ========================================
echo   ATİS - PHP Development Setup
echo ========================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] Not running as Administrator.
    echo Some installations may require admin privileges.
    echo.
    pause
)

echo [STEP 1/5] Checking for Chocolatey package manager...
where choco >nul 2>&1
if %errorLevel% neq 0 (
    echo Installing Chocolatey...
    @"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "[System.Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" && SET "PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin"

    if %errorLevel% neq 0 (
        echo [ERROR] Chocolatey installation failed.
        echo Please install manually from: https://chocolatey.org/install
        pause
        exit /b 1
    )
    echo [OK] Chocolatey installed successfully
) else (
    echo [OK] Chocolatey already installed
)

echo.
echo [STEP 2/5] Installing PHP 8.3...
choco install php --version=8.3.0 -y --force

if %errorLevel% neq 0 (
    echo [WARNING] Chocolatey PHP install failed, trying alternative method...
    echo.
    echo Please download PHP manually from:
    echo https://windows.php.net/download/
    echo.
    echo Download: PHP 8.3 Thread Safe (x64)
    echo Extract to: C:\php
    echo Add to PATH: C:\php
    pause
    goto :composer_install
)

echo [OK] PHP installed

echo.
echo [STEP 3/5] Configuring PHP...
REM Find PHP installation directory
for /f "tokens=*" %%i in ('where php 2^>nul') do set PHP_PATH=%%i
for %%i in ("%PHP_PATH%") do set PHP_DIR=%%~dpi

if exist "%PHP_DIR%php.ini" (
    echo [OK] php.ini found
) else (
    if exist "%PHP_DIR%php.ini-development" (
        echo Creating php.ini from php.ini-development...
        copy "%PHP_DIR%php.ini-development" "%PHP_DIR%php.ini"
    )
)

REM Enable required extensions
echo Enabling PHP extensions...
if exist "%PHP_DIR%php.ini" (
    powershell -Command "(gc '%PHP_DIR%php.ini') -replace ';extension=curl', 'extension=curl' | Out-File -encoding ASCII '%PHP_DIR%php.ini'"
    powershell -Command "(gc '%PHP_DIR%php.ini') -replace ';extension=fileinfo', 'extension=fileinfo' | Out-File -encoding ASCII '%PHP_DIR%php.ini'"
    powershell -Command "(gc '%PHP_DIR%php.ini') -replace ';extension=gd', 'extension=gd' | Out-File -encoding ASCII '%PHP_DIR%php.ini'"
    powershell -Command "(gc '%PHP_DIR%php.ini') -replace ';extension=mbstring', 'extension=mbstring' | Out-File -encoding ASCII '%PHP_DIR%php.ini'"
    powershell -Command "(gc '%PHP_DIR%php.ini') -replace ';extension=openssl', 'extension=openssl' | Out-File -encoding ASCII '%PHP_DIR%php.ini'"
    powershell -Command "(gc '%PHP_DIR%php.ini') -replace ';extension=pdo_sqlite', 'extension=pdo_sqlite' | Out-File -encoding ASCII '%PHP_DIR%php.ini'"
    powershell -Command "(gc '%PHP_DIR%php.ini') -replace ';extension=sqlite3', 'extension=sqlite3' | Out-File -encoding ASCII '%PHP_DIR%php.ini'"
    powershell -Command "(gc '%PHP_DIR%php.ini') -replace ';extension=zip', 'extension=zip' | Out-File -encoding ASCII '%PHP_DIR%php.ini'"
    echo [OK] Extensions enabled
)

:composer_install
echo.
echo [STEP 4/5] Installing Composer...
choco install composer -y

if %errorLevel% neq 0 (
    echo [WARNING] Chocolatey Composer install failed, trying alternative...
    echo Downloading Composer installer...
    powershell -Command "Invoke-WebRequest -Uri https://getcomposer.org/installer -OutFile composer-setup.php"
    php composer-setup.php --install-dir=%ProgramFiles%\ComposerSetup --filename=composer
    del composer-setup.php

    REM Add to PATH
    setx PATH "%PATH%;%ProgramFiles%\ComposerSetup" /M
)

echo [OK] Composer installed

echo.
echo [STEP 5/5] Verifying installation...
echo.

php --version
if %errorLevel% neq 0 (
    echo [ERROR] PHP not found in PATH
    echo Please restart your terminal or add PHP to PATH manually
    pause
    exit /b 1
)

composer --version
if %errorLevel% neq 0 (
    echo [ERROR] Composer not found in PATH
    echo Please restart your terminal or add Composer to PATH manually
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Restart your terminal/IDE
echo 2. Run: composer install (in backend directory)
echo 3. Run: php artisan --version
echo.
echo Useful commands:
echo   php -m                    # List enabled extensions
echo   php -i                    # PHP info
echo   composer global require   # Install global packages
echo.
pause
