# 🔒 ATİS Data Preservation Guide

**Last Updated:** 2025-12-10
**Status:** PRODUCTION DATA RESTORED ✅

## 📊 Current Database Status

### PostgreSQL Database (Docker Volume)
- **Location:** Docker volume `postgres_data` (persistent across restarts)
- **Connection:** `pgsql` via `localhost:5433` (mapped to container's 5432)
- **Database:** `atis_dev`

### Data Summary (as of 2025-12-10)
- **Users:** 365 (restored from production backup)
- **Institutions:** 359 (restored from production backup)
- **Activity Logs:** 26,324
- **Grades:** 5,443
- **Link Access Logs:** 12,029
- **Documents:** 18
- **Link Shares:** 720

## 🛡️ Protection Mechanisms

### 1. Docker Volume Persistence
The PostgreSQL data is stored in a Docker volume that persists across container restarts:
```bash
# Check volume
docker volume ls | grep postgres_data

# Inspect volume
docker volume inspect atis_postgres_data
```

**IMPORTANT:** As long as you don't run `docker volume rm postgres_data`, your data is safe!

### 2. Smart Start Script Protection
The `start.sh` script now includes production data detection:

```bash
# Lines 201-206 in start.sh
if [ "$user_count" -gt 100 ]; then
    print_success "🔒 PRODUCTION DATA DETECTED! Skipping migrations and seeders."
    return 0
fi
```

This means:
- ✅ If you have >100 users, migrations and seeders are SKIPPED
- ✅ Your data will NOT be wiped on system restart
- ✅ Safe to run `./start.sh` multiple times

### 3. SQLite Backup Location
Your original SQLite backup is preserved at:
```
/Users/home/Desktop/ATİS/backend/database/database.sqlite (701MB)
```

## ⚠️ NEVER DO THESE COMMANDS

These commands will WIPE your data:

```bash
# ❌ DANGER - Drops all volumes including postgres_data
docker compose down -v

# ❌ DANGER - Wipes and reseeds database
docker exec atis_backend php artisan migrate:fresh --seed

# ❌ DANGER - Removes persistent volume
docker volume rm atis_postgres_data

# ❌ DANGER - Prunes all volumes
docker system prune -a --volumes
```

## ✅ SAFE Commands

These commands are SAFE and will NOT delete data:

```bash
# ✅ SAFE - Stops containers but keeps volumes
docker compose down

# ✅ SAFE - Stops containers
docker compose stop

# ✅ SAFE - Restarts containers
docker compose restart

# ✅ SAFE - Starts system (now with production data protection)
./start.sh

# ✅ SAFE - Stops system cleanly
./stop.sh

# ✅ SAFE - Run migrations without wiping data
docker exec atis_backend php artisan migrate --force
```

## 🔄 If You Accidentally Wipe Data

If your data gets wiped, restore from the SQLite backup:

```bash
# 1. Ensure SQLite backup exists
ls -lh /Users/home/Desktop/ATİS/backend/database/database.sqlite

# 2. Wipe PostgreSQL clean
docker exec atis_backend php artisan db:wipe --force

# 3. Run fresh migrations
docker exec atis_backend php artisan migrate --force

# 4. Run the migration command
docker exec atis_backend php -d memory_limit=1536M artisan migrate:sqlite-to-postgres --source=sqlite --target=pgsql --batch-size=300
```

This will take ~12 seconds and restore all 365 users and 359 institutions.

## 📦 Creating New Backups

### PostgreSQL Dump (Recommended)
```bash
# Create PostgreSQL dump
docker exec atis_postgres pg_dump -U atis_dev_user atis_dev > backup_$(date +%Y%m%d).sql

# Restore PostgreSQL dump
cat backup_20251210.sql | docker exec -i atis_postgres psql -U atis_dev_user -d atis_dev
```

### SQLite Export (Alternative)
```bash
# Export to SQLite from PostgreSQL
docker exec atis_backend php artisan migrate:postgres-to-sqlite --source=pgsql --target=sqlite

# Copy SQLite file to safe location
cp backend/database/database.sqlite ~/Desktop/backup_$(date +%Y%m%d).sqlite
```

## 🔍 Verify Data Integrity

Run this command anytime to check your data:

```bash
docker exec atis_backend php artisan tinker --execute="
echo 'Users: ' . App\Models\User::count() . PHP_EOL;
echo 'Institutions: ' . App\Models\Institution::count() . PHP_EOL;
echo 'Activity Logs: ' . App\Models\ActivityLog::count() . PHP_EOL;
"
```

Expected output:
```
Users: 365
Institutions: 359
Activity Logs: 26324
```

## 📝 Change Log

### 2025-12-10
- ✅ Restored production data from `atis_verified_backup_20251203_101858.tar.gz`
- ✅ Modified `start.sh` with production data protection (>100 users threshold)
- ✅ Verified PostgreSQL volume persistence
- ✅ Documented all safe/unsafe commands
- ✅ Created this preservation guide

## 🎯 Key Takeaways

1. **Docker volumes are persistent** - Your data survives container restarts
2. **`./start.sh` is now safe** - It detects production data and skips seeders
3. **SQLite backup is preserved** - Can restore anytime from `backend/database/database.sqlite`
4. **PostgreSQL is the source of truth** - All data is now in the `atis_postgres` container
5. **Avoid `docker compose down -v`** - This deletes volumes (including your data!)

---

**Remember:** ATİS now contains your real production data. Treat it with care! 🔒
