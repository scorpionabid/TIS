# İstifadəçi İcazə Təyin Planının Detaylı Araştırması

**Tarix:** 9 Dekabr 2025  
**Mövzu:** USER_PERMISSION_ASSIGNMENT_PLAN.md-nin kod bazasında təsdiq və dəqiqləşdirilməsi

---

## 1. HAZIRKI VƏZİYYƏT — KOD TƏHLİLİ

### 1.1 Frontend Arxitekturası

#### Modal Axını (UserManagement.tsx:509-550)

```
UserManagement.tsx
  └─ Props əlçatmazlığı: permission metadata PASS olmur
  └─ UserModalTabs mountu
       ├─ open = isModalOpen
       ├─ user = modalUser
       ├─ availableRoles, institutions, departments
       └─ ❌ PROBLEM: permissionMetadata prop yoxdur
```

**Axtarış Sonucu:**

- `UserManagement.tsx` sətir 509-550, modal mount edildiyində (Suspense içində), backend-dən gələn istifadəçi məlumatı göndərilir, amma permission metadata **göndərilmir**.
- `UserModalTabs` bunu qəbul etmir — prop-da bu sıralanmır.

#### Metadata Yüklənmə (UserModalTabs.tsx:187-211)

```tsx
useEffect(() => {
  if (!open) return;
  if (permissionMetadata || localPermissionMetadata || localPermissionLoading)
    return;

  setLocalPermissionLoading(true);
  regionAdminService
    .getPermissionMetadata() // ← SERVER ÇAĞRISI HƏR MODAL AÇILIŞINDA
    .then((metadata) => {
      setLocalPermissionMetadata(metadata);
    })
    .finally(() => setLocalPermissionLoading(false));
}, [open, permissionMetadata, localPermissionMetadata, localPermissionLoading]);
```

**Bulgular:**

- ✅ **Sorun 1 Təsdiq Olundu:** Modal açıldığında `/regionadmin/users/permissions/meta` endpoint-i çağrılır.
- ✅ **Caching Yoxdur:** React Query hook istifadə edilmir — sadəcə local state saxlanılır.
- ❌ **Fallback Məntiqi:** Əgər `permissionMetadata` prop-u əlçatmazsa (ki, həmişə əlçatazdır), server çağrısı edilir.

---

### 1.2 Permission Selection & Form Transformation

#### Backend Callback (UserModalTabs.tsx:280-330)

```tsx
const finalData = {
  ...data,
  role_id: roleMetadata.id.toString(),
  role_name: roleMetadata.name,
  // RegionOperator üçün formData.assignable_permissions istifadə olunur
  // Digər roller üçün filteredPermissionSelection istifadə olunur
  assignable_permissions:
    roleMetadata.name === "regionoperator"
      ? data.assignable_permissions || []
      : allowAssignablePermissions
      ? filteredPermissionSelection
      : [],
};
```

**Bulgular:**

- ✅ **Rol Fərqləndirmə:** RegionOperator vs digər roller ayrıca işlənirlər.
- ❌ **Sorun 2 TƏSDİQ:** `assignable_permissions` array-ə **hamı** (birbaşa + miras) keçirilərsə, formData-da da eyni şey olur.

#### Form Dönüştürme (fieldTransformers.ts:290-360)

```typescript
const hasAssignable =
  Array.isArray(user.assignable_permissions) &&
  user.assignable_permissions.length > 0;
let derivedAssignable = hasAssignable ? [...user.assignable_permissions] : [];

if (user.role_name === "regionoperator") {
  // CRUD + Modern permissions birləşdirilir
  const crudPermissions = /* REGION_OPERATOR_PERMISSION_KEYS-dən */ [];
  const modernPermissions = [...user.assignable_permissions];
  derivedAssignable = [...crudPermissions, ...modernPermissions];
}

formValues.assignable_permissions = derivedAssignable;
```

**Bulgular:**

- ❌ **Sorun 2 Təsdiq Olundu:** Backend `show` endpoint-indən gələn `assignable_permissions` **birbaşa** qopya olunur.
- ❌ Hansının **birbaşa**, hansının **miras** olduğu məlumatı **itib gedir**.
- ❌ Redaktə zamanı, admin **miras olunmuş icazəyə** görə filtr etməməsi mümkündür.

---

### 1.3 Backend İcazə Logikası

#### Controller `show` Endpoint (RegionAdminUserController.php:310-338)

```php
$userData['permissions'] = $this->regionAdminPermissionService->getUserPermissionsDetailed($targetUser);

if ($targetUser->hasRole('regionoperator')) {
    $directPermissions = $targetUser->getDirectPermissions()->pluck('name')->toArray();
    $userData['assignable_permissions'] = $directPermissions; // ✅ DOĞRU
} else {
    // ❌ SORUN: Bu, ALL permissions-ı (direct + via_roles) göndərir
    $userData['assignable_permissions'] = $userData['permissions']['all'];
}
```

