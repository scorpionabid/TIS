# Classes Import - Visual Architecture & Flow Guide

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ATIS CLASSES IMPORT SYSTEM                         │
└─────────────────────────────────────────────────────────────────────────────┘

                              FRONTEND LAYER
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  RegionClassManagement (Page)                                               │
│  ├─ Statistics Cards (total, active, students, institutions)                │
│  ├─ Filter Controls (search, institution, level, year, status)              │
│  ├─ Action Buttons:                                                         │
│  │  ├─ 📤 "İdxal Et" → Opens RegionClassImportModal                        │
│  │  ├─ 📥 "Şablon Yüklə" → Downloads ClassesTemplateExport                │
│  │  └─ 📥 "İxrac Et" → Exports filtered classes                            │
│  └─ Classes Table (desktop) / Cards (mobile)                                │
│     ├─ Sortable columns                                                     │
│     ├─ Pagination (20 per page)                                             │
│     └─ Real-time data refresh                                               │
│                                                                               │
│  RegionClassImportModal (Component)                                         │
│  ├─ Instructions & guidelines (instructions alert)                          │
│  ├─ File upload (drag-drop support)                                         │
│  ├─ File validation (size, format)                                          │
│  ├─ Import button (triggers mutation)                                       │
│  ├─ Progress indicator (50%)                                                │
│  └─ Results display:                                                        │
│     ├─ Success/error summary                                                │
│     ├─ Error list view (bullet points)                                      │
│     ├─ Error table view (row, field, value, error, suggestion)              │
│     ├─ Error filter (by field)                                              │
│     └─ Export errors button                                                 │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

                    ↓↓↓ API CALLS VIA SERVICE LAYER ↓↓↓
                    regionAdminClassService (TypeScript)

