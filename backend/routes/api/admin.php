<?php

use App\Http\Controllers\UserControllerRefactored as UserController;
use App\Http\Controllers\UserUtilityController;
use App\Http\Controllers\InstitutionController;
use App\Http\Controllers\Institution\InstitutionCRUDControllerRefactored as InstitutionCRUDControllerRefactored;
use App\Http\Controllers\InstitutionTypeController;
use App\Http\Controllers\InstitutionHierarchyController;
use App\Http\Controllers\InstitutionDepartmentController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\API\AssessmentExcelController;
use App\Http\Controllers\API\BulkAssessmentController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\SectorControllerRefactored as SectorController;
use App\Http\Controllers\PreschoolController;
use App\Http\Controllers\API\ApprovalApiControllerRefactored;
use App\Http\Controllers\SettingsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Admin & System Management Routes
|--------------------------------------------------------------------------
|
| Routes for system administration, user management, and configuration
|
*/

// Test role endpoints
Route::middleware('permission:users.test')->group(function () {
    Route::get('test/superadmin', function () {
        return response()->json(['message' => 'SuperAdmin access confirmed']);
    });
    Route::get('test/regionadmin', function () {
        return response()->json(['message' => 'RegionAdmin access confirmed']);
    });
    Route::get('test/schooladmin', function () {
        return response()->json(['message' => 'SchoolAdmin access confirmed']);
    });
    Route::get('test/teacher', function () {
        return response()->json(['message' => 'Teacher access confirmed']);
    });
});

// User management with proper roles
Route::middleware('permission:users.read')->group(function () {
    Route::get('users', [UserController::class, 'index']);
    Route::get('users/{user}', [UserController::class, 'show']);
});

// User bulk operations
Route::middleware('permission:users.write')->group(function () {
    Route::post('users', [UserController::class, 'store']);
    Route::put('users/{user}', [UserController::class, 'update']);
    Route::delete('users/{user}', [UserController::class, 'destroy']);
    Route::post('users/bulk-create', [UserController::class, 'bulkCreate']);
    Route::post('users/bulk-update', [UserController::class, 'bulkUpdate']);
    Route::post('users/bulk-delete', [UserController::class, 'bulkDelete']);
});

// User bulk import/export operations
Route::prefix('users/bulk')->middleware('permission:users.write')->group(function () {
    Route::post('activate', [App\Http\Controllers\UserBulkController::class, 'activate']);
    Route::post('deactivate', [App\Http\Controllers\UserBulkController::class, 'deactivate']);
    Route::post('assign-role', [App\Http\Controllers\UserBulkController::class, 'assignRole']);
    Route::post('assign-institution', [App\Http\Controllers\UserBulkController::class, 'assignInstitution']);
    Route::post('delete', [App\Http\Controllers\UserBulkController::class, 'delete']);
    Route::post('preview', [App\Http\Controllers\UserBulkController::class, 'preview']);
    
    // Import/Export routes
    Route::post('import', [App\Http\Controllers\UserBulkController::class, 'importUsers']);
    Route::post('export', [App\Http\Controllers\UserBulkController::class, 'exportUsers']);
});

// User bulk read operations (templates and statistics)
Route::middleware('permission:users.read')->group(function () {
    Route::get('users/bulk/download-template', [App\Http\Controllers\UserBulkController::class, 'downloadTemplate']);
    Route::get('users/bulk/statistics', [App\Http\Controllers\UserBulkController::class, 'statistics']);
});

// Users helper endpoints
Route::middleware('permission:users.read')->group(function () {
    Route::get('users/search/{query}', [UserController::class, 'search']);
    Route::get('users/roles/available', [UserController::class, 'getAvailableRoles']);
    Route::get('users/institutions/available', [UserUtilityController::class, 'institutions']);
    Route::get('users/departments/available', [UserUtilityController::class, 'departments']);
    Route::post('users/check-email-unique', [UserUtilityController::class, 'checkEmailUnique']);
});

