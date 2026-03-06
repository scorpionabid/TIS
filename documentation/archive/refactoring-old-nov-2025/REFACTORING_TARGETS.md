# Refactoring Priority Files (1000+ lines) - UPDATED 2025-11-06

**Status:** PRODUCTION ACTIVE - Refaktorinq ehtiyatlı şəkildə həyata keçirilməlidir
**İlgili Sənəd:** [REFACTORING_ROADMAP_2025.md](./REFACTORING_ROADMAP_2025.md) - Dəqiq mərhələli plan üçün

---

## 🔴 ACTIVE REFACTOR TARGETS (1000+ lines)

Aşağıdakı fayllar 1000 sətirdən çoxdur və refaktor prioritetinə malikdir:

### Backend Services & Controllers

| Fayl | Orijinal | Cari | Hədəf | Prioritet | Status |
|------|----------|-------|-------|-----------|--------|
| ~~`backend/app/Services/SurveyAnalyticsService.php`~~ | ~~1453~~ | **1227** | <500 | 🔴 P1 | ✅ **Sprint 5 TAMAMLANDI** - 3 servis inteqrasiyası, 15.5% azalma |
| ~~`backend/app/Services/Import/ImportOrchestrator.php`~~ | ~~1027~~ | **305** | <500 | 🟡 P3 | ✅ **Sprint 2 TAMAMLANDI** - 28 domain servisi, 70.3% azalma |
| ~~`backend/app/Services/SurveyCrudService.php`~~ | ~~1012~~ | **250** | <500 | 🟡 P3 | ✅ **Sprint 3 TAMAMLANDI** - 5 domain servisi, 75.3% azalma |
| ~~`backend/app/Services/LinkSharingService.php`~~ | ~~1000~~ | **156** | <500 | 🟡 P4 | ✅ **Sprint 4 TAMAMLANDI** - 7 domain servisi, 84.4% azalma |
| ~~`backend/app/Http/Controllers/Grade/GradeUnifiedController.php`~~ | ~~1451~~ | **595** | <500 | 🔴 P1 | ✅ **Sprint 6 TAMAMLANDI** - 13 metod delegation, 59.0% azalma |
| ~~`backend/app/Services/SurveyApprovalService.php`~~ | ~~1283~~ | **1,085** | <500 | 🟠 P2 | ✅ **Sprint 7 TAMAMLANDI** - 2 servis delegation, 15.4% azalma |
| `backend/app/Services/GradeManagementService.php` | 1102 | **1,064** | <500 | 🟠 P2 | 🟡 **Sprint 8 QISMƏN** - Dead code cleanup, 3.4% azalma (realist hədəf: 1,064 optimal) |

### Frontend Services

| Fayl | Cari Sətir | Hədəf | Prioritet | Status |
|------|-----------|-------|-----------|--------|
| ~~`frontend/src/services/superAdmin.ts`~~ | ~~1036~~ | **14** | <500 | 🟠 P2 | ✅ **Sprint 9 TAMAMLANDI** - 13 domain servisi, 98.6% azalma (main file) |

---

## ✅ Refaktor Edilmiş / Silinmiş Fayllar

### Artıq Silinməli Backup Fayllar

| Fayl | Səbəb | Tədbir |
|------|-------|--------|
| ~~`frontend/src/components/modals/InstitutionModalStandardized.tsx.backup`~~ | ❌ Tapılmadı - artıq silinib | ✅ TƏMİZ |
| ~~`frontend/src/components/modals/UserModal.tsx.backup`~~ | ❌ Tapılmadı - artıq silinib | ✅ TƏMİZ |
| `frontend/src/components/modals/UserModal/UserModal.DEPRECATED.tsx` | Modulyar versiya aktiv | 🗑️ SİL |
| `frontend/src/components/grades/GradeCreateDialog.tsx.backup` | Aktiv versiya mövcud | 🗑️ SİL |
| `frontend/src/components/modals/InstitutionModal.tsx.backup` | Standardlaşdırılıb | 🗑️ SİL |
| `frontend/src/components/approval/survey-results/SurveyResultsTab.tsx.backup` | Yeni versiya aktiv | 🗑️ SİL |

