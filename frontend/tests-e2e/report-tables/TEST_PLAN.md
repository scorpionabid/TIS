# Report Tables E2E Test Plan

## Task 8: Approval Flow & Grouping Testing

### 1. Approve Flow Tests

#### Test 1.1: Single Row Approval Flow
**Steps:**
1. SuperAdmin kimi login ol
2. Report Tables səhifəsinə keç
3. "Təsdiq gözləyir" tab-ına kliklə
4. Cədvəli expand et (Table → Sector → School)
5. Gözləyən sətri tap və "Təsdiqlə" düyməsinə kliklə
6. "Hazır" tab-ına keç
7. Təsdiqlənmiş sətirin orada olduğunu yoxla

**Expected Result:**
- Sətir "Təsdiq gözləyir" tab-ından yox olur
- Sətir "Hazır" tab-ında görünür
- Sətir statusu "approved" olur

#### Test 1.2: Reject Row Flow
**Steps:**
1. "Təsdiq gözləyir" tab-ında rədd ediləcək sətri tap
2. "Rədd et" düyməsinə kliklə
3. Səbəb yaz (məsələn: "Məlumat natamamdır")
4. Təsdiqlə

**Expected Result:**
- Sətir statusu "rejected" olur
- Məktəb admini sətri yenidən redaktə edə bilir

#### Test 1.3: Bulk Approval
**Steps:**
1. "Təsdiq gözləyir" tab-ında bir neçə sətir seç (checkbox-lar)
2. "Seçilənləri təsdiqlə" düyməsinə kliklə

**Expected Result:**
- Bütün seçilmiş sətirlər təsdiqlənir
- Uğurlu toast mesajı göstərilir

---

### 2. Grouping Correctness Tests

#### Test 2.1: Table → Sector → School Hierarchy
**Steps:**
1. "Təsdiq gözləyir" tab-ına keç
2. Cədvəlin adına kliklə (expand)
3. Sektor adlarını gör
4. Sektoru expand et
5. Məktəbləri gör

**Expected Result:**
```
📋 Cədvəl Adı (5 gözləyən)
  ├─ 📁 1-ci Sektor (3 gözləyən)
  │   ├─ 🏫 Məktəb A (2 gözləyən)
  │   └─ 🏫 Məktəb B (1 gözləyən)
  └─ 📁 2-ci Sektor (2 gözləyən)
      └─ 🏫 Məktəb C (2 gözləyən)
```

#### Test 2.2: Ready Tab Grouping
**Steps:**
1. "Hazır" tab-ına keç
2. Eyni hierarchy strukturunun olduğunu yoxla

**Expected Result:**
- Cədvəl → Sektor → Məktəb strukturu korunur
- Yalnız approved status-lu sətirlər görünür

---

### 3. SektorAdmin Scoping Tests

#### Test 3.1: SektorAdmin View Limitation
**Steps:**
1. SektorAdmin kimi login ol (yalnız bir sektora aid)
2. Report Tables səhifəsinə keç
3. "Təsdiq gözləyir" tab-ına kliklə

**Expected Result:**
- Yalnız öz sektorunun məktəbləri görünür
- Digər sektorların məlumatları görünmür
- URL-də və ya UI-da sektor filter-i aktiv görünür

#### Test 3.2: SektorAdmin Approval Permissions
**Steps:**
1. SektorAdmin kimi login ol
2. Gözləyən sətirləri gör
3. Başqa sektordan sətir olmadığını yoxla

**Expected Result:**
- SektorAdmin yalnız öz sektorunun sətirlərini təsdiqləyə bilir
- Başqa sektor sətirləri API çağrılarında 403 qaytarır

---

### 4. Fixed Rows (Stable Tables) Tests

#### Test 4.1: Create Stable Table
**Steps:**
1. SuperAdmin kimi login ol
2. Yeni cədvəl yarat
3. "Stabil cədvəl" rejimini aktivləşdir
4. 3 ədəd sabit sətir təyin et:
   - "9-cu sinif"
   - "10-cu sinif"
   - "11-cu sinif"
5. Cədvəli yarat

**Expected Result:**
- Cədvəl sabit sətirlərlə yaranır
- Preview-də sabit sətirlər göstərilir

#### Test 4.2: School Fills Stable Table
**Steps:**
1. SchoolAdmin kimi login ol
2. Stabil cədvəli tap və aç
3. Sətir etiketlərini gör ("9-cu sinif", v.s.)
4. Hüceyrələri doldur
5. "Sətir əlavə et" düyməsinin olmadığını yoxla
6. Göndər

**Expected Result:**
- Sabit sətir etiketləri görünür
- Sətir əlavə/silmə düymələri yoxdur
- Yalnız hüceyrə doldurma aktivdir

#### Test 4.3: Dynamic Table Still Works
**Steps:**
1. SchoolAdmin kimi login ol
2. Dinamik cədvəl (fixed_rows = null) aç
3. "Sətir əlavə et" düyməsinin olduğunu yoxla
4. Sətir əlavə et və sil

**Expected Result:**
- Dinamik cədvəllərdə sətir əlavə/silmə işləyir
- Maksimum sətir limiti tətbiq olunur

---

### 5. Analytics Tests

#### Test 5.1: Analytics Dialog Opens
**Steps:**
1. SuperAdmin kimi login ol
2. Report Tables səhifəsinə keç
3. Bir cədvəlin "Analitika" düyməsinə kliklə

**Expected Result:**
- Dialog açılır
- Ümumi, Müəssisələr, Doldurmayanlar tab-ları var
- Məlumatlar yüklənir

#### Test 5.2: Export Non-Filling Schools
**Steps:**
1. Analitika dialog-da "Doldurmayanlar" tab-ına kliklə
2. "İxrac et" düyməsinə kliklə

**Expected Result:**
- CSV faylı yüklənir
- Faylda məktəb adları, sektorlar, statuslar var

---

## Test Data Requirements

### Users Needed:
1. **superadmin@atis.az** / admin123 - Bütün cədvəlləri görə bilər
2. **sektoradmin@atis.az** / admin123 - Yalnız bir sektor
3. **schooladmin@atis.az** / admin123 - Məktəb doldurma

### Test Tables:
1. **Dynamic Table** - `fixed_rows: null`
2. **Stable Table** - `fixed_rows: [{"id":"row_1","label":"9-cu sinif"}, ...]`
3. **Table with Pending Rows** - Təsdiq gözləyən sətirlər olan
4. **Table with Approved Rows** - Hazır tab-ında sətirlər olan

---

## Automation Commands

```bash
# Run all report table tests
npx playwright test tests-e2e/report-tables/

# Run specific test file
npx playwright test tests-e2e/report-tables/approval-flow.spec.ts

# Run with UI mode
npx playwright test tests-e2e/report-tables/ --ui

# Run in headed mode
npx playwright test tests-e2e/report-tables/ --headed
```

---

## Manual Testing Checklist

- [ ] Approve flow moves row to Hazır tab
- [ ] Reject flow returns row to school
- [ ] Bulk approval works for multiple rows
- [ ] Grouping shows Table → Sector → School
- [ ] SektorAdmin only sees their sector
- [ ] Stable table shows fixed row labels
- [ ] Stable table hides add/remove row buttons
- [ ] Dynamic table allows row operations
- [ ] Analytics dialog shows all tabs
- [ ] CSV export works for non-filling schools
