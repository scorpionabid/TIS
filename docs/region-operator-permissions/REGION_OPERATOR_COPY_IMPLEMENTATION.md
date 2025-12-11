# RegionOperator Səlahiyyətləri - İMPLEMENTASİYA HAZIRLIĞI

## 🎯 Məqsəd

RegionAdmin-ə RegionOperator yaradarkən/redaktə edərkən, bir başqa RegionOperator-un səlahiyyətlərini kopyalama (Mirror/Inherit) qabiliyyəti əlavə etmək.

---

## 📋 Current Status (Hal-hazırda)

### ✅ Mövcud Funksionallar

| Funksiya                  | Harada                                       | Status    |
| ------------------------- | -------------------------------------------- | --------- |
| RegionOperator yarat      | `/api/region-operators` POST                 | ✅ Var    |
| Səlahiyyətləri redaktə et | `/api/region-operators/{id}/permissions` PUT | ✅ Var    |
| Səlahiyyətləri göstər     | `/api/region-operators/{id}/permissions` GET | ✅ Var    |
| Səlahiyyətləri kopyala    | **YOX**                                      | ❌ ƏKSIK! |

### 🔴 Problemaların Analizi

```
RegionAdmin istəyir:
"Vəli operatorunun səlahiyyətlərini Əli operatoruna ötür"

Hal-hazırda:
1. Vəlinin səlahiyyətlərini manual GET edən
2. JSON-ı kopyalayan
3. PUT-da Əliyə yapışdıran
4. Frontend-də bu proses otomatikləşməmişdir

= Çox əl işi, səhv ehtimalı yüksək
```

---

## 🛠️ HƏLL: Copy/Mirror Funksiyası Əlavə Etmə

### Faza 1: Backend Service (PHP)

**Fayl:** `backend/app/Services/UserCrudService.php`

Əlavə ediləcək metod:

```php
/**
 * Copy RegionOperator permissions from source to target user
 *
 * Təhlükəsizlik:
 * - Hər iki user də regionoperator olmalıdır
 * - RegionAdmin yalnız əzəl regiondakı operatorları kopyalaya bilər
 */
public function copyRegionOperatorPermissions(
    User $sourceUser,
    User $targetUser,
    User $regionAdmin
): void {
    // 1. Validasiya: Hər iki də regionoperator mı?
    if (! $sourceUser->hasRole('regionoperator')) {
        throw new \Exception('Mənbə istifadəçi RegionOperator deyil');
    }
    if (! $targetUser->hasRole('regionoperator')) {
        throw new \Exception('Hədəf istifadəçi RegionOperator deyil');
    }

    // 2. Validasiya: RegionAdmin-in hüququ var mı?
    // (Hər iki user də onun regionundamı?)
    $region = $regionAdmin->institution;
    if (! $region || $region->level !== 2) {
        throw new \Exception('RegionAdmin sərəti yoxdur');
    }

    $allowedIds = $region->getAllChildrenIds();
    if (! in_array($sourceUser->institution_id, $allowedIds, true)) {
        throw new \Exception('Mənbə istifadəçi regionunuzda deyil');
    }
    if (! in_array($targetUser->institution_id, $allowedIds, true)) {
        throw new \Exception('Hədəf istifadəçi regionunuzda deyil');
    }

    // 3. Mənbənin səlahiyyətlərini al
    $sourcePermissions = $sourceUser->regionOperatorPermissions;
    if (! $sourcePermissions) {
        throw new \Exception('Mənbə istifadəçinin səlahiyyətləri qeyd olunmayıb');
    }

    // 4. 25 CRUD sahəsini al
    $crud_fields = [
        'can_view_surveys', 'can_create_surveys', 'can_edit_surveys',
        'can_delete_surveys', 'can_publish_surveys',
        'can_view_tasks', 'can_create_tasks', 'can_edit_tasks',
        'can_delete_tasks', 'can_assign_tasks',
        'can_view_documents', 'can_upload_documents', 'can_edit_documents',
        'can_delete_documents', 'can_share_documents',
        'can_view_folders', 'can_create_folders', 'can_edit_folders',
        'can_delete_folders', 'can_manage_folder_access',
        'can_view_links', 'can_create_links', 'can_edit_links',
        'can_delete_links', 'can_share_links',
    ];

    $permissionsToSync = $sourcePermissions->only($crud_fields)->toArray();

    // 5. Hədəfi sinkronizasiya et
    $this->syncRegionOperatorPermissions($targetUser, $permissionsToSync);

    // 6. Audit log
    SecurityEvent::logEvent([
        'event_type' => 'regionoperator_permissions_copied',
        'severity' => 'info',
        'user_id' => $regionAdmin->id,
        'target_user_id' => $targetUser->id,
        'description' => 'RegionOperator permissions copied from source user',
        'event_data' => [
            'source_user_id' => $sourceUser->id,
            'source_username' => $sourceUser->username,
            'target_username' => $targetUser->username,
            'permissions_copied' => count(array_filter($permissionsToSync)),
            'region_id' => $region->id,
        ],
    ]);

    Log::info('RegionOperator permissions copied', [
        'from_user_id' => $sourceUser->id,
        'to_user_id' => $targetUser->id,
        'admin_id' => $regionAdmin->id,
        'permissions_count' => count(array_filter($permissionsToSync)),
    ]);
}
```

