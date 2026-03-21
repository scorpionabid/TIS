#!/bin/bash

# ATİS Health Check Script (Docker-aware)
# İstifadə: ./health-check.sh [--domain atis.edu.az] [--local]
#   --local   : localhost yoxlaması (dev mühiti)
#   --domain  : production domain (default: atis.edu.az)

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Defaults
DOMAIN="atis.edu.az"
LOCAL_MODE=false

# Parse args
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --local)   LOCAL_MODE=true ;;
        --domain)  DOMAIN="$2"; shift ;;
    esac
    shift
done

if $LOCAL_MODE; then
    API_URL="http://localhost:8000/api/health"
else
    API_URL="https://$DOMAIN/api/health"
fi

TIMEOUT=10
FAILED_CHECKS=0
WARN_CHECKS=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓ $1${NC}"; }
fail() { echo -e "${RED}  ✗ $1${NC}"; ((FAILED_CHECKS++)); }
warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; ((WARN_CHECKS++)); }
info() { echo -e "${BLUE}▶ $1${NC}"; }

echo ""
echo "=================================================="
echo "  ATİS System Health Check — $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================================="
echo ""

# ─── 1. Docker Daemon ───────────────────────────────
info "Docker Daemon"
if docker info >/dev/null 2>&1; then
    ok "Docker işləyir"
else
    fail "Docker işləmir — bütün yoxlamalar keçilir"
    echo ""
    echo "  XÜLASƏ: Docker işləmir, yoxlama dayandırıldı."
    exit 2
fi
echo ""

# ─── 2. Container Status ────────────────────────────
info "Container Statusları"
CONTAINERS=("atis_postgres" "atis_redis" "atis_backend" "atis_frontend")
for c in "${CONTAINERS[@]}"; do
    STATUS=$(docker inspect --format='{{.State.Status}}' "$c" 2>/dev/null)
    HEALTH=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$c" 2>/dev/null)
    if [ "$STATUS" = "running" ]; then
        if [ "$HEALTH" = "healthy" ] || [ "$HEALTH" = "none" ]; then
            ok "$c: running"
        elif [ "$HEALTH" = "starting" ]; then
            warn "$c: running (health: starting...)"
        else
            warn "$c: running (health: $HEALTH)"
        fi
    elif [ -z "$STATUS" ]; then
        fail "$c: mövcud deyil"
    else
        fail "$c: $STATUS"
    fi
done
echo ""

# ─── 3. PostgreSQL ──────────────────────────────────
info "PostgreSQL Yoxlaması"
if docker ps | grep -q atis_postgres; then
    # Connection
    if docker exec atis_postgres pg_isready -U atis_dev_user -d atis_dev >/dev/null 2>&1; then
        ok "Bağlantı: OK"
    else
        fail "Bağlantı: uğursuz"
    fi

    # User count
    USER_COUNT=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n')
    if [ -n "$USER_COUNT" ] && [ "$USER_COUNT" -gt 0 ]; then
        ok "Users: $USER_COUNT"
    else
        warn "Users: 0 (baza boş ola bilər)"
    fi

    # Active connections
    CONN_COUNT=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'atis_dev';" 2>/dev/null | tr -d ' \n')
    ok "Aktiv bağlantılar: ${CONN_COUNT:-?}"

    # DB size
    DB_SIZE=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT pg_size_pretty(pg_database_size('atis_dev'));" 2>/dev/null | tr -d ' \n')
    ok "DB ölçüsü: ${DB_SIZE:-?}"
else
    fail "atis_postgres container işləmir"
fi
echo ""

# ─── 4. Redis ───────────────────────────────────────
info "Redis Yoxlaması"
if docker ps | grep -q atis_redis; then
    if docker exec atis_redis redis-cli ping 2>/dev/null | grep -q PONG; then
        ok "Redis: PONG"
    else
        fail "Redis cavab vermir"
    fi

    # Memory usage
    REDIS_MEM=$(docker exec atis_redis redis-cli info memory 2>/dev/null | grep "used_memory_human" | head -1 | cut -d: -f2 | tr -d '\r')
    ok "İstifadə olunan yaddaş: ${REDIS_MEM:-?}"

    # Keys count
    REDIS_KEYS=$(docker exec atis_redis redis-cli dbsize 2>/dev/null | tr -d '\r')
    ok "Keys: ${REDIS_KEYS:-?}"
else
    fail "atis_redis container işləmir"
fi
echo ""

