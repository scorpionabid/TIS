# ATİS Permission & Authorization Guide

**Məqsəd**: Hər səhifənin permission strukturunu izah etmək - Claude kod yazarkən BU FAYLDƏN istifadə etməlidir.

## 🎯 ƏSAS QAYDALAR

### 1. Permission Naming Convention
```
{resource}.{action}

Nümunələr:
- user.create
- user.edit
- user.delete
- user.view
- survey.create
- survey.edit.own
- survey.view.all
```

### 2. Role Hierarchy (10 rol, 1=ən yüksək)
```
Level 1: superadmin      — bütün səlahiyyətlər
Level 2: regionadmin     — region səviyyəsi idarəetmə
Level 3: regionoperator  — region əməliyyatçısı
Level 4: sektoradmin     — sektor idarəetmə
Level 5: schooladmin     — məktəb idarəetmə
Level 6: müəllim         — müəllim (əsas)
Level 6: muavin          — müavin direktor
Level 6: ubr             — UBR mütəxəssisi
Level 6: tesarrufat      — təsərrüfat müdiri
Level 6: psixoloq        — psixoloq
```
> Qeyd: Level 6 rollar eyni hierarchy-dədirlər, schooladmin-dən aşağı.

### 3. Institution Hierarchy Filter
```php
// Backend-də istifadəçi yalnız öz hierarchy-dəki data görür

if (auth()->user()->hasRole('SuperAdmin')) {
    // Bütün data
    $query = Model::query();

} elseif (auth()->user()->hasRole(['RegionAdmin', 'RegionOperator'])) {
    // Yalnız öz region-dakı data
    $query = Model::whereHas('institution', function($q) {
        $q->where('region_id', auth()->user()->institution->region_id);
    });

} elseif (auth()->user()->hasRole(['SchoolAdmin', 'SchoolOperator'])) {
    // Yalnız öz institution-dakı data
    $query = Model::where('institution_id', auth()->user()->institution_id);
}
```

## 📄 SƏHİFƏ-SƏHİFƏ PERMİSSİON STRUKTURU

### 🏫 Users Səhifəsi
**Fayl**: `frontend/src/pages/Users.tsx`
**Backend**: `UserController.php`

**Permissions**:
```
user.viewAny         → User list görə bilər
user.view            → Tək user detallarını görə bilər
user.create          → Yeni user yarada bilər
user.edit            → User məlumatlarını yeniləyə bilər
user.delete          → User silə bilər
user.assign.roles    → User-ə rol verə bilər
user.assign.permissions → User-ə permission verə bilər
```

**Role Filter**:
```typescript
// Frontend-də button görünməsi
const canCreate = hasPermission('user.create');
const canEdit = hasPermission('user.edit');
const canDelete = hasPermission('user.delete');
const canAssignRoles = hasPermission('user.assign.roles');

// Backend-də Policy
public function create(User $user): bool {
    return $user->hasPermissionTo('user.create');
}
```

**Institution Hierarchy**:
- SuperAdmin: Bütün userləri görür və edit edə bilir
- RegionAdmin: Yalnız öz region-dakı userləri görür
- SchoolAdmin: Yalnız öz school-dakı userləri görür

**Xüsusi Qaydalar**:
```
1. User özündən YUXARI level rolu olan user yarada bilməz
2. RegionAdmin başqa region-dan user görə bilməz
3. User modalında permission list role-a görə filterlənir
4. SuperAdmin role-unu yalnız SuperAdmin verə bilər
```

---

### 📋 Surveys Səhifəsi
**Fayl**: `frontend/src/pages/surveys/SurveyList.tsx`
**Backend**: `SurveyController.php`

**Permissions**:
```
survey.viewAny       → Survey list
survey.view          → Tək survey detay
survey.create        → Yeni survey yarat
survey.edit          → Survey yenilə (own və all variants)
survey.edit.own      → Yalnız öz yaratdığı surveyi yenilə
survey.delete        → Survey sil
survey.publish       → Survey publish et
survey.unpublish     → Survey unpublish et
survey.export        → Survey data export et (excel)
survey.analyze       → Survey analytics görə bilər
```

**Ownership Check**:
```php
// Backend-də owner check
public function update(UpdateSurveyRequest $request, Survey $survey) {
    if ($request->user()->hasPermissionTo('survey.edit.all')) {
        // Hər survey-i edit edə bilər
    } elseif ($request->user()->hasPermissionTo('survey.edit.own')) {
        // Yalnız öz survey-ini
        if ($survey->created_by !== $request->user()->id) {
            abort(403, 'You can only edit your own surveys');
        }
    }
}
```

**Institution Hierarchy**:
- SuperAdmin: Bütün surveyləri görür
- RegionAdmin: Region-dakı surveyləri görür
- SchoolAdmin: School-dakı surveyləri görür

