# RegionOperator Səlahiyyətləri - Arquitektura Diaqramı

## 🏗️ SISTEM ARXITEKTURASI

### Səviyyə 1: Cədvəl Əlaqələri (Database Schema)

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE STRUCTURE                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│ users            │
├──────────────────┤
│ id (PK)          │
│ username         │
│ email            │
│ role_id          │───┐
│ institution_id   │   │
│ is_active        │   │
│ ...              │   │
└──────────────────┘   │
         │             │
         │             ▼
         │      ┌──────────────┐
         │      │ roles        │
         │      ├──────────────┤
         │      │ id (PK)      │
         │      │ name         │
         │      │ guard_name   │
         │      │ ...          │
         │      └──────────────┘
         │             ▲
         │             │
         │      ┌──────┴──────────┐
         │      │                 │
         │      ▼                 ▼
         │  ┌─────────────────┐  ┌────────────────────┐
         │  │ role_user       │  │ permission_role    │
         │  │ (DEPRECATED)    │  │                    │
         │  ├─────────────────┤  ├────────────────────┤
         │  │ user_id (FK)    │  │ role_id (FK)       │
         │  │ role_id (FK)    │  │ permission_id (FK) │
         │  └─────────────────┘  └────────────────────┘
         │                               ▲
         │                               │
         │                               ▼
         │                        ┌──────────────────┐
         │                        │ permissions      │
         │                        ├──────────────────┤
         │                        │ id (PK)          │
         │                        │ name             │
         │                        │ guard_name       │
         │                        │ ...              │
         │                        └──────────────────┘
         │                               ▲
         │                               │
         │                        ┌──────┴─────────────┐
         │                        │                    │
         └────────┬───────────────┘                    │
                  │                                    │
                  ▼                                    ▼
         ┌──────────────────────┐         ┌──────────────────────┐
         │ model_has_roles      │         │model_has_permissions │
         │                      │         │                      │
         ├──────────────────────┤         ├──────────────────────┤
         │ model_id (user id)   │         │ model_id (user id)   │
         │ role_id (FK)         │         │ permission_id (FK)   │
         │ model_type           │         │ model_type           │
         └──────────────────────┘         └──────────────────────┘
                  ▲                               ▲
                  │                               │
         ┌────────┴───────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────────┐
    │region_operator_permissions (XÜSUSİ)    │
    ├─────────────────────────────────────────┤
    │ id (PK)                                 │
    │ user_id (FK to users)                   │
    ├─────────────────────────────────────────┤
    │ SORĞULAR:                               │
    │ ├─ can_view_surveys (boolean)          │
    │ ├─ can_create_surveys (boolean)        │
    │ ├─ can_edit_surveys (boolean)          │
    │ ├─ can_delete_surveys (boolean)        │
    │ └─ can_publish_surveys (boolean)       │
    ├─────────────────────────────────────────┤
    │ TAPŞIRIQLAR:                            │
    │ ├─ can_view_tasks (boolean)            │
    │ ├─ can_create_tasks (boolean)          │
    │ ├─ can_edit_tasks (boolean)            │
    │ ├─ can_delete_tasks (boolean)          │
    │ └─ can_assign_tasks (boolean)          │
    ├─────────────────────────────────────────┤
    │ SƏNƏDLƏR:                               │
    │ ├─ can_view_documents (boolean)        │
    │ ├─ can_upload_documents (boolean)      │
    │ ├─ can_edit_documents (boolean)        │
    │ ├─ can_delete_documents (boolean)      │
    │ └─ can_share_documents (boolean)       │
    ├─────────────────────────────────────────┤
    │ QOVLUQLAR:                              │
    │ ├─ can_view_folders (boolean)          │
    │ ├─ can_create_folders (boolean)        │
    │ ├─ can_edit_folders (boolean)          │
    │ ├─ can_delete_folders (boolean)        │
    │ └─ can_manage_folder_access (boolean)  │
    ├─────────────────────────────────────────┤
    │ BAĞLANTILAR:                            │
    │ ├─ can_view_links (boolean)            │
    │ ├─ can_create_links (boolean)          │
    │ ├─ can_edit_links (boolean)            │
    │ ├─ can_delete_links (boolean)          │
    │ └─ can_share_links (boolean)           │
    ├─────────────────────────────────────────┤
    │ DEPRECATED (əvvəl istifadə edilən):    │
    │ ├─ can_manage_surveys (boolean)        │
    │ ├─ can_manage_tasks (boolean)          │
    │ ├─ can_manage_documents (boolean)      │
    │ ├─ can_manage_folders (boolean)        │
    │ └─ can_manage_links (boolean)          │
    ├─────────────────────────────────────────┤
    │ created_at, updated_at                  │
    └─────────────────────────────────────────┘
