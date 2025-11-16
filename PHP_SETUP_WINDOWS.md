# PHP & Composer Setup for Windows 11

Bu guide Windows 11-də PHP və Composer quraşdırıb, Laravel backend development üçün hazırlamağı izah edir.

---

## 🎯 Nə Üçün Lazımdır?

**Docker-da PHP var, niyə local-da lazımdır?**

✅ **IDE Intellisense** - VS Code autocomplete və type hints
✅ **Lint Checking** - Real-time kod quality yoxlama
✅ **Type Checking** - PHPStan, Psalm static analysis
✅ **Quick Commands** - `php artisan` komandalarını lokal-da işə sal
✅ **Faster Testing** - Local test execution (optional)

**Docker hələ də əsas development environment-dir**, PHP local yalnız tooling üçündür.

---

## 📦 Method 1: Chocolatey (Recommended)

### 1. Install Chocolatey

**PowerShell (Administrator):**
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### 2. Install PHP 8.3

**PowerShell (Administrator):**
```powershell
choco install php --version=8.3.0 -y
```

### 3. Install Composer

```powershell
choco install composer -y
```

### 4. Restart Terminal

```powershell
# Close and reopen PowerShell
php --version
composer --version
```

---

## 📦 Method 2: Manual Installation (Alternative)

### Step 1: Download PHP

1. **Visit:** https://windows.php.net/download/
2. **Download:** PHP 8.3.x Thread Safe (x64) ZIP
3. **Extract to:** `C:\php`

### Step 2: Configure PHP

1. **Copy php.ini:**
   ```cmd
   cd C:\php
   copy php.ini-development php.ini
   ```

2. **Edit `C:\php\php.ini`** (Notepad++):
   ```ini
   # Uncomment these lines (remove ;)
   extension=curl
   extension=fileinfo
   extension=gd
   extension=mbstring
   extension=openssl
   extension=pdo_sqlite
   extension=sqlite3
   extension=zip

   # Recommended settings
   memory_limit = 256M
   upload_max_filesize = 100M
   post_max_size = 100M
   max_execution_time = 300
   ```

### Step 3: Add PHP to PATH

**Option A: GUI Method**
1. Press `Win + X` → System
2. Advanced System Settings → Environment Variables
3. Under "System Variables", find `Path`
4. Click "Edit" → "New"
5. Add: `C:\php`
6. Click OK, OK, OK

**Option B: PowerShell (Admin)**
```powershell
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\php", [EnvironmentVariableTarget]::Machine)
```

### Step 4: Download Composer

1. **Visit:** https://getcomposer.org/download/
2. **Download:** Composer-Setup.exe
3. **Run installer** (it will auto-detect PHP)
4. **Follow wizard** (default options)

### Step 5: Verify Installation

```cmd
# Restart CMD/PowerShell first!
php --version
# PHP 8.3.x (cli)

composer --version
# Composer version 2.x.x
```

---

## 🔧 Post-Installation Configuration

### 1. Enable Required PHP Extensions

Check enabled extensions:
```cmd
php -m
```

Required extensions for Laravel:
- ✅ curl
- ✅ fileinfo
- ✅ gd
- ✅ mbstring
- ✅ openssl
- ✅ pdo_sqlite
- ✅ zip

### 2. Install Composer Global Packages (Optional)

```cmd
# Laravel Pint (code formatter)
composer global require laravel/pint

# PHPStan (static analyzer)
composer global require phpstan/phpstan

# PHP CS Fixer (code style)
composer global require friendsofphp/php-cs-fixer
```

Add Composer global bin to PATH:
```powershell
# %APPDATA%\Composer\vendor\bin
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:APPDATA\Composer\vendor\bin", [EnvironmentVariableTarget]::User)
```

---

## 🏗️ ATİS Backend Setup

### 1. Install Dependencies

```cmd
cd backend
composer install
```

**Expected output:**
```
Installing dependencies from lock file
...
Generating optimized autoload files
✅ Success!
```

