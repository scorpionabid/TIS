# Platform-Specific Quick Start Guide

ATİS sistemini öz platformanızda 5 dəqiqədə işə salın! 🚀

---

## 🪟 Windows 11 (Recommended Method)

### Prerequisites
```powershell
# Check if installed
docker --version
git --version
```

### Quick Start (3 Easy Steps)

**1. Clone Repository**
```cmd
git clone https://github.com/scorpionabid/TIS.git
cd TIS
```

**2. Start System (Double-click or run)**
```cmd
start-windows.bat
```

**3. Open Browser**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Login: `superadmin` / `admin123`

### Troubleshooting Windows

**Problem:** Docker Desktop not running
```cmd
# Start Docker Desktop manually
"C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

**Problem:** Git Bash not found
```cmd
# Install Git for Windows
winget install Git.Git
```

**Problem:** Port already in use
```cmd
# Kill processes on ports 3000, 8000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 🍎 macOS

### Prerequisites
```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install git docker
brew install --cask docker
```

### Quick Start

**1. Clone Repository**
```bash
git clone https://github.com/scorpionabid/TIS.git
cd TIS
```

**2. Start System**
```bash
chmod +x start.sh
./start.sh
```

**3. Open Browser**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### Troubleshooting macOS

**Problem:** Permission denied on start.sh
```bash
chmod +x start.sh stop.sh
```

**Problem:** Docker not running
```bash
open -a Docker
# Wait 30 seconds for Docker to start
```

**Problem:** Port conflicts
```bash
# Find and kill processes
lsof -ti:3000,8000 | xargs kill -9
```

---

## 🐧 Linux (Ubuntu/Debian)

### Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
# Logout and login again
```

### Quick Start

**1. Clone Repository**
```bash
git clone https://github.com/scorpionabid/TIS.git
cd TIS
```

**2. Make scripts executable**
```bash
chmod +x start.sh stop.sh
```

**3. Start System**
```bash
./start.sh
```

### Troubleshooting Linux

**Problem:** Permission denied (Docker)
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

**Problem:** Ports in use
```bash
# Kill processes
sudo fuser -k 3000/tcp 8000/tcp
```

---

## 🔄 Platform Comparison

| Feature | Windows 11 | macOS | Linux |
|---------|-----------|-------|-------|
| **Start Command** | `start-windows.bat` | `./start.sh` | `./start.sh` |
| **Docker Performance** | Good (WSL2) | Excellent | Excellent |
| **File Watching** | Polling | Native | Native |
| **Volume Performance** | Named volumes | Delegated | Native |
| **Script Type** | Batch + Bash | Bash | Bash |

---

## 📦 What Gets Installed?

### Docker Containers (3)
1. **atis_backend** - Laravel 12 + PHP 8.3 (Port 8000)
2. **atis_frontend** - React 18 + Vite (Port 3000)
3. **atis_redis** - Redis 7 Cache (Port 6379)

### Database
- SQLite (development)
- Pre-seeded with test data
- Migrations auto-run

### Test Accounts
```
SuperAdmin: superadmin / admin123
Admin: admin / admin123
```

---

## 🛠️ Common Operations

### View Logs
```bash
# Windows
docker-compose logs -f

# All platforms
docker logs -f atis_backend
docker logs -f atis_frontend
```

### Stop System
```bash
# Windows
stop-windows.bat

# macOS/Linux
./stop.sh
```

### Restart System
```bash
# Windows
stop-windows.bat
start-windows.bat

# macOS/Linux
./stop.sh && ./start.sh
```

### Reset Database
```bash
docker exec atis_backend php artisan migrate:fresh --seed
```

### Access Container Shell
```bash
# Backend
docker exec -it atis_backend bash

# Frontend
docker exec -it atis_frontend sh
```

---

## ⚡ Performance Tips

### Windows
- Enable WSL2 backend in Docker Desktop
- Use named volumes for node_modules
- Disable Windows Defender real-time scanning for project folder

### macOS
- Use VirtioFS (Docker Desktop > Settings > General)
- Enable file sharing for project directory
- Add `:cached` to volume mounts

### Linux
- Use native Docker (not Docker Desktop)
- Enable BuildKit: `export DOCKER_BUILDKIT=1`
- Use overlay2 storage driver

---

## 🆘 Getting Help

**Check Health:**
```bash
# Backend health
curl http://localhost:8000/api/health

# Frontend
curl http://localhost:3000
```

**Check Container Status:**
```bash
docker ps
docker-compose ps
```

**Full System Reset:**
```bash
# Stop everything
docker-compose down -v

# Remove all containers and volumes
docker system prune -af --volumes

# Start fresh
./start.sh  # or start-windows.bat
```

**Documentation:**
- Main Docs: [CLAUDE.md](./CLAUDE.md)
- Multi-Environment: [MULTI_ENVIRONMENT_SETUP.md](./MULTI_ENVIRONMENT_SETUP.md)
- Deployment: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## ✅ Success Checklist

After running start script, verify:

- [ ] ✅ Frontend loads at http://localhost:3000
- [ ] ✅ Backend API responds at http://localhost:8000/api/health
- [ ] ✅ Login works with `superadmin` / `admin123`
- [ ] ✅ No errors in `docker-compose logs`
- [ ] ✅ All 3 containers running: `docker ps`

**🎉 Əgər bütün checkmark-lar varsa, sistem hazırdır!**

---

## 📞 Support

**Issues?** Check:
1. This guide
2. [MULTI_ENVIRONMENT_SETUP.md](./MULTI_ENVIRONMENT_SETUP.md)
3. Docker logs: `docker-compose logs`
4. GitHub Issues: https://github.com/scorpionabid/TIS/issues