```

---

### Səviyyə 2: Məlumat Axını (Data Flow)

#### A. RegionOperator Yaradılması

```
FRONTEND
│
│ POST /api/users
│ {
│   "username": "ali_operator",
│   "role_id": 4,
│   "region_operator_permissions": {
│     "can_view_surveys": true,
│     "can_create_surveys": true,
│     ...
│   }
│ }
│
▼

BACKEND: UserCrudService::create()
│
├─ Step 1: USER yaratılır
│  │
│  └─▶ INSERT users (username, role_id, ...)
│     ├─ user.id = 42
│     └─ user.is_active = true
│
├─ Step 2: SPATIE ROLU TƏYİN EDİLİR
│  │
│  └─▶ $user->assignRole('regionoperator')
│     │
│     └─▶ INSERT model_has_roles
│        ├─ model_id = 42
│        ├─ role_id = 4
│        └─ model_type = 'App\Models\User'
│
├─ Step 3: REGION OPERATOR SƏLAHIYYƏTLƏRI SINKRONIZASIYA
│  │
│  └─▶ syncRegionOperatorPermissions($user, $roPermissions)
│     │
│     ├─ 3A: RegionOperatorPermissionService::syncPermissions()
│     │  │
│     │  └─▶ INSERT/UPDATE region_operator_permissions
│     │     ├─ user_id = 42
│     │     ├─ can_view_surveys = true
│     │     ├─ can_create_surveys = true
│     │     └─ ... (25 sütun)
│     │
│     └─ 3B: RegionOperatorPermissionMappingService::toSpatiePermissions()
│        │
│        └─▶ ['can_view_surveys', 'can_create_surveys'] → ['surveys.read', 'surveys.create']
│           │
│           └─▶ $user->syncPermissions(['surveys.read', 'surveys.create'])
│              │
│              └─▶ INSERT model_has_permissions
│                 ├─ model_id = 42, permission_id = 5 (surveys.read)
│                 └─ model_id = 42, permission_id = 6 (surveys.create)
│
└─ Step 4: AKTIBNOST QEYDIYYATI
   │
   └─▶ ActivityLog & SecurityEvent
      └─ "RegionOperator Ali yaradıldı, 25 səlahiyyət təyin edildi"

RESPONSE
│
└─▶ 201 Created
   {
     "id": 42,
     "username": "ali_operator",
     "role": "regionoperator",
     "region_operator_permissions": {
       "can_view_surveys": true,
       ...
     }
   }
```

---

#### B. RegionOperator Səlahiyyətlərinin Yenilənməsi

```
FRONTEND
│
│ PUT /api/region-operators/42/permissions
│ {
│   "can_view_surveys": true,
│   "can_edit_surveys": false,    ← DƏYIŞTI!
│   ...
│ }
│
▼

