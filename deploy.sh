#!/bin/bash

# ATİS Production Deployment Script
# Usage: ./deploy.sh [production|staging]

set -e  # Exit on any error

# Configuration
PROJECT_ROOT="/var/www/atis"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKUP_DIR="/var/backups/atis"
ENVIRONMENT=${1:-production}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

echo_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

echo_error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

echo_info() {
    echo -e "ℹ $1"
}

# Check if running as correct user
if [[ $EUID -eq 0 ]]; then
   echo_error "Do not run this script as root. Use www-data or appropriate user."
fi

echo_info "Starting ATİS deployment for environment: $ENVIRONMENT"

# 1. Pre-deployment checks
echo_info "Running pre-deployment checks..."

# Check if directories exist
if [[ ! -d "$PROJECT_ROOT" ]]; then
    echo_error "Project directory $PROJECT_ROOT does not exist"
fi

# Check if git is clean (if using git deployment)
if [[ -d "$PROJECT_ROOT/.git" ]]; then
    cd "$PROJECT_ROOT"
    if [[ -n $(git status --porcelain) ]]; then
        echo_warning "Git working directory is not clean. Uncommitted changes detected."
        read -p "Continue anyway? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo_error "Deployment cancelled"
        fi
    fi
fi

# 2. Backup current version
echo_info "Creating backup..."
BACKUP_NAME="atis_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup database
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo_info "Backing up production database..."
    pg_dump -h localhost -U atis_user atis_production | gzip > "$BACKUP_DIR/${BACKUP_NAME}_database.sql.gz"
    echo_success "Database backup created"
fi

# Backup current files
tar -czf "$BACKUP_DIR/${BACKUP_NAME}_files.tar.gz" -C "$PROJECT_ROOT" --exclude=node_modules --exclude=vendor --exclude=storage/logs --exclude=storage/framework/cache .
echo_success "Files backup created: $BACKUP_NAME"

# 3. Update code
echo_info "Updating code..."
cd "$PROJECT_ROOT"

if [[ -d ".git" ]]; then
    git fetch origin
    git checkout main  # or your production branch
    git pull origin main
    echo_success "Code updated from Git"
else
    echo_warning "Not a git repository. Make sure code is manually updated."
fi

# 4. Backend deployment
echo_info "Deploying backend..."
cd "$BACKEND_DIR"

# Install/update composer dependencies
echo_info "Installing Composer dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction
echo_success "Composer dependencies installed"

# Environment setup
if [[ ! -f ".env" ]]; then
    echo_warning ".env file not found. Creating from .env.example"
    cp .env.example .env
    echo_warning "Please configure .env file before continuing"
    read -p "Press Enter to continue after configuring .env..."
fi

# Generate app key if needed
if ! grep -q "APP_KEY=base64:" .env; then
    echo_info "Generating application key..."
    php artisan key:generate --force
    echo_success "Application key generated"
fi

# Database migrations
echo_info "Running database migrations..."
php artisan migrate --force
echo_success "Database migrations completed"

# Run essential seeders only for first deployment
if [[ "$2" == "--seed" ]]; then
    echo_info "Running essential seeders..."
    php artisan db:seed --class=RoleSeeder --force
    php artisan db:seed --class=PermissionSeeder --force
    php artisan db:seed --class=SuperAdminSeeder --force
    php artisan db:seed --class=RegionOperatorPermissionSeeder --force
    php artisan db:seed --class=RegionAdminPermissionBalanceSeeder --force
    php artisan db:seed --class=InstitutionHierarchySeeder --force
    php artisan db:seed --class=InstitutionTypeSeeder --force
    echo_success "Essential seeders completed"
fi

# Clear and optimize caches
echo_info "Optimizing application..."
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
echo_success "Application optimized"

# 5. Frontend deployment
echo_info "Deploying frontend..."
cd "$FRONTEND_DIR"

# Install npm dependencies
echo_info "Installing NPM dependencies..."
npm ci --only=production
echo_success "NPM dependencies installed"

# Build frontend
echo_info "Building frontend..."
npm run build
echo_success "Frontend built successfully"

# 6. Set permissions
echo_info "Setting file permissions..."
cd "$PROJECT_ROOT"

# Set ownership
sudo chown -R www-data:www-data "$PROJECT_ROOT"

# Set permissions
sudo chmod -R 755 "$PROJECT_ROOT"
sudo chmod -R 775 "$BACKEND_DIR/storage"
sudo chmod -R 775 "$BACKEND_DIR/bootstrap/cache"

echo_success "File permissions set"

# 7. Restart services
echo_info "Restarting services..."

# Restart PHP-FPM
sudo systemctl restart php8.2-fpm
echo_success "PHP-FPM restarted"

# Restart Nginx
sudo nginx -t && sudo systemctl reload nginx
echo_success "Nginx reloaded"

# Restart supervisor (for queue workers)
if systemctl is-active --quiet supervisor; then
    sudo supervisorctl reread
    sudo supervisorctl update
    sudo supervisorctl restart atis-worker:*
    echo_success "Queue workers restarted"
fi

# 8. Health checks
echo_info "Running health checks..."

# Check if the application responds
if curl -f -s "https://your-domain.com/api/health" > /dev/null; then
    echo_success "Application is responding"
else
    echo_error "Application health check failed"
fi

# Check database connection
cd "$BACKEND_DIR"
if php artisan tinker --execute="DB::connection()->getPdo(); echo 'DB OK';" 2>/dev/null | grep -q "DB OK"; then
    echo_success "Database connection OK"
else
    echo_error "Database connection failed"
fi

# 9. Cleanup old backups (keep last 10)
echo_info "Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t atis_backup_* 2>/dev/null | tail -n +11 | xargs -r rm -f
echo_success "Old backups cleaned up"

# 10. Deployment summary
echo_success "=== Deployment Completed Successfully ==="
echo_info "Environment: $ENVIRONMENT"
echo_info "Backup created: $BACKUP_NAME"
echo_info "Deployment time: $(date)"
echo_info "Application URL: https://your-domain.com"

# Final reminders
echo_warning "Post-deployment reminders:"
echo_warning "1. Monitor logs for any errors"
echo_warning "2. Test critical application functions"
echo_warning "3. Verify SSL certificate expiration"
echo_warning "4. Check queue workers are processing jobs"

echo_success "Deployment script completed!"