#!/bin/bash

# ATİS Database Backup Script
# Usage: ./backup-database.sh [custom_name]

echo "💾 ATİS Database Backup Script"
echo "=============================="

# Check if database exists
if [ ! -f "database/database.sqlite" ]; then
    echo "❌ Database file not found: database/database.sqlite"
    exit 1
fi

# Generate backup filename
if [ "$1" != "" ]; then
    BACKUP_NAME="database_backup_$(date +%Y%m%d_%H%M%S)_$1.sqlite"
else
    BACKUP_NAME="database_backup_$(date +%Y%m%d_%H%M%S).sqlite"
fi

BACKUP_PATH="database/$BACKUP_NAME"

# Create backup
echo "🔄 Creating backup..."
echo "📁 Source: database/database.sqlite"
echo "📁 Backup: $BACKUP_PATH"

cp database/database.sqlite "$BACKUP_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully!"
    echo "📊 Backup size: $(du -h "$BACKUP_PATH" | cut -f1)"

    # Show current backups
    echo ""
    echo "📂 All available backups:"
    ls -lh database/database_backup_*.sqlite 2>/dev/null | awk '{print $NF, $5, $6, $7, $8}' | tail -5

    # Cleanup old backups (keep last 10)
    BACKUP_COUNT=$(ls database/database_backup_*.sqlite 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 10 ]; then
        echo ""
        echo "🧹 Cleaning up old backups (keeping last 10)..."
        ls -t database/database_backup_*.sqlite | tail -n +11 | xargs rm -f
        echo "✅ Cleanup completed"
    fi
else
    echo "❌ Backup failed!"
    exit 1
fi