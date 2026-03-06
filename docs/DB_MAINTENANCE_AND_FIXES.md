# ATIS — DB Təmizlik və Arxitektura Düzəlişləri

**Tarix:** 2026-02-16
**Səbəb:** Production DB araşdırması zamanı aşkar edilən problemlər

---

## 1. Queue Worker İşləmir (KRİTİK)

### Problem
`QUEUE_CONNECTION=redis` təyin edilib, amma heç bir queue worker prosesi işləmir.
Nəticədə notification job-ları `jobs` cədvəlində yığılıb qalır (1,443 job 3 ay ilişmişdi).
Bildirişlər, email-lər göndərilmir.

### Səbəb
Backend container yalnız `php artisan serve` işlədir. `supervisord` quraşdırılmayıb.
`docker/backend/supervisord.conf` faylı mövcuddur amma istifadə olunmur.

### Həll Yolu

**Variant A — Dockerfile-a supervisor əlavə etmək (Tövsiyə olunan):**

```dockerfile
# Dockerfile-a əlavə ediləcək
RUN apk add --no-cache supervisor

COPY docker/backend/supervisord.conf /etc/supervisord.conf

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
```

`supervisord.conf`-da artıq `php artisan serve`, `queue:work` və `schedule:run` konfiqurasiyası var.

**Variant B — Ayrı queue worker servisi (docker-compose):**

```yaml
# docker-compose.yml-ə əlavə
  queue-worker:
    build:
      context: .
      dockerfile: docker/backend/Dockerfile
    container_name: atis_queue_worker
    restart: unless-stopped
    command: php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
    volumes:
      - ./backend/.env:/var/www/html/.env
      - ./backend/app:/var/www/html/app
      - ./backend/config:/var/www/html/config
      - ./backend/storage:/var/www/html/storage
    depends_on:
      postgres_v2:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - atis_network
```

### Test
```bash
# Queue worker-in işlədiyini yoxla:
docker exec atis_backend php artisan queue:work --once
# Job göndər və yoxla:
docker exec atis_backend php artisan tinker --execute="dispatch(fn() => logger('test job'));"
```

---

## 2. Token Təmizləmə Mexanizmi Yoxdur (YÜKSƏK)

### Problem
Hər login-də yeni token yaranır, köhnəsi silinmir. 21,900+ token yığılmışdı (8 MB).
Bəzi istifadəçilərin 170+ tokeni var idi.

### Səbəb
`LoginService`-də `createToken()` çağrılır, amma köhnə tokenlar silinmir.

### Həll Yolu

**`app/Services/Auth/LoginService.php`-da token yaradılmadan əvvəl köhnələri sil:**

```php
// Token yaratmadan əvvəl, istifadəçinin köhnə tokenlərini təmizlə (son 2 saxla)
$user->tokens()
    ->orderByDesc('last_used_at')
    ->skip(2)
    ->take(PHP_INT_MAX)
    ->delete();

$token = $user->createToken($deviceName)->plainTextToken;
```

**Əlavə olaraq — Laravel Scheduler ilə avtomatik təmizlik:**

```php
// app/Console/Kernel.php (və ya routes/console.php)
Schedule::command('sanctum:prune-expired --hours=168')->daily();

// Və ya custom command:
Schedule::call(function () {
    DB::table('personal_access_tokens')
        ->where('last_used_at', '<', now()->subDays(30))
        ->orWhereNull('last_used_at')
        ->where('created_at', '<', now()->subDays(7))
        ->delete();
})->weekly();
```

---

## 3. Session Təmizləmə Yoxdur (ORTA)

### Problem
Expired session-lar `sessions` cədvəlində qalır (driver: `database`).

### Həll Yolu

**`SESSION_DRIVER=redis` istifadə et (tövsiyə):**
Redis özü TTL ilə avtomatik təmizləyir. `.env`-də:
```
SESSION_DRIVER=redis
```

**Və ya scheduler ilə:**
```php
// routes/console.php
Schedule::command('session:gc')->hourly();
```

---

## 4. Activity Logs Böyüyür (ORTA)

### Problem
`activity_logs` cədvəli 141 MB, 51,000+ sətir. Avtomatik təmizləmə yoxdur.

### Həll Yolu

**Scheduler ilə köhnə logları sil:**

```php
// routes/console.php və ya custom command
Schedule::call(function () {
    DB::table('activity_logs')
        ->where('created_at', '<', now()->subDays(90))
        ->delete();

    DB::table('security_events')
        ->where('created_at', '<', now()->subDays(90))
        ->delete();

    DB::table('survey_audit_logs')
        ->where('created_at', '<', now()->subDays(180))
        ->delete();
})->weekly();
```

**Digər böyüyən cədvəllər üçün də eyni qaydanı tətbiq et:**

| Cədvəl | Saxlama müddəti |
|---|---|
| `activity_logs` | 90 gün |
| `security_events` | 90 gün |
| `link_access_logs` | 60 gün |
| `document_access_logs` | 60 gün |
| `survey_audit_logs` | 180 gün |
| `notifications` (read) | 30 gün |

---

## 5. DatabaseSeeder Production-da Fake Data Yaradır (YÜKSƏK)

### Problem
`DatabaseSeeder`-dəki şərt səhv idi: `if (app()->environment('production'))` — fake data (classes, grades, attendance) production-da yaranırdı.

### Status: DÜZƏLDİLİB ✅
Şərt `if (app()->environment('local', 'testing'))` olaraq dəyişdirilib.

### Qayda
- Production-da **HEÇ VAXT** `php artisan db:seed` (ümumi) çalışdırma
- Yalnız ayrı-ayrı core seeders: `--class=RoleSeeder`, `--class=PermissionSeeder`, və s.
- `pull.sh` skripti yalnız core seeders çalışdırır

