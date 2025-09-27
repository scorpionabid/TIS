#!/bin/bash

# ATİS Database Restore Script
# Usage: ./restore-database.sh [backup_file]

echo "🔄 ATİS Database Restore Script"
echo "================================"

# Show available backups
echo "📂 Available database backups:"
ls -lh database/database_backup_*.sqlite 2>/dev/null | awk '{print $NF, $5, $6, $7, $8}'

echo ""

# If backup file provided as argument
if [ "$1" != "" ]; then
    BACKUP_FILE="$1"
else
    # Show latest backup
    LATEST_BACKUP=$(ls -t database/database_backup_*.sqlite 2>/dev/null | head -1)
    if [ "$LATEST_BACKUP" = "" ]; then
        echo "❌ No backup files found!"
        exit 1
    fi

    echo "📋 Latest backup: $LATEST_BACKUP"
    echo -n "Use this backup? (y/N): "
    read -r confirm

    if [[ $confirm =~ ^[Yy]$ ]]; then
        BACKUP_FILE="$LATEST_BACKUP"
    else
        echo "❌ Restore cancelled"
        exit 1
    fi
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo ""
echo "⚠️  WARNING: This will overwrite the current database!"
echo "📁 Backup file: $BACKUP_FILE"
echo "📁 Current database: database/database.sqlite"
echo -n "Are you sure? (y/N): "
read -r final_confirm

if [[ $final_confirm =~ ^[Yy]$ ]]; then
    # Create backup of current database
    echo "🔒 Creating backup of current database..."
    cp database/database.sqlite database/database_pre_restore_$(date +%Y%m%d_%H%M%S).sqlite

    # Restore from backup
    echo "🔄 Restoring database from backup..."
    cp "$BACKUP_FILE" database/database.sqlite

    echo "✅ Database restored successfully!"
    echo "📊 Database size: $(du -h database/database.sqlite | cut -f1)"
else
    echo "❌ Restore cancelled"
    exit 1
fi