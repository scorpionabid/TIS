@echo off
echo 🔄 Restoring ATIS Frontend...
docker compose up -d --build --force-recreate frontend
echo ✅ Frontend restored!
pause