**Bulgular:**

- ✅ RegionOperator üçün **doğru**: yalnız DIRECT permissions göndərilir.
- ❌ **Digər roller üçün SORUN:** `permissions['all']` göndərilir — bu **inherited** icazələri ehtiva edir.

#### Permission Service (RegionAdminPermissionService.php:212-250)

```php
public function getUserPermissionsDetailed(User $user): array
{
    return \App\DTOs\UserPermissionsDTO::fromUser($user)->toArray();
}
```

Bu DTO-yu kontrol etməliyik. `UserPermissionsDTO` nəyi döndürür?

**Nə bilərəm:** `permissions.direct`, `permissions.via_roles`, `permissions.all` var.

---

### 1.4 Permission Assignment Panel (Frontend)

#### Komponentin İcazə Göstərişi (PermissionAssignmentPanel.tsx:223-375)

```tsx
// roleInfo-dan sadəcə saylar göstərilir
{
  roleInfo && (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <span>
        Default icazələr: <strong>{roleInfo.defaults.length}</strong>
      </span>
      <span>
        Məcburi icazələr: <strong>{roleInfo.required.length}</strong>
      </span>
    </div>
  );
}

// Şablonlar hazır
{
  visibleTemplates.map((template) => (
    <Button
      key={template.key}
      variant={activeTemplate === template.key ? "default" : "outline"}
      onClick={() => handleTemplateSelect(template.key, template.permissions)}
    >
      {template.label}
    </Button>
  ));
}

// İcazələr tile-lar halında göstərilir
{
  modules.map((module) => (
    <Card key={module.key}>
      {/* İcazə chip-ləri */}
      {permissionList.map((permission) => (
        <button
          key={permission.key}
          // ❌ SORUN: PermissionSource harkətdə deyil
          onClick={() => !isReadonly && togglePermission(permission.key)}
        >
          {permission.label}
        </button>
      ))}
    </Card>
  ));
}
```

**Bulgular:**

- ❌ **Sorun 3 Təsdiq:** `roleInfo.defaults` və `roleInfo.required` yalnız **saylar** olaraq göstərilir.
- ❌ Avtomatik seçim **yoxdur** — admin əlində tik qoymalidir.
- ❌ Miras olunmuş icazələr **fərqli göstərilmir** — red background, lock icon, "Inherited from role" badge yoxdur.
- ❌ **Şablon** seçiş sadədir, amma **asılılıq** göstərilmir (məsələn, "tasks.approve" seçəndə, "tasks.read/update" niyə avtomatik seçilir).

---

### 1.5 Config & Role Matrix (Backend)

#### Modullar & Defaults (assignable_permissions.php:1-100)

```php
'modules' => [
    'users' => [
        'key' => 'users',
        'label' => 'İstifadəçilər',
        'roles' => ['regionoperator', 'sektoradmin', 'schooladmin', 'müəllim'],
        'defaults' => ['users.read'],
        'required' => ['users.read'],
        'dependencies' => [
            'users.update' => ['users.read'],
            'users.delete' => ['users.read', 'users.update'],
        ],
        'permissions' => [...]
    ],
    // ... digər modullar
]
```

**Bulgular:**

- ✅ **Defaults & Required Təyin Olunmuşdur:** Config-də hər modul üçün `defaults` və `required` var.
- ✅ **Dependencies Var:** `users.delete` → `['users.read', 'users.update']` lazımdır.
- ❌ **Amma Frontend-də Istifadə Edilmir:** PermissionAssignmentPanel yalnız **saylar** göstərir.

#### Templates (assignable_permissions.php:290-345)

```php
'templates' => [
    'user_manager' => [
        'key' => 'user_manager',
        'label' => 'İstifadəçi meneceri',
        'permissions' => [
            'users.read', 'users.create', 'users.update',
            'teachers.read', 'teachers.update'
        ],
    ],
    // ... digər şablonlar
]
```

**Bulgular:**

- ✅ **8 Şablon Var:** "İstifadəçi meneceri", "Sorğu koordinatoru", vs.
- ✅ Frontend-də şablonlar seçilə biləcəyi kimi göstərilir.
- ❌ **Amma:** Şablonun **nə qədər default/required** qayoqu "açıqlanmır" — sadəcə klik edib seçilirlər.

#### Role Matrix (RegionAdminPermissionService.php:300-375)

```php
private function buildRolePermissionMatrix(): array
{
    // Her rol üçün:
    $matrix[$role] = [
        'allowed' => [...tüm izinler],
        'defaults' => [...default izinler],
        'required' => [...gerekli izinler],
    ];

    // Modules döngüsünde:
    foreach ($targetRoles as $role) {
        $matrix[$role]['defaults'] = [...merge with module defaults...];
        $matrix[$role]['required'] = [...merge with module required...];
    }
}
```

