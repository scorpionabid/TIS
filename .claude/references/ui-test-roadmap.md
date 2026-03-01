# ATİS UI Test Yol Xəritəsi (Master Roadmap)

## Ümumi Vəziyyət

Rating modulu testləri tamamlandı (commit `99c9d06`). Bu sənəd qalan modulların
test örtüyünü mərhələli formada hazırlamaq üçün **master plan**-dır.

**Mövcud test infrastrukturu:**
- Playwright 1.58.2 + Vitest 3.2.4 (artıq quraşdırılıb)
- `npm run test` / `npm run test:e2e`
- Mock pattern: `vi.mock('@/contexts/LayoutContext', () => ({ useLayout: () => ({...}) }))`
- Test credentials: `superadmin@atis.az / admin123`

**Tamamlananlar ✅**
- Rating modulu: data-testid + 12 unit test + 5 E2E test

**Gözləyənlər (aşağıdakı ardıcıllıqla):**

---

## MƏRHƏLƏ 1 — BulkAttendanceEntry

**Niyə əvvəlcə:** Ən mürəkkəb form (sessiyalar, draft saxlama, mobil/desktop görünüşü).

**Kritik fayllar:**
- `frontend/src/pages/school/BulkAttendanceEntry.tsx` (əsas səhifə)
- `frontend/src/pages/school/bulkAttendance/components/BulkAttendanceTableView.tsx`
- `frontend/src/pages/school/bulkAttendance/components/AttendanceNumberInput.tsx`
- `frontend/src/pages/school/bulkAttendance/components/BulkAttendanceMobileView.tsx`
- `frontend/src/pages/school/bulkAttendance/hooks/useBulkAttendanceEntry.ts`
- `frontend/src/services/bulkAttendance.ts` (mock üçün)

### 1a. data-testid atributları

**BulkAttendanceEntry.tsx (əsas toolbar):**
- `data-testid="bulk-attendance-date"` → tarix input/picker
- `data-testid="bulk-attendance-save"` → "Saxla" düyməsi
- `data-testid="bulk-attendance-refresh"` → yeniləmə düyməsi
- `data-testid="bulk-attendance-period-select"` → ay/dövr seçici (varsa)

**BulkAttendanceTableView.tsx:**
- `data-testid="bulk-table"` → `<table>` element
- `data-testid={`bulk-row-${classId}`}` → hər sinif sırası
- `data-testid={`bulk-total-${classId}`}` → ümumi şagird sayı xanası
- `data-testid="bulk-table-footer"` → cəm sırası

**AttendanceNumberInput.tsx:**
- `data-testid={`attendance-input-${classId}-${session}`}` → hər input
  (session: `morning` / `evening`)

### 1b. Unit testlər

**Fayl:** `frontend/src/pages/school/bulkAttendance/components/__tests__/AttendanceNumberInput.test.tsx`

```
describe('AttendanceNumberInput')
  ✓ Müsbət ədəd daxil etmək olar
  ✓ Mənfi ədəd qəbul edilmir (min=0)
  ✓ Maksimum dəyər (ümumi şagird sayı) aşıldıqda xəta göstərilir
  ✓ Boş dəyər sıfır kimi qəbul edilir
  ✓ onChange callback düzgün çağırılır
```

**Fayl:** `frontend/src/pages/school/bulkAttendance/__tests__/BulkAttendanceTableView.test.tsx`

```
describe('BulkAttendanceTableView')
  ✓ Sinif sıraları düzgün render edilir
  ✓ Footer-da cəm hesablanır (present + absent = total)
  ✓ Boş data ilə empty state göstərilir
  ✓ Davamiyyət faizi düzgün hesablanır
```

### 1c. E2E testlər

**Fayl:** `frontend/tests-e2e/attendance/bulk-attendance.spec.ts`

```
describe('Bulk Attendance E2E')
  beforeEach: login as superadmin → /school/attendance/bulk

  ✓ [smoke] Səhifə yüklənir, tarix seçimi görünür
  ✓ [form] Rəqəm daxil etmək mümkündür
  ✓ [save] Saxla düyməsi aktiv olur, klik edilir
  ✓ [draft] Səhifəni bağlayıb açdıqda draft saxlanılır
```

---

## MƏRHƏLƏ 2 — AssignedTasks (Task Tamamlama Axını)

**Niyə:** "Tapşırıqları tamamla edib aid olduğu səhifələrdə görünüşü yoxlamaq" — birbaşa istifadəçi tərəfindən ifadə edilmiş ssenaridır.

