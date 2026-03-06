---
name: atis-db
description: ATİS layihəsinin database əməliyyatları və monitoring
---

ATİS database idarəetmə əmrləri:

## Database Bağlantı Yoxlaması
1. **PostgreSQL bağlantı test**: `docker exec atis_backend php artisan tinker --execute="DB::connection()->getPdo(); echo 'PostgreSQL əlaqə OK';"`
2. **Database adı və version**: `docker exec atis_backend php artisan tinker --execute="echo 'DB: ' . config('database.default'); echo ' Version: ' . DB::select('SELECT version()')[0]->version;"`

## Migration Əməliyyatları
1. **Migration status**: `docker exec atis_backend php artisan migrate:status`
2. **Yeni migration işə sal**: `docker exec atis_backend php artisan migrate`
3. **Fresh migration + seed**: `docker exec atis_backend php artisan migrate:fresh --seed`
4. **Rollback son migration**: `docker exec atis_backend php artisan migrate:rollback --step=1`

## Seeder Əməliyyatları
1. **Bütün seederlər**: `docker exec atis_backend php artisan db:seed`
2. **SuperAdmin seeder**: `docker exec atis_backend php artisan db:seed --class=SuperAdminSeeder`
3. **Institution seeder**: `docker exec atis_backend php artisan db:seed --class=InstitutionHierarchySeeder`

## Database Monitoring
1. **Cədvəl siyahısı**: `docker exec atis_backend php artisan tinker --execute="Schema::getTableListing() |> dd();"`
2. **User count**: `docker exec atis_backend php artisan tinker --execute="echo 'İstifadəçi sayı: ' . App\Models\User::count();"`
3. **Institution count**: `docker exec atis_backend php artisan tinker --execute="echo 'Təşkilat sayı: ' . App\Models\Institution::count();"`

## Backup və Restore
1. **Database backup**: `docker exec atis_backend pg_dump -h localhost -U postgres atis_db > atis_backup_$(date +%Y%m%d_%H%M%S).sql`
2. **Backup restore**: `docker exec atis_backend psql -h localhost -U postgres atis_db < backup_file.sql`

## Performance Monitoring
1. **Slow query log**: `docker exec atis_backend php artisan telescope:clear`
2. **Connection pool status**: `docker exec atis_backend php artisan queue:monitor`