# ─── 5. Queue Jobs Backlog ──────────────────────────
info "Queue Worker / Job Backlog"
if docker ps | grep -q atis_postgres; then
    # Pending jobs
    PENDING_JOBS=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM jobs;" 2>/dev/null | tr -d ' \n')
    FAILED_JOBS=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM failed_jobs;" 2>/dev/null | tr -d ' \n')

    PENDING_JOBS=${PENDING_JOBS:-0}
    FAILED_JOBS=${FAILED_JOBS:-0}

    if [ "$PENDING_JOBS" -gt 500 ]; then
        warn "Gözləyən job-lar: $PENDING_JOBS (yüksəkdir — queue worker işləyirmi?)"
    elif [ "$PENDING_JOBS" -gt 0 ]; then
        ok "Gözləyən job-lar: $PENDING_JOBS"
    else
        ok "Gözləyən job-lar: 0"
    fi

    if [ "$FAILED_JOBS" -gt 0 ]; then
        warn "Uğursuz job-lar: $FAILED_JOBS (araşdırılmalıdır)"
    else
        ok "Uğursuz job-lar: 0"
    fi

    # Queue worker container (production)
    if docker ps | grep -q atis_queue_worker; then
        ok "Queue Worker container: işləyir"
    else
        warn "Queue Worker container tapılmadı (production-da atis_queue_worker olmalıdır)"
    fi
else
    warn "PostgreSQL əlçatmaz — queue backlog yoxlanmadı"
fi
echo ""

# ─── 6. API Endpoint ────────────────────────────────
info "API Endpoint"
if command -v curl >/dev/null 2>&1; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$TIMEOUT" "$API_URL" 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        ok "API ($API_URL): HTTP $HTTP_CODE"
        API_RESPONSE=$(curl -s --connect-timeout "$TIMEOUT" "$API_URL" 2>/dev/null)
        if echo "$API_RESPONSE" | grep -q '"status"'; then
            ok "API health cavabı: OK"
        else
            warn "API cavabı gözlənilən formatda deyil"
        fi
    elif [ "$HTTP_CODE" = "000" ]; then
        warn "API əlçatmaz ($API_URL) — container işləmiyə bilər"
    else
        fail "API HTTP $HTTP_CODE ($API_URL)"
    fi
else
    warn "curl yüklü deyil — API yoxlanmadı"
fi
echo ""

# ─── 7. Disk Space ──────────────────────────────────
info "Disk Yeri"
# Main disk
DISK_USAGE=$(df / 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')
if [ -n "$DISK_USAGE" ]; then
    if   [ "$DISK_USAGE" -lt 80 ]; then ok   "Ana disk: ${DISK_USAGE}% istifadə"
    elif [ "$DISK_USAGE" -lt 90 ]; then warn "Ana disk: ${DISK_USAGE}% — təmizlik tövsiyə olunur"
    else fail "Ana disk: ${DISK_USAGE}% — KRİTİK, dərhal təmizlənməlidir"
    fi
fi

# Backup directory
for backup_dir in "./database-backups" "./backend/database/backups"; do
    if [ -d "$backup_dir" ]; then
        BACKUP_COUNT=$(ls -1 "$backup_dir"/*.sql "$backup_dir"/*.dump "$backup_dir"/*.gz 2>/dev/null | wc -l)
        BACKUP_SIZE=$(du -sh "$backup_dir" 2>/dev/null | cut -f1)
        ok "Backup qovluğu ($backup_dir): $BACKUP_COUNT fayl, $BACKUP_SIZE"
    fi
done
echo ""

# ─── 8. Laravel Logs ────────────────────────────────
info "Laravel Xəta Logları (son 24 saat)"
LOG_FILE="./backend/storage/logs/laravel.log"
if [ -f "$LOG_FILE" ]; then
    RECENT_ERRORS=$(grep "ERROR\|CRITICAL\|EMERGENCY" "$LOG_FILE" 2>/dev/null | grep "$(date '+%Y-%m-%d')" | wc -l)
    if   [ "$RECENT_ERRORS" -eq 0 ]; then ok   "Bu gün xəta yoxdur"
    elif [ "$RECENT_ERRORS" -lt 10 ]; then warn "Bu gün $RECENT_ERRORS xəta var — yoxlanılmalıdır"
    else fail "Bu gün $RECENT_ERRORS xəta var — KRİTİK"
    fi
else
    warn "Laravel log faylı tapılmadı ($LOG_FILE)"
fi
echo ""

# ─── SUMMARY ────────────────────────────────────────
echo "=================================================="
echo "  XÜLASƏ"
echo "=================================================="
TOTAL=$((FAILED_CHECKS + WARN_CHECKS))
if   [ $FAILED_CHECKS -eq 0 ] && [ $WARN_CHECKS -eq 0 ]; then
    echo -e "${GREEN}  ✓ Bütün yoxlamalar keçdi! Sistem sağlam.${NC}"
    EXIT_CODE=0
elif [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${YELLOW}  ⚠ $WARN_CHECKS xəbərdarlıq. Sistem işləyir, amma diqqət lazımdır.${NC}"
    EXIT_CODE=1
else
    echo -e "${RED}  ✗ $FAILED_CHECKS kritik xəta, $WARN_CHECKS xəbərdarlıq. Dərhal müdaxilə lazımdır!${NC}"
    EXIT_CODE=2
fi
echo ""
exit $EXIT_CODE
