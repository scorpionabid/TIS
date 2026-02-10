#!/bin/bash

# ATİS Development Database Snapshot Backup
# Creates a snapshot of current development database for quick restore

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}🔄 $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Ensure common Docker install locations are available in PATH
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

SNAPSHOT_DIR="backend/database/snapshots"
SNAPSHOT_FILE="$SNAPSHOT_DIR/dev_snapshot.sql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TIMESTAMPED_SNAPSHOT="$SNAPSHOT_DIR/dev_snapshot_$TIMESTAMP.sql"

echo ""
print_status "📸 ATİS Dev Database Snapshot Backup"
echo ""

# Create snapshot directory if not exists
mkdir -p "$SNAPSHOT_DIR"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_warning "Docker işləmir! Docker Desktop-u başladın."
    exit 1
fi

# Check if postgres container is running
if ! docker ps | grep -q atis_postgres; then
    print_warning "PostgreSQL container işləmir! Əvvəlcə ./start.sh çalışdırın."
    exit 1
fi

# Get database stats before backup
print_status "Database statistikası..."
user_count=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ' || echo "0")
institution_count=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM institutions;" | tr -d ' ' || echo "0")

echo "Users: $user_count"
echo "Institutions: $institution_count"
echo ""

# Create snapshot
print_status "Snapshot yaradılır..."
docker exec atis_postgres pg_dump -U atis_dev_user -d atis_dev --clean --if-exists > "$SNAPSHOT_FILE"

# Also create timestamped backup (keep last 5)
cp "$SNAPSHOT_FILE" "$TIMESTAMPED_SNAPSHOT"
print_success "Snapshot yaradıldı: $SNAPSHOT_FILE"
print_status "Timestamped backup: $TIMESTAMPED_SNAPSHOT"

# Clean old snapshots (keep last 5)
print_status "Köhnə snapshot-ları təmizlə (son 5-i saxla)..."
cd "$SNAPSHOT_DIR"
ls -t dev_snapshot_*.sql 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
cd - >/dev/null

# Show snapshot info
snapshot_size=$(du -h "$SNAPSHOT_FILE" | cut -f1)
print_success "Snapshot size: $snapshot_size"

# List available snapshots
echo ""
print_status "Mövcud snapshot-lar:"
ls -lh "$SNAPSHOT_DIR"/dev_snapshot*.sql 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'

echo ""
print_success "🎉 Dev snapshot hazırdır!"
echo ""
echo "Restore etmək üçün:"
echo "  ./restore_dev_snapshot.sh"
echo ""
echo "Və ya restart zamanı avtomatik restore:"
echo "  USE_DEV_SNAPSHOT=true ./start.sh"
echo ""
