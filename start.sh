#!/bin/bash

# ATİS - Simplified Docker Start Script
set -e

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

# Check Docker availability
check_docker() {
    if ! command -v docker >/dev/null 2>&1 || ! command -v docker-compose >/dev/null 2>&1; then
        print_error "Docker və ya docker-compose mövcud deyil!"
        echo "Quraşdır: https://docs.docker.com/get-docker/"
        exit 1
    fi

    if ! docker info >/dev/null 2>&1; then
        print_warning "Docker daemon işləmir, başladılır..."
        open -a Docker 2>/dev/null || true
        sleep 5
        if ! docker info >/dev/null 2>&1; then
            print_error "Docker başlatmaq olmur!"
            exit 1
        fi
    fi
}

# Clean up conflicting processes
cleanup_ports() {
    print_status "Portları təmizlə..."

    # Kill processes on our ports
    for port in 3000 8000 8001 8002; do
        local pid=$(lsof -ti:$port 2>/dev/null || echo "")
        if [ ! -z "$pid" ]; then
            print_warning "Port $port məşğuldur, təmizlənir..."
            kill -9 $pid 2>/dev/null || true
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
        else
            print_error "backend/.env.example tapılmadı!"
            exit 1
        fi
    fi

    # Fix database path for container
    if [ -f backend/.env ]; then
        sed -i.bak 's|DB_DATABASE=.*|DB_DATABASE=/var/www/html/database/database.sqlite|' backend/.env
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
    docker-compose down 2>/dev/null || true

    # Clean up build cache
    rm -rf frontend/dist frontend/.vite 2>/dev/null || true

    # Start services
    print_status "Konteynerləri qur və başlat..."
    docker-compose up --build -d

    print_status "Servislər hazır olmasını gözlə..."
    sleep 15
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
        print_status "Logları yoxla: docker-compose logs"
    fi
}

# Database setup
setup_database() {
    print_status "Database-i hazırla..."

    # Run migrations
    docker exec atis_backend php artisan migrate --force >/dev/null 2>&1 || true

    # Check if superadmin exists, if not run seeder
    if ! docker exec atis_backend php artisan tinker --execute="exit(App\\Models\\User::where('username', 'superadmin')->exists() ? 0 : 1);" >/dev/null 2>&1; then
        print_status "Superadmin seeder çalışdır..."
        docker exec atis_backend php artisan db:seed --class=SuperAdminSeeder >/dev/null 2>&1 || true
    fi

    print_success "Database hazır"
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
    echo "   Logları izlə: docker-compose logs -f"
    echo "   Dayandır: ./stop.sh"
    echo "   Container status: docker-compose ps"
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
    setup_database
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