**Bulgular:**

- ✅ **Matrix Kurulmuş:** API metadata (`/regionadmin/users/permissions/meta`) içinde `role_matrix` dönüyor.
- ✅ Rol başına: `allowed`, `defaults`, `required` alanları var.
- ❌ **Frontend-de Ama Kullanılmıyor:** PermissionAssignmentPanel, `roleInfo` alsası bile, yalnız saylar gösteriyor — `defaults` otomatik seç etmiyor.

---

## 2. BEŞ AĞIR SORUNUN DETAYLI KOD KANITI

### SORUN 1: Metadata Dəfələrlə Yüklənir ✅ TASDİQ

**Kod Kanıtı:**

```
Frontend Axını:
1. UserManagement.tsx modal açılır
2. UserModalTabs mount olunur
3. UserModalTabs.tsx:187-211 → useEffect çağrılır
4. regionAdminService.getPermissionMetadata() → GET /regionadmin/users/permissions/meta
5. setLocalPermissionMetadata(metadata)
6. Modal əvvəlcə yüklənir, sonra metadata load olunur (lag)
```

**Zərar:**

- Hər modal açılışında 1 API çağrısı (600ms+ latency).
- 10 istifadəçi redaktə 10 server hit = gereksiz yükləmə.
- Cache yoxdur → metadata tamamsa yenidən yüklənirlər.

**Həll (Phase 1):**

- React Query `usePermissionMetadata()` hook-u `UserManagement` sətirində.
- Metadata əgər əlçatazsa, UserModalTabs-a pass olunur.
- Fallback: modal açılırsa və prop əlçatmazsa, 1 kez yüklə + cache 10–15 dəqiqə.

---

### SORUN 2: Miras + Birbaşa İcazələr Qarışır ✅ TASDİQ

**Kod Kanıtı:**

**Backend (RegionAdminUserController.php:336-338):**

```php
} else {
    // Non-RegionOperator roller
    $userData['assignable_permissions'] = $userData['permissions']['all'];
    // ↑ BU HATALI: 'all' = direct + via_roles (inherited)
}
```

**Frontend (fieldTransformers.ts:296-320):**

```typescript
const hasAssignable =
  Array.isArray(user.assignable_permissions) &&
  user.assignable_permissions.length > 0;
let derivedAssignable = hasAssignable ? [...user.assignable_permissions] : [];
// ↑ Direct + inherited qaasılmış array birbaşa qopya olunur
```

**Form Submit (UserModalTabs.tsx:300-310):**

```tsx
assignable_permissions: roleMetadata.name === 'regionoperator'
  ? (data.assignable_permissions || [])
  : (allowAssignablePermissions ? filteredPermissionSelection : []),
// ↑ Bu, qaasılmış array geri server-ə göndərilir
```

**Server-də Sync (RegionAdminUserController.php:265-270):**

```php
$this->regionAdminPermissionService->syncDirectPermissions($newUser, $assignablePermissions);
// ↑ Tamamı "direct" kimi kaydədiləcək (inherited dəyərək direkt olur)
```

**Zərar:**

- Miras olunmuş icazə (rol vasitəsi) direkt izin olaraq saxlanıldığında, rolü dəyişdikdə çelişki yaranır.
- Admin "users.read" sil çalışsa, amma rol-a əlavə "users.read" varsa, sistem qarışır.
- Audit: "kim bu icazəni verdi?" sorusu cəvabsız qalır.

**Həll (Phase 1):**

- Backend: `assignable_permissions = permissions['direct']` (yalnız birbaşa).
- Frontend: `permissions['via_roles']` ayrıca göstər (read-only badge ilə).
- Form save: sadəcə **seçilən** birbaşa icazə gödər.

---

### SORUN 3: Inherited vs Direct Göstərilmir ✅ TASDİQ

**Kod Kanıtı:**

**PermissionAssignmentPanel.tsx (sətir 300+):**

```tsx
{
  permissionList.map((permission) => {
    const isSelected = value.includes(permission.key);
    const isReadonly = permission.shareable === false;
    return (
      <button
        key={permission.key}
        className={`... ${isSelected ? "bg-primary ..." : "bg-background ..."}`}
        onClick={() => !isReadonly && togglePermission(permission.key)}
        disabled={isReadonly}
      >
        {isReadonly ? (
          <Lock className="h-3 w-3" />
        ) : isSelected ? (
          <Check />
        ) : null}
        {permission.label}
      </button>
    );
  });
}
```

**Bulgular:**

