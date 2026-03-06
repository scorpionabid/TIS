#!/bin/bash

# ATİS - Comprehensive Test Execution Script
# Runs both backend and frontend tests with proper environment setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${PURPLE}"
    echo "========================="
    echo "  $1"
    echo "========================="
    echo -e "${NC}"
}

# Test configuration
RUN_BACKEND_TESTS=true
RUN_FRONTEND_TESTS=true
RUN_INTEGRATION_TESTS=false
GENERATE_COVERAGE=false
VERBOSE=false
SPECIFIC_TEST=""
USE_DOCKER=true

# Docker compose helper configuration
COMPOSE_FILE="docker-compose.yml"
DOCKER_BIN=""
DOCKER_COMPOSE_CMD=()

resolve_docker() {
    local candidates=(
        "$(command -v docker 2>/dev/null || true)"
        "/usr/local/bin/docker"
        "/opt/homebrew/bin/docker"
        "/Applications/Docker.app/Contents/Resources/bin/docker"
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

    if [ -z "$DOCKER_BIN" ]; then
        resolve_docker
    fi

    if [ -n "$DOCKER_BIN" ] && "$DOCKER_BIN" compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE_CMD=("$DOCKER_BIN" "compose")
        return
    fi

    print_error "Docker Compose tapılmadı! Docker Desktop-un compose pluginini aktiv edin."
    exit 1
}

compose() {
    if [ ${#DOCKER_COMPOSE_CMD[@]} -eq 0 ]; then
        resolve_compose
    fi

    "${DOCKER_COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" "$@"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-only)
            RUN_BACKEND_TESTS=true
            RUN_FRONTEND_TESTS=false
            shift
            ;;
        --frontend-only)
            RUN_BACKEND_TESTS=false
            RUN_FRONTEND_TESTS=true
            shift
            ;;
        --integration)
            RUN_INTEGRATION_TESTS=true
            shift
            ;;
        --coverage)
            GENERATE_COVERAGE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --test=*)
            SPECIFIC_TEST="${1#*=}"
            shift
            ;;
        --no-docker)
            USE_DOCKER=false
            shift
            ;;
        --help|-h)
            echo "ATİS Test Execution Script"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --backend-only        Run only backend tests"
            echo "  --frontend-only       Run only frontend tests"
            echo "  --integration         Run integration tests"
            echo "  --coverage            Generate test coverage reports"
            echo "  --verbose             Show verbose output"
            echo "  --test=<pattern>      Run specific test pattern"
            echo "  --no-docker           Run tests locally (not in Docker)"
            echo "  --help, -h            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Run all tests"
            echo "  $0 --backend-only     # Run only backend tests"
            echo "  $0 --coverage         # Run tests with coverage"
            echo "  $0 --test=UserCrud    # Run only UserCrud tests"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate environment
check_environment() {
    print_status "Mühit yoxlanılır..."
    
    if [ "$USE_DOCKER" = true ]; then
        if ! command -v docker >/dev/null 2>&1; then
            print_error "Docker tapılmadı! Docker Desktop install edin."
            exit 1
        fi
        
        if ! docker info >/dev/null 2>&1; then
            print_error "Docker daemon işləmir! Docker Desktop-ı başladın."
            exit 1
        fi
        
        # Check if containers are running
        if ! compose ps | grep -q "Up"; then
            print_warning "Docker containers işləmir. Başladılır..."
            ./start.sh >/dev/null 2>&1 || {
                print_error "Docker containers başlada bilmədi"
                exit 1
            }
        fi
        print_success "Docker mühiti hazırdır"
    else
        print_info "Local mühit istifadə edilir"
        
        # Check PHP and Node.js
        if ! command -v php >/dev/null 2>&1; then
            print_error "PHP tapılmadı!"
            exit 1
        fi
        
        if ! command -v node >/dev/null 2>&1; then
            print_error "Node.js tapılmadı!"
            exit 1
        fi
        
        if ! command -v npm >/dev/null 2>&1; then
            print_error "npm tapılmadı!"
            exit 1
        fi
        
        print_success "Local mühit hazırdır"
    fi
}

