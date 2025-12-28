# 🏆 MÜƏLLİM REYTİNQ SİSTEMİ - İMPLEMENTASİYA PLANI

**Sənəd tarixi**: 2025-12-28
**Versiya**: 1.0
**PRD Referansı**: [Muellim_Reytinq_Sistemi_PRD.pdf](./Muellim_Reytinq_Sistemi_PRD.pdf)
**Əhatə**: Bütün regionlar (başlanğıc: Lənkəran-Astara RTİ - 550 məktəb, 10,800 müəllim)
**Akademik illər**: 2022-2023, 2023-2024, 2024-2025

---

## 📊 SİSTEM XÜLASƏSİ

### Məqsəd
Müəllimlərin ümumi və peşəkar göstəricilərini vahid sistemdə toplamaq, son 3 tədris ili üzrə nəticələrə əsaslanan reytinq formalaşdırmaq, məktəb/rayon/region/fənn üzrə liderbordlar və rayonlararası müqayisə analitikası təqdim etmək.

### ATİS-ə İnteqrasiya Strategiyası ✅
- **Qərar**: ATİS-ə yeni modul olaraq əlavə edilir
- **Səbəb**: Mövcud auth, RBAC, institution hierarchy, deployment infrastrukturundan istifadə
- **Arxitektura**: Backend modular struktur (`app/Services/TeacherRating/`), Frontend ayrı səhifələr (`frontend/src/pages/teacher-rating/`)

### Mövcud ATİS Infrastrukturu
✅ **Auth & RBAC**: Spatie Permission (12 rol, 48+ permission)
✅ **UTIS Code**: `users` cədvəlində `utis_code` sütunu mövcuddur
✅ **Institution Hierarchy**: Ministry → Regional Office → Sector → School
✅ **Roles**: SuperAdmin, RegionAdmin, RegionOperator, SektorAdmin, SchoolAdmin, Müəllim
✅ **Regional Isolation**: Users only see data within their hierarchy level

---

## 🎯 MVP SCOPE (PRD Section 2.1)

### Daxil Olanlar
- ✅ Auth & RBAC (mövcud sistemdən istifadə)
- ✅ Referens idarəetməsi: rayonlar, məktəblər, fənnlər, akademik illər
- ✅ Müəllim profili: ümumi + peşəkar məlumatlar + fayl yükləmə (foto opsional, 5MB limit)
- ✅ Excel import (çox-sheet) + strict validation + conflict resolution (UTIS əsaslı)
- ✅ Reytinq hesablanması və liderbordlar (məktəb/rayon/region/fənn) - Top 20
- ✅ Filtrlər: tədris ili, rayon, məktəb, fənn, qiymətləndirmə növü
- ✅ Export: Excel + PDF
- ✅ Rayonlararası müqayisə dashboard (basic)
- ✅ Audit log (CRUD və import əməliyyatları)

### Sonraya Saxlanılanlar (v2/v3)
- 2FA, SMS/email bildirişlər
- Mobil tətbiq
- Xarici sistem inteqrasiyaları (UTIS ilə sinxron)
- Qabaqcıl analitika (trend xətti, kohort analizi, proqnozlaşdırma)

---

## 👥 İSTİFADƏÇİ ROLLARI VƏ İCAZƏLƏR (PRD Section 3)

### Rol Matrisi

| Modul | SuperAdmin | RegionAdmin | RayonAdmin | MəktəbAdmin | Müəllim | Viewer |
|-------|-----------|-------------|-----------|------------|---------|--------|
| Referenslər (rayon/məktəb/fənn/il) | CRUD | CRUD | R | R | R | R |
| Müəllim profili | CRUD | CRUD | R | R | R (öz nəticəsi) | R |
| Excel import | ✔ | ✔ | - | - | - | - |
| Reytinq konfiqurasiyası | ✔ | ✔ | - | - | - | - |
| Liderbord/Dashboard | ✔ | ✔ | ✔ | ✔ | öz profil/breakdown | R |
| Export | ✔ | ✔ | ✔ | ✔ | öz profili | ✔ |
| Audit log | ✔ | ✔ | R | R | - | - |

### Məlumat Daxil Etmə Modeli
- **Əsas data entry**: RegionAdmin tərəfindən
- **Təsdiq workflow**: Yoxdur (birbaşa yazılır, audit log-da saxlanılır)
- **PII qaydası**: Doğum tarixi UI-da göstərilmir, yalnız yaş aralığı (20-29, 30-39, etc.)

---

## 🗄️ MƏLUMAT MODELİ (PRD Section 4)

### Əsas Obyektlər