### Faza 2: Controller Endpoint (PHP)

**Fayl:** `backend/app/Http/Controllers/RegionAdmin/RegionOperatorPermissionController.php`

Əlavə ediləcək metod:

```php
/**
 * Copy permissions from one RegionOperator to another
 * POST /api/region-operators/{target}/permissions/copy-from/{source}
 */
public function copyFromOperator(Request $request, User $target, User $source): JsonResponse
{
    $regionAdmin = $request->user();

    // Validasiya
    if (! $regionAdmin->hasRole('regionadmin')) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }

    try {
        $userService = app(UserCrudService::class);
        $userService->copyRegionOperatorPermissions($source, $target, $regionAdmin);

        // Əməliyyatdan sonra güncəl səlahiyyətləri qaytarın
        $updatedPermissions = $target->regionOperatorPermissions->only(self::CRUD_PERMISSION_FIELDS);

        return response()->json([
            'message' => 'Səlahiyyətlər kopyalandı',
            'from' => [
                'id' => $source->id,
                'username' => $source->username,
            ],
            'to' => [
                'id' => $target->id,
                'username' => $target->username,
            ],
            'permissions' => $updatedPermissions,
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Səhv: ' . $e->getMessage(),
        ], 422);
    }
}
```

### Faza 3: Route (Laravel Route)

**Fayl:** `backend/routes/api/dashboards.php`

```php
// Köhnə routes:
Route::get('region-operators/{user}/permissions', [RegionOperatorPermissionController::class, 'show']);
Route::put('region-operators/{user}/permissions', [RegionOperatorPermissionController::class, 'update']);

// YENİ ROUTE ƏLAVƏ ET:
Route::post('region-operators/{target}/permissions/copy-from/{source}', [
    RegionOperatorPermissionController::class,
    'copyFromOperator'
]);
```

---

## 🖼️ Frontend UI - React/TypeScript

**Fayl:** `frontend/src/components/RegionOperatorPermissions.tsx` (nəzəri)

