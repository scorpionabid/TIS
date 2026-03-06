#!/bin/bash

# ATİS Production Data Restore to Development PostgreSQL
# This script migrates SQLite production backup to PostgreSQL dev database

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

# Configuration
SQLITE_BACKUP="/Users/home/Desktop/ATİS/backend/database/backups/production_backup.sqlite"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5433"
POSTGRES_DB="atis_dev"
POSTGRES_USER="atis_dev_user"
POSTGRES_PASS="atis_dev_pass_123"
DOCKER_POSTGRES_CONTAINER="atis_postgres"

# Ensure PostgreSQL container is running
check_postgres() {
    print_status "PostgreSQL containerini yoxlayır..."
    if ! docker ps | grep -q "$DOCKER_POSTGRES_CONTAINER"; then
        print_error "PostgreSQL container işləmir!"
        print_status "Başlatmaq üçün: docker-compose -f docker-compose.dev.yml up -d"
        exit 1
    fi
    print_success "PostgreSQL container işləyir"
}

# Verify SQLite backup exists
verify_backup() {
    print_status "Backup faylını yoxlayır..."
    if [ ! -f "$SQLITE_BACKUP" ]; then
        print_error "Backup tapılmadı: $SQLITE_BACKUP"
        exit 1
    fi

    local size=$(du -h "$SQLITE_BACKUP" | cut -f1)
    print_success "Backup tapıldı: $size"
}

# Check if pgloader is available on macOS
check_pgloader() {
    print_status "pgloader yoxlanır..."
    if ! command -v pgloader &> /dev/null; then
        print_warning "pgloader tapılmadı, Homebrew ilə quraşdırılır..."
        if ! command -v brew &> /dev/null; then
            print_error "Homebrew tapılmadı! Quraşdırın: https://brew.sh"
            exit 1
        fi
        brew install pgloader
    fi
    print_success "pgloader hazırdır"
}

# Backup current PostgreSQL database (if has data)
backup_current_db() {
    print_status "Mövcud database backup..."

    local count=$(docker exec $DOCKER_POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>/dev/null | tr -d ' ' || echo "0")

    if [ "$count" -gt 5 ]; then
        print_warning "Mövcud database-də $count cədvəl var"
        local backup_file="backend/database/backups/postgres_backup_$(date +%Y%m%d_%H%M%S).sql"

        docker exec $DOCKER_POSTGRES_CONTAINER pg_dump -U $POSTGRES_USER $POSTGRES_DB > "$backup_file"
        print_success "Backup yaradıldı: $backup_file"
    else
        print_status "Mövcud database boşdur, backup lazım deyil"
    fi
}

# Drop and recreate database
recreate_database() {
    print_status "Database-i yenidən yaradır..."

    # Drop connections
    docker exec $DOCKER_POSTGRES_CONTAINER psql -U $POSTGRES_USER -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();" 2>/dev/null || true

    # Drop and create database
    docker exec $DOCKER_POSTGRES_CONTAINER psql -U $POSTGRES_USER -d postgres <<EOF
DROP DATABASE IF EXISTS $POSTGRES_DB;
CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;
EOF

    # Create extensions
    docker exec $DOCKER_POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB <<EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
EOF

    print_success "Database yenidən yaradıldı"
}

# Skip migrations (pgloader will create schema from SQLite)
run_migrations() {
    print_status "Schema yaratmaq pgloader-ə buraxılır..."

    # Update backend .env for later use
    local env_file="backend/.env"
    local env_backup="backend/.env.backup_$(date +%Y%m%d_%H%M%S)"

    cp "$env_file" "$env_backup"

    # Update DB settings
    sed -i.tmp 's/DB_CONNECTION=.*/DB_CONNECTION=pgsql/' "$env_file"
    sed -i.tmp 's/DB_HOST=.*/DB_HOST=postgres/' "$env_file"
    sed -i.tmp 's/DB_PORT=.*/DB_PORT=5432/' "$env_file"
    sed -i.tmp "s/DB_DATABASE=.*/DB_DATABASE=$POSTGRES_DB/" "$env_file"
    sed -i.tmp "s/DB_USERNAME=.*/DB_USERNAME=$POSTGRES_USER/" "$env_file"
    sed -i.tmp "s/DB_PASSWORD=.*/DB_PASSWORD=$POSTGRES_PASS/" "$env_file"
    rm -f "$env_file.tmp"

    print_success "Backend .env konfiqurasiya edildi"
    print_warning "Backend .env backup: $env_backup"
}