#### 1. **Teachers** (Müəllim Əsas Məlumatları)
```
- id
- utis_code (unique, mandatory, indexed)
- user_id (nullable, FK to users - əgər müəllim sistemdə login edərsə)
- school_id (FK to institutions)
- primary_subject_id (FK to subjects)
- start_year (fəaliyyətə başladığı il)
- photo_path (opsional, 5MB limit)
- age_band (enum: 20-29, 30-39, 40-49, 50-59, 60+)
- is_active
- created_at, updated_at, deleted_at
```

#### 2. **EducationHistory** (Təhsil Tarixi)
```
- id
- teacher_id (FK to teachers)
- level (enum: ali_tehsil, orta_ixtisas)
- institution_name
- start_year
- end_year (nullable - davam edirsə)
- specialty (opsional)
- created_at, updated_at
```

#### 3. **TeachingAssignments** (Tədris Tapşırıqları)
```
- id
- teacher_id (FK to teachers)
- academic_year_id (FK to academic_years)
- grade (1-11)
- parallel_group (nullable: A, B, C və s.)
- created_at, updated_at

UNIQUE(teacher_id, academic_year_id, grade, parallel_group)
NOTE: Eyni tədris ilində müəllimin bir neçə sinfi ola bilər
```

#### 4. **ClassAcademicResults** (Sinif Akademik Nəticələri)
```
- id
- teacher_id (FK to teachers)
- academic_year_id
- grade
- avg_score (0-100, decimal)
- created_at, updated_at

UNIQUE(teacher_id, academic_year_id, grade)
NOTE: Eyni il üçün sinif nəticələrinin ortalaması hesablanır
```

#### 5. **LessonObservations** (Dərs Müşahidələri)
```
- id
- teacher_id
- academic_year_id
- observation_date
- final_score (0-100, decimal)
- comment (text, nullable)
- observer_name (nullable)
- created_at, updated_at
```

#### 6. **AssessmentScores** (Qiymətləndirmə Balları)
```
- id
- teacher_id
- assessment_type (enum: sertifikasiya, MIQ, diaqnostik)
- assessment_date
- score (decimal)
- max_score (decimal, default 100)
- normalized_score (0-100, computed)
- created_at, updated_at

NOTE: Ən son nəticə götürülür
```

#### 7. **Certificates** (Sertifikatlar)
```
- id
- teacher_id
- certificate_type_id (FK to certificate_types)
- issue_date
- issuer (nullable)
- file_path (nullable, PDF/image)
- created_at, updated_at
```

#### 8. **OlympiadAchievements** (Olimpiada Uğurları)
```
- id
- teacher_id
- academic_year_id
- olympiad_level (enum: rayon, region, olke, beynelxalq)
- placement (1, 2, 3, etc.)
- student_count (neçə şagird iştirak edib)
- subject_id (FK to subjects)
- created_at, updated_at
```

#### 9. **Awards** (Təltiflər)
```
- id
- teacher_id
- award_type_id (FK to award_types)
- award_date
- file_path (nullable, sənəd)
- created_at, updated_at
```

#### 10. **RatingResults** (Reytinq Nəticələri)
```
- id
- teacher_id
- academic_year_id (həmin il üçün hesablanmış reytinq)
- total_score (decimal)
- breakdown (JSON: komponentlər və illər üzrə)
- rank_school (məktəb üzrə sıra)
- rank_district (rayon üzrə sıra)
- rank_region (region üzrə sıra)
- rank_subject (fənn üzrə sıra)
- calculated_at (timestamp)
- created_at, updated_at

UNIQUE(teacher_id, academic_year_id)
```

### Referens Cədvəllər

#### **AcademicYears**
```
- id
- year_label (2022-2023, 2023-2024, 2024-2025)
- start_date
- end_date
- is_active
```

#### **Subjects** (Fənnlər)
```
- id
- name (Riyaziyyat, Fizika, Kimya, Azərbaycan dili, etc.)
- code (RYZ, FZK, KMY, AZD, etc.)
- is_active
```

#### **CertificateTypes** (Sertifikat Növləri)
```
- id
- name
- score_weight (RegionAdmin konfiqurasiya edir)
- is_active
```

#### **AwardTypes** (Təltif Növləri)
```
- id
- name (Əməkdar müəllim, Medal, Fəxri fərman, etc.)
- score_weight (RegionAdmin konfiqurasiya edir)
- is_active
```

#### **RatingConfiguration** (Reytinq Konfiqurasiyası)
```
- id
- component_name (academic, lesson_observation, olympiad, assessment, certificate, award)
- weight (çəki, decimal 0-1)
- year_weights (JSON: {2022-2023: 0.25, 2023-2024: 0.30, 2024-2025: 0.45})
- updated_by_user_id
- updated_at
```

