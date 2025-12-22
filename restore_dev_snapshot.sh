#!/bin/bash

# ATİS Development Database Snapshot Restore
# Quickly restore development database from snapshot

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}🔄 $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Ensure common Docker install locations are available in PATH
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

SNAPSHOT_DIR="backend/database/snapshots"
SNAPSHOT_FILE="$SNAPSHOT_DIR/dev_snapshot.sql"

echo ""
print_status "📥 ATİS Dev Database Snapshot Restore"
echo ""

# Check if snapshot exists
if [ ! -f "$SNAPSHOT_FILE" ]; then
    print_error "Snapshot tapılmadı: $SNAPSHOT_FILE"
    echo ""
    echo "Əvvəlcə snapshot yaradın:"
    echo "  ./backup_dev_snapshot.sh"
    echo ""
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker işləmir! Docker Desktop-u başladın."
    exit 1
fi

# Check if postgres container is running
if ! docker ps | grep -q atis_postgres; then
    print_error "PostgreSQL container işləmir! Əvvəlcə ./start.sh çalışdırın."
    exit 1
fi

# Show snapshot info
snapshot_size=$(du -h "$SNAPSHOT_FILE" | cut -f1)
snapshot_date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$SNAPSHOT_FILE" 2>/dev/null || stat -c "%y" "$SNAPSHOT_FILE" 2>/dev/null | cut -d'.' -f1)

print_status "Snapshot məlumatı:"
echo "  File: $SNAPSHOT_FILE"
echo "  Size: $snapshot_size"
echo "  Date: $snapshot_date"
echo ""

# Confirm restore (if not in auto mode)
if [ "$AUTO_RESTORE" != "true" ]; then
    read -p "Snapshot-dan restore etmək istədiyinizə əminsiniz? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Restore ləğv edildi"
        exit 0
    fi
fi

# Drop existing connections
print_status "Aktiv bağlantıları bağla..."
docker exec atis_postgres psql -U atis_dev_user -d postgres -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'atis_dev' AND pid <> pg_backend_pid();
" >/dev/null 2>&1 || true

# Restore from snapshot
print_status "Snapshot-dan restore edilir..."
docker exec -i atis_postgres psql -U atis_dev_user -d atis_dev < "$SNAPSHOT_FILE" 2>&1 | grep -v "^ERROR.*does not exist" || true

# Verify restore
print_status "Restore yoxlanılır..."
user_count=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ' || echo "0")
institution_count=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM institutions;" | tr -d ' ' || echo "0")

echo ""
print_success "=== RESTORE SUCCESS ==="
echo "Users: $user_count"
echo "Institutions: $institution_count"
echo ""

if [ "$user_count" -eq 0 ]; then
    print_warning "⚠️  Restore olundu, amma user tapılmadı. Snapshot köhnə ola bilər."
else
    print_success "🎉 Dev snapshot uğurla restore edildi!"
fi

echo ""