┌──────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER (REST)                                │
│                                                                               │
│  POST   /api/regionadmin/classes/import              (multipart/form-data)  │
│  GET    /api/regionadmin/classes/export/template     (returns Blob)         │
│  POST   /api/regionadmin/classes/export              (returns Blob)         │
│  GET    /api/regionadmin/classes                     (with filters)         │
│  GET    /api/regionadmin/classes/statistics          (summary stats)        │
│  GET    /api/regionadmin/classes/{id}                (detail view)          │
│  GET    /api/regionadmin/classes/filter-options/*    (dropdown data)        │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

                    ↓↓↓ AUTHENTICATED REQUESTS (Sanctum) ↓↓↓
                    Middleware: auth:sanctum, role:regionadmin

┌──────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND LAYER (Laravel)                            │
│                                                                               │
│  RegionAdminClassController                                                 │
│  ├─ importClasses()                                                         │
│  │  ├─ Validate: file|required|mimes:xlsx,xls,csv|max:5120                │
│  │  ├─ Get user's region from auth()->user()->institution_id              │
│  │  ├─ Instantiate: new ClassesImport($region)                            │
│  │  ├─ Execute: Excel::import($import, $file)                             │
│  │  ├─ Catch: ValidationException → convert to structured format          │
│  │  └─ Return: JSON with statistics and errors                            │
│  │                                                                          │
│  ├─ exportClassesTemplate()                                                │
│  │  ├─ Load institutions in user's region                                 │
│  │  ├─ Generate example rows via ClassesTemplateExport                    │
│  │  └─ Download: Excel file with formatting and dropdowns                 │
│  │                                                                          │
│  ├─ index()                                                                │
│  │  ├─ Apply filters (search, institution, level, year, status)           │
│  │  ├─ Paginate results (20 per page)                                     │
│  │  └─ Return: Grades with eager-loaded relationships                     │
│  │                                                                          │
│  └─ getStatistics(), exportClasses(), show()                              │
│                                                                              │
│  ClassesImport Handler (Maatwebsite\Excel)                                 │
│  ├─ headingRow() → return 2                                                │
│  ├─ prepareForValidation($row, $index)                                     │
│  │  ├─ Normalize column keys (100+ aliases)                               │
│  │  ├─ Add _row_index, _is_empty_row flags                                │
│  │  ├─ Convert types (UTIS to string, class_level to int)                 │
│  │  └─ Parse combined class names (5A → [5, A])                           │
│  │                                                                          │
│  ├─ model($row) → Grade | null                                            │
│  │  ├─ Skip empty rows                                                    │
│  │  ├─ Parse class identifiers                                            │
│  │  ├─ Find institution (UTIS → Code → Name)                             │
│  │  ├─ Validate region access                                            │
│  │  ├─ Find/create academic year                                         │
│  │  ├─ Check duplicate (update if exists)                                │
│  │  ├─ Create new Grade (if not duplicate)                               │
│  │  └─ Track success/error                                               │
│  │                                                                          │
│  ├─ Caching layer:                                                        │
│  │  ├─ Institutions: by ID, UTIS code, code, name                        │
│  │  ├─ Academic Years: by year, by ID                                    │
│  │  └─ Teachers: by institution ID + name                                │
│  │                                                                          │
│  └─ getStatistics() → {success_count, error_count, errors[], ...}        │
│                                                                              │
│  ClassesTemplateExport (Maatwebsite\Excel)                                 │
│  ├─ collection() → Collection of example rows                              │
│  ├─ headings() → Column headers (16 columns A-P)                           │
│  ├─ columnWidths() → Optimized widths per column                           │
│  ├─ styles(Worksheet) → Color-coded headers (red/blue/gray)                │
│  └─ registerEvents() → Data validation dropdowns                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

                    ↓↓↓ DATABASE QUERIES & CACHING ↓↓↓

┌──────────────────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER (PostgreSQL)                           │
│                                                                               │
│  grades table (PRIMARY)                                                     │
│  ├─ id (PK), name, class_level                                             │
│  ├─ academic_year_id (FK), institution_id (FK)                             │
│  ├─ student_count, male_student_count, female_student_count                │
│  ├─ homeroom_teacher_id (FK), room_id (FK)                                │
│  ├─ teaching_language, teaching_week, teaching_shift                       │
│  ├─ class_type, class_profile, education_program                           │
│  ├─ specialty, grade_category, description                                 │
│  ├─ is_active, teacher_assigned_at, deactivated_at                         │
│  └─ Indexes: institution_id, academic_year_id, class_level, is_active     │
│                                                                              │
│  institutions table                                                         │
│  ├─ id (PK), name, type, utis_code, institution_code                       │
│  ├─ parent_id (hierarchical), deleted_at (soft delete)                     │
│  └─ Used to verify region access via getAllChildrenIds()                   │
│                                                                              │
│  academic_years table                                                       │
│  ├─ id (PK), year (e.g., "2024-2025"), is_active                          │
│  ├─ start_date, end_date                                                   │
│  └─ Used for class scheduling context                                      │
│                                                                              │
│  users table (Teachers)                                                     │
│  ├─ id (PK), username, email, institution_id                              │
│  ├─ first_name, last_name, roles (pivot)                                  │
│  └─ Used to find homeroom teachers by name                                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Import Flow Sequence Diagram

```
USER                FRONTEND               SERVICE            CONTROLLER           HANDLER            DATABASE
 │                     │                      │                   │                   │                  │
 │─ Click "İdxal Et" ─→│                      │                   │                   │                  │
 │                     │                      │                   │                   │                  │
 │                     │← Display Modal ──────│                   │                   │                  │
 │                     │   (instructions)     │                   │                   │                  │
 │                     │                      │                   │                   │                  │
 │─ Select File ──────→│ Validate:            │                   │                   │                  │
 │                     │ • Size (< 5MB) ✓    │                   │                   │                  │
 │                     │ • Format (.xlsx) ✓  │                   │                   │                  │
 │                     │ • MIME type ✓       │                   │                   │                  │
 │                     │                      │                   │                   │                  │
 │─ Click "İdxal Et" ─→│ importClasses()      │                   │                   │                  │
 │                     ├──────────────────────→ POST /import      │                   │                  │
 │                     │                      │ (multipart/form-data)              │                  │
 │                     │                      │                   │                   │                  │
 │                     │                      │                   ├─ Check auth      │                  │
 │                     │                      │                   ├─ Validate file   │                  │
 │                     │                      │                   ├─ Get user region │                  │
 │                     │                      │                   │                   │                  │
 │                     │                      │                   ├─ new ClassesImport($region)      │
 │                     │                      │                   │                   │                  │
 │                     │                      │                   ├─ Excel::import($import, $file)   │
 │                     │                      │                   │                   │                  │
 │                     │                      │                   │   headingRow()    │                  │
 │                     │                      │                   │   ← return 2      │                  │
 │                     │                      │                   │                   │                  │
 │                     │                      │                   │ FOR EACH ROW:     │                  │
 │                     │                      │                   │ ├─ prepareForValidation()        │
 │                     │                      │                   │ │  ├─ Normalize keys             │
 │                     │                      │                   │ │  ├─ Convert types             │
 │                     │                      │                   │ │  ├─ Parse class names         │
 │                     │                      │                   │ │  └─ Mark empty rows           │
 │                     │                      │                   │ │                   │                  │
 │                     │                      │                   │ ├─ model()                       │
 │                     │                      │                   │ │  ├─ Skip empty rows           │
 │                     │                      │                   │ │  ├─ Validate class_level      │
 │                     │                      │                   │ │  ├─ Find institution          │
 │                     │                      │                   │ │  │  ├─ Check UTIS cache ──────→ O(1)
 │                     │                      │                   │ │  │  ├─ Check code cache ──────→ O(1)
 │                     │                      │                   │ │  │  └─ Check name cache ──────→ O(1)
 │                     │                      │                   │ │  │                   │                  │
 │                     │                      │                   │ │  ├─ Validate region access    │
 │                     │                      │                   │ │  ├─ Find academic year ──────→ SELECT
 │                     │                      │                   │ │  ├─ Check duplicate ──────────→ SELECT
 │                     │                      │                   │ │  ├─ Find teacher ──────────────→ SELECT
 │                     │                      │                   │ │  │                   │                  │
 │                     │                      │                   │ │  └─ CREATE Grade ──────────────→ INSERT
 │                     │                      │                   │ │      OR UPDATE ────────────────→ UPDATE
 │                     │                      │                   │ │                   │                  │
 │                     │                      │                   │ ├─ Track success/error        │
 │                     │                      │                   │                   │                  │
 │                     │                      │                   ├─ getStatistics()                 │
 │                     │                      │                   │ ← {success_count, error_count, ...}
 │                     │                      │                   │                   │                  │
 │                     │                      │← Response JSON ───│                   │                  │
 │                     │← Parse Response ─────│                   │                   │                  │
 │                     │   • success_count    │                   │                   │                  │
 │                     │   • error_count      │                   │                   │                  │
 │                     │   • errors[]         │                   │                   │                  │
 │                     │   • structured_errors[] (with context)   │                   │                  │
 │                     │                      │                   │                   │                  │
 │                     │← Display Results ────│                   │                   │                  │
 │                     │   • Success summary  │                   │                   │                  │
 │                     │   • Error list/table │                   │                   │                  │
 │                     │   • Filter/export    │                   │                   │                  │
 │                     │                      │                   │                   │                  │
 │─ View errors ──────→│                      │                   │                   │                  │
 │                     │← Display errors      │                   │                   │                  │
 │                     │   (list or table)    │                   │                   │                  │
 │                     │                      │                   │                   │                  │
 │─ Filter/Export ────→│ exportErrorsToExcel()│                   │                   │                  │
 │                     │ (uses XLSX library)  │                   │                   │                  │
 │                     │                      │                   │                   │                  │
 │← Download Excel ───│← Blob response ──────│                   │                   │                  │
 │   (error file)     │                      │                   │                   │                  │
 │                     │                      │                   │                   │                  │
 │─ Fix errors ──────→│ (Edit and re-upload) │                   │                   │                  │
 │                     │                      │                   │                   │                  │
 │─ Re-import ────────→│ (Repeat above flow)  │                   │                   │                  │
 │                     │                      │                   │                   │                  │
 │← Success ──────────│← Invalidate Queries ─→ Query updates     │                   │                  │
 │ (data appears)     │                      │ ['regionadmin', 'classes']           │                  │
 │                    │                      │ ['regionadmin', 'class-statistics']  │                  │
 │                    │                      │                   │                   │                  │
```

---

## 3. Template Download Flow

```
USER → RegionClassManagement
       │
       ├─ Click "Şablon Yüklə"
       │
       └─→ API: GET /regionadmin/classes/export/template
            │
            └─→ Controller: exportClassesTemplate()
                 │
                 ├─ Get user's region
                 │
                 ├─ Query institutions in region (with CTE for hierarchy)
                 │
                 ├─ Create ClassesTemplateExport object
                 │  │
                 │  ├─ collection() - Generate 5+ example rows per institution
                 │  │  ├─ Standard Azerbaijani class (Level 1)
                 │  │  ├─ Russian language class (Level 2)
                 │  │  ├─ Math-focused class (Level 5)
                 │  │  └─ Special education class (Level 3)
                 │  │
                 │  ├─ headings() - 16 column headers (A-P)
                 │  │
                 │  ├─ styles() - Apply color coding
                 │  │  ├─ Row 1: Yellow instruction (merged A1:P1)
                 │  │  ├─ Row 2: Color-coded headers
                 │  │  │  ├─ 🔴 RED: Required fields (UTIS, Code, Level, Letter)
                 │  │  │  ├─ 🔵 BLUE: Recommended fields (Counts, Language, Shift, Week)
                 │  │  │  └─ ⚪ GRAY: Optional fields (Name, Teacher, Type, Profile, Program, Year)
                 │  │  └─ Row 3+: Data alignment per column
                 │  │
                 │  └─ registerEvents() - Add dropdowns for rows 3-1000
                 │     ├─ Column D (Class Level): 0-12 dropdown
                 │     ├─ Column I (Language): azərbaycan, rus, gürcü, ingilis
                 │     ├─ Column J (Shift): 1/2/3 növbə, fərdi
                 │     ├─ Column K (Week): 4/5/6 günlük
                 │     └─ Column O (Program): umumi, xususi, ferdi_mekteb, ferdi_ev
                 │
                 └─→ Excel::download() - Return Blob
                    │
                    └─→ Frontend: Download Excel file to user's computer
                         │
                         └─ File: "sinif-import-shablon-2024-11-15.xlsx"
```

---

## 4. Excel Template Visual Structure

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ROW 1 (INSTRUCTION - Yellow Background, Merged A1:P1)                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 📋 İMPORT QAYDASI: 🔴 Qırmızı sütunlar MƏCBUR | 🔵 Mavi sütunlar TÖVSİYƏ | ...     │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌────┬────────┬──────────┬──────────┬─────────────┬────────┬────────┬────────┬────────┐
│    │   A    │    B     │    C     │      D      │   E    │   F    │   G    │   H    │
│ 2  │ UTIS   │ Müəssisə │ Müəssisə │ Sinif Səv.  │ Index  │ Şagird │ Oğlan  │   Qız  │
│    │ Kod    │ Kodu     │ Adı      │ (1-12)      │ (A,B)  │ Sayı   │ Sayı   │ Sayı   │
├────┼────────┼──────────┼──────────┼─────────────┼────────┼────────┼────────┼────────┤
│    │ 🔴 RED │ 🔴 RED   │ ⚪ GRAY   │ 🔴 RED      │ 🔴 RED │ 🔵 BLU │ 🔵 BLU │ 🔵 BLU │
├────┼────────┼──────────┼──────────┼─────────────┼────────┼────────┼────────┼────────┤
│ 3  │533821… │ MKT-001  │ 1 saylı… │ [D: 0-12▼] │   A    │   25   │   13   │   12   │
├────┼────────┼──────────┼──────────┼─────────────┼────────┼────────┼────────┼────────┤
│ 4  │533821… │ MKT-001  │ 1 saylı… │ [D: 0-12▼] │   B    │   24   │   12   │   12   │
├────┼────────┼──────────┼──────────┼─────────────┼────────┼────────┼────────┼────────┤
│ 5  │533821… │ MKT-001  │ 1 saylı… │ [D: 0-12▼] │   A    │   30   │   15   │   15   │
└────┴────────┴──────────┴──────────┴─────────────┴────────┴────────┴────────┴────────┘

┌────┬──────────────┬─────────┬──────────┬─────────┬──────────┬──────────┬──────────┐
│    │      I       │    J    │    K     │    L    │    M     │    N     │    O     │
│ 2  │ Tədris Dili  │ Növbə   │ Həftə    │ Sinif   │ Sinfin   │ Profil   │ Proqram  │
│    │              │         │          │ Rəhbəri │ Tipi     │          │          │
├────┼──────────────┼─────────┼──────────┼─────────┼──────────┼──────────┼──────────┤
│    │ 🔵 BLU [▼]   │ 🔵 [▼]  │ 🔵 [▼]   │ ⚪ GRAY  │ ⚪ GRAY   │ ⚪ GRAY   │ ⚪ [▼]    │
├────┼──────────────┼─────────┼──────────┼─────────┼──────────┼──────────┼──────────┤
│ 3  │ azərbaycan   │ 1 növbə │ 5_günl… │ Nümuna… │ Orta mə… │ Ümumi    │ umumi    │
├────┼──────────────┼─────────┼──────────┼─────────┼──────────┼──────────┼──────────┤
│ 4  │ rus          │ 1 növbə │ 5_günl… │ Rus B… │ Orta mə… │ Rus böl… │ umumi    │
├────┼──────────────┼─────────┼──────────┼─────────┼──────────┼──────────┼──────────┤
│ 5  │ azərbaycan   │ 2 növbə │ 5_günl… │ Riyas… │ İxtisas  │ Riyas…   │ umumi    │
└────┴──────────────┴─────────┴──────────┴─────────┴──────────┴──────────┴──────────┘

Frozen Header (Row 2 stays visible when scrolling)
Data Validation Dropdowns on Rows 3-1000 for columns D, I, J, K, O
Comments on Row 2 explaining each field
```

---

## 5. Error Display Modes

```
LIST VIEW (Default)
┌─────────────────────────────────────────────┐
│ Xətalar (5):                                │
├─────────────────────────────────────────────┤
│ #1 Sinif səviyyəsi düzgün deyil: 15        │
│    (Sətir 3 | UTIS 533821512 | 1 saylı…)  │
│                                             │
│ #2 UTIS kod '999999999' tapılmadı          │
│    (Sətir 5 | Müəssisə kodu MKT-999)      │
│                                             │
│ #3 Sinif rəhbəri 'Azada' tapılmadı         │
│    (Sətir 7 | 1 saylı məktəb)             │
│                                             │
│ #4 Müəllim artıq digər sinifə…             │
│    (Sətir 9 | Azada Mirzəyeva)            │
│                                             │
│ #5 Müəssisə sizin regionunuzda deyil       │
│    (Sətir 11 | UTIS 111111111)            │
└─────────────────────────────────────────────┘

TABLE VIEW (Structured)
┌────────┬──────────┬─────────┬──────────────┬────────────────────┐
│ Sətir  │ Sahə     │ Dəyər   │ Xəta         │ Təklif             │
├────────┼──────────┼─────────┼──────────────┼────────────────────┤
│   3    │ class_l… │   15    │ Səviyyə döz… │ 0-12 arası rəqəm  │
│   5    │ utis_c…  │999999…  │ UTIS tapıl… │ Demək istədiniz… │
│   7    │ homeroom │ Azada   │ Müəllim tap… │ Təmvə adı uyğun…  │
│   9    │ homero…  │ Azada   │ Artıq digər… │                    │
│  11    │ institu… │111111…  │ Regionda dey │ UTIS siyahısını…  │
└────────┴──────────┴─────────┴──────────────┴────────────────────┘

ERROR FILTER
┌──────────────────────────────────────────────┐
│ Bütün sahələr ▼                   5 xəta    │
├──────────────────────────────────────────────┤
│ Filtrləniş seçimləri:                       │
│ - Bütün sahələr                             │
│ - class_level                 ← 1 xəta      │
│ - utis_code                   ← 1 xəta      │
│ - homeroom_teacher            ← 2 xətanır   │
│ - institution_id              ← 1 xəta      │
└──────────────────────────────────────────────┘
```

---

## 6. Database Query Optimization

```
OPTIMIZATION LAYER: Caching During Import

Before Import:
┌─────────────────────────────────────────────────┐
│ Region: "Baku City Region" (ID: 5)              │
│                                                  │
│ Query: Get all institutions in region           │
│ SQL: WITH RECURSIVE institution_tree AS (...)   │
│      SELECT * FROM institutions WHERE id IN ... │
│ Result: 22 institutions                         │
│                                                  │
│ Build Caches:                                   │
│ - institutionCache['533821512'] → Institution  │
│ - institutionCache['MKT-001'] → Institution     │
│ - institutionCache['1 saylı məktəb'] → Inst.   │
│ - academicYearCache['2024-2025'] → Year        │
│ - teacherCache['mkt-001|azada mirzayeva'] → U… │
│                                                  │
│ Total Queries Before Processing: ~5             │
└─────────────────────────────────────────────────┘

During Import (1000 rows):
┌─────────────────────────────────────────────────┐
│ For each row:                                   │
│ 1. Lookup Institution → Cache hit (O(1))        │
│ 2. Lookup Academic Year → Cache hit (O(1))      │
│ 3. Check Duplicate → Indexed query (Fast)       │
│ 4. Lookup Teacher → Cache hit (O(1))            │
│ 5. Create/Update Grade → INSERT/UPDATE          │
│                                                  │
│ WITHOUT Caching: ~4000-5000 queries             │
│ WITH Caching: ~1000-1100 queries (75% reduction)│
│                                                  │
│ Time Estimate:                                  │
│ - 1000 rows × 10-50ms per row = 10-50 seconds  │
│ - Batch processing: 100 rows per batch          │
│ - Total batches: 10                             │
└─────────────────────────────────────────────────┘

INDEXES FOR PERFORMANCE
┌─────────────────────────────────────────────────┐
│ grades table indexes:                           │
│ - institution_id (Quick filter by school)       │
│ - academic_year_id (Filter by year)             │
│ - class_level (Filter by grade)                 │
│ - is_active (Filter by status)                  │
│ - homeroom_teacher_id (Find teacher's classes)  │
│ - (institution_id, academic_year_id, is_active) │
│ - (class_level, is_active)                      │
│                                                  │
│ Unique constraint:                              │
│ - (name, academic_year_id, institution_id,     │
│   class_level) prevents duplicate classes       │
└─────────────────────────────────────────────────┘
```

---

## 7. Validation Rule Hierarchy

```
ROW-LEVEL VALIDATION
└─ Is row completely empty?
   ├─ YES → Skip row silently
   └─ NO → Continue to field validation

FIELD-LEVEL VALIDATION
├─ Class Level
│  ├─ Is required? YES
│  ├─ Type: Integer
│  └─ Range: 0-12 (0=Anasinfi, 1-12=Class)
│
├─ Class Name/Letter
│  ├─ Is required? YES
│  ├─ Max length: 3 characters
│  └─ Source: Direct OR parsed from combined
│
├─ Institution Identifier (Priority order)
│  ├─ 1. UTIS Code (9 digits)
│  ├─ 2. Institution Code (string)
│  └─ 3. Institution Name (string)
│
├─ Teaching Language
│  ├─ Is optional? YES
│  ├─ Default: azərbaycan
│  └─ Allowed: azərbaycan, rus, gürcü, ingilis
│
├─ Teaching Shift
│  ├─ Is optional? YES
│  ├─ Default: 1 növbə
│  └─ Allowed: 1/2/3 növbə, fərdi
│
├─ Teaching Week
│  ├─ Is optional? YES
│  ├─ Default: 6_günlük
│  └─ Allowed: 4_günlük, 5_günlük, 6_günlük
│
├─ Education Program
│  ├─ Is optional? YES
│  ├─ Default: umumi
│  └─ Allowed: umumi, xususi, ferdi_mekteb, ferdi_ev
│
└─ Student Counts
   ├─ Is optional? YES
   ├─ Auto-calculate: total = male + female (if total empty)
   └─ Warn: if gender counts don't match total

ENTITY-LEVEL VALIDATION
├─ Institution
│  ├─ Must exist in system
│  └─ Must be in user's region
│
├─ Academic Year
│  ├─ Must exist OR
│  └─ Auto-create if needed
│
├─ Duplicate Check
│  ├─ Same (level, name, institution, year)?
│  ├─ YES → Update existing Grade
│  └─ NO → Create new Grade
│
└─ Homeroom Teacher
   ├─ Must exist in system
   ├─ Must have teacher role
   ├─ Must be in same institution
   └─ Must NOT be assigned to another class
```

---

## 8. Error Recovery Workflow

```
USER ENCOUNTERS ERRORS
│
├─ View Error List
│  │
│  └─ Choose: Fix Manually OR Export Errors
│
├─ MANUAL FIX PATH
│  │
│  ├─ Open original Excel template
│  ├─ Find rows with errors (by row number)
│  ├─ Correct data according to error messages
│  ├─ Save file
│  └─ Re-import file → New attempt
│
└─ EXPORT ERRORS PATH
   │
   ├─ Click "Excel Yüklə" button
   │  │
   │  └─ System creates error Excel:
   │     ├─ Sheet 1: "Xətalar"
   │     │  ├─ Sətir №: Row number
   │     │  ├─ Sahə: Field name
   │     │  ├─ Yanlış Dəyər: What was entered
   │     │  ├─ Xəta: Error message
   │     │  ├─ Təklif: Suggested fix
   │     │  └─ Context columns
   │     │
   │     └─ Sheet 2: "Statistika"
   │        ├─ Ümumi işlənmiş: 28
   │        ├─ Uğurlu: 25
   │        └─ Xətalı: 3
   │
   ├─ Download error file
   │
   ├─ Open error file in Excel
   │
   ├─ Review error details:
   │  ├─ Column A: Row number from original file
   │  ├─ Column B: Field that had error
   │  ├─ Column C: Value that caused error
   │  ├─ Column D: Error explanation
   │  └─ Column E: Suggested fix
   │
   ├─ Use error details to fix original file:
   │  ├─ Go to row X in original file
   │  ├─ Find column Y
   │  ├─ Apply suggested fix
   │  └─ Save original file
   │
   └─ Re-import corrected original file → Success!

ITERATION CYCLE
- Import 1: 1000 rows, 950 success, 50 errors
  └─ Export errors
- Fix errors in original file based on suggestions
- Import 2: 1000 rows, 999 success, 1 error
  └─ Export error
- Fix final error
- Import 3: 1000 rows, 1000 success, 0 errors ✓
```

---

## 9. Key Performance Metrics

```
THROUGHPUT
┌──────────────────────┬────────────────┐
│ Metric               │ Target         │
├──────────────────────┼────────────────┤
│ Rows per second      │ 20-50 rows/s   │
│ Small file (<100)    │ 5-10 seconds   │
│ Medium file (1000)   │ 20-50 seconds  │
│ Large file (5000)    │ 100-250 sec*   │
│ *Async job recommended for > 5000 rows
└──────────────────────┴────────────────┘

RESOURCE USAGE
┌──────────────────────┬────────────────┐
│ Metric               │ Value          │
├──────────────────────┼────────────────┤
│ Max file size        │ 5 MB           │
│ Memory per batch     │ ~50 MB         │
│ DB connections used  │ 1              │
│ Cache entries        │ ~200-300       │
│ Max batch size       │ 100 rows       │
└──────────────────────┴────────────────┘

OPTIMIZATION TECHNIQUES
┌──────────────────────┬──────────────────────┐
│ Technique            │ Benefit              │
├──────────────────────┼──────────────────────┤
│ Institution caching  │ 95% query reduction  │
│ Teacher caching      │ 80% query reduction  │
│ Year caching         │ 90% query reduction  │
│ Batch processing     │ Better memory usage  │
│ Chunk reading        │ Stream large files   │
│ Indexes              │ Fast duplicate check │
│ Eager loading        │ Reduce N+1 queries   │
└──────────────────────┴──────────────────────┘
```

---

## 10. Integration Points Summary

```
FRONTEND INTEGRATION
├─ RegionClassManagement page
│  └─ Statistics, filters, table, pagination
│
├─ RegionClassImportModal component
│  ├─ File upload UI
│  ├─ Progress tracking
│  ├─ Error display (list/table)
│  └─ Export errors
│
└─ regionAdminClassService
   └─ API calls (import, template, export, fetch)

BACKEND INTEGRATION
├─ RegionAdminClassController
│  ├─ importClasses() endpoint
│  ├─ exportClassesTemplate() endpoint
│  ├─ getStatistics() endpoint
│  └─ Others (CRUD operations)
│
├─ ClassesImport handler
│  ├─ Row processing logic
│  ├─ Validation rules
│  ├─ Error handling
│  └─ Caching layer
│
├─ ClassesTemplateExport
│  ├─ Template generation
│  ├─ Styling and formatting
│  └─ Validation dropdowns
│
└─ Grade model
   ├─ Database relationships
   ├─ Attribute casting
   └─ Scopes and queries

DATABASE INTEGRATION
├─ grades table (primary)
├─ academic_years table
├─ institutions table
├─ users table (teachers)
└─ user_profiles table

LARAVEL ECOSYSTEM
├─ Maatwebsite\Excel (import/export)
├─ Sanctum (authentication)
├─ Authorization (role checking)
├─ Eloquent ORM (database)
└─ Validation framework

FRONTEND ECOSYSTEM
├─ React + TypeScript
├─ TanStack React Query (data fetching)
├─ TailwindCSS (styling)
├─ Shadcn/UI (components)
├─ XLSX library (error export)
└─ Lucide React (icons)
```

---

**This visual guide provides a complete architectural overview of the Classes Import system.**
