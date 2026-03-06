# Region Operator Səlahiyyətləri - Dəqiq Analiz

## 📋 Sizin Sorunuzun Cavabı

**Sual:** RegionOperator user yaradanda ona rol və səlahiyyətləri necə təyin edilir? Özündə olan səlahiyyətləri ötürə biləcəkmi?

**Cavab:** Var, mümkündür! 3 fərqli sistem paralel işləyir və bunu izah edəcəyəm.

---

## 🔑 3 Səlahiyyət Mexanizmi - Sadə İzahat

Banka gedən müştəri kimi düşünün:

- **1. Spatie Permission** = Bankada qapıya yazılı qayda (standart)
- **2. RegionOperator Permissions** = O müştəriyə xüsus kart (miqyaslı)
- **3. Role_User** = Eski sistem (istifadə olunmur, unudun)

### 1️⃣ **SPATIE PERMISSION** (Standart Laravel)

**Nə qədər əhəmiyyətli:** ⭐⭐⭐⭐⭐ Çox vacibdir

```
┌─────────────────────────────────────┐
│ SPATIE PERMISSION CƏDVƏL STRUKTUR   │
├─────────────────────────────────────┤
│ permissions (cədvəl)                │
│  ├─ id (kimlik)                     │
│  ├─ name (ad): "surveys.read"       │
│  └─ guard_name: "sanctum"           │
│                                     │
│ permission_role (cədvəl)            │
│  ├─ role_id                         │
│  └─ permission_id                   │
│                                     │
│ model_has_permissions (cədvəl)      │
│  ├─ user_id (istifadəçi kimliyi)   │
│  └─ permission_id                   │
└─────────────────────────────────────┘
```

**Nə deməkdir?**

- **permission**: "surveys.read" kimi qayda
- **permission_role**: Rol (məsələn regionoperator) → onun səlahiyyətləri
- **model_has_permissions**: Xüsus istifadəçi → onun fərdi səlahiyyətləri

**Misal:**

```
RegionAdmin A əmrsi verir:
  ✓ surveys.read  (sorğuları görə biləcək)
  ✓ surveys.create (sorğu yarada biləcək)
  ✗ surveys.delete (sorğu siləcəməyəcək)
```

### 2️⃣ **REGION_OPERATOR_PERMISSIONS** (Xüsusi Boolean Cədvəl)

**Nə qədər əhəmiyyətli:** ⭐⭐⭐⭐⭐ Çox vacibdir - RegionOperator üçün ÖZƏLDİRMƏ!

```
┌──────────────────────────────────────┐
│ region_operator_permissions (cədvəl) │
├──────────────────────────────────────┤
│ user_id         (istifadəçi)        │
├──────────────────────────────────────┤
│ SORĞULAR (5 qayda):                 │
│  ├─ can_view_surveys     = true/false│
│  ├─ can_create_surveys   = true/false│
│  ├─ can_edit_surveys     = true/false│
│  ├─ can_delete_surveys   = true/false│
│  └─ can_publish_surveys  = true/false│
│                                      │
│ TAPŞIRIQLAR (5 qayda):              │
│  ├─ can_view_tasks       = true/false│
│  ├─ can_create_tasks     = true/false│
│  ├─ can_edit_tasks       = true/false│
│  ├─ can_delete_tasks     = true/false│
│  └─ can_assign_tasks     = true/false│
│                                      │
│ SƏNƏDLƏR (5 qayda):                 │
│  ├─ can_view_documents   = true/false│
│  ├─ can_upload_documents = true/false│
│  ├─ can_edit_documents   = true/false│
│  ├─ can_delete_documents = true/false│
│  └─ can_share_documents  = true/false│
│                                      │
│ QOVLUQLAR (5 qayda):                │
│  ├─ can_view_folders     = true/false│
│  ├─ can_create_folders   = true/false│
│  ├─ can_edit_folders     = true/false│
│  ├─ can_delete_folders   = true/false│
│  └─ can_manage_folder_access = true  │
│                                      │
│ BAĞLANTILAR (5 qayda):              │
│  ├─ can_view_links       = true/false│
│  ├─ can_create_links     = true/false│
│  ├─ can_edit_links       = true/false│
│  ├─ can_delete_links     = true/false│
│  └─ can_share_links      = true/false│
└──────────────────────────────────────┘

CƏMI: 25 BOOLEAN SÜTUN!
```

**Nə deməkdir?**