# Create pgloader configuration
create_pgloader_config() {
    print_status "pgloader konfiqurasiyası yaradır..."

    cat > /tmp/atis_sqlite_to_postgres.load <<EOF
LOAD DATABASE
    FROM sqlite://$SQLITE_BACKUP
    INTO postgresql://$POSTGRES_USER:$POSTGRES_PASS@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB

WITH include drop, create tables, create indexes,
     reset sequences,
     workers = 4,
     concurrency = 2,
     on error stop

SET work_mem to '512MB',
    maintenance_work_mem to '1GB'

CAST column activity_logs.properties to jsonb drop typemod,
     column audit_logs.old_values to jsonb drop typemod,
     column audit_logs.new_values to jsonb drop typemod,
     column users.settings to jsonb drop typemod,
     column institutions.metadata to jsonb drop typemod,
     column permissions.metadata to jsonb drop typemod,
     column roles.metadata to jsonb drop typemod

BEFORE LOAD DO
\$\$ ALTER TABLE users DISABLE TRIGGER ALL; \$\$,
\$\$ ALTER TABLE institutions DISABLE TRIGGER ALL; \$\$,
\$\$ ALTER TABLE permissions DISABLE TRIGGER ALL; \$\$,
\$\$ ALTER TABLE roles DISABLE TRIGGER ALL; \$\$

AFTER LOAD DO
\$\$ ALTER TABLE users ENABLE TRIGGER ALL; \$\$,
\$\$ ALTER TABLE institutions ENABLE TRIGGER ALL; \$\$,
\$\$ ALTER TABLE permissions ENABLE TRIGGER ALL; \$\$,
\$\$ ALTER TABLE roles ENABLE TRIGGER ALL; \$\$;
EOF

    print_success "pgloader konfiqurasiyası hazırdır"
}

# Run pgloader migration
run_pgloader() {
    print_status "SQLite → PostgreSQL migration başlayır..."
    print_warning "Bu proses 5-15 dəqiqə çəkə bilər (701MB data)..."

    if pgloader /tmp/atis_sqlite_to_postgres.load; then
        print_success "Data migration tamamlandı"
    else
        print_error "Migration failed!"
        print_status "Logları yoxlayın: /tmp/pgloader/"
        exit 1
    fi
}

# Fix sequences
fix_sequences() {
    print_status "PostgreSQL sequences düzəldir..."

    docker exec $DOCKER_POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB <<'EOF'
DO $$
DECLARE
    r RECORD;
    seq_name TEXT;
    max_id BIGINT;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE '%_old'
    LOOP
        seq_name := r.tablename || '_id_seq';

        IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = seq_name) THEN
            EXECUTE format('SELECT COALESCE(MAX(id), 0) + 1 FROM %I', r.tablename) INTO max_id;
            EXECUTE format('ALTER SEQUENCE %I RESTART WITH %s', seq_name, max_id);
            RAISE NOTICE 'Fixed sequence: % → %', seq_name, max_id;
        END IF;
    END LOOP;
END $$;
EOF

    print_success "Sequences düzəldildi"
}

# Validate migration
validate_migration() {
    print_status "Migration validasiya edilir..."

    # Count tables in SQLite
    local sqlite_tables=$(sqlite3 "$SQLITE_BACKUP" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")

    # Count tables in PostgreSQL
    local pg_tables=$(docker exec $DOCKER_POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" | tr -d ' ')

    # Count rows in key tables
    local pg_users=$(docker exec $DOCKER_POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
    local pg_institutions=$(docker exec $DOCKER_POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM institutions;" | tr -d ' ')
    local pg_activity=$(docker exec $DOCKER_POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM activity_logs;" | tr -d ' ')

    echo ""
    print_success "=== MIGRATION SUMMARY ==="
    echo "Tables migrated: $pg_tables (SQLite had: $sqlite_tables)"
    echo "Users: $pg_users"
    echo "Institutions: $pg_institutions"
    echo "Activity Logs: $pg_activity"
    echo ""
}

# Create restore point tag
create_restore_point() {
    local tag_file="backend/database/backups/.production_restored_$(date +%Y%m%d_%H%M%S)"
    cat > "$tag_file" <<EOF
Production data restored to PostgreSQL dev database
Restored at: $(date)
SQLite backup: $SQLITE_BACKUP
PostgreSQL: $POSTGRES_DB@$POSTGRES_HOST:$POSTGRES_PORT
EOF
    print_success "Restore point yaradıldı: $tag_file"
}

# Main execution
main() {
    echo ""
    print_status "🚀 ATİS Production Data → PostgreSQL Dev Migration"
    echo ""

    check_postgres
    verify_backup
    check_pgloader

    print_warning "⚠️  Bu əməliyyat mövcud development database-i SİLƏCƏK!"
    read -p "Davam etmək istəyirsiniz? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        print_error "Migration ləğv edildi"
        exit 0
    fi

    backup_current_db
    recreate_database
    run_migrations
    create_pgloader_config
    run_pgloader
    fix_sequences
    validate_migration
    create_restore_point

    echo ""
    print_success "🎉 Production data uğurla PostgreSQL-ə köçürüldü!"
    echo ""
    print_status "📝 Növbəti addımlar:"
    echo "   1. Backend .env-i yoxlayın (DB_CONNECTION=pgsql)"
    echo "   2. Sistemi başladın: ./start.sh"
    echo "   3. Login: superadmin / admin123"
    echo ""
    print_warning "⚠️  Development database indi PRODUCTION DATA saxlayır!"
    print_warning "   Test etsəniz real data dəyişə bilər."
    echo ""
}

# Run main
main "$@"
