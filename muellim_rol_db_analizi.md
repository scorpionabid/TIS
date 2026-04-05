# 📋 Müəllim Rolu — Hərtərəfli Düzəliş Planı (Implementation Plan)

> **Tarix:** 04 Aprel 2026 | **Mühit:** `atis_dev` (Docker/PostgreSQL 16)  
> **Status:** Təsdiq gözləyir

---

## 📊 Hazırkı Vəziyyətin Tam Xəritəsi

### Cədvəllərdə Mövcud Data

| Cədvəl | Müəllim Qeydləri | Dolulug | Qeyd |
|---|---|---|---|
| `users` | 90 | ⚠️ Qismən | `first_name`/`last_name`/`utis_code` = **NULL** (90/90) |
| `user_profiles` | 85 | ✅ Dolu | Ad, soyad, ixtisas (`specialty`) dolu. **5 nəfər eksikdir** |
| `teacher_profiles` | **0** | 🔴 Boş | Peşəkar profil yoxdur — bütün alt cədvəllər bloklanıb |
| `teacher_subjects` | **0** | 🔴 Boş | Heç bir müəllimə fənn təyin edilməyib |
| `teacher_workplaces` | **0** | 🔴 Boş | İş yeri məlumatı yoxdur |
| `teacher_certificates` | **0** | 🔴 Boş | `teacher_profiles`-ə asılıdır |
| `teacher_achievements` | **0** | 🔴 Boş | `teacher_profiles`-ə asılıdır |
| `teacher_evaluations` | **0** | 🔴 Boş | `teacher_profiles`-ə asılıdır |
| `grade_book_teachers` | **0** | 🔴 Boş | Jurnal bağlantısı yoxdur |
| `teaching_loads` | **0** | 🔴 Boş | Dərs yükü yoxdur |

### `user_profiles` olmayan 5 müəllim (BasicDataSeeder-in yaratdıqları)

| ID | Email | Institution | Seeder-dəki adı |
|---|---|---|---|
| 476 | teacher1@edu.az | 9 | Aynur Həsənova |
| 477 | teacher2@edu.az | 9 | Rəşad Məmmədov |
| 478 | teacher3@edu.az | 9 | Günel Əliyeva |
| 479 | teacher4@edu.az | 9 | Tural Quliyev |
| 480 | teacher5@edu.az | 11 | Sevinc Babayeva |

### İxtisas (Specialty) Dağılımı (`user_profiles`-dən)

| İxtisas | Müəllim Sayı | Uyğun `subjects.name` |
|---|---|---|
| İbtidai sinif (mixed case) | 22 | *— (ayrıca fənn yoxdur)* |
| Riyaziyyat | 7 | `Riyaziyyat` (id=1) |
| Fiziki-tərbiyə | 7 | `Bədən tərbiyəsi` (id=13) / `Fiziki tərbiyə` (id=16) |
| İngilis dili | 7 | `İngilis dili` (id=6) |
| Azərbaycan dili (bütün variantlar) | 12 | `Azərbaycan dili` (id=2) |
| Texnologiya | 4 | `Texnologiya` (id=19/36) |
| Fizika | 4 | `Fizika` (id=3) |
| Tarix | 4 | `Azərbaycan tarixi` (id=14) / `Ümumi tarix` (id=8) |
| Riyaziyyat və informatika | 4 | `Riyaziyyat` (id=1) + `İnformatika` (id=10) |
| Biologiya | 2 | `Biologiya` (id=5) |
| Kimya | 2 | `Kimya` (id=4) |
| Coğrafiya | 1 | `Coğrafiya` (id=9) |
| Təsviri incəsənət | 3 | `Təsviri incəsənət` (id=12) |
| Musiqi | 1 | `Musiqi` (id=11) |
| Rus dili | 1 | `Rus dili` (id=7) |

### Permission Vəziyyəti

| Kateqoriya | Mövcud (26) | Əskik |
|---|---|---|
| Fənn | ❌ `subjects.read` yoxdur | Müəllim fənn siyahısını görə bilmir |
| Tapşırıq | `tasks.read` ✅, `tasks.update` ✅ | ❌ `tasks.create` yoxdur |
| Sənəd | `documents.create` ✅, `documents.read` ✅ | ❌ `documents.update`, `documents.delete` yoxdur |
| Profil | `view teacher_performance` ✅ | ❌ `teacher_profile.read/update` yoxdur |
| Bildiriş | ❌ | `notifications.read` yoxdur |

---

## 🚀 İCRA PLANI — 4 FAZA

### FAZA 1: Data Sinxronizasiyası (users ← user_profiles)
**Məqsəd:** `users.first_name`/`last_name` sahələrini `user_profiles`-dən doldurmaq

