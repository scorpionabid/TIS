<?php

use App\Http\Controllers\DocumentCollectionController;
use App\Http\Controllers\DocumentControllerRefactored as DocumentController;
use App\Http\Controllers\DocumentShareController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\TaskChecklistController;
use App\Http\Controllers\TaskCrudController;
use App\Http\Controllers\TaskAssignmentController;
use App\Http\Controllers\TaskPermissionController;
use App\Http\Controllers\TaskDelegationController;
use App\Http\Controllers\TaskApprovalController;
use App\Http\Controllers\TaskAuditController;
use App\Http\Controllers\TaskAnalyticsController;
use App\Http\Controllers\TaskSubDelegationController;
use Illuminate\Support\Facades\Route;

Route::pattern('task', '[0-9]+');

/*
|--------------------------------------------------------------------------
| Document & Task Management Routes
|--------------------------------------------------------------------------
|
| Routes for document management, sharing, tasks, and notifications
|
*/

// Document Collection (Folder) Management Routes
Route::prefix('document-collections')->group(function () {
    Route::get('/', [DocumentCollectionController::class, 'index'])->middleware('permission:documents.read');
    Route::get('/{folder}', [DocumentCollectionController::class, 'show'])->middleware('permission:documents.read');
    Route::post('/regional', [DocumentCollectionController::class, 'createRegionalFolders'])
        ->middleware('permission:documents.create');
    Route::put('/{folder}', [DocumentCollectionController::class, 'update'])
        ->middleware('permission:documents.update');
    Route::delete('/{folder}', [DocumentCollectionController::class, 'destroy'])
        ->middleware('permission:documents.delete');
    Route::get('/{folder}/download', [DocumentCollectionController::class, 'bulkDownload'])
        ->middleware('permission:documents.read');
    Route::get('/{folder}/audit-logs', [DocumentCollectionController::class, 'auditLogs'])
        ->middleware('permission:documents.read');
    Route::post('/{folder}/documents', [DocumentCollectionController::class, 'uploadDocument'])
        ->middleware('permission:documents.create');
});

// Document Management Routes
Route::prefix('documents')->group(function () {
    Route::get('/', [DocumentController::class, 'index'])->middleware('permission:documents.read');
    Route::get('/stats', [DocumentController::class, 'getStats'])->middleware('permission:documents.read');
    // SUB-INSTITUTION DOCUMENTS: Get documents from hierarchically lower institutions
    Route::get('/sub-institutions', [DocumentController::class, 'getSubInstitutionDocuments'])
        ->middleware('permission:documents.read');
    // SUPERIOR INSTITUTIONS: Get institutions hierarchically above user (for targeting documents)
    Route::get('/superior-institutions', [DocumentController::class, 'getSuperiorInstitutions'])
        ->middleware('permission:documents.read');
    Route::post('/', [DocumentController::class, 'store'])->middleware('permission:documents.create');
    Route::get('/{document}', [DocumentController::class, 'show'])->middleware('permission:documents.read');
    Route::put('/{document}', [DocumentController::class, 'update'])->middleware('permission:documents.update');
    Route::delete('/{document}', [DocumentController::class, 'destroy'])->middleware('permission:documents.delete');
    Route::get('/{document}/download', [DocumentController::class, 'download']);
    Route::get('/{document}/preview', [DocumentController::class, 'preview'])->middleware('permission:documents.read');
    Route::post('/{document}/share', [DocumentController::class, 'share'])->middleware('permission:documents.share');
    Route::get('/{document}/versions', [DocumentController::class, 'getVersions'])->middleware('permission:documents.read');
    Route::post('/{document}/versions', [DocumentController::class, 'createVersion'])->middleware('permission:documents.update');
    Route::get('/search/{query}', [DocumentController::class, 'search'])->middleware('permission:documents.read');
    Route::get('/categories', [DocumentController::class, 'getCategories'])->middleware('permission:documents.read');
    Route::post('/bulk-upload', [DocumentController::class, 'bulkUpload'])->middleware('permission:documents.bulk');
    Route::post('/bulk-delete', [DocumentController::class, 'bulkDelete'])->middleware('permission:documents.bulk');
    Route::get('/analytics/usage', [DocumentController::class, 'getUsageAnalytics'])->middleware('permission:documents.analytics');
    Route::get('/analytics/storage', [DocumentController::class, 'getStorageAnalytics'])->middleware('permission:documents.analytics');
    Route::post('/{document}/tags', [DocumentController::class, 'addTags'])->middleware('permission:documents.update');
    Route::delete('/{document}/tags', [DocumentController::class, 'removeTags'])->middleware('permission:documents.update');
    Route::get('/tracking/activity', [DocumentController::class, 'getTrackingActivity'])->middleware('permission:documents.tracking');
    Route::get('/{document}/tracking/history', [DocumentController::class, 'getDocumentHistory'])->middleware('permission:documents.tracking');
});

