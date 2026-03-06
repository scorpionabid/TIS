# Miqrasiya əməliyyatları bələdçisi

ATİS bazasında miqrasiya işlərini koordinasiya etmək üçün aşağıdakı proseslərlə hərəkət edin. Bütün skriptlər `backend/` qovluğunda saxlanılır və Docker konteynerində və ya lokaldakı PHP/SQlite mühitində icra edilə bilər.

## 1. Mühitlərin sinxronizasiyası

| Addım | Skript | Təsvir |
| --- | --- | --- |
| Miqrasiya statusunu çıxar | `./scripts/capture-migration-status.sh <env> [connection]` | `php artisan migrate:status` nəticəsini `storage/migration-status/<env>_<timestamp>.txt` faylına yazır. Staging və production serverlərində cron/CI ilə icra edib repoda saxlayın. |
| Status fərqlərini yoxla | manual `diff` | Lokal faylı staging/production faylları ilə müqayisə edin; fərqləri PR-larda sənədləşdirin. |

## 2. Schema dump istifadə qaydası

| Addım | Skript | Təsvir |
| --- | --- | --- |
| Dump yaradın | `./scripts/schema-dump.sh <connection> [schema-name]` | `php artisan schema:dump --prune` işlədir və nəticəni `database/schema/<schema-name>.sql` faylına yazır. |
| Dump saxlanması | CI artefaktı | Staging pipeline schema dump faylını artefakt kimi yükləməlidir. |
| Production bərpa təlimatı | `documentation/ops/schema-restore.md` *(yaradılacaq)* | Canlı bazaya toxunmadan dump faylı ilə bərpa ssenarisi burada saxlanılacaq. |

## 3. Konfiqurasiya drift yoxlaması

| Addım | Skript | Təsvir |
| --- | --- | --- |
| Konfiqurasiya çıxışı | `./scripts/check-config-drift.sh <env> [config.keys…]` | `config('permission')`, `config('sanctum')` və s. üçün JSON faylları `storage/config-drift/<env>/` qovluğuna yazır. |
| Drift müqayisəsi | `git diff` və ya `cmp` | Lokal JSON faylını staging/production faylı ilə müqayisə edin. |
| Nəticələrin sənədləşdirilməsi | Release checklist | Fərqlər tapıldıqda releasə qeydlərinə əlavə edin. |

## 4. Mərhələli (online) miqrasiya strategiyası

1. **Nullable sütun əlavə et:** `php artisan make:online-migration` (stub hazırlanacaq).
2. **Background doldurma:** Queue/job və ya skriptlə yeni sahələri doldurun.
3. **Constraint tətbiq et:** Dəyərlər tam olduqdan sonra `NOT NULL`, `foreign key` və s. tətbiq edin.

Bu qayda xüsusilə `users`, `surveys`, `documents`, `grades` cədvəllərində istifadə olunmalıdır. Nümunə planı (draft) `documentation/db/phased-migration-guidelines.md` faylında saxlayın.

## 5. Pre-flight validasiya

- CI workflow-larında aşağıdakı addımlar zəruridir:
  - `php artisan migrate --pretend`
  - `php artisan migrate:fresh --seed`
- `dropColumn` və `change()` kimi əmrlər tapıldıqda xəbərdarlıq / manual təsdiq tələb edin.

## 6. Rollback və backup planı

- `backend/backup-database.sh` scriptini Postgres/MySQL üçün genişləndirin (parametrik `pg_dump`, `mysqldump`).
- `database-backups/README.md` faylında:
  - Snapshot alınması
  - Manuel rollback addımları (əgər `down()` məlumatı silirsə) təsvir edilməlidir.

## 7. Konfiqurasiya uyğunluğunun yoxlanması

1. Skriptləri (`check-config-drift.sh`) istifadə edərək JSON fayllar çıxardın.
2. Release öncəsi `documentation/ops/release-checklist.md` faylında “Config drift yoxlanıldı” maddəsini işarələyin.

## Sonrakı addımlar

- CI workflow-larına yuxarıdakı addımları əlavə etmək.
- `schema-restore.md`, `phased-migration-guidelines.md`, `release-checklist.md` kimi sənədləri yaratmaq və doldurmaq.
- `backend/backup-database.sh` skriptini genişləndirib Postgres/PostgreSQL üçün nümunə əlavə etmək.