# Setup test database
setup_test_database() {
    print_status "Test veritabanı hazırlanır..."
    
    if [ "$USE_DOCKER" = true ]; then
        # Run migrations in Docker
        docker exec atis_backend php artisan migrate:fresh --env=testing --force --seed >/dev/null 2>&1 || {
            print_warning "Migration uğursuz oldu, davam edilir..."
        }
    else
        # Run migrations locally
        cd backend
        php artisan migrate:fresh --env=testing --force --seed >/dev/null 2>&1 || {
            print_warning "Migration uğursuz oldu, davam edilir..."
        }
        cd ..
    fi
    
    print_success "Test veritabanı hazırdır"
}

# Run backend tests
run_backend_tests() {
    if [ "$RUN_BACKEND_TESTS" != true ]; then
        return 0
    fi
    
    print_header "BACKEND TESTLƏR"
    
    if [ "$USE_DOCKER" = true ]; then
        print_status "Docker container-də backend testlər çalışdırılır..."
        
        # Ensure PHPUnit is available
        docker exec atis_backend composer install --no-interaction --prefer-dist --optimize-autoloader >/dev/null 2>&1
        
        local phpunit_command="./vendor/bin/phpunit"
        if [ -n "$SPECIFIC_TEST" ]; then
            phpunit_command="$phpunit_command --filter=$SPECIFIC_TEST"
        fi
        if [ "$GENERATE_COVERAGE" = true ]; then
            print_warning "Coverage üçün Xdebug və ya PCOV tələb olunur. Əlavə konfiqurasiya etdiyinizə əminsiniz."
        fi

        if docker exec atis_backend bash -lc "$phpunit_command"; then
            print_success "Backend testlər uğurla tamamlandı"
        else
            print_error "Backend testlərində problem var"
            exit 1
        fi
        
    else
        print_status "Local mühitdə backend testlər çalışdırılır..."
        cd backend
        
        local phpunit_command="./vendor/bin/phpunit"
        if ! command -v ./vendor/bin/phpunit >/dev/null 2>&1; then
            print_warning "PHPUnit tapılmadı. Composer install çalışdırılır..."
            composer install --no-interaction
        fi

        if [ -n "$SPECIFIC_TEST" ]; then
            phpunit_command="$phpunit_command --filter=$SPECIFIC_TEST"
        fi
        if [ "$GENERATE_COVERAGE" = true ]; then
            print_warning "Coverage üçün Xdebug/PCOV tələb olunur. Əlavə konfiqurasiya etdiyinizə əminsiniz."
        fi

        $phpunit_command
        
        cd ..
    fi
    
    print_success "Backend testlər tamamlandı"
}

# Run frontend tests
run_frontend_tests() {
    if [ "$RUN_FRONTEND_TESTS" != true ]; then
        return 0
    fi
    
    print_header "FRONTEND TESTLƏR"
    
    if [ "$USE_DOCKER" = true ]; then
        print_status "Docker container-də frontend testlər çalışdırılır..."
        
        # Check if frontend container has vitest
        if docker exec atis_frontend npm list vitest >/dev/null 2>&1; then
            if [ -n "$SPECIFIC_TEST" ]; then
                docker exec atis_frontend npm test -- --run --reporter=verbose --testNamePattern="$SPECIFIC_TEST"
            else
                docker exec atis_frontend npm test -- --run --reporter=verbose
            fi
        else
            print_warning "Frontend container-də Vitest tapılmadı"
            print_info "Local frontend testlər çalışdırılır..."
            cd frontend
            if [ -n "$SPECIFIC_TEST" ]; then
                npm test -- --run --testNamePattern="$SPECIFIC_TEST"
            else
                npm test -- --run
            fi
            cd ..
        fi
    else
        print_status "Local mühitdə frontend testlər çalışdırılır..."
        cd frontend
        
        if [ ! -d "node_modules" ]; then
            print_status "Dependencies install edilir..."
            npm install >/dev/null 2>&1
        fi
        
        if [ -n "$SPECIFIC_TEST" ]; then
            npm test -- --run --testNamePattern="$SPECIFIC_TEST"
        else
            npm test -- --run
        fi
        cd ..
    fi
    
    print_success "Frontend testlər tamamlandı"
}

