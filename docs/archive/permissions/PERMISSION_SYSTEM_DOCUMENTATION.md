# 🔐 ATİS SƏLAHIYYƏT SISTEMI - TAM SƏNƏDLƏŞDIRMƏ

**Tarix**: 2025-12-24
**Versiya**: 1.0
**Status**: Production Active (368 users, 361 institutions)

---

## 📊 SİSTEM STATİSTİKASI

### Ümumi Məlumatlar
- **Permission sayı**: 216 səlahiyyət
- **Rol sayı**: 10 sistem rolu
- **Aktiv istifadəçilər**: 368
- **Guard**: `sanctum` (API-based authentication)
- **Paket**: Spatie Laravel Permission v6.20

### Rol Paylanması
| Rol | Level | Səlahiyyət Sayı | İstifadəçi Sayı |
|-----|-------|-----------------|-----------------|
| Super Administrator | 1 | 198 | 1 |
| Regional Administrator | 2 | 115 | 2 |
| Regional Operator | 3 | 8 | 2 |
| Sector Administrator | 4 | 44 | 6 |
| School Administrator | 5 | 59 | 351 |
| Müavin (Dərs İdarəetməsi) | 6 | 31 | 0 |
| Tədris-Bilimlər Referenti | 6 | 20 | 0 |
| Təsərrüfat Müdiri | 6 | 18 | 0 |
| Məktəb Psixoloquu | 6 | 19 | 0 |
| Fənn Müəllimi | 7 | 26 | 3 |

### Kateqoriya Paylanması
| Kateqoriya | Permission Sayı |
|------------|-----------------|
| teachers | 23 |
| psychology | 17 |
| students | 17 |
| academic | 16 |
| documents | 16 |
| classes | 14 |
| surveys | 14 |
| approvals | 14 |
| assessments | 12 |
| events | 10 |
| tasks | 10 |
| users | 9 |
| inventory | 9 |
| institutions | 8 |
| subjects | 6 |
| rooms | 6 |
| departments | 6 |
| reports | 4 |
| roles | 4 |
| system | 1 |

---

## 🏗️ ARXİTEKTURA

### Database Strukturu

#### `permissions` Cədvəli
```sql
- id (bigint, PK)
- name (varchar 191) - Unikal permission adı
- guard_name (varchar 191) - 'sanctum'
- display_name (varchar 191) - Göstəriş adı
- category (varchar 191) - Kateqoriya (assessments, users, etc.)
- resource (varchar 191) - Resource adı
- action (varchar 191) - Action (view, create, edit, delete)
- description (text) - Təsvir
- department (varchar 191) - Department məhdudiyyəti
- is_active (boolean, default: true) - Aktiv/Qeyri-aktiv
- created_at, updated_at (timestamp)
```

#### `roles` Cədvəli
```sql
- id (bigint, PK)
- name (varchar 191) - Unikal rol adı
- guard_name (varchar 191) - 'sanctum'
- display_name (varchar 191) - Göstəriş adı
- level (integer) - Ierarxiya səviyyəsi (1-10)
- department_access (json) - Department access rules
- description (text) - Təsvir
- max_institutions (integer) - Max müəssisə sayı
- is_active (boolean, default: true)
- role_category (varchar) - 'system' | 'custom'
- created_by_user_id (bigint, FK to users)
- hierarchy_scope (json) - Hierarchy məhdudiyyətləri
- can_create_roles_below_level (integer)
- max_institutions_scope (integer)
- department_access_rules (json)
- system_metadata (json)
- parent_role (varchar 191) - Parent rol adı
- created_at, updated_at (timestamp)
```

#### Pivot Cədvəllər
- `permission_role` - Role-permission əlaqələri
- `model_has_permissions` - Direct user permissions
- `model_has_roles` - User-role assignments
- `role_user` - User-role pivot (custom)

---

## 📁 BACKEND FAYLLARI (Prioritet sırasıyla)

### 🔴 KRİTİK ƏSAS FAYLLAR

#### 1. Permission Model & Controller
**Fayl**: `backend/app/Models/Permission.php`
- Spatie Permission modelini extend edir
- Custom scopes və relations
- Permission metadata

**Fayl**: `backend/app/Http/Controllers/PermissionController.php`
- Permission CRUD əməliyyatları
- Permission filterleme
- Permission statistics

#### 2. Role Model & Controller
**Fayl**: `backend/app/Models/Role.php`
- Spatie Role modelini extend edir
- Hierarchy logic
- Level-based filtering

