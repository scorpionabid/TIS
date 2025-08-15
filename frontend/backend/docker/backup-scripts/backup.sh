#!/bin/bash
# ATİS Database and Files Backup Script

set -e

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Database configuration from environment
DB_HOST=${PGHOST:-db}
DB_PORT=${PGPORT:-5432}
DB_NAME=${PGDATABASE:-atis_db}
DB_USER=${PGUSER:-atis_user}
DB_PASSWORD=${PGPASSWORD}

# Backup file names
DB_BACKUP_FILE="atis_database_${DATE}.sql.gz"
FILES_BACKUP_FILE="atis_files_${DATE}.tar.gz"
FULL_BACKUP_FILE="atis_full_backup_${DATE}.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}/database"
mkdir -p "${BACKUP_DIR}/files"
mkdir -p "${BACKUP_DIR}/full"
mkdir -p "${BACKUP_DIR}/logs"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${BACKUP_DIR}/logs/backup_${DATE}.log"
}

# Function to check if database is accessible
check_database() {
    log "Checking database connectivity..."
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; then
        log "ERROR: Database is not accessible"
        exit 1
    fi
    log "Database connectivity check passed"
}

# Function to backup database
backup_database() {
    log "Starting database backup..."
    
    # Create database dump
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --clean --if-exists --no-owner --no-privileges \
        | gzip > "${BACKUP_DIR}/database/${DB_BACKUP_FILE}"; then
        log "Database backup completed: ${DB_BACKUP_FILE}"
        
        # Verify backup file
        if [ -f "${BACKUP_DIR}/database/${DB_BACKUP_FILE}" ] && [ -s "${BACKUP_DIR}/database/${DB_BACKUP_FILE}" ]; then
            BACKUP_SIZE=$(du -h "${BACKUP_DIR}/database/${DB_BACKUP_FILE}" | cut -f1)
            log "Database backup size: ${BACKUP_SIZE}"
        else
            log "ERROR: Database backup file is empty or missing"
            exit 1
        fi
    else
        log "ERROR: Database backup failed"
        exit 1
    fi
}

# Function to backup application files
backup_files() {
    log "Starting files backup..."
    
    # Backup storage directory and uploaded files
    if tar -czf "${BACKUP_DIR}/files/${FILES_BACKUP_FILE}" \
        -C /var/www \
        storage/app \
        storage/uploads \
        public/storage \
        .env.production 2>/dev/null || true; then
        log "Files backup completed: ${FILES_BACKUP_FILE}"
        
        # Verify backup file
        if [ -f "${BACKUP_DIR}/files/${FILES_BACKUP_FILE}" ]; then
            BACKUP_SIZE=$(du -h "${BACKUP_DIR}/files/${FILES_BACKUP_FILE}" | cut -f1)
            log "Files backup size: ${BACKUP_SIZE}"
        else
            log "ERROR: Files backup file is missing"
            exit 1
        fi
    else
        log "ERROR: Files backup failed"
        exit 1
    fi
}

# Function to create full backup
create_full_backup() {
    log "Creating full backup archive..."
    
    # Combine database and files backup
    if tar -czf "${BACKUP_DIR}/full/${FULL_BACKUP_FILE}" \
        -C "${BACKUP_DIR}" \
        "database/${DB_BACKUP_FILE}" \
        "files/${FILES_BACKUP_FILE}"; then
        log "Full backup completed: ${FULL_BACKUP_FILE}"
        
        BACKUP_SIZE=$(du -h "${BACKUP_DIR}/full/${FULL_BACKUP_FILE}" | cut -f1)
        log "Full backup size: ${BACKUP_SIZE}"
    else
        log "ERROR: Full backup creation failed"
        exit 1
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    
    # Remove old database backups
    find "${BACKUP_DIR}/database" -name "atis_database_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
    
    # Remove old files backups
    find "${BACKUP_DIR}/files" -name "atis_files_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
    
    # Remove old full backups
    find "${BACKUP_DIR}/full" -name "atis_full_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
    
    # Remove old log files
    find "${BACKUP_DIR}/logs" -name "backup_*.log" -mtime +${RETENTION_DAYS} -delete
    
    log "Cleanup completed"
}

# Function to verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."
    
    # Test database backup
    if gzip -t "${BACKUP_DIR}/database/${DB_BACKUP_FILE}"; then
        log "Database backup integrity check passed"
    else
        log "ERROR: Database backup integrity check failed"
        exit 1
    fi
    
    # Test files backup
    if tar -tzf "${BACKUP_DIR}/files/${FILES_BACKUP_FILE}" >/dev/null; then
        log "Files backup integrity check passed"
    else
        log "ERROR: Files backup integrity check failed"
        exit 1
    fi
    
    # Test full backup
    if tar -tzf "${BACKUP_DIR}/full/${FULL_BACKUP_FILE}" >/dev/null; then
        log "Full backup integrity check passed"
    else
        log "ERROR: Full backup integrity check failed"
        exit 1
    fi
}

# Function to generate backup report
generate_report() {
    log "Generating backup report..."
    
    REPORT_FILE="${BACKUP_DIR}/logs/backup_report_${DATE}.txt"
    
    cat > "$REPORT_FILE" << EOF
ATİS Backup Report
==================
Date: $(date)
Backup ID: ${DATE}

Database Backup:
- File: ${DB_BACKUP_FILE}
- Size: $(du -h "${BACKUP_DIR}/database/${DB_BACKUP_FILE}" | cut -f1)
- Location: ${BACKUP_DIR}/database/

Files Backup:
- File: ${FILES_BACKUP_FILE}
- Size: $(du -h "${BACKUP_DIR}/files/${FILES_BACKUP_FILE}" | cut -f1)
- Location: ${BACKUP_DIR}/files/

Full Backup:
- File: ${FULL_BACKUP_FILE}
- Size: $(du -h "${BACKUP_DIR}/full/${FULL_BACKUP_FILE}" | cut -f1)
- Location: ${BACKUP_DIR}/full/

Total Disk Usage:
$(du -sh "${BACKUP_DIR}")

Backup Verification: PASSED
Retention Policy: ${RETENTION_DAYS} days

EOF
    
    log "Backup report generated: ${REPORT_FILE}"
}

# Function to send backup notification (if configured)
send_notification() {
    if [ -n "$BACKUP_NOTIFICATION_EMAIL" ]; then
        log "Sending backup notification email..."
        # This would integrate with your email service
        # For now, just log the notification
        log "Backup notification would be sent to: ${BACKUP_NOTIFICATION_EMAIL}"
    fi
}

# Main execution
main() {
    log "========================================="
    log "Starting ATİS backup process"
    log "Backup ID: ${DATE}"
    log "========================================="
    
    # Pre-backup checks
    check_database
    
    # Perform backups
    backup_database
    backup_files
    create_full_backup
    
    # Post-backup tasks
    verify_backup
    cleanup_old_backups
    generate_report
    send_notification
    
    log "========================================="
    log "Backup process completed successfully"
    log "========================================="
}

# Error handling
trap 'log "ERROR: Backup process failed at line $LINENO"' ERR

# Run main function
main

exit 0