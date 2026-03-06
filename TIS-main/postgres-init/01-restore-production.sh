#!/bin/bash
set -e

# PostgreSQL initialization script for ATIS Development
# This script automatically restores the production backup on container startup

DB_NAME="atis_dev"
DB_USER="atis_dev_user"
BACKUP_FILE="/docker-entrypoint-initdb.d/atis_production_backup.sql"
FLAG_FILE="/var/lib/postgresql/data/.restore_completed"

echo "========================================="
echo "ATIS PostgreSQL Initialization Script"
echo "========================================="

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "⚠️  Backup file not found at $BACKUP_FILE"
    echo "⚠️  Skipping automatic restore"
    exit 0
fi

# Check if restore was already completed
if [ -f "$FLAG_FILE" ]; then
    echo "✅ Restore already completed previously"
    echo "ℹ️  To force restore again, delete: $FLAG_FILE"
    exit 0
fi

echo "🔄 Production backup found: $BACKUP_FILE"
echo "🔄 Starting automatic restore..."
echo "⏳ This may take several minutes..."

# Wait for PostgreSQL to be ready
until pg_isready -U "$DB_USER" -d postgres; do
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 2
done

# Terminate existing connections
echo "🔌 Terminating existing connections..."
psql -U "$DB_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null || true

# Drop and recreate database
echo "🗄️  Recreating database..."
psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

# Restore the backup
echo "📥 Restoring backup (this may take 5-10 minutes)..."
if psql -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE" 2>&1; then
    echo "✅ Restore completed successfully!"
    
    # Create flag file to prevent future restores
    touch "$FLAG_FILE"
    
    # Show summary
    USER_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
    INST_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM institutions;" | tr -d ' ')
    
    echo ""
    echo "📊 Restore Summary:"
    echo "   - Users: $USER_COUNT"
    echo "   - Institutions: $INST_COUNT"
    echo ""
    echo "🎉 Database is ready for use!"
else
    echo "❌ Restore failed!"
    echo "⚠️  Check the error messages above"
    exit 1
fi

echo "========================================="
