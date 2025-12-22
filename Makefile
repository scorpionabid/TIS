# ATİS Development Makefile
# Quick commands for common development tasks

.PHONY: help start stop restart fresh snapshot restore logs clean test

# Default target
help:
	@echo "ATİS Development Commands:"
	@echo ""
	@echo "  make start         - Start ATİS system normally"
	@echo "  make start-snap    - Start with dev snapshot restore"
	@echo "  make stop          - Stop ATİS system"
	@echo "  make restart       - Restart system (preserves data)"
	@echo "  make fresh         - Fresh start with production data + snapshot"
	@echo ""
	@echo "  make snapshot      - Create dev database snapshot"
	@echo "  make restore       - Restore from dev snapshot"
	@echo "  make list-snaps    - List available snapshots"
	@echo ""
	@echo "  make logs          - Show all container logs"
	@echo "  make logs-backend  - Show backend logs"
	@echo "  make logs-frontend - Show frontend logs"
	@echo "  make logs-db       - Show PostgreSQL logs"
	@echo ""
	@echo "  make clean         - Clean caches and temp files"
	@echo "  make clean-all     - Clean everything including volumes (DATA LOSS!)"
	@echo ""
	@echo "  make test          - Run backend tests"
	@echo "  make test-front    - Run frontend tests"
	@echo ""
	@echo "  make db-shell      - Open PostgreSQL shell"
	@echo "  make backend-shell - Open backend container shell"
	@echo ""

# Start system
start:
	@./start.sh

# Start with snapshot restore
start-snap:
	@USE_DEV_SNAPSHOT=true ./start.sh

# Stop system
stop:
	@./stop.sh

# Restart system (preserves data)
restart: stop start

# Fresh start with production data
fresh:
	@echo "🔄 Fresh start: Production data restore + snapshot"
	@./restore_production_laravel.sh
	@./backup_dev_snapshot.sh

# Database snapshot operations
snapshot:
	@./backup_dev_snapshot.sh

restore:
	@./restore_dev_snapshot.sh

list-snaps:
	@echo "📸 Available snapshots:"
	@ls -lh backend/database/snapshots/dev_snapshot*.sql 2>/dev/null || echo "No snapshots found"

# Logs
logs:
	@docker compose logs -f

logs-backend:
	@docker compose logs -f backend

logs-frontend:
	@docker compose logs -f frontend

logs-db:
	@docker compose logs -f postgres

# Cleanup
clean:
	@echo "🧹 Cleaning caches and temp files..."
	@rm -rf frontend/dist frontend/.vite backend/storage/framework/cache/* backend/storage/framework/views/*
	@docker exec atis_backend php artisan cache:clear 2>/dev/null || true
	@docker exec atis_backend php artisan config:clear 2>/dev/null || true
	@echo "✅ Cleanup complete"

clean-all:
	@echo "⚠️  WARNING: This will delete ALL data including database!"
	@read -p "Are you sure? (y/N): " -n 1 -r; echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v; \
		rm -rf frontend/dist frontend/.vite; \
		echo "✅ All data cleaned"; \
	else \
		echo "❌ Cancelled"; \
	fi

# Testing
test:
	@docker exec atis_backend php artisan test

test-front:
	@docker exec atis_frontend npm run test

# Database access
db-shell:
	@docker exec -it atis_postgres psql -U atis_dev_user -d atis_dev

backend-shell:
	@docker exec -it atis_backend bash

# Quick status check
status:
	@echo "📊 ATİS System Status:"
	@docker compose ps
	@echo ""
	@echo "💾 Database Status:"
	@docker exec atis_postgres psql -U atis_dev_user -d atis_dev -c "SELECT 'Users: ' || COUNT(*) FROM users UNION ALL SELECT 'Institutions: ' || COUNT(*) FROM institutions;" 2>/dev/null || echo "Database not accessible"
