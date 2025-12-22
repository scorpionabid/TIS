# 📸 ATİS Development Database Snapshot System

## 🎯 Problem Həlli

**Problem**: Docker restart/rebuild zamanı development data itirdi. Hər dəfə production data restore etmək lazım idi (10-20 dəqiqə).

**Həll**: Database snapshot sistemi - production data-nı bir dəfə restore et, snapshot götür, restart zamanı snapshot-dan restore et (5 saniyə).

---

## 🚀 Sürətli Başlanğıc

### İlk Dəfə Setup (Bir dəfə lazımdır)

```bash
# 1. Production data restore et
./restore_production_laravel.sh

# 2. Snapshot yarat
./backup_dev_snapshot.sh

# ARTIQ HAZIRDIR! 🎉
```

### Gündəlik İstifadə

```bash
# Normal restart (data qalır)
./start.sh

# VƏ YA snapshot ilə restart (daha sürətli)
USE_DEV_SNAPSHOT=true ./start.sh

# VƏ YA Makefile ilə (tövsiyə olunur)
make start-snap
```

---

## 📋 Əsas Komandlar

### Makefile (Tövsiyə Olunur)

```bash
make help          # Bütün komandaları göstər
make start         # Normal start
make start-snap    # Snapshot ilə start
make snapshot      # Yeni snapshot yarat
make restore       # Snapshot-dan restore et
make list-snaps    # Mövcud snapshot-ları göstər
make status        # Sistem statusu
make fresh         # Production data + snapshot (clean start)
```

### Direct Scripts

```bash
./backup_dev_snapshot.sh       # Snapshot yarat
./restore_dev_snapshot.sh      # Snapshot-dan restore et
USE_DEV_SNAPSHOT=true ./start.sh  # Start.sh-da snapshot aktiv et
```

---

## 🔄 İstifadə Ssenariləri

### Scenario 1: Gündəlik Development
```bash
# Səhər işə başlayanda
make start-snap     # Snapshot ilə sürətli başla (5 saniyə)

# İşdən çıxanda
make stop           # Sistemi dayandır
```

### Scenario 2: Data Dəyişiklikləri
```bash
# Database-də manual dəyişiklik etdikdən sonra
make snapshot       # Yeni snapshot götür

# Növbəti dəfə bu data ilə başlamaq üçün
make start-snap
```

### Scenario 3: Təmiz Başlanğıc
```bash
# Production data yenidən lazımdırsa
make fresh          # Production restore + snapshot yarat
```

### Scenario 4: Data İtdisə (Disaster Recovery)
```bash
# Əgər data itibsə
make restore        # Snapshot-dan restore et

# VƏ YA
./restore_dev_snapshot.sh
```

---

## 📊 Snapshot Sistemi Necə İşləyir?

### 1. Snapshot Yaratma
```
Backend Database
       ↓
pg_dump (PostgreSQL native)
       ↓
backend/database/snapshots/dev_snapshot.sql (164MB)
       ↓
Timestamped backup (son 5-i saxlanılır)
```

### 2. Snapshot Restore
```
dev_snapshot.sql
       ↓
psql restore (5 saniyə)
       ↓
Backend Database (tam vəziyyətə qayıdır)
```

### 3. Start.sh Logic
```
start.sh çağırıldı
       ↓
USE_DEV_SNAPSHOT=true?
   ├─ Yes → Snapshot tapıldı? → Restore et → DONE ✅
   └─ No  → User count > 0? → Skip migration → DONE ✅
                           └─ 0 → Migration + Seeder → DONE ✅
```

---

## 🔒 Data Qoruma Mexanizmi

### Avtomatik Data Preservation

`start.sh` artıq **smart data detection** istifadə edir:

```bash
# Əgər database-də İSTƏNİLƏN data varsa:
if [ "$user_count" -gt 0 ]; then
    print_success "🔒 DATA DETECTED! Skipping migrations."
    return 0  # Migration və seeder skip edilir
fi
```

**Bu o deməkdir ki**:
- ✅ Production data (>100 users) qorunur
- ✅ Development data (1-100 users) qorunur
- ✅ Test data (custom entries) qorunur
- ✅ Yalnız **tamamilə boş database** migration alır

---

## 📁 Fayl Strukturu