---

## 📊 Mövcud Modulyar Servislər (Refaktor Üçün Hazır Infrastruktur)

### ✅ Analytics Modulları
- `backend/app/Services/Analytics/HierarchicalAnalyticsService.php` ✅
- `backend/app/Services/ClassAnalyticsService.php` ✅
- `backend/app/Services/ReportAnalyticsService.php` ✅
- `backend/app/Services/PerformanceAnalyticsService.php` ✅
- `backend/app/Services/LinkAnalyticsService.php` ✅
- `backend/app/Services/ApprovalAnalyticsService.php` ✅

### ✅ Import Modulları
- `backend/app/Services/Import/InstitutionExcelParserService.php` ✅
- `backend/app/Services/Import/ImportErrorAnalyzerService.php` ✅
- `backend/app/Services/Import/InstitutionAdminCreatorService.php` ✅
- `backend/app/Services/Import/InstitutionTypeProcessorFactory.php` ✅

### ✅ Schedule Modulları
- `backend/app/Services/RoomScheduleService.php` ✅
- `backend/app/Services/Schedule/AdvancedConflictResolver.php` ✅

### ✅ Survey Modulları
- `backend/app/Services/SurveyApprovalBridge.php` ✅
- `backend/app/Services/SurveyNotificationService.php` ✅
- `backend/app/Services/SurveyTargetingService.php` ✅
- `backend/app/Services/SurveyResponseCacheService.php` ✅
- `backend/app/Services/SurveyExportService.php` ✅ (Sprint 7 - NEW)

### ✅ Grade Modulları
- `backend/app/Http/Controllers/Grade/GradeStatsController.php` ✅
- `backend/app/Http/Controllers/Grade/GradeCRUDController.php` ✅
- `backend/app/Http/Controllers/Grade/GradeStudentController.php` ✅

---

## 📝 Qeyd: Kod təmizliyi və refaktor üçün qeyri-kod fayllar istisna edilmişdir

Aşağıdakı böyük fayllar refaktor tələb etmir:
- `backend/composer.lock` (dependency lock)
- `backend/database/database*.sqlite` (database fayllar)
- `database-backups/*.sqlite` (backup fayllar)
- `frontend/package-lock.json` (dependency lock)
- `phpunit-unit.log` (log fayllar)
- Documentation və markdown fayllar (*.md)

---

**Son Yenilənmə:** 2025-11-06
**Növbəti Review:** Hər sprint sonunda (həftəlik)
**Əlaqəli Sənədlər:**
- [REFACTORING_ROADMAP_2025.md](./REFACTORING_ROADMAP_2025.md) - Dəqiq icra planı
- [files_over_500_lines.txt](./files_over_500_lines.txt) - Tam fayl siyahısı

## Dərin Refaktoring Qeydləri