BACKEND: RegionOperatorPermissionController::update()
│
├─ Validasiya
│  ├─ RegionAdmin mi? ✓
│  ├─ Target RegionOperator mı? ✓
│  └─ Eyni regionda mı? ✓
│
├─ Step 1: region_operator_permissions GÜNCƏLLƏNDI
│  │
│  └─▶ UPDATE region_operator_permissions
│     ├─ WHERE user_id = 42
│     ├─ SET can_view_surveys = true
│     ├─ SET can_edit_surveys = false   ← DƏYIŞTI!
│     └─ ... (digər sahələr)
│
├─ Step 2: Spatie permissions SINKRONIZASIYA
│  │
│  └─▶ syncToSpatiePermissions($user, $validated)
│     │
│     └─▶ toSpatiePermissions() → ['surveys.read', 'tasks.read', ...]
│        │
│        └─▶ $user->syncPermissions([...])  ← ÖNCƏKİ ÖZÜ SİLİNDİ
│           │
│           └─▶ DELETE model_has_permissions WHERE user_id = 42
│              │
│              └─▶ INSERT NEW model_has_permissions rows
│                 └─ Yalnız seçilmiş səlahiyyətlər
│
├─ Step 3: AUDIT LOG
│  │
│  └─▶ Log::channel('audit')->info('RegionOperator CRUD permissions updated', [
│     ├─ admin_id, operator_id,
│     ├─ old_permissions: {...},
│     ├─ new_permissions: {...},
│     ├─ changes: ['can_edit_surveys' => false]
│     └─ ...
│  ])
│
└─ RESPONSE
   │
   └─▶ 200 OK
      {
        "message": "Səlahiyyətlər yeniləndi",
        "permissions": {...},
        "changes_count": 1
      }
```

---

#### C. RegionOperator Səlahiyyətlərini Kopyalama

```
FRONTEND
│
│ POST /api/region-operators/42/permissions/copy-from/10
│ Əli (42) ← Vəli (10)
│
▼

BACKEND: RegionOperatorPermissionController::copyFromOperator()
│
├─ Validasiya (3 səviyyə)
│  ├─ RegionAdmin mi? ✓
│  ├─ Source (10) regionoperator mı? ✓
│  ├─ Target (42) regionoperator mı? ✓
│  ├─ İkisi də eyni regionda mı? ✓
│  └─ Source-unda əməl səlahiyyətləri var mı? ✓
│
├─ Step 1: Mənbənin (Vəli-10) səlahiyyətləri AL
│  │
│  └─▶ SELECT * FROM region_operator_permissions WHERE user_id = 10
│     └─▶ Array: {
│        "can_view_surveys": true,
│        "can_create_surveys": true,
│        "can_edit_surveys": false,
│        ...
│     }
│
├─ Step 2: copyRegionOperatorPermissions() ÇAĞIR
│  │
│  └─▶ UserCrudService::copyRegionOperatorPermissions(
│     ├─ $sourceUser = User(10),
│     ├─ $targetUser = User(42),
│     └─ $regionAdmin = User(authenticated)
│  )
│
├─ Step 3: Target-ə Səlahiyyətlər SINKRONIZASIYA
│  │
│  └─▶ syncRegionOperatorPermissions($targetUser, $permissions)
│     │
│     ├─ 3A: region_operator_permissions GÜNCƏLLƏNDI
│     │  │
│     │  └─▶ UPDATE region_operator_permissions
│     │     ├─ WHERE user_id = 42
│     │     └─ SET (can_view_surveys=true, can_create_surveys=true, ...)
│     │
│     └─ 3B: Spatie permissions SINKRONIZASIYA
│        │
│        └─▶ DELETE model_has_permissions WHERE user_id = 42
│           │
│           └─▶ INSERT NEW (ən yaxşı: 9 səlahiyyət COPY-dan)
│              ├─ surveys.read, surveys.create
│              ├─ tasks.read, tasks.create
│              └─ ... (digərlər)
│
├─ Step 4: AUDIT LOG
│  │
│  └─▶ SecurityEvent::logEvent([
│     ├─ event_type: 'regionoperator_permissions_copied',
│     ├─ source_user_id: 10,
│     ├─ target_user_id: 42,
│     ├─ admin_id: <regionadmin>,
│     ├─ permissions_copied: 9,
│     └─ timestamp: now()
│  ])
│
└─ RESPONSE
   │
   └─▶ 200 OK
      {
        "message": "Səlahiyyətlər kopyalandı",
        "from": { "id": 10, "username": "veli_operator" },
        "to": { "id": 42, "username": "ali_operator" },
        "permissions": {
          "can_view_surveys": true,
          ...
        }
      }