// Institution bulk operations (must be before parameterized routes)
Route::middleware('permission:institutions.write')->group(function () {
    Route::post('institutions/bulk-create', [InstitutionController::class, 'bulkCreate']);
    Route::post('institutions/bulk-update', [InstitutionController::class, 'bulkUpdate']);
    Route::post('institutions/bulk-delete', [InstitutionController::class, 'bulkDelete']);
    Route::post('institutions/{institution}/assign-users', [InstitutionController::class, 'assignUsers']);
    Route::delete('institutions/{institution}/remove-users', [InstitutionController::class, 'removeUsers']);
});

// Institution management routes (resource routes)
Route::middleware('permission:institutions.read')->group(function () {
    Route::get('institutions', [InstitutionController::class, 'index']);
    Route::get('institutions/{institution}', [InstitutionController::class, 'show']);
    Route::get('institutions/{institution}/users', [InstitutionController::class, 'getUsers']);
    Route::get('institutions/{institution}/children', [InstitutionController::class, 'getChildren']);
    Route::get('institutions/{institution}/hierarchy', [InstitutionController::class, 'getHierarchy']);
    Route::get('institutions/search/{query}', [InstitutionController::class, 'search']);
    Route::get('institutions/{institution}/stats', [InstitutionController::class, 'getStats']);
});

Route::middleware('permission:institutions.write')->group(function () {
    Route::post('institutions', [InstitutionController::class, 'store']);
    Route::put('institutions/{institution}', [InstitutionController::class, 'update']);
    Route::delete('institutions/{institution}', [InstitutionController::class, 'destroy']);
    
    // Import/Export routes
    Route::post('institutions/import/template', [InstitutionController::class, 'downloadImportTemplate']);
    Route::post('institutions/import', [InstitutionController::class, 'importFromTemplate']);
    Route::post('institutions/export', [InstitutionController::class, 'exportInstitutions']);
    
    // Type-based Import/Export routes
    Route::post('institutions/import/template-by-type', [InstitutionCRUDControllerRefactored::class, 'downloadImportTemplateByType']);
    Route::post('institutions/import-by-type', [InstitutionCRUDControllerRefactored::class, 'importFromTemplateByType']);
    Route::post('institutions/export-by-type', [InstitutionCRUDControllerRefactored::class, 'exportInstitutionsByType']);
});

// Institution Types Management (SuperAdmin only)
Route::middleware('role:superadmin')->prefix('institution-types')->group(function () {
    Route::get('/', [InstitutionTypeController::class, 'index']);
    Route::post('/', [InstitutionTypeController::class, 'store']);
    Route::get('/{institutionType}', [InstitutionTypeController::class, 'show']);
    Route::put('/{institutionType}', [InstitutionTypeController::class, 'update']);
    Route::delete('/{institutionType}', [InstitutionTypeController::class, 'destroy']);
    Route::post('/bulk-create', [InstitutionTypeController::class, 'bulkCreate']);
    Route::get('/search/{query}', [InstitutionTypeController::class, 'search']);
    Route::get('/{institutionType}/institutions', [InstitutionTypeController::class, 'getInstitutions']);
});

// Institution Hierarchy Management
Route::middleware('permission:institutions.hierarchy')->group(function () {
    Route::get('hierarchy', [InstitutionHierarchyController::class, 'getHierarchy']);
    Route::get('institutions-hierarchy', [InstitutionHierarchyController::class, 'getHierarchy']);
    Route::get('hierarchy/children/{institution}', [InstitutionHierarchyController::class, 'getSubTree']);
    Route::get('hierarchy/path/{institution}', [InstitutionHierarchyController::class, 'getPath']);
});

// Department management (institution-specific)
Route::middleware('permission:departments.read')->group(function () {
    Route::get('institutions/{institution}/departments', [InstitutionDepartmentController::class, 'index']);
    Route::get('institutions/{institution}/departments/{department}', [InstitutionDepartmentController::class, 'show']);
});

Route::middleware('permission:departments.write')->group(function () {
    Route::post('institutions/{institution}/departments', [InstitutionDepartmentController::class, 'store']);
    Route::put('institutions/{institution}/departments/{department}', [InstitutionDepartmentController::class, 'update']);
    Route::delete('institutions/{institution}/departments/{department}', [InstitutionDepartmentController::class, 'destroy']);
});

