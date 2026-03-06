## 👥 User Management

> **Əsas şərt:** Bütün istifadəçi əməliyyatları `auth:sanctum` ilə qorunur. Əlavə olaraq Spatie permission middleware-ləri real icazə səviyyəsini müəyyən edir.

### Oxu əməliyyatları (`permission:users.read`)

| Method | Route | Əlavə middleware | Təsvir |
| --- | --- | --- | --- |
| GET | `/api/users` | `permission:users.read` | Filtrləmə, sıralama və pagination ilə istifadəçi siyahısı |
| GET | `/api/users/{user}` | `permission:users.read` | ID və ya username üzrə detallı istifadəçi məlumatı |
| GET | `/api/users/filter-options` | `permission:users.read` | UI filtrləri üçün lazımlı seçimlər |
| GET | `/api/users/search/{query}` | `permission:users.read` | Ad, email və ya istifadəçi adı üzrə axtarış |
| GET | `/api/users/roles/available` | `permission:users.read` | Mövcud rolların siyahısı |
| GET | `/api/users/institutions/available` | `permission:users.read` | İstifadəçi təyinatında istifadə edilən müəssisələr |
| GET | `/api/users/departments/available` | `permission:users.read` | Departament siyahısı |
| POST | `/api/users/check-email-unique` | `permission:users.read` | Email ünvanının unikal olub-olmadığını yoxlayır |
| GET | `/api/users/bulk/download-template` | `permission:users.read` | Kütləvi import üçün CSV şablonu |
| GET | `/api/users/bulk/statistics` | `permission:users.read` | Kütləvi əməliyyat statistikasını qaytarır |

### Yazma əməliyyatları (`permission:users.write`)

| Method | Route | Təsvir |
| --- | --- | --- |
| POST | `/api/users` | Yeni istifadəçi yaradılması (`StoreUserRequest`) |
| PUT | `/api/users/{user}` | Mövcud istifadəçi məlumatlarının yenilənməsi (`UpdateUserRequest`) |
| DELETE | `/api/users/{user}` | Soft-delete (aktiv statusu söndürür) |
| POST | `/api/users/bulk-create` | CSV/Excel faylından kütləvi yaradılma |
| POST | `/api/users/bulk-update` | Kütləvi yenilənmə |
| POST | `/api/users/bulk-delete` | Kütləvi soft-delete |
| POST | `/api/users/bulk/activate` | Seçilmiş istifadəçiləri aktivləşdirir |
| POST | `/api/users/bulk/deactivate` | Seçilmiş istifadəçiləri deaktiv edir |
| POST | `/api/users/bulk/assign-role` | Kütləvi rol təyinatı |
| POST | `/api/users/bulk/assign-institution` | Kütləvi müəssisə təyinatı |
| POST | `/api/users/bulk/delete` | Kütləvi silmə əməliyyatının icrası |
| POST | `/api/users/bulk/preview` | Importdan əvvəl önizləmə |
| POST | `/api/users/bulk/import` | CSV/Excel faylının yüklənməsi və emalı |
| POST | `/api/users/bulk/export` | Filtrlənmiş istifadəçi siyahısının ixracı |

### Silinmiş istifadəçilər

| Method | Route | Middleware | Qeyd |
| --- | --- | --- | --- |
| GET | `/api/users/trashed` | `role:superadmin|regionadmin` | Soft-delete olunmuş istifadəçilərin siyahısı |
| POST | `/api/users/{id}/restore` | `role:superadmin|regionadmin` | Tək istifadəçi üçün bərpa |
| DELETE | `/api/users/{id}/force` | `role:superadmin` | Geri qaytarılmayan hard delete |
| POST | `/api/users/bulk/restore` | `role:superadmin|regionadmin` | Kütləvi bərpa əməliyyatı |
| DELETE | `/api/users/bulk/force` | `role:superadmin` | Kütləvi hard delete |

### Nümunə istək/cavab (`POST /api/users`)

**Request Body:**
```json
{
  "username": "nizami.admin",
  "email": "nizami.admin@atis.az",
  "password": "SecurePass123!",
  "password_confirmation": "SecurePass123!",
  "role_id": 2,
  "institution_id": 15,
  "department_id": 4,
  "first_name": "Nizami",
  "last_name": "Quliyev",
  "contact_phone": "+994501234567",
  "is_active": true
}
```

**Response (201):**
```json
{
  "message": "İstifadəçi uğurla yaradıldı",
  "data": {
    "id": 248,
    "username": "nizami.admin",
    "email": "nizami.admin@atis.az",
    "role_id": 2,
    "institution_id": 15,
    "is_active": true,
    "created_at": "2025-09-24T08:31:25Z"
  }
}
```

> Validasiya `App\Http\Requests\StoreUserRequest` və `UpdateUserRequest` sinifləri ilə təmin olunur. Role təyinatı zamanı `ValidRoleAssignment` qaydası tətbiq edilir.

---

