# Multi-Environment Development Workflow

ATİS layihəsi 3 fərqli mühitdə inkişaf etdirilir:
1. **macOS** - Əsas development environment
2. **Windows 11** - Secondary development environment
3. **Production Server** - Ubuntu/Debian Linux

Bu sənəd hər bir mühitin düzgün konfigurasiyasını və onlar arasında problemsiz iş axınını təmin edir.

---

## 🎯 Əsas Prinsiplər

### Git Workflow Strategy

```bash
# Əsas branch struktur
main          # Production-ready kod
└── develop   # Development branch (optional)
    ├── feature/*   # Yeni feature-lər
    └── bugfix/*    # Bug fixes
```

### Platform-Specific Files (Gitignored)

Hər bir platformda local-specific fayllar yaradıla bilər və git tərəfindən ignore olunur:

```
docker-compose.override.yml    # Local Docker customizations
.env.platform                  # Platform-specific environment
*.local                        # Any .local files
*_backup_*/                    # Backup directories
```

---

## 🪟 Windows 11 Setup

### İlk Quraşdırma

1. **Git və Docker yüklə:**
   ```powershell
   # Git for Windows
   winget install Git.Git

   # Docker Desktop
   winget install Docker.DockerDesktop
   ```

2. **Repository clone et:**
   ```bash
   git clone https://github.com/scorpionabid/TIS.git
   cd TIS
   ```

3. **Platform-specific override yarat (optional):**
   ```bash
   cp docker-compose.windows.example.yml docker-compose.override.yml
   ```

### Windows-dan İşə Salma

**Variant 1: Windows Batch Script (Recommended)**
```cmd
# Start
start-windows.bat

# Stop
stop-windows.bat
```

**Variant 2: Git Bash**
```bash
"C:\Program Files\Git\usr\bin\bash.exe" ./start.sh
```

**Variant 3: Direct Docker Compose**
```cmd
docker-compose up -d
```

### Windows-Specific Tips

- **Line Endings:** Git avtomatik LF-ə çevirir (core.autocrlf=true)
- **Path Separator:** Windows `\` istifadə edir, Docker `/` gözləyir (avtomatik konvert olur)
- **Volume Performance:** Named volumes daha sürətlidir Windows-da

---

## 🍎 macOS Setup

### İlk Quraşdırma

1. **Homebrew ilə dependencies:**
   ```bash
   brew install git docker
   brew install --cask docker
   ```

2. **Platform-specific override yarat (optional):**
   ```bash
   cp docker-compose.mac.example.yml docker-compose.override.yml
   ```

### macOS-dan İşə Salma

```bash
# Start
./start.sh

# Stop
./stop.sh
```

### macOS-Specific Tips

- **File Watching:** `osxfs` yavaş ola bilər, `VirtioFS` istifadə et (Docker Desktop settings)
- **Volume Consistency:** `:cached` və `:delegated` flags performansı artırır
- **M1/M2 Chips:** `DOCKER_DEFAULT_PLATFORM=linux/amd64` set et

---

## 🖥️ Production Server (Ubuntu/Debian)

### Deployment Best Practices

1. **Environment Variables:**
   ```bash
   # Production .env ASLA commit olunmur
   cp .env.production.example backend/.env
   nano backend/.env  # Fill real credentials
   ```

2. **Production Docker Compose:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

3. **Database Backups:**
   ```bash
   # Automated daily backups
   ./backend/backup-database.sh
   ```

---

## 🔄 Cross-Platform Workflow

### Daily Development Routine

#### Windows-da işləyərkən:

```bash
# 1. Pull ən son dəyişiklikləri
git pull origin main

# 2. Local development
start-windows.bat
# ... kod yaz ...

# 3. Test et
docker exec atis_backend php artisan test
docker exec atis_frontend npm run lint

# 4. Commit et (platform-agnostic changes only)
git add .
git commit -m "feat: add new feature"
git push origin main
```

#### macOS-da işləyərkən:

```bash
# 1. Pull et (Windows-dan gələn dəyişiklikləri)
git pull origin main

# 2. Local development
./start.sh
# ... kod yaz ...

# 3. Test et
npm run test
php artisan test

# 4. Commit & Push
git add .
git commit -m "refactor: improve component"
git push origin main
```

#### Production Server-ə Deploy:

```bash
# 1. SSH ile servere gir
ssh user@production-server

# 2. Pull latest
cd /var/www/atis
git pull origin main

# 3. Rebuild containers (if needed)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 4. Run migrations
docker exec atis_backend php artisan migrate --force