**Fayl**: `backend/app/Http/Controllers/RoleController.php`
- Role CRUD
- Role-permission syncing
- Hierarchy validation

#### 3. User Model
**Fayl**: `backend/app/Models/User.php`
- HasRoles trait (Spatie)
- Custom permission checks
- Multi-role support
- Institution-based filtering

### 🟠 XİDMƏT LAYERI (Services)

#### Permission Services
1. **`backend/app/Services/PermissionCheckService.php`**
   - Runtime permission checking
   - Context-aware validation
   - Cache integration

2. **`backend/app/Services/PermissionValidationService.php`**
   - Permission validation rules
   - Hierarchy-aware checks
   - Department access validation

3. **`backend/app/Services/UserPermissionService.php`**
   - User permission management
   - Permission inheritance
   - Direct permission assignment

4. **`backend/app/Services/RegionOperatorPermissionService.php`**
   - RegionOperator-specific permissions
   - CRUD permission mapping
   - Region-level filtering

5. **`backend/app/Services/RoleHierarchyService.php`**
   - Role hierarchy logic
   - Level-based access
   - Parent-child relationships

#### Specialized Permission Services
6. **`backend/app/Services/DocumentPermissionService.php`**
   - Document access control
   - Folder permissions
   - Regional document sharing

7. **`backend/app/Services/TaskPermissionService.php`**
   - Task assignment permissions
   - Origin scope validation
   - Delegation rules

8. **`backend/app/Services/SchedulePermissionService.php`**
   - Schedule access control
   - Teaching load permissions

9. **`backend/app/Services/ClassPermissionService.php`**
   - Class-level permissions
   - Teacher-class assignments

### 🟡 MİDDLEWARE & TRAITS

#### 1. Permission Middleware
**Fayl**: `backend/app/Http/Middleware/PermissionMiddleware.php`
- Route-level permission enforcement
- Role-based access control
- Automatic permission checking

#### 2. Authorization Trait
**Fayl**: `backend/app/Http/Traits/HasAuthorization.php`
- Reusable authorization methods
- Controller-level helpers
- Permission shortcuts

### 🟢 KONFİQURASİYA FAYLARI

1. **`backend/config/permission.php`**
   - Spatie package config
   - Cache settings
   - Table names

2. **`backend/config/permissions.php`**
   - Custom permission definitions
   - Permission categories
   - Permission metadata

3. **`backend/config/assignable_permissions.php`**
   - Assignable permission rules
   - Role-specific permissions
   - Department restrictions

### 🔵 MİGRATİONLAR

**Əsas Migrationlar**:
1. `2025_07_03_040000_create_permission_tables.php` - Spatie base tables
2. `2025_07_03_160707_add_custom_columns_to_permissions_table.php` - Custom fields
3. `2025_07_08_063237_update_permissions_table_structure.php` - Structure updates
4. `2025_10_24_100000_create_region_operator_permissions_table.php` - RegionOperator
5. `2025_11_04_065151_expand_region_operator_permissions_to_crud.php` - CRUD expansion
6. `2025_11_16_191012_populate_permissions_category_resource_action.php` - Metadata
7. `2025_12_22_120000_ensure_region_operators_can_view_surveys.php` - Survey permissions
8. `2026_01_05_120000_backfill_region_operator_crud_permissions.php` - Backfill

### 🟣 SEEDERLƏR

1. **`backend/database/seeders/PermissionSeeder.php`**
   - 216 permission yaradır
   - Category assignment
   - Resource/action mapping

2. **`backend/database/seeders/RoleSeeder.php`**
   - 10 sistem rolu yaradır
   - Hierarchy setup
   - Level assignment

3. **`backend/database/seeders/SuperAdminSeeder.php`**
   - SuperAdmin user yaradır
   - Full permissions assignment

### 🔶 POLİCİES

**Fayl**: `backend/app/Policies/GradePolicy.php`
- Model-level authorization
- Laravel policy pattern
- Custom authorization logic

### 🔷 REQUEST VALİDATİONLAR

Permission-aware request validations:
1. `backend/app/Http/Requests/StoreUserRequest.php` - User creation validation
2. `backend/app/Http/Requests/UpdateUserRequest.php` - User update validation
3. `backend/app/Http/Requests/Grade/StoreGradeRequest.php` - Grade authorization

---

## 📱 FRONTEND FAYLLARI

### 🔴 ƏSAS KOMPONENTLƏR

#### 1. Permission Gate System
**Fayl**: `frontend/src/components/common/PermissionGate.tsx`
- Declarative permission checking
- Component-level access control
- Children rendering based on permissions

