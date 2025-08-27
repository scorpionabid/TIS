#!/bin/bash

# ATİS Database Backup Script
# Add to crontab for automated backups:
# 0 2 * * * /var/www/atis/backup-database.sh >/dev/null 2>&1

# Configuration
BACKUP_DIR="/var/backups/atis"
DB_NAME="atis_production"
DB_USER="atis_user"
DB_HOST="localhost"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/atis_db_$DATE.sql"

# Retention settings (days)
RETENTION_DAYS=30

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

echo_error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if PostgreSQL is running
if ! systemctl is-active --quiet postgresql; then
    echo_error "PostgreSQL service is not running"
fi

# Create backup
echo "Creating database backup..."
if pg_dump -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"; then
    # Compress the backup
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    echo_success "Database backup created: $(basename $BACKUP_FILE)"
    echo_success "Backup size: $(du -h $BACKUP_FILE | cut -f1)"
else
    echo_error "Database backup failed"
fi

# Remove old backups
echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "atis_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo_success "Deleted $DELETED_COUNT old backup(s)"

# Show current backups
echo "Current backups:"
ls -lh "$BACKUP_DIR"/atis_db_*.sql.gz 2>/dev/null | tail -10

echo_success "Backup process completed successfully"