# Backend Test Plan və Prioritetlər

Bu sənəd ATİS backend modulunda hazırkı test əhatəsini, boşluqları və növbəti addımlar üçün konkret planı ümumiləşdirir. Fokus aşağıdakı əsas funksional bloklarda yerləşir:

- İstifadəçi autentifikasiyası, rol/hüquq əsaslı marşrutlar
- İstifadəçi və təşkilat (institution) idarəçiliyi
- Sorğu (survey) prosesi
- Fayl idarəçiliyi və sənəd axınları
- İdxal/ixrac (import/export)
- Fənn (subject) və sinif (class) idarəçiliyi
- Bildirişlər
- Yumşaq (soft) və sərt (hard) silmə mexanizmləri
- Scheduler və workload inteqrasiyası

---

## 1. Autentifikasiya və Rol əsaslı marşrut nəzarəti

| Mövcud testlər | `tests/Feature/UserTest.php`, `NavigationControllerTest.php`, `RolePermissionTest.php`, `SystemConfigControllerTest.php` |
| --- | --- |
| Əhatə | API login/registrasiya, `/api/me` qorunmuş marşrutuna çıxış, menyu hüquqları, spatie `role/permission` logikası |
| Boşluqlar | Logout axını üçün ayrıca test yoxdur. Sessiyanın vaxtı bitdikdə davranış (session timeout) və ardıcıl səhv login cəhdləri yoxlanmır. |
| Plan | \
  1. Yeni Feature testi (`Auth/LogoutTest.php`) – sessiyanın bitməsi, token ləğvi. \
  2. `UserTest` genişləndirilməsi – ardıcıl 5 yanlış login cəhdinin `SystemConfig` məhdudiyyəti ilə uyğunluğunu yoxlamaq. \
  3. Regression komandası: `php artisan test --filter=UserTest --filter=NavigationControllerTest`. |

---

## 2. İstifadəçi idarəçiliyi və Yumşaq/Sərt silmə

| Mövcud testlər | `UserCrudTest.php`, `UserDepartmentAssignmentTest.php`, `UserSoftDeleteTest.php`, `AdminAutoCreationIntegrationTest.php` |
| Əhatə | CRUD əməliyyatları, istifadəçilərin departamentlərə təyinatı, yumşaq silmə bərpası. |
| Boşluqlar | Hard delete (tam silmə) ssenarisi test olunmur; audit logları öyrənilmir. |
| Plan | \
  1. Yeni test ssenarisi: `UserHardDeleteTest` – `forceDelete` və əlaqədar körpü cədvəllərin davranışı. \
  2. Audit logları üçün unit/feature test – silmə və bərpa əməliyyatlarının `activity_logs`-a düşməsi. \
  3. Regression: `php artisan test --filter=UserCrudTest --filter=UserSoftDeleteTest`. |

---

## 3. Təşkilat (Institution) idarəçiliyi

| Mövcud testlər | `InstitutionCrudTest.php`, `InstitutionCreationTest.php`, `InstitutionManagementTest.php`, `InstitutionServiceTest.php`, `InstitutionTest.php`, `RegionalAccessControlTest.php` |
| Əhatə | Hierarxiyanın yaradılması, icazələr, müxtəlif rol-ların institution-lara çıxışı. |
| Boşluqlar | Import/export axınları (CSV/Excel) tam test olunmur; rollback və audit ssenariləri əhatə olunmur. |
| Plan | \
  1. Yeni Feature testi `InstitutionImportExportTest.php`: düzgün fayl formatı, yanlış format, qismən uğur halları. \
  2. Audit log-ların (institution dəyişiklikləri) yoxlanması. \
  3. Regression: `php artisan test --filter=InstitutionCrudTest --filter=InstitutionManagementTest`. |

---

## 4. Sorğular (Surveys)

| Mövcud testlər | `SurveyTest.php`, `SurveyApprovalControllerTest.php`, `SurveyApprovalWorkflow` releated testlər |
| Əhatə | Rol əsaslı giriş, bulk əməliyyatlar (publish/close/archive), dashboard statistikaları. |
| Boşluqlar | Survey versiyaları, audit log-lar, yumşaq vs sərt silmə, sorğu nəticələrinin ixracı. |
| Plan | \
  1. `SurveyVersioningTest` – yeni versiya yaradılması və keçid. \
  2. Sorğu silinməsi (`softDelete`, `forceDelete`) üçün testlər. \
  3. Export (CSV/PDF) funksiyalarına unit test. |

---

## 5. Fayl idarəçiliyi (upload/download)

| Mövcud testlər | `DocumentServiceTest.php`, `DocumentManagement` blokları, `NotificationSystemTest` (fayl paylaşımları) |
| Əhatə | Fayl yüklənməsi, paylaşılması, bildirişlərlə inteqrasiya. |
| Boşluqlar | Böyük fayllar, MIME məhdudiyyəti, paralel fayl yükləmələri, fayl versiyalaşması yoxlanmır. |
| Plan | \
  1. Yükləmə limitləri (həcmi və zaman) üçün əlavə test ssenarisi. \
  2. Fayl silinməsi və bərpası (əgər mövcuddursa) üçün test. |