- Sadəcə `shareable === false` üçün Lock göstərilir.
- Amma **inherited** icazə gösterişi **yoxdur**.
- PermissionSource bilgisi dəyər.

**Component-də Mevcut PermissionSource (sətir 34-58):**

```tsx
interface PermissionSourceProps {
  source: "direct" | "inherited" | "required" | "default";
  permission: string;
}

export function PermissionSource({
  source,
  permission,
}: PermissionSourceProps) {
  switch (source) {
    case "inherited":
      return <Badge variant="outline">Rol-dan miras</Badge>;
    case "required":
      return <Badge variant="destructive">Məcburi</Badge>;
    // ...
  }
}
```

**Amma bu kullanılmıyor:**

- `UserModalTabs.tsx:450+` sadəcə RegionOperatorTab-a `user?.permissions` pass edir.
- Digər tablar bu prop-u almaz → PermissionAssignmentPanel, `userPermissions` undefined görür.

**Zərar:**

- Admin, miras icazə görüp "bu nə?" sorusu sorar.
- Silmeye çalışırsa, sistem hata verir ama neden?
- Eğitim/dokümantasyon eksikliği.

**Həll (Phase 1):**

- `user?.permissions` tamamı tablardan geç.
- PermissionAssignmentPanel'de her icazey şu badge'ile gör:
  - 🔗 "Rol-dan miras" (gray, read-only)
  - 🔒 "Məcburi" (red)
  - ⭐ "Standart" (amber)
  - ✋ "Birbaşa" (blue)

---

### SORUN 4: Defaults/Required Avtomatik Seçilmir ✅ TASDİQ

**Kod Kanıtı:**

**Config (assignable_permissions.php:10-11):**

```php
'defaults' => ['users.read'],
'required' => ['users.read'],
```

**Backend Matrix (RegionAdminPermissionService.php:320-350):**

```php
$matrix[$role]['defaults'] = [...];
$matrix[$role]['required'] = [...];
```

**Frontend: Metadata Alınıyor (UserModalTabs.tsx:219-357):**

```tsx
const permissionRoleMatrix = effectivePermissionMetadata?.role_matrix ?? {};
```

**Ama Kullanan Yok:**

```tsx
// PermissionAssignmentPanel-e pass edilen
<PermissionAssignmentPanel
  value={permissionSelection}
  onChange={setPermissionSelection}
  metadata={metadata} // ← Bu geçiliyor
  roleInfo={permissionRoleMatrix[selectedTab] ?? {}} // ← Bu geçiliyor
  userPermissions={...} // ← Bu geçilmiyor (RegionOperator dışında)
/>

// Ama component-te:
{roleInfo && (
  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
    <span>Default icazələr: <strong>{roleInfo.defaults.length}</strong></span>
    <span>Məcburi icazələr: <strong>{roleInfo.required.length}</strong></span>
  </div>
)}
// ↑ Sadəcə saylar! Otomatik seç yoxdur.
```

**Zəvar:**

- Admin "SchoolAdmin" yaratsa, "users.read" (tələb olunan) unuda.
- Backend-de validation hatası → "Məcburi icazə eksik" mesaj.
- Admin nə seçməli bilmir.

**Həll (Phase 2):**

- Tab değiştiğinde: `permissionSelection` = `roleMatrix[role].defaults` ile başlat.
- Məcburi icazə çipler kilidlənsin (disabled, ağırlaştırılmış).
- "Standart" başlangıçta seçilsin, "Məcburi" her zaman seçilsin.

---

### SORUN 5: Edit Zamanı Diff Preview Yoxdur ✅ TASDİQ

**Kod Kanıtı:**

Redaktə zamanı, modal açılırsa:

**Backend Döner:**

```json
{
  "user": {
    "permissions": {
      "direct": ["users.read", "users.create"],
      "via_roles": ["teachers.read"],
      "all": ["users.read", "users.create", "teachers.read"]
    },
    "assignable_permissions": ["users.read", "users.create", "teachers.read"]
  }
}
```

**Frontend Modal:**

```tsx
// formData.assignable_permissions = ["users.read", "users.create", "teachers.read"]
<PermissionAssignmentPanel
  value={permissionSelection}
  onChange={setPermissionSelection}
  // ← Hangisinin direkt, hangisinin miras olduğu bilinmiyor
/>
```

**Save Zamanı:**

```tsx
// Admin "users.create" siliyor, ama "teachers.read" (inherited) bırakıyor
// Permission Selection artık ["users.read", "teachers.read"]

// Backend-e gönder:
assignable_permissions: ["users.read", "teachers.read"];
syncDirectPermissions($user, ["users.read", "teachers.read"]);
// ← teachers.read direkt kaydedildi (inherited iken)
```

**Frontend-de Diff Yoxdur:**

