<?php

use App\Http\Controllers\UserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\Auth\DeviceController;
use App\Http\Controllers\SurveyController;
use App\Http\Controllers\SurveyResponseController;
use App\Http\Controllers\SurveyTargetingController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\DocumentController;
// DocumentUploadController and DocumentAnalyticsController merged into DocumentController
use App\Http\Controllers\DocumentShareController;
use App\Http\Controllers\InstitutionController;
use App\Http\Controllers\InstitutionTypeController;
use App\Http\Controllers\InstitutionHierarchyController;
use App\Http\Controllers\InstitutionDepartmentController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\ConfigController;
use App\Http\Controllers\NavigationController;
use App\Http\Controllers\RegionAdmin\RegionAdminDashboardController;
use App\Http\Controllers\RegionAdmin\RegionAdminInstitutionController;
use App\Http\Controllers\RegionAdmin\RegionAdminUserController;
use App\Http\Controllers\RegionAdmin\RegionAdminSurveyController;
use App\Http\Controllers\RegionAdmin\RegionAdminReportsController;
use App\Http\Controllers\RegionOperator\RegionOperatorDashboardController;
use App\Http\Controllers\SektorAdmin\SektorAdminDashboardController;
use App\Http\Controllers\MektebAdmin\MektebAdminDashboardController;
// DocumentControllerRefactored merged into DocumentController
// InstitutionControllerRefactored removed - using main InstitutionController
use App\Http\Controllers\ClassAttendanceController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\API\ClassAttendanceApiController;
use App\Http\Controllers\API\ApprovalApiController;
use App\Http\Controllers\API\TeachingLoadApiController;
use App\Http\Controllers\API\ScheduleApiController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\GradeController;
use App\Http\Controllers\SchoolEventController;
use App\Http\Controllers\PsychologyController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\InventoryTransactionController;
use App\Http\Controllers\InventoryMaintenanceController;
use App\Http\Controllers\InventoryAnalyticsController;
use App\Http\Controllers\TeacherPerformanceController;
use App\Http\Controllers\TestWebSocketController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\AssessmentTypeController;
use App\Http\Controllers\AssessmentStudentController;
use App\Http\Controllers\AssessmentEntryController;
use App\Http\Controllers\AcademicYearController;
use Illuminate\Support\Facades\Route;

// Test route
Route::get('test', function () {
    return response()->json(['message' => 'API working', 'timestamp' => now()]);
});

// Public routes
Route::post('login', [AuthController::class, 'login'])->name('login');
Route::post('register', [PasswordController::class, 'register']);

// Setup wizard routes (public for initial setup)
Route::prefix('setup')->group(function () {
    Route::get('status', [App\Http\Controllers\SetupWizardController::class, 'checkSetupStatus']);
    Route::post('initialize', [App\Http\Controllers\SetupWizardController::class, 'initializeSystem']);
    Route::post('sample-structure', [App\Http\Controllers\SetupWizardController::class, 'createSampleStructure']);
    Route::get('validate', [App\Http\Controllers\SetupWizardController::class, 'validateSystemData']);
});

// Protected routes
// Health check endpoints (no auth required)
Route::get('health', [HealthController::class, 'health']);
Route::get('ping', [HealthController::class, 'ping']);
Route::get('version', [HealthController::class, 'version']);

// Application configuration endpoints (no auth required)
Route::get('config/app', [ConfigController::class, 'getAppConfig']);
Route::get('config/constants', [ConfigController::class, 'getConstants']);

// Temporary debug route for role testing
Route::get('/debug-users', function() {
    $users = \App\Models\User::with('roles')->take(2)->get();
    $result = [];
    
    foreach ($users as $user) {
        $firstRole = $user->roles->first();
        $result[] = [
            'user' => $user->email,
            'role_exists' => $firstRole ? 'yes' : 'no',
            'role' => $firstRole ? [
                'id' => $firstRole->id,
                'name' => $firstRole->name,
                'display_name' => $firstRole->display_name,
                'level' => $firstRole->level
            ] : null
        ];
    }
    
    return response()->json(['debug_result' => $result]);
});

