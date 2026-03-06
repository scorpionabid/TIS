# Davamiyyət Hesabatları — Dəqiq Texniki Plan
**Son yenilənmə:** 2026-02-20 | **Status:** Faza 1 tamamlandı, Faza 2 planlaşdırılır

---

## 1. Mövcud Sistem Arxitekturası (Aktual Vəziyyət)

### 1.1 Endpoint Xəritəsi

| HTTP | Endpoint | Controller Metod | İstifadəçi |
|------|----------|-----------------|-----------|
| GET | `/api/school-attendance/reports` | `reports()` (sətir 353) | Bütün rollar |
| GET | `/api/school-attendance/stats` | `stats()` (sətir 283) | Bütün rollar |
| GET | `/api/school-attendance/schools/{id}/classes` | `getSchoolClasses()` (sətir 594) | Bütün rollar |
| GET | `/api/school-attendance/export` | `export()` (sətir 719) | Bütün rollar |

**Fayl:** `backend/app/Http/Controllers/SchoolAttendanceController.php`

### 1.2 Frontend Servis Arxitekturası

```
frontend/src/pages/AttendanceReports.tsx
    └── attendanceService  (frontend/src/services/attendance.ts)
            ├── getAttendanceReports()  → GET /api/school-attendance/reports
            ├── getAttendanceStats()   → GET /api/school-attendance/stats
            ├── getSchoolClasses()     → GET /api/school-attendance/schools/{id}/classes
            └── exportAttendance()    → GET /api/school-attendance/export

frontend/src/services/bulkAttendance.ts  ← Hesabat üçün ARTIQ İSTİFADƏ OLUNMUR
```

### 1.3 Backend İcazə Filtri (`applyUserFiltering`, sətir 937-987)

| Rol | Görünən Məlumat |
|-----|----------------|
| SuperAdmin | Bütün məktəblər |
| RegionAdmin | Öz regionuna bağlı bütün məktəblər |
| SektorAdmin | Öz sektoruna bağlı məktəblər |
| SchoolAdmin / Müəllim | Yalnız öz məktəbi |

---

## 2. Tamamlanan İşlər (Faza 1) ✅

### 2.1 Servis Vahidliyinin Təmin Edilməsi
**Dəyişiklik:** `frontend/src/pages/AttendanceReports.tsx`

**Əvvəl (köhnə kod):**
```typescript
// SchoolAdmin üçün ayrı blok var idi:
if (isSchoolAdmin) {
    bulkAttendanceService.getAttendanceReports(...)
    bulkAttendanceService.getAttendanceStats(...)
}
```

**İndi (aktual vəziyyət, sətir 221-311):**
```typescript
// Bütün rollar üçün vahid sorğu:
useQuery({
    queryKey: ['attendance-reports', ...],
    queryFn: () => attendanceService.getAttendanceReports(filters),
})
```

**Nəticə:** SchoolAdmin-lər artıq `/schooladmin/bulk-attendance/weekly-summary` əvəzinə `/api/school-attendance/reports` endpoint-inə müraciət edir.

---

### 2.2 Həftəlik / Aylıq Qruplaşdırma
**Fayl:** `backend/app/Http/Controllers/SchoolAttendanceController.php`

| `group_by` Parametri | Backend Davranışı | Qaytarılan Format |
|---------------------|------------------|------------------|
| `daily` | `paginate($perPage)` (sətir 490-494) | `{ date, class_name, start_count, end_count, ... }` |
| `weekly` | Həftə başı Bazar ertəsi (sətir 524) | `{ date_label: "01.01 - 07.01.2026", range_start, range_end, ... }` |
| `monthly` | `translatedFormat('F Y')` (sətir 527-537) | `{ date_label: "Yanvar 2026", ... }` |

**Frontend Ayrımı** (`frontend/src/pages/AttendanceReports.tsx`, sətir 301-315):
```typescript
const isDailyView = reportType === 'daily';
// Günlük üçün: server-side pagination göstərilir
// Həftəlik/Aylıq üçün: per_page=500 göndərilir (tam yüklənir)
```