```typescript
import { useState } from "react";
import { Copy, AlertCircle } from "lucide-react";

interface RegionOperatorPermissionsProps {
  operatorId: number;
  operatorUsername: string;
  allOperators: Array<{ id: number; username: string }>;
  onPermissionsUpdated: () => void;
}

export function RegionOperatorPermissions({
  operatorId,
  operatorUsername,
  allOperators,
  onPermissionsUpdated,
}: RegionOperatorPermissionsProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [message, setMessage] = useState("");

  const handleCopyPermissions = async () => {
    if (!selectedSourceId) {
      setMessage("Mənbə operatorunu seçin");
      return;
    }

    setIsCopying(true);
    try {
      const response = await fetch(
        `/api/region-operators/${operatorId}/permissions/copy-from/${selectedSourceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Kopyalama uğursuz oldu");

      setMessage("✅ Səlahiyyətlər kopyalandı!");
      setSelectedSourceId(null);
      onPermissionsUpdated();

      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(`❌ Səhv: ${error.message}`);
    } finally {
      setIsCopying(false);
    }
  };

  // Mənbə siyahısından cari operatorunu çıxar
  const availableOperators = allOperators.filter((op) => op.id !== operatorId);

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="font-semibold text-lg">⚡ Səlahiyyətləri Kopyala</h3>

      <p className="text-sm text-gray-600">
        Başqa RegionOperator-un səlahiyyətlərini
        <strong> {operatorUsername}</strong>-a ötürmək istəyirsiniz?
      </p>

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Mənbə Operatorunu Seçin:
        </label>
        <select
          value={selectedSourceId || ""}
          onChange={(e) => setSelectedSourceId(Number(e.target.value) || null)}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">-- Seçin --</option>
          {availableOperators.map((op) => (
            <option key={op.id} value={op.id}>
              {op.username}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleCopyPermissions}
        disabled={!selectedSourceId || isCopying}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Copy size={18} />
        {isCopying ? "Kopyalanır..." : "Səlahiyyətləri Kopyala"}
      </button>

      {message && (
        <div className="flex items-start gap-2 p-3 bg-blue-100 text-blue-800 rounded-md">
          <AlertCircle size={18} className="mt-0.5" />
          <p className="text-sm">{message}</p>
        </div>
      )}

      <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
        ⚠️ Mənbə operatorunun bütün 25 səlahiyyəti kopyalanacaq. Əgər
        səlahiyyətlərini əl ilə tənzimləmək istəyirsinizsə, "Səlahiyyətləri
        Redaktə Et" bölməsini istifadə edin.
      </div>
    </div>
  );
}
```

---

## 📊 API Endpoint Xülasəsi

### Kopyalama Endpoint-i

```
POST /api/region-operators/{TARGET_ID}/permissions/copy-from/{SOURCE_ID}

Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Response 200:
{
  "message": "Səlahiyyətlər kopyalandı",
  "from": {
    "id": 10,
    "username": "veli_operator"
  },
  "to": {
    "id": 42,
    "username": "ali_operator"
  },
  "permissions": {
    "can_view_surveys": true,
    "can_create_surveys": true,
    "can_edit_surveys": false,
    ...
  }
}

Response 403:
{
  "message": "Unauthorized"
}

Response 422:
{
  "message": "Səhv: Hədəf istifadəçi RegionOperator deyil"
}
```

---

## 🔒 Təhlükəsizlik Yoxlamaları

✅ **Kodda Təmin Edilən:**

- [ ] RegionAdmin yalnız ÖZÜNÜN regionundakı operatorları kopyalaya bilir
- [ ] Hər iki user da RegionOperator rolu olmalıdır
- [ ] Audit logging (Kim, nə vaxt, hansi operatorlara kopyaladığı)
- [ ] Role-based access control (regionadmin.deneme...etc)

⚠️ **Əlavə Yoxlamalar (Opsional):**

- [ ] Rate limiting: Hər saatda maksimum X kopyalama
- [ ] Permission inheritance restriction: Sahibkar (owner) olmayan operatorları kopyalaya bilməz
- [ ] Timestamp tracking: `last_permissions_copied_at` sahəsi

---

## 📝 Misal: Adım-adım İcra

### RegionAdmin Vəli → Əli

**Frontend:**

```
1. RegionOperator siyahısını aç
   ├─ Əli (ID: 42) seç
   └─ "Səlahiyyətləri Kopyala" düyməsi görünsün

2. Modal/Dialog açıl:
   "Mənbə Operatorunu Seçin:"
   ├─ Vəli (ID: 10) seç
   └─ "Kopyala" düyməsi basılır