- **backend/app/Http/Controllers/Grade/GradeUnifiedController.php & backend/app/Services/GradeManagementService.php** — `statistics` (`GradeUnifiedController.php:585`) və `capacityReport` (`:637`) kimi metodlar artıq modulyar saxlanılan `backend/app/Http/Controllers/Grade/GradeStatsController.php:18` və `backend/app/Services/ClassAnalyticsService.php:15` ilə üst-üstə düşür. Həmçinin kabinet/otaq yoxlamaları `backend/app/Services/RoomScheduleService.php:15` və cədvəl konfliktlərinin həlli `backend/app/Services/Schedule/AdvancedConflictResolver.php:25` daxilindədir. Bu məntiqi həmin servislərə yönləndirməklə hər fayl 500 sətri keçmir.
- **backend/app/Services/SurveyAnalyticsService.php** — Metodoji bloklar (`getSurveyAnalytics`, `getTrendAnalysis`, `getKPIMetrics` və s.) artıq funksionallıq təmin edən modul servislərlə eyni işi görür: `backend/app/Services/Analytics/HierarchicalAnalyticsService.php:20`, `backend/app/Services/ReportAnalyticsService.php:19`, `backend/app/Services/PerformanceAnalyticsService.php:20`, `backend/app/Services/SurveyTargetingService.php:16`, `backend/app/Services/SurveyResponseCacheService.php:19`. Hər şöbəni bu servislərə və ya yeni kiçik wrapper-lərə bölmək həm təkrarı aradan qaldırır, həm də fayl ölçüsünü azaldır.
- **backend/app/Services/SurveyApprovalService.php & backend/app/Services/SurveyCrudService.php** — Workflow, görünürlük filtrasiya və notification-lar biri-birinin kodunu təkrarlayır. Approval axınını `backend/app/Services/SurveyApprovalBridge.php:19` və `backend/app/Services/SurveyNotificationService.php:27` üzərinə ötürmək, CRUD tərəfində isə `applyHierarchicalFiltering` (`SurveyCrudService.php:888`) kimi hissələri `backend/app/Services/SurveyTargetingService.php:16` və `backend/app/Services/SurveyResponseCacheService.php:55` ilə bölüşmək refaktoru asanlaşdırır.
- **backend/app/Services/Import/ImportOrchestrator.php** — Parser, validasiya və admin yaradılması kimi bütün mərhələlər artıq ayrıca fayllarda saxlanılır (`ImportErrorAnalyzerService.php:19`, `InstitutionExcelParserService.php:28`, `InstitutionAdminCreatorService.php:18`, `InstitutionTypeProcessorFactory.php:19`). Orkestrator yalnız koordinasiya hissəsini saxlayaraq bu servis/fabriklərə güvənməlidir ki, həm ölçü azalsın, həm də təkrarçılıq olmasın.
- **backend/app/Services/LinkSharingService.php** — Analitika və paylama məntiqi `backend/app/Services/LinkAnalyticsService.php:17` və `backend/app/Services/DocumentSharingService.php:26` daxilində hazırdır. Əsas servis icazə yoxlaması və orkestr rolunda qalmalıdır; əks halda eyni sorğular müxtəlif fayllarda təkrarlanır.
- **frontend/src/services/superAdmin.ts** — SuperAdmin servisi müxtəlif domen API-larını bir faylda birləşdirir. Halbuki `frontend/src/services/attendance.ts:83`, `frontend/src/services/tasks.ts:91`, `frontend/src/services/reports.ts:92`, `frontend/src/services/surveys.ts:25`, `frontend/src/services/dashboard.ts:91`, `frontend/src/services/settings/SystemHealthService.ts:19` kimi xüsusi servislər mövcuddur. Buradakı metodları həmin servislərə yönləndirmək və ya nazik delegatorlarla bölmək təkrarı aradan qaldıracaq.
- **frontend/src/components/modals/InstitutionModalStandardized.tsx.backup** — Bu ehtiyat fayl təsdiq, validation və UI məntiqini birləşdirir, lakin artıq `frontend/src/components/modals/InstitutionModalStandardized.tsx:1`, `frontend/src/components/modals/institution/useInstitutionValidation.tsx:1`, `frontend/src/hooks/useInstitutionTypes.ts:1` kimi modulyar strukturlar var. Backup faylı ya silinməli, ya da həmin hook-lara bölünərək müasir quruluşda saxlanmalıdır.
- **frontend/src/components/modals/UserModal.tsx.backup** — Aktiv versiya `frontend/src/components/modals/UserModal/index.tsx:1` və onun `hooks/` altındakı 500 sətirdən az fayllar vasitəsilə parçalanıb. Backup faylı artıq ehtiyac olmayan köhnə kodu saxlayır; refaktordan sonra silinməsi tövsiyə olunur.

## Regionadmin Folder Toplanması və İdarəetməsinin Təkmilləşdirilməsi