Route::middleware('auth:sanctum')->group(function () {
    // Profile management endpoints
    Route::prefix('profile')->group(function () {
        Route::get('/', [ProfileController::class, 'show']);
        Route::put('/', [ProfileController::class, 'update']);
        Route::post('/avatar', [ProfileController::class, 'uploadAvatar']);
        Route::delete('/avatar', [ProfileController::class, 'removeAvatar']);
        Route::get('/activity', [ProfileController::class, 'getActivity']);
        Route::put('/password', [ProfileController::class, 'updatePassword']);
    });

    // System stats (authenticated)
    Route::get('system/stats', [HealthController::class, 'stats']);
    Route::get('config/navigation', [ConfigController::class, 'getNavigation']);
    // Auth routes
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);
    Route::post('refresh-token', [AuthController::class, 'refresh']);
    
    // User Preferences Management
    Route::prefix('user')->group(function () {
        Route::get('preferences', [App\Http\Controllers\UserPreferencesController::class, 'getPreferences']);
        Route::put('preferences', [App\Http\Controllers\UserPreferencesController::class, 'updatePreferences']);
        Route::post('preferences/reset', [App\Http\Controllers\UserPreferencesController::class, 'resetPreferences']);
        Route::put('theme', [App\Http\Controllers\UserPreferencesController::class, 'updateTheme']);
        Route::put('language', [App\Http\Controllers\UserPreferencesController::class, 'updateLanguage']);
        Route::put('layout', [App\Http\Controllers\UserPreferencesController::class, 'updateLayout']);
        Route::get('ui-settings', [App\Http\Controllers\UserPreferencesController::class, 'getUISettings']);
    });
    
    // Password management
    Route::post('change-password', [PasswordController::class, 'changePassword']);
    Route::post('users/{user}/reset-password', [PasswordController::class, 'resetPassword'])->middleware('permission:users.update');
    
    // Session management
    Route::get('sessions', [SessionController::class, 'index']);
    Route::delete('sessions/{sessionId}', [SessionController::class, 'revoke']);
    Route::delete('sessions/others', [SessionController::class, 'revokeOthers']);
    Route::delete('sessions/all', [SessionController::class, 'revokeAll']);
    Route::get('sessions/stats', [SessionController::class, 'stats']);
    
    // Device management
    Route::get('devices', [DeviceController::class, 'index']);
    Route::post('devices', [DeviceController::class, 'register']);
    Route::put('devices/{deviceId}', [DeviceController::class, 'update']);
    Route::delete('devices/{deviceId}', [DeviceController::class, 'destroy']);
    Route::get('devices/stats', [DeviceController::class, 'stats']);

    // Test role endpoints
    Route::get('test/superadmin', function () {
        return response()->json(['message' => 'SuperAdmin access successful', 'user' => auth()->user()->username]);
    })->middleware('role:superadmin');
    
    Route::get('test/regionadmin', function () {
        return response()->json(['message' => 'RegionAdmin access successful', 'user' => auth()->user()->username]);
    })->middleware('role:regionadmin|superadmin');
    
    Route::get('test/teacher', function () {
        return response()->json(['message' => 'Teacher access successful', 'user' => auth()->user()->username]);
    })->middleware('role:müəllim|regionadmin|superadmin');

    // User management with proper roles
    Route::get('users', [UserController::class, 'index'])->middleware('permission:users.read');
    Route::post('users', [UserController::class, 'store'])->middleware(['permission:users.create', 'audit.logging']);
    Route::get('users/{user}', [UserController::class, 'show'])->middleware('permission:users.read');
    Route::put('users/{user}', [UserController::class, 'update'])->middleware(['permission:users.update', 'audit.logging']);
    Route::delete('users/{user}', [UserController::class, 'destroy'])->middleware(['permission:users.delete', 'audit.logging']);
    
    // User bulk operations
    Route::post('users/bulk/activate', [UserController::class, 'bulkActivate'])->middleware('permission:users.update');
    Route::post('users/bulk/deactivate', [UserController::class, 'bulkDeactivate'])->middleware('permission:users.update');
    Route::post('users/bulk/assign-role', [UserController::class, 'bulkAssignRole'])->middleware('permission:users.update');
    Route::post('users/bulk/assign-institution', [UserController::class, 'bulkAssignInstitution'])->middleware('permission:users.update');
    Route::post('users/bulk/delete', [UserController::class, 'bulkDelete'])->middleware('permission:users.delete');
    Route::post('users/export', [UserController::class, 'exportUsers'])->middleware('permission:users.read');
    Route::get('users/bulk/statistics', [UserController::class, 'getBulkStatistics'])->middleware('permission:users.read');
    Route::post('users/{user}/toggle-status', [UserController::class, 'toggleStatus'])->middleware('permission:users.update');
    
    // Users helper endpoints
    Route::get('users/institutions/available', [UserController::class, 'getAvailableInstitutions'])->middleware('permission:users.read');
    Route::get('users/roles/available', [UserController::class, 'getAvailableRoles'])->middleware('permission:users.read');

    // Institution bulk operations (must be before parameterized routes)
    Route::post('institutions/bulk/activate', [App\Http\Controllers\InstitutionController::class, 'bulkActivate'])->middleware('permission:institutions.update');
    Route::post('institutions/bulk/deactivate', [App\Http\Controllers\InstitutionController::class, 'bulkDeactivate'])->middleware('permission:institutions.update');
    Route::post('institutions/bulk/delete', [App\Http\Controllers\InstitutionController::class, 'bulkDelete'])->middleware('permission:institutions.delete');
    Route::post('institutions/bulk/restore', [App\Http\Controllers\InstitutionController::class, 'bulkRestore'])->middleware('permission:institutions.update');
    Route::post('institutions/bulk/export', [App\Http\Controllers\InstitutionController::class, 'bulkExport'])->middleware('permission:institutions.read');
    Route::post('institutions/bulk/assign-parent', [App\Http\Controllers\InstitutionController::class, 'bulkAssignParent'])->middleware('permission:institutions.update');
    Route::post('institutions/bulk/update-type', [App\Http\Controllers\InstitutionController::class, 'bulkUpdateType'])->middleware('permission:institutions.update');
    Route::post('institutions/export', [App\Http\Controllers\InstitutionController::class, 'exportInstitutions'])->middleware('permission:institutions.read');
    Route::get('institutions/bulk/statistics', [App\Http\Controllers\InstitutionController::class, 'getBulkStatistics'])->middleware('permission:institutions.read');
    // Institution management - Core operations
    Route::get('institutions', [InstitutionController::class, 'index'])->middleware('permission:institutions.read');
    Route::get('institutions/hierarchy', [InstitutionController::class, 'hierarchy'])->middleware('permission:institutions.read');
    Route::post('institutions', [InstitutionController::class, 'store'])->middleware(['permission:institutions.create', 'audit.logging']);
    Route::get('institutions/{institution}', [InstitutionController::class, 'show'])->middleware('permission:institutions.read');
    Route::put('institutions/{institution}', [InstitutionController::class, 'update'])->middleware(['permission:institutions.update', 'audit.logging']);
    Route::delete('institutions/{institution}', [InstitutionController::class, 'destroy'])->middleware(['permission:institutions.delete', 'audit.logging']);
    Route::get('institutions/types', [InstitutionController::class, 'getTypes'])->middleware('permission:institutions.read');
    Route::get('institutions/statistics', [InstitutionController::class, 'getStatistics'])->middleware('permission:institutions.read');
    
    // Institution Types Management (SuperAdmin Only)
    Route::middleware('role:superadmin')->prefix('institution-types')->group(function () {
        Route::get('/', [InstitutionTypeController::class, 'index']);
        Route::post('/', [InstitutionTypeController::class, 'store']);
        Route::get('/hierarchy', [InstitutionTypeController::class, 'getHierarchy']);
        Route::get('/parent-types', [InstitutionTypeController::class, 'getParentTypes']);
        Route::get('/{institutionType}', [InstitutionTypeController::class, 'show']);
        Route::put('/{institutionType}', [InstitutionTypeController::class, 'update']);
        Route::delete('/{institutionType}', [InstitutionTypeController::class, 'destroy']);
    });
    
    // Institution soft delete management
    Route::get('institutions/trashed', [InstitutionController::class, 'trashed'])->middleware('permission:institutions.read');
    Route::put('institutions/{id}/restore', [InstitutionController::class, 'restore'])->middleware(['permission:institutions.update', 'audit.logging']);
    Route::delete('institutions/{id}/force-delete', [InstitutionController::class, 'forceDelete'])->middleware(['permission:institutions.delete', 'audit.logging']);
    
    // Institution audit logs
    Route::get('institutions/audit-logs', [App\Http\Controllers\InstitutionAuditLogController::class, 'index'])->middleware('permission:institutions.read');
    Route::get('institutions/{institutionId}/audit-logs', [App\Http\Controllers\InstitutionAuditLogController::class, 'show'])->middleware('permission:institutions.read');
    Route::get('institutions/audit-logs/statistics', [App\Http\Controllers\InstitutionAuditLogController::class, 'statistics'])->middleware('permission:institutions.read');

    // Institution hierarchy management
    Route::get('institutions-hierarchy', [InstitutionHierarchyController::class, 'getHierarchy'])->middleware('permission:institutions.read');
    Route::get('institutions/{institution}/subtree', [InstitutionHierarchyController::class, 'getSubTree'])->middleware('permission:institutions.read');
    Route::get('institutions/{institution}/path', [InstitutionHierarchyController::class, 'getPath'])->middleware('permission:institutions.read');
    Route::post('institutions/{institution}/move', [InstitutionHierarchyController::class, 'moveInstitution'])->middleware(['permission:institutions.update', 'audit.logging']);
    Route::get('institutions/level/{level}', [InstitutionHierarchyController::class, 'getByLevel'])->middleware('permission:institutions.read');
    Route::get('institutions-hierarchy/validate', [InstitutionHierarchyController::class, 'validateHierarchy'])->middleware('permission:institutions.read');

    // Institution department management
    Route::get('institutions/{institution}/departments', [InstitutionDepartmentController::class, 'index'])->middleware('permission:institutions.read');
    Route::post('institutions/{institution}/departments', [InstitutionDepartmentController::class, 'store'])->middleware(['permission:institutions.create', 'audit.logging']);
    Route::get('institutions/{institution}/departments/{department}', [InstitutionDepartmentController::class, 'show'])->middleware('permission:institutions.read');
    Route::put('institutions/{institution}/departments/{department}', [InstitutionDepartmentController::class, 'update'])->middleware(['permission:institutions.update', 'audit.logging']);
    Route::delete('institutions/{institution}/departments/{department}', [InstitutionDepartmentController::class, 'destroy'])->middleware(['permission:institutions.delete', 'audit.logging']);
    Route::get('institutions/{institution}/departments/statistics', [InstitutionDepartmentController::class, 'getStatistics'])->middleware('permission:institutions.read');
    Route::post('institutions/{institution}/departments/{department}/move-users', [InstitutionDepartmentController::class, 'moveUsers'])->middleware(['permission:institutions.update', 'audit.logging']);
    Route::get('departments/types', [InstitutionDepartmentController::class, 'getTypes'])->middleware('permission:institutions.read');

    // Department management
    Route::get('departments', [DepartmentController::class, 'index'])->middleware('permission:institutions.read');
    Route::post('departments', [DepartmentController::class, 'store'])->middleware('permission:institutions.create');
    Route::get('departments/{department}', [DepartmentController::class, 'show'])->middleware('permission:institutions.read');
    Route::put('departments/{department}', [DepartmentController::class, 'update'])->middleware('permission:institutions.update');
    Route::delete('departments/{department}', [DepartmentController::class, 'destroy'])->middleware('permission:institutions.delete');
    Route::get('departments/types/institution', [DepartmentController::class, 'getTypesForInstitution'])->middleware('permission:institutions.read');

    // Role management
    Route::get('roles', [RoleController::class, 'index'])->middleware('permission:roles.read');
    Route::post('roles', [RoleController::class, 'store'])->middleware(['permission:roles.create', 'audit.logging']);
    Route::get('roles/{role}', [RoleController::class, 'show'])->middleware('permission:roles.read');
    Route::put('roles/{role}', [RoleController::class, 'update'])->middleware(['permission:roles.update', 'audit.logging']);
    Route::delete('roles/{role}', [RoleController::class, 'destroy'])->middleware(['permission:roles.delete', 'audit.logging']);
    Route::get('permissions', [RoleController::class, 'permissions'])->middleware('permission:roles.read');
    
    // Enhanced role hierarchy routes
    Route::get('roles/hierarchy', [RoleController::class, 'hierarchy'])->middleware('permission:roles.read');
    Route::get('roles/level/{level}/available', [RoleController::class, 'availableForLevel'])->middleware('permission:roles.create');

    // Survey management
    Route::get('surveys', [SurveyController::class, 'index'])->middleware('permission:surveys.read');
    Route::post('surveys', [SurveyController::class, 'store'])->middleware('permission:surveys.create');
    Route::get('surveys/{survey}', [SurveyController::class, 'show'])->middleware('permission:surveys.read');
    Route::put('surveys/{survey}', [SurveyController::class, 'update'])->middleware('permission:surveys.update');
    Route::delete('surveys/{survey}', [SurveyController::class, 'destroy'])->middleware('permission:surveys.delete');
    
    // Enhanced Survey Analytics & Statistics (must be before {survey} routes)
    Route::get('surveys/dashboard/statistics', [SurveyController::class, 'dashboardStatistics'])->middleware('permission:surveys.read');
    Route::post('surveys/estimate-recipients', [SurveyController::class, 'estimateRecipients'])->middleware('permission:surveys.create');
    
    // Survey actions
    Route::post('surveys/{survey}/publish', [SurveyController::class, 'publish'])->middleware('permission:surveys.publish');
    Route::post('surveys/{survey}/pause', [SurveyController::class, 'pause'])->middleware('permission:surveys.manage');
    Route::post('surveys/{survey}/archive', [SurveyController::class, 'archive'])->middleware('permission:surveys.manage');
    Route::post('surveys/{survey}/duplicate', [SurveyController::class, 'duplicate'])->middleware('permission:surveys.create');
    Route::get('surveys/{survey}/form', [SurveyController::class, 'getSurveyForResponse'])->middleware('permission:surveys.read');
    Route::get('surveys/{survey}/statistics', [SurveyController::class, 'statistics'])->middleware('permission:surveys.read');
    Route::get('surveys/{survey}/analytics', [SurveyController::class, 'analytics'])->middleware('permission:surveys.read');
    
    // Bulk Survey Operations
    Route::post('surveys/bulk/publish', [SurveyController::class, 'bulkPublish'])->middleware('permission:surveys.publish');
    Route::post('surveys/bulk/close', [SurveyController::class, 'bulkClose'])->middleware('permission:surveys.manage');
    Route::post('surveys/bulk/archive', [SurveyController::class, 'bulkArchive'])->middleware('permission:surveys.manage');
    Route::post('surveys/bulk/delete', [SurveyController::class, 'bulkDelete'])->middleware('permission:surveys.delete');
    
    // Survey response management
    Route::get('survey-responses', [SurveyResponseController::class, 'index'])->middleware('permission:surveys.read');
    Route::get('survey-responses/{response}', [SurveyResponseController::class, 'show'])->middleware('permission:surveys.read');
    Route::post('surveys/{survey}/responses/start', [SurveyResponseController::class, 'start'])->middleware('permission:surveys.read');
    Route::put('survey-responses/{response}/save', [SurveyResponseController::class, 'save'])->middleware('permission:surveys.read');
    Route::post('survey-responses/{response}/submit', [SurveyResponseController::class, 'submit'])->middleware('permission:surveys.read');
    Route::post('survey-responses/{response}/approve', [SurveyResponseController::class, 'approve'])->middleware('permission:surveys.manage');
    Route::post('survey-responses/{response}/reject', [SurveyResponseController::class, 'reject'])->middleware('permission:surveys.manage');
    Route::delete('survey-responses/{response}', [SurveyResponseController::class, 'destroy'])->middleware('permission:surveys.manage');
    Route::get('survey-responses/{response}/statistics', [SurveyResponseController::class, 'statistics'])->middleware('permission:surveys.read');
    
    // Survey targeting routes
    Route::get('survey-targeting/options', [SurveyTargetingController::class, 'getTargetingOptions'])->middleware('permission:surveys.create');
    Route::get('survey-targeting/institutions/hierarchy', [SurveyTargetingController::class, 'getInstitutionHierarchy'])->middleware('permission:surveys.create');
    Route::get('survey-targeting/institutions/accessible', [SurveyTargetingController::class, 'getAccessibleInstitutions'])->middleware('permission:surveys.create');
    Route::get('survey-targeting/departments/accessible', [SurveyTargetingController::class, 'getAccessibleDepartments'])->middleware('permission:surveys.create');
    Route::post('survey-targeting/estimate', [SurveyTargetingController::class, 'estimateRecipients'])->middleware('permission:surveys.create');
    Route::post('survey-targeting/validate', [SurveyTargetingController::class, 'validateTargeting'])->middleware('permission:surveys.create');
    Route::post('survey-targeting/apply-preset', [SurveyTargetingController::class, 'applyPreset'])->middleware('permission:surveys.create');
    Route::get('survey-targeting/bulk-options', [SurveyTargetingController::class, 'getBulkSelectionOptions'])->middleware('permission:surveys.create');
    
    // Task management - RegionAdmin and SektorAdmin can create tasks
    Route::get('tasks', [TaskController::class, 'index'])->middleware('permission:tasks.read');
    Route::post('tasks', [TaskController::class, 'store'])->middleware('permission:tasks.create');
    Route::get('tasks/statistics', [TaskController::class, 'getStatistics'])->middleware('permission:tasks.read');
    Route::get('tasks/{task}', [TaskController::class, 'show'])->middleware('permission:tasks.read');
    Route::put('tasks/{task}', [TaskController::class, 'update'])->middleware('permission:tasks.update');
    Route::delete('tasks/{task}', [TaskController::class, 'destroy'])->middleware('permission:tasks.delete');
    Route::post('tasks/{task}/comments', [TaskController::class, 'addComment'])->middleware('permission:tasks.read');
    
    // Hierarchical Task Management - New enhanced features
    Route::get('tasks/targeting/institutions', [TaskController::class, 'getTargetableInstitutions'])->middleware('permission:tasks.create');
    Route::get('tasks/targeting/roles', [TaskController::class, 'getAllowedTargetRoles'])->middleware('permission:tasks.create');
    Route::post('tasks/hierarchical', [TaskController::class, 'createHierarchicalTask'])->middleware('permission:tasks.create');
    Route::get('tasks/{task}/assignments', [TaskController::class, 'getTaskAssignments'])->middleware('permission:tasks.read');
    Route::put('assignments/{assignment}/status', [TaskController::class, 'updateAssignmentStatus'])->middleware('permission:tasks.update');
    Route::get('tasks/{task}/progress', [TaskController::class, 'getTaskProgress'])->middleware('permission:tasks.read');

    // Notification management
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::get('notifications/statistics', [NotificationController::class, 'statistics']);
    Route::get('notifications/{id}', [NotificationController::class, 'show']);
    Route::put('notifications/{id}/mark-as-read', [NotificationController::class, 'markAsRead']);
    Route::put('notifications/mark-all-as-read', [NotificationController::class, 'markAllAsRead']);
    Route::delete('notifications/{id}', [NotificationController::class, 'destroy']);
    
    // Admin notification functions
    Route::post('notifications/send-test', [NotificationController::class, 'sendTest'])->middleware('role:superadmin');
    Route::post('notifications/{id}/resend', [NotificationController::class, 'resend'])->middleware('role:superadmin');

    // Old document routes removed - using enhanced document management instead

    // FAZA 12: New Frontend Component API Routes
    // Class Attendance API Routes
    Route::prefix('class-attendance')->group(function () {
        Route::get('/', [ClassAttendanceApiController::class, 'index'])->middleware('permission:attendance.read');
        Route::post('/', [ClassAttendanceApiController::class, 'store'])->middleware('permission:attendance.create');
        Route::get('/stats', [ClassAttendanceApiController::class, 'getClassStats'])->middleware('permission:attendance.read');
        Route::get('/{classId}', [ClassAttendanceApiController::class, 'show'])->middleware('permission:attendance.read');
    });

    // Approval API Routes
    Route::prefix('approvals')->group(function () {
        Route::get('/', [ApprovalApiController::class, 'index'])->middleware('permission:approvals.read');
        Route::post('/{id}/approve', [ApprovalApiController::class, 'approve'])->middleware('permission:approvals.approve');
        Route::post('/{id}/reject', [ApprovalApiController::class, 'reject'])->middleware('permission:approvals.approve');
        Route::get('/stats', [ApprovalApiController::class, 'getStats'])->middleware('permission:approvals.read');
    });

    // Teaching Load API Routes
    Route::prefix('teaching-loads')->group(function () {
        Route::get('/', [TeachingLoadApiController::class, 'index'])->middleware('permission:schedules.read');
        Route::post('/', [TeachingLoadApiController::class, 'store'])->middleware('permission:schedules.create');
        Route::get('/teacher/{teacherId}', [TeachingLoadApiController::class, 'getTeacherWorkload'])->middleware('permission:schedules.read');
        Route::put('/{id}', [TeachingLoadApiController::class, 'update'])->middleware('permission:schedules.update');
        Route::delete('/{id}', [TeachingLoadApiController::class, 'destroy'])->middleware('permission:schedules.delete');
    });

    // Duplicate schedule API routes removed - using main /schedules routes instead
    
    // User storage quota
    Route::get('documents/quota/info', [DocumentController::class, 'getQuotaInfo']);
    
    // Link sharing - New enhanced features
    Route::get('link-shares', [App\Http\Controllers\LinkShareController::class, 'index'])->middleware('permission:documents.read');
    Route::post('link-shares', [App\Http\Controllers\LinkShareController::class, 'store'])->middleware('permission:documents.share');
    Route::get('link-shares/{linkShare}', [App\Http\Controllers\LinkShareController::class, 'show'])->middleware('permission:documents.read');
    Route::put('link-shares/{linkShare}', [App\Http\Controllers\LinkShareController::class, 'update'])->middleware('permission:documents.share');
    Route::delete('link-shares/{linkShare}', [App\Http\Controllers\LinkShareController::class, 'destroy'])->middleware('permission:documents.delete');
    
    // Link sharing advanced features
    Route::post('link-shares/{linkShare}/access', [App\Http\Controllers\LinkShareController::class, 'access']);
    Route::get('link-shares/{linkShare}/statistics', [App\Http\Controllers\LinkShareController::class, 'getStatistics'])->middleware('permission:documents.read');
    Route::get('link-shares/options/sharing', [App\Http\Controllers\LinkShareController::class, 'getSharingOptions'])->middleware('permission:documents.share');

    // Navigation routes
    Route::get('navigation/menu', [App\Http\Controllers\NavigationController::class, 'getMenuItems']);
    Route::get('navigation/stats', [App\Http\Controllers\NavigationController::class, 'getNavigationStats']);

    // Dashboard routes
    Route::get('dashboard/stats', [App\Http\Controllers\DashboardController::class, 'stats']);
    Route::get('dashboard/detailed-stats', [App\Http\Controllers\DashboardController::class, 'detailedStats'])->middleware('permission:users.read');
    Route::get('dashboard/recent-activity', [App\Http\Controllers\DashboardController::class, 'recentActivity']);
    
    // SuperAdmin advanced dashboard routes
    Route::get('dashboard/superadmin-analytics', [App\Http\Controllers\DashboardController::class, 'superAdminAnalytics'])->middleware('role:superadmin');
    Route::get('dashboard/system-status', [App\Http\Controllers\DashboardController::class, 'systemStatus'])->middleware('role:superadmin');
    
    // Reports and Analytics (with proper permissions)
    Route::get('reports/overview', [App\Http\Controllers\ReportsController::class, 'getOverviewStats'])->middleware('permission:reports.read');
    Route::get('reports/institutional-performance', [App\Http\Controllers\ReportsController::class, 'getInstitutionalPerformance'])->middleware('permission:reports.read');
    Route::get('reports/survey-analytics', [App\Http\Controllers\ReportsController::class, 'getSurveyAnalytics'])->middleware('permission:reports.read');
    Route::get('reports/user-activity', [App\Http\Controllers\ReportsController::class, 'getUserActivityReport'])->middleware('permission:reports.read');
    Route::post('reports/export', [App\Http\Controllers\ReportsController::class, 'exportReport'])->middleware('permission:reports.export');
    
    // RegionAdmin Dashboard and Analytics - Refactored Controllers
    Route::prefix('regionadmin')->middleware(['role:regionadmin|superadmin', 'regional.access:institutions', 'audit.logging'])->group(function () {
        // Dashboard endpoints
        Route::get('dashboard', [RegionAdminDashboardController::class, 'getDashboardStats']);
        Route::get('dashboard/stats', [RegionAdminDashboardController::class, 'getDashboardStats']);
        Route::get('dashboard/activities', [RegionAdminDashboardController::class, 'getDashboardActivities']);
        
        // Institution management endpoints - READ operations
        Route::get('institutions', [RegionAdminInstitutionController::class, 'index']);
        Route::get('institutions/stats', [RegionAdminInstitutionController::class, 'getInstitutionStats']);
        Route::get('institutions/hierarchy', [RegionAdminInstitutionController::class, 'getInstitutionHierarchy']);
        Route::get('institutions/performance', [RegionAdminInstitutionController::class, 'getPerformanceInsights']);
        Route::get('institutions/{id}', [RegionAdminInstitutionController::class, 'show']);
        
        // Institution management endpoints - WRITE operations
        Route::post('institutions', [RegionAdminInstitutionController::class, 'store']);
        Route::put('institutions/{id}', [RegionAdminInstitutionController::class, 'update']);
        Route::delete('institutions/{id}', [RegionAdminInstitutionController::class, 'destroy']);
        
        // Department management endpoints
        Route::get('institutions/{institutionId}/departments', [RegionAdminInstitutionController::class, 'getDepartments']);
        Route::post('institutions/{institutionId}/departments', [RegionAdminInstitutionController::class, 'storeDepartment']);
        Route::get('institutions/{institutionId}/departments/{departmentId}', [RegionAdminInstitutionController::class, 'showDepartment']);
        Route::put('institutions/{institutionId}/departments/{departmentId}', [RegionAdminInstitutionController::class, 'updateDepartment']);
        Route::delete('institutions/{institutionId}/departments/{departmentId}', [RegionAdminInstitutionController::class, 'destroyDepartment']);
        
        // User management endpoints - READ operations
        Route::get('users', [RegionAdminUserController::class, 'index']);
        Route::get('users/stats', [RegionAdminUserController::class, 'getUserStats']);
        Route::get('users/list', [RegionAdminUserController::class, 'getUsersList']);
        Route::get('users/activity', [RegionAdminUserController::class, 'getUserActivity']);
        Route::get('users/{id}', [RegionAdminUserController::class, 'show']);
        
        // User management endpoints - WRITE operations
        Route::post('users', [RegionAdminUserController::class, 'store']);
        Route::put('users/{id}', [RegionAdminUserController::class, 'update']);
        Route::delete('users/{id}', [RegionAdminUserController::class, 'destroy']);
        
        // User management helper endpoints
        Route::get('roles/available', [RegionAdminUserController::class, 'getAvailableRoles']);
        Route::get('institutions/available', [RegionAdminUserController::class, 'getAvailableInstitutions']);
        Route::get('institutions/{institutionId}/departments', [RegionAdminUserController::class, 'getInstitutionDepartments']);
        
        // Survey analytics endpoints
        Route::get('surveys', [RegionAdminSurveyController::class, 'getSurveyAnalytics']);
        Route::get('surveys/list', [RegionAdminSurveyController::class, 'getSurveysList']);
        Route::get('surveys/trends', [RegionAdminSurveyController::class, 'getSurveyTrends']);
        
        // Reports endpoints
        Route::get('reports/overview', [RegionAdminReportsController::class, 'getRegionalOverview'])
            ->middleware('permission:reports.read');
        Route::get('reports/institutions', [RegionAdminReportsController::class, 'getInstitutionReports'])
            ->middleware('permission:reports.read');
        Route::get('reports/surveys', [RegionAdminReportsController::class, 'getSurveyReports'])
            ->middleware('permission:reports.read');
        Route::get('reports/users', [RegionAdminReportsController::class, 'getUserReports'])
            ->middleware('permission:reports.read');
        Route::post('reports/export', [RegionAdminReportsController::class, 'exportReport'])
            ->middleware('permission:reports.export');
    });
    
    // RegionOperator Dashboard and Analytics
    Route::prefix('regionoperator')->middleware(['role:regionoperator', 'regional.access:departments', 'audit.logging'])->group(function () {
        // Dashboard endpoints
        Route::get('dashboard', [RegionOperatorDashboardController::class, 'getDashboardStats']);
        Route::get('tasks', [RegionOperatorDashboardController::class, 'getUserTasks']);
        Route::get('team', [RegionOperatorDashboardController::class, 'getDepartmentTeam']);
    });
    
    // SektorAdmin Dashboard and Analytics
    Route::prefix('sektoradmin')->middleware(['role:sektoradmin', 'regional.access:sector', 'audit.logging'])->group(function () {
        // Dashboard endpoints
        Route::get('dashboard', [SektorAdminDashboardController::class, 'getDashboardStats']);
        Route::get('schools', [SektorAdminDashboardController::class, 'getSectorSchools']);
        Route::get('analytics', [SektorAdminDashboardController::class, 'getSectorAnalytics']);
    });
    
    // MəktəbAdmin Dashboard and Analytics
    Route::prefix('mektebadmin')->middleware(['role:məktəbadmin', 'regional.access:school', 'audit.logging'])->group(function () {
        // Dashboard endpoints
        Route::get('dashboard', [MektebAdminDashboardController::class, 'getDashboardStats']);
        Route::get('classes', [MektebAdminDashboardController::class, 'getSchoolClasses']);
        Route::get('teachers', [MektebAdminDashboardController::class, 'getSchoolTeachers']);
    });

    // Müəllim Dashboard and Analytics
    Route::prefix('teacher')->middleware(['role:müəllim', 'regional.access:school', 'audit.logging'])->group(function () {
        // Dashboard endpoints
        Route::get('dashboard', [App\Http\Controllers\Teacher\TeacherDashboardController::class, 'getDashboardStats']);
        Route::get('classes', [App\Http\Controllers\Teacher\TeacherDashboardController::class, 'getTeacherClasses']);
        Route::get('gradebook', [App\Http\Controllers\Teacher\TeacherDashboardController::class, 'getGradebook']);
    });
    
    // System Configuration (SuperAdmin only)
    Route::prefix('system')->middleware('permission:system.config')->group(function () {
        Route::get('config', [App\Http\Controllers\SystemConfigController::class, 'getSystemConfig']);
        Route::put('config', [App\Http\Controllers\SystemConfigController::class, 'updateSystemConfig']);
        Route::get('health', [App\Http\Controllers\SystemConfigController::class, 'getSystemHealth']);
        Route::post('maintenance', [App\Http\Controllers\SystemConfigController::class, 'performMaintenance']);
        Route::get('audit-logs', [App\Http\Controllers\SystemConfigController::class, 'getAuditLogs']);
        
        // Report Scheduling
        Route::get('schedules', [App\Http\Controllers\SystemConfigController::class, 'getScheduledReports']);
        Route::post('schedules', [App\Http\Controllers\SystemConfigController::class, 'createScheduledReport']);
        Route::put('schedules/{schedule}', [App\Http\Controllers\SystemConfigController::class, 'updateScheduledReport']);
        Route::delete('schedules/{schedule}', [App\Http\Controllers\SystemConfigController::class, 'deleteScheduledReport']);
    });

    // Enhanced Document Management 
    Route::prefix('documents')->group(function () {
        Route::get('/', [DocumentController::class, 'index'])->middleware('permission:documents.read');
        Route::post('/', [DocumentController::class, 'store'])->middleware('permission:documents.create');
        Route::get('/stats', [DocumentController::class, 'getStats'])->middleware('permission:documents.read');
        Route::get('/{document}', [DocumentController::class, 'show'])->middleware('permission:documents.read');
        Route::put('/{document}', [DocumentController::class, 'update'])->middleware('permission:documents.update');
        Route::delete('/{document}', [DocumentController::class, 'destroy'])->middleware('permission:documents.delete');
        
        // Download and preview
        Route::get('/{document}/download', [DocumentController::class, 'download'])->middleware('permission:documents.read');
        Route::get('/{document}/preview', [DocumentController::class, 'preview'])->middleware('permission:documents.read');
        Route::get('/{document}/stats/downloads', [DocumentController::class, 'downloadStats'])->middleware('permission:documents.read');
        Route::post('/bulk-download', [DocumentController::class, 'bulkDownload'])->middleware('permission:documents.read');
        
        // Sharing functionality
        Route::post('/{document}/share', [DocumentController::class, 'share'])->middleware('permission:documents.share');
        Route::post('/{document}/public-link', [DocumentController::class, 'createPublicLink'])->middleware('permission:documents.share');
        Route::get('/{document}/stats/sharing', [DocumentController::class, 'sharingStats'])->middleware('permission:documents.read');
        Route::delete('/shares/{share}/revoke', [DocumentController::class, 'revokeShare'])->middleware('permission:documents.share');
        Route::get('/my-shares', [DocumentController::class, 'myShares'])->middleware('permission:documents.read');
    });

    // Duplicate institution management removed - using main institution routes instead

    // Class Attendance Management
    Route::prefix('attendance')->group(function () {
        Route::get('/', [ClassAttendanceController::class, 'index'])->middleware('permission:attendance.read');
        Route::post('/', [ClassAttendanceController::class, 'store'])->middleware('permission:attendance.create');
        Route::get('/statistics', [ClassAttendanceController::class, 'statistics'])->middleware('permission:attendance.read');
        Route::get('/{classAttendance}', [ClassAttendanceController::class, 'show'])->middleware('permission:attendance.read');
        Route::put('/{classAttendance}', [ClassAttendanceController::class, 'update'])->middleware('permission:attendance.update');
        Route::delete('/{classAttendance}', [ClassAttendanceController::class, 'destroy'])->middleware('permission:attendance.delete');
        Route::post('/{classAttendance}/approve', [ClassAttendanceController::class, 'approve'])->middleware('permission:attendance.approve');
        Route::post('/bulk-action', [ClassAttendanceController::class, 'bulkAction'])->middleware('permission:attendance.update');
    });

    // Schedule Management
    Route::prefix('schedules')->group(function () {
        Route::get('/', [ScheduleController::class, 'index'])->middleware('permission:schedules.read');
        Route::post('/', [ScheduleController::class, 'store'])->middleware('permission:schedules.create');
        Route::get('/{schedule}', [ScheduleController::class, 'show'])->middleware('permission:schedules.read');
        Route::put('/{schedule}', [ScheduleController::class, 'update'])->middleware('permission:schedules.update');
        Route::delete('/{schedule}', [ScheduleController::class, 'destroy'])->middleware('permission:schedules.delete');
        
        // Schedule generation and validation
        Route::post('/generate', [ScheduleController::class, 'generate'])->middleware('permission:schedules.create');
        Route::post('/validate', [ScheduleController::class, 'validate'])->middleware('permission:schedules.create');
        Route::post('/{schedule}/approve', [ScheduleController::class, 'approve'])->middleware('permission:schedules.approve');
        Route::post('/export', [ScheduleController::class, 'export'])->middleware('permission:schedules.read');
    });

    // Student Management API Routes - Phase 1 Implementation
    Route::prefix('students')->group(function () {
        Route::get('/', [App\Http\Controllers\StudentController::class, 'index'])->middleware('permission:students.read');
        Route::post('/', [App\Http\Controllers\StudentController::class, 'store'])->middleware(['permission:students.create', 'audit.logging']);
        Route::get('/{student}', [App\Http\Controllers\StudentController::class, 'show'])->middleware('permission:students.read');
        Route::put('/{student}', [App\Http\Controllers\StudentController::class, 'update'])->middleware(['permission:students.update', 'audit.logging']);
        Route::delete('/{student}', [App\Http\Controllers\StudentController::class, 'destroy'])->middleware(['permission:students.delete', 'audit.logging']);

        // Student enrollment operations
        Route::post('/{student}/enroll', [App\Http\Controllers\StudentController::class, 'enroll'])->middleware(['permission:students.update', 'audit.logging']);
        Route::get('/{student}/performance', [App\Http\Controllers\StudentController::class, 'performance'])->middleware('permission:students.read');

        // Bulk operations
        Route::post('/bulk/import', [App\Http\Controllers\StudentController::class, 'bulkImport'])->middleware(['permission:students.create', 'audit.logging']);
        Route::post('/bulk/promote', [App\Http\Controllers\StudentController::class, 'bulkPromote'])->middleware(['permission:students.update', 'audit.logging']);
        Route::post('/bulk/transfer', [App\Http\Controllers\StudentController::class, 'bulkTransfer'])->middleware(['permission:students.update', 'audit.logging']);
        Route::post('/bulk/activate', [App\Http\Controllers\StudentController::class, 'bulkActivate'])->middleware(['permission:students.update', 'audit.logging']);
        Route::post('/bulk/deactivate', [App\Http\Controllers\StudentController::class, 'bulkDeactivate'])->middleware(['permission:students.update', 'audit.logging']);
        
        // Export operations
        Route::post('/export', [App\Http\Controllers\StudentController::class, 'export'])->middleware('permission:students.read');
        Route::get('/statistics', [App\Http\Controllers\StudentController::class, 'statistics'])->middleware('permission:students.read');
    });

    // Classes Management API Routes - Phase 2 Implementation
    Route::prefix('classes')->group(function () {
        Route::get('/', [App\Http\Controllers\ClassesController::class, 'index'])->middleware('permission:classes.read');
        Route::post('/', [App\Http\Controllers\ClassesController::class, 'store'])->middleware(['permission:classes.create', 'audit.logging']);
        Route::get('/{class}', [App\Http\Controllers\ClassesController::class, 'show'])->middleware('permission:classes.read');
        Route::put('/{class}', [App\Http\Controllers\ClassesController::class, 'update'])->middleware(['permission:classes.update', 'audit.logging']);
        Route::delete('/{class}', [App\Http\Controllers\ClassesController::class, 'destroy'])->middleware(['permission:classes.delete', 'audit.logging']);

        // Class-student relationship management
        Route::get('/{class}/students', [App\Http\Controllers\ClassesController::class, 'students'])->middleware('permission:classes.read');
        Route::post('/{class}/assign-teacher', [App\Http\Controllers\ClassesController::class, 'assignTeacher'])->middleware(['permission:classes.assign', 'audit.logging']);
        
        // Class subjects management - TODO: Implement ClassSubjectsController
        // Route::get('/{class}/subjects', [App\Http\Controllers\ClassSubjectsController::class, 'index'])->middleware('permission:classes.read');
        // Route::post('/{class}/subjects', [App\Http\Controllers\ClassSubjectsController::class, 'assign'])->middleware(['permission:classes.assign', 'audit.logging']);
        // Route::delete('/{class}/subjects/{subject}', [App\Http\Controllers\ClassSubjectsController::class, 'remove'])->middleware(['permission:classes.assign', 'audit.logging']);

        // Class schedule management  
        Route::get('/{class}/schedule', [App\Http\Controllers\ClassesController::class, 'schedule'])->middleware('permission:classes.read');

        // Bulk operations
        Route::post('/bulk/create', [App\Http\Controllers\ClassesController::class, 'bulkCreate'])->middleware(['permission:classes.create', 'audit.logging']);
        Route::post('/bulk/activate', [App\Http\Controllers\ClassesController::class, 'bulkActivate'])->middleware(['permission:classes.update', 'audit.logging']);
        Route::post('/bulk/deactivate', [App\Http\Controllers\ClassesController::class, 'bulkDeactivate'])->middleware(['permission:classes.update', 'audit.logging']);
        
        // Statistics and reports
        Route::get('/statistics', [App\Http\Controllers\ClassesController::class, 'statistics'])->middleware('permission:classes.read');
    });

    // Subjects Management API Routes - Phase 3 Implementation
    Route::prefix('subjects')->group(function () {
        Route::get('/', [App\Http\Controllers\SubjectsController::class, 'index'])->middleware('permission:subjects.read');
        Route::post('/', [App\Http\Controllers\SubjectsController::class, 'store'])->middleware(['permission:subjects.create', 'audit.logging']);
        Route::get('/{subject}', [App\Http\Controllers\SubjectsController::class, 'show'])->middleware('permission:subjects.read');
        Route::put('/{subject}', [App\Http\Controllers\SubjectsController::class, 'update'])->middleware(['permission:subjects.update', 'audit.logging']);
        Route::delete('/{subject}', [App\Http\Controllers\SubjectsController::class, 'destroy'])->middleware(['permission:subjects.delete', 'audit.logging']);

        // Subject-teacher assignment management
        Route::post('/{subject}/assign-teacher', [App\Http\Controllers\SubjectsController::class, 'assignTeacher'])->middleware(['permission:subjects.assign', 'audit.logging']);
        
        // Subject queries by grade level
        Route::get('/by-grade/{gradeLevel}', [App\Http\Controllers\SubjectsController::class, 'byGradeLevel'])->middleware('permission:subjects.read');
        
        // Statistics and reports
        Route::get('/statistics', [App\Http\Controllers\SubjectsController::class, 'statistics'])->middleware('permission:subjects.read');
    });

    // Room Management API Routes - Phase 2 Implementation
    Route::prefix('rooms')->group(function () {
        Route::get('/', [RoomController::class, 'index'])->middleware('permission:rooms.read');
        Route::post('/', [RoomController::class, 'store'])->middleware(['permission:rooms.create', 'audit.logging']);
        Route::get('/{room}', [RoomController::class, 'show'])->middleware('permission:rooms.read');
        Route::put('/{room}', [RoomController::class, 'update'])->middleware(['permission:rooms.update', 'audit.logging']);
        Route::delete('/{room}', [RoomController::class, 'destroy'])->middleware(['permission:rooms.delete', 'audit.logging']);

        // Room facilities management
        Route::patch('/{room}/facilities', [RoomController::class, 'manageFacilities'])->middleware(['permission:rooms.update', 'audit.logging']);
        
        // Room availability and assignment
        Route::get('/available', [RoomController::class, 'getAvailableRooms'])->middleware('permission:rooms.read');
        
        // Statistics and reports
        Route::get('/statistics', [RoomController::class, 'statistics'])->middleware('permission:rooms.read');
    });

    // Grade Management API Routes - Phase 2 Implementation
    Route::prefix('grades')->group(function () {
        Route::get('/', [GradeController::class, 'index'])->middleware('permission:grades.read');
        Route::post('/', [GradeController::class, 'store'])->middleware(['permission:grades.create', 'audit.logging']);
        Route::get('/{grade}', [GradeController::class, 'show'])->middleware('permission:grades.read');
        Route::put('/{grade}', [GradeController::class, 'update'])->middleware(['permission:grades.update', 'audit.logging']);
        Route::delete('/{grade}', [GradeController::class, 'destroy'])->middleware(['permission:grades.delete', 'audit.logging']);

        // Grade student assignment
        Route::post('/{grade}/assign-students', [GradeController::class, 'assignStudents'])->middleware(['permission:grades.assign', 'audit.logging']);
        
        // Statistics and reports
        Route::get('/statistics', [GradeController::class, 'statistics'])->middleware('permission:grades.read');
    });

    // Event Management API Routes - Phase 3 Implementation (UBR Role Focus)
    Route::prefix('events')->group(function () {
        Route::get('/', [SchoolEventController::class, 'index'])->middleware('permission:events.read');
        Route::post('/', [SchoolEventController::class, 'store'])->middleware(['permission:events.create', 'audit.logging']);
        Route::get('/{event}', [SchoolEventController::class, 'show'])->middleware('permission:events.read');
        Route::put('/{event}', [SchoolEventController::class, 'update'])->middleware(['permission:events.update', 'audit.logging']);
        Route::delete('/{event}', [SchoolEventController::class, 'destroy'])->middleware(['permission:events.delete', 'audit.logging']);

        // Event approval and management
        Route::post('/{event}/approve', [SchoolEventController::class, 'approve'])->middleware(['permission:events.approve', 'audit.logging']);
        Route::post('/{event}/cancel', [SchoolEventController::class, 'cancel'])->middleware(['permission:events.cancel', 'audit.logging']);
        
        // Statistics and reports
        Route::get('/statistics', [SchoolEventController::class, 'statistics'])->middleware('permission:events.read');
    });

    // Psychology Support API Routes - Phase 3 Implementation
    Route::prefix('psychology')->group(function () {
        Route::get('/sessions', [PsychologyController::class, 'index'])->middleware('permission:psychology.read');
        Route::post('/sessions', [PsychologyController::class, 'store'])->middleware(['permission:psychology.create', 'audit.logging']);
        Route::get('/sessions/{session}', [PsychologyController::class, 'show'])->middleware('permission:psychology.read');
        Route::post('/sessions/{session}/complete', [PsychologyController::class, 'complete'])->middleware(['permission:psychology.manage', 'audit.logging']);
        
        // Session notes management
        Route::post('/sessions/{session}/notes', [PsychologyController::class, 'storeNote'])->middleware(['permission:psychology.create', 'audit.logging']);
        
        // Session assessments management
        Route::post('/sessions/{session}/assessments', [PsychologyController::class, 'storeAssessment'])->middleware(['permission:psychology.create', 'audit.logging']);
        Route::post('/assessments/{assessment}/complete', [PsychologyController::class, 'completeAssessment'])->middleware(['permission:psychology.manage', 'audit.logging']);
        
        // Statistics and reports
        Route::get('/statistics', [PsychologyController::class, 'statistics'])->middleware('permission:psychology.read');
    });

    // Inventory Management API Routes - Refactored Structure
    
    // Core inventory CRUD operations
    Route::apiResource('inventory', InventoryController::class)->middleware('auth:sanctum');
    
    // Additional CRUD endpoints
    Route::prefix('inventory')->group(function () {
        Route::get('{item}/public', [InventoryController::class, 'getItemForPublicView'])
            ->middleware('permission:inventory.read');
        Route::post('{item}/duplicate', [InventoryController::class, 'duplicate'])
            ->middleware(['permission:inventory.create', 'audit.logging']);
        Route::get('categories', [InventoryController::class, 'categories'])
            ->middleware('permission:inventory.read');
        Route::get('search', [InventoryController::class, 'search'])
            ->middleware('permission:inventory.read');
    });

    // Inventory transaction operations
    Route::prefix('inventory/transactions')->middleware('permission:inventory.transactions')->group(function () {
        // Item assignment and return operations
        Route::post('{item}/assign', [InventoryTransactionController::class, 'assign'])
            ->middleware(['permission:inventory.assign', 'audit.logging']);
        Route::post('{item}/return', [InventoryTransactionController::class, 'returnItem'])
            ->middleware(['permission:inventory.assign', 'audit.logging']);
        Route::put('{item}/stock', [InventoryTransactionController::class, 'updateStock'])
            ->middleware(['permission:inventory.manage', 'audit.logging']);
        Route::post('{item}/transfer', [InventoryTransactionController::class, 'transfer'])
            ->middleware(['permission:inventory.assign', 'audit.logging']);
        
        // Transaction history and tracking
        Route::get('{item}/history', [InventoryTransactionController::class, 'history'])
            ->middleware('permission:inventory.read');
        Route::get('{item}/summary', [InventoryTransactionController::class, 'summary'])
            ->middleware('permission:inventory.read');
        
        // Bulk operations
        Route::post('bulk/assign/preview', [InventoryTransactionController::class, 'bulkAssignPreview'])
            ->middleware('permission:inventory.assign');
        Route::post('bulk/assign', [InventoryTransactionController::class, 'bulkAssign'])
            ->middleware(['permission:inventory.assign', 'audit.logging']);
        Route::post('bulk/return', [InventoryTransactionController::class, 'bulkReturn'])
            ->middleware(['permission:inventory.assign', 'audit.logging']);
        
        // User and system reports
        Route::get('user/{user_id}/assignments', [InventoryTransactionController::class, 'userAssignments'])
            ->middleware('permission:inventory.read');
        Route::get('overdue-returns', [InventoryTransactionController::class, 'overdueReturns'])
            ->middleware('permission:inventory.read');
        Route::get('statistics', [InventoryTransactionController::class, 'statistics'])
            ->middleware('permission:inventory.read');
    });

    // Inventory maintenance operations
    Route::prefix('inventory/maintenance')->middleware('permission:inventory.maintenance')->group(function () {
        // Individual item maintenance
        Route::post('{item}/schedule', [InventoryMaintenanceController::class, 'schedule'])
            ->middleware(['permission:inventory.maintenance', 'audit.logging']);
        Route::get('{item}/records', [InventoryMaintenanceController::class, 'records'])
            ->middleware('permission:inventory.read');
        
        // Maintenance record operations (using MaintenanceRecord model binding)
        Route::post('{maintenance}/start', [InventoryMaintenanceController::class, 'start'])
            ->middleware(['permission:inventory.maintenance', 'audit.logging']);
        Route::post('{maintenance}/complete', [InventoryMaintenanceController::class, 'complete'])
            ->middleware(['permission:inventory.maintenance', 'audit.logging']);
        Route::post('{maintenance}/cancel', [InventoryMaintenanceController::class, 'cancel'])
            ->middleware(['permission:inventory.maintenance', 'audit.logging']);
        Route::put('{maintenance}/status', [InventoryMaintenanceController::class, 'updateStatus'])
            ->middleware(['permission:inventory.maintenance', 'audit.logging']);
        
        // Schedule and planning
        Route::get('schedule', [InventoryMaintenanceController::class, 'getSchedule'])
            ->middleware('permission:inventory.read');
        Route::get('upcoming-due', [InventoryMaintenanceController::class, 'upcomingDue'])
            ->middleware('permission:inventory.read');
        Route::get('overdue', [InventoryMaintenanceController::class, 'overdue'])
            ->middleware('permission:inventory.read');
        Route::get('calendar', [InventoryMaintenanceController::class, 'calendar'])
            ->middleware('permission:inventory.read');
        
        // Bulk operations and reporting
        Route::post('bulk/schedule', [InventoryMaintenanceController::class, 'bulkSchedule'])
            ->middleware(['permission:inventory.maintenance', 'audit.logging']);
        Route::get('statistics', [InventoryMaintenanceController::class, 'statistics'])
            ->middleware('permission:inventory.read');
        Route::get('cost-summary', [InventoryMaintenanceController::class, 'costSummary'])
            ->middleware('permission:inventory.read');
    });

    // Inventory analytics and reporting
    Route::prefix('inventory/analytics')->middleware('permission:inventory.analytics')->group(function () {
        // Core analytics
        Route::get('statistics', [InventoryAnalyticsController::class, 'statistics']);
        Route::get('dashboard', [InventoryAnalyticsController::class, 'dashboard']);
        
        // Financial reports
        Route::get('valuation', [InventoryAnalyticsController::class, 'valuation']);
        Route::get('depreciation', [InventoryAnalyticsController::class, 'depreciation']);
        Route::get('cost-trends', [InventoryAnalyticsController::class, 'costTrends']);
        Route::get('roi-analysis', [InventoryAnalyticsController::class, 'roiAnalysis']);
        
        // Performance reports
        Route::get('utilization', [InventoryAnalyticsController::class, 'utilization']);
        Route::get('category-performance', [InventoryAnalyticsController::class, 'categoryPerformance']);
        Route::get('institution-comparison', [InventoryAnalyticsController::class, 'institutionComparison']);
        Route::get('asset-lifecycle', [InventoryAnalyticsController::class, 'assetLifecycle']);
        
        // Maintenance analytics
        Route::get('maintenance-costs', [InventoryAnalyticsController::class, 'maintenanceCosts']);
        
        // Advanced analytics
        Route::get('predictive', [InventoryAnalyticsController::class, 'predictiveAnalytics']);
        Route::get('compliance', [InventoryAnalyticsController::class, 'complianceReport']);
        Route::get('benchmarks', [InventoryAnalyticsController::class, 'benchmarks']);
        
        // Custom reports and export
        Route::post('custom-report', [InventoryAnalyticsController::class, 'customReport']);
        Route::post('export', [InventoryAnalyticsController::class, 'export']);
    });

    // Teacher Performance API Routes - Phase 3 Implementation  
    Route::prefix('teacher-performance')->group(function () {
        Route::get('/evaluations', [TeacherPerformanceController::class, 'index'])->middleware('permission:view teacher_performance');
        Route::post('/evaluations', [TeacherPerformanceController::class, 'store'])->middleware(['permission:create teacher_performance', 'audit.logging']);
        Route::get('/evaluations/{evaluation}', [TeacherPerformanceController::class, 'show'])->middleware('permission:view teacher_performance');
        Route::put('/evaluations/{evaluation}', [TeacherPerformanceController::class, 'update'])->middleware(['permission:edit teacher_performance', 'audit.logging']);
        Route::delete('/evaluations/{evaluation}', [TeacherPerformanceController::class, 'destroy'])->middleware(['permission:delete teacher_performance', 'audit.logging']);
        
        // Evaluation lifecycle management
        Route::post('/evaluations/{evaluation}/complete', [TeacherPerformanceController::class, 'complete'])->middleware(['permission:edit teacher_performance', 'audit.logging']);
        Route::post('/evaluations/{evaluation}/approve', [TeacherPerformanceController::class, 'approve'])->middleware(['permission:manage teacher_performance', 'audit.logging']);
        Route::post('/evaluations/{evaluation}/request-revision', [TeacherPerformanceController::class, 'requestRevision'])->middleware(['permission:manage teacher_performance', 'audit.logging']);
        
        // Goal and recommendation management
        Route::post('/evaluations/{evaluation}/goals', [TeacherPerformanceController::class, 'addGoal'])->middleware(['permission:edit teacher_performance', 'audit.logging']);
        Route::post('/evaluations/{evaluation}/goals/achieved', [TeacherPerformanceController::class, 'markGoalAchieved'])->middleware(['permission:edit teacher_performance', 'audit.logging']);
        Route::post('/evaluations/{evaluation}/recommendations', [TeacherPerformanceController::class, 'addRecommendation'])->middleware(['permission:edit teacher_performance', 'audit.logging']);
        
        // Performance metrics management
        Route::get('/evaluations/{evaluation}/metrics', [TeacherPerformanceController::class, 'getMetrics'])->middleware('permission:view teacher_performance');
        Route::post('/evaluations/{evaluation}/metrics', [TeacherPerformanceController::class, 'addMetric'])->middleware(['permission:edit teacher_performance', 'audit.logging']);
        
        // Teacher performance summaries and statistics
        Route::get('/teachers/{teacherId}/summary', [TeacherPerformanceController::class, 'getTeacherSummary'])->middleware('permission:view teacher_performance');
        Route::get('/institutions/{institutionId}/statistics', [TeacherPerformanceController::class, 'getInstitutionStats'])->middleware('permission:view teacher_performance');
    });

    // Assessment System Routes - KSQ/BSQ Results Management
    Route::prefix('assessments')->middleware('permission:assessments.read')->group(function () {
        // Assessment overview and analytics
        Route::get('/', [App\Http\Controllers\AssessmentController::class, 'index']);
        Route::get('/analytics', [App\Http\Controllers\AssessmentController::class, 'getAnalytics']);
        Route::get('/rankings', [App\Http\Controllers\AssessmentController::class, 'getRankings']);
        Route::post('/export', [App\Http\Controllers\AssessmentController::class, 'export']);

        // KSQ (Keyfiyyət Standartları Qiymətləndirməsi) Routes
        Route::prefix('ksq')->group(function () {
            Route::post('/', [App\Http\Controllers\AssessmentController::class, 'storeKSQ'])->middleware('permission:assessments.create');
            Route::post('/{id}/approve', function ($id) {
                return app(App\Http\Controllers\AssessmentController::class)->approve(request(), 'ksq', $id);
            })->middleware('permission:assessments.approve');
        });

        // BSQ (Beynəlxalq Standartlar Qiymətləndirməsi) Routes  
        Route::prefix('bsq')->group(function () {
            Route::post('/', [App\Http\Controllers\AssessmentController::class, 'storeBSQ'])->middleware('permission:assessments.create');
            Route::post('/{id}/approve', function ($id) {
                return app(App\Http\Controllers\AssessmentController::class)->approve(request(), 'bsq', $id);
            })->middleware('permission:assessments.approve');
        });
    });

    // Assessment Types Management Routes
    Route::prefix('assessment-types')->middleware('auth:sanctum')->group(function () {
        Route::get('/', [AssessmentTypeController::class, 'index']);
        Route::get('/dropdown', [AssessmentTypeController::class, 'dropdown']);
        Route::get('/{assessmentType}', [AssessmentTypeController::class, 'show']);
        
        // Only superadmin and regionadmin can create, update, delete
        Route::post('/', [AssessmentTypeController::class, 'store'])->middleware('role:superadmin|regionadmin');
        Route::put('/{assessmentType}', [AssessmentTypeController::class, 'update'])->middleware('role:superadmin|regionadmin');
        Route::delete('/{assessmentType}', [AssessmentTypeController::class, 'destroy'])->middleware('role:superadmin|regionadmin');
        Route::post('/{assessmentType}/toggle-status', [AssessmentTypeController::class, 'toggleStatus'])->middleware('role:superadmin|regionadmin');
    });

    // Assessment Student Management Routes
    Route::prefix('assessment-students')->middleware('auth:sanctum')->group(function () {
        Route::get('/institutions/{institutionId}/students', [AssessmentStudentController::class, 'getStudentsByInstitution']);
        Route::get('/institutions/{institutionId}/grade-levels', [AssessmentStudentController::class, 'getGradeLevels']);
        Route::get('/institutions/{institutionId}/classes', [AssessmentStudentController::class, 'getClasses']);
        Route::get('/institutions/{institutionId}/count', [AssessmentStudentController::class, 'getStudentCount']);
    });

    // Assessment Entry Management Routes
    Route::prefix('assessment-entries')->middleware('auth:sanctum')->group(function () {
        Route::get('/', [AssessmentEntryController::class, 'index']);
        Route::post('/', [AssessmentEntryController::class, 'store'])->middleware('role:superadmin|regionadmin');
        Route::get('/{assessmentEntry}', [AssessmentEntryController::class, 'show']);
        Route::put('/{assessmentEntry}', [AssessmentEntryController::class, 'update']);
        Route::delete('/{assessmentEntry}', [AssessmentEntryController::class, 'destroy']);
        Route::post('/{assessmentEntry}/submit', [AssessmentEntryController::class, 'submit']);
        Route::post('/{assessmentEntry}/approve', [AssessmentEntryController::class, 'approve'])->middleware('role:superadmin|regionadmin');
        Route::post('/{assessmentEntry}/reject', [AssessmentEntryController::class, 'reject'])->middleware('role:superadmin|regionadmin');
    });

    // Academic Years Routes
    Route::prefix('academic-years')->middleware('permission:institutions.read')->group(function () {
        Route::get('/', [AcademicYearController::class, 'index']);
        Route::get('/active', [AcademicYearController::class, 'active']);
        Route::get('/{academicYear}', [AcademicYearController::class, 'show']);
    });
});

// Public shared document access (no auth required)
Route::get('shared/{token}', [App\Http\Controllers\DocumentShareController::class, 'access'])->name('documents.shared');

// Public document access via refactored controller
Route::get('documents/public/{token}', [DocumentController::class, 'accessPublic'])->name('documents.public');

// WebSocket Test Routes (for development/testing)
Route::prefix('test/websocket')->group(function () {
    Route::get('info', [TestWebSocketController::class, 'connectionInfo']);
    Route::post('notification', [TestWebSocketController::class, 'testNotification'])->middleware('auth:sanctum');
    Route::post('task', [TestWebSocketController::class, 'testTaskAssignment'])->middleware('auth:sanctum');
    Route::post('survey', [TestWebSocketController::class, 'testSurveyCreation'])->middleware('auth:sanctum');
    Route::post('login', [TestWebSocketController::class, 'testUserLogin'])->middleware('auth:sanctum');
    Route::post('all', [TestWebSocketController::class, 'testAll'])->middleware('auth:sanctum');
});