## 📄 Document & Task Management

### Sənəd kolleksiyaları (`DocumentCollectionController`)

| Method | Route | Permission | Təsvir |
| --- | --- | --- | --- |
| GET | `/api/document-collections` | `documents.read` | Qovluq siyahısı |
| GET | `/api/document-collections/{folder}` | `documents.read` | Tək qovluğun detalları |
| POST | `/api/document-collections/regional` | `documents.create` | Regional qovluqlar yaradır |
| PUT | `/api/document-collections/{folder}` | `documents.update` | Qovluq metadatasını yeniləyir |
| DELETE | `/api/document-collections/{folder}` | `documents.delete` | Qovluğu silir |
| GET | `/api/document-collections/{folder}/download` | `documents.read` | Qovluqdakı sənədlərin bulk download-u |
| GET | `/api/document-collections/{folder}/audit-logs` | `documents.read` | Audit log-lar |
| POST | `/api/document-collections/{folder}/documents` | `documents.create` | Qovluğa sənəd əlavə edir |

### Sənəd əməliyyatları (`DocumentControllerRefactored`)

| Method | Route | Permission | Qeyd |
| --- | --- | --- | --- |
| GET | `/api/documents` | `documents.read` | Filtrlənə bilən siyahı |
| GET | `/api/documents/stats` | `documents.read` | Ümumi statistikalar |
| GET | `/api/documents/sub-institutions` | `documents.read` | Aşağı qurumlardan sənədlər |
| GET | `/api/documents/superior-institutions` | `documents.read` | Yuxarı qurum siyahısı |
| POST | `/api/documents` | `documents.create` | Yeni sənəd yükləmə |
| GET | `/api/documents/{document}` | `documents.read` | Sənəd detalları |
| PUT | `/api/documents/{document}` | `documents.update` | Metadata yeniləmə |
| DELETE | `/api/documents/{document}` | `documents.delete` | Sənədi silir |
| GET | `/api/documents/{document}/download` | `auth:sanctum` | Fayl yükləmə |
| GET | `/api/documents/{document}/preview` | `documents.read` | Preview üçün meta |
| POST | `/api/documents/{document}/share` | `documents.share` | Paylaşma |
| GET | `/api/documents/{document}/versions` | `documents.read` | Versiyalar |
| POST | `/api/documents/{document}/versions` | `documents.update` | Yeni versiya əlavə edir |
| GET | `/api/documents/search/{query}` | `documents.read` | Axtarış |
| GET | `/api/documents/categories` | `documents.read` | Kateqoriyalar |
| POST | `/api/documents/bulk-upload` | `documents.bulk` | Kütləvi yükləmə |
| POST | `/api/documents/bulk-delete` | `documents.bulk` | Kütləvi silmə |
| GET | `/api/documents/analytics/usage` | `documents.analytics` | İstifadə analitikası |
| GET | `/api/documents/analytics/storage` | `documents.analytics` | Saxlama analitikası |
| POST | `/api/documents/{document}/tags` | `documents.update` | Tag əlavə etmək |
| DELETE | `/api/documents/{document}/tags` | `documents.update` | Tag silmək |
| GET | `/api/documents/tracking/activity` | `documents.tracking` | Aktivlik log-u |
| GET | `/api/documents/{document}/tracking/history` | `documents.tracking` | Tarixçə |

### Sənəd paylaşımı (`DocumentShareController`)

| Method | Route | Permission | Təsvir |
| --- | --- | --- | --- |
| GET | `/api/document-shares` | `documents.share` | Paylaşılan sənədlər |
| POST | `/api/document-shares` | `documents.share` | Yeni paylaşma |
| GET | `/api/document-shares/{share}` | `documents.share` | Detal |
| PUT | `/api/document-shares/{share}` | `documents.share` | Yeniləmə |
| DELETE | `/api/document-shares/{share}` | `documents.share` | Silmə |
| GET | `/api/document-shares/{share}/access-log` | `documents.share` | Giriş jurnalını göstərir |
| POST | `/api/document-shares/{share}/revoke` | `documents.share` | İcazəni dayandırır |
| GET | `/api/document-shares/document/{document}` | `documents.share` | Sənəd üzrə paylaşma tarixçəsi |
| GET | `/api/document-shares/user/{user}` | `documents.share` | İstifadəçiyə aid paylaşımlar |