**Kritik fayllar:**
- `frontend/src/pages/AssignedTasks.tsx`
- `frontend/src/components/tasks/TaskDetailsDrawer.tsx` (mövcud 2 test var → genişləndir)
- `frontend/src/components/tasks/dialogs/` (completion dialog)
- `frontend/src/components/tasks/TaskStatusBadge.tsx`
- `frontend/src/components/tasks/TaskApprovalBadge.tsx`
- `frontend/src/hooks/tasks/useAssignmentMutations.ts`

### 2a. data-testid atributları

**AssignedTasks.tsx / TasksTable.tsx:**
- `data-testid="tasks-table"` → cədvəl
- `data-testid={`task-row-${taskId}`}` → hər tapşırıq sırası
- `data-testid={`task-status-${taskId}`}` → status badge
- `data-testid={`task-complete-btn-${taskId}`}` → "Tamamla" düyməsi
- `data-testid="tasks-search"` → axtarış inputu
- `data-testid="tasks-status-filter"` → status filter dropdown

**Completion Dialog:**
- `data-testid="completion-dialog"` → dialog
- `data-testid="completion-notes"` → qeyd textarea
- `data-testid="completion-submit"` → "Tamamla" submit düyməsi
- `data-testid="completion-cancel"` → ləğv et

**TaskApprovalBadge:**
- `data-testid="approval-badge"` → approval status badge

### 2b. Unit testlər

**Fayl:** `frontend/src/components/tasks/__tests__/TaskStatusBadge.test.tsx`

```
describe('TaskStatusBadge')
  ✓ 'pending' statusu sarı rəngli badge göstərir
  ✓ 'completed' statusu yaşıl badge göstərir
  ✓ 'in_progress' statusu mavi badge göstərir
  ✓ Bilinməyən status üçün fallback göstərilir
```

**Fayl:** `frontend/src/components/tasks/__tests__/TaskApprovalBadge.test.tsx`

```
describe('TaskApprovalBadge')
  ✓ 'approved' statusu göstərilir
  ✓ 'pending' statusu göstərilir
  ✓ null approval_status gizlənir
```

### 2c. E2E testlər

**Fayl:** `frontend/tests-e2e/tasks/assigned-tasks.spec.ts`

```
describe('AssignedTasks E2E')
  beforeEach: login → /tasks/assigned

  ✓ [smoke] Tapşırıqlar cədvəli yüklənir
  ✓ [filter] Status filtri tətbiq olunur
  ✓ [complete] Tapşırıq tamamlandıqdan sonra statusu 'completed' olur
  ✓ [approval] Təsdiq tələb edən tapşırıq approval status göstərir
```

---

## MƏRHƏLƏ 3 — SurveyResponseForm (Sorğu Cavablama)

**Niyə:** Schooladmin-in ən çox istifadə etdiyi modullardan biri; "seçimlərdən birini seçmək" ssenarisi birbaşa sorğu suallarına aiddir.

**Kritik fayllar:**
- `frontend/src/pages/SurveyResponse.tsx`
- `frontend/src/components/surveys/SurveyResponseForm.tsx`
- `frontend/src/components/surveys/questions/SurveyQuestionRenderer.tsx`
- `frontend/src/services/surveys.ts` (mock üçün)

### 3a. data-testid atributları

**SurveyResponseForm.tsx:**
- `data-testid="survey-form"` → form element
- `data-testid="survey-submit"` → "Göndər" düyməsi
- `data-testid="survey-save-draft"` → "Qaralama saxla" düyməsi
- `data-testid="survey-title"` → sorğu başlığı

**SurveyQuestionRenderer.tsx (sual tiplərinə görə):**
- `data-testid={`question-${questionId}`}` → sual konteyneri
- `data-testid={`question-text-${questionId}`}` → mətn inputu
- `data-testid={`question-radio-${questionId}-${optionId}`}` → radio option
- `data-testid={`question-checkbox-${questionId}-${optionId}`}` → checkbox option
- `data-testid={`question-rating-${questionId}`}` → rating sualı

### 3b. Unit testlər

**Fayl:** `frontend/src/components/surveys/__tests__/SurveyQuestionRenderer.test.tsx`

```
describe('SurveyQuestionRenderer')
  ✓ Mətn sualı input render edir
  ✓ Seçim sualı (single) radio button render edir
  ✓ Çoxlu seçim sualı checkbox render edir
  ✓ Məcburi sual işarəsi göstərilir (*)
  ✓ Cavab dəyişdikdə onChange çağırılır
```