// Global department routes
Route::middleware('permission:departments.read')->group(function () {
    Route::get('departments', [DepartmentController::class, 'index']);
    Route::get('departments/types', [DepartmentController::class, 'getTypes']);
    Route::get('departments/types-for-institution', [DepartmentController::class, 'getTypesForInstitution']);
    Route::get('departments/{department}', [DepartmentController::class, 'show']);
});

Route::middleware('permission:departments.write')->group(function () {
    Route::post('departments', [DepartmentController::class, 'store']);
    Route::put('departments/{department}', [DepartmentController::class, 'update']);
    Route::delete('departments/{department}', [DepartmentController::class, 'destroy']);
});

// Enhanced role hierarchy routes
Route::middleware('permission:roles.read')->group(function () {
    Route::get('roles', [RoleController::class, 'index']);
    Route::get('roles/{role}', [RoleController::class, 'show']);
    Route::get('roles/{role}/permissions', [RoleController::class, 'getPermissions']);
    Route::get('roles/{role}/users', [RoleController::class, 'getUsers']);
    Route::get('roles/hierarchy', [RoleController::class, 'getHierarchy']);
    Route::get('permissions', [RoleController::class, 'getAllPermissions']);
});

Route::middleware('permission:roles.write')->group(function () {
    Route::post('roles', [RoleController::class, 'store']);
    Route::put('roles/{role}', [RoleController::class, 'update']);
    Route::delete('roles/{role}', [RoleController::class, 'destroy']);
    Route::post('roles/{role}/permissions', [RoleController::class, 'attachPermission']);
    Route::delete('roles/{role}/permissions/{permission}', [RoleController::class, 'detachPermission']);
    Route::post('roles/{role}/users', [RoleController::class, 'assignToUser']);
    Route::delete('roles/{role}/users/{user}', [RoleController::class, 'removeFromUser']);
});

// System configuration (admin only)
Route::prefix('system')->middleware('permission:system.config')->group(function () {
    Route::get('config', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'getSystemConfig']);
    Route::put('config', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'updateSystemConfig']);
    
    // System information
    Route::get('info', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'getSystemInfo']);
    
    // System health check
    Route::get('health', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'checkSystemHealth']);
    
    // Cache management
    Route::post('cache/clear', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'clearCache']);
    Route::post('cache/optimize', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'optimizeCache']);
    
    // System maintenance
    Route::post('maintenance/up', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'bringUpMaintenance']);
    Route::post('maintenance/down', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'bringDownMaintenance']);
    
    // Permissions
    Route::get('permissions', [RoleController::class, 'getAllPermissions']);
    
    // Backup and restore
    Route::post('backup/create', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'createBackup']);
    Route::get('backup/list', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'listBackups']);
    Route::post('backup/restore/{filename}', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'restoreBackup']);
    
    // Logs
    Route::get('logs', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'getLogs']);
    Route::get('logs/{log}', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'getLogFile']);
    
    // Scheduled reports
    Route::get('reports/scheduled', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'getScheduledReports']);
    Route::post('reports/schedule', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'scheduleReport']);
    Route::delete('reports/schedule/{id}', [\App\Http\Controllers\SystemConfigControllerRefactored::class, 'deleteScheduledReport']);
});

// Academic years management
Route::prefix('academic-years')->middleware('permission:institutions.read')->group(function () {
    Route::get('/', [App\Http\Controllers\AcademicYearController::class, 'index']);
    Route::post('/', [App\Http\Controllers\AcademicYearController::class, 'store'])->middleware('permission:institutions.write');
    Route::get('/{academicYear}', [App\Http\Controllers\AcademicYearController::class, 'show']);
    Route::put('/{academicYear}', [App\Http\Controllers\AcademicYearController::class, 'update'])->middleware('permission:institutions.write');
    Route::delete('/{academicYear}', [App\Http\Controllers\AcademicYearController::class, 'destroy'])->middleware('permission:institutions.write');
    Route::get('/current/active', [App\Http\Controllers\AcademicYearController::class, 'getCurrentAcademicYear']);
    Route::post('/{academicYear}/activate', [App\Http\Controllers\AcademicYearController::class, 'activate'])->middleware('permission:institutions.write');
    Route::get('/institution/{institution}', [App\Http\Controllers\AcademicYearController::class, 'getByInstitution']);
});