### Tapşırıq əməliyyatları (`TaskControllerRefactored`)

| Method | Route | Permission/Role | Qeyd |
| --- | --- | --- | --- |
| GET | `/api/tasks` | `tasks.read` | Tapşırıq siyahısı |
| GET | `/api/tasks/assigned-to-me` | `tasks.read` | Hazırkı istifadəçiyə aid tapşırıqlar |
| GET | `/api/tasks/{task}` | `tasks.read` | Tapşırıq detalları |
| GET | `/api/tasks/{task}/progress` | `tasks.read` | Proqres məlumatı |
| GET | `/api/tasks/{task}/history` | `tasks.read` | Aktivlik tarixçəsi |
| GET | `/api/tasks/user/{user}` | `tasks.read` | İstifadəçi üzrə tapşırıqlar |
| GET | `/api/tasks/institution/{institution}` | `tasks.read` | Qurum üzrə tapşırıqlar |
| POST | `/api/tasks` | `role:superadmin|regionadmin|sektoradmin` | Yeni tapşırıq |
| PUT | `/api/tasks/{task}` | eyni rol şərti | Tapşırıq yenilənməsi |
| DELETE | `/api/tasks/{task}` | eyni rol şərti | Tapşırıq silmə |
| POST | `/api/tasks/{task}/assign` | eyni rol şərti | Tapşırıq təyinatı |
| POST | `/api/tasks/{task}/complete` | eyni rol şərti | Tapşırığı tamamla |
| POST | `/api/tasks/{task}/reopen` | eyni rol şərti | Yenidən aç |
| POST | `/api/tasks/{task}/progress` | eyni rol şərti | Proqres yeniləməsi |
| POST | `/api/tasks/bulk-create` | eyni rol şərti | Kütləvi yaradılma |
| POST | `/api/tasks/bulk-assign` | eyni rol şərti | Kütləvi təyinat |
| POST | `/api/tasks/bulk-update-status` | eyni rol şərti | Status kütləvi yeniləmə |
| GET | `/api/tasks/creation-context` | eyni rol şərti | UI üçün lazımi kontekst |
| GET | `/api/tasks/assignable-users` | eyni rol şərti | Təyinat üçün istifadəçi siyahısı |
| POST | `/api/tasks/{task}/approve` | `tasks.approve` | Tapşırığı təsdiqlə |
| POST | `/api/tasks/{task}/reject` | `tasks.approve` | Tapşırığı rədd et |
| GET | `/api/tasks/pending-approval` | `tasks.approve` | Təsdiq gözləyənlər |
| GET | `/api/tasks/analytics/overview` | `tasks.analytics` | Analitika overview |
| GET | `/api/tasks/analytics/performance` | `tasks.analytics` | Performans analitikası |
| GET | `/api/tasks/reports/summary` | `tasks.analytics` | Xülasə hesabatı |

### Bildirişlər (`NotificationController`)

| Method | Route | Permission | Təsvir |
| --- | --- | --- | --- |
| GET | `/api/notifications` | `notifications.read` | Bildiriş siyahısı |
| GET | `/api/notifications/{notification}` | `notifications.read` | Tək bildiriş |
| GET | `/api/notifications/unread/count` | `notifications.read` | Oxunmamış say |
| POST | `/api/notifications/{notification}/mark-read` | `notifications.write` | İstifadəçi səviyyəsində oxunmuş işarəsi |
| POST | `/api/notifications/mark-all-read` | `notifications.write` | Hamısını oxunmuş etmək |
| DELETE | `/api/notifications/{notification}` | `notifications.write` | Silmək |
| POST | `/api/notifications/bulk-delete` | `notifications.write` | Kütləvi silmə |
| POST | `/api/notifications` | `notifications.send` | Yeni bildiriş göndərmək |
| POST | `/api/notifications/broadcast` | `notifications.send` | Kütləvi göndəriş |
| POST | `/api/notifications/schedule` | `notifications.send` | Planlı göndəriş |
| GET | `/api/notifications/analytics/delivery` | `notifications.analytics` | çatdırılma analitikası |
| GET | `/api/notifications/analytics/engagement` | `notifications.analytics` | istifadəçi reaksiyası |

---