### 3c. E2E testlər

**Fayl:** `frontend/tests-e2e/surveys/survey-response.spec.ts`

```
describe('Survey Response E2E')
  beforeEach: login → /surveys

  ✓ [smoke] Aktiv sorğular siyahısı yüklənir
  ✓ [form] Sorğunu açmaq və sualları görmək mümkündür
  ✓ [submit] Cavabları doldurmaq + göndərmək axını
```

---

## MƏRHƏLƏ 4 — AssessmentGradebook (Qiymət Daxil Etmə)

**Niyə:** "Xanaya məlumat daxil edib təsdiqləmək" ssenarisi — inline qiymət daxil etmə.

**Kritik fayllar:**
- `frontend/src/components/assessments/AssessmentGradebook.tsx`
- `frontend/src/components/assessments/GradingInterface.tsx`
- `frontend/src/pages/school/SchoolGradebook.tsx`
- `frontend/src/constants/gradeNaming.ts`

### 4a. data-testid atributları

**AssessmentGradebook.tsx:**
- `data-testid="gradebook-table"` → cədvəl
- `data-testid={`grade-row-${studentId}`}` → hər şagird sırası
- `data-testid={`grade-input-${studentId}`}` → bal inputu
- `data-testid={`grade-letter-${studentId}`}` → hərf qiyməti (A, B, C...)
- `data-testid="gradebook-save"` → saxla düyməsi
- `data-testid="grade-average"` → ortalama göstəricisi

**AssessmentGradebook ClassSelector:**
- `data-testid="class-selector"` → sinif seçimi

### 4b. Unit testlər

**Fayl:** `frontend/src/components/assessments/__tests__/GradeCalculation.test.ts`

```
describe('Grade Letter Calculation')
  ✓ 91-100 → "A" (Əla)
  ✓ 81-90  → "B" (Yaxşı)
  ✓ 71-80  → "C" (Kafi)
  ✓ 61-70  → "D" (Qənaətbəxş)
  ✓ < 60   → "F" (Qeyri-kafi)
  ✓ 0 bal  → "F"
  ✓ Boş input → qiymət yoxdur
```

**Fayl:** `frontend/src/components/assessments/__tests__/AssessmentGradebook.test.tsx`

```
describe('AssessmentGradebook')
  ✓ Şagird siyahısı render edilir
  ✓ Bal daxil edildikdə hərf qiyməti avtomatik yenilənir
  ✓ Boş xanalar üçün placeholder göstərilir
  ✓ Ortalama bal düzgün hesablanır
```

### 4c. E2E testlər

**Fayl:** `frontend/tests-e2e/assessments/gradebook.spec.ts`

```
describe('Gradebook E2E')
  ✓ [smoke] Sinif seçilir, cədvəl yüklənir
  ✓ [grade] Şagirdə bal daxil edilir, hərf qiyməti görünür
  ✓ [save] Saxla düyməsinə klik edilir, uğur mesajı görünür
```

---

## MƏRHƏLƏ 5 — Approvals (Təsdiq Axını)

**Niyə:** Sektoradmin / Regionadmin üçün kritik; approval statusunun digər səhifələrdə görünməsi cross-page test tələb edir.

**Kritik fayllar:**
- `frontend/src/pages/Approvals.tsx`
- `frontend/src/components/approval/ApprovalDashboard.tsx`
- `frontend/src/components/approval/BulkApprovalInterface.tsx`
- `frontend/src/components/approval/ApprovalActionModal.tsx`
- `frontend/src/services/approvalService.ts`

### 5a. data-testid atributları

**ApprovalDashboard:**
- `data-testid="approval-dashboard"` → əsas konteyner
- `data-testid="approval-tabs"` → tab paneli
- `data-testid={`approval-row-${id}`}` → hər təsdiq sırası
- `data-testid={`approve-btn-${id}`}` → "Təsdiqlə" düyməsi
- `data-testid={`reject-btn-${id}`}` → "Rədd et" düyməsi
- `data-testid="bulk-select-all"` → hamısını seç checkbox
- `data-testid="bulk-approve-btn"` → toplu təsdiqlə

**ApprovalActionModal:**
- `data-testid="approval-action-modal"` → dialog
- `data-testid="approval-reason"` → səbəb textarea
- `data-testid="approval-confirm"` → təsdiq düyməsi