---

## 🧮 REYTİNQ HESABLANMASİ (PRD Section 6)

### Komponentlər və Çəkilər

| Komponent | Təsvir | Çəki (Wi) |
|-----------|--------|-----------|
| Akademik göstəricilər | Şagirdlərin sinif üzrə orta balı | 0.30 |
| Dərs müşahidəsi | Dərs dinləmə nəticələri | 0.20 |
| Olimpiada uğurları | Şagirdlərin tutduğu yer və sayı | 0.15 |
| Qiymətləndirmə | Sertifikasiya/MİQ/diaqnostik | 0.15 |
| Sertifikatlar | Peşəkar sertifikatlar | 0.10 |
| Təltiflər | Dövlət təltifləri | 0.10 |

**Qeyd**: Çəkilər RegionAdmin tərəfindən konfiqurasiya olunur.

### İllər Üzrə Artan Çəki (25/30/45 Qaydası)

3 istiqamətə tətbiq olunur: **Akademik göstəricilər**, **Dərs dinləmə**, **Olimpiada**

| Tədris ili | Çəki |
|-----------|------|
| 2022-2023 | 25% |
| 2023-2024 | 30% |
| 2024-2025 | 45% |

**Formula**:
```
YearWeightedScore = 0.25 * score(2022-2023) + 0.30 * score(2023-2024) + 0.45 * score(2024-2025)
```

**Missing Data Qaydası**: Məlumat yoxdursa həmin ilin score-u **0** götürülür.

### Komponent Skorlarının Hesablanması (0-100)

#### A) Akademik Göstərici
```
1. Hər tədris ilində müəllimin bütün sinifləri götürülür
2. TeacherYearAcademicScore = AVG(ClassAcademicResults.avg_score WHERE year)
3. İllər üzrə çəki tətbiq edilir:
   AcademicWeightedScore = 0.25*score_2022 + 0.30*score_2023 + 0.45*score_2024
4. Final: 0-100 aralığında
```

#### B) Dərs Dinləmə
```
1. Hər il üçün müşahidələrin final_score ortalaması
2. İllər üzrə çəki tətbiq edilir (25/30/45)
3. Final: 0-100 aralığında
```

#### C) Olimpiada
```
1. Hər il üçün qayda: score = f(placement, level, student_count)
   Nümunə:
   - 1-ci yer, beynəlxalq, 5 şagird = 100
   - 2-ci yer, ölkə, 3 şagird = 75
   - 3-cü yer, region, 2 şagird = 50

2. Normalizasiya: 0-100 aralığına
3. İllər üzrə çəki (25/30/45)
```

#### D) Qiymətləndirmə
```
1. Hər növ (sertifikasiya/MİQ/diaqnostik) üçün ən son nəticə
2. Normalizasiya: (score / max_score) * 100
3. İllər üzrə çəki TƏTBIQ OLUNMUR (ən son nəticə)
```

#### E) Sertifikatlar
```
1. Hər sertifikat növü üçün bal (RegionAdmin konfiqurasiya)
2. Cəm hesablanır
3. Normalizasiya: 0-100 aralığına
```

#### F) Təltiflər
```
1. Hər təltif növü üçün bal (RegionAdmin konfiqurasiya)
2. Cəm hesablanır
3. Normalizasiya: 0-100 aralığına
```

### Ümumi Reytinq Formulu

```
TotalScore = Σ (Wi * ComponentScorei) + GrowthBonus

Komponentlər:
- W1 * AcademicWeightedScore
- W2 * LessonObservationWeightedScore
- W3 * OlympiadWeightedScore
- W4 * AssessmentNormalizedScore
- W5 * CertificateNormalizedScore
- W6 * AwardNormalizedScore
```

### Growth Bonus (İnkişaf Bonusu)

**Məqsəd**: Son illərdə yaxşılaşmanı təşviq etmək

**Qayda (MVP)**:
```
IF (score_2024_2025 - score_2022_2023) >= 25:
    bonus = +5
ELSE IF (score_2024_2025 - score_2022_2023) >= 15:
    bonus = +2
ELSE:
    bonus = 0

CAP: Maximum +5
```

**Konfiqurasiya**: RegionAdmin dəyişə bilər

---

## 📁 EXCEL IMPORT SPESİFİKASİYASI (PRD Section 5)

### Import Qaydaları
- **Format**: `.xlsx` (multi-sheet)
- **Validasiya**: Sərt - səhv olan sətirlər import olunmur, error report verilir
- **UTIS Conflict**: UTIS eyni olduqda avtomatik overwrite etmir, conflict yaradılır
- **Manual seçim**: User conflict resolution interface-dən seçim edir

