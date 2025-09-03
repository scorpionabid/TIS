# 🚫 Local Development Deaktiv Edilib

Bu proje **YALNIZ Docker konteynerində** işləyir.

## ✅ Düzgün istifadə:

```bash
# Sistemi başlat
./start.sh

# Sistemi dayandır  
./stop.sh

# Backend komandaları (Docker içində)
docker exec atis_backend php artisan migrate
docker exec atis_backend php artisan tinker
docker exec atis_backend composer install

# Frontend komandaları (Docker içində)  
docker exec atis_frontend npm install
docker exec atis_frontend npm run build
```

## ❌ İstifadə etməyin:

- `php artisan serve`
- `npm run dev` (local)
- Local PostgreSQL
- Local Redis

## 🌐 URLs:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api

## 🔑 Login:

- h.alqish@atis.az / admin123
- superadmin@atis.az / admin123