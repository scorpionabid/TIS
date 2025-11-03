## 📊 Survey & Response Management

> Sorğu modulu çoxsaylı permission qatlarından istifadə edir: `surveys.read`, `surveys.write`, `surveys.target`, `survey_responses.*`, `survey_responses.approve` və s. Aşağıdakı cədvəllər faktiki marşrutları ümumiləşdirir.

### Sorğu Analitikası (`permission:surveys.read`)

| Method | Route | Təsvir |
| --- | --- | --- |
| GET | `/api/surveys/analytics/overview` | Ümumi dashboard statistikası |
| GET | `/api/surveys/analytics/region` | Region üzrə analitika |
| GET | `/api/surveys/hierarchical` | Hierarxik sorğu siyahısı |
| GET | `/api/surveys/{survey}/analytics/overview` | Seçilmiş sorğu üçün ümumi göstəricilər |
| GET | `/api/surveys/{survey}/analytics/trends` | Cavab zaman trend analizi |
| GET | `/api/surveys/{survey}/analytics/hierarchical-institutions` | Hierarxik iştirakçı analitikası |
| GET | `/api/surveys/{survey}/analytics/non-responding-institutions` | Cavab verməyən qurumlar |
| GET | `/api/surveys/{survey}/analytics` | Klassik analitika endpoint-i |
| GET | `/api/surveys/{survey}/statistics` | Statistik məlumatlar |
| GET | `/api/surveys/{survey}/insights` | İnzibati insight-lar |
| GET | `/api/surveys/{survey}/institution-breakdown` | Qurumlara görə bölgü |
| GET | `/api/surveys/{survey}/hierarchical-breakdown` | Hierarxik bölgü |

### Sorğu CRUD əməliyyatları

| Method | Route | Middleware | Təsvir |
| --- | --- | --- | --- |
| GET | `/api/surveys` | `permission:surveys.read` | Sorğuların siyahısı |
| GET | `/api/surveys/{survey}` | `permission:surveys.read` | Sorğu detalları |
| GET | `/api/surveys/{survey}/questions` | `permission:surveys.read` | Sualların siyahısı |
| GET | `/api/surveys/{survey}/question-restrictions` | `permission:surveys.read` | Suallara tətbiq olunan məhdudiyyətlər |
| GET | `/api/surveys/{survey}/preview` | `permission:surveys.read` | Form preview |
| GET | `/api/surveys/{survey}/form` | `permission:surveys.read` | Cavab forması |
| GET | `/api/surveys/{survey}/export` | `permission:surveys.read` | Şablon/export |
| POST | `/api/surveys` | `permission:surveys.write` | Yeni sorğu yaradılması |
| PUT | `/api/surveys/{survey}` | `permission:surveys.write` | Sorğu yenilənməsi |
| DELETE | `/api/surveys/{survey}` | `permission:surveys.write` | Sorğunun silinməsi |
| POST | `/api/surveys/{survey}/duplicate` | `permission:surveys.write` | Sorğunu klonlayır |
| POST | `/api/surveys/{survey}/reorder-questions` | `permission:surveys.write` | Sualların sırasını dəyişir |

### Sorğu status və idarəetmə (`permission:surveys.write`)

| Method | Route | Təsvir |
| --- | --- | --- |
| POST | `/api/surveys/{survey}/publish` | Sorğunu dərc edir |
| POST | `/api/surveys/{survey}/pause` | Sorğunu müvəqqəti dayandırır |
| POST | `/api/surveys/{survey}/archive` | Arxivləmə |
| POST | `/api/surveys/{survey}/restore` | Arxivdən geri qaytarma |
| POST | `/api/surveys/{survey}/close` | Sorğunu bağlayır |
| POST | `/api/surveys/{survey}/reopen` | Bağlı sorğunu yenidən açır |
| POST | `/api/surveys/{survey}/resume` | Dayandırılmış sorğunu davam etdirir |

### Targeting (`permission:surveys.target`)

| Method | Route | Təsvir |
| --- | --- | --- |
| GET | `/api/surveys/{survey}/targeting` | Mövcud targeting konfiqurasiyası |
| POST | `/api/surveys/{survey}/targeting` | Targeting təyin edir |
| PUT | `/api/surveys/{survey}/targeting` | Targeting yenilənməsi |
| DELETE | `/api/surveys/{survey}/targeting` | Targeting məlumatını sıfırlayır |
| GET | `/api/surveys/{survey}/eligible-users` | Sorğuya uyğun istifadəçilər |
| POST | `/api/surveys/{survey}/notify-targets` | Target auditoriyaya bildiriş göndərir |
| GET | `/api/targeting/preview` | Targeting önizləmə |
| GET | `/api/targeting/templates` | Targeting şablonları |
| POST | `/api/targeting/templates` | Yeni targeting şablonu saxlayır |

### Sorğu cavabları