- Hər RegionOperator üçün ayrı-ayrı "can_do_this" kimi sütunlar
- `true` = edə biləcək, `false` = edəcəməyəcək
- RegionAdmin sadə bir UI-də ENABLE/DISABLE edə bilər

**Misal:**

```
User: Əli (regionoperator)
can_view_surveys: true    ✓ Sorğuları görsün
can_create_surveys: true  ✓ Sorğu yaratsa
can_edit_surveys: false   ✗ Redaktə etməsin
can_delete_surveys: false ✗ Silməsin
```

### 3️⃣ **LEGACY ROLE_USER** (Eski Sistem)

**Nə qədər əhəmiyyətli:** ⭐ Unutun - istifadə olunmur!

```
┌──────────────────────┐
│ role_user (eski)     │
├──────────────────────┤
│ user_id              │
│ role_id              │
└──────────────────────┘
```

**Nə deməkdir?**

- Köhnə sistemin izləri
- Artıq **Spatie Permission** tərəfindən əvəz edilib
- **Silə bilərsiniz** (deprecated)

---

## 🔄 Üç Sistem Arasındakı Əlaqə - Vizual

```
REGIONADMIN istifadəçi yaradır
         │
         ↓
    ┌────────────────────────────────────┐
    │ UserCrudService::create() çağırılır│
    └────────────────────────────────────┘
         │
         ├─────────────────────────────┬──────────────────────────┐
         ↓                             ↓                          ↓
    ┌─────────────┐        ┌──────────────────────────┐    ┌──────────┐
    │ USER        │        │ SPATIE PERMISSION        │    │ REGION   │
    │ (users)     │        │ (permissions + roles)    │    │ OPERATOR │
    ├─────────────┤        ├──────────────────────────┤    ├──────────┤
    │ ✓ Yaradıldı │        │ ✗ Avtomatik əvvəlcə      │    │ ✗ Şimdi  │
    │             │        │   heç nə YOX             │    │   YOX    │
    │ role_id     │        │   (əl ilə əlavə edilir)  │    │          │
    │ region_id   │        │                          │    │          │
    └─────────────┘        └──────────────────────────┘    └──────────┘
         │                         │                             │
         │                         ↓                             │
         │                  Step 2: Əgər regionoperator          │
         │                  roluysa:                             │
         │                    assignRole('regionoperator')       │
         │                                                        │
         └────────────────────────────────────────────────────────┤
                                                                  │
                                                                  ↓
                                                        Step 3: syncRegionOperator
                                                        Permissions() çağırılır
                                                                  │
                          ┌───────────────────────────────────────┘
                          │
                   ┌──────┴──────┐
                   │             │
                   ↓             ↓
            ┌────────────┐  ┌──────────────┐
            │ region_op  │  │ Spatie       │
            │ erator_    │  │ permissions  │
            │ permissions│  │ (sync)       │
            │ (sync)     │  │              │
            └────────────┘  └──────────────┘
```

---

## 🛠️ PRAKTIK MISALLAR

### Ssenariy 1: RegionOperator Yaratıq

**RegionAdmin istəyir:**

```javascript
POST /api/users {
  "username": "ali_operator",
  "email": "ali@example.com",
  "role_id": 4,  // RegionOperator rolu
  "region_operator_permissions": {
    // SPATIE-yə ÖTÜRÜLƏCƏK!
    "can_view_surveys": true,
    "can_create_surveys": true,
    "can_edit_surveys": false,      // BƏLİ, seçiv mümkündür!
    "can_delete_surveys": false,
    "can_publish_surveys": false,

    "can_view_tasks": true,
    "can_create_tasks": true,
    "can_edit_tasks": false,
    // ... 25 sahə
  }
}
```

**Nə olur backend-də?**

#### Step 1: User Yaradıldı

```
users cədvəlinə əlavə olundu:
├─ id: 42
├─ username: ali_operator
├─ role_id: 4 (regionoperator)
└─ is_active: true
```

#### Step 2: Spatie Rolu Təyin Edildi

```php
$user->assignRole('regionoperator');  // Kod

result → role_user cədvəlinə əlavə:
├─ user_id: 42
└─ role_id: 4
```

#### Step 3: RegionOperator Səlahiyyətləri Sinkronizasiya Edildi

```php
$this->syncRegionOperatorPermissions($user, $roPermissions);
```

**3A: region_operator_permissions cədvəlinə yazdı:**

