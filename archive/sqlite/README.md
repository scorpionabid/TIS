# SQLite Arxiv Qovluğu

Bu qovluqda artıq aktiv istifadə olunmayan, lakin istinad üçün saxlanılan SQLite snapshot və fayllar yerləşdirilir.

## Struktur

- `backend/` – `backend/database/` kataloqundan köçürülmüş lokal `database.sqlite*` faylları (köhnə migrasiya testləri və ya analog bərpalar üçün).
- `snapshots/` – `database-backups/` altındakı `.sqlite` snapshotları (məsələn, `production_359institutions_20251003.sqlite`).
- `legacy/TIS/` – köhnə `TIS/` qovluğunun tam nüsxəsi; əsasən SQLite arxiv nüsxələrini ehtiva edir.

> **Qeyd:** Yeni inkişaf və deploy prosesləri yalnız PostgreSQL-dən istifadə edir. Bu qovluqdakı fayllar yalnız tarixi baxımdan saxlanılır və aktiv mühitə mount olunmamalıdır.
