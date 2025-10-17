# Faza-faza (online) miqrasiya qaydaları

Bu bələdçi canlı mühitdə böyük cədvəllər (`users`, `surveys`, `documents`, `grades` və s.) üzərində bloklaşdırıcı kilidlər yaratmadan struktur dəyişikliklərini tətbiq etmək üçün nəzərdə tutulub.

## 1. Hazırlıq mərhələsi
- **Mühit sinxronizasiyası:** `./scripts/capture-migration-status.sh staging pgsql` və `./scripts/capture-migration-status.sh production pgsql` işlədərək mövcud miqrasiya başlıqlarını toplayın.
- **Backup:** `./backup-database.sh --connection=pgsql --name=pre_<feature>` kimi snapshot alın. Əlavə cədvəl səviyyəli ehtiyat üçün `--tables=users,surveys` istifadə edin.
- **Schema diff:** `./scripts/schema-dump.sh pgsql staging` işlətdikdən sonra diff edin.

## 2. Faza 1 — Sütunları əlavə et
1. Yeni sütunları **nullable** və ya default dəyərlə əlavə edin.
2. Trigger/constraint əlavə etməyin.
3. Miqrasiyanı `php artisan migrate --pretend` ilə yoxlayın.

## 3. Faza 2 — Məlumatı doldur
1. Queue job və ya artisan skripti (məs. `php artisan data:backfill-users-preferences`) yaradın.
2. Cron və ya worker-lərdə addım-addım işlədin.
3. `backfill` tamamlandıqdan sonra audit jurnalına qeyd edin.

## 4. Faza 3 — Constraint tətbiq et
1. Yeni miqrasiya ilə sütunları `NOT NULL`, `unique`, `foreign key` və s. ilə sıxlaşdırın.
2. Dəyərlərin hazır olduğuna əmin olmaq üçün `select count(*) where new_column is null` kimi sorğularla yoxlayın.

## 5. Test və təsdiq
- CI-də `php artisan migrate --pretend` və `php artisan migrate:fresh --seed`.
- Staging mühitində `capture-migration-status.sh` ilə diff çıxarın.
- Production üçün dəyişiklik pəncərəsi və rollback planını (snapshot + manual SQL) sənədləşdirin.

## 6. Rollback ssenarisi
- Əgər yeni sütunlara `down()` əmri məlumat itkisi yaradırsa, `database-backups/README.md` faylında manual SQL addımlarını qeyd edin.
- `./backup-database.sh --connection=pgsql --name=rollback` kimi snapshot alın, bərpa qaydası:
  ```bash
  pg_restore -h <host> -p <port> -U <user> -d <db> pre_feature.dump
  ```
- Rollback ehtiyac yarandıqda miqrasiya status diff fayllarını yeniləyin.

## 7. Nəzarət siyahısı
- [ ] Backup alındı, fayl yolu qeyd edildi
- [ ] Schema dump diff yoxlanıldı
- [ ] Backfill skripti qaçdı və nəticə sənədləşdirildi
- [ ] Constraint miqrasiyası `pretend` testindən keçdi
- [ ] Config drift yoxlanıldı (`check-config-drift.sh staging permission`)
- [ ] Release qeydlərində risklər və rollback addımları qeyd edildi
