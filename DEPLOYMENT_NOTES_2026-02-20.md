# Data İzolyasiyası Təkmilləşdirməsi - Deploy Qeydləri

**Tarix:** 2026-02-20
**Versiya:** InstitutionScope Global Scope + Bug Fix-lər

---

## Dəyişikliklərin Xülasəsi

### Faza 1: Kritik Bug Fix-lər
- **HasAuthorization.php**: `getAllDescendantIds()` → `getAllChildrenIds()` (mövcud olmayan metod çağırışı düzəldildi)
- **DataIsolationHelper.php**: MektebAdmin scope type-based → level-based (`level !== 4`) dəyişdirildi
- **RegionalDataAccessMiddleware.php**: SektorAdmin və SchoolAdmin validation type → level-based dəyişdirildi

### Faza 2: Global Scope (Əsas Müdafiə Qatı)
- **InstitutionScope.php** (YENİ): Avtomatik `WHERE institution_id IN (...)` filtering
- **BelongsToInstitution.php** (YENİ): Scope-u modellərə bağlayan trait
- **9 model** trait ilə gücləndirildi: Grade, Student, Room, Department, Document, Schedule, SurveyResponse, ClassBulkAttendance, InventoryItem
- **TaskAssignment** trait-dən XARİC EDİLDİ (cross-institutional task sistemi öz permission service-i var)

### Faza 3: Service Yenilənməsi
- **InstitutionAccessService.php**: Köhnə `region_id` pattern-dən `DataIsolationHelper`-ə keçid

### Faza 4: Unifikasiya
- Bütün type-based validation → level-based validation-a çevrildi

### Faza 5: Data Təmizliyi (Migration)
- Orphan test user-lar (institution_id=NULL) silinir
- Dublikat academic year (ID 1) silinir (əvvəlcə referans yoxlayır)

### Faza 6: Test Əhatəsi
- InstitutionScopeTest: 6 test (superadmin, regionadmin, schooladmin, bypass, unauthenticated, no-role)

---

## Production-a Deploy Qaydası

### 1. Standart deploy:
```bash
cd /srv/atis/TIS && ./pull.sh
```
Pull skripti avtomatik: backup → git pull → docker build → migrate → health check edir.

### 2. Deploy sonrası yoxlama:
- `regionadmin1 / admin123` ilə login olub datanın düzgün göründüyünü təsdiqləyin
- Sinif siyahısı, şagird siyahısı, cədvəl səhifələrini yoxlayın
- SuperAdmin ilə bütün datanın görünməsini təsdiqləyin

### 3. Əgər problem yaranarsa rollback:
```bash
cd /srv/atis/TIS
git revert HEAD
./pull.sh
```

---

## Risk Analizi

### Aşağı Risk (Təhlükəsiz)
| Dəyişiklik | Səbəb |
|---|---|
| Bug fix-lər (Faza 1) | Yalnız düzəltmə - mövcud olmayan metod, əksik type-lar |
| Level-based validation | Əvvəl lyceum/preschool istisna idi, indi daxildir - daha çox data görünür |
| Test faylları | Production-a təsir etmir |
| Migration | Yalnız istifadəsiz test datanı silir, reversible-dir |

### Orta Risk (Diqqətlə)
| Dəyişiklik | Səbəb |
|---|---|
| InstitutionAccessService rewrite | Köhnə `region_id` pattern dəyişdi |
| SurveyResponse scope | RegionAdmin çox-məktəb cavablarını görməlidir - double filtering safe |

### Yüksək Risk (Ən diqqətli)
| Dəyişiklik | Səbəb | Mitigasiya |
|---|---|---|
| Global Scope (9 model) | Bütün query-lərə avtomatik filter əlavə edir | SuperAdmin bypass edir; Console/queue təsir olunmur; Mövcud manual filter ilə uyğundur |

---

## Nəyə Diqqət Etmək Lazımdır

### TaskAssignment QƏSDƏN xaric edilib
TaskAssignment modeli cross-institutional tapşırıq sistemi üçündür. Global Scope əlavə etsəydik:
- RegionAdmin → məktəblərə tapşırıq verir → hər məktəb üçün assignment yaradılır
- Scope olsaydı, RegionAdmin yalnız öz institution-unun assignment-larını görərdik
- Tapşırıq izləmə, progress tracking, bulk operations POZULARDI

### Global Scope nə vaxt tətbiq olunur
- **API request** (Auth::user() var) → Scope TƏTBİQ OLUNUR
- **Console command** (Auth::user() null) → Scope bypass olunur
- **Queue worker** (Auth::user() null) → Scope bypass olunur
- **Seeder** (Auth::user() null) → Scope bypass olunur
- **SuperAdmin** (hasRole check) → Scope bypass olunur

### Data Integrity Check Nəticələri (2026-02-20)
```
grade-room mismatch:      0
inventory-room mismatch:  0
schedule-room mismatch:   0
```
Bütün cross-table əlaqələr tutarlıdır.

---

## Test Nəticəsi
```
Tests: 148 passed, 0 failed, 1 skipped
Duration: 45.47s
```

---

## Dəyişdirilən Faylların Tam Siyahısı

### Yeni fayllar:
- `backend/app/Scopes/InstitutionScope.php`
- `backend/app/Traits/BelongsToInstitution.php`
- `backend/database/migrations/2026_02_20_065301_cleanup_orphan_test_users_and_duplicate_academic_year.php`
- `backend/tests/Unit/Scopes/InstitutionScopeTest.php`

### Dəyişdirilmiş fayllar:
- `backend/app/Http/Traits/HasAuthorization.php`
- `backend/app/Helpers/DataIsolationHelper.php`
- `backend/app/Http/Middleware/RegionalDataAccessMiddleware.php`
- `backend/app/Services/InstitutionAccessService.php`
- `backend/app/Models/Grade.php`
- `backend/app/Models/Student.php`
- `backend/app/Models/Room.php`
- `backend/app/Models/Department.php`
- `backend/app/Models/Document.php`
- `backend/app/Models/Schedule.php`
- `backend/app/Models/SurveyResponse.php`
- `backend/app/Models/ClassBulkAttendance.php`
- `backend/app/Models/InventoryItem.php`