---

### 📝 Tasks Səhifəsi
**Fayl**: `frontend/src/pages/tasks/TaskList.tsx`
**Backend**: `TaskController.php`

**Permissions**:
```
task.viewAny         → Task list
task.view            → Task detay
task.create          → Task yarat
task.edit            → Task edit (own və all)
task.delete          → Task sil
task.assign          → Task assign et (başqasına)
task.view.assigned   → Özünə assign olunan taskları görə bilər
task.update.status   → Task status dəyişə bilər
```

**Assigned User Logic**:
```typescript
// Frontend - My Tasks page
const { data: myTasks } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => taskService.getMyTasks()
});

// Backend
public function myTasks() {
    return Task::where('assigned_to', auth()->id())
                ->with(['creator', 'institution'])
                ->latest()
                ->paginate();
}
```

**Task Assignment Rules**:
```
1. User yalnız öz hierarchy-dəki userə task assign edə bilər
2. SchoolAdmin region-dakı user-ə task assign edə bilməz
3. Task creator həmişə task görə bilər (hətta assign etdikdən sonra)
4. Assigned user task status-u dəyişə bilər (pending → in_progress → completed)
```

---

### 🎓 Institutions Səhifəsi
**Fayl**: `frontend/src/pages/Institutions.tsx`
**Backend**: `InstitutionController.php`

**Permissions**:
```
institution.viewAny       → List görə bilər
institution.view          → Detay görə bilər
institution.create        → Yeni institution yarat
institution.edit          → Institution edit
institution.delete        → Institution sil
institution.manage.types  → Institution type idarə et (SuperAdmin only)
```

**Hierarchy Rules**:
```
1. SuperAdmin: Bütün institutionları yarada və edit edə bilər
2. RegionAdmin: Yalnız öz region-dakı institutionları görə bilər
3. Institution yaradarkən parent_id düzgün olmalı:
   - Region → Sektor
   - Sektor → School
```

---

### 👨‍🏫 Teachers Səhifəsi
**Fayl**: `frontend/src/pages/school/Teachers.tsx`
**Backend**: `TeacherController.php`

**Permissions**:
```
teacher.viewAny      → Teacher list
teacher.view         → Teacher detay
teacher.create       → Yeni teacher əlavə et
teacher.edit         → Teacher məlumatlarını edit et
teacher.delete       → Teacher sil
teacher.assign.class → Teacher-ə sinif təyin et
teacher.assign.subject → Teacher-ə fənn təyin et
```

**School-Specific Rules**:
```
1. Teacher yalnız öz school-da ola bilər
2. Teacher create edərkən automatically "Müəllim" rolu verilir
3. Teacher department seçilməlidir (Academic, Administrative, etc.)
4. Teacher-ə class assign edərkən school-un class-larından seçilməli
```

---

### 📊 Dashboard Səhifələri
**SuperAdmin Dashboard**: `frontend/src/pages/dashboard/SuperAdminDashboard.tsx`
**RegionAdmin Dashboard**: `frontend/src/pages/dashboard/RegionAdminDashboard.tsx`
**School Dashboard**: `frontend/src/pages/school/SchoolDashboard.tsx`

**Permissions**:
```
dashboard.view.superadmin    → SuperAdmin dashboardunu görə bilər
dashboard.view.region        → Region dashboardunu görə bilər
dashboard.view.school        → School dashboardunu görə bilər
dashboard.export.stats       → Dashboard statistikalarını export edə bilər
```

**Data Filtering**:
```typescript
// Frontend - automatic role-based dashboard
const dashboard = useMemo(() => {
    if (user.hasRole('SuperAdmin')) {
        return <SuperAdminDashboard />;
    } else if (user.hasRole(['RegionAdmin', 'RegionOperator'])) {
        return <RegionAdminDashboard />;
    } else if (user.hasRole(['SchoolAdmin', 'SchoolOperator'])) {
        return <SchoolDashboard />;
    }
}, [user.role]);
```

---

## 🔐 PERMISSION CHECK PATTERN-LƏRİ

### Frontend Permission Check
```typescript
// 1. Component-level check
import { useAuth } from '@/hooks/useAuth';

const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

// Single permission
if (hasPermission('user.create')) {
    return <CreateUserButton />;
}

// Multiple permissions (OR)
if (hasAnyPermission(['user.edit', 'user.delete'])) {
    return <ActionMenu />;
}

// Multiple permissions (AND)
if (hasAllPermissions(['user.create', 'user.assign.roles'])) {
    return <AdvancedUserForm />;
}
```

