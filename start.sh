#!/bin/bash

# ATİS - Simplified Docker Start Script
set -e

# Ensure common Docker install locations are available in PATH (esp. macOS)
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}🔄 $1${NC}"; }

# Check Docker availability end-to-end
check_docker() {
    resolve_docker
    if [ -z "$DOCKER_BIN" ]; then
        print_error "Docker executable tapılmadı!"
        echo "Quraşdır: https://docs.docker.com/get-docker/"
        exit 1
    fi

    resolve_compose
    if [ ${#DOCKER_COMPOSE_CMD[@]} -eq 0 ]; then
        print_error "docker-compose və ya docker compose tapılmadı!"
        echo "Docker Desktop-un compose pluginini aktiv edin və ya docker-compose quraşdırın."
        exit 1
    fi

    if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
        print_warning "Docker daemon işləmir, başladılır..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open -a Docker 2>/dev/null || true
        elif [[ "$OSTYPE" == "linux-gnu"* ]] && grep -q "Microsoft" /proc/version; then
            # Windows/WSL2
            "/mnt/c/Program Files/Docker/Docker/Docker Desktop.exe" 2>/dev/null &
        fi
        
        # Wait and check again
        local max_attempts=12
        local attempt=1
        while [ $attempt -le $max_attempts ]; do
            if "$DOCKER_BIN" info >/dev/null 2>&1; then
                print_success "Docker başlatıldı."
                return 0
            fi
            echo -n "."
            sleep 5
            ((attempt++))
        done
        
        print_error "Docker başlatmaq olmur! Zəhmət olmasa Docker Desktop-u manual başladın."
        exit 1
    fi
}

resolve_docker() {
    local candidates=(
        "$(command -v docker 2>/dev/null || true)"
        "/usr/local/bin/docker"
        "/opt/homebrew/bin/docker"
        "/Applications/Docker.app/Contents/Resources/bin/docker"
        "/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
    )

    for candidate in "${candidates[@]}"; do
        if [ -n "$candidate" ] && [ -x "$candidate" ]; then
            DOCKER_BIN="$candidate"
            return
        fi
    done

    DOCKER_BIN=""
}

resolve_compose() {
    if command -v docker-compose >/dev/null 2>&1; then
        DOCKER_COMPOSE_CMD=("docker-compose")
        return
    fi

    if [ -n "$DOCKER_BIN" ] && "$DOCKER_BIN" compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE_CMD=("$DOCKER_BIN" "compose")
        return
    fi

    DOCKER_COMPOSE_CMD=()
}

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }


# Clean up conflicting processes
cleanup_ports() {
    print_status "Portları təmizlə..."

    # Kill processes on our ports
    for port in 3000 8000 8001 8002; do
        if command -v lsof >/dev/null 2>&1; then
            local pid=$(lsof -ti:$port 2>/dev/null || echo "")
            if [ ! -z "$pid" ]; then
                print_warning "Port $port məşğuldur, təmizlənir..."
                kill -9 $pid 2>/dev/null || true
            fi
        elif command -v netstat >/dev/null 2>&1 && [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # WSL/Linux approach
            local pid=$(netstat -tulpn 2>/dev/null | grep ":$port" | awk '{print $7}' | cut -d/ -f1 | head -n1)
            if [ ! -z "$pid" ] && [ "$pid" != "-" ]; then
                print_warning "Port $port məşğuldur (PID: $pid), təmizlənir..."
                kill -9 $pid 2>/dev/null || true
            fi
        fi
    done

    # Kill known conflicting processes
    pkill -f "php artisan serve" 2>/dev/null || true
    pkill -f "node.*vite" 2>/dev/null || true
}

# Setup environment
setup_env() {
    print_status "Environment hazırla..."

    # Backend environment
    if [ ! -f backend/.env ]; then
        if [ -f backend/.env.example ]; then
            cp backend/.env.example backend/.env
            print_success "backend/.env yaradıldı"
            # Set a random APP_KEY if it's empty
            if grep -q "APP_KEY=$" backend/.env || ! grep -q "APP_KEY=" backend/.env; then
                print_status "APP_KEY yaradılır..."
                # Use a dummy key for now, we'll run key:generate in container later
                sed -i 's/APP_KEY=.*/APP_KEY=base64:IcNxbQiy6sWLjfrgaSlGkm4S2utYBz+DXj4u/Rt7g0k=/' backend/.env
            fi
        else
            print_error "backend/.env.example tapılmadı!"
            exit 1
        fi
    fi

    # Frontend environment (optional)
    if [ -f frontend/.env.example ] && [ ! -f frontend/.env ]; then
        cp frontend/.env.example frontend/.env
        print_success "frontend/.env yaradıldı"
    fi
}

# Start Docker services
start_services() {
    print_status "Docker servislərini başlat..."

    # Stop existing containers
    "${DOCKER_COMPOSE_CMD[@]}" down 2>/dev/null || true

    # Clean up build cache
    rm -rf frontend/dist frontend/.vite 2>/dev/null || true

    # Check for docker-compose.override.yml
    local compose_files=("-f" "docker-compose.yml")
    if [ -f "docker-compose.override.yml" ]; then
        print_status "Lokal optimizasiyalar aktiv edilir (override file)..."
        compose_files+=("-f" "docker-compose.override.yml")
    fi

    # Start services with proper error handling
    print_status "Konteynerləri qur və başlat..."
    if ! "${DOCKER_COMPOSE_CMD[@]}" "${compose_files[@]}" up --build -d 2>/dev/null; then
        print_warning "Build problemi, mövcud image-lərlə başladır..."
        if ! "${DOCKER_COMPOSE_CMD[@]}" "${compose_files[@]}" up -d; then
            print_error "Docker konteynerləri başlatmaq olmur!"
            print_status "Logları yoxla: docker compose logs"
            exit 1
        fi
    fi

    print_status "Servislər hazır olmasını gözlə..."
    # Faster wait if healthy
    local max_wait=30
    local waited=0
    while [ $waited -lt $max_wait ]; do
        if "$DOCKER_BIN" inspect atis_postgres --format '{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
            print_success "Bazadan cavab gəldi, davam edirik..."
            break
        fi
        sleep 5
        ((waited+=5))
    done
}

# Health checks
check_health() {
    print_status "Sistem sağlamlığını yoxla..."

    # Backend health check
    backend_ready=false
    for i in {1..10}; do
        if curl -s http://127.0.0.1:8000/api/health >/dev/null 2>&1 || curl -s http://127.0.0.1:8000 >/dev/null 2>&1; then
            print_success "Backend hazır: http://localhost:8000"
            backend_ready=true
            break
        fi
        sleep 3
    done

    # Frontend health check
    frontend_ready=false
    for i in {1..10}; do
        if curl -s -I http://127.0.0.1:3000 | grep -q "200 OK"; then
            print_success "Frontend hazır: http://localhost:3000"
            frontend_ready=true
            break
        fi
        sleep 3
    done

    if [ "$backend_ready" = false ] || [ "$frontend_ready" = false ]; then
        print_warning "Bəzi servislər problemli ola bilər"
        print_status "Logları yoxla: docker compose logs"
    fi
}

# Setup frontend dependencies
setup_frontend_deps() {
    print_status "Frontend dependencies yoxla..."

    # Check if laravel-echo is installed
    if ! "$DOCKER_BIN" exec atis_frontend npm list laravel-echo >/dev/null 2>&1; then
        print_status "Frontend dependencies quraşdır..."
        "$DOCKER_BIN" exec atis_frontend npm install laravel-echo pusher-js
        print_success "Frontend dependencies quraşdırıldı"
    fi
}

# Database setup
setup_database() {
    print_status "Database-i hazırlayar..."

    # Check if database has data to avoid accidental resets
    local user_count=0
    local check_output
    check_output=$("$DOCKER_BIN" exec atis_backend php artisan tinker --execute="echo App\\Models\\User::count();" 2>/dev/null | tail -1 | tr -d '\r\n ')
    
    if [[ "$check_output" =~ ^[0-9]+$ ]]; then
        user_count=$check_output
    else
        # If tinker check fails, try a direct psql check as fallback
        check_output=$("$DOCKER_BIN" exec atis_postgres psql -U atis_dev_user -d atis_dev -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \r\n')
        if [[ "$check_output" =~ ^[0-9]+$ ]]; then
            user_count=$check_output
        else
            # If both fail, assume DB is NOT EMPTY to be safe
            print_warning "⚠️  Database yoxlanışı zamanı xəta baş verdi. Sıfırlanmanın qarşısını almaq üçün proses dayandırılır."
            user_count=999
        fi
    fi

    # Read AUTO_RESTORE_ON_START setting from .env file
    local auto_restore=$(grep "^AUTO_RESTORE_ON_START=" backend/.env 2>/dev/null | cut -d '=' -f2 | tr -d '\r\n ')
    
    # If we have data AND auto-restore is not enabled, we SKIP restoration
    if [ "$user_count" -gt 0 ] && [ "$auto_restore" != "true" ]; then
        print_success "🔒 Database-də mövcud data tapıldı ($user_count istifadəçi). Bərpa prosesi ötürülür."
        # Ensure lock file exists if data is there
        touch backend/storage/app/db_imported.lock 2>/dev/null || true
        # Ensure essential seeders (e.g. for superadmin access)
        "$DOCKER_BIN" exec atis_backend php artisan db:seed --class=SuperAdminSeeder --force >/dev/null 2>&1
        return 0
    fi
    
    if [ "$user_count" -gt 0 ] && [ "$auto_restore" = "true" ]; then
        print_warning "🔄 AUTO_RESTORE_ON_START=true aktivdir! Mövcud data ($user_count istifadəçi) sıfırlanıb yenidən bərpa ediləcək..."
    fi

    # If we reach here, either user_count is 0 OR auto_restore is true.
    if [ -f backend/storage/app/db_imported.lock ]; then
        print_warning "⚠️  Lock file tapıldı, amma baza boşdur! Datanı bərpa etməyə çalışıram..."
        rm backend/storage/app/db_imported.lock
    fi

    print_warning "Database boşdur və ya bərpa edilməyib, tənzimlənir..."

    # If DB is empty, check for full dump (atis_full_20260218.dump)
    if [ -f backend/database/snapshots/atis_full_20260218.dump ]; then
        print_status "🔄 Full dump bərpa edilir..."
        AUTO_RESTORE=true ./restore_full_dump.sh
        if [ $? -eq 0 ]; then
            print_success "✅ Full dump vasitəsilə bərpa olundu"
            return 0
        fi
    fi

    # Only run migrations if database is STILL EMPTY
    print_status "Boş bazada miqrasiyalar başladılır..."
    "$DOCKER_BIN" exec atis_backend php artisan migrate --force || {
        print_error "Migration uğursuz!"
        exit 1
    }

    # Run essential seeders for fresh database
    print_status "Əsas məlumatlar (seeders) əlavə edilir..."
    "$DOCKER_BIN" exec atis_backend php artisan db:seed --class=PermissionSeeder --force
    "$DOCKER_BIN" exec atis_backend php artisan db:seed --class=RoleSeeder --force
    "$DOCKER_BIN" exec atis_backend php artisan db:seed --class=SuperAdminSeeder --force
    "$DOCKER_BIN" exec atis_backend php artisan db:seed --class=RegionOperatorPermissionSeeder --force
    "$DOCKER_BIN" exec atis_backend php artisan db:seed --class=RegionAdminPermissionBalanceSeeder --force
    "$DOCKER_BIN" exec atis_backend php artisan db:seed --class=InstitutionTypeSeeder --force
    "$DOCKER_BIN" exec atis_backend php artisan db:seed --class=InstitutionHierarchySeeder --force

    print_success "Database sıfırdan hazırlandı"
}

# Show final information
show_info() {
    echo ""
    print_success "🎉 ATİS Sistemi hazırdır!"
    echo ""
    echo "🌐 URLs:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:8000/api"
    echo ""
    echo "🔑 Login məlumatları:"
    echo "   superadmin / admin123"
    echo "   admin / admin123"
    echo ""
    echo "🛠️ Faydalı komandalar:"
    echo "   Logları izlə: docker compose logs -f"
    echo "   Dayandır: ./stop.sh"
    echo "   Container status: docker compose ps"
    echo "   Backend terminal: docker exec -it atis_backend bash"
    echo ""
}

# Show help
show_help() {
    echo "ATİS Docker Start Script"
    echo ""
    echo "Usage:"
    echo "  ./start.sh         # Start ATİS system"
    echo "  ./start.sh -h      # Show this help"
    echo ""
    echo "Requirements:"
    echo "  - Docker"
    echo "  - Docker Compose"
    echo ""
}

# Main execution
main() {
    echo "🚀 ATİS Sistemini başladır..."
    echo ""

    check_docker
    cleanup_ports
    setup_env
    start_services
    setup_frontend_deps
    if [ "$SKIP_DB_SETUP" != "true" ]; then
        setup_database
    fi
    check_health
    show_info
}

# Handle arguments
case "$1" in
    "-h"|"--help"|"help")
        show_help
        ;;
    *)
        main "$@"
        ;;
esac
