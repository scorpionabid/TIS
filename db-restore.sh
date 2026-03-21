#!/bin/bash
# ATİS - Sürətli DB Restore
# Son auto backup-dan və ya seçilmiş fayldan bərpa edir

set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
print_status()  { echo -e "${BLUE}🔄 $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error()   { echo -e "${RED}❌ $1${NC}"; }

SNAPSHOT_DIR="backend/database/snapshots"

echo ""
echo -e "${BLUE}📥 ATİS DB Restore${NC}"
echo ""

# Docker yoxla
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^atis_postgres$'; then
    print_error "atis_postgres işləmir! Əvvəlcə: ./start.sh"
    exit 1
fi

# Fayl seç
if [ -n "$1" ]; then
    RESTORE_FILE="$1"
else
    # Ən son auto backup-ı tap
    LATEST=$(ls -1t "$SNAPSHOT_DIR"/auto_*.sql 2>/dev/null | head -1)
    MANUAL=$(ls -1t "$SNAPSHOT_DIR"/dev_snapshot.sql 2>/dev/null | head -1)

    if [ -z "$LATEST" ] && [ -z "$MANUAL" ]; then
        print_error "Snapshot tapılmadı: $SNAPSHOT_DIR"
        echo "Backup götürmək üçün: ./backup_dev_snapshot.sh"
        exit 1
    fi

    echo "Mövcud backup-lar:"
    ls -1t "$SNAPSHOT_DIR"/*.sql 2>/dev/null | head -10 | nl -w2 -s'. '
    echo ""

    # Ən yeni olan seçilir (auto > manual)
    RESTORE_FILE="${LATEST:-$MANUAL}"
    print_warning "Seçilən (ən son): $RESTORE_FILE"
    echo ""
    read -p "Davam et? (y/N): " -n 1 -r; echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && { print_warning "Ləğv edildi."; exit 0; }
fi

if [ ! -f "$RESTORE_FILE" ]; then
    print_error "Fayl tapılmadı: $RESTORE_FILE"
    exit 1
fi

SIZE=$(du -h "$RESTORE_FILE" | cut -f1)
print_status "Restore başlayır: $RESTORE_FILE ($SIZE)"

docker exec -i atis_postgres psql \
    -U atis_dev_user -d atis_dev \
    < "$RESTORE_FILE" > /dev/null 2>&1

# Core seeders (superadmin + permissions)
print_status "Core seeders çalışdırılır..."
docker exec atis_backend php artisan db:seed --class=RoleSeeder --force > /dev/null 2>&1
docker exec atis_backend php artisan db:seed --class=PermissionSeeder --force > /dev/null 2>&1
docker exec atis_backend php artisan db:seed --class=SuperAdminSeeder --force > /dev/null 2>&1
docker exec atis_backend php artisan permission:cache-reset > /dev/null 2>&1

echo ""
print_success "=== RESTORE TAMAMLANDI ==="
USERS=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM users;" | tr -d ' \n')
STUDENTS=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM students;" | tr -d ' \n' 2>/dev/null || echo "?")
echo "  Users: $USERS | Students: $STUDENTS"
echo "  Giriş: superadmin / admin123"
echo ""
