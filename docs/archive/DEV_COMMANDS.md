# ATİS Development - Quick Command Reference

Tez-tez istifadə olunan komandaların sürətli bələdçisi.

---

## 🚀 System Start/Stop

### Windows
```cmd
# Start (double-click və ya)
start-windows.bat

# Stop
stop-windows.bat
```

### macOS/Linux
```bash
# Start
./start.sh

# Stop
./stop.sh
```

---

## 🐳 Docker Commands

### Container Management
```bash
# View running containers
docker ps

# View all containers
docker ps -a

# View logs
docker logs -f atis_backend
docker logs -f atis_frontend
docker logs -f atis_redis

# Restart specific container
docker restart atis_backend

# Stop all
docker-compose down

# Remove everything (reset)
docker-compose down -v
docker system prune -af --volumes
```

### Execute Commands in Containers
```bash
# Backend shell
docker exec -it atis_backend bash

# Frontend shell
docker exec -it atis_frontend sh

# Redis CLI
docker exec -it atis_redis redis-cli

# Run artisan command
docker exec atis_backend php artisan migrate

# Run composer
docker exec atis_backend composer install

# Run npm
docker exec atis_frontend npm install
```

---

## 🎨 Backend (Laravel) Commands

### Local PHP (Linting/Tools)
```bash
cd backend

# Format code
php vendor/bin/pint

# Check without fixing
php vendor/bin/pint --test

# Type checking (if PHPStan installed)
php vendor/bin/phpstan analyse

# List routes
php artisan route:list

# Clear caches
php artisan optimize:clear
```

### Docker (Runtime/Database)
```bash
# Migrations
docker exec atis_backend php artisan migrate
docker exec atis_backend php artisan migrate:fresh
docker exec atis_backend php artisan migrate:fresh --seed

# Seeders
docker exec atis_backend php artisan db:seed
docker exec atis_backend php artisan db:seed --class=SuperAdminSeeder

# Tinker (REPL)
docker exec -it atis_backend php artisan tinker

# Tests
docker exec atis_backend php artisan test
docker exec atis_backend php artisan test --filter=UserTest

# Cache
docker exec atis_backend php artisan cache:clear
docker exec atis_backend php artisan config:clear
docker exec atis_backend php artisan route:clear
docker exec atis_backend php artisan view:clear

# Optimize
docker exec atis_backend php artisan optimize
```

---

## ⚛️ Frontend (React) Commands

### Development
```bash
cd frontend

# Install dependencies
npm install

# Type checking
npm run typecheck

# Linting
npm run lint

# Build
npm run build

# Build (dev mode)
npm run build:dev

# Tests
npm run test
npm run test:coverage
```

### Inside Docker
```bash
# Install packages
docker exec atis_frontend npm install <package>

# Rebuild
docker exec atis_frontend npm run build
```

---

## 🗄️ Database Commands

### Migrations
```bash
# Create migration
docker exec atis_backend php artisan make:migration create_table_name

# Run migrations
docker exec atis_backend php artisan migrate

# Rollback last
docker exec atis_backend php artisan migrate:rollback

# Reset and reseed
docker exec atis_backend php artisan migrate:fresh --seed

# Check migration status
docker exec atis_backend php artisan migrate:status
```

### Seeders
```bash
# Create seeder
docker exec atis_backend php artisan make:seeder TableNameSeeder

# Run all seeders
docker exec atis_backend php artisan db:seed

# Run specific seeder
docker exec atis_backend php artisan db:seed --class=UserSeeder
```

### Database Inspection
```bash
# Tinker console
docker exec -it atis_backend php artisan tinker

# Inside tinker:
>>> App\Models\User::count()
>>> App\Models\User::first()
>>> DB::table('users')->get()
```

---

## 🧪 Testing Commands

### Backend Tests
```bash
# All tests
docker exec atis_backend php artisan test

# Specific file
docker exec atis_backend php artisan test tests/Feature/UserTest.php

# With coverage
docker exec atis_backend php artisan test --coverage

# Stop on failure
docker exec atis_backend php artisan test --stop-on-failure

# Parallel execution
docker exec atis_backend php artisan test --parallel
```

### Frontend Tests
```bash
cd frontend

# Run tests
npm run test

# Watch mode
npm run test -- --watch

# Coverage
npm run test:coverage
```

---

## 📝 Code Generation

### Laravel Generators
```bash
# Controller
docker exec atis_backend php artisan make:controller UserController --resource

# Model
docker exec atis_backend php artisan make:model Post -m -f -s
# -m (migration), -f (factory), -s (seeder)

# Request
docker exec atis_backend php artisan make:request StoreUserRequest

# Service
docker exec atis_backend php artisan make:class Services/UserService

# Middleware
docker exec atis_backend php artisan make:middleware CheckAge

# Policy
docker exec atis_backend php artisan make:policy PostPolicy --model=Post

# Event
docker exec atis_backend php artisan make:event UserRegistered

# Job
docker exec atis_backend php artisan make:job ProcessPodcast

# Notification
docker exec atis_backend php artisan make:notification InvoicePaid
```