### Sheet-lər və Sütunlar

#### 1. **Teachers**
```
Columns:
- utis_code* (text, unique)
- school_code* (text, FK validation)
- subject_code* (text, FK validation)
- start_year (integer)
- photo (text, URL və ya base64, opsional)
- age_band (text: 20-29, 30-39, 40-49, 50-59, 60+)

* məcburi sahələr
```

#### 2. **Education**
```
Columns:
- utis_code* (text)
- institution_name* (text)
- level* (text: ali_tehsil, orta_ixtisas)
- start_year* (integer)
- end_year (integer, nullable)
- specialty (text, opsional)
```

#### 3. **TeachingAssignments**
```
Columns:
- utis_code* (text)
- academic_year* (text: 2022-2023, 2023-2024, 2024-2025)
- grade* (integer: 1-11)
- parallel_group (text: A, B, C, opsional)
```

#### 4. **ClassResults**
```
Columns:
- utis_code* (text)
- academic_year* (text)
- grade* (integer)
- avg_score_0_100* (decimal, 0-100)
```

#### 5. **LessonObservations**
```
Columns:
- utis_code* (text)
- academic_year* (text)
- observation_date (date)
- final_score_0_100* (decimal, 0-100)
- comment (text, opsional)
```

#### 6. **Assessments**
```
Columns:
- utis_code* (text)
- assessment_type* (text: sertifikasiya, MIQ, diaqnostik)
- assessment_date* (date)
- score* (decimal)
- max_score (decimal, default 100)
```

#### 7. **Certificates**
```
Columns:
- utis_code* (text)
- certificate_type* (text)
- issue_date (date)
- issuer (text, opsional)
- file (text, URL və ya path, opsional)
```

#### 8. **Olympiads**
```
Columns:
- utis_code* (text)
- academic_year* (text)
- olympiad_level* (text: rayon, region, olke, beynelxalq)
- placement* (integer: 1, 2, 3, etc.)
- student_count* (integer)
```

#### 9. **Awards**
```
Columns:
- utis_code* (text)
- award_type* (text)
- award_date (date)
```

### Validasiya Qaydaları

1. **UTIS Code**:
   - Boş ola bilməz
   - Format: tam text (məs. UTIS-LNK-001)
   - Unique olmalıdır (conflict yaradılır)

2. **School/Subject Codes**:
   - Sistemdə mövcud olmalıdır (FK validation)
   - Olmayan kod olduqda error

3. **Academic Year**:
   - 2022-2023, 2023-2024, 2024-2025 (hardcoded)
   - Başqa formatda error

4. **Scores**:
   - 0-100 aralığında decimal
   - Kənarda olduqda error

5. **Dates**:
   - ISO format (YYYY-MM-DD) və ya Excel date
   - Parse edilməyəndə error

### Conflict Resolution

**Scenario**: UTIS kodu eyni olan müəllim artıq sistemdə var

**Prosedur**:
1. Import zamanı conflict yaradılır (`import_conflicts` cədvəli)
2. UI-da conflict list göstərilir
3. User hər conflict üçün seçir:
   - **Keep existing**: Köhnə məlumatı saxla
   - **Overwrite with new**: Yeni məlumatla əvəz et
   - **Merge**: Bəzi sahələri köhnədən, bəzilərini yenidən götür (advanced)
4. Təsdiq edildikdən sonra import tamamlanır

---

## 🏅 LİDERBORDLAR VƏ FİLTRLƏR (PRD Section 7)

### Liderbord Növləri (Top 20)

1. **Məktəb üzrə Top 20**
   - Filter: məktəb seçilir
   - Sıralama: total_score DESC
   - LIMIT 20

2. **Rayon üzrə Top 20**
   - Filter: rayon seçilir
   - Sıralama: total_score DESC
   - LIMIT 20

3. **Region üzrə Top 20**
   - Filter: region seçilir (və ya bütün regionlar)
   - Sıralama: total_score DESC
   - LIMIT 20

4. **Fənn üzrə Top 20**
   - Filter: fənn seçilir
   - Context: region/rayon/məktəb filter də ola bilər
   - Sıralama: total_score DESC
   - LIMIT 20

### Filtrlər

| Filter | Növü | Qaydalar |
|--------|------|----------|
| Tədris ili | Dropdown | 2022-2023, 2023-2024, 2024-2025 |
| Rayon | Dropdown | User-ın hierachy-sinə uyğun |
| Məktəb | Dropdown | Rayondan asılı olaraq yüklənir |
| Fənn | Dropdown | Bütün fənnlər |
| Qiymətləndirmə növü | Dropdown | MİQ, Sertifikasiya, Diaqnostik |