// Subjects management  
Route::prefix('subjects')->group(function () {
    // Read operations - available to all authorized roles
    Route::get('/', [SubjectController::class, 'index'])->middleware('permission:subjects.read');
    Route::get('/statistics', [SubjectController::class, 'statistics'])->middleware('permission:subjects.read');
    Route::get('/by-category', [SubjectController::class, 'getByCategory'])->middleware('permission:subjects.read');
    Route::get('/for-grade/{grade}', [SubjectController::class, 'getForGrade'])->middleware('permission:subjects.read');
    Route::get('/{subject}', [SubjectController::class, 'show'])->middleware('permission:subjects.read');
    
    // Write operations - restricted to SuperAdmin and RegionAdmin only
    Route::middleware(['role:superadmin|regionadmin'])->group(function () {
        Route::post('/', [SubjectController::class, 'store']);
        Route::put('/{subject}', [SubjectController::class, 'update']);
        Route::delete('/{subject}', [SubjectController::class, 'destroy']);
        
        // Bulk operations
        Route::post('/bulk-create', [SubjectController::class, 'bulkCreate']);
        Route::post('/bulk-update', [SubjectController::class, 'bulkUpdate']);
        Route::post('/bulk-delete', [SubjectController::class, 'bulkDelete']);
    });
});

// Assessment Excel import/export
Route::prefix('assessment-excel')->middleware('auth:sanctum')->group(function () {
    Route::post('/', [AssessmentExcelController::class, 'import'])->middleware('permission:assessments.import');
    Route::get('/export', [AssessmentExcelController::class, 'export'])->middleware('permission:assessments.export');
    Route::get('/template', [AssessmentExcelController::class, 'downloadTemplate']);
    Route::get('/history', [AssessmentExcelController::class, 'getImportHistory'])->middleware('permission:assessments.read');
    Route::get('/status/{importId}', [AssessmentExcelController::class, 'getImportStatus']);
    Route::post('/validate', [AssessmentExcelController::class, 'validateFile']);
});

// Bulk assessment operations
Route::prefix('bulk-assessments')->middleware('auth:sanctum')->group(function () {
    Route::post('/create', [BulkAssessmentController::class, 'bulkCreate'])->middleware('permission:assessments.bulk');
    Route::put('/update', [BulkAssessmentController::class, 'bulkUpdate'])->middleware('permission:assessments.bulk');
    Route::delete('/delete', [BulkAssessmentController::class, 'bulkDelete'])->middleware('permission:assessments.bulk');
    Route::get('/sessions', [BulkAssessmentController::class, 'getSessions'])->middleware('permission:assessments.read');
    Route::get('/sessions/{sessionId}', [BulkAssessmentController::class, 'getSession'])->middleware('permission:assessments.read');
    Route::post('/sessions/{sessionId}/approve', [BulkAssessmentController::class, 'approveSession'])->middleware('permission:assessments.approve');
});

// Import/Export routes (accessible by different roles)
Route::prefix('import')->group(function () {
    // Import operations
    Route::post('/students', [App\Http\Controllers\ImportController::class, 'importStudents'])->middleware('permission:users.import');
    Route::post('/teachers', [App\Http\Controllers\ImportController::class, 'importTeachers'])->middleware('permission:users.import');
    Route::post('/institutions', [App\Http\Controllers\ImportController::class, 'importInstitutions'])->middleware('role:superadmin');
    
    // Template downloads
    Route::get('/template', [App\Http\Controllers\ImportController::class, 'downloadTemplate']);
    Route::get('/template/download/{type}', [App\Http\Controllers\ImportController::class, 'downloadTemplateFile'])->name('import.template.download');
    
    // UTIS code generation (SuperAdmin only)
    Route::post('/generate-utis-codes', [App\Http\Controllers\ImportController::class, 'generateMissingUtisCode'])->middleware('role:superadmin');
    
    // Export operations (SuperAdmin only)
    Route::get('/export/institutions', [App\Http\Controllers\ImportController::class, 'exportInstitutions'])->middleware('role:superadmin');
    Route::get('/export/stats', [App\Http\Controllers\ImportController::class, 'getExportStats'])->middleware('role:superadmin');
});

