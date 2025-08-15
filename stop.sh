#!/bin/bash

# ATİS - Universal Stop Script
# Supports both Docker and Local modes

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

# Check if Docker containers are running
check_docker_running() {
    if command -v docker-compose >/dev/null 2>&1; then
        if docker-compose -f docker-compose.simple.yml ps -q 2>/dev/null | grep -q .; then
            return 0
        fi
    fi
    return 1
}

# Stop Docker containers
stop_docker() {
    print_status "Docker konteynerləri dayandır..."
    
    # Stop and remove containers
    docker-compose -f docker-compose.simple.yml down 2>/dev/null || true
    
    # Clean up orphaned containers
    docker container prune -f 2>/dev/null || true
    
    # Clean up unused networks
    docker network prune -f 2>/dev/null || true
    
    print_success "Docker konteynerləri dayandırıldı"
}

# Stop local processes
stop_local() {
    print_status "Lokal prosesləri dayandır..."
    
    local stopped_any=false
    
    # Stop by PID files if they exist
    if [ -f .backend.pid ]; then
        BACKEND_PID=$(cat .backend.pid)
        if kill "$BACKEND_PID" 2>/dev/null; then
            print_success "Backend dayandırıldı (PID: $BACKEND_PID)"
            stopped_any=true
        else
            print_warning "Backend prosesi tapılmadı (PID: $BACKEND_PID)"
        fi
        rm -f .backend.pid
    fi
    
    if [ -f .frontend.pid ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        if kill "$FRONTEND_PID" 2>/dev/null; then
            print_success "Frontend dayandırıldı (PID: $FRONTEND_PID)"
            stopped_any=true
        else
            print_warning "Frontend prosesi tapılmadı (PID: $FRONTEND_PID)"
        fi
        rm -f .frontend.pid
    fi
    
    # Force kill by port
    print_status "Port əsaslı prosesləri yoxla..."
    local ports_killed=false
    for port in 3000 5173 8000 8001; do
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "$pids" | xargs kill -9 2>/dev/null || true
            print_success "Port $port-da proses dayandırıldı"
            ports_killed=true
            stopped_any=true
        fi
    done
    
    if [ "$ports_killed" = false ]; then
        print_status "Port əsaslı heç bir proses tapılmadı"
    fi
    
    # Force kill by process name
    print_status "Ad əsaslı prosesləri yoxla..."
    local names_killed=false
    
    if pkill -f "php artisan serve" 2>/dev/null; then
        print_success "Laravel server prosesi dayandırıldı"
        names_killed=true
        stopped_any=true
    fi
    
    if pkill -f "npm run dev" 2>/dev/null; then
        print_success "Vite server prosesi dayandırıldı"
        names_killed=true
        stopped_any=true
    fi
    
    if pkill -f "node.*vite" 2>/dev/null; then
        print_success "Vite node prosesi dayandırıldı"
        names_killed=true
        stopped_any=true
    fi
    
    if [ "$names_killed" = false ]; then
        print_status "Ad əsaslı heç bir proses tapılmadı"
    fi
    
    if [ "$stopped_any" = true ]; then
        print_success "Lokal proseslər dayandırıldı"
    else
        print_warning "Dayandırılacaq heç bir proses tapılmadı"
    fi
}

# Clean up log files
cleanup_logs() {
    if [ "$1" = "--clean-logs" ] || [ "$1" = "-c" ]; then
        print_status "Log fayllarını təmizlə..."
        
        # Backup current logs if they exist and are not empty
        local backup_dir="logs_backup_$(date +%Y%m%d_%H%M%S)"
        local backed_up=false
        
        for log in backend.log frontend.log backend_*.log frontend_*.log; do
            if [ -f "$log" ] && [ -s "$log" ]; then
                if [ "$backed_up" = false ]; then
                    mkdir -p "$backup_dir"
                    backed_up=true
                fi
                mv "$log" "$backup_dir/"
                print_status "Log yedəkləndi: $backup_dir/$log"
            elif [ -f "$log" ]; then
                rm -f "$log"
            fi
        done
        
        if [ "$backed_up" = true ]; then
            print_success "Log faylları yedəkləndi: $backup_dir/"
        else
            print_status "Yedəklənəcək log faylı tapılmadı"
        fi
    fi
}

# Check running processes
check_processes() {
    print_status "İşləyən prosesləri yoxla..."
    
    local found_any=false
    
    # Check by ports
    for port in 3000 5173 8000 8001; do
        if lsof -ti:$port >/dev/null 2>&1; then
            local pid=$(lsof -ti:$port 2>/dev/null)
            local cmd=$(ps -p $pid -o comm= 2>/dev/null || echo "bilinməyən")
            print_warning "Port $port-da hələ də proses işləyir: PID $pid ($cmd)"
            found_any=true
        fi
    done
    
    # Check Docker
    if check_docker_running; then
        print_warning "Docker konteynerləri hələ də işləyir"
        found_any=true
    fi
    
    if [ "$found_any" = false ]; then
        print_success "Heç bir ATİS prosesi işləmir"
    fi
}

# Show help
show_help() {
    echo "ATİS Stop Script"
    echo ""
    echo "Usage:"
    echo "  ./stop.sh                  # Stop all processes"
    echo "  ./stop.sh --clean-logs     # Stop and clean log files"
    echo "  ./stop.sh -c               # Stop and clean logs (short)"
    echo "  ./stop.sh --force          # Force stop everything"
    echo "  ./stop.sh -f               # Force stop (short)"
    echo "  ./stop.sh --check          # Only check running processes"
    echo "  ./stop.sh -h               # Show this help"
    echo ""
}

# Force stop everything
force_stop() {
    print_status "Məcburi dayandırma rejimi..."
    
    # Force kill all possible processes
    print_status "Bütün ATİS proseslərini məcburi dayandır..."
    
    # Kill by process patterns
    pkill -9 -f "artisan serve" 2>/dev/null || true
    pkill -9 -f "npm run dev" 2>/dev/null || true
    pkill -9 -f "node.*vite" 2>/dev/null || true
    pkill -9 -f "php.*artisan" 2>/dev/null || true
    
    # Kill by ports aggressively
    for port in 3000 5173 8000 8001; do
        lsof -ti:$port 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    done
    
    # Stop Docker aggressively
    docker-compose -f docker-compose.simple.yml kill 2>/dev/null || true
    docker-compose -f docker-compose.simple.yml down --remove-orphans 2>/dev/null || true
    
    # Clean up PID files
    rm -f .backend.pid .frontend.pid
    
    print_success "Məcburi dayandırma tamamlandı"
}

# Main logic
main() {
    echo "🛑 ATİS Sistemini dayandır..."
    echo ""
    
    case "$1" in
        "--check")
            check_processes
            return
            ;;
        "--force"|"-f")
            force_stop
            cleanup_logs "$1"
            check_processes
            return
            ;;
    esac
    
    # Normal stop procedure
    local docker_was_running=false
    local local_was_running=false
    
    # Check what's running
    if check_docker_running; then
        docker_was_running=true
    fi
    
    if [ -f .backend.pid ] || [ -f .frontend.pid ] || lsof -ti:3000,5173,8000,8001 >/dev/null 2>&1; then
        local_was_running=true
    fi
    
    # Stop based on what's running
    if [ "$docker_was_running" = true ]; then
        stop_docker
    fi
    
    if [ "$local_was_running" = true ]; then
        stop_local
    fi
    
    if [ "$docker_was_running" = false ] && [ "$local_was_running" = false ]; then
        print_warning "Heç bir ATİS prosesi işləmir"
    fi
    
    # Clean logs if requested
    cleanup_logs "$1"
    
    # Final check
    sleep 2
    check_processes
    
    echo ""
    print_success "ATİS sistemi dayandırıldı!"
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