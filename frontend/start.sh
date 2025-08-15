#!/bin/bash

# ATİS - Docker Start Script
# Starts the ATİS system using Docker containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is available
check_docker() {
    if command -v docker >/dev/null 2>&1 && command -v docker-compose >/dev/null 2>&1; then
        if docker info >/dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Fast cleanup function
quick_cleanup() {
    print_status "Sürətli təmizlik..."
    
    # Clear only specific cache directories
    rm -rf frontend/node_modules/.vite frontend/dist frontend/.vite 2>/dev/null || true
    rm -rf backend/storage/framework/cache/data/* 2>/dev/null || true
    rm -rf backend/storage/logs/*.log 2>/dev/null || true
    
# Only remove dangling images and stopped containers
    docker container prune -f --filter "until=2h" 2>/dev/null || true
    docker image prune -f --filter "dangling=true" 2>/dev/null || true
    
    print_success "Keş təmizləndi"
}

# Start Docker containers
start_docker() {
    print_status "Docker rejimində başladır..."
    
    # Stop existing containers
    print_status "Mövcud konteynerləri dayandır..."
    docker-compose -f docker-compose.simple.yml down 2>/dev/null || true
    
    # Clear frontend cache and build artifacts
    print_status "Frontend keşi təmizlə..."
    rm -rf frontend/node_modules/.vite 2>/dev/null || true
    rm -rf frontend/dist 2>/dev/null || true
    rm -rf frontend/.vite 2>/dev/null || true
    
    # Remove only unused Docker resources (lighter cleanup)
    print_status "Docker keşi yüngül təmizlə..."
    docker container prune -f --filter "until=1h" 2>/dev/null || true
    docker image prune -f --filter "dangling=true" 2>/dev/null || true
    
    # Fix database path in backend .env for container
    print_status "Container mühitini hazırla..."
    if [ -f backend/.env ]; then
        # Ensure database path is correct for container
        if grep -q "DB_DATABASE=/Users/" backend/.env || grep -q "DB_DATABASE=$(pwd)" backend/.env; then
            print_status "Database yolunu container üçün düzəlt..."
            sed -i.bak 's|DB_DATABASE=.*|DB_DATABASE=/var/www/html/database/database.sqlite|' backend/.env
        fi
    fi
    
    # Try to use existing images first, then build if needed
    print_status "Konteynerləri sürətli başlat..."
    if ! docker-compose -f docker-compose.simple.yml up -d --no-build 2>/dev/null; then
        print_status "Yeni build tələb olunur, qurulur..."
        DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker-compose -f docker-compose.simple.yml up --build -d --force-recreate
    else
        print_success "Mövcud imagelər istifadə edildi - daha sürətli!"
    fi
    
    # Wait for services to be healthy
    print_status "Servislər hazır olmasını gözlə..."
    sleep 10
    
    # Wait for database to be ready and fix paths if needed
    print_status "Database connection-u yoxla və düzəlt..."
    
    # Always fix database path in container - this is critical
    docker exec atis_backend sed -i 's|DB_DATABASE=.*|DB_DATABASE=/var/www/html/database/database.sqlite|' /var/www/html/.env 2>/dev/null || true
    
    max_attempts=5
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        if docker exec atis_backend php -r "echo 'Testing DB connection...'; try { \$pdo = new PDO('sqlite:/var/www/html/database/database.sqlite'); echo 'OK'; } catch(\Exception \$e) { echo 'ERROR: ' . \$e->getMessage(); exit(1); }" 2>/dev/null; then
            print_success "Database hazırdır"
            break
        else
            print_status "Database yolunu yenidən düzəldir... (cəhd $attempt/$max_attempts)"
            docker exec atis_backend sed -i 's|DB_DATABASE=.*|DB_DATABASE=/var/www/html/database/database.sqlite|' /var/www/html/.env 2>/dev/null || true
            sleep 3
        fi
        attempt=$((attempt + 1))
    done
    
    # Run migrations and seeders if needed
    print_status "Database migration və seeding yoxla..."
    docker exec atis_backend php artisan migrate --force >/dev/null 2>&1 || true
    
    # Check if superadmin user exists, if not run seeder
    if ! docker exec atis_backend php artisan tinker --execute="exit(App\\Models\\User::where('username', 'superadmin')->exists() ? 0 : 1);" >/dev/null 2>&1; then
        print_status "Superadmin seeder çalışdır..."
        docker exec atis_backend php artisan db:seed --class=SuperAdminSeeder >/dev/null 2>&1 || true
    fi
    
    # Check container status
    print_status "Container statusunu yoxla..."
    docker-compose -f docker-compose.simple.yml ps
    
    # Test API endpoints
    print_status "API endpoints-i test et..."
    backend_ready=false
    for i in {1..10}; do
        if curl -s http://127.0.0.1:8000 >/dev/null 2>&1; then
            print_success "Backend hazır: http://localhost:8000"
            backend_ready=true
            break
        fi
        sleep 2
    done
    
    if [ "$backend_ready" = false ]; then
        print_warning "Backend problemi var - container logs yoxla: docker-compose -f docker-compose.simple.yml logs backend"
    fi
    
    frontend_ready=false
    for i in {1..10}; do
        if curl -s http://127.0.0.1:3000 >/dev/null 2>&1; then
            print_success "Frontend hazır: http://localhost:3000"
            frontend_ready=true
            break
        fi
        sleep 2
    done
    
    if [ "$frontend_ready" = false ]; then
        print_warning "Frontend problemi var - container logs yoxla: docker-compose -f docker-compose.simple.yml logs frontend"
    fi
    
    print_success "Docker rejimi hazırdır!"
    echo ""
    echo "🌐 URLs:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:8000/api"
    echo ""
    echo "🔑 Login məlumatları:"
    echo "   superadmin / admin123"
    echo "   admin / admin123"
    echo ""
    echo "🐳 Docker komandaları:"
    echo "   Logları izlə: docker-compose -f docker-compose.simple.yml logs -f"
    echo "   Container status: docker-compose -f docker-compose.simple.yml ps"
    echo "   Backend terminal: docker exec -it atis_backend bash"
    echo "   Frontend terminal: docker exec -it atis_frontend bash"
}

# Main logic
main() {
    echo "🚀 ATİS Sistemini başladır..."
    echo ""
    
    # Check if Docker is available
    if ! check_docker; then
        print_error "Docker mövcud deyil və ya işləmir!"
        print_error "Docker-i qur və işə sal:"
        echo "  - macOS: https://docs.docker.com/desktop/mac/install/"
        echo "  - Linux: https://docs.docker.com/engine/install/"
        echo "  - Windows: https://docs.docker.com/desktop/windows/install/"
        exit 1
    fi
    
    # Quick cleanup before starting
    quick_cleanup
    
    start_docker
    
    echo ""
    echo "🛠️ Faydalı komandalar:"
    echo "   Logları izlə: docker-compose -f docker-compose.simple.yml logs -f"
    echo "   Dayandır: ./stop.sh"
    echo "   Database konsol: docker exec -it atis_backend php artisan tinker"
    echo ""
    echo "💡 Sistem hazırdır! Brauzerinizi açın və test edin."
}

# Show help
show_help() {
    echo "ATİS Docker Start Script - Optimized Edition"
    echo ""
    echo "Usage:"
    echo "  ./start.sh                 # Start with optimized Docker containers"
    echo "  ./start.sh -h              # Show this help"
    echo ""
    echo "Bu script ATİS sistemini Docker containers-də başladır."
    echo "Optimizasiyalar:"
    echo "  ✅ Frontend cache automatic clearing"
    echo "  ✅ Smart Docker layer caching"
    echo "  ✅ Fast restart with existing images"
    echo "  ✅ Lightweight cleanup process"
    echo ""
    echo "URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend: http://localhost:8000"
    echo ""
    echo "Tələblər:"
    echo "  - Docker"
    echo "  - Docker Compose"
    echo ""
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