// Sectors management routes
Route::prefix('sectors')->middleware('permission:institutions.read')->group(function () {
    Route::get('/', [SectorController::class, 'index']);
    Route::get('/statistics', [SectorController::class, 'statistics']);
    Route::get('/managers/available', [SectorController::class, 'getAvailableManagers']);
    Route::get('/{sector}', [SectorController::class, 'show'])->middleware('permission:institutions.read');
    Route::post('/', [SectorController::class, 'store'])->middleware('permission:institutions.write');
    Route::put('/{sector}', [SectorController::class, 'update'])->middleware('permission:institutions.write');
    Route::delete('/{sector}', [SectorController::class, 'destroy'])->middleware('permission:institutions.write');
    Route::post('/{sector}/toggle-status', [SectorController::class, 'toggleStatus'])->middleware('permission:institutions.write');
    Route::get('/{sector}/tasks', [SectorController::class, 'getTasks']);
    Route::post('/{sector}/tasks', [SectorController::class, 'createTask'])->middleware('permission:tasks.write');
    Route::get('/{sector}/task-statistics', [SectorController::class, 'getTaskStatistics']);
    Route::get('/{sector}/documents', [SectorController::class, 'getDocuments']);
    Route::post('/{sector}/documents', [SectorController::class, 'uploadDocument'])->middleware('permission:documents.write');
    Route::get('/{sector}/document-statistics', [SectorController::class, 'getDocumentStatistics']);
    Route::post('/{sector}/documents/{document}/share', [SectorController::class, 'shareDocument'])->middleware('permission:documents.write');
});

// Preschools management routes
Route::prefix('preschools')->middleware('permission:institutions.read')->group(function () {
    Route::get('/', [PreschoolController::class, 'index']);
    Route::get('/statistics', [PreschoolController::class, 'getPreschoolStatistics']);
    Route::get('/{preschool}', [PreschoolController::class, 'show'])->middleware('permission:institutions.read');
    Route::post('/', [PreschoolController::class, 'store'])->middleware('permission:institutions.write');
    Route::put('/{preschool}', [PreschoolController::class, 'update'])->middleware('permission:institutions.write');
    Route::delete('/{preschool}', [PreschoolController::class, 'destroy'])->middleware('permission:institutions.write');
    Route::post('/{preschool}/assign-manager', [PreschoolController::class, 'assignManager'])->middleware('permission:institutions.write');
});