---

### 2.3 Server-side Pagination (Günlük Görünüş)
**Backend** (`SchoolAttendanceController.php`, sətir 60-73):
```php
$perPage = $request->get('per_page', 15);
$records = $query->paginate($perPage);
// Meta: { current_page, last_page, per_page, total, from, to }
```

**Frontend** (`AttendanceReports.tsx`, sətir 301-311):
```typescript
const totalRecords    = attendanceMeta?.total        ?? attendanceData.length;
const paginationPages = attendanceMeta?.last_page    ?? Math.ceil(totalRecords / perPage);
```

---

### 2.4 Sorting Dəstəyi
**Backend sort xəritəsi** (`SchoolAttendanceController.php`, sətir 405-419):

| Frontend Dəyəri | Backend Sütunu |
|-----------------|---------------|
| `date` | `attendance_date` |
| `class_name` | `grades.name` (LEFT JOIN) |
| `attendance_rate` | `daily_attendance_rate` |
| `first_lesson` | `morning_present` |
| `last_lesson` | `evening_present` |

---

## 3. Faza 2 İcra Nəticəsi ✅ (2026-02-20)

### Tamamlanan işlər:
| # | Dəyişiklik | Status |
|---|-----------|--------|
| 3.3 | Export-da `group_by` dəstəyi | ✅ |
| 3.2 | Real trend hesablaması (period müqayisəsi) | ✅ |
| 4.1 | `bulkAttendance.ts` — köhnə metodlar silindi | ✅ |
| QA | `npm run lint`, `npm run typecheck` — sıfır xəta | ✅ |
| QA | `php artisan test --filter=Attendance` — 7/7 keçdi | ✅ |

### Edilməyən (analiz nəticəsi — gərəksiz):
- 3.1 Həftəlik/aylıq pagination: Agregat nəticə max 52 sətir, `per_page=500` kifayətdir.
- 3.4 Sinif siyahısı staleTime: Artıq `5 * 60 * 1000` olaraq tənzimlənmişdi.

---

## 4. Açıq Problemlər (Gələcək Faza) 🔴

### 4.1 Həftəlik/Aylıq Performans (SQL Refaktoru)
**Problem:** `per_page=500` ilə bütün məlumat bir anda yüklənir.
- Böyük məktəblərdə (500+ şagird × 30 gün = 15.000+ qeyd) memory problemi yarana bilər.
- Həftəlik/aylıq görünüşdə pagination UI gizlədilir amma həqiqi server-side pagination yoxdur.

**Həll Planı:**
```typescript
// AttendanceReports.tsx dəyişikliyi:
// weekly/monthly üçün paginate parametri əlavə et:
if (!isDailyView) {
    params.per_page = 50;  // 500 əvəzinə
    params.page = page;
}
// Cədvəl altında pagination göstər
```

---

### 4.2 Statistika Trend Hesablamasının Dəqiqliyi ✅ (Faza 2-də həll edildi)
**Mövcud məntiq** (`stats()`, sətir 330-331):
```php
≥ 90%  → 'up'
80-90% → 'stable'
< 80%  → 'down'
```

**Problem:** Bu statik hədd dəyərləridir, real trend deyil.
Real trend = bugünkü orta% vs ötən həftənin ortası%.

**Həll Planı:**
```php
// stats() metodunda əlavə hesablama:
$currentPeriodRate  = ... // sorğu dövrü ortası
$previousPeriodRate = ... // əvvəlki eyni uzunluqlu dövr
$trend = $currentPeriodRate > $previousPeriodRate + 2 ? 'up'
       : ($currentPeriodRate < $previousPeriodRate - 2 ? 'down' : 'stable');
```

---

### 4.3 Export Funksiyasında Həftəlik/Aylıq Format ✅ (Faza 2-də həll edildi)
**Problem:** `exportAttendance()` (`attendance.ts`, sətir 331) yalnız günlük formatda export edir.
Həftəlik/aylıq görünüşdə export edilən fayl günlük qeydlər göstərir.

