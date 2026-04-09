#!/bin/bash
# ATİS - Universal DB Restore Script
# Həm .sql, həm də .sql.gz fayllarını dəstəkləyir.
# Bərpa öncəsi bazanı təmizləyir (drop/create).

set -e

# Rənglər
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
print_status()  { echo -e "${BLUE}🔄 $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error()   { echo -e "${RED}❌ $1${NC}"; }

BACKUP_DIR="docker/postgres/backups"
DB_NAME="atis_dev"
DB_USER="atis_dev_user"

echo -e "${BLUE}📥 ATİS DB Restore Service${NC}"

# Docker yoxla
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^atis_postgres$'; then
    print_error "atis_postgres işləmir! Əvvəlcə: ./start.sh"
    exit 1
fi

# Fayl seçimi
if [ -n "$1" ]; then
    RESTORE_FILE="$1"
else
    # Ən son backup faylını tap (latest prefix-i olan və ya ən yeni)
    LATEST=$(ls -1t "$BACKUP_DIR"/*.sql* 2>/dev/null | head -1)
    
    if [ -z "$LATEST" ]; then
        print_error "Backup faylı tapılmadı: $BACKUP_DIR"
        exit 1
    fi

    echo "Mövcud backup qovluğu: $BACKUP_DIR"
    ls -1t "$BACKUP_DIR"/*.sql* 2>/dev/null | head -5 | nl -w2 -s'. '
    echo ""
    
    RESTORE_FILE="$LATEST"
    print_warning "Seçilən fayl: $RESTORE_FILE"
    read -p "Bazanı təmizləyib bərpa edək? (y/N): " -n 1 -r; echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && { print_warning "Ləğv edildi."; exit 0; }
fi

if [ ! -f "$RESTORE_FILE" ]; then
    print_error "Fayl tapılmadı: $RESTORE_FILE"
    exit 1
fi

# Bazanı təmizlə (Clean state)
print_status "Baza təmizlənir (Drop and Recreate)..."
docker exec atis_postgres psql -U $DB_USER -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
docker exec atis_postgres dropdb --if-exists -U $DB_USER $DB_NAME
docker exec atis_postgres createdb -U $DB_USER $DB_NAME

# Restore prosesi
SIZE=$(du -h "$RESTORE_FILE" | cut -f1)
print_status "Bərpa başlayır: $RESTORE_FILE ($SIZE)"

if [[ "$RESTORE_FILE" == *.gz ]]; then
    # Ziplənmiş fayl üçün
    gunzip -c "$RESTORE_FILE" | docker exec -i atis_postgres psql -U $DB_USER -d $DB_NAME > /dev/null 2>&1
else
    # Normal SQL üçün
    docker exec -i atis_postgres psql -U $DB_USER -d $DB_NAME < "$RESTORE_FILE" > /dev/null 2>&1
fi

# Cache-ləri təmizlə
print_status "Laravel cache-ləri təmizlənir..."
docker exec atis_backend php artisan cache:clear >/dev/null 2>&1 || true
docker exec atis_backend php artisan permission:cache-reset >/dev/null 2>&1 || true

print_success "=== BƏRPA UĞURLA TAMAMLANDI ==="
USERS=$(docker exec atis_postgres psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" | tr -d ' \n')
echo "  Bərpa olunan istifadəçi sayı: $USERS"
echo ""