**Qeyd**: RBAC qaydaları tətbiq olunur (məs. RayonAdmin yalnız öz rayonunu görür)

### Export

1. **Excel Export**:
   - Eyni filtr konteksti ilə
   - Bütün komponentlərin breakdown-ı
   - Fayl adı: `reytinq_export_2024_2025_rayon_lankaran.xlsx`

2. **PDF Export**:
   - Eyni filtr konteksti ilə
   - Top 20 siyahısı + bar chart (opsional)
   - Logo və tarix
   - Fayl adı: `reytinq_report_2024_2025.pdf`

### Rayonlararası Müqayisə Dashboard

**Ekran 1: Rayon Üzrə Orta Skorlar**
- Bar chart: Rayon adı vs Orta TotalScore
- Komponentlər üzrə breakdown (akademik, dərs dinləmə, etc.)

**Ekran 2: Rayon Üzrə Top 20 Drill-down**
- Rayon seçiləndə həmin rayonun Top 20 siyahısı açılır

**Ekran 3: Fənn Üzrə Müqayisə**
- Hər fənn üçün rayon üzrə orta skorlar
- Heatmap və ya grouped bar chart

---

## 🔒 QEYRİ-FUNKSİONAL TƏLƏBLƏR (PRD Section 8)

### Performans
- **Aktiv istifadəçilər**: ~300 eyni anda (pik)
- **Reytinq hesablanması**: Real-time (liderbord açıldıqda)
- **Cache**: Redis, 1-5 dəqiqə TTL
- **Cache invalidation**: Import və profil update zamanı
- **DB query optimization**: Indexes, eager loading

### Təhlükəsizlik
- **Auth**: Laravel Sanctum (mövcud ATİS auth)
- **RBAC**: Spatie Permission (mövcud roller)
- **Parol siyasəti**: Standart (min 8 char, complexity)
- **Rate limit**: API endpoints üçün (100 req/min)
- **Session timeout**: 2 saat inaktivlikdən sonra
- **Fayl yükləmə**:
  - Tip yoxlaması: jpg/png/pdf
  - Ölçü limiti: 5MB
  - Təhlükəsiz storage: private S3 bucket və ya `/storage/app/teacher_rating/`
- **PII Protection**:
  - Doğum tarixi UI-da göstərilmir
  - Export-da maskalanır və ya yaş aralığı göstərilir

### Audit və İzlenəbilirlik
- **Audit Log Əhatəsi**: 100% CRUD və import əməliyyatları
- **Loglanarlar**:
  - Teacher profil: create, update, delete
  - Referenslər: create, update, delete
  - Konfiqurasiya: component weight dəyişikliyi
  - Import: fayl yüklənməsi, validasiya nəticələri, conflict resolution
- **Audit log axtarış**:
  - Tarix aralığı
  - Actor (user)
  - Entity (teacher, certificate, etc.)
  - Action (create, update, delete, import)

### Miqyaslana Bilmə (Scalability)
- **Hazırkı scope**: 10,800 müəllim (Lənkəran-Astara)
- **Gələcək scope**: 150,000+ müəllim (bütün Azərbaycan)
- **Database indexing**: utis_code, school_id, academic_year_id
- **Pagination**: 20/50/100 per page
- **Lazy loading**: Frontend-də virtual scrolling

---

## 🏗️ İMPLEMENTASİYA PLANI - 8 FAZA

### **FAZA 1: Database Migrations** ⏱️ 1-2 gün

**Tasks**:
1. Create migrations for all 10 core tables
2. Create migrations for 4 reference tables
3. Add indexes (utis_code, school_id, academic_year_id, etc.)
4. Create foreign key constraints
5. Run migrations və test data seed

**Deliverables**:
- ✅ 14 migration files
- ✅ Database seeder with test data (50 teachers, 3 years)
- ✅ Documentation: Database schema diagram

**Test Criteria**:
- All migrations run without error
- FK constraints working
- Indexes created
- Rollback working

---

### **FAZA 2: Backend - Models və Relationships** ⏱️ 1-2 gün

**Tasks**:
1. Create Eloquent models for all tables
2. Define relationships (hasMany, belongsTo, belongsToMany)
3. Add accessors/mutators (age_band, normalized_score)
4. Add scopes (active, byYear, bySchool)
5. Model factories for testing

**Deliverables**:
- ✅ 14 Eloquent models
- ✅ Relationship methods
- ✅ Query scopes
- ✅ Model tests (PHPUnit)