**Fayl**: `frontend/src/components/common/PermissionGate.helpers.tsx`
- Helper functions
- Permission evaluation logic

**Fayl**: `frontend/src/components/common/usePermissionGate.ts`
- React hook for permission checking
- Memoized permission checks

#### 2. Role Protection
**Fayl**: `frontend/src/components/auth/RoleProtectedRoute.tsx`
- Route-level protection
- Role-based navigation guards
- Redirect logic

#### 3. Debug Tools
**Fayl**: `frontend/src/components/debug/PermissionDebugPanel.tsx`
- Development-time permission debugging
- Visual permission inspector
- Real-time permission checking

**Fayl**: `frontend/src/components/debug/EnhancedDebugPanel.tsx`
- Comprehensive debug panel
- Permission + role visualization

### 🟠 PERMISSION UI KOMPONENTLƏR

#### 1. Permission Management Page
**Fayl**: `frontend/src/pages/Permissions.tsx`
- Permission listing
- Permission search/filter
- Permission CRUD operations
- SuperAdmin-only access

**Fayl**: `frontend/src/components/modals/PermissionDetailModal.tsx`
- Permission detail view
- Usage statistics
- Permission metadata editor

#### 2. Role Management
**Fayl**: `frontend/src/pages/Roles.tsx`
- Role listing
- Role-permission matrix

**Fayl**: `frontend/src/components/modals/RoleModal.tsx`
- Role CRUD modal
- Permission assignment interface

#### 3. User Permission Management
**Fayl**: `frontend/src/components/modals/UserModal/components/PermissionMatrix.tsx`
- User permission assignment
- Matrix-based UI
- Visual permission toggling

**Fayl**: `frontend/src/components/modals/UserModal/components/PermissionMatrixMinimalist.tsx`
- Simplified permission matrix
- Category-based grouping

**Fayl**: `frontend/src/components/modals/UserModal/components/PermissionAssignmentPanel.tsx`
- Dedicated permission assignment panel
- Role-based suggestions

**Fayl**: `frontend/src/components/modals/UserModal/components/PermissionDiffPreview.tsx`
- Permission change preview
- Before/after comparison
- Impact analysis

#### 4. Region Operator Permissions
**Fayl**: `frontend/src/components/regionadmin/RegionOperatorPermissionsModal.tsx`
- Region-specific permissions
- CRUD permission toggling
- Institution-scoped permissions

**Fayl**: `frontend/src/components/modals/UserModal/components/RegionOperatorTab.tsx`
- RegionOperator tab in user modal
- Permission configuration UI

### 🟡 HOOKS

#### Permission Hooks
1. **`frontend/src/hooks/useRoleCheck.ts`**
   - Role-based conditional rendering
   - Multiple role checking
   - Memoized checks

2. **`frontend/src/hooks/usePermissionDiff.ts`**
   - Permission change detection
   - Diff calculation
   - Change preview

3. **`frontend/src/hooks/usePermissionMetadata.ts`**
   - Permission metadata fetching
   - Category/resource mapping

4. **`frontend/src/hooks/useModuleAccess.ts`**
   - Module-level access control
   - Feature flag integration

5. **`frontend/src/hooks/tasks/useTaskPermissions.ts`**
   - Task-specific permission logic
   - Assignment permissions

#### Resource Hooks
6. **`frontend/src/hooks/resources/useResourceScope.ts`**
   - Resource access scoping
   - Institution-based filtering

### 🟢 SERVİSLƏR

#### 1. Permission Service
**Fayl**: `frontend/src/services/permissions.ts`
- API calls for permissions
- Permission CRUD
- Permission statistics

#### 2. Role Service
**Fayl**: `frontend/src/services/roles.ts`
- Role API calls
- Role-permission syncing

#### 3. Region Operator Permission Service
**Fayl**: `frontend/src/services/regionOperatorPermissions.ts`
- RegionOperator permission API
- CRUD permission management

#### 4. Auth Service
**Fayl**: `frontend/src/services/auth.ts`
- Login/logout
- **Current user permissions loading**
- Token management

#### 5. Base Service
**Fayl**: `frontend/src/services/BaseService.ts`
- Base API service
- Permission-aware requests
- Error handling

### 🔵 UTİLİTİLƏR

#### 1. Permission Utils
**Fayl**: `frontend/src/utils/permissions.ts`
- Permission checking utilities
- hasPermission() function
- hasAnyPermission() function
- hasAllPermissions() function