```
ƏMƏLİYYAT:
├── 85 müəllim → user_profiles.first_name/last_name → users.first_name/last_name kopyala
├── 5 müəllim (teacher1-5) → BasicDataSeeder-dəki adlardan users-ə yaz  
│   ├── teacher1 → Aynur Həsənova
│   ├── teacher2 → Rəşad Məmmədov
│   ├── teacher3 → Günel Əliyeva
│   ├── teacher4 → Tural Quliyev
│   └── teacher5 → Sevinc Babayeva
└── 5 müəllim üçün user_profiles yaratmaq (əskik olanlar)

TƏSİR: UI-da müəllimlər email əvəzinə "Ad Soyad" formatında görünəcək
RİSK: AŞAĞI — Mövcud data üzərinə yalnız NULL sahələr yazılır
```

### FAZA 2: teacher_profiles Yaradılması
**Məqsəd:** Hər müəllim üçün peşəkar profil yaratmaq

```
ƏMƏLİYYAT:
├── 90 müəllim üçün teacher_profiles qeydləri yaradılacaq
├── Data mənbəyi: user_profiles cədvəli (specialty, phone, address...)
├── Mapping:
│   ├── user_profiles.specialty → teacher_profiles.specialization
│   ├── user_profiles.contact_phone → teacher_profiles.phone
│   ├── users.institution_id → teacher_profiles.institution_id
│   ├── Specialty-dən subjects cədvəlindəki uyğun fənn tapılıb → teacher_profiles.subject_id
│   └── status = 'approved' (bütün mövcud müəllimlər)
└── Bu addımdan sonra alt cədvəllər (achievements, certificates) qeyd qəbul edə biləcək

TƏSİR: Müəllim profil səhifəsi, ixtisas, məlumatları görünəcək
RİSK: ORTA — specialty → subject mapping düzgün olmalı, case-insensitive match istifadə edəcəyik
```

### FAZA 3: teacher_subjects + teacher_workplaces
**Məqsəd:** Müəllimləri fənlərinə və iş yerlərinə rəsmi olaraq təyin etmək

```
ƏMƏLİYYAT:
├── teacher_subjects (90 qeyd):
│   ├── user_profiles.specialty → subjects cədvəlindən en yaxın ID tapılır
│   ├── is_primary_subject = true
│   ├── specialization_level = 'intermediate' (default)
│   └── Composite specialty olan müəllimlər üçün (məs: "Riyaziyyat və informatika")
│       iki ayrı qeyd yaradılacaq
│
└── teacher_workplaces (90 qeyd):
    ├── users.institution_id → teacher_workplaces.institution_id
    ├── workplace_priority = 'primary'
    ├── position_type = user_profiles.position_type ?? 'muəllim'
    ├── employment_type = 'full_time'
    └── status = 'active'

TƏSİR: Cədvəl planlaşdırma, fənn statistikaları, İR hesabatları işləyəcək
RİSK: AŞAĞI — Yeni qeydlər, mövcud dataya toxunulmur
```

### FAZA 4: Permission Düzəlişləri
**Məqsəd:** Müəllim roluna çatışan icazələri əlavə etmək

```
ƏMƏLİYYAT:
├── Əlavə ediləcək permissionlar:
│   ├── subjects.read          (Öz fənnlərini görmək)
│   ├── tasks.create           (Tapşırıq yaratmaq)
│   ├── documents.update       (Öz sənədini yeniləmək)
│   ├── documents.delete       (Öz sənədini silmək)
│   └── notifications.read     (Bildirişləri oxumaq — əgər DB-da permission mövcuddursa)
│
└── Mövcud MuellimPermissionFixSeeder genişləndirilir

TƏSİR: Müəllim interfeysi tam funksional olacaq
RİSK: AŞAĞI — givePermissionTo() istifadə edilir, mövcud icazələrə toxunulmur
```

---

## 📐 Texniki İcra Detalları

### Yaradılacaq Fayl

```
backend/database/seeders/MuellimComprehensiveFixSeeder.php
```

### Seeder Daxili Strukturu

```php
class MuellimComprehensiveFixSeeder extends Seeder
{
    public function run(): void
    {
        DB::beginTransaction();
        try {
            $this->phase1_syncUserData();      // users ← user_profiles  
            $this->phase2_createTeacherProfiles(); // teacher_profiles yaradılması
            $this->phase3_assignSubjectsAndWorkplaces(); // teacher_subjects + workplaces
            $this->phase4_fixPermissions();     // İcazə düzəlişləri
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
```

### Specialty → Subject Mapping Cədvəli (Seeder-ə kodlanacaq)

