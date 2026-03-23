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
> ⚠️ `php artisan db:seed` (ümumi) HEÇVAXT işlətmə — fake data yaradır. Yalnız fərdi seeders:

1. **SuperAdmin**: `docker exec atis_backend php artisan db:seed --class=SuperAdminSeeder --force`
2. **Rollar**: `docker exec atis_backend php artisan db:seed --class=RoleSeeder --force`
3. **İcazələr**: `docker exec atis_backend php artisan db:seed --class=PermissionSeeder --force`
4. **Institution seeder**: `docker exec atis_backend php artisan db:seed --class=InstitutionHierarchySeeder --force`

## Database Monitoring
1. **Cədvəl siyahısı**: `docker exec atis_backend php artisan tinker --execute="Schema::getTableListing() |> dd();"`
2. **User count**: `docker exec atis_backend php artisan tinker --execute="echo 'İstifadəçi sayı: ' . App\Models\User::count();"`
3. **Institution count**: `docker exec atis_backend php artisan tinker --execute="echo 'Təşkilat sayı: ' . App\Models\Institution::count();"`

## Backup və Restore
1. **Database backup**: `docker exec atis_postgres pg_dump -U atis_dev_user -d atis_dev > atis_backup_$(date +%Y%m%d_%H%M%S).sql`
2. **Backup restore**: `docker exec -i atis_postgres psql -U atis_dev_user -d atis_dev < backup_file.sql`

## Performance Monitoring
1. **Slow query log**: `docker exec atis_backend php artisan telescope:clear`
2. **Connection pool status**: `docker exec atis_backend php artisan queue:monitor`