**Fayl**: `frontend/src/utils/permissions/moduleAccess.ts`
- Module access checking
- Feature-based permissions

#### 2. Role Utils
**Fayl**: `frontend/src/utils/roleUtils.ts`
- Role hierarchy utilities
- Level comparison
- Role inheritance

#### 3. Debug Helpers
**Fayl**: `frontend/src/utils/debugHelpers.ts`
- Debug mode detection
- Permission logging

### 🟣 CONTEXT

#### Auth Context
**Fayl**: `frontend/src/contexts/AuthContextOptimized.tsx`
- Global auth state
- **User permissions state**
- **Roles state**
- Permission checking functions
- Real-time permission updates

#### Debug Context
**Fayl**: `frontend/src/contexts/DebugContext.tsx`
- Debug mode state
- Permission debug logging

### 🔶 TİPLƏR

#### 1. Permission Types
**Fayl**: `frontend/src/types/permissions.ts`
```typescript
interface Permission {
  id: number;
  name: string;
  display_name: string | null;
  description: string | null;
  guard_name: string;
  category: string | null;
  resource: string | null;
  action: string | null;
  is_active: boolean;
  department: string | null;
  created_at: string;
  updated_at: string;
}
```

#### 2. User Types
**Fayl**: `frontend/src/types/user.ts`
```typescript
interface User {
  id: number;
  email: string;
  roles: Role[];
  permissions: Permission[]; // Direct permissions
  all_permissions: string[]; // Combined (role + direct)
  institution_id: number | null;
  // ...
}
```

#### 3. Role Types
**Fayl**: `frontend/src/types/index.ts`
```typescript
interface Role {
  id: number;
  name: string;
  display_name: string | null;
  level: number;
  permissions: Permission[];
  is_active: boolean;
  // ...
}
```

### 🔷 NAVİQASİYA

**Fayl**: `frontend/src/config/navigation.ts`
- Menu structure
- **Permission-based menu items**
- Role-based visibility

**Fayl**: `frontend/src/components/layout/sidebar/menuStructure.ts`
- Sidebar menu
- Dynamic menu based on permissions

---

## 🔄 PERMISSION FLOW

### 1. Backend Authentication Flow
```
Request → Middleware → PermissionMiddleware
  ↓
  → Check user role & permissions
  ↓
  → Authorize controller action
  ↓
  → Service layer (additional checks)
  ↓
  → Model policy (if applicable)
  ↓
  → Response
```

### 2. Frontend Permission Check Flow
```
Component → PermissionGate / useRoleCheck
  ↓
  → AuthContext (user.all_permissions)
  ↓
  → hasPermission() utility
  ↓
  → Render decision (show/hide)
```

### 3. Permission Loading Flow
```
Login → AuthService.login()
  ↓
  → Backend returns user with roles & permissions
  ↓
  → AuthContext stores user state
  ↓
  → All components can access via useAuth()
  ↓
  → Real-time updates on role/permission change
```

---

## 🎯 PERMİSSİON CHECK METHODLARI

### Backend (Laravel)

#### 1. Middleware-based
```php
// In routes/api.php
Route::middleware(['permission:users.view'])->group(function () {
    Route::get('/users', [UserController::class, 'index']);
});
```

#### 2. Controller-based
```php
// In controller
$this->authorize('users.view');

// Or
if (!auth()->user()->can('users.view')) {
    abort(403);
}
```

#### 3. Model-based (Policy)
```php
// In policy
public function view(User $user, Grade $grade)
{
    return $user->can('grades.view');
}
```

#### 4. Service-based
```php
// In service
if (!$this->permissionCheckService->canViewUsers($user)) {
    throw new UnauthorizedException();
}
```

### Frontend (React)

#### 1. Component-based
```tsx
<PermissionGate permission="users.view">
  <UserList />
</PermissionGate>
```

#### 2. Hook-based
```tsx
const { hasPermission } = useAuth();

if (hasPermission('users.view')) {
  return <UserList />;
}
```

#### 3. Role-based
```tsx
const { hasRole } = useRoleCheck();

if (hasRole(['superadmin', 'regionadmin'])) {
  return <AdminPanel />;
}
```

#### 4. Route-based
```tsx
<RoleProtectedRoute allowedRoles={['superadmin']}>
  <PermissionManagement />
</RoleProtectedRoute>
```

---

## 🚀 GELİŞDİRMƏ REHBƏRİ

### Yeni Permission Əlavə Etmək