---

## 6. İdxal/İxrac (Import/Export)

| Mövcud testlər | `EndToEndWorkflowTest.php`, `Feature/ImportExport/StudentImportExportTest.php` (şagird importu və şablon generasiyası) |
| Görülən işlər | \
  • `StudentImportExportService` üçün real Excel faylları ilə uğurlu import + xəta ssenarisi testləri əlavə olundu. \
  • `user_profiles` cədvəlinə təcili əlaqə sahələri üçün migration (`2025_10_20_131500_add_emergency_contact_fields_to_user_profiles_table.php`) əlavə edildi ki, servis sahələrlə uyğunlaşsın. \
  • `StudentManagementService` profil məlumatlarını JSON və təcili əlaqə sahələri ilə düzgün xəritələyir. |
| Boşluqlar | Müəllim/personnel və institution import axınları üçün xüsusi testlər, yarımçıq import rollback ssenariləri və fərqli fayl formatlarına qarşı yoxlamalar hələ yoxdur. |
| Plan | \
  1. Müəllim/personnel üçün `UserImportExportTest`; institution üçün `InstitutionImportExportTest` – səhv başlıq, duplikat və icazə ssenariləri. \
  2. Rollback/transaction testləri – import yarımçıq qaldıqda DB dəyişikliklərinin geri alınması. \
  3. Regression: `php artisan test --filter=EndToEndWorkflowTest`. |
| Son icra | `php artisan test --filter=StudentImportExportTest` (2025-10-20) — **keçdi**. |

---

## 7. Fənn (Subject) və Sinif (Class) idarəçiliyi

| Mövcud testlər | `Feature/SubjectManagementTest.php` (CRUD və silmə məhdudiyyətləri), `Unit/Services/GradeManagementServiceTest.php` (sinif yaratma/yoxlama) |
| Görülən işlər | \
  • Subject CRUD üçün REST səviyyəsində testlər əlavə olundu – yaradılma/yenilənmə və müəllim təyinatı olduqda silmənin bloklanması. \
  • Sinif idarəçiliyi üçün `GradeManagementService`-in yaradılma və yenilənmə ssenariləri unit testlə əhatə olundu; uyğunsuz şagird sayları üçün valide hissəsi yoxlanıldı. |
| Boşluqlar | Sinif silinməsi (`deleteGrade`) və homeroom teacher təyinatı ssenariləri üçün testlər hələ yoxdur; `GradeManagementService`-də mövcud olmayan `deleteGrade` implementasiyası təsdiqlənməlidir. |
| Plan | \
  1. `GradeManagementService` üçün sinif silmə/deaktivasiya və tag sinxronizasiyası testlərini əlavə etmək (mövcud API `deleteGrade` metodunun implementasiyasını tamamla). \
  2. Subject controller-də status dəyişimi (`toggleStatus`) və bulk əməliyyatların testləşdirilməsi. |

---

## 8. Bildirişlər

| Mövcud testlər | `NotificationControllerTest.php`, `NotificationSystemTest.php`, `TaskManagementTest.php` daxilində bildiriş yoxlamaları |
| Boşluqlar | Bildirişin oxunması, “oxundu” statusunun yenilənməsi, real-time kanal testləri əhatə olunmur. |
| Plan | \
  1. `NotificationLifecycleTest` – yaradılma → çatdırılma → oxunma → arxivləşmə pillələri. \
  2. Websocket və ya broadcasting kanalında test ssenarisinin əlavə edilməsi (mövcudsa). |

---

## 9. Yumşaq və Sərt silmə (Soft/Hard Delete)

| Mövcud testlər | `UserSoftDeleteTest.php`, `DocumentServiceTest.php` (kontekst daxilində), `Inventory` testləri |
| Boşluqlar | Soft delete olan digər entitilər (institution, survey, document) üçün vahid ssenari yoxdur; hard delete testləri demək olar ki, mövcud deyil. |
| Plan | \
  1. Soft delete matrisi: hər entiti üçün (user, institution, document, survey) `restore`, `forceDelete` ssenariləri. \
  2. Audit log-lar və bağlı məlumatların silindikdən sonra necə davranması (örn. user silindikdə teaching load-lar). |

---

## 10. Scheduler və Workload inteqrasiyası

| Mövcud status | `ScheduleGenerationEngineTest.php` yaşıl; `WorkloadScheduleIntegrationServiceTest.php` **tam keçdi** (11/11). |
| Görülən işlər | \
  • `TeachingLoadFactory` `ClassModel` faktoru və mövcud sütunlarla uyğunlaşdırıldı. \
  • `WorkloadScheduleIntegrationService`-də istifadəçi kontekstindən işləyən `getWorkloadReadyData`, `validateWorkloadData`, `generateTimeSlots` və digər köməkçi metodlar implement olundu. \
  • `ScheduleGenerationSetting::generateTimeSlots()` Carbon istifadəsi ilə saatları string formatında qaytarır. \
  • `teaching_loads` cədvəlinə `institution_id` sütunu üçün migration əlavə edildi. |