```sql
INSERT INTO region_operator_permissions (user_id, ...) VALUES (
  42,  -- ali_operator
  true,   -- can_view_surveys
  true,   -- can_create_surveys
  false,  -- can_edit_surveys
  ...
)
```

**3B: Spatie permissions sinkronizasiya edildi:**

```php
// RegionOperatorPermissionMappingService tərəfindən:
$spatiePermissions = [
  'surveys.read',      // can_view_surveys: true → surveys.read
  'surveys.create',    // can_create_surveys: true → surveys.create
  'tasks.read',        // can_view_tasks: true
  'tasks.create',      // can_create_tasks: true
]

$user->syncPermissions($spatiePermissions);
```

**Final Nəticə:**

```
model_has_permissions cədvəlinə əlavə:
├─ user_id: 42, permission_id: 5 (surveys.read)
├─ user_id: 42, permission_id: 6 (surveys.create)
├─ user_id: 42, permission_id: 15 (tasks.read)
└─ user_id: 42, permission_id: 16 (tasks.create)
```

---

### Ssenariy 2: Başqa RegionOperator-dan Səlahiyyətləri Kopyalayın

**Məsələ:** Ali operatoru var (42 ID), onun səlahiyyətlərini Vəli operatoruna (Yeni) ötürməsi istəyiniz?

**HALDA YOX, ÖZƏLLİKLƏ OLMALIDIR!**

```javascript
// 1. Ali-nin əməl səlahiyyətləri al
GET /api/region-operators/42/permissions
RESPONSE:
{
  "permissions": {
    "can_view_surveys": true,
    "can_create_surveys": true,
    "can_edit_surveys": false,
    ...
  }
}

// 2. Vəliyə AYNI SELAHİYYƏTLƏRİ TƏYİN ET
PUT /api/region-operators/43/permissions {
  "can_view_surveys": true,
  "can_create_surveys": true,
  "can_edit_surveys": false,
  ...
}
```

**Nə olur?**

```
region_operator_permissions:
├─ user_id: 43 (Vəli), can_view_surveys: true ✓
└─ user_id: 43 (Vəli), can_create_surveys: true ✓

model_has_permissions:
├─ user_id: 43, permission_id: 5 (surveys.read) ✓
└─ user_id: 43, permission_id: 6 (surveys.create) ✓
```

---

## 📊 Təhlil: Kodda Necə İşləyir?

### A. USER YARADILARKƏN

**Fayl:** `backend/app/Services/UserCrudService.php`

```php
public function create(array $data): User {
    $user = User::create([...]);  // 1. User yarat

    $role = Role::find($data['role_id']);
    if ($role) {
        $user->assignRole($role->name);  // 2. Spatie rolusunu təyin et

        // 3. ƏGƏR REGIONOPERATOR İSƏ:
        if ($role->name === 'regionoperator' && ! empty($data['region_operator_permissions'])) {
            $this->syncRegionOperatorPermissions($user, $data['region_operator_permissions']);
            //                                    ↑ buraya 25 field gəlir
        }
    }
}
```

### B. SINKRONIZASIYA MEHANI

**Fayl:** `backend/app/Services/UserCrudService.php`

```php
protected function syncRegionOperatorPermissions(User $user, array $roPermissions): void {
    // 1. region_operator_permissions cədvəlinə yazılır
    app(RegionOperatorPermissionService::class)->syncPermissions($user, $roPermissions);

    // 2. Spatie-yə çevrilir və yazılır
    $mappingService = new RegionOperatorPermissionMappingService;
    $spatiePermissions = $mappingService->toSpatiePermissions($roPermissions);
    //                                    ↑
    //                    Çevirmə cədvəli: can_view_surveys → surveys.read

    $user->syncPermissions($spatiePermissions);
}
```

### C. ÇEVIRICI XARTA (MAPPING)

**Fayl:** `backend/app/Services/RegionOperatorPermissionMappingService.php`

```php
public const RO_TO_SPATIE_MAP = [
    'can_view_surveys' => 'surveys.read',
    'can_create_surveys' => 'surveys.create',
    'can_edit_surveys' => 'surveys.update',
    'can_delete_surveys' => 'surveys.delete',
    'can_publish_surveys' => 'surveys.publish',
    // ... 20 daha
];

// İstifadə:
public function toSpatiePermissions(array $roPermissions): array {
    $spatiePermissions = [];
    foreach ($roPermissions as $roPermission => $enabled) {
        if ($enabled === true && isset(self::RO_TO_SPATIE_MAP[$roPermission])) {
            $spatieName = self::RO_TO_SPATIE_MAP[$roPermission];
            $spatiePermissions[] = $spatieName;
        }
    }
    return $spatiePermissions;
}
```