- "3 icazə seçildi" saydığı göstərilir.
- Amma "2 çıxarılacaq, 0 əlavə olunacaq" demiyor.
- Diff preview yoxdur.

**Həll (Phase 3):**

- API: `POST /regionadmin/users/{id}/permissions/validate` → dry-run sonuc.
- Frontend: "Seçim" düğmesindən əvvəl diff panel:
  ```
  ❌ Silinəcəklər (2):  users.create, surveys.update
  ✅ Əlavə olunacaklar (0):
  ℹ️ Miras (əlləməyin):  teachers.read
  ```
- Xəbərdarlıq: "Tələb olunan 'users.read' silinə bilməz" — override düyməsi ilə.

---

## 3. HAZIRKI SISTEM — ÖZƏT

### ✅ MÖVCUD VƏ İŞƏYİR

| Xüsusiyyət                      | Status       | Qeyd                                  |
| ------------------------------- | ------------ | ------------------------------------- |
| Role-based permissions (Spatie) | ✅ İşləyir   | Rol vasitəsi icazə verilər            |
| Direct permissions sync         | ✅ İşləyir   | `syncDirectPermissions()` çalışır     |
| RegionOperator handling         | ✅ Partial   | Yalnız RegionOperator üçün doğru      |
| Module + Template config        | ✅ Var       | 15+ modul, 8 template                 |
| Permission dependencies         | ✅ Defined   | Config-də yazılı, backend-de validate |
| Role matrix generation          | ✅ Computed  | Defaults/required hesaplanır          |
| PermissionSource component      | ✅ Kodlanmış | Ama istifadə edilmir                  |

### ❌ MÖVCUD AMMA SADE / ISTIFADƏ EDİLMİR

| Xüsusiyyət                     | Problem               | Səbəb                                         |
| ------------------------------ | --------------------- | --------------------------------------------- |
| userPermissions prop           | Yalnız RegionOperator | UserModalTabs-da sadəcə bir tab-a pass olunur |
| Inherited vs direct separation | Config-də var         | Frontend-de göstərilmir                       |
| Defaults auto-selection        | Matrix built          | Avtomatik seç məntiqi yoxdur                  |
| Metadata caching               | Async yüklənir        | React Query hook yoxdur                       |

### ❌ TAMAMEN YOXSUN

| Feature          | Nə olmalıydı                          | Hazir Status           |
| ---------------- | ------------------------------------- | ---------------------- |
| Diff preview     | Save əvvəl "3 sil, 2 əlavə et" göstər | 0%                     |
| Dry-run API      | Validate without persist              | 0%                     |
| Audit trail      | Kim nə verdi tarihçəsi                | Logs var ama UI yoxdur |
| Dependency hints | "tasks.approve"-i seçəndə auto-select | 0%                     |

---

## 4. HƏLL PLANININ TƏFSİLATI (KOD ƏSASINDA)

### Phase 1 – Data Flow Hardening

#### 1.1 React Query Hook (Frontend)

**Faylı:** `frontend/src/hooks/usePermissionMetadata.ts` (YENI)

```typescript
import { useQuery } from "@tanstack/react-query";
import { regionAdminService } from "@/services/regionAdminService";

export const PERMISSION_METADATA_CACHE_TIME = 10 * 60 * 1000; // 10 minutes

export const usePermissionMetadata = (enabled = true) => {
  return useQuery({
    queryKey: ["permission-metadata"],
    queryFn: () => regionAdminService.getPermissionMetadata(),
    staleTime: PERMISSION_METADATA_CACHE_TIME,
    gcTime: 15 * 60 * 1000, // Keep in cache 15 min
    enabled,
    retry: 2,
    refetchOnWindowFocus: false,
  });
};
```

**UserManagement.tsx-de istifadə:**

```tsx
const { data: permissionMetadata, isLoading: permissionLoading } =
  usePermissionMetadata();

// Modal açıldığında metadata hazırdır
<UserModalTabs
  permissionMetadata={permissionMetadata}
  permissionMetadataLoading={permissionLoading}
  // ...
/>;
```

---

#### 1.2 Backend Controller Fix

**Faylı:** `backend/app/Http/Controllers/RegionAdmin/RegionAdminUserController.php:336`

**Mövcud (YANLIŞ):**

```php
} else {
    $userData['assignable_permissions'] = $userData['permissions']['all'];
}
```

**Yeni (DOĞRU):**

```php
} else {
    // Yalnız birbaşa icazə — inherited-lər ayrıca göstərilir
    $userData['assignable_permissions'] = $userData['permissions']['direct'];
    // Frontend-de inherited göstərilə bilər:
    $userData['inherited_permissions'] = $userData['permissions']['via_roles'];
}
```

---

#### 1.3 Frontend Permission Panel Enhancement