**Həll Planı:**
- Backend `export()` metoduna `group_by` parametri əlavə et
- Həftəlik export-da qruplaşdırılmış sütunlar (həftə başlanğıcı, bitiş, orta %)

---

### 4.4 Sinif Siyahısı Cache ✅ (Artıq 5 dəq idi)
**Mövcud vəziyyət** (`AttendanceReports.tsx`, sətir 345):
```typescript
queryFn: () => attendanceService.getSchoolClasses(selectedSchool),
staleTime: 0  // hər dəfə yenidən yüklənir
```

**Həll Planı:**
```typescript
staleTime: 5 * 60 * 1000  // 5 dəqiqə cache
```

---

## 5. Texniki Borc (Technical Debt)

| # | Problem | Fayl | Prioritet | Status |
|---|---------|------|-----------|--------|
| 1 | `bulkAttendance.ts`-dəki `getAttendanceReports()` hələ durur, konfuziya yaradır | `frontend/src/services/bulkAttendance.ts` sətir 407 | Orta | ✅ Silindi |
| 2 | `attendance.ts`-dəki `getClassesByInstitution()` ilə `getSchoolClasses()` duplikat | `frontend/src/services/attendance.ts` sətir 366, 385 | Aşağı | Açıq |
| 3 | Weekly/Monthly görünüşdə `per_page=500` hardcoded | `frontend/src/pages/AttendanceReports.tsx` sətir 256-258 | Analiz: gərəksiz | ✅ Bağlandı |

---

## 6. Keyfiyyət Yoxlaması Nəticələri

| Test | Faza | Status |
|------|------|--------|
| `npm run lint` | 1 + 2 | ✅ Sıfır xəta |
| `npm run typecheck` | 1 + 2 | ✅ Sıfır xəta |
| `php artisan test --filter=Attendance` | 2 | ✅ 7/7 keçdi (28 assertion) |
| SchoolAdmin → reports endpoint sorğusu | 1 | ✅ Yalnız öz məktəbi görünür |
| RegionAdmin → reports endpoint sorğusu | 1 | ✅ Region məktəbləri görünür |
| Həftəlik qruplaşdırma | 1 | ✅ Düzgün format qaytarılır |
| Aylıq qruplaşdırma | 1 | ✅ Azərbaycanca ay adı qaytarılır |
| Günlük pagination | 1 | ✅ `paginate(15)` işləyir |
| Export həftəlik → qruplaşdırılmış CSV | 2 | ✅ Tətbiq edildi |
| Export aylıq → qruplaşdırılmış CSV | 2 | ✅ Tətbiq edildi |
| Trend: real dövr müqayisəsi | 2 | ✅ Tətbiq edildi |

---

## 7. Faza 2 İcra Sırası (Tamamlandı)

```
Prioritet 1 (Bu həftə):
  └── 3.3 Export-da group_by dəstəyi
  └── 3.4 Sinif siyahısı staleTime düzəltməsi

Prioritet 2 (Növbəti sprint):
  └── 3.1 Həftəlik/aylıq pagination
  └── 3.2 Real trend hesablaması

Texniki borc (zaman tapıldıqda):
  └── 4.1 bulkAttendance.ts-dən köhnə metodları sil
  └── 4.2 Duplikat getSchoolClasses metodunu birləşdir
```

---

## 7. Əlaqəli Fayllar Sorğu Yolu

```
backend/
  app/Http/Controllers/SchoolAttendanceController.php
    ├── stats()    [sətir 283]
    ├── reports()  [sətir 353]
    └── applyUserFiltering() [sətir 937]

frontend/
  src/pages/AttendanceReports.tsx
    ├── useQuery (reports)  [sətir 221]
    ├── useQuery (stats)    [sətir 271]
    └── pagination logic    [sətir 301]
  src/services/attendance.ts
    ├── getAttendanceReports()  [sətir 166]
    └── getAttendanceStats()    [sətir 187]
  src/services/bulkAttendance.ts
    └── getAttendanceReports()  [sətir 407] ← KÖHNƏ, silinməlidir
```