**Models**:
```
- Teacher
- EducationHistory
- TeachingAssignment
- ClassAcademicResult
- LessonObservation
- AssessmentScore
- Certificate
- OlympiadAchievement
- Award
- RatingResult
- AcademicYear
- Subject
- CertificateType
- AwardType
- RatingConfiguration
```

---

### **FAZA 3: Backend - Rating Engine Service** ⏱️ 3-4 gün

**Tasks**:
1. Create `TeacherRatingService` class
2. Implement component score calculations
3. Implement year-weighted formula (25/30/45)
4. Implement total score calculation
5. Implement growth bonus
6. Create `RatingConfigurationService` for admin settings
7. Unit tests for all calculations

**Service Methods**:
```php
class TeacherRatingService
{
    public function calculateAcademicScore(Teacher $teacher, AcademicYear $year): float
    public function calculateLessonObservationScore(Teacher $teacher, AcademicYear $year): float
    public function calculateOlympiadScore(Teacher $teacher, AcademicYear $year): float
    public function calculateAssessmentScore(Teacher $teacher): float
    public function calculateCertificateScore(Teacher $teacher): float
    public function calculateAwardScore(Teacher $teacher): float
    public function calculateGrowthBonus(Teacher $teacher): float
    public function calculateTotalScore(Teacher $teacher, AcademicYear $year): array
    public function recalculateAllTeachers(AcademicYear $year): void
}
```

**Deliverables**:
- ✅ TeacherRatingService with all methods
- ✅ RatingConfigurationService
- ✅ 50+ unit tests
- ✅ Documentation: Rating calculation examples

**Test Cases**:
- Teacher with all components present
- Teacher with missing data (0 scores)
- Multiple classes in same year (average)
- Year weighting (25/30/45)
- Growth bonus calculation

---

### **FAZA 4: Backend - API Endpoints** ⏱️ 3-4 gün

**Tasks**:
1. Create controllers for all entities
2. Create form requests with validation
3. Implement RBAC middleware
4. Create API routes
5. API tests (Feature tests)

**Controllers**:
```
- TeacherController (CRUD + search)
- EducationHistoryController
- TeachingAssignmentController
- ClassAcademicResultController
- LessonObservationController
- AssessmentScoreController
- CertificateController
- OlympiadAchievementController
- AwardController
- RatingResultController (GET only, auto-calculated)
- LeaderboardController (Top 20 queries)
- DashboardController (Rayonlararası müqayisə)
- AuditLogController (Read only)
- ReferenceDataController (subjects, academic_years, etc.)
```

**Endpoints** (example):
```
GET    /api/teacher-rating/teachers
POST   /api/teacher-rating/teachers
GET    /api/teacher-rating/teachers/{id}
PUT    /api/teacher-rating/teachers/{id}
DELETE /api/teacher-rating/teachers/{id}

GET    /api/teacher-rating/leaderboards/school/{school_id}
GET    /api/teacher-rating/leaderboards/district/{district_id}
GET    /api/teacher-rating/leaderboards/region/{region_id}
GET    /api/teacher-rating/leaderboards/subject/{subject_id}

GET    /api/teacher-rating/dashboards/district-comparison
POST   /api/teacher-rating/ratings/recalculate
GET    /api/teacher-rating/teachers/{id}/breakdown

POST   /api/teacher-rating/export/excel
POST   /api/teacher-rating/export/pdf
```

**Deliverables**:
- ✅ 14 controllers
- ✅ 40+ API endpoints
- ✅ Form request validation
- ✅ 100+ API tests

---

### **FAZA 5: Backend - Excel Import System** ⏱️ 4-5 gün

**Tasks**:
1. Install PhpSpreadsheet library
2. Create `ExcelImportService` class
3. Implement multi-sheet parsing
4. Implement strict validation
5. Implement conflict detection (UTIS)
6. Create conflict resolution UI backend
7. Create import job (queue)
8. Error reporting

**Service Methods**:
```php
class ExcelImportService
{
    public function parseExcelFile(UploadedFile $file): array
    public function validateSheet(string $sheetName, array $data): array
    public function detectConflicts(array $teachers): array
    public function importWithConflictResolution(array $resolutions): ImportResult
    public function generateErrorReport(array $errors): string
}
```

**Conflict Resolution Table**:
```
import_conflicts:
- id
- import_session_id
- utis_code
- existing_data (JSON)
- new_data (JSON)
- resolution (enum: keep_existing, use_new, merge, null)
- resolved_by_user_id
- resolved_at
```

**Deliverables**:
- ✅ ExcelImportService
- ✅ Conflict resolution backend
- ✅ Import queue job
- ✅ Error report generation
- ✅ Import tests

**Test Cases**:
- Valid Excel file (all sheets)
- Invalid data (validation errors)
- UTIS conflicts
- Missing mandatory fields
- Large file (1000+ rows)

