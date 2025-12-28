# 🧪 ATİS Sistem Test Bələdçisi

## 📋 Ümumi Məlumat

Bu sənəd ATİS sisteminin manual testləri üçün bələdçidir. Bütün əsas funksionallıqların test edilməsi və sistemin düzgün işlədiyindən əmin olmaq üçün istifadə olunur.

**Son yeniləmə**: 2025-12-28
**Test ediləcək sistem**: Teacher Rating System + Core ATİS

---

## 🚀 SİSTEM BAŞLATMA VƏ DAYANDIRMA

### 1. Sistemin Başladılması

```bash
# Əsas başlatma komutu
./start.sh

# Snapshot-dan avtomatik restore ilə başlatma
USE_DEV_SNAPSHOT=true ./start.sh
```

**Gözlənilən nəticə:**
```
✅ ATİS Sistemi hazırdır!

🌐 URLs:
   Frontend: http://localhost:3000
   Backend API: http://localhost:8000/api

🔑 Login məlumatları:
   superadmin / admin123
   admin / admin123
```

**Yoxlanmalı olan:**
- [ ] Docker containers işə düşür (atis_backend, atis_frontend, atis_postgres, atis_redis)
- [ ] Backend hazır olur (http://localhost:8000/api/health)
- [ ] Frontend hazır olur (http://localhost:3000)
- [ ] Database migrationları çalışır (yalnız boş DB-də)
- [ ] Seederlər çalışır (yalnız boş DB-də)

### 2. Sistemin Dayandırılması

```bash
# Normal dayandırma
./stop.sh

# Məcburi dayandırma
./stop.sh --force

# Log təmizləməklə dayandırma
./stop.sh --clean-logs
```

**Yoxlanmalı olan:**
- [ ] Bütün Docker containers dayandırılır
- [ ] Port 3000, 8000, 5432 azad olur
- [ ] Heç bir ATİS prosesi işləmir

### 3. Sistem Statusunun Yoxlanması

```bash
# Container statusu
docker compose ps

# Backend logs
docker compose logs backend -f

# Frontend logs
docker compose logs frontend -f

# PostgreSQL logs
docker compose logs postgres -f

# Bütün servislər
docker compose logs -f
```

---

## 💾 DATABASE BACKUP VƏ RESTORE

### 1. Development Snapshot Yaratmaq

```bash
# Snapshot yarat
./backup_dev_snapshot.sh
```

**Gözlənilən nəticə:**
```
✅ Snapshot yaradıldı: backend/database/snapshots/dev_snapshot.sql
📊 Database statistikası:
   Users: X
   Institutions: X
   Snapshot size: X MB
```

**Yoxlanmalı olan:**
- [ ] `backend/database/snapshots/dev_snapshot.sql` yaradılır
- [ ] Timestamped backup yaradılır (`dev_snapshot_YYYYMMDD_HHMMSS.sql`)
- [ ] Köhnə snapshot-lar təmizlənir (son 5-i qalır)
- [ ] User və institution sayı düzgün göstərilir

### 2. Snapshot-dan Restore Etmək

```bash
# Manual restore (təsdiq tələb olunur)
./restore_dev_snapshot.sh

# Avtomatik restore (təsdiqlə bağlı)
AUTO_RESTORE=true ./restore_dev_snapshot.sh
```

**Gözlənilən nəticə:**
```
✅ Dev snapshot uğurla restore edildi!
📊 Database statistikası:
   Users: X
   Institutions: X
```

**Yoxlanmalı olan:**
- [ ] Snapshot fayl mövcuddur
- [ ] PostgreSQL container işləyir
- [ ] Aktiv bağlantılar bağlanır
- [ ] Database restore olunur
- [ ] User və institution sayı düzgün göstərilir
- [ ] Restore sonrası login işləyir

### 3. Snapshot ilə Restart

```bash
# Sistemi dayandır
./stop.sh

# Snapshot ilə yenidən başlat
USE_DEV_SNAPSHOT=true ./start.sh
```

**Yoxlanmalı olan:**
- [ ] Sistem dayandırılır
- [ ] Yenidən başlayanda snapshot aşkarlanır
- [ ] Snapshot avtomatik restore olunur
- [ ] Sistem tam hazır olur

---

## 🎓 TEACHER RATING SYSTEM TEST

### 1. Frontend Build Test

```bash
# Production build
cd frontend
npm run build

# Build məlumatlarını yoxla
ls -lh dist/
```

**Gözlənilən nəticə:**
```
✓ built in ~21-22s

Teacher Rating bundles:
- TeacherRatingHeader-*.js: ~18 kB
- RegionAdminTeacherRating-*.js: ~18 kB
- TeacherRatingImport-*.js: ~12 kB
- TeacherRatingConfiguration-*.js: ~11 kB
- TeacherRatingLeaderboard-*.js: ~11 kB
- TeacherOwnRating-*.js: ~9 kB
- TeacherRatingProfile-*.js: ~7 kB
- TeacherRatingComparison-*.js: ~6 kB
```

**Yoxlanmalı olan:**
- [ ] Build uğurla tamamlanır
- [ ] TypeScript xətası yoxdur
- [ ] Bütün teacher rating komponentləri build olunur
- [ ] Bundle ölçüləri gözlənilən ölçüdədir

### 2. Navigation Menu Test

**URL**: http://localhost:3000

**Login**: SuperAdmin / RegionAdmin / Teacher hesabı ilə

**Yoxlanmalı olan:**

#### SuperAdmin üçün (superadmin / admin123):
- [ ] Sidebar-da "Müəllim Reytinqi" menu qrupu görsənir
- [ ] 6 menu item görsənir:
  - [ ] Reytinq Siyahısı
  - [ ] İdxal
  - [ ] Lider Lövhəsi
  - [ ] Müqayisə
  - [ ] Konfiqurasiya (SuperAdmin only)
  - [ ] Mənim Reytinqim (yalnız müəllim rolunda)

#### RegionAdmin üçün (admin / admin123):
- [ ] "Müəllim Reytinqi" menu qrupu görsənir
- [ ] 5 menu item görsənir (Konfiqurasiya yoxdur)

#### Teacher üçün:
- [ ] "Mənim Reytinqim" menu item görsənir
- [ ] Digər reytinq menu items görsənmir

### 3. Səhifə Routing Test

#### RegionAdmin Routes:

**1. Reytinq Siyahısı** - `/regionadmin/teacher-rating`
- [ ] Səhifə yüklənir
- [ ] Statistics cards görsənir (Ümumi, Aktiv, Qeyri-aktiv, Orta reytinq)
- [ ] Filter panel görsənir (8 filter)
- [ ] Table/Grid view toggle işləyir
- [ ] "Hamısını Hesabla" button görünür
- [ ] "İdxal" və "İxrac" buttons görünür

**2. Müəllim Profili** - `/regionadmin/teacher-rating/profile/:id`
- [ ] Teacher header görsənir
- [ ] 3 tab var: Ümumi Baxış, Komponentlər, Tərəqqi
- [ ] Academic year selector işləyir
- [ ] Breakdown chart render olunur
- [ ] 4 ranking card görsənir (məktəb, rayon, region, fənn)
- [ ] "Redaktə" və "İxrac" buttons görünür

**3. İdxal** - `/regionadmin/teacher-rating/import`
- [ ] 3-tab wizard görsənir (Awards, Certificates, Academic Results)
- [ ] Template download buttons işləyir
- [ ] File upload area görsənir
- [ ] Instructions və notes görsənir

**4. Lider Lövhəsi** - `/regionadmin/teacher-rating/leaderboard`
- [ ] Scope selector görsənir (məktəb, rayon, region, fənn)
- [ ] Academic year filter işləyir
- [ ] Top 20 table görsənir
- [ ] Medal badges görsənir (🥇🥈🥉)
- [ ] Export button işləyir

**5. Müqayisə** - `/regionadmin/teacher-rating/comparison`
- [ ] District selector görsənir
- [ ] School comparison chart render olunur
- [ ] Statistics panel görsənir

**6. Konfiqurasiya** - `/regionadmin/teacher-rating/configuration` (SuperAdmin only)
- [ ] Permission yoxlanır (403 error RegionAdmin üçün)
- [ ] SuperAdmin üçün 3 tab görsənir (Weights, Growth Bonus, System Info)
- [ ] Weight sliders işləyir (sum = 100 validation)
- [ ] Save/Reset buttons işləyir

#### Teacher Routes:

**Mənim Reytinqim** - `/teacher/rating/profile`
- [ ] useAuth context işləyir (currentUser)
- [ ] Personal rating display görsənir
- [ ] Academic year selector işləyir
- [ ] Component breakdown chart render olunur
- [ ] 4 ranking display görsənir
- [ ] Progress chart görsənir (əgər data varsa)
- [ ] Improvement tips section görsənir (6 kateqoriya)
- [ ] Edit və Export buttons GÖRÜNMÜR (read-only)

### 4. Component Test

#### Filters Test:
- [ ] Search input - debounce işləyir
- [ ] Academic year select - dəyişikliklər yadda qalır
- [ ] School select - API-dan məlumat yüklənir
- [ ] Subject select - API-dan məlumat yüklənir
- [ ] Age band select - 5 option görsənir (20-29, 30-39, 40-49, 50-59, 60+)
- [ ] Status select - 3 option (Hamısı, Aktiv, Qeyri-aktiv)
- [ ] Min/Max score - number validation işləyir (0-100)
- [ ] "Sıfırla" button - bütün filterləri təmizləyir

#### Table Test:
- [ ] Medal badges - rank 1-3 üçün (🥇🥈🥉)
- [ ] Color-coded scores - total score rəng kodlaşdırması
- [ ] Sorting - bütün columnlarda işləyir
- [ ] Pagination - 20/50/100 per page seçimləri
- [ ] Actions dropdown - View və Calculate options
- [ ] Responsive - mobile-da düzgün görsənir

#### Charts Test:
- [ ] **RatingBreakdownChart** - 6 komponent stacked bar (Recharts)
- [ ] **RatingProgressChart** - line chart illik müqayisə
- [ ] **ComponentScoreCard** - fərdi komponent progress bar
- [ ] Tooltip işləyir
- [ ] Responsive container işləyir

### 5. Permission Test

**Test ediləcək icazələr:**
- `teacher_rating.view` - RegionAdmin, RegionOperator, SektorAdmin
- `teacher_rating.manage` - RegionAdmin
- `teacher_rating.export` - RegionAdmin, RegionOperator
- `teacher_rating.calculate` - RegionAdmin
- `teacher_rating.configure` - SuperAdmin only
- `teacher_rating.view_own` - Teacher

**Test senariləri:**

1. **RegionAdmin** (admin / admin123):
   - [ ] Bütün səhifələrə giriş var (Konfiqurasiya xaric)
   - [ ] Calculate button görünür və işləyir
   - [ ] Export button görünür və işləyir
   - [ ] Edit button görünür

2. **RegionOperator**:
   - [ ] View və Export icazəsi var
   - [ ] Calculate və Edit yoxdur

3. **SektorAdmin**:
   - [ ] Yalnız Lider Lövhəsinə baxış icazəsi

4. **Teacher**:
   - [ ] Yalnız özünün reytinqinə baxa bilir
   - [ ] Digər səhifələrə giriş yoxdur (403 error)

### 6. API Integration Test

**Backend hazır olmalıdır!**

```bash
# Backend container-də API test
docker exec atis_backend php artisan tinker

# API endpoints yoxla
curl http://localhost:8000/api/teacher-rating/teachers
curl http://localhost:8000/api/teacher-rating/leaderboard
curl http://localhost:8000/api/academic-years
```

**Test ediləcək API calls:**

1. **GET /api/teacher-rating/teachers** - List all teachers
   - [ ] Filter parametrləri işləyir (search, schoolId, etc.)
   - [ ] Pagination işləyir
   - [ ] Response correct format

2. **GET /api/teacher-rating/teachers/:id** - Get teacher profile
   - [ ] Teacher məlumatları gəlir
   - [ ] Latest rating data gəlir

3. **POST /api/teacher-rating/calculate/:id** - Calculate rating
   - [ ] Rating hesablanır
   - [ ] Breakdown düzgün calculate olunur
   - [ ] Rankings update olunur

4. **GET /api/teacher-rating/leaderboard** - Get leaderboard
   - [ ] Scope parametri işləyir (school, district, region, subject)
   - [ ] Top 20 gəlir
   - [ ] Sıralama düzgündür

5. **POST /api/teacher-rating/export** - Export data
   - [ ] Excel fayl generate olunur
   - [ ] Filters tətbiq olunur
   - [ ] Download işləyir

---

## 🔐 AUTHENTİCATİON VƏ SESSION TEST

### 1. Login Test

**URL**: http://localhost:3000/login

**Test accounts:**
```
SuperAdmin: superadmin@atis.az / admin123
RegionAdmin: admin@atis.az / admin123
Teacher: (DB-dən götür)
```

**Yoxlanmalı olan:**
- [ ] Login form görsənir
- [ ] Email və password validation işləyir
- [ ] Səhv credentials-da error mesajı
- [ ] Düzgün credentials-da redirect dashboard-a
- [ ] Session token yaradılır (localStorage-da)
- [ ] currentUser context populate olunur

### 2. Session Test

```bash
# Browser console-da
console.log(localStorage.getItem('auth_token'))
console.log(JSON.parse(localStorage.getItem('user')))
```

**Yoxlanmalı olan:**
- [ ] Token saxlanılır
- [ ] User məlumatları saxlanılır
- [ ] Refresh page-dən sonra session qalır
- [ ] Logout-dan sonra token təmizlənir

### 3. Permission-based Rendering Test

**Components yoxlanmalı:**
- [ ] Navigation menu items - role-based görsənir
- [ ] Action buttons - permission-based görsənir/gizlənir
- [ ] Routes - unauthorized access 403 qaytarır
- [ ] API calls - backend permission yoxlaması işləyir

---

## 🐛 DEBUGGING VƏ LOG YOXLAMASI

### 1. Frontend Errors

```bash
# Browser console yoxla
F12 (Developer Tools) → Console tab

# Network requests yoxla
F12 → Network tab → Filter: API calls

# React DevTools yoxla
F12 → Components tab (əgər quraşdırılıbsa)
```

**Yoxlanmalı olan:**
- [ ] Console-da error yoxdur
- [ ] API calls 200/201 status code
- [ ] React component render errors yoxdur

### 2. Backend Logs

```bash
# Container logs
docker compose logs backend -f

# Laravel logs
docker exec atis_backend tail -f storage/logs/laravel.log

# Database queries (əgər debug aktivdirsə)
docker compose logs backend | grep "SELECT"
```

**Yoxlanmalı olan:**
- [ ] 500 errors yoxdur
- [ ] Database query errors yoxdur
- [ ] Permission errors düzgün log olunur

### 3. Database Connection Test

```bash
# PostgreSQL connection
docker exec atis_postgres psql -U atis_dev_user -d atis_dev

# Check tables
\dt

# Check data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM institutions;
SELECT COUNT(*) FROM teacher_rating_profiles;
SELECT COUNT(*) FROM teacher_rating_results;

# Exit
\q
```

---

## ✅ MANUAL TEST CHECKLIST

### Başlatma və Dayandırma
- [ ] `./start.sh` uğurla işləyir
- [ ] Bütün 4 container işə düşür
- [ ] Frontend və Backend hazır olur
- [ ] Database migration və seeder işləyir (boş DB-də)
- [ ] `./stop.sh` bütün prosesləri dayandırır

### Database Backup
- [ ] `./backup_dev_snapshot.sh` snapshot yaradır
- [ ] `./restore_dev_snapshot.sh` snapshot-dan restore edir
- [ ] `USE_DEV_SNAPSHOT=true ./start.sh` avtomatik restore işləyir
- [ ] Köhnə snapshot-lar avtomatik təmizlənir

### Teacher Rating - Navigation
- [ ] Menu items role-based görsənir
- [ ] Bütün səhifə route-ları işləyir
- [ ] Permission yoxlamaları düzgün işləyir
- [ ] Unauthorized access 403 qaytarır

### Teacher Rating - Components
- [ ] Filterlər işləyir və data yenilənir
- [ ] Table sorting və pagination işləyir
- [ ] Charts düzgün render olunur (Recharts)
- [ ] Modal-lar açılıb bağlanır
- [ ] Form validation işləyir

### Teacher Rating - API Integration
- [ ] List API call işləyir
- [ ] Profile API call işləyir
- [ ] Calculate API call işləyir
- [ ] Leaderboard API call işləyir
- [ ] Export API call işləyir

### Teacher Rating - Permissions
- [ ] SuperAdmin bütün səhifələrə giriş edə bilir
- [ ] RegionAdmin konfiqurasiya xaric hər yerə giriş edə bilir
- [ ] Teacher yalnız özünün reytinqini görür
- [ ] Role-based buttons görsənir/gizlənir

### Production Build
- [ ] `npm run build` uğurla işləyir
- [ ] TypeScript errors yoxdur
- [ ] Bundle ölçüləri optimal (~5-20 kB per page)
- [ ] Lazy loading işləyir

### Browser Testing
- [ ] Chrome-da işləyir
- [ ] Firefox-da işləyir
- [ ] Safari-da işləyir
- [ ] Mobile responsive-dir
- [ ] Console errors yoxdur

---

## 🚨 PROBLEM SOLVING

### Port məşğul olduqda:

```bash
# Portları force kill et
lsof -ti:3000,8000,5432 | xargs kill -9

# Və ya
./stop.sh --force
```

### Docker problemi olduqda:

```bash
# Containers-ı sıfırla
docker compose down -v
docker system prune -af

# Yenidən başlat
./start.sh
```

### Database problemi olduqda:

```bash
# Fresh database
docker compose down -v
./start.sh

# Və ya snapshot restore
./restore_dev_snapshot.sh
```

### Build problemi olduqda:

```bash
# Node modules təmizlə
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📝 TEST NOTES

**Test zamanı qeydlər:**
- Tarixi: _______________
- Tester: _______________
- Environment: Development / Production
- Database: Empty / Snapshot / Production

**Tapılan problemlər:**
1. _______________________________________
2. _______________________________________
3. _______________________________________

**Həll edilməli olan:**
1. _______________________________________
2. _______________________________________
3. _______________________________________

---

**Son yeniləmə**: 2025-12-28
**Müəllif**: Claude Code Assistant
**Versiya**: 1.0