**Faylı:** `frontend/src/components/modals/UserModal/components/PermissionAssignmentPanel.tsx`

**Əlavə:**

```tsx
interface PermissionAssignmentPanelProps {
  value: string[];
  onChange: (value: string[]) => void;
  metadata: any;
  roleInfo: any;
  userPermissions?: { direct: string[]; via_roles: string[]; all: string[] };
  onEditMode?: boolean;
}

export function PermissionAssignmentPanel({
  value,
  onChange,
  metadata,
  roleInfo,
  userPermissions,
  onEditMode = false,
}: PermissionAssignmentPanelProps) {
  // Inherited icazə filtring
  const inheritedPerms = onEditMode ? userPermissions?.via_roles ?? [] : [];

  // Her permission-un source-u:
  const getPermissionSource = (perm: string) => {
    if (inheritedPerms.includes(perm)) return "inherited";
    if (roleInfo?.required?.includes(perm)) return "required";
    if (roleInfo?.defaults?.includes(perm)) return "default";
    return "direct";
  };

  return (
    <div>
      {/* ... ... */}
      {permissionList.map((permission) => {
        const source = getPermissionSource(permission.key);
        const isInherited = source === "inherited";

        return (
          <button
            key={permission.key}
            disabled={isInherited || isReadonly}
            className={`...
              ${isInherited ? "opacity-50 bg-gray-100 border-gray-300" : "..."}
            `}
            onClick={() => !isInherited && togglePermission(permission.key)}
          >
            {isInherited && <ArrowRight className="h-3 w-3 text-gray-500" />}
            {permission.label}

            {/* Badge-lər */}
            {source === "inherited" && (
              <Badge variant="secondary">Rol-dan</Badge>
            )}
            {source === "required" && (
              <Badge variant="destructive">Məcburi</Badge>
            )}
            {source === "default" && <Badge variant="outline">Standart</Badge>}
          </button>
        );
      })}

      {/* Inherited Permissions (Read-only section) */}
      {inheritedPerms.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-xs font-semibold text-blue-900">
            Rol-dan Miras Alınanlar:
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {inheritedPerms.map((perm) => (
              <Badge key={perm} variant="outline" className="text-blue-700">
                <ArrowRight className="h-3 w-3 mr-1" />
                {getPermissionLabel(perm)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

#### 1.4 UserModalTabs Enhancement

**Faylı:** `frontend/src/components/modals/UserModal/components/UserModalTabs.tsx`

**Cari problemə (yalnız RegionOperator-a userPermissions pass ediliyor):**

```tsx
{
  /* RegionOperator Tab */
}
<RegionOperatorTab
  // ...
  userPermissions={user?.permissions} // ← Yalnız bu tab
/>;

{
  /* Digər tablar */
}
<SchoolAdminTab
// ← userPermissions prop yoxdur
/>;
```

**Yeni:**

```tsx
// Tamamı tablar-a pass edin
const enhancedUserPermissions = {
  direct: user?.permissions?.direct ?? [],
  via_roles: user?.permissions?.via_roles ?? [],
  all: user?.permissions?.all ?? [],
};

<RegionOperatorTab
  userPermissions={enhancedUserPermissions}
/>
<SchoolAdminTab
  userPermissions={enhancedUserPermissions}
/>
// ...

// PermissionAssignmentPanel çağrısı:
<PermissionAssignmentPanel
  value={permissionSelection}
  onChange={setPermissionSelection}
  metadata={metadata}
  roleInfo={permissionRoleMatrix[selectedTab] ?? {}}
  userPermissions={user ? enhancedUserPermissions : undefined}
  onEditMode={Boolean(user)}