// Document Sharing Routes
Route::prefix('document-shares')->middleware('permission:documents.share')->group(function () {
    Route::get('/', [DocumentShareController::class, 'index']);
    Route::post('/', [DocumentShareController::class, 'store']);
    Route::get('/{share}', [DocumentShareController::class, 'show']);
    Route::put('/{share}', [DocumentShareController::class, 'update']);
    Route::delete('/{share}', [DocumentShareController::class, 'destroy']);
    Route::get('/{share}/access-log', [DocumentShareController::class, 'getAccessLog']);
    Route::post('/{share}/revoke', [DocumentShareController::class, 'revoke']);
    Route::get('/document/{document}', [DocumentShareController::class, 'getDocumentShares']);
    Route::get('/user/{user}', [DocumentShareController::class, 'getUserShares']);
});

// Task Management Routes
Route::middleware('permission:tasks.read')->group(function () {
    Route::get('tasks', [TaskCrudController::class, 'index']);
    Route::get('tasks/assigned-to-me', [TaskCrudController::class, 'getAssignedToCurrentUser']);
    Route::get('users/mentionable', [TaskPermissionController::class, 'getMentionableUsers']);
    Route::get('tasks/{task}', [TaskCrudController::class, 'show']);
    Route::get('tasks/{taskId}/progress', [TaskCrudController::class, 'getTaskProgress']);
    Route::get('tasks/{task}/audit-history', [TaskAuditController::class, 'getAuditHistory']);
    Route::get('tasks/{task}/approval-history', [TaskAuditController::class, 'getApprovalHistory']);
    Route::get('tasks/user/{user}', [TaskCrudController::class, 'getUserTasks']);
    Route::get('tasks/institution/{institution}', [TaskCrudController::class, 'getInstitutionTasks']);
    Route::put('assignments/{assignmentId}/status', [TaskAssignmentController::class, 'updateAssignmentStatus']);

    // Task Delegation Routes
    Route::get('tasks/{task}/eligible-delegates', [TaskDelegationController::class, 'getEligibleDelegates']);
    Route::post('tasks/{task}/delegate', [TaskDelegationController::class, 'delegate']);
    Route::get('tasks/{task}/delegation-history', [TaskDelegationController::class, 'getDelegationHistory']);

    // Sub-Delegation Routes
    Route::prefix('tasks/{task}/sub-delegations')->group(function () {
        Route::get('/', [TaskSubDelegationController::class, 'index']);
        Route::post('/', [TaskSubDelegationController::class, 'store']);
        Route::get('/{delegation}', [TaskSubDelegationController::class, 'show']);
        Route::post('/{delegation}/status', [TaskSubDelegationController::class, 'updateStatus']);
        Route::delete('/{delegation}', [TaskSubDelegationController::class, 'destroy']);
    });

    // User's received delegations
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('my-delegations', [TaskSubDelegationController::class, 'myDelegations']);
        Route::get('my-delegations/stats', [TaskSubDelegationController::class, 'myDelegationStats']);
    });
});

Route::middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin')->group(function () {
    // Resource-specific helper endpoint (reuses task assignment logic)
    Route::get('resources/target-users', [TaskPermissionController::class, 'getAssignableUsers']);
});