#### Backend
1. `PermissionSeeder.php`-ə əlavə et:
```php
Permission::create([
    'name' => 'new_module.view',
    'guard_name' => 'sanctum',
    'display_name' => 'View New Module',
    'category' => 'new_module',
    'resource' => 'new_module',
    'action' => 'view',
    'description' => 'Can view new module',
    'is_active' => true,
]);
```

2. Seed et:
```bash
docker exec atis_backend php artisan db:seed --class=PermissionSeeder
```

3. Role-a assign et:
```bash
docker exec atis_backend php artisan tinker
$role = Role::findByName('superadmin');
$role->givePermissionTo('new_module.view');
```

#### Frontend
1. Type definition yenilə (`frontend/src/types/permissions.ts`)
2. Permission check əlavə et:
```tsx
<PermissionGate permission="new_module.view">
  <NewModule />
</PermissionGate>
```

### Yeni Rol Yaratmak

#### Backend
1. `RoleSeeder.php`-ə əlavə et:
```php
$newRole = Role::create([
    'name' => 'new_role',
    'guard_name' => 'sanctum',
    'display_name' => 'New Role',
    'level' => 8,
    'is_active' => true,
    'role_category' => 'system',
]);

$newRole->givePermissionTo([
    'users.view',
    'institutions.view',
    // ...
]);
```

2. Seed et:
```bash
docker exec atis_backend php artisan db:seed --class=RoleSeeder
```

---

## 🐛 DEBUG & TROUBLESHOOTİNG

### Backend Debugging

#### 1. Permission Cache Təmizləmə
```bash
docker exec atis_backend php artisan permission:cache-reset
docker exec atis_backend php artisan cache:clear
```

#### 2. Permission Yoxlama
```bash
docker exec atis_backend php artisan tinker
$user = User::find(1);
$user->permissions; // Direct permissions
$user->roles; // Assigned roles
$user->getAllPermissions(); // All permissions (role + direct)
$user->can('users.view'); // Check specific permission
```

#### 3. Telescope Monitoring
- URL: `http://localhost:8000/telescope`
- Authorization tab: permission checks
- Queries tab: permission-related queries

### Frontend Debugging

#### 1. Debug Panel
- `Ctrl + Shift + D` - Toggle debug panel
- Permission tab - view current user permissions
- Role tab - view current user roles

#### 2. Console Logging
```typescript
import { debugLog } from '@/utils/debugHelpers';

debugLog('permissions', 'Checking permission:', 'users.view');
```

#### 3. AuthContext Inspection
```tsx
const { user } = useAuth();
console.log('User permissions:', user?.all_permissions);
console.log('User roles:', user?.roles);
```

---

## ⚠️ MƏLUM PROBLEMLƏr

### 1. Permission Cache Problemi
**Problem**: Permission dəyişikliyi real-time görünmür
**Həll**:
```bash
docker exec atis_backend php artisan permission:cache-reset
```

### 2. RegionOperator Permission Sync
**Problem**: RegionOperator permission-lar uyğun gəlmir
**Həll**: `region_operator_permissions` cədvəlini yoxla, resync et

### 3. Frontend Permission State
**Problem**: Login sonrası permissions yüklənmir
**Həll**: `AuthContextOptimized.tsx`-də `/api/auth/me` response-u yoxla

---

## 📈 TƏKMİLLƏŞDİRMƏ PLANI

### Prioritet 1 (Kritik)
- [ ] Permission scope sütunu əlavə etmək (global, system, regional, sector, institution, classroom)
- [ ] Permission group/module sistemi (nested permissions)
- [ ] Real-time permission update (WebSocket/Pusher)
- [ ] Permission audit log (kim, nə vaxt, hansı permission-ı dəyişdi)

### Prioritet 2 (Vacib)
- [ ] Permission template system (predefined permission sets)
- [ ] Permission import/export (Excel)
- [ ] Permission dependency system (view requires list, edit requires view)
- [ ] Permission expiry (time-based permissions)

### Prioritet 3 (Gələcək)
- [ ] Permission analytics (ən çox istifadə olunan, heç istifadə olunmayan)
- [ ] Permission recommendation engine (AI-based)
- [ ] Permission inheritance visualization (graph view)
- [ ] Multi-tenant permission isolation

---

## 📚 FAYDALANILAN RESURLAR

- [Spatie Laravel Permission Docs](https://spatie.be/docs/laravel-permission)
- [Laravel Authorization Docs](https://laravel.com/docs/11.x/authorization)
- [React Context API](https://react.dev/reference/react/useContext)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Son yenilənmə**: 2025-12-24
**Müəllif**: Claude Code
**Status**: ✅ Production-Ready