### 2. Verify Laravel Installation

```cmd
php artisan --version
# Laravel Framework 12.x
```

### 3. Run Tests (Optional - Local)

```cmd
# Copy .env for testing
cp .env .env.testing

# Run PHPUnit tests
php artisan test

# Or use Composer
composer test
```

---

## 🎨 VS Code PHP Setup

### 1. Install Extensions

**Required:**
- **PHP Intelephense** (bmewburn.vscode-intelephense-client)
- **Laravel Extension Pack** (onecentlin.laravel-extension-pack)

**Recommended:**
- **PHP Debug** (xdebug.php-debug)
- **Laravel Blade Snippets** (onecentlin.laravel-blade)
- **EditorConfig** (editorconfig.editorconfig)

### 2. Configure VS Code Settings

Create/Update `.vscode/settings.json`:

```json
{
  "php.validate.executablePath": "C:\\php\\php.exe",
  "php.suggest.basic": false,
  "intelephense.environment.phpVersion": "8.3.0",
  "intelephense.files.exclude": [
    "**/.git/**",
    "**/.svn/**",
    "**/.hg/**",
    "**/CVS/**",
    "**/.DS_Store/**",
    "**/node_modules/**",
    "**/bower_components/**",
    "**/vendor/**/{Tests,tests}/**"
  ],
  "[php]": {
    "editor.defaultFormatter": "bmewburn.vscode-intelephense-client",
    "editor.formatOnSave": true,
    "editor.tabSize": 4
  },
  "files.associations": {
    "*.blade.php": "blade"
  }
}
```

### 3. Create Workspace Settings

`.vscode/settings.json` (in project root):

```json
{
  "intelephense.environment.includePaths": [
    "backend/vendor"
  ],
  "php.validate.executablePath": "C:\\php\\php.exe"
}
```

---

## 🧪 Linting & Code Quality

### 1. Laravel Pint (Code Style)

**Run formatter:**
```cmd
cd backend

# Format all files
php vendor/bin/pint

# Check without fixing
php vendor/bin/pint --test

# Format specific files
php vendor/bin/pint app/Http/Controllers
```

**VS Code Integration:**
Add to `backend/composer.json`:
```json
{
  "scripts": {
    "lint": "pint",
    "lint:test": "pint --test"
  }
}
```

### 2. PHPStan (Static Analysis)

**Create `backend/phpstan.neon`:**
```neon
includes:
    - vendor/larastan/larastan/extension.neon

parameters:
    paths:
        - app
    level: 5
    ignoreErrors:
        - '#Call to an undefined method#'
    excludePaths:
        - vendor
        - storage
        - bootstrap/cache
```

**Run analysis:**
```cmd
cd backend

# Install PHPStan Laravel
composer require --dev phpstan/phpstan larastan/larastan

# Run analysis
php vendor/bin/phpstan analyse

# Or via composer
composer run phpstan
```

### 3. VS Code Tasks

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Laravel Pint: Fix",
      "type": "shell",
      "command": "php",
      "args": ["vendor/bin/pint"],
      "options": {
        "cwd": "${workspaceFolder}/backend"
      },
      "problemMatcher": [],
      "group": "build"
    },
    {
      "label": "PHPStan: Analyze",
      "type": "shell",
      "command": "php",
      "args": ["vendor/bin/phpstan", "analyse"],
      "options": {
        "cwd": "${workspaceFolder}/backend"
      },
      "problemMatcher": [],
      "group": "build"
    },
    {
      "label": "Laravel: Test",
      "type": "shell",
      "command": "php",
      "args": ["artisan", "test"],
      "options": {
        "cwd": "${workspaceFolder}/backend"
      },
      "problemMatcher": [],
      "group": {
        "kind": "test",
        "isDefault": true
      }
    }
  ]
}
```

**Run tasks:** `Ctrl + Shift + B`

---

## 🚨 Troubleshooting

### Issue 1: "php is not recognized"

**Solution:**
```cmd
# Check PATH
echo %PATH%

