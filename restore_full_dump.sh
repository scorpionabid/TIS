#!/bin/bash

# ATİS Full Database Restore from Custom Dump
# Restore atis_dev database from .dump file

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

DUMP_DIR="."
DUMP_FILE="$DUMP_DIR/atis_production_20260303_094835.sql"

echo ""
print_status "📥 ATİS Full Database Restore"
echo ""

# Check if dump file exists
if [ ! -f "$DUMP_FILE" ]; then
    print_error "Dump faylı tapılmadı: $DUMP_FILE"
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

# Confirm restore (if not in auto mode)
if [ "$AUTO_RESTORE" != "true" ]; then
    read -p "Bütün bazanı təmizləyib dump-dan restore etmək istədiyinizə əminsiniz? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Restore ləğv edildi"
        exit 0
    fi
fi

# Drop existing connections and database
print_status "Bazanı yenidən yaradır..."
docker exec atis_postgres psql -U atis_dev_user -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'atis_dev' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
docker exec atis_postgres dropdb --if-exists -U atis_dev_user atis_dev
docker exec atis_postgres createdb -U atis_dev_user atis_dev

# Restore from dump
if [[ "$DUMP_FILE" == *.sql ]]; then
    print_status "Dump bərpa edilir (psql vasitəsilə .sql faylı)..."
    # psql is used for plain text SQL dumps. We hide standard output and errors (like owner issues) to avoid flooding the terminal.
    docker exec -i atis_postgres psql -U atis_dev_user -d atis_dev -q < "$DUMP_FILE" >/dev/null 2>&1 || print_warning "Bəzi xətalar bərpa zamanı yox sayıldı (owner dəyişikliyi və s.)"
else
    print_status "Dump bərpa edilir (pg_restore vasitəsilə .dump faylı)..."
    # pg_restore is used for custom format dumps (-Fc)
    docker exec -i atis_postgres pg_restore -U atis_dev_user -d atis_dev --no-owner --no-privileges < "$DUMP_FILE" >/dev/null 2>&1 || print_warning "Bəzi xətalar bərpa zamanı yox sayıldı (hər hansı uyğunsuzluqlar)"
fi

# Final validation
print_status "Bərpa yoxlanılır..."
user_count=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ' || echo "0")
institution_count=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM institutions;" | tr -d ' ' || echo "0")

echo ""
print_success "=== SUCCESS ==="
echo "Users: $user_count"
echo "Institutions: $institution_count"
echo ""

if [ "$user_count" -gt 0 ]; then
    print_success "🎉 Full dump uğurla restore edildi!"
    # Create marker file to avoid accidental re-restore in start.sh
    touch "backend/storage/app/db_imported.lock" 2>/dev/null || touch "storage/app/db_imported.lock" 2>/dev/null || true
else
    print_error "⚠️  Bərpa olundu, amma data tapılmadı!"
fi

echo ""