---

## 6. Scheduler İşləmir (YÜKSƏK)

### Problem
`php artisan schedule:run` heç vaxt çağrılmır. Dockerfile-da cron/supervisor yoxdur.
Bu səbəbdən yuxarıdakı bütün avtomatik təmizlik tapşırıqları işləməyəcək.

### Həll Yolu
Scheduler `supervisord.conf`-da artıq konfiqurasiya edilib.
Addım 1 (Queue Worker) həll edildikdə, scheduler da avtomatik işləyəcək.

**Əgər supervisor istifadə olunmursa, Dockerfile-a cron əlavə et:**

```dockerfile
# Cron üçün
RUN echo "* * * * * cd /var/www/html && php artisan schedule:run >> /dev/null 2>&1" | crontab -

# Entrypoint-i dəyiş:
CMD ["sh", "-c", "crond && php artisan serve --host=0.0.0.0 --port=8000"]
```

---

## 7. Grades UNIQUE Constraint Case-Sensitive-dir (YÜKSƏK)

### Problem
`grades` cədvəlindəki UNIQUE constraint case-sensitive-dir:
```sql
UNIQUE (name, class_level, academic_year_id, institution_id)
```
Nəticədə `"a"` və `"A"` fərqli sinif kimi yaranır. İstifadəçi sinfi silmədən yenidən böyük hərflə əlavə edə bilir.
Məktəb 287596065-da XI-a/XI-A və XI-b/XI-B dublikatları aşkar edildi. Hər ikisi üçün davamiyyət yazılmışdı.

### Status: Dublikatlar manual silinib ✅, amma kök səbəb düzəldilməyib

### Həll Yolu

**Addım 1 — Migration: UNIQUE constraint-i case-insensitive et**

```bash
docker exec atis_backend php artisan make:migration fix_grades_unique_constraint_case_insensitive
```

Migration məzmunu:
```php
public function up(): void
{
    // Köhnə constraint-i sil
    Schema::table('grades', function (Blueprint $table) {
        $table->dropUnique('grades_unique_per_level');
    });

    // Case-insensitive unique index yarat
    DB::statement('
        CREATE UNIQUE INDEX grades_unique_per_level
        ON grades (LOWER(name), class_level, academic_year_id, institution_id)
    ');
}

public function down(): void
{
    DB::statement('DROP INDEX IF EXISTS grades_unique_per_level');

    Schema::table('grades', function (Blueprint $table) {
        $table->unique(['name', 'class_level', 'academic_year_id', 'institution_id'], 'grades_unique_per_level');
    });
}
```

**Addım 2 — Backend: sinif adını normalize et**

`app/Models/Grade.php` (və ya sinif yaradılan controller/service):
```php
// Mutator əlavə et
protected function name(): Attribute
{
    return Attribute::make(
        set: fn (string $value) => mb_strtoupper(trim($value)),
    );
}
```

Və ya sinif yaradılan yerdə (controller):
```php
$validated['name'] = mb_strtoupper(trim($validated['name']));
```

**Addım 3 — Mövcud datanı normalize et**

Migration-da və ya tinker-də:
```php
DB::statement("UPDATE grades SET name = UPPER(TRIM(name)) WHERE name != UPPER(TRIM(name))");
```

### Test
```bash
# Dublikat yoxla (case-insensitive):
docker exec atis_postgres psql -U atis_prod_user -d atis_production -c "
SELECT institution_id, LOWER(name), class_level, academic_year_id, count(*)
FROM grades
GROUP BY institution_id, LOWER(name), class_level, academic_year_id
HAVING count(*) > 1;"
```

---

## İcra Prioriteti

| # | Tapşırıq | Prioritet | Təxmini vaxt |
|---|---|---|---|
| 1 | Queue worker aktivləşdir (supervisor və ya ayrı servis) | KRİTİK | 2-3 saat |
| 2 | Token təmizləmə LoginService-ə əlavə et | YÜKSƏK | 30 dəq |
| 3 | DatabaseSeeder şərtini yoxla (artıq düzəlib) | ✅ TAMAMDIR | — |
| 4 | Scheduler aktivləşdir (supervisor ilə birlikdə) | YÜKSƏK | supervisor ilə birlikdə |
| 5 | Avtomatik log təmizləmə command-ları yaz | ORTA | 1 saat |
| 6 | SESSION_DRIVER=redis keçid | ORTA | 15 dəq |
| 7 | Grades UNIQUE constraint case-insensitive et + name normalize | YÜKSƏK | 1 saat |

---

## Yararlı DB Təmizlik Əmrləri (Manual)

```bash
# Köhnə tokenları təmizlə (30+ gün)
docker exec atis_postgres psql -U atis_prod_user -d atis_production -c "
DELETE FROM personal_access_tokens WHERE last_used_at < NOW() - INTERVAL '30 days';"

# İlişmiş job-ları təmizlə
docker exec atis_postgres psql -U atis_prod_user -d atis_production -c "
DELETE FROM jobs WHERE created_at < EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days');"

# Expired sessions təmizlə
docker exec atis_postgres psql -U atis_prod_user -d atis_production -c "
DELETE FROM sessions WHERE last_activity < EXTRACT(EPOCH FROM NOW()) - 86400;"

# Köhnə activity logları sil (90+ gün)
docker exec atis_postgres psql -U atis_prod_user -d atis_production -c "
DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '90 days';"

# DB ölçüsünü yoxla
docker exec atis_postgres psql -U atis_prod_user -d atis_production -c "
SELECT pg_size_pretty(pg_database_size('atis_production'));"

# VACUUM (silindikdən sonra yer geri qaytarmaq üçün)
docker exec atis_postgres psql -U atis_prod_user -d atis_production -c "VACUUM ANALYZE;"
```