# Manually add to PATH (PowerShell Admin)
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\php", [EnvironmentVariableTarget]::Machine)

# Restart terminal
```

### Issue 2: "composer is not recognized"

**Solution:**
```cmd
# Find Composer path
where composer

# Add to PATH if needed
# Usually: C:\ProgramData\ComposerSetup\bin
```

### Issue 3: Missing PHP Extensions

**Solution:**
```cmd
# Check enabled extensions
php -m

# Edit php.ini
notepad C:\php\php.ini

# Uncomment: extension=<extension_name>
# Save and restart terminal
```

### Issue 4: Composer Install Fails

**Error:** `Your requirements could not be resolved`

**Solution:**
```cmd
# Update Composer
composer self-update

# Clear cache
composer clear-cache

# Install with verbose
composer install -vvv

# Or inside Docker (fallback)
docker exec atis_backend composer install
```

### Issue 5: VS Code Intelephense Not Working

**Solution:**
1. **Check PHP path:** `File > Preferences > Settings` → Search "php.validate.executablePath"
2. **Set path:** `C:\php\php.exe`
3. **Reload window:** `Ctrl + Shift + P` → "Reload Window"
4. **Check extension:** Ensure Intelephense is enabled

---

## 📋 Quick Reference

### Common Commands

```cmd
# PHP Version
php --version

# PHP Info
php -i

# Enabled Extensions
php -m

# Composer Version
composer --version

# Update Composer
composer self-update

# Laravel Artisan
php artisan list
php artisan --version

# Run Migrations
php artisan migrate

# Run Seeders
php artisan db:seed

# Run Tests
php artisan test

# Code Formatting
php vendor/bin/pint

# Static Analysis
php vendor/bin/phpstan analyse
```

### File Locations

```
C:\php\                          # PHP Installation
C:\php\php.ini                   # PHP Configuration
C:\php\ext\                      # PHP Extensions
C:\ProgramData\ComposerSetup\    # Composer Installation
%APPDATA%\Composer\              # Composer Global Packages
```

---

## 🔄 Workflow: Docker vs Local

### Docker (Primary Development)
```cmd
# Start containers
start-windows.bat

# Run artisan commands
docker exec atis_backend php artisan migrate

# Install dependencies
docker exec atis_backend composer install

# Run tests
docker exec atis_backend php artisan test
```

### Local PHP (Linting & IDE)
```cmd
# Format code
cd backend
php vendor/bin/pint

# Static analysis
php vendor/bin/phpstan analyse

# Quick artisan checks (no DB needed)
php artisan route:list
php artisan config:clear
```

**Best Practice:**
- 🐳 Use **Docker** for running the app, migrations, seeding
- 💻 Use **Local PHP** for linting, type checking, IDE support

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] `php --version` shows PHP 8.3.x
- [ ] `composer --version` shows Composer 2.x
- [ ] `cd backend && composer install` completes successfully
- [ ] `php artisan --version` shows Laravel 12.x
- [ ] VS Code Intelephense shows autocomplete in PHP files
- [ ] `php vendor/bin/pint` runs without errors
- [ ] Docker containers still working (`docker ps`)

**🎉 Əgər hamısı ✅ olarsa, setup hazırdır!**

---

## 📚 Resources

- **PHP Downloads:** https://windows.php.net/download/
- **Composer:** https://getcomposer.org/
- **Laravel Docs:** https://laravel.com/docs
- **Laravel Pint:** https://laravel.com/docs/pint
- **PHPStan:** https://phpstan.org/
- **Chocolatey:** https://chocolatey.org/

---

## 🆘 Need Help?

Check:
1. This guide
2. [MULTI_ENVIRONMENT_SETUP.md](./MULTI_ENVIRONMENT_SETUP.md)
3. [CLAUDE.md](./CLAUDE.md)
4. GitHub Issues: https://github.com/scorpionabid/TIS/issues
