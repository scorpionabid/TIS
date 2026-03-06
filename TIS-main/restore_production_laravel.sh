#!/bin/bash

# ATİS Production Restore using Laravel Artisan
# Most reliable method

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

echo ""
print_status "🚀 ATİS Production Data Restore (Laravel Method)"
echo ""

# 1. Update backend .env
print_status "Backend .env konfiqurasiya..."
cd backend

cp .env .env.backup_$(date +%Y%m%d_%H%M%S)

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

PHP_MEMORY_LIMIT=2048M
EOF

print_success "Backend .env hazır"
cd ..

# 2. Restart Docker backend to reload .env
print_status "Docker backend yenidən başladır..."
docker restart atis_backend
sleep 5
print_success "Backend yeniləndi"

# 3. Drop and recreate database
print_status "Database yenidən yaradır..."
docker exec atis_postgres psql -U atis_dev_user -d postgres <<EOF
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'atis_dev' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS atis_dev;
CREATE DATABASE atis_dev OWNER atis_dev_user;
EOF

docker exec atis_postgres psql -U atis_dev_user -d atis_dev <<EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
EOF

print_success "Database yaradıldı"

# 4. Run migrations
print_status "Migrations çalışdırır..."
docker exec atis_backend php artisan migrate:fresh --force
print_success "Migrations tamamlandı"

# 5. Copy SQLite file to backend container
print_status "SQLite backup container-ə köçürür..."
docker cp "$SQLITE_BACKUP" atis_backend:/tmp/production_backup.sqlite
print_success "Backup köçürüldü"

# 6. Run Laravel artisan copy command
print_status "Laravel ilə data köçürür..."
print_warning "Bu proses 10-20 dəqiqə çəkə bilər..."

docker exec atis_backend php artisan db:copy-sqlite /tmp/production_backup.sqlite

print_success "Data copy tamamlandı!"

# 7. Cleanup
print_status "Cleanup..."
docker exec atis_backend rm -f /tmp/production_backup.sqlite

# 8. Final validation
print_status "Final validation..."
users=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
institutions=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM institutions;" | tr -d ' ')

echo ""
print_success "=== SUCCESS ==="
echo "Users: $users"
echo "Institutions: $institutions"
echo ""

if [ "$users" -gt 100 ]; then
    print_success "🎉 Production data uğurla PostgreSQL-ə köçürüldü!"
    echo ""
    print_status "Test et: ./start.sh"
    print_status "Login: superadmin / admin123"
else
    print_error "⚠️  Migration problemli - data tam köçmədı"
fi

echo ""