---

## ✅ CAVABLAR - Sizin Suallarınız

### Q1: RegionOperator yaradanda rol və səlahiyyətləri necə təyin edilir?

**A:** 2 mərhələ:

1. **Rol Təyin**: `$user->assignRole('regionoperator')` → Spatie-yə yazılır
2. **Səlahiyyətlər Təyin**: `$user->syncPermissions(['surveys.read', ...])` → Spatie-yə yazılır + RegionOperatorPermission cədvəlinə yazılır

```php
// Kodda:
if ($role->name === 'regionoperator' && ! empty($data['region_operator_permissions'])) {
    $this->syncRegionOperatorPermissions($user, $data['region_operator_permissions']);
}
```

### Q2: Özündə olan səlahiyyətləri başqasına ötürə biləcəkmi?

**A:** **Bəli, ÖZƏLLİKLƏ OLMALIDIR!**

```javascript
// YOXLAMALIDIR:
1. Mənbə RegionOperator-un (A) səlahiyyətlərini AL:
   GET /api/region-operators/{A_ID}/permissions

2. Hədəf RegionOperator-a (B) AYNI SƏLAHIYYƏTLƏRI TƏYİN ET:
   PUT /api/region-operators/{B_ID}/permissions {
     "can_view_surveys": A.can_view_surveys,
     ...
   }
```

**Avtomatik ötürmə (Copy/Inherit):** Hələ heç bir funksiya yoxdur, əl ilə reallaşdırılmalıdır.

### Q3: 3 sistem arasında konflikt var mı?

**A:** **XEYİR, qısqışdırılmayıb!**

- **RegionOperatorPermission** = Verilənlər saxlanması (25 sütun)
- **Spatie Permission** = Rota müdafiyyəsi (middleware)
- **Legacy Role_User** = Silə bilərik (deprecated)

Sistemlər bir-birindən asılı deyildir, əl ilə sinkron edilir.

---

## 🎯 ÖNERİLƏR

### 1. **Bulk Copy Funksiyanı Əlavə Edin**

```php
// Backend: UserCrudService-yə əlavə et
public function copyRegionOperatorPermissions(User $source, User $target): void {
    $sourcePermissions = $source->regionOperatorPermissions;
    $this->syncRegionOperatorPermissions(
        $target,
        $sourcePermissions->only(self::CRUD_FIELDS)->toArray()
    );
}

// Frontend: Button əlavə et
<button onclick="copyPermissions(sourceId, targetId)">
  Səlahiyyətləri Kopyala
</button>
```

### 2. **Permission Templates Yaradın**

```php
// Məsələn:
// Template: "Full Access" → Bütün 25 = true
// Template: "Read Only" → Bütün "view" = true, digərləri false
// Template: "Survey Manager" → Sorğu-ilə-əlaqəlı hər şey = true
```

### 3. **Audit Logging Güçləndir**

```php
// Zaten var (yaxşı!)
Log::channel('audit')->info('RegionOperator permissions updated', [
    'admin_id' => $regionAdmin->id,
    'operator_id' => $user->id,
    'old_permissions' => $oldPermissions,
    'new_permissions' => $newPermissions,
]);
```

### 4. **Legacy `role_user` Cədvəlini Silin**

- **status:** Deprecated, istifadə olunmur
- **Rəsk:** Zəif
- **Tövsiə:** Kiçik migration-da silin

---

## 📚 Texniki Hüngamə

| Əlaqə                 | Cədvəl                        | Məqsəd                                    |
| --------------------- | ----------------------------- | ----------------------------------------- |
| User → Role           | `model_has_roles`             | Spatie: İstifadəçi hansı rola malikdir    |
| Role → Permission     | `role_has_permissions`        | Spatie: Rol hansı səlahiyyətlərə malikdir |
| User → Permission     | `model_has_permissions`       | Spatie: İstifadəçi fərdi səlahiyyətlər    |
| User → Region Op Perm | `region_operator_permissions` | XÜSUSİ: 25 boolean sahə                   |

---

## 🔐 Təhlükəsizlik Nəticəsi

✅ **Arxitektura Sağlamdır:**