```

---

### Səviyyə 3: Middleware/Authorization Axını

```
USER REQUEST
│
│ GET /api/surveys (Əli, regionoperator, 42 ID)
│
▼

LARAVEL MIDDLEWARE
│
├─ sanctum:api ✓
│  └─ Token yoxlandı
│
├─ permission:surveys.read  ← VŖ BURADA!
│  │
│  ├─ Step 1: User Əli-nin (42) Spatie permissions-ı AL
│  │  │
│  │  └─▶ Əli model_has_permissions-də?
│  │     ├─ user_id: 42
│  │     ├─ permission_id: 5 (surveys.read) ✓ TAPILDI!
│  │     └─ model_type: 'App\Models\User'
│  │
│  ├─ Step 2: 'surveys.read' ARAŞDIR
│  │  │
│  │  └─▶ Əli-nin BÜTÜN permissions siyahısında?
│  │     └─ ['surveys.read', 'surveys.create', 'tasks.read', ...] ✓ BƏLİ!
│  │
│  └─ ✓ MIDDLEWARE KEÇDI
│
├─ RegionOperator-specific permission check (əgər varsa)
│  │
│  ├─ Step 1: region_operator_permissions AL
│  │  │
│  │  └─▶ SELECT * FROM region_operator_permissions WHERE user_id = 42
│  │     ├─ can_view_surveys: true ✓
│  │
│  └─ ✓ İCINƏ BURAXILDI
│
└─ ✓ CONTROLLER ICRASINA BURAXILDI

CONTROLLER
│
└─▶ SurveyController::index()
   └─▶ 200 OK - Surveys list
```

---

### Səviyyə 4: Modeldən Cədvələ Ayrıntılı Veri

```
┌─────────────────────────────────────────┐
│ User Model (eloquent relationship)      │
├─────────────────────────────────────────┤
│                                         │
│ public function roles()                 │
│   hasMany through Model_Has_Roles       │
│   ↓                                     │
│   Returns: Collection<Role>             │
│   ├─ Role::find(4) = RegionOperator    │
│   └─ permissions() → Collection         │
│      ├─ surveys.read                    │
│      ├─ surveys.create                  │
│      └─ ...                             │
│                                         │
│ public function regionOperatorPermissions()
│   hasOne → RegionOperatorPermission    │
│   ↓                                     │
│   Returns: RegionOperatorPermission     │
│   ├─ can_view_surveys: true            │
│   ├─ can_create_surveys: true          │
│   └─ ... (25 sütun)                    │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔄 CYCLE: Yaşam Döngüsü

```
┌──────────────────┐
│ RegionOperator   │
│ Yaradılması      │
└────────┬─────────┘
         │
         ├─ user create
         ├─ role assign (spatie)
         ├─ 25 permission fields set
         └─ spatie permissions sync

             ↓

┌──────────────────┐
│ Gündəlik        │
│ Istifadə        │
└────────┬─────────┘
         │
         ├─ User login
         ├─ Middleware check:
         │  ├─ Spatie permissions
         │  ├─ Region_operator_permissions
         │  └─ Institution hierarchy
         └─ Feature access grants

             ↓

┌──────────────────┐
│ Səlahiyyət      │
│ Redaksiyon      │
└────────┬─────────┘
         │
         ├─ RegionAdmin edit
         ├─ 25 fields update
         ├─ region_operator_permissions update
         ├─ spatie permissions re-sync
         └─ audit log

             ↓

┌──────────────────┐
│ Səlahiyyət      │
│ Kopyalama       │
└────────┬─────────┘
         │
         ├─ Select source operator
         ├─ Copy 25 fields
         ├─ Sync to target
         └─ audit log

             ↓

┌──────────────────┐
│ Silindi         │
│ / Deaktiv       │
└────────┬─────────┘
         │
         ├─ Soft delete user
         ├─ Cascade delete:
         │  └─ region_operator_permissions
         └─ Keep spatie records (archive)
```

---

## 📊 3 Sistem Miqyası (Scale)