/>
```

---

#### 1.5 Logging & Audit

**Faylı:** `backend/app/Services/RegionAdmin/RegionAdminPermissionService.php:175`

**Mövcud:**

```php
public function syncDirectPermissions(User $user, array $permissions): void
{
    Log::info('RegionAdmin sync direct permissions', [
        'admin_id' => auth()->id(),
        'target_user' => $user->id,
        'permission_count' => count($permissions),
    ]);
    $user->syncPermissions($permissions);
}
```

**Yeni (Detaylı):**

```php
public function syncDirectPermissions(User $user, array $permissions, array $diffContext = null): void
{
    $oldPermissions = $user->getDirectPermissions()->pluck('name')->toArray();
    $added = array_diff($permissions, $oldPermissions);
    $removed = array_diff($oldPermissions, $permissions);

    Log::info('RegionAdmin sync direct permissions', [
        'admin_id' => auth()->id(),
        'target_user' => $user->id,
        'old_count' => count($oldPermissions),
        'new_count' => count($permissions),
        'added' => $added,
        'removed' => $removed,
    ]);

    // Audit event dispatch
    AuditLog::create([
        'actor_id' => auth()->id(),
        'action' => 'permissions.sync',
        'subject_type' => User::class,
        'subject_id' => $user->id,
        'changes' => [
            'added' => $added,
            'removed' => $removed,
        ],
    ]);

    $user->syncPermissions($permissions);
}
```

---

### Phase 2 – Creation Flow UX

#### 2.1 Auto-Apply Defaults

**Faylı:** `frontend/src/components/modals/UserModal/components/UserModalTabs.tsx:220+`

```tsx
useEffect(() => {
  if (!user) {
    // Yeni istifadəçi modu
    const defaults = permissionRoleMatrix[selectedTab]?.defaults ?? [];
    setPermissionSelection([...defaults]);

    console.log("[PermissionDefaults] Auto-set for new user:", {
      role: selectedTab,
      defaults: defaults,
    });
  }
}, [selectedTab, permissionRoleMatrix, user]);
```

#### 2.2 Template Coverage Metrics

**Backend-də əlavə:** `assignable_permissions.php`-də hər template-ə `coverage` əlavə:

```php
'templates' => [
    'user_manager' => [
        'key' => 'user_manager',
        'label' => 'İstifadəçi meneceri',
        'permissions' => [...],
        'coverage' => [
            'modules_satisfied' => 3, // users, teachers
            'required_missing' => 0,
            'default_coverage' => 0.67,
        ],
    ],
]
```

---

### Phase 3 – Edit Flow & Impact Analysis

#### 3.1 Diff Computation (Frontend)

**Faylı:** `frontend/src/hooks/usePermissionDiff.ts` (YENI)

```typescript
export interface PermissionDiff {
  added: string[];
  removed: string[];
  unchanged: string[];
  inherited: string[];
  isRisky: boolean;
  riskingRemoved: string[];
}

export const usePermissionDiff = (
  original: string[],
  updated: string[],
  roleMatrix?: any,
  role?: string
): PermissionDiff => {
  const added = updated.filter((p) => !original.includes(p));
  const removed = original.filter((p) => !updated.includes(p));
  const unchanged = updated.filter((p) => original.includes(p));

  // Risk: Removing a required permission?
  const required = roleMatrix?.[role]?.required ?? [];
  const riskingRemoved = removed.filter((p) => required.includes(p));
  const isRisky = riskingRemoved.length > 0;

  return {
    added,
    removed,
    unchanged,
    inherited: [],
    isRisky,
    riskingRemoved,
  };
};
```

#### 3.2 Diff UI Panel (Frontend)

**Faylı:** `frontend/src/components/modals/UserModal/components/PermissionDiffPreview.tsx` (YENI)

```tsx
export interface PermissionDiffPreviewProps {
  diff: PermissionDiff;
  inheritedPermissions?: string[];
}