- 3 sistem bir-birindən ayrılır (Separation of Concerns)
- Spatie güvenlik məntəqəsi (rota middleware)
- RegionOperator boolean ağır otomatizasiya qabil
- Audit logging aktiv

⚠️ **Rəskli Yerləri:**

1. RegionAdmin A, RegionAdmin B-nin regionu-na giriş edə biləcəkmi? → Yoxlayın `isUserInRegion()`
2. RegionOperator "admin" rol-a yüksəltə biləcəkmi? → Cədvəl validasiyası gərəkdir

---

## 💡 Sözün Qısası

```
Yeni RegionOperator:

1️⃣ USER yaradıldı                    ← users cədvəl
2️⃣ SPATIE rolu təyin edildi          ← role_user cədvəl
3️⃣ 25 SAHƏLİ SƏLAHIYYƏTLƏR YAZILDI   ← region_operator_permissions
4️⃣ SPATIE-YƏ ÇEVIRINTI YAZILDI       ← model_has_permissions

Hər RegionOperator AYRI RƏDİFƏ SAHİB!
```

---

## 🚨 ƏLAVƏ: `role_user` Cədvəlinin DƏQIQ Analizi

### Status: DEFINITIV SILINMƏLI ✅

**Nəticə:** Bəli, `role_user` silinə bilər - **90% güvən**

### Araştırma Faktları

| Məlumat                     | Nəticə                           |
| --------------------------- | -------------------------------- |
| **Cədvəl istifadəsi kodda** | ❌ DEMEK YOXDUR (1 yerdən başqa) |
| **Migration mövcuddur**     | ✅ VAR (2025_07_03)              |
| **Əvəz sistemi aktiv**      | ✅ Spatie `model_has_roles`      |
| **Data köçü tamamlandımı**  | ✅ TƏSBİT ETMƏK LAZIM            |

### SİLİŞ KONTROL SIYAHIŞI

```
Kodda istifadə:
├─ RegionAdminUserController.php (Line 641)
│  └─ Silinərkən sil (backward compat.)
│     → BURADAN SİL: \DB::table('role_user')->where(...)->delete();
│
├─ PermissionController.php (Line 85-91)
│  └─ `role_user` QIRAŞ KULLANILMIYOR
│     → `model_has_roles` istifadə olunur ✅
│
└─ RegionAdminUserService.php (Line 33-35)
   └─ `role_user` ISTIFADƏ EDILMIYOR
      → `model_has_roles` istifadə olunur ✅

NƏTİCƏ: YALNIZ BACKWARD COMPATIBILITY İÇÜN İSTİFADƏ
```

### Tüm Məlumat Köçü Kontrol

```sql
-- Yoxlamaq:
SELECT COUNT(*) FROM role_user;

-- Əgər 0 olarsa:
✅ GÜVƏNLİ SİLİŞ

-- Əgər > 0 olarsa:
⚠️ Əvvəl data migrate et:
INSERT INTO model_has_roles (role_id, model_id, model_type)
SELECT role_id, user_id, 'App\\Models\\User' FROM role_user;

DELETE FROM role_user;
```

### Silinmə Planı (Recommended)

**Faza 1: Kod Yenilənməsi**

```php
// RegionAdminUserController.php (Line 641) - SILIN:
// OLD:
\DB::table('role_user')->where('user_id', $targetUser->id)->delete();

// NEW: (yalnız Spatie istifadə et)
// Silindiyi Nota: role_user deprecated, silindi 2025-12-XX
```

**Faza 2: Migration**

```bash
php artisan make:migration drop_role_user_table
```

```php
// Migration içeriği:
public function up(): void {
    // Data control
    if (DB::table('role_user')->count() > 0) {
        DB::statement("
            INSERT INTO model_has_roles (role_id, model_id, model_type, created_at, updated_at)
            SELECT role_id, user_id, 'App\\\\Models\\\\User', NOW(), NOW() FROM role_user
            ON CONFLICT DO NOTHING
        ");
    }

    Schema::dropIfExists('role_user');
}

public function down(): void {
    Schema::create('role_user', function (Blueprint $table) {
        $table->foreignId('role_id')->constrained('roles')->onDelete('cascade');
        $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
        $table->primary(['role_id', 'user_id']);
    });
}
```

**Faza 3: Test**

```
1. Database: COUNT(*) yoxla
2. User creation: Test et
3. User deletion: Test et
4. Role assignment: Test et
```

---

**Yaradılıb:** 2025-12-11 | **Dil:** Azərbaycanca