---

### **FAZA 6: Frontend - Core Pages** ⏱️ 5-6 gün

**Tasks**:
1. Create page structure
2. Create services (API integration)
3. Create components
4. Create forms
5. Integrate with backend

**Pages**:
```
frontend/src/pages/teacher-rating/
├── TeacherList.tsx              # Müəllim siyahısı və axtarış
├── TeacherProfile.tsx           # Müəllim profili və breakdown
├── TeacherForm.tsx              # Yaratma/redaktə formu
├── ExcelImport.tsx              # Excel import və conflict resolution
├── Leaderboards.tsx             # Top 20 liderbordlar
├── DistrictComparison.tsx       # Rayonlararası müqayisə dashboard
├── RatingConfiguration.tsx      # RegionAdmin konfiqurasiya paneli
└── AuditLog.tsx                 # Audit log
```

**Components**:
```
frontend/src/components/teacher-rating/
├── TeacherCard.tsx
├── TeacherTable.tsx
├── RatingBreakdown.tsx          # Komponentlər və illər üzrə chart
├── LeaderboardTable.tsx
├── FilterPanel.tsx
├── ExcelImportWizard.tsx
├── ConflictResolutionModal.tsx
└── RatingConfigModal.tsx
```

**Services**:
```typescript
frontend/src/services/teacherRating/
├── teacherService.ts
├── leaderboardService.ts
├── excelImportService.ts
├── ratingService.ts
└── auditLogService.ts
```

**Deliverables**:
- ✅ 8 pages
- ✅ 10+ components
- ✅ 5 services
- ✅ TypeScript types
- ✅ Responsive design

---

### **FAZA 7: Frontend - Advanced Features** ⏱️ 3-4 gün

**Tasks**:
1. Charts və visualizations
2. Export functionality (Excel/PDF)
3. Advanced filters
4. Pagination və virtual scrolling
5. Loading states və error handling

**Libraries**:
- **Charts**: Recharts (already in ATİS)
- **Export**:
  - Excel: xlsx library
  - PDF: jsPDF or backend-generated
- **Virtual scrolling**: @tanstack/react-virtual
- **Date picker**: react-datepicker

**Features**:
1. **Rating Breakdown Chart**:
   - Stacked bar chart (komponentlər üzrə)
   - Line chart (illər üzrə progress)

2. **Leaderboard Visualization**:
   - Top 20 bar chart
   - Medal icons (🥇🥈🥉)

3. **District Comparison**:
   - Multi-bar chart (rayonlar və komponentlər)
   - Heatmap (fənn × rayon)

**Deliverables**:
- ✅ 5+ chart components
- ✅ Excel/PDF export
- ✅ Advanced filter panel
- ✅ Virtual scrolling for large lists

---

### **FAZA 8: Testing, Documentation və Deployment** ⏱️ 2-3 gün

**Tasks**:
1. End-to-end testing
2. Performance testing
3. Documentation yazılması
4. Production deployment
5. User training materials

**Testing**:
- ✅ Backend unit tests (150+ tests)
- ✅ API integration tests (100+ tests)
- ✅ Frontend component tests (50+ tests)
- ✅ E2E tests (Playwright or Cypress - 20+ scenarios)
- ✅ Performance testing (1000+ teachers, concurrent users)

**Documentation**:
- ✅ API documentation (Swagger/OpenAPI)
- ✅ User guide (Azərbaycan dilində)
- ✅ Admin guide (Konfiqurasiya, Excel import)
- ✅ Developer documentation (Code structure, services)

**Deployment**:
- ✅ Production migrations
- ✅ Seed reference data (subjects, academic_years)
- ✅ Cache configuration
- ✅ Queue workers setup
- ✅ Backup strategy

**Deliverables**:
- ✅ 300+ tests passing
- ✅ Full documentation
- ✅ Production deployment
- ✅ User training completed

---

## 📊 TIMELINE VƏ RESOURCE ESTİMATİON

### Development Timeline

| Faza | Təsvir | Müddət | Cumulative |
|------|--------|--------|-----------|
| 1 | Database Migrations | 1-2 gün | 2 gün |
| 2 | Models və Relationships | 1-2 gün | 4 gün |
| 3 | Rating Engine Service | 3-4 gün | 8 gün |
| 4 | API Endpoints | 3-4 gün | 12 gün |
| 5 | Excel Import System | 4-5 gün | 17 gün |
| 6 | Frontend Core Pages | 5-6 gün | 23 gün |
| 7 | Frontend Advanced Features | 3-4 gün | 27 gün |
| 8 | Testing və Deployment | 2-3 gün | **30 gün** |

