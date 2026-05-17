#!/bin/bash
# ATİS - Universal DB Backup Script
# Bu skript atis_postgres konteynerindən dump götürərək sıxılmış formatda saxlayır.

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
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="dev_snapshot_${TIMESTAMP}.sql.gz"
LATEST_FILENAME="latest_dev_backup.sql.gz"

echo -e "${BLUE}📤 ATİS DB Backup Service${NC}"

# Docker yoxla
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^atis_postgres$'; then
    print_error "atis_postgres işləmir! Əvvəlcə: ./start.sh"
    exit 1
fi

# Qovluğu yoxla
if [ ! -d "$BACKUP_DIR" ]; then
    print_status "Backup qovluğu yaradılır: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# Backup prosesi
print_status "Verilənlər bazasının nüsxəsi çıxarılır ($DB_NAME)..."
docker exec -t atis_postgres pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/$FILENAME"

# Latest linkini yenilə (kopyalayaraq)
cp "$BACKUP_DIR/$FILENAME" "$BACKUP_DIR/$LATEST_FILENAME"

SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
print_success "Backup uğurla tamamlandı: $BACKUP_DIR/$FILENAME ($SIZE)"
print_status "Latest backup yeniləndi: $BACKUP_DIR/$LATEST_FILENAME"

# Statistika (könüllü)
echo -e "\n${YELLOW}Mövcud Snapshot-lar:${NC}"
ls -lh "$BACKUP_DIR" | grep ".sql.gz" | head -5
echo ""
