# ATİS Development Guide

## Quick Start (Docker - Tövsiyə olunan)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### 1. Clone və Setup
```bash
git clone <repository-url>
cd ATİS
```

### 2. Environment Faylları
```bash
# Backend environment
cp backend/.env.example backend/.env

# Frontend environment (əgər lazımdırsa)
cp frontend/.env.example frontend/.env
```

### 3. Sistemini Başlat
```bash
./start.sh
```

System avtomatik olaraq:
- ✅ Docker konteynerləri qurur və başladır
- ✅ Database migration edir
- ✅ Superadmin user yaradır
- ✅ Bütün servislər health check edir

### 4. Giriş
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Login**: `superadmin` / `admin123`

### 5. Dayandırmaq
```bash
./stop.sh
```

---

## Package Manager

**NPM istifadə olunur** (bun faylları archive edilib)

```bash
# Frontend packages
cd frontend && npm install

# Backend packages
cd backend && composer install
```

---

## Docker Faylları

**Aktiv fayllar:**
- `docker-compose.yml` - Lokal development
- `docker-compose.prod.yml` - Production

**Archive edilmiş fayllar:**
- `_archive/docker-configs/` - Köhnə konfiqurasiyalar

---

## Faydalı Komandalar

### Docker İdarəetmə
```bash
# Konteyner statusu
docker-compose ps

# Logları izlə
docker-compose logs -f

# Backend terminal
docker exec -it atis_backend bash

# Frontend terminal
docker exec -it atis_frontend bash
```

### Development
```bash
# Backend
cd backend
php artisan migrate
php artisan tinker
composer test

# Frontend
cd frontend
npm run lint
npm run typecheck
npm run build
```

### Database
```bash
# Migration
docker exec atis_backend php artisan migrate

# Seeder
docker exec atis_backend php artisan db:seed --class=SuperAdminSeeder

# Tinker
docker exec atis_backend php artisan tinker
```

---

## Troubleshooting

### Port Problemləri
```bash
# Port yoxla
lsof -i :3000
lsof -i :8000

# Portları təmizlə
./stop.sh --force
```

### Docker Problemləri
```bash
# Konteynerləri yenidən qur
docker-compose down
docker-compose up --build

# Cache təmizlə
docker system prune -a
```

### Frontend Cache
```bash
rm -rf frontend/dist frontend/.vite frontend/node_modules/.vite
```

---

## Code Quality

### Linting
```bash
cd frontend && npm run lint
```

### Type Checking
```bash
cd frontend && npm run typecheck
```

### Testing
```bash
# Backend
cd backend && php artisan test

# Frontend
cd frontend && npm test
```

---

## Architecture

- **Backend**: Laravel 11 + PHP 8.2
- **Frontend**: React 18.3.1 + TypeScript + Vite
- **Database**: SQLite (development) / PostgreSQL (production)
- **Cache**: Redis
- **Container**: Docker

---

## Production Deployment

Production deployment üçün `PRODUCTION_DATABASE_STRATEGY.md` faylına bax.

**Qısa tövsiyələr:**
1. Managed database servis istifadə et (AWS RDS, Azure Database)
2. SSL sertifikatı konfiqurasiya et
3. Environment variables təhlükəsiz idarə et
4. Monitoring və backup sistemi qur

---

## Support

**Problemlər üçün:**
1. `docker-compose logs` yoxla
2. `./stop.sh --check` proses statusu yoxla
3. İssue yarat repository-də