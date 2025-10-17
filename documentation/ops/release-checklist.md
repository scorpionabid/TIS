# Release Checklist

Bu siyahı hər releasə öncəsi mütləq icra olunmalıdır.

## Mühit sinxronizasiyası
- [ ] `./scripts/capture-migration-status.sh staging pgsql` icra olundu və nəticə repoya əlavə edildi.
- [ ] Lokal `capture-migration-status.sh local pgsql` nəticəsi ilə diff yoxlanıldı.

## Miqrasiya doğrulaması
- [ ] CI `php artisan migrate --pretend` mərhələsi uğurla keçdi.
- [ ] CI `php artisan migrate:fresh --seed` mərhələsi uğurla keçdi.
- [ ] `./scripts/check-migration-risk.sh` xəbərdarlıqsız tamamlandı (və ya ALLOW_DANGEROUS_MIGRATIONS=1 əsaslandırıldı).
- [ ] `documentation/04_database_design/phased-migration-guidelines.md` üzrə plan təsdiqləndi.

## Backup & Rollback
- [ ] `./backup-database.sh --connection=pgsql --name=pre_release` snapshotı alındı.
- [ ] Snapshot `database-backups/` qovluğuna kopyalandı və `documentation/ops/backup-register.md` yeniləndi.
- [ ] Rollback addımları `documentation/ops/rollback-log.md` faylında sənədləşdirildi (əgər tətbiq olunarsa).

## Schema və Konfiqurasiya
- [ ] `./scripts/schema-dump.sh pgsql staging` artefakt kimi saxlanıldı.
- [ ] Schema bərpa proseduru `documentation/ops/schema-restore.md` üzrə yoxlandı.
- [ ] `./scripts/check-config-drift.sh staging permission sanctum` icra olundu və fərqlər yoxlanıldı.

## Kommunikasiya
- [ ] Release qeydləri hazırlanıb paylaşılmağa hazırdır.
- [ ] Mühitdə dəyişiklik pəncərəsi və məsul şəxslər təsdiqlənib.
