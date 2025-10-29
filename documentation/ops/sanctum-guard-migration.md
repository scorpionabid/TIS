# Sanctum Guard Konsolidasiyası Bələdçisi

Bu sənəd legacy `web` və `api` guard-larını vahid `sanctum` guard-ına keçirmək üçün əməli addımları təsvir edir. Mühitdə downtime ehtimalını minimuma endirmək üçün addımlar ardıcıl icra olunmalıdır.

## 1. Hazırlıq
- Aktiv istifadəçi sessiyalarını və kritik əməliyyatları yoxlayın; qısa texniki pəncərə planlaşdırın.
- Verilənlər bazasının tam ehtiyat nüsxəsini yaradın.
- Aşağıdakı audit sorğuları ilə mövcud guard bölgüsünü sənədləşdirin:
  ```sql
  select guard_name, count(*) from permissions group by guard_name;
  select guard_name, count(*) from roles group by guard_name;
  ```
- `php artisan migrate:status` ilə yeni `2025_07_03_050000_unify_permission_role_guards_to_sanctum` migrasiyasının tətbiq olunmadığını təsdiqləyin.

## 2. Keçid addımları
1. Kod release-i tətbiq edin (deploy + config sync).
2. Laravel migrasiyalarını işə salın:
   ```bash
   php artisan migrate --force
   ```
   Bu migrasiya aşağıdakıları edir:
   - Eyni adlı icazə və rolları birləşdirib `sanctum` guard-ına keçir.
   - `model_has_permissions`, `model_has_roles`, `role_has_permissions` pivotlarında istinadları təmizləyir.
3. Cache və konfiqurasiya reseti:
   ```bash
   php artisan config:clear
   php artisan cache:clear
   php artisan permission:cache-reset
   ```
4. (Opsiyonel) Tokenləri yeniləmək üçün auth servisindən istifadəçiləri məcburi logout edin və ya kommunikasiya göndərin.

## 3. Doğrulama testləri
- **Auth smoke**: SPA və Postman vasitəsilə login, logout, token yenilənməsi.
- **Rol/İcazə yoxlaması**:
  ```bash
  php artisan tinker
  >>> \Spatie\Permission\Models\Permission::pluck('guard_name')->unique();
  >>> \Spatie\Permission\Models\Role::pluck('guard_name')->unique();
  ```
  Yalnız `sanctum` qaytarılmalıdır.
- **Seeder və migrate sınağı**: QA mühitində `php artisan db:seed --class=PermissionSeeder` və `RoleSeeder` yenidən işləndikdə təkrarlanan qeydlərin yaranmadığını yoxlayın.
- **Endpoint testləri**: kritik `auth:sanctum` qorunan API-lər (rol idarəçiliyi, istifadəçi yaradılması, region admin əməliyyatları) üçün 200/403 cavablarının düzgünlüyünü təsdiqləyin.
- **Frontend navigasiyası**: rol dəyişikliklərindən sonra menyuların düzgün render olunmasını yoxlayın (`/debug/my-permissions` lokal mühitdə istifadə oluna bilər).

## 4. Rollback strategiyası
- Migrasiyadan əvvəlki DB backup-u bərpa edin.
- Əgər lazım olarsa, köhnə release branch-inə geri dönün.
- Miqrasiya geri çevrilmədiyi üçün (down metodu yoxdur) rollback yalnız backup bərpası ilə mümkündür.

## 5. Əlavə qeydlər
- Yeni seeder-lər artıq yalnız `sanctum` guard-ı yaradır; köhnə `SanctumPermissionSeeder` istifadə olunmur.
- `permission` middleware alias-ı yenidən Spatie-nin default implementasiyasına yönləndirilib; custom `permission.custom` alias-ı istənilən xüsusi cavab mexanizmləri üçün aktiv qalır.
- Production keçidindən sonra audit loglarında artan 401/403 hadisələrini monitorinq edin və lazımi hallarda istifadəçilərin tokenlərini yeniləyin.
