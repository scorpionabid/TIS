#!/bin/bash
# ATIS Production Pull & Deploy Script
# İstifadə: ./pull.sh
set -e

PROJECT_DIR="/srv/atis/TIS"
BACKUP_DIR="$PROJECT_DIR/database-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/atis_production_$TIMESTAMP.sql"

# Rənglər
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
fail() { echo -e "${RED}[XƏTA]${NC} $1"; exit 1; }
info() { echo -e "${YELLOW}[...]${NC} $1"; }

cd "$PROJECT_DIR"

# ═══════════════════════════════════════════
# 1. DB BACKUP
# ═══════════════════════════════════════════
info "DB backup alınır..."
mkdir -p "$BACKUP_DIR"
docker exec atis_postgres pg_dump -U atis_prod_user -d atis_production > "$BACKUP_FILE" 2>/dev/null \
  || fail "pg_dump uğursuz oldu"

# ═══════════════════════════════════════════
# 2. BACKUP YOXLANIŞI
# ═══════════════════════════════════════════
info "Backup yoxlanılır..."
FILE_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || echo 0)
TABLE_COUNT=$(grep -c "CREATE TABLE" "$BACKUP_FILE" 2>/dev/null || echo 0)
DUMP_COMPLETE=$(grep -c "PostgreSQL database dump complete" "$BACKUP_FILE" 2>/dev/null || echo 0)

if [ "$FILE_SIZE" -lt 1000 ]; then
  fail "Backup faylı çox kiçikdir: $FILE_SIZE bytes"
fi
if [ "$TABLE_COUNT" -lt 100 ]; then
  fail "Cədvəl sayı azdır: $TABLE_COUNT (gözlənilən: 160+)"
fi
if [ "$DUMP_COMPLETE" -eq 0 ]; then
  fail "Backup tamamlanmayıb (dump complete tapılmadı)"
fi
ok "Backup: $(du -h "$BACKUP_FILE" | cut -f1), $TABLE_COUNT cədvəl"

# ═══════════════════════════════════════════
# 3. GIT PULL
# ═══════════════════════════════════════════
info "Git pull edilir..."
BEFORE=$(git rev-parse HEAD)

# docker-compose.yml skip-worktree ilə qorunur.
# Əgər remote onu dəyişdiribsə, pull uğursuz ola bilər — o halda stash/pop edirik.
if ! git pull origin main 2>/dev/null; then
  info "docker-compose.yml konflikti — stash ilə həll edilir..."
  git update-index --no-skip-worktree docker-compose.yml
  git stash push -m "pull.sh auto-stash" -- docker-compose.yml
  git pull origin main || fail "Git pull uğursuz oldu"
  git stash pop || info "Stash pop konflikti — docker-compose.yml manual yoxlayın"
  git update-index --skip-worktree docker-compose.yml
fi

AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
  ok "Artıq ən son versiyadadır, dəyişiklik yoxdur"
  echo ""
  echo "Konteynerləri yenidən build etmək istəyirsiniz? (y/n)"
  read -r REBUILD
  if [ "$REBUILD" != "y" ]; then
    ok "Heç nə dəyişmədi. Çıxış."
    exit 0
  fi
else
  COMMIT_COUNT=$(git rev-list --count "$BEFORE".."$AFTER")
  ok "Pull: $COMMIT_COUNT yeni commit ($BEFORE → $AFTER)"
fi

# ═══════════════════════════════════════════
# 4. DOCKER BUILD & RESTART
# ═══════════════════════════════════════════
info "Docker build edilir..."
docker compose build --quiet || fail "Docker build uğursuz oldu"
ok "Build tamamdır"

info "Konteynerlər yenidən qaldırılır..."
docker compose up -d || fail "Docker up uğursuz oldu"
ok "Konteynerlər işə düşdü"

# ═══════════════════════════════════════════
# 5. MIGRATION + CORE SEEDERS
# ═══════════════════════════════════════════
info "Migration yoxlanılır..."
sleep 5
docker exec atis_backend php artisan migrate --force 2>&1
ok "Migration tamamdır"

info "Core seeders yoxlanılır (yalnız role/permission)..."
docker exec atis_backend php artisan db:seed --class=RoleSeeder --force 2>&1
docker exec atis_backend php artisan db:seed --class=PermissionSeeder --force 2>&1
docker exec atis_backend php artisan db:seed --class=SuperAdminSeeder --force 2>&1
docker exec atis_backend php artisan db:seed --class=RegionOperatorPermissionSeeder --force 2>&1
docker exec atis_backend php artisan db:seed --class=RegionAdminPermissionBalanceSeeder --force 2>&1
ok "Core seeders tamamdır"

# ═══════════════════════════════════════════
# 6. HEALTH CHECK
# ═══════════════════════════════════════════
info "Health check..."
sleep 5

# Backend
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000 --max-time 10 2>/dev/null)
[ "$BACKEND_STATUS" = "200" ] && ok "Backend: 200 OK" || echo -e "${RED}[!]${NC} Backend: $BACKEND_STATUS"

# Frontend (build vaxt tələb edə bilər)
for i in 1 2 3; do
  FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 10 2>/dev/null)
  [ "$FRONTEND_STATUS" = "200" ] && break
  sleep 10
done
[ "$FRONTEND_STATUS" = "200" ] && ok "Frontend: 200 OK" || echo -e "${RED}[!]${NC} Frontend: $FRONTEND_STATUS (build davam edə bilər)"

# Postgres & Redis
PG=$(docker inspect atis_postgres --format '{{.State.Health.Status}}' 2>/dev/null)
RD=$(docker inspect atis_redis --format '{{.State.Health.Status}}' 2>/dev/null)
[ "$PG" = "healthy" ] && ok "PostgreSQL: healthy" || echo -e "${RED}[!]${NC} PostgreSQL: $PG"
[ "$RD" = "healthy" ] && ok "Redis: healthy" || echo -e "${RED}[!]${NC} Redis: $RD"

# ═══════════════════════════════════════════
# 7. KÖHNƏ BACKUPLARI TƏMİZLƏ (son 5 saxla)
# ═══════════════════════════════════════════
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/atis_production_*.sql 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 5 ]; then
  ls -1t "$BACKUP_DIR"/atis_production_*.sql | tail -n +6 | xargs rm -f
  ok "Köhnə backuplar təmizləndi (son 5 saxlanıldı)"
fi

# ═══════════════════════════════════════════
echo ""
echo -e "${GREEN}════════════════════════════════════${NC}"
echo -e "${GREEN}  Deploy tamamdır!  $(date '+%H:%M %d/%m/%Y')${NC}"
echo -e "${GREEN}════════════════════════════════════${NC}"
