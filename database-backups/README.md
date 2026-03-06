# Database Backup & Rollback Bələdçisi

Bu qovluq ATİS istehsal/staging bazalarının snapshotlarını saxlayır. Snapshotlar sürətli rollback və audit məqsədləri üçün istifadə olunur.

## 1. Snapshot almaq

### SQLite (lokal inkişaf)
```bash
cd backend
./backup-database.sh nightly
```
- Nəticə: `backend/database/database_backup_<timestamp>_nightly.sqlite`

### PostgreSQL (staging/production)
```bash
cd backend
./backup-database.sh --connection=pgsql --name=pre_release
```
- Nəticə: `backend/database/database_backup_<timestamp>_pre_release.dump`
- Xüsusi cədvəllər üçün `--tables=users,surveys` əlavə edin.

## 2. Snapshotların saxlanılması
- `.dump` və `.sqlite` fayllarını `database-backups/` qovluğuna kopyalayın.
- Fayl adı nümunəsi: `production_359institutions_20251003.sqlite`
- CI və ya manuel prosedurlarda snapshot alınmadan miqrasiya icazəli deyil.

## 3. Snapshotı bərpa etmək

### SQLite
```bash
cp database-backups/<snapshot>.sqlite database/database.sqlite
php artisan migrate --force
```

### PostgreSQL
```bash
export PGPASSWORD=<password>
pg_restore -h <host> -p <port> -U <user> -d <database> database_backup_<timestamp>.dump
```
- Bərpadan sonra `php artisan migrate:status` ilə vəziyyəti yoxlayın.

## 4. Rollback addımları (manual)
Əgər miqrasiya `down()` əmri ilə təhlükəsiz rollback etmirsə:
1. Snapshotı bərpa edin (yuxarıdakı kimi).
2. Əlavə olaraq aşağıdakı addımları sənədləşdirin:
   - Silinən sütunları `ALTER TABLE ... ADD COLUMN` ilə geri gətirmə.
   - `dropColumn` nəticəsində itən indeksləri yenidən yaratma.
3. İcra olunan SQL əmrlərini `documentation/ops/rollback-log.md` faylında saxlayın.

## 5. Audit qeydləri
- Hər snapshot üçün aşağıdakı məlumatları `documentation/ops/backup-register.md` faylında saxlayın:
  - Tarix və saat
  - Kim tərəfindən alındı
  - Məqsəd (məs. “pre release 2.1.0”)
  - Mühit (staging / production)
  - Əhatə dairəsi (tam baza / cədvəl)

Bu təlimatlara əməl edərək miqrasiya və rollback proseslərini daha təhlükəsiz idarə edə bilərsiniz.