```php
$specialtyMap = [
    'riyaziyyat'                        => 1,   // Riyaziyyat
    'azərbaycan dili'                   => 2,   // Azərbaycan dili
    'azərbaycan dili və ədəbiyyat'      => 2,
    'azərbaycan dili və ədəbiyyatı'     => 2,
    'azərbaycan dili və ədəbiyyat müəllimliyi' => 2,
    'fizika'                            => 3,   // Fizika
    'kimya'                             => 4,   // Kimya
    'biologiya'                         => 5,   // Biologiya
    'biologiya-kimya'                   => 5,
    'ingilis dili'                      => 6,   // İngilis dili
    'ingilis dili müəllimliyi'          => 6,
    'rus dili'                          => 7,   // Rus dili
    'tarix'                             => 14,  // Azərbaycan tarixi
    'tarix-coğrafiya'                   => 14,
    'coğrafiya'                         => 9,   // Coğrafiya
    'informatika'                       => 10,  // İnformatika
    'riyaziyyat və informatika'         => 1,   // Primary: Riyaziyyat
    'musiqi'                            => 11,  // Musiqi
    'musiqi,rəsm müəllimliyi'          => 11,
    'təsviri incəsənət'                 => 12,  // Təsviri incəsənət
    'bədən tərbiyəsi'                   => 13,  // Bədən tərbiyəsi
    'fiziki-tərbiyə'                    => 13,
    'fiziki tərbiyə'                    => 16,  // Fiziki tərbiyə
    'texnologiya'                       => 19,  // Texnologiya
    'ibtidai sinif'                     => null, // Xüsusi hal — bütün ibtidai fənlər
    'ibtidai'                           => null,
    'ibtidai sinif müəllimliyi'         => null,
];
```

---

## ⏱️ İcra Zaman Cədvəli

| Addım | Əməliyyat | Müddət | Komanda |
|---|---|---|---|
| 1 | Seeder faylını yaratmaq | ~15 dəq | *Mən yazıram* |
| 2 | Kodu nəzərdən keçirmək | ~5 dəq | *Siz yoxlayırsınız* |
| 3 | Seeder-i icra etmək | ~30 san | `docker exec atis_backend php artisan db:seed --class=MuellimComprehensiveFixSeeder --force` |
| 4 | Nəticəni yoxlamaq | ~5 dəq | Verifikasiya SQL-ləri |

---

## ✅ Verifikasiya (Seed-dən sonra yoxlama)

```sql
-- 1. users cədvəlində ad dolulugu
SELECT COUNT(*) FROM users u 
JOIN model_has_roles mhr ON mhr.model_id = u.id 
WHERE u.first_name IS NOT NULL AND u.first_name != '';

-- 2. teacher_profiles yaranıb?
SELECT COUNT(*) FROM teacher_profiles;

-- 3. teacher_subjects yaranıb?
SELECT COUNT(*) FROM teacher_subjects;

-- 4. teacher_workplaces yaranıb?
SELECT COUNT(*) FROM teacher_workplaces;

-- 5. Yeni permissionlar əlavə olunub?
SELECT p.name FROM role_has_permissions rhp 
JOIN permissions p ON rhp.permission_id = p.id 
JOIN roles r ON r.id = rhp.role_id 
WHERE r.name = 'müəllim' ORDER BY p.name;
```

### Gözlənilən Nəticə

| Metrik | Əvvəl | Sonra |
|---|---|---|
| `users.first_name` dolu | 0/90 | **90/90** |
| `teacher_profiles` | 0 | **90** |
| `teacher_subjects` | 0 | **~95** (bəziləri 2 fənn) |
| `teacher_workplaces` | 0 | **90** |
| Permission sayı (müəllim) | 26 | **~31** |

---

## ⚠️ Risk Analizi

| Risk | Səviyyə | Azaltma |
|---|---|---|
| `firstOrCreate` mövcud qeydləri pozmaz | ✅ Aşağı | Yalnız yeni qeyd əlavə edir |
| Specialty mapping xətası | 🟡 Orta | Case-insensitive + trim istifadə |
| İbtidai sinif müəllimləri üçün subject_id NULL | ℹ️ Qəsdən | `subjects` cədvəlində "İbtidai sinif" fənni yoxdur |
| Transaction rollback | ✅ Aşağı | DB::beginTransaction / rollBack |

---

## 🔒 Təhlükəsizlik Qeydləri

1. **Production-safe:** `syncPermissions()` deyil, `givePermissionTo()` istifadə edilir
2. **Idempotent:** Seeder təkrar icra edilə bilər, dublikat yaratmaz
3. **Rollback:** Xəta baş verərsə bütün dəyişikliklər geri qaytarılır
4. **Read-first:** Mövcud data oxunur, yalnız NULL olan sahələr yazılır

---

> **Növbəti addım:** Təsdiqinizdən sonra mən `MuellimComprehensiveFixSeeder.php` faylını yazacağam.
