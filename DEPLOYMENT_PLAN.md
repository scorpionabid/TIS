# ATİS Production Deployment Plan

## 🔍 Verilənlər Bazası Təhlili

### Migration Status
- **Ümumi migrasiyalar**: 132 fayl
- **Aktiv migrasiyalar**: 127 fayl (hamısı uğurla çalışdırıldı)
- **Söndürülmüş migrasiyalar**: 5 fayl (dublant konfliktlər həll edildi)

### Disabled Migrations (Təmizlənməli)
```
- 2025_08_16_193956_create_schedule_conflicts_table.php.disabled
- 2025_08_16_193956_create_schedule_conflicts_table.php.disabled2  
- 2025_08_17_120500_create_assessment_analytics_table.php.disabled
- 2025_08_17_120500_create_assessment_analytics_table.php.disabled3
- 2025_08_18_035852_create_subjects_table.php.disabled
```

### Seeder Files (22 fayl)
- **Kritik**: RoleSeeder, PermissionSeeder, SuperAdminSeeder
- **Əsas data**: InstitutionHierarchySeeder, InstitutionTypeSeeder, DepartmentSeeder
- **Test data**: AssessmentDataSeeder, SurveyDataSeeder, SchoolDataSeeder

### Factory Files
- **Mövcud**: 20 factory fayl
- **Çatışmayan**: InventoryItemFactory (test üçün tələb olunur)

---

## 📋 Deploy Öncəsi Hazırlıq Planı

### 1. Verilənlər Bazası Hazırlığı

#### A. Migration Təmizliyi
```bash
# Dublant migration fayllarını sil
rm database/migrations/*.disabled*

# Migration cache təmizliyi  
php artisan migrate:reset --force
php artisan migrate:fresh --force
php artisan migrate:status
```

#### B. Production Database Setup
```bash
# PostgreSQL üçün connection test
php artisan tinker
# >>> DB::connection('pgsql')->getPdo();

# Production migrasiyaları
php artisan migrate --force --env=production

# Əsas seederlər (YALNIZ production ilk dəfə üçün)
php artisan db:seed --class=RoleSeeder --force
php artisan db:seed --class=PermissionSeeder --force  
php artisan db:seed --class=SuperAdminSeeder --force
php artisan db:seed --class=InstitutionHierarchySeeder --force
php artisan db:seed --class=InstitutionTypeSeeder --force
```

### 2. Environment Konfiqurasiyası

#### A. Production .env Tənzimləmələri
```env
APP_NAME="ATİS - Azərbaycan Təhsil İdarəetmə Sistemi"
APP_ENV=production
APP_DEBUG=false
APP_KEY=[GENERATE NEW KEY]
APP_URL=https://yourdomain.com

# Database - PostgreSQL
DB_CONNECTION=pgsql  
DB_HOST=your-db-host
DB_PORT=5432
DB_DATABASE=atis_production
DB_USERNAME=your-username
DB_PASSWORD=your-secure-password

# Session & Cache - Redis
CACHE_STORE=redis
SESSION_DRIVER=redis
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password
REDIS_PORT=6379

# Security
SESSION_ENCRYPT=true
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax

# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
```

#### B. Cache & Optimization
```bash
# Configuration cache
php artisan config:cache

# Route cache  
php artisan route:cache

# View cache
php artisan view:cache

# Event cache
php artisan event:cache

# Clear all caches
php artisan optimize:clear
php artisan optimize
```

### 3. Security Təmizliyi

#### A. Test Fayllarını Sil
```bash
# Test database faylları
rm -f database/database.sqlite
rm -f storage/testing.sqlite
rm -f /tmp/testing.sqlite

# Debug faylları
rm -f storage/logs/*.log
find storage/framework/cache -name "*.php" -delete
find storage/framework/sessions -name "*.php" -delete
find storage/framework/views -name "*.php" -delete
```

#### B. Permission Setup
```bash
# Storage və bootstrap cache icazələri
chmod -R 775 storage/
chmod -R 775 bootstrap/cache/
chown -R www-data:www-data storage/
chown -R www-data:www-data bootstrap/cache/
```

### 4. Performance Optimizasiyası

#### A. Autoloader Optimization  
```bash
composer dump-autoload --optimize --classmap-authoritative
```

#### B. Queue Workers Setup
```bash
# Production üçün queue worker
php artisan queue:work --daemon --tries=3 --timeout=60

# Supervisor config nümunəsi
[program:atis-worker]
process_name=%(program_name)s_%(process_num)02d
command=php artisan queue:work --sleep=3 --tries=3 --max-time=3600
directory=/path/to/atis/backend
autostart=true
autorestart=true
user=www-data
numprocs=4
```

### 5. Frontend Build

#### A. Production Build
```bash
cd frontend/
npm ci --only=production
npm run build

# Build fayllarını yoxla
ls -la dist/
```

#### B. Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL certificates
    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private-key.pem;
    
    # Frontend (React)
    location / {
        root /path/to/atis/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api {
        try_files $uri $uri/ /index.php?$query_string;
        
        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME /path/to/atis/backend/public$fastcgi_script_name;
            include fastcgi_params;
        }
    }
}
```

### 6. Monitoring & Backup Setup

#### A. Database Backup
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U username atis_production > $BACKUP_DIR/atis_$DATE.sql
gzip $BACKUP_DIR/atis_$DATE.sql
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

#### B. Log Rotation
```bash
# /etc/logrotate.d/atis
/path/to/atis/backend/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 644 www-data www-data
}
```

---

## ✅ Deploy Checklist

### Pre-Deployment
- [ ] Disabled migration fayllarını sil
- [ ] Production .env faylını konfiqurasiya et
- [ ] Database connection test et
- [ ] SSL sertifikatlarını qur
- [ ] Redis/Cache server hazırla

### Deployment
- [ ] Code repository-ni pull et
- [ ] Composer install --no-dev --optimize-autoloader
- [ ] npm run build (frontend)
- [ ] php artisan migrate --force
- [ ] Kritik seederlər çalışdır (ilk dəfə)
- [ ] php artisan optimize

### Post-Deployment  
- [ ] Storage permissionları yoxla
- [ ] Queue workers başlat
- [ ] SSL və HTTPS yoxla
- [ ] API endpoints test et
- [ ] Frontend yüklənməsini yoxla
- [ ] Log monitoring qur
- [ ] Backup system test et

### Health Checks
```bash
# API health check
curl https://yourdomain.com/api/health

# Database connection
php artisan tinker
>>> DB::connection()->getPdo();

# Cache işləyir
php artisan tinker  
>>> Cache::put('test', 'working', 60);
>>> Cache::get('test');
```

---

## 🚨 Təhlükəsizlik Xəbərdarlıqları

1. **Test data seederləri production-da ÇALIŞDIRMA**
2. **APP_DEBUG=false production-da**
3. **Default parolları dəyişdir** 
4. **API rate limiting aktiv et**
5. **CORS tənzimləmələri düzgün et**
6. **Database backup strategiyası həyata keçir**

---

Bu plan production deployment üçün addım-addım hazırlanıb və sistem yüksək təhlükəsizlik səviyyəsi ilə işləyəcək.