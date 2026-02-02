<?php

use App\Http\Controllers\TaskCrudController;
use App\Http\Controllers\TaskAssignmentController;
use App\Http\Controllers\TaskAnalyticsController;
use App\Http\Controllers\TaskPermissionController;
use App\Http\Controllers\TaskDelegationController;
use App\Http\Controllers\TaskApprovalController;
use App\Http\Controllers\TaskAuditController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Task API Routes - Modular Structure
|--------------------------------------------------------------------------
|
| Bu fayl TaskControllerRefactored.php-nin hissələrə bölünmüş versiyasının route-larını ehtiva edir.
| Hər controller öz funksionallığına cavabdehdir.
|
*/

// Authentication middleware for all task routes
Route::middleware(['auth:sanctum'])->group(function () {

    /*
    |--------------------------------------------------------------------------
    | CRUD Operations - TaskCrudController
    |--------------------------------------------------------------------------
    */
    Route::get('/tasks', [TaskCrudController::class, 'index']);
    Route::get('/tasks/assigned-to-me', [TaskCrudController::class, 'getAssignedToCurrentUser']);
    Route::post('/tasks', [TaskCrudController::class, 'store']);
    Route::get('/tasks/{task}', [TaskCrudController::class, 'show']);
    Route::put('/tasks/{task}', [TaskCrudController::class, 'update']);
    Route::delete('/tasks/{task}', [TaskCrudController::class, 'destroy']);
    Route::get('/tasks/{taskId}/progress', [TaskCrudController::class, 'getTaskProgress']);

    /*
    |--------------------------------------------------------------------------
    | Assignment Operations - TaskAssignmentController
    |--------------------------------------------------------------------------
    */
    Route::get('/tasks/{taskId}/assignments', [TaskAssignmentController::class, 'getTaskAssignments']);
    Route::put('/assignments/{assignmentId}/status', [TaskAssignmentController::class, 'updateAssignmentStatus']);
    Route::post('/assignments/bulk-update', [TaskAssignmentController::class, 'bulkUpdateAssignments']);

    /*
    |--------------------------------------------------------------------------
    | Analytics & Statistics - TaskAnalyticsController
    |--------------------------------------------------------------------------
    */
    Route::get('/tasks/statistics', [TaskAnalyticsController::class, 'getStatistics']);
    Route::get('/tasks/performance-analytics', [TaskAnalyticsController::class, 'getPerformanceAnalytics']);
    Route::get('/tasks/trend-analysis', [TaskAnalyticsController::class, 'getTrendAnalysis']);

    /*
    |--------------------------------------------------------------------------
    | Permissions & User Management - TaskPermissionController
    |--------------------------------------------------------------------------
    */
    Route::get('/tasks/targetable-institutions', [TaskPermissionController::class, 'getTargetableInstitutions']);
    Route::get('/tasks/allowed-target-roles', [TaskPermissionController::class, 'getAllowedTargetRoles']);
    Route::get('/tasks/creation-context', [TaskPermissionController::class, 'getTaskCreationContext']);
    Route::get('/tasks/assignable-users', [TaskPermissionController::class, 'getAssignableUsers']);
    Route::get('/tasks/mentionable-users', [TaskPermissionController::class, 'getMentionableUsers']);

    /*
    |--------------------------------------------------------------------------
    | Delegation Operations - TaskDelegationController
    |--------------------------------------------------------------------------
    */
    Route::get('/tasks/{task}/eligible-delegates', [TaskDelegationController::class, 'getEligibleDelegates']);
    Route::post('/tasks/{task}/delegate', [TaskDelegationController::class, 'delegate']);
    Route::get('/tasks/{task}/delegation-history', [TaskDelegationController::class, 'getDelegationHistory']);

    /*
    |--------------------------------------------------------------------------
    | Approval Operations - TaskApprovalController
    |--------------------------------------------------------------------------
    */
    Route::post('/tasks/{task}/submit-for-approval', [TaskApprovalController::class, 'submitForApproval']);
    Route::post('/tasks/{task}/approve', [TaskApprovalController::class, 'approve']);
    Route::post('/tasks/{task}/reject', [TaskApprovalController::class, 'reject']);

    /*
    |--------------------------------------------------------------------------
    | Audit & History - TaskAuditController
    |--------------------------------------------------------------------------
    */
    Route::get('/tasks/{task}/audit-history', [TaskAuditController::class, 'getAuditHistory']);
    Route::get('/tasks/{task}/approval-history', [TaskAuditController::class, 'getApprovalHistory']);

});
