# Schema Dump Bərpa Proseduru

Bu sənəd `backend/scripts/schema-dump.sh` tərəfindən yaradılan schema dump fayllarının necə istifadə olunacağını təsvir edir.

## 1. Artefaktı əldə edin
- CI artefaktı və ya `database/schema/<schema>.sql` faylını yükləyin.
- Faylı `/tmp/schema.sql` kimi müvəqqəti qovluğa yerləşdirin.

## 2. Lokal / Staging test
```bash
php artisan migrate:fresh --seed
mysql < /tmp/schema.sql      # MySQL istifadə olunursa
psql  < /tmp/schema.sql      # PostgreSQL istifadə olunursa
```
- Ardınca `php artisan migrate` işə salın ki, dump ilə migrasiyalar sinxron olsun.

## 3. Production
- **Heç vaxt** canlı bazaya dərhal tətbiq etməyin.
- Production üçün aşağıdakı ardıcıllıqla hərəkət edin:
  1. Yeni boş test bazası yaradın.
  2. Schema dump faylını həmin test bazasına import edin (`psql -d testdb -f schema.sql`).
  3. `php artisan migrate` ilə fərqləri yoxlayın; əgər heç bir migrasiya çalışmırsa, dump güncündür.
  4. Canlı bazada yalnız təsdiq edilmiş migrasiyaları tətbiq edin.

## 4. Geri qaytarma
- Schema dump canlı bazaya səhvən tətbiq olunarsa:
  1. `database-backups/README.md` sənədinə uyğun snapshotı bərpa edin.
  2. `documentation/ops/rollback-log.md` faylında hadisəni qeyd edin.

Bu proses schema dump istifadə edərkən şəbəkə və canlı məlumat təhlükələrini minimuma endirir.
