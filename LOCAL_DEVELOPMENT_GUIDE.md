# ATIS Local Development Guide

## 🏗️ Current Server Architecture (Production)

### Server Environment
- **OS**: Linux Ubuntu 20.04.6 LTS
- **Domain**: https://atis.sim.edu.az
- **Location**: `/srv/atis/TIS/`
- **Web Server**: Nginx with reverse proxy
- **SSL**: Let's Encrypt certificates

### Services Running on Server
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx:443     │    │  Frontend:3002  │    │  Backend:9000   │
│ (Reverse Proxy) │────│  (Vite Dev)     │    │  (Laravel)      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend Services                             │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│ PostgreSQL:5432 │   Redis:6379    │   Docker        │  N8N      │
│ (Main DB)       │   (Cache)       │ (Containers)    │ (Workflow)│
└─────────────────┴─────────────────┴─────────────────┴───────────┘
```

### Database Structure
- **Main DB**: `atis_production` (PostgreSQL 14)
- **Users**: 1 superadmin user configured
- **Tables**: 100+ tables including users, roles, institutions, etc.

### Current Configuration

#### Nginx Configuration
```nginx
# /etc/nginx/sites-enabled/atis.sim.edu.az
server {
    server_name atis.sim.edu.az;
    
    # Frontend proxy to Vite dev server
    location / {
        proxy_pass http://127.0.0.1:3002;
    }
    
    # Backend API proxy
    location /api {
        proxy_pass http://127.0.0.1:9000;
    }
    
    # Vite dev files (HMR support)
    location ~ ^/(src|node_modules|@vite|@fs)/ {
        proxy_pass http://127.0.0.1:3002;
    }
}
```

#### Environment Variables (Production)
```env
# Frontend (.env)
VITE_API_BASE_URL=https://atis.sim.edu.az/api
VITE_API_URL=https://atis.sim.edu.az/api
VITE_APP_NAME=ATİS
VITE_APP_ENV=development

# Backend (.env)
APP_NAME="ATIS"
APP_ENV=production
APP_URL=https://atis.sim.edu.az
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=atis_production
```

## 🐳 Local Development Setup with Docker

### Prerequisites
- Docker & Docker Compose
- Git
- Node.js 18+ (optional, for local development)

### Step 1: Clone Repository
```bash
git clone https://github.com/scorpionabid/TIS.git
cd TIS
```

### Step 2: Environment Configuration

#### Frontend Environment
```bash
# Create frontend/.env
cat > frontend/.env << EOF
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=ATİS
VITE_APP_ENV=development

# Feature Flags
VITE_USE_NEW_TEACHER_MANAGER=false
VITE_USE_NEW_STUDENT_MANAGER=false  
VITE_USE_NEW_CLASS_MANAGER=false
VITE_ENABLE_BULK_ACTIONS=false
VITE_ENABLE_ADVANCED_FILTERS=false
VITE_ENABLE_GENERIC_MANAGER_V2=false
VITE_ENABLE_DEBUG_PANEL=true
VITE_ENABLE_PERFORMANCE_MONITORING=false
EOF
```

#### Backend Environment
```bash
# Create backend/.env
cat > backend/.env << EOF
APP_NAME="ATIS"
APP_ENV=local
APP_KEY=base64:$(openssl rand -base64 32)
APP_DEBUG=true
APP_URL=http://localhost:8000

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=atis_local
DB_USERNAME=atis_user
DB_PASSWORD=atis_password

BROADCAST_DRIVER=log
CACHE_DRIVER=redis
FILESYSTEM_DISK=local
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=120

REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="\${APP_NAME}"
EOF
```

### Step 3: Docker Setup

#### Option A: Using Existing Docker Compose
```bash
# Use the production-ready docker-compose
docker-compose -f docker-compose.yml up -d
```

#### Option B: Local Development Docker Compose
Create `docker-compose.local.yml`:
```yaml
version: '3.8'

services:
  # Frontend (Vite Development Server)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_BASE_URL=http://localhost:8000/api
    command: npm run dev
    depends_on:
      - backend

  # Backend (Laravel Development Server)  
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/var/www/html
      - /var/www/html/vendor
    environment:
      - APP_ENV=local
      - DB_HOST=postgres
      - REDIS_HOST=redis
    command: php artisan serve --host=0.0.0.0 --port=8000
    depends_on:
      - postgres
      - redis

  # PostgreSQL Database
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: atis_local
      POSTGRES_USER: atis_user
      POSTGRES_PASSWORD: atis_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d

  # Redis Cache
  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

  # Nginx (Optional - for production-like setup)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/local.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
```

### Step 4: Database Setup
```bash
# Run migrations
docker-compose exec backend php artisan migrate

# Seed database (if seeders exist)
docker-compose exec backend php artisan db:seed

# Create superadmin user
docker-compose exec backend php artisan tinker --execute="
\$user = App\Models\User::create([
    'email' => 'admin@atis.local', 
    'username' => 'admin',
    'password' => Hash::make('admin123')
]);
\$user->assignRole('superadmin');
"
```

### Step 5: Development Workflow

#### Daily Development
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Access containers
docker-compose exec backend bash
docker-compose exec frontend sh

# Stop services
docker-compose down
```

#### Making Changes
1. **Frontend changes**: Automatically hot-reloaded via Vite
2. **Backend changes**: May require container restart
3. **Database changes**: Run migrations in container

#### Testing
```bash
# Backend tests
docker-compose exec backend php artisan test

# Frontend tests  
docker-compose exec frontend npm run test

# E2E tests
docker-compose exec frontend npm run test:e2e
```

## 🔧 Development Tools

### Debugging
- **Backend**: Laravel Telescope (http://localhost:8000/telescope)
- **Frontend**: Vue/React DevTools
- **Database**: pgAdmin or DBeaver
- **API**: Postman collection (if available)

### Code Quality
```bash
# Backend
docker-compose exec backend composer run phpstan
docker-compose exec backend composer run php-cs-fixer

# Frontend
docker-compose exec frontend npm run lint
docker-compose exec frontend npm run type-check
```

## 📡 Production Sync

### Pull Latest Changes
```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Database Sync (Optional)
```bash
# Export from production (on server)
pg_dump -h localhost -U atis_user atis_production > atis_backup.sql

# Import to local (in container)
docker-compose exec postgres psql -U atis_user atis_local < atis_backup.sql
```

## 🚀 Deployment

### To Staging
```bash
git push origin staging
# Automatic deployment via GitHub Actions (if configured)
```

### To Production  
```bash
git push origin main
# SSH to server and pull changes
ssh user@atis.sim.edu.az
cd /srv/atis/TIS
git pull origin main
./deploy.sh production
```

## 📞 Troubleshooting

### Common Issues
1. **Port conflicts**: Change ports in docker-compose.yml
2. **Permission issues**: `sudo chown -R $USER:$USER .`
3. **Database connection**: Check PostgreSQL container status
4. **API cors**: Update backend cors configuration

### Useful Commands
```bash
# Reset everything
docker-compose down -v
docker system prune -a
docker-compose up -d --build

# Database reset
docker-compose exec backend php artisan migrate:fresh --seed
```

## 🔐 Security Notes

- Never commit `.env` files to git
- Use different credentials for local development
- Keep production secrets secure
- Regular dependency updates

---

**Last Updated**: August 29, 2025  
**Production Server**: sim-edu-az (5.9.43.157)  
**Maintained By**: ATIS Development Team