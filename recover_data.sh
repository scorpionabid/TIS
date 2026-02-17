#!/bin/bash

# ATİS Local Data Recovery & Permission Fixer
# Bu skript bazanı bərpa edir və "Required permissions" xətalarını düzəldir.

set -e

# Rənglər
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}🔄 $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

ARCHIVE_FILE="atis_verified_backup_20251203_101858.tar.gz"
EXTRACTED_FILE="TIS/backend/database/database.sqlite"
TEMP_SQLITE="/tmp/backup.sqlite"

echo ""
print_status "🚀 ATİS Verilənlər Bazası Bərpa və İcazə Təmiri"
echo ""

# 1. Arxiv yoxlanışı
if [ ! -f "$ARCHIVE_FILE" ]; then
    print_error "Arxiv tapılmadı: $ARCHIVE_FILE"
    exit 1
fi

# 2. SQLite faylını arxivdən çıxar
print_status "SQLite faylı arxivdən çıxarılır..."
tar -xzf "$ARCHIVE_FILE" "$EXTRACTED_FILE"
print_success "Fayl çıxarıldı."

# 3. Docker yoxlanışı
if ! docker ps | grep -q atis_backend; then
    print_error "Docker konteynerləri işləmir! Zəhmət olmasa ./start.sh çalışdırın."
    exit 1
fi

# 4. PostgreSQL-i təmizlə və Migrations çalışdır
print_status "Baza təmizlənir və strukturlar yaradılır..."
docker exec atis_backend php artisan migrate:fresh --force
print_success "Baza strukturu hazır."

# 5. SQLite faylını konteynerə köçür
print_status "Data transfer edilir..."
docker cp "$EXTRACTED_FILE" atis_backend:/tmp/backup.sqlite
docker exec atis_backend php artisan db:copy-sqlite /tmp/backup.sqlite
print_success "Data kopyalandı."

# 6. EN VACİB ADDIM: PermissionSeeder çalışdır (Xətaları düzəldən hissə)
print_status "Permission-lar yenilənir və rollara bağlanır..."
docker exec atis_backend php artisan db:seed --class=PermissionSeeder
print_success "Permission-lar uğurla yeniləndi."

# 7. Keşi təmizlə
print_status "Sistem keşləri təmizlənir..."
docker exec atis_backend php artisan permission:cache-reset
docker exec atis_backend php artisan cache:clear
print_success "Keş təmizləndi."

# 8. Yoxlama
echo ""
print_status "Yoxlanılır..."
user_count=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
perm_count=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM permissions;" | tr -d ' ')

echo ""
print_success "=== BƏRPA TAMAMLANDI ==?"
echo "İstifadəçi sayı: $user_count"
echo "Permission sayı: $perm_count"
echo ""
print_success "İndi sistemə daxil ola bilərsiniz! 🚀"
echo ""