| Aktual boşluqlar | API qatına əlavə inteqrasiya testləri və edge-case ssenariləri (məsələn, qarışıq schedule statusları) hələ yazılmayıb. |
| Növbəti addımlar | \
  1. Schedule generation API endpoints üçün end-to-end test ssenarisi. \
  2. Ziddiyyətli (conflict) status senarilərini əhatə edən əlavə unit testlər. |
| Son icra | `php artisan test --filter=WorkloadScheduleIntegrationServiceTest` (2025-10-20) — **keçdi**. |

---

## Test İcra Planı

| Addım | Komanda | Qeyd |
| --- | --- | --- |
| 1 | `php artisan test --filter=UserTest` | Autentifikasiya ssenarilərini yoxla |
| 2 | `php artisan test --filter=NavigationControllerTest` | Rol əsaslı menyu |
| 3 | `php artisan test --filter=UserCrudTest --filter=UserSoftDeleteTest` | İstifadəçi CRUD + soft delete |
| 4 | `php artisan test --filter=InstitutionCrudTest` | Institution idarəçiliyi |
| 5 | `php artisan test --filter=SurveyTest --filter=SurveyApprovalControllerTest` | Sorğu prosesləri |
| 6 | `php artisan test --filter=DocumentServiceTest` | Fayl idarəçiliyi |
| 7 | `php artisan test --filter=NotificationControllerTest` | Bildirişlər |
| 8 | `php artisan test --filter=ScheduleGenerationEngineTest` | Hal-hazırda yaşıl |
| 9 | `php artisan test --filter=WorkloadScheduleIntegrationServiceTest` | Tamamlandı (2025-10-20) |
| 10 | `php artisan test` | Yekun regressiya |

---

## Növbəti addımların prioritet sıralaması

1. **Kritik**: Import/export və subject/class CRUD üçün yeni test şablonlarının yazılması.
2. **Kritik**: Invitə edilmiş sərt silmə və audit log testlərinin əlavə olunması.
3. **Yüksək**: Fayl və bildiriş axınlarının tam testləşdirilməsi.
4. **Orta**: Logout/session timeout ssenariləri.
5. **Orta**: Survey versiyalaşması və export testləri.
6. **Aşağı**: Böyük fayllar, MIME məhdudiyyətləri, real-time bildiriş kanalı kimi edge-case ssenariləri.

Bu plan əsasında əməliyyat:
1. Boşluqlar üçün yeni test faylları yaradılır.
2. Mövcud testlərdəki fail-lər düzəldilir.
3. Hər mərhələdən sonra fokus sistemlər yenidən `php artisan test` ilə doğrulanır.

Sənəd yenilənməsi: hər yeni test bloku reallaşdıqca bu fayl aktual saxlanılmalıdır.

---

## Test İcra TODO siyahısı (2025-10-20)

1. `[x] php artisan test --filter=DepartmentTest` — **PASS** (after fixing permission seeding, pagination expectations, hard delete branch, and type endpoint)
2. `[x] php artisan test --filter=DocumentServiceTest` — **PASS** (roles seeded, document factories aligned, sharing schema migration added, statistics assertions adjusted)
3. `[x] php artisan test --filter=InstitutionCreationTest` — **PASS**
4. `[x] php artisan test --filter=InstitutionCrudTest` — **PASS**
5. `[x] php artisan test --filter=InstitutionManagementTest` — **PASS**
6. `[x] php artisan test --filter=InstitutionServiceTest` — **PASS**
7. `[x] php artisan test --filter=InstitutionTest` — **PASS** (1 test skipped — hidden attributes yoxlanışı)
8. `[x] php artisan test --filter=InventoryControllerTest` — **PASS**
9. `[ ] php artisan test --filter=EndToEndWorkflowTest` — **FAIL** (test ssenarisi köhnə model adlarından (`Classes`, `ClassAttendance`) istifadə edir; mövcud modellərlə (`ClassModel`, `AttendanceRecord`) uyğunlaşdırılmalıdır; bax: tests/Feature/EndToEndWorkflowTest.php)

**İcra qeydləri (2025-10-20)**  
- Institution və Inventory bloklarının testləri real API cavabları ilə uyğunlaşdırıldı; əlavə marşrut düzəlişləri (`/api/hierarchy`, `institutions/statistics`, `inventory` `search/categories`) edilib.  
- `users` cədvəlinə `first_name`/`last_name` sütunları əlavə edən migrasiya daxil edildi və seeder-lər (`SuperAdminSeeder`) güncəlləndi.  
- `InventoryControllerTest` üçün icazə orta təbəqəsi `inventory.create/read/update/delete` hüquqları ilə sinxronlaşdırıldı, servisə axtarış və kateqoriya API-ləri əlavə olundu.  
- `EndToEndWorkflowTest` hələ də köhnə model adlarına güvəndiyindən **FAIL** statusundadır; `ClassModel`, `AttendanceRecord` kimi faktiki modellərə migrasiya olunmalıdır.