---

## 🔍 Debugging Commands

### Laravel
```bash
# View logs
docker exec atis_backend tail -f storage/logs/laravel.log

# Clear error log
docker exec atis_backend truncate -s 0 storage/logs/laravel.log

# View SQL queries (in tinker)
docker exec -it atis_backend php artisan tinker
>>> DB::listen(fn ($query) => dump($query->sql));

# Dump server (dd() in browser)
docker exec atis_backend php artisan serve --host=0.0.0.0
```

### Docker
```bash
# Container stats
docker stats

# Inspect container
docker inspect atis_backend

# View environment
docker exec atis_backend env

# Check disk usage
docker system df
```

---

## 🔧 Maintenance Commands

### Cache Management
```bash
# Clear all caches
docker exec atis_backend php artisan optimize:clear

# Cache config
docker exec atis_backend php artisan config:cache

# Cache routes
docker exec atis_backend php artisan route:cache

# Cache views
docker exec atis_backend php artisan view:cache
```

### Storage
```bash
# Create storage link
docker exec atis_backend php artisan storage:link

# Clear compiled views
docker exec atis_backend php artisan view:clear
```

### Composer
```bash
# Install dependencies
docker exec atis_backend composer install

# Update dependencies
docker exec atis_backend composer update

# Dump autoload
docker exec atis_backend composer dump-autoload

# Show outdated packages
docker exec atis_backend composer outdated

# Validate composer.json
docker exec atis_backend composer validate
```

---

## 🌐 Git Commands

### Daily Workflow
```bash
# Pull latest
git pull origin main

# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "feat: add new feature"

# Push
git push origin main

# View log
git log --oneline -10

# View diff
git diff
```

### Branch Management
```bash
# Create branch
git checkout -b feature/new-feature

# Switch branch
git checkout main

# Delete branch
git branch -d feature/old-feature

# View branches
git branch -a
```

---

## 📦 Package Management

### Composer (Backend)
```bash
# Add package
docker exec atis_backend composer require vendor/package

# Add dev package
docker exec atis_backend composer require --dev vendor/package

# Remove package
docker exec atis_backend composer remove vendor/package

# Update package
docker exec atis_backend composer update vendor/package
```

### NPM (Frontend)
```bash
# Add package
docker exec atis_frontend npm install package-name

# Add dev package
docker exec atis_frontend npm install --save-dev package-name

# Remove package
docker exec atis_frontend npm uninstall package-name

# Update package
docker exec atis_frontend npm update package-name

# Check outdated
docker exec atis_frontend npm outdated
```

---

## ⚡ VS Code Shortcuts

### General
- `Ctrl + Shift + P` - Command Palette
- `Ctrl + P` - Quick File Open
- `Ctrl + Shift + B` - Run Build Task
- `Ctrl + Shift + F` - Global Search

### Editing
- `Ctrl + D` - Select Next Occurrence
- `Alt + Up/Down` - Move Line
- `Ctrl + /` - Toggle Comment
- `Shift + Alt + F` - Format Document

### Terminal
- ``Ctrl + ` `` - Toggle Terminal
- `Ctrl + Shift + `` ` `` - New Terminal

---

## 🎯 Quick Health Checks

### System Status
```bash
# Check Docker
docker ps

# Check backend
curl http://localhost:8000/api/health

# Check frontend
curl http://localhost:3000

# Check Redis
docker exec atis_redis redis-cli ping
```

### URLs
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **API Docs:** http://localhost:8000/api/documentation
- **Health:** http://localhost:8000/api/health

### Test Credentials
```
Email: superadmin
Password: admin123
```

---

## 🚨 Emergency Commands

### Full System Reset
```bash
# Stop everything
docker-compose down -v

# Clean Docker
docker system prune -af --volumes

# Remove node_modules and vendor
rm -rf frontend/node_modules backend/vendor

# Start fresh
start-windows.bat  # or ./start.sh
```

### Database Reset
```bash
# Reset database
docker exec atis_backend php artisan migrate:fresh --seed

# Or manually
rm backend/database/database.sqlite
touch backend/database/database.sqlite
docker exec atis_backend php artisan migrate --seed
```

---

## 📚 Documentation

- [CLAUDE.md](./CLAUDE.md) - Main project documentation
- [MULTI_ENVIRONMENT_SETUP.md](./MULTI_ENVIRONMENT_SETUP.md) - Platform setup
- [PHP_SETUP_WINDOWS.md](./PHP_SETUP_WINDOWS.md) - PHP/Composer setup
- [PLATFORM_QUICK_START.md](./PLATFORM_QUICK_START.md) - Quick start guide

---

**💡 Tip:** Bu komandaları VS Code-da Tasks olaraq çalışdıra bilərsən (`Ctrl + Shift + B`)