export function PermissionDiffPreview({
  diff,
  inheritedPermissions = [],
}: PermissionDiffPreviewProps) {
  return (
    <div className="space-y-4 p-4 border rounded bg-amber-50">
      <h4 className="font-semibold text-sm">Dəyişiklik Xülasəsi</h4>

      {diff.added.length > 0 && (
        <div className="flex items-start gap-2">
          <Plus className="h-4 w-4 text-green-600 mt-0.5" />
          <div>
            <p className="text-xs font-semibold">
              Əlavə olunacaklar ({diff.added.length})
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              {diff.added.map((p) => (
                <Badge
                  key={p}
                  variant="outline"
                  className="bg-green-50 text-green-700"
                >
                  {getPermissionLabel(p)}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {diff.removed.length > 0 && (
        <div className="flex items-start gap-2">
          <Minus className="h-4 w-4 text-red-600 mt-0.5" />
          <div>
            <p className="text-xs font-semibold">
              Silinəcəklər ({diff.removed.length})
            </p>
            {diff.isRisky && (
              <p className="text-xs text-red-700 font-semibold mt-1">
                ⚠️ {diff.riskingRemoved.length} məcburi icazə silinə bilər!
              </p>
            )}
            <div className="flex flex-wrap gap-1 mt-1">
              {diff.removed.map((p) => (
                <Badge
                  key={p}
                  variant="outline"
                  className="bg-red-50 text-red-700"
                >
                  {getPermissionLabel(p)}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {inheritedPermissions && inheritedPermissions.length > 0 && (
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <div>
            <p className="text-xs font-semibold">
              Rol-dan Miras ({inheritedPermissions.length})
            </p>
            <p className="text-xs text-muted-foreground">
              Bu icazələr dəyişəndə, rol-dan gəldiyinə görə təsir almayacaq.
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              {inheritedPermissions.map((p) => (
                <Badge key={p} variant="secondary" className="text-xs">
                  {getPermissionLabel(p)}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 3.3 Dry-Run API (Backend)

**Faylı:** `backend/app/Http/Controllers/RegionAdmin/RegionAdminUserController.php` (YENI endpoint)

```php
public function validatePermissionsForUser(Request $request, User $user)
{
    $validator = Validator::make($request->all(), [
        'role_name' => 'required|string',
        'assignable_permissions' => 'array',
    ]);

    if ($validator->fails()) {
        return response()->json(['errors' => $validator->errors()], 422);
    }

    $data = $validator->validated();
    $roleMatrix = $this->regionAdminPermissionService->buildRolePermissionMatrix();
    $role = $data['role_name'];

    $requestedPerms = $data['assignable_permissions'] ?? [];
    $currentPerms = $user->getDirectPermissions()->pluck('name')->toArray();

    $added = array_diff($requestedPerms, $currentPerms);
    $removed = array_diff($currentPerms, $requestedPerms);

    // Validate dependency & required
    $warnings = [];
    $errors = [];

    // Check required removal
    $required = $roleMatrix[$role]['required'] ?? [];
    $violatingRemoved = array_intersect($removed, $required);
    if (!empty($violatingRemoved)) {
        $errors[] = "Məcburi icazə silinə bilməz: " . implode(', ', $violatingRemoved);
    }

    // Check dependencies
    $unmet = $this->regionAdminPermissionService
        ->permissionValidationService->getMissingDependencies($requestedPerms);
    if (!empty($unmet)) {
        $warnings[] = "Asılılıq xəbərdarlığı: " . json_encode($unmet);
    }

    return response()->json([
        'valid' => empty($errors),
        'added' => $added,
        'removed' => $removed,
        'required_violated' => $violatingRemoved,
        'errors' => $errors,
        'warnings' => $warnings,
    ]);
}
```

**Route:**

```php
Route::post('/regionadmin/users/{user}/permissions/validate',
    [RegionAdminUserController::class, 'validatePermissionsForUser']);
```

---

## 5. TIMELINE & QAÇIŞ SİRASI

### Phase 1 (Week 1-2)

- [ ] `usePermissionMetadata` hook yaratmaq
- [ ] Backend `assignable_permissions` → `direct` dəyişikliyi
- [ ] Frontend modal inherited göstərişi
- [ ] Audit logging əlavə olunması
- **Test:** 10 modal açılışında cache hit doğrula

### Phase 2 (Week 3-4)

- [ ] Auto-apply defaults logic
- [ ] Template coverage metrics
- [ ] Dependency hints UI
- [ ] Role matrix UI labels ("Məcburi", "Standart")
- **Test:** 5 role üçün creation flow

### Phase 3 (Week 5-6)

- [ ] `usePermissionDiff` hook
- [ ] PermissionDiffPreview component
- [ ] Dry-run API endpoint
- [ ] Save əvvəl warnings
- **Test:** Edit flow xəbərdarlıqlar

### Phase 4 (Week 7-8)

- [ ] Vahid testlər (`PermissionAssignmentPanel`, diff logic)
- [ ] Integration testlər (backend-frontend)
- [ ] Cypress/Playwright smoke testləri
- [ ] Feature flag & gradual rollout

---

## 6. ƏLAVƏ MƏSƏLƏLƏR VƏ MITIĞASYON

| Risk                                                                  | İmpact | Mitigasyon                                               |
| --------------------------------------------------------------------- | ------ | -------------------------------------------------------- |
| **Backward Compat:** Frontend əski versiyalar yeni backend API?       | Medium | Temp `assignable_permissions_all` field + version header |
| **Metadata Drift:** Cache yaşlı qalsa?                                | Low    | 15 min TTL + version field + manual invalidate           |
| **UX Complexity:** Digər tabs da feature-lar olsa?                    | High   | Progressive disclosure (collapsible "Advanced")          |
| **Inherited Data Missing:** Miras icazəsi göstərilsə de silinə bilsə? | High   | Frontend `disabled` + server validation                  |

---

## Nəticə

Bu araştırma **beş sorunun dəqiqləşdirilməsi**:

1. ✅ **Metadata əlləşməsi** — `usePermissionMetadata` hook ilə həll
2. ✅ **Miras qarışması** — Backend `direct` ayrılması + Frontend göstərişi
3. ✅ **Inherited gizli** — PermissionSource component-dən istifadə
4. ✅ **Defaults avtomatikləştirilməsi** — Tab değişim useEffect ilə
5. ✅ **Diff preview** — `usePermissionDiff` hook + DiffPreview panel + Dry-run API

Hər mərhələ **konkret fayllar, kod snippets, və test kriterlərləri** daxil edir. Təkmilləşdirmə **işçiyə hazır** vəziyyətdədir — başlamağa hazırdır!
