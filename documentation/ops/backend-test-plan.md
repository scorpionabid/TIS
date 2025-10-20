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

| Mövcud testlər | `EndToEndWorkflowTest.php` (yolxətinin bir hissəsi) |
| Boşluqlar | İstifadəçi/institution import/export modullarının ayrıca testləri yoxdur; səhv fayl formatları və rollback ssenariləri əhatə olunmur. |
| Plan | \
  1. Yeni Feature test: `UserImportExportTest`, `InstitutionImportExportTest` – CSV/Excel formatları, yanlış başlıqlar, duplikat sətirlərin emalı. \
  2. Rollback/transaction testləri – import yarımçıq qaldıqda DB dəyişikliklərinin geri alınması. \
  3. Regression: `php artisan test --filter=EndToEndWorkflowTest`. |

---

## 7. Fənn (Subject) və Sinif (Class) idarəçiliyi

| Mövcud testlər | Feature səviyyəsində birbaşa CRUD testi yoxdur; `ClassAttendanceControllerTest` və `EndToEndWorkflowTest` yalnız dolayısı ilə toxunur. |
| Boşluqlar | Subject və Class CRUD axınları ayrıca yoxlanmayıb; sinif-sinif müəllim təyinatları üçün unit testlər çatışmır. |
| Plan | \
  1. `SubjectManagementTest.php`, `ClassManagementTest.php` – yaradılma, yenilənmə, silmə, əlaqələr. \
  2. Mövcud `TeachingLoadFactory` və `ClassModel` uyğunsuzluqlarını aradan qaldırmaq (hazırda Workload testləri üçün əsas blok). |

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

| Mövcud status | `ScheduleGenerationEngineTest.php` yaşıl vəziyyətdədir; `WorkloadScheduleIntegrationServiceTest.php` hələ də 11/11 failure (factory və helper çatışmazlığı). |
| Boşluqlar | `TeachingLoadFactory`-də `Classes` modeli referansı səhvdir (`ClassModel` ilə əvəzlənməlidir); `WorkloadScheduleIntegrationService`-də `generateTimeSlots()` və əlaqəli metodlar implement olunmalıdır. |
| Plan | \
  1. Factory-ləri (`TeachingLoadFactory`, `SubjectFactory`, `ClassModelFactory`) real modellərlə uyğunlaşdır. \
  2. Servisdə çatışmayan helperləri yaz. \
  3. `php artisan test --filter=WorkloadScheduleIntegrationServiceTest`. |

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
| 9 | `php artisan test --filter=WorkloadScheduleIntegrationServiceTest` | TODO – əvvəlcə modul düzəlişləri |
| 10 | `php artisan test` | Yekun regressiya |

---

## Növbəti addımların prioritet sıralaması

1. **Kaynayol**: Workload inteqrasiyası (factory & service düzəlişləri) – hazırda bloklayıcıdır.
2. **Kritik**: Import/export və subject/class CRUD üçün yeni test şablonlarının yazılması.
3. **Kritik**: Invitə edilmiş sərt silmə və audit log testlərinin əlavə olunması.
4. **Yüksək**: Fayl və bildiriş axınlarının tam testləşdirilməsi.
5. **Orta**: Logout/session timeout ssenariləri.
6. **Orta**: Survey versiyalaşması və export testləri.
7. **Aşağı**: Böyük fayllar, MIME məhdudiyyətləri, real-time bildiriş kanalı kimi edge-case ssenariləri.

Bu plan əsasında əməliyyat:
1. Boşluqlar üçün yeni test faylları yaradılır.
2. Mövcud testlərdəki fail-lər düzəldilir.
3. Hər mərhələdən sonra fokus sistemlər yenidən `php artisan test` ilə doğrulanır.

Sənəd yenilənməsi: hər yeni test bloku reallaşdıqca bu fayl aktual saxlanılmalıdır.
