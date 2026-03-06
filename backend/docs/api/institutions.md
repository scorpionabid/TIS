## 🏢 Institution & Hierarchy Management

> **Qeyd:** Aşağıdakı marşrutların hamısı `auth:sanctum` altında icra olunur. İcazələr Spatie permission və rol middleware-ləri ilə qorunur.

### Oxu əməliyyatları (`permission:institutions.read`)

| Method | Route | Təsvir |
| --- | --- | --- |
| GET | `/api/institutions` | Fərqli filtr parametrləri ilə qurum siyahısı (tip, səviyyə, parent, status) |
| GET | `/api/institutions/statistics` | Qurumların ümumi statistikasını qaytarır |
| GET | `/api/institutions/{institution}` | Seçilmiş qurumun əsas məlumatı və əlaqəli münasibətlər |
| GET | `/api/institutions/{institution}/users` | Qurum üzvlərinin siyahısı |
| GET | `/api/institutions/{institution}/children` | Hierarxiyada uşaqları (bir səviyyə) |
| GET | `/api/institutions/{institution}/hierarchy` | Seçilmiş qurum üçün ağac strukturu |
| GET | `/api/institutions/{institution}/summary` | Qurumun konsolidə edilmiş göstəriciləri |
| GET | `/api/institutions/summary` | Tip və region üzrə qlobal xülasə |
| GET | `/api/institutions/search/{query}` | Ad/kod üzrə sürətli axtarış |
| GET | `/api/institutions/find-similar` | Oxşar qurumları tapır (ad + UTİS kodu) |
| GET | `/api/institutions/check-code-exists` | Unikal ATİS kodu yoxlaması |
| GET | `/api/institutions/check-utis-code-exists` | UTİS kodu yoxlaması |
| POST | `/api/institutions/generate-code` | Yeni ATİS kodu generasiyası (read permission altında saxlanılıb) |
| GET | `/api/institutions/{institution}/stats` | Seçilmiş qurum üçün indikatorlar |
| GET | `/api/institutions/{id}/delete-impact` | Silmə əməliyyatının təsirini öncədən göstərir |
| GET | `/api/institutions/delete-progress/{operationId}` | Asinxron silmə əməliyyatının statusu |

### Yazma əməliyyatları (`permission:institutions.write`)

| Method | Route | Təsvir |
| --- | --- | --- |
| POST | `/api/institutions` | Yeni qurum yaradır (`InstitutionController@store`) |
| PUT | `/api/institutions/{institution}` | Qurum məlumatını yeniləyir |
| DELETE | `/api/institutions/{id}` | Soft-delete/hard-delete qaydasında qurumu silir |
| POST | `/api/institutions/bulk-create` | Toplu qurum yaradılması |
| POST | `/api/institutions/bulk-update` | Toplu yenilənmə |
| POST | `/api/institutions/bulk-delete` | Toplu silmə əməliyyatı |
| POST | `/api/institutions/{institution}/assign-users` | Qurum üzərinə istifadəçi təyinatı |
| DELETE | `/api/institutions/{institution}/remove-users` | Qurumdan istifadəçiləri çıxarır |

### İdxal/İxrac əməliyyatları (`permission:institutions.write`)

| Method | Route | Təsvir |
| --- | --- | --- |
| POST | `/api/institutions/import/template` | Standart import şablonunu qaytarır |
| POST | `/api/institutions/import` | CSV/Excel faylından qurumların idxalı |
| POST | `/api/institutions/import/template-by-type` | Qurum tipinə görə şablon |
| POST | `/api/institutions/import-by-type` | Tip əsaslı idxal |
| POST | `/api/institutions/export` | Şərtə görə qurum siyahısını ixrac edir |
| POST | `/api/institutions/export-by-type` | Tipə görə ixrac əməliyyatı |
| GET | `/api/institutions/import/permissions` | İdxal əməliyyatları üçün tələb olunan icazələri açıqlayır |
| GET | `/api/institutions/import/history` | Son idxal əməliyyatlarının jurnalı |
| GET | `/api/institutions/import/analytics` | İdxal performans statistikası |
| GET | `/api/institutions/parent-institutions` | İdxal zamanı valideyn seçimləri üçün siyahı |

### Department Management

> Qurum-daxili departament əməliyyatları `permission:departments.*` icazələrini tələb edir.