| Method | Route | Middleware | Təsvir |
| --- | --- | --- | --- |
| GET | `/api/survey-responses` | `permission:survey_responses.read` | Ümumi cavab siyahısı |
| GET | `/api/survey-responses/{response}` | `permission:survey_responses.read` | Tək cavab detalları |
| GET | `/api/surveys/{survey}/responses` | `permission:survey_responses.read` | Sorğu üzrə cavablar |
| GET | `/api/surveys/{survey}/responses/export` | `permission:survey_responses.read` | Cavabların ixracı |
| GET | `/api/surveys/{survey}/responses/summary` | `permission:survey_responses.read` | Xülasə statistikası |
| POST | `/api/surveys/{survey}/responses/start` | `permission:survey_responses.write` | Yeni cavab sessiyası açır |
| POST | `/api/surveys/{survey}/start` | `permission:survey_responses.write` | Sorğunu başlat (legacy) |
| POST | `/api/surveys/{survey}/respond` | `permission:survey_responses.write` | Cavabı təqdim edir |
| PUT | `/api/survey-responses/{response}` | `permission:survey_responses.write` | Cavab yenilənməsi |
| DELETE | `/api/survey-responses/{response}` | `permission:survey_responses.write` | Cavabın silinməsi |
| POST | `/api/survey-responses/{response}/submit` | `permission:survey_responses.write` | Cavabın təsdiqlənməsi |
| PUT | `/api/survey-responses/{response}/save` | `permission:survey_responses.write` | Dəyişiklikləri yadda saxlayır |
| POST | `/api/survey-responses/{response}/save-draft` | `permission:survey_responses.write` | Draft rejimində saxlayır |
| POST | `/api/survey-responses/{response}/reopen` | `permission:survey_responses.write` | Cavabı yenidən açır |

### Sorğu təsdiqi (Approval Flow)

| Method | Route | Middleware | Təsvir |
| --- | --- | --- | --- |
| GET | `/api/survey-approval/surveys/published` | `permission:survey_responses.read` | Təsdiqə hazır sorğular |
| GET | `/api/survey-approval/surveys/{survey}/responses` | `permission:survey_responses.read` | Təsdiq üçün cavab siyahısı |
| GET | `/api/survey-approval/surveys/{survey}/stats` | `permission:survey_responses.read` | Təsdiq statistikası |
| GET | `/api/survey-approval/surveys/{survey}/table-view` | `permission:survey_responses.read` | Cədvəl görünüşü |
| GET | `/api/survey-approval/surveys/{survey}/export` | `permission:survey_responses.read` | Təsdiq dashboard export-u |
| GET | `/api/responses/{response}/detail` | `permission:survey_responses.read` | Detallı cavab + history |
| PUT | `/api/responses/{response}/update` | `permission:survey_responses.write` | Cavab məlumatlarının düzəldilməsi |
| POST | `/api/responses/{response}/submit-approval` | `permission:survey_responses.write` | Təsdiq sorğusu yaradır |
| POST | `/api/responses/{response}/approve` | `permission:survey_responses.approve` | Tək cavabın təsdiqi |
| POST | `/api/responses/{response}/reject` | `permission:survey_responses.approve` | Rədd etmə |
| POST | `/api/responses/{response}/return` | `permission:survey_responses.approve` | Düzəliş üçün geri qaytarma |
| POST | `/api/responses/bulk-approval` | `permission:survey_responses.approve` + `permission:survey_responses.bulk_approve` | Kütləvi təsdiq/rədd |
| POST | `/api/responses/batch-update` | `permission:survey_responses.write` | Birdən çox cavabın yenilənməsi |

### My Surveys & Bildirişlər

| Method | Route | Middleware | Təsvir |
| --- | --- | --- | --- |
| GET | `/api/survey-notifications` | `auth:sanctum` | Sorğu bildirişləri |
| GET | `/api/survey-notifications/unread-count` | `auth:sanctum` | Oxunmamış say |
| GET | `/api/survey-notifications/stats` | `auth:sanctum` | Bildiriş statistikası |
| POST | `/api/survey-notifications/{notificationId}/mark-read` | `auth:sanctum` | Bildirişi oxunmuş işarə edir |
| GET | `/api/my-surveys/dashboard-stats` | `auth:sanctum` | İstifadəçi dashboard statistikası |
| GET | `/api/my-surveys/assigned` | `auth:sanctum` | İstifadəçiyə təyin edilmiş sorğular |
| GET | `/api/my-surveys/responses` | `auth:sanctum` | İstifadəçinin verdiyi cavablar |
| GET | `/api/my-surveys/recent` | `auth:sanctum` | Son təyin edilmiş sorğular |
| GET | `/api/survey-responses/{response}/report` | `auth:sanctum` | Cavab hesabatının yüklənməsi |
| GET | `/api/survey-templates` | `auth:sanctum` | Sorğu şablonları (oxu) |
| POST | `/api/survey-templates` | `permission:surveys.write` | Şablon yaradılması |
| PUT | `/api/survey-templates/{template}` | `permission:surveys.write` | Şablon yeniləmə |
| DELETE | `/api/survey-templates/{template}` | `permission:surveys.write` | Şablon silmə |
| POST | `/api/survey-templates/create-from-survey` | `permission:surveys.write` | Mövcud sorğudan şablon yaradır |

### Survey Responses

#### **GET** `/api/surveys/{id}/responses`
Get survey responses

#### **POST** `/api/surveys/{id}/respond`
Submit survey response

**Request Body:**
```json
{
  "responses": [
    {
      "question_id": 1,
      "answer": "Yaxşı"
    },
    {
      "question_id": 2,
      "answer": ["Seçim 1", "Seçim 2"]
    }
  ]
}
```

#### **GET** `/api/surveys/{id}/analytics`
Get survey analytics and statistics

#### **POST** `/api/surveys/{id}/export`
Export survey responses

### Survey Targeting

#### **GET** `/api/surveys/{id}/targeting`
Get survey targeting information

#### **PUT** `/api/surveys/{id}/targeting`
Update survey targeting

#### **POST** `/api/surveys/{id}/notify-targets`
Send notifications to target audience

---

