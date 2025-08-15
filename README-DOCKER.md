# 🐳 ATİS Docker Manual Test Guide

ATİS sistemini Docker ilə asanlıqla test etmək üçün hazırlanmış setup.

## 🚀 Tez Başlama

### 1. Sistemi Başlat
```bash
./start-atis.sh
```

### 2. Browser-də Aç
- **Frontend**: http://localhost:3000
- **Full System**: http://localhost (Nginx proxy)

### 3. Login Et
```
👤 Test Hesabları:
• superadmin / admin123 (SuperAdmin)
• admin / admin123 (RegionAdmin)
• testuser / admin123 (Müəllim)
```

## 🧪 Test Edəcəyiniz Səhifələr

### ✅ Əsas Sistem (FAZA 1-11)
- **Dashboard** - `/dashboard` - Əsas panel
- **Users** - `/users` - İstifadəçi idarəetməsi
- **Roles** - `/roles` - Rol idarəetməsi  
- **Institutions** - `/institutions` - Qurum idarəetməsi
- **Surveys** - `/surveys` - Sorğu sistemi
- **Reports** - `/reports` - Hesabat sistemi

### 🆕 Yeni Komponentlər (FAZA 12)
- **Attendance** - `/attendance` - Sinif Davamiyyəti
- **Approvals** - `/approvals` - Təsdiq Paneli
- **Tasks** - `/tasks` - Tapşırıq İdarəetməsi
- **Documents** - `/documents` - Sənəd Kitabxanası
- **Schedules** - `/schedules` - Cədvəl Generatoru
- **Teaching Loads** - `/teaching-loads` - Dərs Yükü İdarəetməsi

## 🔧 Docker Komandaları

### Sistem İdarəetməsi
```bash
# Sistemi başlat
./start-atis.sh

# Logları izlə
docker-compose -f docker-compose.local.yml logs -f

# Xüsusi servis logları
docker-compose -f docker-compose.local.yml logs -f backend
docker-compose -f docker-compose.local.yml logs -f frontend

# Sistemi dayandır
docker-compose -f docker-compose.local.yml down

# Sistemi yenidən başlat
docker-compose -f docker-compose.local.yml restart

# Konteyner statusu
docker-compose -f docker-compose.local.yml ps
```

### Database İdarəetməsi
```bash
# PostgreSQL-ə bağlan
docker exec -it atis_postgres psql -U atis_user -d atis_db

# Migration işlət
docker exec -it atis_backend php artisan migrate

# Seeder işlət
docker exec -it atis_backend php artisan db:seed
```

## 🌐 Port Mapping

| Servis | Container Port | Host Port | URL |
|--------|---------------|-----------|-----|
| Frontend | 3000 | 3000 | http://localhost:3000 |
| Backend | 8000 | 8000 | http://localhost:8000 |
| PostgreSQL | 5432 | 5432 | localhost:5432 |
| Redis | 6379 | 6379 | localhost:6379 |
| Nginx | 80 | 80 | http://localhost |

## 📊 Test Scenarios

### 1. Authentication Test
- Login və logout funksionallığı
- Rol əsaslı icazələr
- Session management

### 2. User Management Test
- İstifadəçi yaratma/redaktə/silmə
- Rol təyin etmə
- Qurum təyin etmə

### 3. Survey System Test
- Sorğu yaratma
- Target seçimi
- Cavab vermə prosesi

### 4. FAZA 12 Component Test
- Yeni API endpoint-lər
- Frontend komponentlər
- Real-time funksionallıq

## ⚠️ Troubleshooting

### Port Konflikti
```bash
# Port istifadəsini yoxla
lsof -i :3000
lsof -i :8000

# Digər Docker konteynerləri dayandır
docker stop $(docker ps -q)
```

### Environment Problems
```bash
# Environment fayllarını yenilə
cp backend/.env.docker backend/.env
cp frontend/.env.docker frontend/.env

# Konteynerləri yenidən qur
docker-compose -f docker-compose.local.yml up --build --force-recreate
```

### Database Issues
```bash
# Volume-ları təmizlə
docker volume prune -f

# PostgreSQL-ı reset et
docker volume rm atis_postgres_data
```

## 📝 Manual Test Checklist

- [ ] Sistem uğurla başladı
- [ ] Frontend yüklənir (localhost:3000)
- [ ] Login işləyir (superadmin/admin123)
- [ ] Dashboard açılır
- [ ] API çağırışları işləyir
- [ ] Yeni FAZA 12 səhifələri açılır
- [ ] Rol əsaslı icazələr işləyir
- [ ] Logout işləyir

## 🎯 Manual Test Focus

1. **Authentication Flow** - Login/logout prosesi
2. **Role-based Access** - Müxtəlif rollarla giriş
3. **FAZA 12 Components** - Yeni komponentlərin funksionallığı
4. **API Integration** - Backend-frontend əlaqəsi
5. **Responsive Design** - Mobil uyğunluq

**🎉 Uğurlu test üçün sistem tam hazırdır!**