Route::middleware('role:superadmin|regionadmin|regionoperator|sektoradmin')->group(function () {
    Route::post('tasks', [TaskCrudController::class, 'store']);
    Route::put('tasks/{task}', [TaskCrudController::class, 'update']);
    Route::delete('tasks/{task}', [TaskCrudController::class, 'destroy']);
    Route::post('tasks/{task}/assign', [TaskCrudController::class, 'assign']);
    Route::post('tasks/{task}/complete', [TaskCrudController::class, 'complete']);
    Route::post('tasks/{task}/reopen', [TaskCrudController::class, 'reopen']);
    Route::post('tasks/{task}/progress', [TaskCrudController::class, 'updateProgress']);
    Route::post('tasks/bulk-create', [TaskCrudController::class, 'bulkCreate']);
    Route::post('tasks/bulk-assign', [TaskCrudController::class, 'bulkAssign']);
    Route::post('tasks/bulk-update-status', [TaskCrudController::class, 'bulkUpdateStatus']);
    Route::post('assignments/bulk-update', [TaskAssignmentController::class, 'bulkUpdateAssignments']);
    Route::get('tasks/creation-context', [TaskPermissionController::class, 'getTaskCreationContext']);
    Route::get('tasks/assignable-users', [TaskPermissionController::class, 'getAssignableUsers']);
});

Route::middleware('permission:tasks.approve')->group(function () {
    Route::post('tasks/{task}/approve', [TaskApprovalController::class, 'approve']);
    Route::post('tasks/{task}/reject', [TaskApprovalController::class, 'reject']);
    Route::get('tasks/pending-approval', [TaskCrudController::class, 'getPendingApproval']);
});

// Task Approval Workflow Routes (NEW)
Route::middleware('permission:tasks.read')->group(function () {
    Route::post('tasks/{task}/submit-for-approval', [TaskApprovalController::class, 'submitForApproval']);
    Route::get('tasks/{task}/approval-history', [TaskAuditController::class, 'getApprovalHistory']);
    Route::get('tasks/{task}/audit-history', [TaskAuditController::class, 'getAuditHistory']);
});

Route::middleware('permission:tasks.analytics')->group(function () {
    Route::get('tasks/analytics/overview', [TaskAnalyticsController::class, 'getAnalyticsOverview']);
    Route::get('tasks/analytics/performance', [TaskAnalyticsController::class, 'getPerformanceAnalytics']);
    Route::get('tasks/reports/summary', [TaskAnalyticsController::class, 'getSummaryReport']);
});

// Task Checklist Routes
Route::middleware('permission:tasks.read')->group(function () {
    Route::get('tasks/{task}/checklists', [TaskChecklistController::class, 'index']);
    Route::post('tasks/{task}/checklists', [TaskChecklistController::class, 'store']);
    Route::put('tasks/{task}/checklists/{checklist}', [TaskChecklistController::class, 'update']);
    Route::delete('tasks/{task}/checklists/{checklist}', [TaskChecklistController::class, 'destroy']);
    Route::post('tasks/{task}/checklists/reorder', [TaskChecklistController::class, 'reorder']);
});

// ─────────────────────────────────────────────────────────────────────────────
// Notification Management Routes
// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: All static routes (statistics, unread-count, mark-all-read) MUST
// be defined BEFORE wildcard {notification} routes to avoid route conflicts.

// All authenticated users can READ their own notifications (no special permission needed)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('notifications',               [NotificationController::class, 'index']);
    Route::get('notifications/statistics',    [NotificationController::class, 'statistics']);
    Route::get('notifications/unread-count',  [NotificationController::class, 'unreadCount']);

    // Wildcard routes come AFTER static routes
    Route::get('notifications/{notification}', [NotificationController::class, 'show']);
});

Route::middleware('auth:sanctum')->group(function () {
    // Both URL variants supported for backward compatibility
    Route::post('notifications/{notification}/read',      [NotificationController::class, 'markAsRead']);
    Route::post('notifications/{notification}/mark-read', [NotificationController::class, 'markAsRead']);

    Route::post('notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);

    Route::delete('notifications/{notification}', [NotificationController::class, 'destroy']);
});

// Admin-only: send test notifications
Route::middleware(['auth:sanctum', 'role:superadmin'])->group(function () {
    Route::post('notifications/test',   [NotificationController::class, 'sendTest']);
    Route::post('notifications/{notification}/resend', [NotificationController::class, 'resend']);
});