| Method | Route | Middleware | Təsvir |
| --- | --- | --- | --- |
| GET | `/api/institutions/{institution}/departments` | `permission:departments.read` | Konkret qurumun departamentləri |
| GET | `/api/institutions/{institution}/departments/{department}` | `permission:departments.read` | Departament detalları |
| POST | `/api/institutions/{institution}/departments` | `permission:departments.write` | Yeni departament yaradılması |
| PUT | `/api/institutions/{institution}/departments/{department}` | `permission:departments.write` | Departament məlumatı yenilənməsi |
| DELETE | `/api/institutions/{institution}/departments/{department}` | `permission:departments.write` | Departamentin silinməsi |
| GET | `/api/departments` | `permission:departments.read` | Qlobal departament siyahısı |
| GET | `/api/departments/types` | `permission:departments.read` | Mövcud departament tipləri |
| GET | `/api/departments/types-for-institution` | `permission:departments.read` | Qurum tipinə uyğun departament tipləri |
| GET | `/api/departments/{department}` | `permission:departments.read` | Qlobal departament detalları |
| POST | `/api/departments` | `permission:departments.write` | Qlobal departament yaradılması |
| PUT | `/api/departments/{department}` | `permission:departments.write` | Qlobal departament yenilənməsi |
| DELETE | `/api/departments/{department}` | `permission:departments.write` | Qlobal departamentin silinməsi |

### Role & Permission Management

> Rol idarəsi üçün `permission:roles.read` və `permission:roles.write` icazələri istifadə olunur. Sistem konfiqurasiya bölümündən asılı olaraq `RoleController` əlavə analizlər aparır.

| Method | Route | Middleware | Təsvir |
| --- | --- | --- | --- |
| GET | `/api/roles` | `permission:roles.read` | Bütün rolların siyahısı |
| GET | `/api/roles/{role}` | `permission:roles.read` | Rol detalları |
| GET | `/api/roles/{role}/permissions` | `permission:roles.read` | Rola bağlı icazələr |
| GET | `/api/roles/{role}/users` | `permission:roles.read` | Rol üzrə istifadəçilər |
| GET | `/api/roles/hierarchy` | `permission:roles.read` | Rol iyerarxiyası ağacı |
| GET | `/api/permissions` | `permission:roles.read` | Mövcud bütün permission-lar |
| POST | `/api/roles` | `permission:roles.write` | Yeni rol yaradılması |
| PUT | `/api/roles/{role}` | `permission:roles.write` | Rol yenilənməsi |
| DELETE | `/api/roles/{role}` | `permission:roles.write` | Rolun silinməsi |
| POST | `/api/roles/{role}/permissions` | `permission:roles.write` | Rola yeni permission əlavə edir |
| DELETE | `/api/roles/{role}/permissions/{permission}` | `permission:roles.write` | Roldan permission çıxarır |
| POST | `/api/roles/{role}/users` | `permission:roles.write` | İstifadəçiyə rol təyin edir |
| DELETE | `/api/roles/{role}/users/{user}` | `permission:roles.write` | İstifadəçidən rol götürür |

### Hierarxiya endpoint-ləri (`permission:institutions.hierarchy`)

| Method | Route | Təsvir |
| --- | --- | --- |
| GET | `/api/hierarchy` | Tam ağac strukturu |
| GET | `/api/institutions-hierarchy` | Eyni məlumatın alternativ aliası |
| GET | `/api/hierarchy/children/{institution}` | Verilən qurumun uşaqları |
| GET | `/api/hierarchy/path/{institution}` | Qurumdan yuxarıya doğru yol |

### Nümunə istək (`POST /api/institutions`)

**Request Body:**
```json
{
  "name": "Sumqayıt 5 nömrəli məktəb",
  "type": "school",
  "parent_id": 42,
  "region_code": "ABS-05",
  "address": {
    "city": "Sumqayıt",
    "street": "Heydər Əliyev pr. 25"
  },
  "metadata": {
    "contact_person": "Nigar Əliyeva",
    "phone": "+994125551010"
  }
}
```

**Response (201):**
```json
{
  "message": "Qurum uğurla yaradıldı",
  "data": {
    "id": 512,
    "name": "Sumqayıt 5 nömrəli məktəb",
    "type": "school",
    "parent_id": 42,
    "status": "active"
  }
}
```

---