- **Discovery mərhələsi**
  - `DocumentCollectionController@index/show` çağırışlarını Telescope/DB query log ilə profilə et; gecikmə və N+1 risklərini sənədləşdir (`backend/app/Http/Controllers/DocumentCollectionController.php:21`).
  - `storage/app/temp` qovluğunda ZIP faylları üçün təmizlik siyasətini yoxla və boşluqları qeyd et.
  - `RegionalFolderManager`-də React Query istənmələrinə telemetry markerləri əlavə etmə ehtiyacını qiymətləndir (`frontend/src/components/documents/RegionalFolderManager.tsx:31`).

- **Backend refaktoru**
  - `DocumentCollectionService`-in funksiyalarını (folder yaratma, sənəd yükləmə, ZIP) ayrı servislərə böl; controller yalnız orkestr rolunda qalsın (`backend/app/Services/DocumentCollectionService.php:20`, `:209`, `:438`).
  - ZIP yükləmələri üçün queue-based job tətbiq et və tamamlandıqda audit log yaz, müvəqqəti fayllar üçün TTL təyin et.
  - `uploadDocumentToFolder`-ə MIME doğrulama, virus scan hook-u və accessible institution siyahısının sənədləşdirilməsi əlavə et (`backend/app/Services/DocumentCollectionService.php:438`).
  - `logFolderAction` üçün throttling/lazy yazı strategiyası və kritik hadisələrdə notification kanallarına xəbərdarlıq konfiqurasiya et (`backend/app/Services/DocumentCollectionService.php:540`).

- **İcazə və limitlərin gücləndirilməsi**
  - `canManageFolder`-i owner və target institution kontekstinə görə genişləndir, `Document` modelində `accessible_institutions` yoxlamasını sərtləşdir (`backend/app/Services/DocumentCollectionService.php:185`, `backend/app/Models/Document.php:347`).
  - Fayl ölçüsü və kvota limitlərini konfiqurasiyadan oxu; `uploadDocument` cavabında qalan kvotanı qaytar (`backend/app/Http/Controllers/DocumentCollectionController.php:318`).
  - Frontend icazə helper-larında (`frontend/src/utils/permissions.ts:100`) limit xəbərdarlıqları və UI signalı üçün genişləndirmələr planlaşdır.

- **API performansı**
  - `getFolderDocumentsPaginated`-də filtr və sort kriteriyalarını DB səviyyəsində tətbiq et, `withCount` və eager loading ilə N+1-ləri ləğv et (`backend/app/Services/DocumentCollectionService.php:277`).
  - Region folder siyahısı üçün `Cache::remember` istifadə et və create/update/delete əməliyyatları zamanı cache invalidation mexanizmi qur.
  - Profil nəticələrinə əsasən lazım gələrsə materialized view və ya async aggregation opsiyalarını dəyərləndir.

- **Frontend təkmilləşdirmələri**
  - `RegionalFolderManager`-də infinite scroll və skeleton loading tətbiq et, səhifələmə üçün TanStack `fetchNextPage`-dən yararlan (`frontend/src/components/documents/RegionalFolderManager.tsx:31`).
  - `FolderDocumentsViewOptimizedV2`-də filter state-lərini URL query ilə sinxronlaşdır, offline retry üçün optimistic update scenarisi hazırla (`frontend/src/components/documents/FolderDocumentsViewOptimizedV2.tsx:67`).
  - `FileUploadZone`-da real upload progress üçün XHR progress event-lərini istifadə et, retry/abort idarəetməsini əlavə et (`frontend/src/components/documents/FileUploadZone.tsx:12`).

- **Monitorinq və xəbərdarlıqlar**
  - `FolderAuditLog` hadisələrindən Prometheus/Grafana metrikləri çıxarmaq üçün event-lər yayımla və Slack/e-mail alertləri konfiqurasiya et.
  - Frontend error telemetry-sini (Sentry və s.) folder əməliyyatlarına tag-larla zənginləşdir.