# 5. Clear caches
docker exec atis_backend php artisan config:clear
docker exec atis_backend php artisan cache:clear
```

---

## ⚠️ Problem Həlli - Cross-Platform Issues

### Issue 1: Line Ending Conflicts

**Symptom:** `start.sh` Windows-da işləmir (^M characters)

**Solution:**
```bash
# Git config (one-time setup)
git config --global core.autocrlf input   # macOS/Linux
git config --global core.autocrlf true    # Windows

# Fix existing file
dos2unix start.sh    # Convert CRLF to LF
```

### Issue 2: Package-lock.json Conflicts

**Symptom:** npm install fərqli versiyalar qurur

**Solution:**
```bash
# Hər iki platformda eyni npm versiyası istifadə et
npm --version  # Check version

# Docker container-də install et (platform-agnostic)
docker exec atis_frontend npm install
```

### Issue 3: Docker Volume Permissions

**Symptom:** Permission denied errors Windows-dan sonra macOS-da

**Solution:**
```bash
# macOS-da permissions düzəlt
docker exec atis_backend chown -R www-data:www-data /var/www/html/storage
docker exec atis_backend chmod -R 775 /var/www/html/storage
```

### Issue 4: Database Səhvləri (SQLite path)

**Symptom:** `database.sqlite` tapılmır

**Solution:**
```bash
# Container-daxili absolute path istifadə et
# backend/.env
DB_DATABASE=/var/www/html/database/database.sqlite

# Host-dakı file mövcud olmalıdır
touch backend/database/database.sqlite
```

---

## 📋 Checklist: Yeni Platformda Setup

### Windows 11
- [ ] Git for Windows yüklənib
- [ ] Docker Desktop yüklənib və işləyir
- [ ] Repository clone edilib
- [ ] `start-windows.bat` test edilib
- [ ] Frontend və Backend açılır (localhost:3000, localhost:8000)
- [ ] Test credentials işləyir (superadmin / admin123)

### macOS
- [ ] Homebrew yüklənib
- [ ] Git və Docker yüklənib
- [ ] Repository clone edilib
- [ ] `./start.sh` işləyir
- [ ] Services healthy status göstərir

### Production Server
- [ ] Git yüklənib
- [ ] Docker və Docker Compose yüklənib
- [ ] SSL certificates konfiqurasiya edilib
- [ ] `.env` production credentials-lə doldurulub
- [ ] Automated backups konfiqurasiya edilib
- [ ] Monitoring setup edilib

---

## 🚀 Best Practices

### DO's ✅

1. **Always pull before starting work**
   ```bash
   git pull origin main
   ```

2. **Test on multiple platforms before pushing critical changes**
   ```bash
   # Windows
   npm run test && php artisan test

   # macOS
   npm run test && php artisan test
   ```

3. **Use Docker for consistency**
   - Dependencies Docker container-də install olsun
   - Host-da minimum dependencies

4. **Document platform-specific issues**
   - Bu faylı (MULTI_ENVIRONMENT_SETUP.md) update et

5. **Use environment variables for paths**
   ```php
   // ✅ Good
   $path = storage_path('app/uploads');

   // ❌ Bad
   $path = '/var/www/html/storage/app/uploads';
   ```

### DON'Ts ❌

1. **Hardcoded paths commit etmə**
   ```javascript
   // ❌ Bad
   const apiUrl = 'http://localhost:8000/api';

   // ✅ Good
   const apiUrl = import.meta.env.VITE_API_BASE_URL;
   ```

2. **Platform-specific files commit etmə**
   - `docker-compose.override.yml` - gitignored
   - `.env.local` - gitignored
   - `*.bat.local` - gitignored

3. **Direct file system operations (use Storage facade)**
   ```php
   // ❌ Bad
   file_put_contents('/var/www/uploads/file.txt', $data);

   // ✅ Good
   Storage::disk('public')->put('uploads/file.txt', $data);
   ```

4. **Commit database files**
   - `*.sqlite` - gitignored
   - SQL dumps - gitignored

---

## 📞 Support

**Problem yarananda:**

1. Check bu guide
2. Check [CLAUDE.md](./CLAUDE.md) main documentation
3. Check Docker logs:
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   ```
4. GitHub Issues: https://github.com/scorpionabid/TIS/issues

---

## 🔄 Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2025-11-16 | Initial multi-environment setup | Claude Code |

---

**⚡ Remember:** Hər platformda test et, commit et, və problemsiz collaborate et!