3. Backend tərəfindən:
   POST /api/region-operators/42/permissions/copy-from/10

4. Response 200 alınır → "Səlahiyyətlər kopyalandı" mesajı

5. Səlahiyyətlər yenilənir (GET /api/region-operators/42/permissions)
   ├─ Əli-nin səlahiyyətləri = Vəli-nin səlahiyyətləri
```

**Backend Prosesi:**

```
1. copyFromOperator() çağırılır
   ├─ RegionAdmin yoxlanılır (regionadmin mı?)
   ├─ Source user yoxlanılır (regionoperator mı?)
   ├─ Target user yoxlanılır (regionoperator mı?)
   ├─ Hər iki user aynı regionda mı?

2. Vəlinin (10) regionOperatorPermissions alınır
   ├─ 25 CRUD sahəsi çıxarılır
   └─ Array-ə dönüştürülür

3. Əlinin (42) sayəsinə sinkronizasiya:
   ├─ region_operator_permissions cədvəli güncəllənir
   ├─ Spatie permissions sinkronizasiya:
   │  └─ user.syncPermissions(['surveys.read', 'surveys.create', ...])
   └─ model_has_permissions güncəllənir

4. Audit log yazılır:
   ├─ SecurityEvent tablosuna
   └─ Log channel-ına
```

---

## 🧪 Test Ssenariləri

### Test 1: Uğurlu Kopyalama

```bash
# Setup
USER_SOURCE=10    # Vəli
USER_TARGET=42    # Əli
REGION_ADMIN_TOKEN="xxx"

# Execute
curl -X POST \
  "http://localhost:8000/api/region-operators/42/permissions/copy-from/10" \
  -H "Authorization: Bearer $REGION_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Expected
✅ 200 OK
{
  "message": "Səlahiyyətlər kopyalandı",
  "permissions": { ... }
}
```

### Test 2: Qeyri-RegionOperator (Başarısız)

```bash
USER_SOURCE=5     # Teacher (not regionoperator)
USER_TARGET=42    # Əli (regionoperator)

# Execute
curl -X POST "http://localhost:8000/api/region-operators/42/permissions/copy-from/5" ...

# Expected
❌ 422
{
  "message": "Səhv: Mənbə istifadəçi RegionOperator deyil"
}
```

### Test 3: Başqa Region-dan (Başarısız)

```bash
# RegionAdmin A istəyir Region B-nin operatorunun səlahiyyətlərini kopyalamaq

# Expected
❌ 422
{
  "message": "Səhv: Mənbə istifadəçi regionunuzda deyil"
}
```

---

## 📋 Implementation Checklist

- [ ] Backend Service Method (`copyRegionOperatorPermissions`)
- [ ] Controller Endpoint (`copyFromOperator`)
- [ ] Route qeyd (`POST .../copy-from/...`)
- [ ] Frontend Component (Copy Dialog)
- [ ] API Call Integration
- [ ] Error Handling
- [ ] Audit Logging
- [ ] Unit Tests
- [ ] Integration Tests
- [ ] User Documentation

---

## 📚 Faydalı Fayllar

| Fayl                                      | Məqsəd                            | Status         |
| ----------------------------------------- | --------------------------------- | -------------- |
| `UserCrudService.php`                     | `copyRegionOperatorPermissions()` | Əlavə ediləcək |
| `RegionOperatorPermissionController.php`  | `copyFromOperator()`              | Əlavə ediləcək |
| `routes/api/dashboards.php`               | Route qeyd                        | Əlavə ediləcək |
| `RegionOperatorPermissions.tsx`           | Frontend UI                       | Əlavə ediləcək |
| `REGION_OPERATOR_PERMISSIONS_ANALYSIS.md` | Texniki təhlil                    | ✅ Yaradıldı   |

---

**Hazırlanıb:** 2025-12-11  
**Dil:** Azərbaycanca  
**Status:** İmplementasiya hazır