- **Test və sənədləşmə**
  - `tests/Feature/DocumentCollections/` altında create/update/upload və queue job axınları üçün feature testləri yaz.
  - Regionadmin → target müəssisə upload ssenarisini Playwright/Cypress ilə avtomatlaşdır.
  - Bu planı `documentation/` daxilində runbook kimi dərc et, deployment üçün tələb olunan yeni env/config parametrlərini `DEPLOYMENT_GUIDE.md`-ə əlavə et.

- **Koordinasiya addımları**
- Product/DevOps komandası ilə prioritetləri və ardıcıllığı təsdiqlə.
- Sprint backlog-da tapşırıqları mərhələlərə böl və asılılıqları qeyd et.
- Profilə nəticələrinə əsaslanan optimizasiya iterasiyalarını planla və statusu mütəmadi yenilə.

## Test Suite Overhaul (2025-02 Refactor)

### Backend (Laravel)
- Köhnə `tests/Feature/*`, `tests/Unit/*`, `tests/Performance/*` faylları silinib; təkrar və köhnəlmiş ssenarilər ləğv olundu.
- Yeni struktur:
  - `tests/Support/SeedsDefaultRolesAndPermissions.php` — rol/icazə seedlərini paylaşan util.
  - `tests/Feature/Auth/LoginTest.php`, `MeEndpointTest.php`, `TokenLifecycleTest.php` — autentifikasiya və token dövriyyəsi ssenariləri.
  - `tests/Feature/Institutions/InstitutionListingTest.php` — icazə filtrlərini yoxlayır.
  - `tests/Feature/Surveys/SurveyManagementTest.php`, `SurveyResponseFlowTest.php`, `SurveyStatusTransitionsTest.php`, `SurveyAnalyticsTest.php`, `SurveyNotificationTest.php`, `SurveyApprovalFlowTest.php` — sorğu CRUD, status çevrilmələri, cavab toplama, analitika, bildiriş və approval/bulk axınlarını yoxlayır.
  - `tests/Feature/Documents/DocumentCollectionRegionalCreationTest.php`, `DocumentCollectionManagementTest.php`, `DocumentCollectionAccessTest.php` — qovluq şablonlarının yaradılması, auditli yeniləmə/silmə və rol əsaslı sənəd siyahılamasını təsdiqləyir.
  - `tests/Unit/Services/Auth/LoginServiceTest.php`, `LogoutServiceTest.php` — servis davranışı (successful, rotation, logout, validation).
- Testləri çalışdırmaq üçün:
  ```bash
  cd backend
  composer dump-autoload
  ./vendor/bin/phpunit       # və ya kök qovluqda ./run-tests.sh --backend-only
  ```
  Coverage üçün Xdebug və ya PCOV əlavə etmək lazımdır; hazırda runner xəbərdarlıq verir.

### Frontend (Vite + Vitest)
- Köhnə `src/tests/components/*`, `src/tests/services/*`, `src/services/__tests__/*`, `src/components/schedules/components/__tests__/*` ssenariləri təmizləndi.
- Yeni sınaqlar:
  - `src/tests/hooks/useUserModalFields.test.ts` — User modal hook-un rola görə dinamik sahələrini yoxlayır.
  - `src/tests/utils/roleTabConfig.test.ts` — rol tab konfiqurasiyasının görünürlüyünü təsdiqləyir.
- `src/tests/setup.ts` yenidən quruldu (Jest DOM, observer polyfill-lər, matchMedia mock-u).
- Testləri çalışdırmaq üçün:
  ```bash
  cd frontend
  npm test -- --run
  ```
  `./run-tests.sh` skripti artıq sadələşdirilmişdir: backend-də vahid PHPUnit icrası edilir, əlavə teardown testləri çıxarılıb və coverage üçün Xdebug/PCOV ehtiyacı barədə xəbərdarlıq edilir.

### Növbəti addımlar
- Backend üçün əlavə feature testləri: istifadəçi CRUD, dashboard cache və audit axınları.
- Frontend üçün Playwright/Vitest ssenariləri: RegionAdmin istifadəçi modalı, icazə vakansiyaları və API xəta halları.
