-- ATİS PostgreSQL Initialization Script
-- Bu skript container ilk dəfə başlayanda avtomatik icra olunur.
-- Məqsəd: ATİS tərəfindən tələb olunan extensionları yaratmaq.

-- UUID generation (Laravel migrations tərəfindən istifadə olunur)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full-text search (LIKE-based axtarışları sürətləndirir)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Composite index support (institutions hierarchy sorğuları üçün)
CREATE EXTENSION IF NOT EXISTS "btree_gin";