### 5b. Unit testlər

**Fayl:** `frontend/src/components/approval/__tests__/ApprovalActionModal.test.tsx`

```
describe('ApprovalActionModal')
  ✓ Approve modu — "Təsdiqlə" başlığı göstərilir
  ✓ Reject modu — "Rədd et" başlığı göstərilir
  ✓ Confirm disabled reason boşdursa (reject üçün)
  ✓ Confirm enabled reason doldurulubsa
  ✓ onConfirm düzgün args ilə çağırılır
  ✓ onClose ləğv etdikdə çağırılır
```

### 5c. E2E testlər

**Fayl:** `frontend/tests-e2e/approvals/approval-workflow.spec.ts`

```
describe('Approval Workflow E2E')
  beforeEach: login as superadmin → /approvals

  ✓ [smoke] Approval dashboard yüklənir, tablar görünür
  ✓ [approve] Tək element təsdiqlənir, status dəyişir
  ✓ [bulk] Birdən çox element seçilir, toplu təsdiqlənir
  ✓ [cross-page] Taskda approve edildikdən sonra /tasks/assigned-da status yenilənir
```

---

## İcra Ardıcıllığı

```
✅ Mərhələ 0: Rating modulu (tamamlandı — commit 99c9d06)
⬜ Mərhələ 1: BulkAttendanceEntry
⬜ Mərhələ 2: AssignedTasks
⬜ Mərhələ 3: SurveyResponseForm
⬜ Mərhələ 4: AssessmentGradebook
⬜ Mərhələ 5: Approvals
```

Hər mərhələ üçün proses:
1. `data-testid` atributları əlavə et (3 fayl ortalama)
2. Unit testlər yaz + `npm run test` ilə yoxla
3. E2E testlər yaz + `npm run test:e2e` ilə yoxla
4. `npm run typecheck` + `npm run lint` keçir
5. Commit + push

---

## Ümumi Fayl Siyahısı (Plan Tamamlandıqda)

### YENİ yaradılacaq test faylları:

| # | Fayl | Növ |
|---|------|-----|
| 1 | `tests-e2e/attendance/bulk-attendance.spec.ts` | E2E |
| 2 | `src/pages/school/bulkAttendance/components/__tests__/AttendanceNumberInput.test.tsx` | Unit |
| 3 | `src/pages/school/bulkAttendance/__tests__/BulkAttendanceTableView.test.tsx` | Unit |
| 4 | `tests-e2e/tasks/assigned-tasks.spec.ts` | E2E |
| 5 | `src/components/tasks/__tests__/TaskStatusBadge.test.tsx` | Unit |
| 6 | `src/components/tasks/__tests__/TaskApprovalBadge.test.tsx` | Unit |
| 7 | `tests-e2e/surveys/survey-response.spec.ts` | E2E |
| 8 | `src/components/surveys/__tests__/SurveyQuestionRenderer.test.tsx` | Unit |
| 9 | `tests-e2e/assessments/gradebook.spec.ts` | E2E |
| 10 | `src/components/assessments/__tests__/GradeCalculation.test.ts` | Unit |
| 11 | `src/components/assessments/__tests__/AssessmentGradebook.test.tsx` | Unit |
| 12 | `tests-e2e/approvals/approval-workflow.spec.ts` | E2E |
| 13 | `src/components/approval/__tests__/ApprovalActionModal.test.tsx` | Unit |

### DƏYİŞDİRİLƏCƏK fayllar (data-testid əlavəsi):

| # | Fayl |
|---|------|
| 1 | `src/pages/school/BulkAttendanceEntry.tsx` |
| 2 | `src/pages/school/bulkAttendance/components/BulkAttendanceTableView.tsx` |
| 3 | `src/pages/school/bulkAttendance/components/AttendanceNumberInput.tsx` |
| 4 | `src/pages/AssignedTasks.tsx` |
| 5 | `src/components/tasks/TaskStatusBadge.tsx` |
| 6 | `src/components/tasks/TaskApprovalBadge.tsx` |
| 7 | `src/components/tasks/dialogs/` (completion dialog) |
| 8 | `src/components/surveys/SurveyResponseForm.tsx` |
| 9 | `src/components/surveys/questions/SurveyQuestionRenderer.tsx` |
| 10 | `src/components/assessments/AssessmentGradebook.tsx` |
| 11 | `src/components/approval/ApprovalDashboard.tsx` |
| 12 | `src/components/approval/ApprovalActionModal.tsx` |