### Backend Permission Check (Controller)
```php
// Method 1: Middleware
Route::middleware(['permission:user.create'])->post('/users', [UserController::class, 'store']);

// Method 2: Controller constructor
public function __construct() {
    $this->middleware('permission:user.create')->only('store');
    $this->middleware('permission:user.edit')->only('update');
}

// Method 3: Inline check
public function store(Request $request) {
    $this->authorize('create', User::class); // UserPolicy-dən istifadə edir

    // OR
    if (!$request->user()->can('user.create')) {
        abort(403, 'Unauthorized');
    }
}
```

### Backend Permission Check (Policy)
```php
// app/Policies/UserPolicy.php
class UserPolicy {
    public function create(User $user): bool {
        return $user->hasPermissionTo('user.create');
    }

    public function update(User $user, User $targetUser): bool {
        // Own check
        if ($user->id === $targetUser->id) {
            return $user->hasPermissionTo('user.edit.own');
        }

        // All check
        return $user->hasPermissionTo('user.edit');
    }

    public function delete(User $user, User $targetUser): bool {
        // Cannot delete yourself
        if ($user->id === $targetUser->id) {
            return false;
        }

        // Cannot delete higher level user
        if ($targetUser->roles->min('level') < $user->roles->min('level')) {
            return false;
        }

        return $user->hasPermissionTo('user.delete');
    }
}
```

---

## 🚨 XÜSUSİ HALLAR

### Case 1: User Create Modal-da Permission Checkbox
```typescript
// User yaradarkən permission assign edə biləcək userlər:
const canAssignPermissions = hasPermission('user.assign.permissions');

// Amma göstərilən permissionlar role-a görə filterləniR:
const availablePermissions = useMemo(() => {
    if (user.hasRole('SuperAdmin')) {
        return allPermissions; // Bütün 255 permission (SELECT COUNT(*) FROM permissions)
    } else if (user.hasRole('RegionAdmin')) {
        return allPermissions.filter(p =>
            p.scope !== 'global' &&
            p.scope !== 'system'
        ); // Regional və altı
    }
}, [user.role, allPermissions]);
```

### Case 2: Task Assignment - Institution Hierarchy Filter
```typescript
// Task assign edərkən user selector:
const { data: assignableUsers } = useQuery({
    queryKey: ['assignable-users', user.institution_id],
    queryFn: () => userService.getAssignableUsers({
        institution_id: user.institution_id,
        hierarchy: 'same_or_below' // Yalnız eyni və ya aşağı səviyyə
    })
});

// Backend
public function getAssignableUsers(Request $request) {
    $user = $request->user();

    return User::whereHas('institution', function($q) use ($user) {
        if ($user->hasRole('SuperAdmin')) {
            // Bütün users
        } elseif ($user->hasRole(['RegionAdmin', 'RegionOperator'])) {
            $q->where('region_id', $user->institution->region_id);
        } else {
            $q->where('id', $user->institution_id);
        }
    })->get();
}
```

### Case 3: Survey Export - Background Job
```php
// Survey export böyük data olduqda queue-ya göndər
public function export(Request $request) {
    $this->authorize('export', Survey::class);

    $surveyIds = $request->input('survey_ids');
    $format = $request->input('format', 'excel'); // excel, csv, pdf

    // Əgər 100+ survey olarsa, background job
    if (count($surveyIds) > 100) {
        ExportSurveysJob::dispatch($surveyIds, $format, auth()->user());

        return response()->json([
            'message' => 'Export started. You will receive email when ready.'
        ]);
    }

    // Kiçik datada direct export
    return $this->exportDirectly($surveyIds, $format);
}
```

---

## 📋 YENİ SƏHIFƏ YARADARKƏN CHECKLIST

Yeni səhifə yaradarkən bu addımları izlə:

### Backend:
- [ ] Controller yaradıldı
- [ ] Policy yaradıldı (authorization logic)
- [ ] Permissions seeder-ə əlavə edildi
- [ ] Route-lara middleware əlavə edildi
- [ ] Institution hierarchy filter tətbiq edildi
- [ ] Testlər yazıldı

### Frontend:
- [ ] Component yaradıldı
- [ ] Permission check əlavə edildi (hasPermission)
- [ ] Service layer yaradıldı (API calls)
- [ ] Types təyin edildi (TypeScript)
- [ ] Loading və error states əlavə edildi
- [ ] Responsive design tətbiq edildi

### Permission:
- [ ] Permission adı düzgündür ({resource}.{action})
- [ ] Seeder-ə əlavə edildi
- [ ] Role-lara assign edildi
- [ ] Frontend-də check edildi
- [ ] Backend-də middleware var

---

**DİQQƏT**: Bu guide-dan istifadə edərkən, **mövcud pattern-ləri izlə**. Yeni pattern yaratma!
