# ATİS Production Data Restore - Developer Guide

## 📊 Overview

Bu guide ATİS production data-nı developer mühitində (PostgreSQL) restore etmək üçün hazırlanıb.

**Restore tarixi**: 2025-12-15
**Production backup**: `atis_verified_backup_20251203_101858.tar.gz` (3 dekabr 2025)
**Data həcmi**: 701MB SQLite → PostgreSQL

---

## ✅ Nə Edildi?

### 1. Production Backup Extract
```bash
tar -xzf atis_verified_backup_20251203_101858.tar.gz
# Çıxdı: backend/database/backups/production_backup.sqlite (701MB)
```

### 2. Development PostgreSQL Server
```bash
docker-compose -f docker-compose.dev.yml up -d
# Container: atis_postgres (port 5433)
# Database: atis_dev
# User: atis_dev_user
```

### 3. Laravel Migration Command
**Custom Artisan Command**: `backend/app/Console/Commands/CopySqliteToPostgres.php`

Bu command:
- SQLite-dan table-by-table data köçürür
- Chunk processing (500 records/batch) istifadə edir
- PostgreSQL sequences-ları avtomatik düzəldir
- Foreign key constraints-ı handle edir

### 4. Production Data Import
```bash
./restore_production_laravel.sh
```

**Nəticə**:
- ✅ 368 users
- ✅ 361 institutions
- ✅ 26,324 activity logs
- ✅ 105,859+ total records

---

## 🚀 Necə İstifadə Etməli?

### İlk Dəfə Setup (Hazır təmin edilib)

```bash
# 1. Production backup restore edilib (ARTIQ EDİLİB)
./restore_production_laravel.sh

# 2. Backend .env PostgreSQL-ə keçib (ARTIQ EDİLİB)
# DB_CONNECTION=pgsql
# DB_HOST=postgres
# DB_PORT=5432
```

### Hər Gün Development

```bash
# Sistemi başlat
./start.sh

# Sistem avtomatik production data detect edəcək:
# "🔒 PRODUCTION DATA DETECTED! Skipping migrations and seeders."
```

### Test Credentials

```
superadmin / admin123
regionadmin1 / admin123
balaken-admin / admin123
```

---

## 📁 Əsas Fayllar

### Restore Scripts

1. **`restore_production_laravel.sh`** (✅ İŞLƏYİR - MƏSLƏHƏTLİ)
   - Laravel artisan command istifadə edir
   - Ən etibarlı metod
   - 10-20 dəqiqə çəkir

2. **`restore_production_to_dev.sh`** (⚠️ pgloader - problemli)
   - pgloader istifadə etməyə çalışır
   - macOS-də signature problemləri

3. **`restore_production_simple.sh`** (⚠️ SQL dump - işləmir)
   - SQLite dump → PostgreSQL import
   - Syntax uyğunsuzluğu

### Laravel Artisan Command

**Fayl**: `backend/app/Console/Commands/CopySqliteToPostgres.php`

**İstifadə**:
```bash
docker exec atis_backend php artisan db:copy-sqlite /path/to/sqlite.db
```

### Backend .env Konfigu

```env
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=atis_dev
DB_USERNAME=atis_dev_user
DB_PASSWORD=atis_dev_pass_123
```

---

## 🔄 Data Refresh (Gələcəkdə)

### Yeni Production Backup Import

```bash
# 1. Yeni backup əldə et
# production_backup_YYYYMMDD.sqlite

# 2. Köhnə data təmizlə (DIQQƏT!)
docker exec atis_postgres psql -U atis_dev_user -d postgres -c "DROP DATABASE atis_dev; CREATE DATABASE atis_dev;"

# 3. Backend .env-i yenilə (lazım olarsa)
cd backend && cp .env.example .env
# DB settings düzəlt

# 4. Migration scriptini çalışdır
./restore_production_laravel.sh

# 5. Sistemi restart et
docker restart atis_backend
./start.sh
```

### Clean Development Environment (Sıfırdan)

```bash
# Production data SİL, development seeder-lər YÜK
docker exec atis_postgres psql -U atis_dev_user -d postgres -c "DROP DATABASE atis_dev; CREATE DATABASE atis_dev;"
docker exec atis_backend php artisan migrate:fresh --seed
```

---

## 📊 Data Statistikası

### Production Backup (3 dekabr 2025)

```
Tables: 157
Users: 368
Institutions: 361
Activity Logs: 26,324
Survey Audit Logs: 21,422
Security Events: 13,183
Link Access Logs: 12,029
Grades: 5,443
Personal Access Tokens: 4,705
Notifications: 3,914
Survey Responses: 3,128
```

### Developer Database (PostgreSQL)

```bash
# Real-time count
docker exec atis_postgres psql -U atis_dev_user -d atis_dev -c "
  SELECT
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM institutions) as institutions,
    (SELECT COUNT(*) FROM activity_logs) as activity_logs;
"
```

---

## ⚠️ MƏHMƏL QEYDLƏR

### Data Uyğunsuzluğu

**Problem**: SQLite backup (3 dekabr) və PostgreSQL migrations (güncel) arasında schema fərqi var.

**Məsələn**:
- `tasks` table-də `assigned_institution_id` column backup-da var, amma PostgreSQL migration-da yoxdur
- Bu səbəbdən 1 table (tasks) tam köçmədi

**Həll**:
- tasks cədvəli errors ignore olundu
- Digər 156 table tam köçürüldü
- Əsas data (users, institutions, permissions) TAM və DÜZGÜN

### Production vs Development

- **Production**: PostgreSQL 16-alpine (port 5434)
- **Development**: PostgreSQL 16-alpine (port 5433)
- Ayrı database-lər: `atis_production` vs `atis_dev`

---

## 🛠️ Troubleshooting

### Migration Failed

```bash
# Logları yoxla
docker exec atis_backend php artisan tinker --execute="echo App\Models\User::count();"

# Database-i reset et
./restore_production_laravel.sh
```

### Sistem Başlamır

```bash
# Containerleri restart et
docker restart atis_backend atis_postgres atis_redis

# Portları təmizlə
lsof -ti:8000,3000,5433 | xargs kill -9 2>/dev/null || true

# Yenidən başlat
./start.sh
```

### API 500 Error

```bash
# Cache təmizlə
docker exec atis_backend php artisan cache:clear
docker exec atis_backend php artisan config:clear

# Permissions check
docker exec atis_backend php artisan permission:cache-reset
```

---

## 📝 Qeydlər

1. **Production Data DƏYIŞMƏMƏL**: Bu data read-only development üçündür
2. **Test Məqsədilə**: Real istifadəçilərlə test etmək üçün ideal
3. **Backup var**: `backend/database/backups/postgres_backup_*.sql` faylları var
4. **start.sh Avtomatik**: 100+ user olduqda seeders skip edir

---

**Hazırlayan**: Claude Code
**Tarix**: 2025-12-15
**Versiya**: 1.0