**TOTAL DEVELOPMENT TIME**: **4-6 həftə** (1 developer, full-time)

### Resource Requirements

**Backend Developer**: 60% workload (3 həftə)
**Frontend Developer**: 50% workload (2 həftə)
**Full-stack Developer**: 100% workload (4-6 həftə) ✅ **Tövsiyə**

### Risk Factors

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Excel import complexity | Yüksək | Early prototyping, comprehensive testing |
| Rating formula complexity | Orta | Unit tests, manual verification with sample data |
| Large data volume (10,800 teachers) | Orta | Database indexing, caching, pagination |
| RBAC complexity | Aşağı | Use existing ATİS RBAC patterns |

---

## 🎯 ACCEPTANCE CRİTERİA (PRD Section 9)

### UTIS Code
- ✅ UTIS boş ola bilməz
- ✅ Unique constraint
- ✅ Conflict resolution UI işləyir

### Çox Sinif Qaydası
- ✅ Eyni ildə bir neçə sinif olduqda akademik göstərici orta balı üzrə hesablanır

### İllər Üzrə Çəkilər
- ✅ Akademik/dərs dinləmə/olimpiada üçün 25/30/45 tətbiq olunur
- ✅ Formula düzgündür

### Missing Data
- ✅ Hər il və komponent üçün məlumat yoxdursa 0 sayılır
- ✅ Reytinq hesablanması səhvsiz işləyir

### Conflict Import
- ✅ UTIS eyni olduqda conflict mərkəzi açılır
- ✅ Manual seçim olmadan overwrite edilmir

### Export
- ✅ Liderbord filterləri Excel və PDF export-a tətbiq olunur
- ✅ Fayl formatı düzgündür

### Breakdown
- ✅ Müəllim profilində total score göstərilir
- ✅ Komponentlər üzrə breakdown göstərilir
- ✅ İllər üzrə breakdown göstərilir

---

## 🔐 PRODUCTION DEPLOYMENT CHECKLİST

### Pre-Deployment
- [ ] All tests passing (300+)
- [ ] Database migrations reviewed
- [ ] Seed data prepared (subjects, academic_years)
- [ ] RBAC permissions configured
- [ ] Cache configuration (Redis)
- [ ] Queue workers configured
- [ ] File storage configured (S3 or local)
- [ ] Backup strategy tested

### Deployment
- [ ] Run migrations on production
- [ ] Seed reference data
- [ ] Verify RBAC permissions
- [ ] Configure cache (Redis keys)
- [ ] Start queue workers
- [ ] Test Excel import with sample data
- [ ] Test rating calculation with sample teachers
- [ ] Verify leaderboards load correctly

### Post-Deployment
- [ ] Monitor performance (response times)
- [ ] Monitor errors (logs)
- [ ] Monitor cache hit rate
- [ ] User training completed
- [ ] Admin training completed
- [ ] Documentation accessible

---

## 📚 DOCUMENTATION PLAN

### User Documentation (Azərbaycan dilində)

1. **Müəllim İstifadəçi Bələdçisi**:
   - Profil məlumatlarını necə görmək olar
   - Reytinq breakdown-ı necə oxumaq olar
   - Export necə etmək olar

2. **Admin Bələdçisi**:
   - Müəllim profili yaratmaq/redaktə etmək
   - Excel import prosesi (addım-addım)
   - Conflict resolution
   - Reytinq konfiqurasiyası
   - Liderbordları necə filtrlənmək olar

3. **RegionAdmin Konfiqurasiya Bələdçisi**:
   - Komponent çəkilərini dəyişdirmək
   - Sertifikat/təltif növləri və balları
   - Olimpiada bal cədvəli konfiqurasiyası
   - Growth bonus qaydaları

### Developer Documentation

1. **System Architecture**:
   - Database schema diagram
   - Service layer architecture
   - API endpoint list
   - Rating engine flow diagram

2. **API Documentation** (Swagger/OpenAPI):
   - All endpoints documented
   - Request/response examples
   - Authentication requirements
   - Rate limits

3. **Code Documentation**:
   - PHPDoc comments
   - JSDoc comments for services
   - Complex algorithms explained

---

## 🚀 NEXT STEPS

1. **Faza 0 tamamlandı** - Qərarlar qəbul edildi ✅
2. **Faza 1 başlanmalı** - Database migrations
3. **CLAUDE.md yenilənməli** - Bu plan əlavə edilməli
4. **Git branch yaradılmalı** - `feature/teacher-rating-system`

---

**Sənəd hazırlayan**: Claude Code
**Tarix**: 2025-12-28
**Status**: ✅ APPROVED - Full MVP Development Ready