```
ATİS/
├── backup_dev_snapshot.sh          # Snapshot yarat
├── restore_dev_snapshot.sh         # Snapshot restore et
├── start.sh                        # (Modifikasiya) Snapshot support
├── Makefile                        # Quick commands
├── backend/database/snapshots/
│   ├── dev_snapshot.sql           # Son snapshot
│   └── dev_snapshot_*.sql         # Timestamped backups (son 5)
└── .gitignore                      # (Update) Snapshots ignore
```

---

## ⚙️ Konfiqurasiya

### Environment Variables

```bash
# Snapshot ilə start
USE_DEV_SNAPSHOT=true ./start.sh

# Auto restore (interactive prompt skip)
AUTO_RESTORE=true ./restore_dev_snapshot.sh
```

### Snapshot Settings

**Default Settings** (dəyişə bilərsiniz):
- **Snapshot location**: `backend/database/snapshots/`
- **Timestamped backup count**: Son 5 saxlanılır
- **Auto cleanup**: Hə, köhnələri avtomatik silinir

---

## 🔍 Troubleshooting

### Problem: Snapshot restore xəta verir

**Həll**:
```bash
# 1. PostgreSQL işləyir?
docker ps | grep atis_postgres

# 2. Snapshot faylı var?
ls -lh backend/database/snapshots/dev_snapshot.sql

# 3. Yeni snapshot yarat
make snapshot
```

### Problem: Data hələ də itir

**Səbəb**: `docker compose down -v` (volumes silir)

**Həll**:
```bash
# DÜZGÜN: Volumes qoru
docker compose down
docker compose up -d

# YALNIZ FRESH START LAZIMSA:
docker compose down -v  # Volumes SİLİR!
```

### Problem: Snapshot çox böyükdür

**Faktlar**:
- Production data snapshot: ~164MB
- Disk space: Minimal (5 snapshot = ~800MB)

**Opsional Optimization**:
```bash
# Yalnız 1 snapshot saxla
# backup_dev_snapshot.sh-da dəyişdirin:
ls -t dev_snapshot_*.sql | tail -n +2 | xargs rm -f
```

---

## 📈 Performance

| Əməliyyat | Müddət | Qeydlər |
|-----------|---------|---------|
| Production Restore | 10-20 dəq | İlk dəfə lazımdır |
| Snapshot Create | 5-10 san | pg_dump |
| Snapshot Restore | 5-10 san | psql < snapshot.sql |
| Normal Start | 30 san | Migration skip |
| Start (empty DB) | 2-3 dəq | Migration + seeder |

**Nəticə**: Snapshot sistemi **100x** daha sürətlidir!

---

## 🎓 Best Practices

### 1. Gündəlik Snapshot Götürün
```bash
# Hər gün axşam (data dəyişibsə)
make snapshot
```

### 2. Production Sync (Həftəlik)
```bash
# Həftədə bir dəfə production data yenilə
make fresh
```

### 3. Test Əvvəl Snapshot
```bash
# Böyük dəyişiklik edəndə əvvəl snapshot
make snapshot
# Sonra test et
# Əgər problem olarsa:
make restore
```

### 4. Clean Workflow
```bash
# Yeni feature başlayanda:
make snapshot        # Current state-i save et
# Development...
git commit          # Code commit
# Əgər DB dəyişdi:
make snapshot       # DB state update
```

---

## 🔐 Security & Privacy

- ✅ Snapshots `.gitignore`-da (commit olunmur)
- ✅ Local only (shared edilmir)
- ✅ Production credentials təhlükəsiz (snapshot-da saxlanmır)
- ✅ Sensitive data qalır (manual clean lazım deyil)

---

## 📝 Changelog

### v1.0.0 (2025-12-22)
- ✅ Initial snapshot system
- ✅ backup_dev_snapshot.sh
- ✅ restore_dev_snapshot.sh
- ✅ start.sh smart data detection
- ✅ Makefile quick commands
- ✅ Auto cleanup (keep last 5)
- ✅ .gitignore update

---

## 🤝 Contributing

Əgər snapshot sistemini təkmilləşdirmək istəyirsinizsə:

1. Yeni feature test edin
2. Documentation update edin
3. Team ilə paylaşın

---

## 📞 Support

Problem olarsa:
1. `make help` - Bütün komandalar
2. `make status` - Current status
3. `./restore_dev_snapshot.sh` - Disaster recovery

---

**🎉 Artıq development data itkisi yoxdur!**
