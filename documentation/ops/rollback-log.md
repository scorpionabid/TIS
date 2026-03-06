# Rollback Hadisə Jurnalı

Miqrasiya və ya deployment geri çevrildikdə aşağıdakı məlumatları daxil edin.

| Tarix | Mühit | Hadisə təsviri | İcra olunan SQL/skript | Snapshot faylı | Məsul şəxs |
| --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | production | `grades` cədvəli constraint-ləri geri alındı | `ALTER TABLE grades DROP CONSTRAINT ...` | `database_backup_20251003_pre_release.dump` | ad.soyad |

Əlavə qeydlər:
- Incident ID (əgər mövcuddursa)
- Root cause və təkrar baş verməməsi üçün addımlar

Bu jurnal `database-backups/` qovluğundakı snapshotlar ilə birlikdə saxlanmalıdır.