```
SİSTEM 1: SPATIE PERMISSION (Global)
├─ Ölçü: ~50-100 permission record
├─ Istifadə: Role-based general framework
├─ Performance: O(1) - indexed query
└─ Misal: "surveys.read", "tasks.create"

SİSTEM 2: REGION_OPERATOR_PERMISSIONS (Xüsusi)
├─ Ölçü: 1 record × N regionoperators
├─ Istifadə: RegionOperator granular control
├─ Performance: O(1) - single user lookup
└─ Misal: 25 boolean sahə per operator

SİSTEM 3: ROLE_USER (Deprecated - sil)
├─ Ölçü: Keep for backward compatibility
├─ Istifadə: NONE - replaced by Spatie
├─ Performance: Unused
└─ Status: REMOVE in future
```

---

## 🎯 Məqsəd-Sistem Əlaqəsi

```
┌─────────────────────────────────────────────┐
│ REGIONOPERATOR ROLE CREATION GOAL           │
├─────────────────────────────────────────────┤
│                                             │
│ "RegionAdmin istənilən RegionOperator      │
│  yarada, 25 səlahiyyət təyin və kopyala"   │
│                                             │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼

    System 1:   System 2:    System 3:
    Spatie      Region Op    Deprecated
    (Auth)      (Granular)   (Legacy)

    ├─ Role     ├─ 25 CRUD   ├─ XÖ SİLİN
    ├─ Global   │   Fields   │
    │  Perms    ├─ Bool      │
    ├─ Route    │   Storage  │
    │  Protect  ├─ Quick     │
    │           │   Lookup   │
    └─ Base     │           │
       Auth     └─ Custom   │
                  Rules    │

    ↓           ↓           ↓

    ═══════════════════════════════════

    All 3 synced when:
    ✓ Create RegionOperator
    ✓ Update Permissions
    ✓ Copy Permissions
    ✓ Delete RegionOperator
```

---

## 💾 Data Persistence Example

```
Scenario: Ali operatorunun yaradılması

╔══════════════════════════════════════════════════════════════╗
║ USERS TABLE                                                  ║
╠══════════════════════════════════════════════════════════════╣
║ id │ username        │ role_id │ institution_id │ is_active  ║
╠════╪═════════════════╪═════════╪════════════════╪════════════╣
║ 42 │ ali_operator    │   4     │      12        │    true    ║
╚════╧═════════════════╧═════════╧════════════════╧════════════╝

╔════════════════════════════════════════════════════════════════╗
║ MODEL_HAS_ROLES (Spatie)                                       ║
╠════════════════════════════════════════════════════════════════╣
║ model_id │ role_id │ model_type                               ║
╠══════════╪═════════╪══════════════════════════════════════════╣
║ 42       │   4     │ App\Models\User                          ║
╚══════════╧═════════╧══════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════╗
║ REGION_OPERATOR_PERMISSIONS TABLE                                        ║
╠══════════════════════════════════════════════════════════════════════════╣
║ user_id │ can_view_surveys │ can_create_surveys │ ... │ can_share_links ║
╠═════════╪══════════════════╪════════════════════╪═════╪═════════════════╣
║ 42      │     true         │      true          │ ... │    false        ║
╚═════════╧══════════════════╧════════════════════╧═════╧═════════════════╝

╔═════════════════════════════════════════════════════════════════╗
║ MODEL_HAS_PERMISSIONS (Spatie)                                 ║
╠═════════════════════════════════════════════════════════════════╣
║ model_id │ permission_id │ model_type                          ║
╠══════════╪═══════════════╪══════════════════════════════════════╣
║ 42       │      5        │ App\Models\User  (surveys.read)      ║
║ 42       │      6        │ App\Models\User  (surveys.create)    ║
║ 42       │     15        │ App\Models\User  (tasks.read)        ║
║ 42       │     16        │ App\Models\User  (tasks.create)      ║
║ ...      │     ...       │ ...                                 ║
╚══════════╧═══════════════╧══════════════════════════════════════╝
```

---

**Diaqram Yaradılıb:** 2025-12-11  
**Dil:** Azərbaycanca  
**Məqsəd:** Sistemə cəld başa düşmə