// Approval System Routes
Route::prefix('approvals')->group(function () {
    // Get approval requests (role-based filtering in controller)
    Route::get('/', [ApprovalApiControllerRefactored::class, 'index'])->middleware('permission:approvals.read');
    Route::get('/pending', [ApprovalApiControllerRefactored::class, 'getPending'])->middleware('permission:approvals.read');
    Route::get('/my-approvals', [ApprovalApiControllerRefactored::class, 'getMyApprovals'])->middleware('permission:approvals.read');
    
    // Workflow templates (SuperAdmin and RegionAdmin) - BEFORE {approval} route
    Route::get('/templates', [ApprovalApiControllerRefactored::class, 'getTemplates'])->middleware('role:superadmin|regionadmin');
    
    // Analytics and reports - BEFORE {approval} route
    Route::get('/analytics', [ApprovalApiControllerRefactored::class, 'getAnalytics'])->middleware('permission:approvals.read');
    
    // Survey Response Approval - BEFORE {approval} route
    Route::get('/surveys', [ApprovalApiControllerRefactored::class, 'getSurveysForApproval'])->middleware('permission:approvals.read');
    Route::get('/survey-responses', [ApprovalApiControllerRefactored::class, 'getSurveyResponses'])->middleware('permission:approvals.read');
    Route::post('/survey-responses/{response}/approve', [ApprovalApiControllerRefactored::class, 'approveSurveyResponse'])->middleware('permission:approvals.approve');
    Route::post('/survey-responses/{response}/reject', [ApprovalApiControllerRefactored::class, 'rejectSurveyResponse'])->middleware('permission:approvals.approve');
    Route::post('/survey-responses/bulk-approve', [ApprovalApiControllerRefactored::class, 'bulkApproveSurveyResponses'])->middleware('permission:approvals.approve');
    Route::post('/survey-responses/bulk-reject', [ApprovalApiControllerRefactored::class, 'bulkRejectSurveyResponses'])->middleware('permission:approvals.approve');
    
    // Event Approval - Consolidated
    Route::post('/events/{event}/approve', [ApprovalApiControllerRefactored::class, 'approveEvent'])->middleware('permission:events.approve');
    Route::post('/events/{event}/reject', [ApprovalApiControllerRefactored::class, 'rejectEvent'])->middleware('permission:events.reject');
    
    // Task Approval - Consolidated  
    Route::get('/tasks/pending', [ApprovalApiControllerRefactored::class, 'getPendingTasks'])->middleware('permission:approvals.read');
    Route::post('/tasks/{task}/approve', [ApprovalApiControllerRefactored::class, 'approveTask'])->middleware('permission:tasks.approve');
    Route::post('/tasks/{task}/reject', [ApprovalApiControllerRefactored::class, 'rejectTask'])->middleware('permission:tasks.reject');
    
    // Delegation management - BEFORE {approval} route
    Route::get('/delegations', [ApprovalApiControllerRefactored::class, 'getDelegations'])->middleware('permission:approvals.delegate');
    Route::post('/delegations', [ApprovalApiControllerRefactored::class, 'createDelegation'])->middleware('permission:approvals.delegate');
    Route::delete('/delegations/{delegation}', [ApprovalApiControllerRefactored::class, 'revokeDelegation'])->middleware('permission:approvals.delegate');
    
    // Notifications - BEFORE {approval} route
    Route::get('/notifications', [ApprovalApiControllerRefactored::class, 'getNotifications'])->middleware('permission:approvals.read');
    Route::post('/notifications/{notification}/mark-read', [ApprovalApiControllerRefactored::class, 'markNotificationRead'])->middleware('permission:approvals.read');
    
    Route::get('/{approval}', [ApprovalApiControllerRefactored::class, 'show'])->middleware('permission:approvals.read');
    
    // Create approval request
    Route::post('/', [ApprovalApiControllerRefactored::class, 'createRequest'])->middleware('permission:approvals.create');
    
    // Approval actions (role-based authorization in controller)
    Route::post('/{approval}/approve', [ApprovalApiControllerRefactored::class, 'approve'])->middleware('permission:approvals.approve');
    Route::post('/{approval}/reject', [ApprovalApiControllerRefactored::class, 'reject'])->middleware('permission:approvals.approve');
    Route::post('/{approval}/return', [ApprovalApiControllerRefactored::class, 'returnForRevision'])->middleware('permission:approvals.approve');
    
    // Bulk operations (SektorAdmin and above)
    Route::post('/bulk-approve', [ApprovalApiControllerRefactored::class, 'bulkApprove'])->middleware('role:sektoradmin|regionadmin|superadmin');
    Route::post('/bulk-reject', [ApprovalApiControllerRefactored::class, 'bulkReject'])->middleware('role:sektoradmin|regionadmin|superadmin');
});

// Settings Routes - Available to superadmin and regionadmin
Route::prefix('settings')->middleware(['auth:sanctum', 'role:superadmin|regionadmin'])->group(function () {
    // Notification settings
    Route::get('/notifications', [SettingsController::class, 'getNotifications']);
    Route::post('/notifications', [SettingsController::class, 'updateNotifications']);
    
    // System health
    Route::get('/health', [SettingsController::class, 'getHealth']);
});