#!/bin/bash

# ATİS Simple Production Restore - Alternative Method
# Uses Laravel artisan db:seed with production data

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

SQLITE_BACKUP="/Users/home/Desktop/ATİS/backend/database/backups/production_backup.sqlite"
DOCKER_POSTGRES_CONTAINER="atis_postgres"
POSTGRES_DB="atis_dev"
POSTGRES_USER="atis_dev_user"

echo ""
print_status "🚀 ATİS Production Data Restore (Simple Method)"
echo ""

# 1. Update backend .env to PostgreSQL
print_status "Backend .env konfiqurasiya..."
cd backend

# Backup current .env
cp .env .env.backup_$(date +%Y%m%d_%H%M%S)

# Update to PostgreSQL
cat > .env <<'EOF'
APP_NAME="ATİS - Development"
APP_ENV=local
APP_KEY=base64:IcNxbQiy6sWLjfrgaSlGkm4S2utYBz+DXj4u/Rt7g0k=
APP_DEBUG=true
APP_URL=http://localhost:8000

LOG_CHANNEL=stack
LOG_LEVEL=debug

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=atis_dev
DB_USERNAME=atis_dev_user
DB_PASSWORD=atis_dev_pass_123

BROADCAST_DRIVER=log
CACHE_DRIVER=redis
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=log

SANCTUM_STATEFUL_DOMAINS=localhost:3000

TELESCOPE_ENABLED=false
QUEUE_CONNECTION=sync

PHP_MEMORY_LIMIT=1024M
EOF

print_success "Backend .env PostgreSQL-ə keçdi"
cd ..

# 2. Drop and recreate database
print_status "Database recreation..."
docker exec $DOCKER_POSTGRES_CONTAINER psql -U $POSTGRES_USER -d postgres <<EOF
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS $POSTGRES_DB;
CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;
EOF

docker exec $DOCKER_POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB <<EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
EOF

print_success "Database yaradıldı"

# 3. Run fresh migrations
print_status "Laravel migrations..."
docker exec atis_backend php artisan migrate:fresh --force

print_success "Migrations tamamlandı"

# 4. Export SQLite data and import
print_status "Production data import başlayır..."
print_warning "Bu proses 10-15 dəqiqə çəkə bilər..."

# Create temp SQL dump
print_status "SQLite dump yaradır..."
sqlite3 "$SQLITE_BACKUP" .dump > /tmp/atis_sqlite_dump.sql

# Count rows before
total_tables=$(sqlite3 "$SQLITE_BACKUP" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
users_count=$(sqlite3 "$SQLITE_BACKUP" "SELECT COUNT(*) FROM users;")
institutions_count=$(sqlite3 "$SQLITE_BACKUP" "SELECT COUNT(*) FROM institutions;")

print_success "SQLite dump hazır: $total_tables tables, $users_count users, $institutions_count institutions"

# Import to PostgreSQL (skip schema creation, only data)
print_status "PostgreSQL-ə data import..."

# Extract only INSERT statements and convert to PostgreSQL format
grep "^INSERT INTO" /tmp/atis_sqlite_dump.sql | \
  sed "s/INSERT INTO \([^ ]*\)/INSERT INTO \"\1\"/g" | \
  docker exec -i $DOCKER_POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB 2>&1 | \
  grep -v "ERROR.*duplicate key" | \
  grep -v "ERROR.*violates not-null" || true

print_success "Data import tamamlandı"

# 5. Fix sequences
print_status "Sequences düzəldir..."
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
    LOOP
        seq_name := r.tablename || '_id_seq';

        IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = seq_name) THEN
            EXECUTE format('SELECT COALESCE(MAX(id), 0) + 1 FROM %I', r.tablename) INTO max_id;
            EXECUTE format('ALTER SEQUENCE %I RESTART WITH %s', seq_name, max_id);
            RAISE NOTICE 'Fixed: % → %', seq_name, max_id;
        END IF;
    END LOOP;
END $$;
EOF

print_success "Sequences düzəldildi"

# 6. Validate
print_status "Validasiya..."
pg_users=$(docker exec $DOCKER_POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
pg_institutions=$(docker exec $DOCKER_POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM institutions;" | tr -d ' ')

echo ""
print_success "=== MIGRATION SUMMARY ==="
echo "SQLite: $users_count users, $institutions_count institutions"
echo "PostgreSQL: $pg_users users, $pg_institutions institutions"

if [ "$pg_users" -gt 0 ]; then
    print_success "✅ Migration uğurlu!"
else
    print_error "⚠️  Migration problemli - users cədvəli boşdur"
fi

# Cleanup
rm -f /tmp/atis_sqlite_dump.sql

echo ""
print_success "🎉 Production data PostgreSQL-də!"
echo ""
print_status "Test et: ./start.sh"
print_status "Login: superadmin / admin123"
echo ""
