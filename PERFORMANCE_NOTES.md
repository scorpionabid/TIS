# ATIS PostgreSQL & Backend Performance Optimization

**Tarix:** 2026-03-04
**Server:** atis.sim.edu.az
**Araşdırılan:** `atis_postgres` container yüklənməsi (~40% CPU)

---

## Aşkar Edilən Problemlər

### 1. Həddindən Artıq DB Connection Açma (Kritik)
- **Səbəb:** `docker/backend/Dockerfile` production əvəzinə `php artisan serve` (development server) istifadə edirdi
- **Nəticə:** Hər HTTP sorğusu üçün yeni PostgreSQL connection açılır, bitdikdə DEALLOCATE fırtınası yaranır
- **Effekt:** ~40% PostgreSQL CPU istifadəsi

### 2. `work_mem` Çox Aşağı (4MB)
- Sort və hash join əməliyyatları diskə yazılırdı (111 temp file, 725MB)
- Default 4MB yetərsizdir

### 3. Dead Tuple Yığılması
- `personal_access_tokens`: 17.7% dead ratio
- `survey_responses`: 16.4% dead ratio
- `users`: 11.6% dead ratio
- Autovacuum `scale_factor` çox yüksək idi (0.2 = 20% dolduqda tetiklanır)

### 4. Application Bug: `class_id` Sütunu Mövcud Deyil
- `schedule_sessions` cədvəlində `class_id` yoxdur
- Kod iki yerdə bu sütuna müraciət edir:
  - `app/Services/ScheduleCrudService.php:628`
  - `app/Services/ScheduleGenerationService.php:524`
- Hər statistika sorğusunda SQL error verir

---

## Edilən Düzəltmələr

### PostgreSQL Konfiqurasiya (Restart Olmadan)
```sql
-- work_mem artırıldı (temp file disk spill aradan qaldırıldı)
ALTER SYSTEM SET work_mem = '16MB';

-- Slow query logging aktiv edildi (200ms+)
ALTER SYSTEM SET log_min_duration_statement = '200';
```

### VACUUM ANALYZE (6 Cədvəl)
```
personal_access_tokens, survey_responses, link_shares,
users, class_bulk_attendance, activity_logs
```

### Autovacuum Tezliyi Artırıldı
```sql
-- 6 aktiv yenilənən cədvəldə scale_factor 0.2 → 0.05
ALTER TABLE personal_access_tokens SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE survey_responses       SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE users                  SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE link_shares            SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE class_bulk_attendance  SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE activity_logs          SET (autovacuum_vacuum_scale_factor = 0.05);
```

### Laravel Persistent DB Connections
```php
// backend/config/database.php — pgsql bölməsinə əlavə edildi
'options' => [
    PDO::ATTR_PERSISTENT => true,
],
```

### Nginx + PHP-FPM-ə Keçid
- `docker/backend/Dockerfile` `php:8.3-cli` → `php:8.3-fpm` + Nginx
- `docker/backend/supervisord.conf` yeniləndi
- `docker/backend/nginx.conf` əlavə edildi

---

## Nəticələr

| Metrik | Əvvəl | Sonra |
|--------|-------|-------|
| PostgreSQL CPU | ~40% | ~8% |
| Aktiv DB Connection | Hər sorğuda yeni | Persistent (FPM worker başına 1) |
| Temp files | 725MB disk spill | Aradan qalxdı |
| Dead tuples (users) | 11.6% | 0% |
| Dead tuples (survey_responses) | 16.4% | 0% |

---

## Qalan Tövsiyələr

### Mütləq Düzəldilməli (Development Bug)
- `app/Services/ScheduleCrudService.php:628` — `->distinct('class_id')->count('class_id')` xəttini sil və ya düzgün sütunla əvəz et
- `app/Services/ScheduleGenerationService.php:524` — eyni problem

### İzlənilməli
- Slow query log: `docker logs atis_postgres | grep "duration:"` — 200ms+ sorğuları izlə
- `activity_logs` cədvəli (142MB) — köhnə qeydlər arxivlənə bilər (məs. 6 aydan köhnə)
- `shared_buffers` (128MB) — server 125GB RAM-a malikdir, 2-4GB-a artırmaq olar (restart tələb edir)

### `shared_buffers` Artırma (Planlaşdırılmış Downtime)
```sql
-- PostgreSQL restart tələb edir
ALTER SYSTEM SET shared_buffers = '2GB';
-- docker restart atis_postgres
```

---

## Faydalı Komandalar

```bash
# PostgreSQL CPU izlə
docker stats atis_postgres --no-stream

# Aktiv sorğular
docker exec atis_postgres psql -U atis_prod_user -d atis_production \
  -c "SELECT pid, state, query FROM pg_stat_activity WHERE state != 'idle';"

# Slow query log-ları
docker logs atis_postgres 2>&1 | grep "duration:"

# Spatie permission cache yoxla
docker exec atis_redis redis-cli -n 1 ttl "atis_database_atis_cache_spatie.permission.cache"

# Dead tuple vəziyyəti
docker exec atis_postgres psql -U atis_prod_user -d atis_production \
  -c "SELECT relname, n_dead_tup, round(n_dead_tup*100.0/NULLIF(n_live_tup+n_dead_tup,0),2) dead_pct FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;"
```
