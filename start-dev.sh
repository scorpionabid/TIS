#!/bin/bash

# ATİS - Development Start Script with Auto Data Recovery
# This script is intended for LOCAL DEVELOPMENT ONLY.
# It automatically runs recover_data.sh if the database is empty.

set -e

# Include core logic from start.sh by sourcing or duplicating essential parts
# To keep it independent and safe, we will create a specialized version.

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}🔄 $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Database setup specialized for Dev
setup_database_dev() {
    print_status "Dev Database yoxlanılır..."

    # Check if database has data
    local user_count=0
    local check_output
    check_output=$(docker exec atis_backend php artisan tinker --execute="echo App\\Models\\User::count();" 2>/dev/null | tail -1 | tr -d '\r\n')
    
    if [[ "$check_output" =~ ^[0-9]+$ ]]; then
        user_count=$check_output
    else
        user_count=$(docker exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
    fi

    if [ "$user_count" -gt 1 ]; then
        print_success "🔒 Database-də mövcud data tapıldı ($user_count istifadəçi). Bərpa ötürülür."
        return 0
    fi

    print_warning "⚠️  Database boşdur! Avtomatik bərpa başladılır (recover_data.sh)..."
    
    if [ -f "./recover_data.sh" ]; then
        bash ./recover_data.sh
    else
        print_error "recover_data.sh tapılmadı! Standart migration-lar istifadə olunur..."
        docker exec atis_backend php artisan migrate --force
        docker exec atis_backend php artisan db:seed --class=SuperAdminSeeder --force
    fi
}

# Main execution
main() {
    echo "🚀 ATİS Dev Server başladılır (Avtomatlaşdırılmış bərpa ilə)..."
    echo ""

    # Call the original start.sh but skip its database setup if we want full control
    # Or simply run the original and then our check.
    # The most robust way for Dev is to run the core start logic.
    
    # We will use the existing start.sh for infrastructure but override DB part
    # We skip DB setup in start.sh because we will handle it here with recover_data.sh
    SKIP_DB_SETUP=true bash ./start.sh
    
    # After services are up, we run our dev-specific DB check
    setup_database_dev
    
    echo ""
    print_success "🎉 ATİS Dev Mühit hazırdır!"
}

main "$@"