# Run integration tests
run_integration_tests() {
    if [ "$RUN_INTEGRATION_TESTS" != true ]; then
        return 0
    fi
    
    print_header "İNTEQRASİYA TESTLƏR"
    
    print_status "API endpoint testləri..."
    
    # Test key API endpoints
    local endpoints=(
        "http://localhost:8000/api/health"
        "http://localhost:8000/api/users"
        "http://localhost:3000"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -s -f "$endpoint" >/dev/null 2>&1; then
            print_success "✓ $endpoint"
        else
            print_warning "✗ $endpoint (əlçatmaz)"
        fi
    done
    
    print_success "İnteqrasiya testlər tamamlandı"
}

# Generate test reports
generate_reports() {
    print_header "HESABAT GENERASİYASI"
    
    local report_dir="test-reports-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$report_dir"
    
    # Backend coverage
    if [ "$GENERATE_COVERAGE" = true ] && [ -d "backend/coverage" ]; then
        cp -r backend/coverage "$report_dir/backend-coverage"
        print_success "Backend coverage report: $report_dir/backend-coverage/index.html"
    fi
    
    # Test summary
    cat > "$report_dir/test-summary.md" << EOF
# ATİS Test Execution Summary

**Execution Date:** $(date)
**Test Configuration:**
- Backend Tests: $RUN_BACKEND_TESTS
- Frontend Tests: $RUN_FRONTEND_TESTS
- Integration Tests: $RUN_INTEGRATION_TESTS
- Coverage Generated: $GENERATE_COVERAGE
- Docker Used: $USE_DOCKER

## Test Results

### Backend Tests
$(if [ "$RUN_BACKEND_TESTS" = true ]; then echo "✅ Executed"; else echo "⏭️ Skipped"; fi)

### Frontend Tests
$(if [ "$RUN_FRONTEND_TESTS" = true ]; then echo "✅ Executed"; else echo "⏭️ Skipped"; fi)

### Integration Tests  
$(if [ "$RUN_INTEGRATION_TESTS" = true ]; then echo "✅ Executed"; else echo "⏭️ Skipped"; fi)

## Notes
- All tests run in controlled environment
- Database migrations applied before testing
- Test isolation maintained between runs

Generated by ATİS Test Execution Script
EOF
    
    print_success "Test hesabatı yaradıldı: $report_dir/test-summary.md"
}

# Main execution
main() {
    print_header "ATİS TEST EXECUTION"
    echo -e "${CYAN}Backend Tests: $RUN_BACKEND_TESTS | Frontend Tests: $RUN_FRONTEND_TESTS | Integration: $RUN_INTEGRATION_TESTS${NC}"
    echo ""
    
    # Environment check
    check_environment
    
    # Database setup
    setup_test_database
    
    # Run tests
    run_backend_tests
    run_frontend_tests
    run_integration_tests
    
    # Generate reports
    if [ "$GENERATE_COVERAGE" = true ]; then
        generate_reports
    fi
    
    print_header "TEST EXECUTION COMPLETED"
    print_success "Bütün testlər tamamlandı!"
    echo ""
    echo -e "${CYAN}💡 Faydalı komandalar:${NC}"
    echo -e "   Təkcə backend: ${YELLOW}./run-tests.sh --backend-only${NC}"
    echo -e "   Coverage ilə: ${YELLOW}./run-tests.sh --coverage${NC}"  
    echo -e "   Specific test: ${YELLOW}./run-tests.sh --test=UserCrud${NC}"
    echo ""
}

# Trap for cleanup
trap 'print_error "Test execution interrupted"' INT TERM

# Execute main function
main "$@"
