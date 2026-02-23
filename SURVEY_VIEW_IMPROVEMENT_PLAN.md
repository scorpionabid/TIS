# Plan: "Sorğulara Baxış" (Survey View) Tabının Təkmilləşdirilməsi

Bu plan "Təsdiqləmələr" (Approvals) səhifəsindəki **"Sorğulara Baxış"** tabının funksionallığını və vizual keyfiyyətini artırmağı hədəfləyir.

---

## Tamamlanan İşlər ✅

### 1. Backend — `getPublishedSurveys()` Düzəlişi
**Fayl:** `backend/app/Http/Controllers/SurveyApprovalController.php`

**Problem:** `getPublishedSurveys()` metodu sorğu suallarını (`questions`) yükləmirdi. Beləliklə frontend-dəki `selectedSurvey.questions` həmişə boş `[]` idi.

**Həll:** `with(['questions' => ...])` əlavə edildi:
```php
$query = Survey::query()
    ->withCount(['questions', 'responses'])
    ->with(['questions' => function ($q) {
        $q->where('is_active', true)
          ->orderBy('order_index')
          ->select(['id', 'survey_id', 'title', 'type', 'options', 'metadata', 'table_headers', 'order_index']);
    }])
    ...
```

---

### 2. Backend — `per_page` Limitinin Genişləndirilməsi
**Fayl:** `backend/app/Http/Controllers/SurveyApprovalController.php` + `SurveyApprovalService.php`

**Problem:** `per_page` maksimum 100 müəssisəyə məhdudlaşırdı. Böyük rayonlarda 200+ məktəb ola bilər.

**Həll:**
- Controller validation: `max:100` → `max:500`
- Service: `min((int) $perPage, 500)` ilə ikili qorunma

---

### 3. Frontend — `SurveyViewDashboard.tsx` — Server-side Pagination
**Fayl:** `frontend/src/components/approval/survey-view/SurveyViewDashboard.tsx`

**Problems (köhnə):**
- `per_page: 100` ilə bütün data bir dəfəyə yüklənirdi
- Filtr yox idi
- Pagination client-side idi

**Həll (yeni):**
- `search` + `status` filtrləri → backend-ə göndərilir
- `page` + `per_page` state → server-side pagination
- 400ms debounce ilə search
- Sorğu dəyişdikdə page avtomatik 1-ə sıfırlanır
- `keepPreviousData: true` → keçid zamanı ekran boşalmır
- Sorğu seçimi dəyişdikdə bütün filterlər sıfırlanır
- Stats badge-ləri (Cəmi / Təsdiqlənib / Gözləyir / Qaralama)

---

### 4. Frontend — `SurveyResponsesDataTable.tsx` — Smart Formatters
**Fayl:** `frontend/src/components/approval/survey-view/SurveyResponsesDataTable.tsx`

**Problem (köhnə):**
```tsx
// Bütün kompleks cavablar belə göstərilirdi:
JSON.stringify(answer, null, 2) // → {"col_1":"5","col_2":"10"} — oxunmaz!
```

**Həll (yeni) — Hər sual tipi üçün ayrı formatter:**

| Sual Tipi | Göstərim |
|-----------|----------|
| `single_choice` | ID əvəzinə `label` (Badge) |
| `multiple_choice` | Hər seçim üçün ayrı Badge |
| `rating` | Rəngli rəqəm (Yaşıl/Sarı/Qırmızı) |
| `table_input` | `📊 5 sətir` badge + hover tooltip ilə preview |
| `table_matrix` | `🔲 3 xana` badge + hover tooltip |
| `file_upload` | `📎 fayl_adi.pdf` |
| `date` | `az-AZ` locale ilə tarix |
| `number` | `toLocaleString('az-AZ')` |
| Uzun mətn | Truncate + tooltip |
| `true/false` | "Bəli" / "Xeyr" |

**Əlavə:**
- **Sticky (sabit) sütun:** "Müəssisə" sütunu sola yapışıb qalır, horizontal scroll zamanı görünür
- **Status badge:** Hər müəssisənin cavabının statusu rəngli badge ilə göstərilir
- **Zebra striping:** Cüt/tək sətirlərdə fon fərqli
- **Hover highlight:** Sətirə gəldikdə rəng dəyişir
- **Sual başlıqları tooltip:** Uzun başlıqlar üçün hover ilə tam mətn

---

## Qalmış İşlər (Gələcək)

### A. Excel Export "Sorğulara Baxış" tabından
Hazırda export yalnız "Sorğu Cavabları" tabında mövcuddur. "Sorğulara Baxış" tabında da export düyməsi əlavə etmək olar.

### B. Sütun Seçimi
30+ sualın olduğu sorğularda istifadəçiyə hansı sütunları göstərəcəyini seçmək imkanı vermək.

### C. Sorğu Suallarına Görə Sıralama
Sütun başlığına basaraq həmin sualın cavabına görə sıralama (backend-də `sort_by=question_id` dəstəyi tələb olunur).

---

## Texniki Açıqlama

```
İstifadəçi → Sorğu seçir (UnifiedSurveySelector)
           → getPublishedSurveys() artıq questions[] yükləyir (Backend fix)
           → SurveyViewDashboard filtr state-ləri (search, status, page) idarə edir
           → getResponsesForApproval() server-side filtr + pagination ilə çağrılır
           → SurveyResponsesDataTable smart cell-lərlə göstərir
```
