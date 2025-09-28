<?php

use App\Http\Controllers\DocumentControllerRefactored as DocumentController;
use App\Http\Controllers\DocumentShareController;
use App\Http\Controllers\TaskControllerRefactored as TaskController;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Document & Task Management Routes
|--------------------------------------------------------------------------
|
| Routes for document management, sharing, tasks, and notifications
|
*/

// Document Management Routes
Route::prefix('documents')->group(function () {
    Route::get('/', [DocumentController::class, 'index'])->middleware('permission:documents.read');
    Route::get('/stats', [DocumentController::class, 'getStats'])->middleware('permission:documents.read');
    Route::post('/', [DocumentController::class, 'store'])->middleware('permission:documents.create');
    Route::get('/{document}', [DocumentController::class, 'show'])->middleware('permission:documents.read');
    Route::put('/{document}', [DocumentController::class, 'update'])->middleware('permission:documents.update');
    Route::delete('/{document}', [DocumentController::class, 'destroy'])->middleware('permission:documents.delete');
    Route::get('/{document}/download', [DocumentController::class, 'download'])->middleware('permission:documents.read');
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
    Route::get('tasks', [TaskController::class, 'index']);
    Route::get('tasks/{task}', [TaskController::class, 'show']);
    Route::get('tasks/{task}/progress', [TaskController::class, 'getProgress']);
    Route::get('tasks/{task}/history', [TaskController::class, 'getHistory']);
    Route::get('tasks/user/{user}', [TaskController::class, 'getUserTasks']);
    Route::get('tasks/institution/{institution}', [TaskController::class, 'getInstitutionTasks']);
});

Route::middleware('permission:tasks.write')->group(function () {
    Route::post('tasks', [TaskController::class, 'store']);
    Route::put('tasks/{task}', [TaskController::class, 'update']);
    Route::delete('tasks/{task}', [TaskController::class, 'destroy']);
    Route::post('tasks/{task}/assign', [TaskController::class, 'assign']);
    Route::post('tasks/{task}/complete', [TaskController::class, 'complete']);
    Route::post('tasks/{task}/reopen', [TaskController::class, 'reopen']);
    Route::post('tasks/{task}/progress', [TaskController::class, 'updateProgress']);
    Route::post('tasks/bulk-create', [TaskController::class, 'bulkCreate']);
    Route::post('tasks/bulk-assign', [TaskController::class, 'bulkAssign']);
    Route::post('tasks/bulk-update-status', [TaskController::class, 'bulkUpdateStatus']);
});

Route::middleware('permission:tasks.approve')->group(function () {
    Route::post('tasks/{task}/approve', [TaskController::class, 'approve']);
    Route::post('tasks/{task}/reject', [TaskController::class, 'reject']);
    Route::get('tasks/pending-approval', [TaskController::class, 'getPendingApproval']);
});

Route::middleware('permission:tasks.analytics')->group(function () {
    Route::get('tasks/analytics/overview', [TaskController::class, 'getAnalyticsOverview']);
    Route::get('tasks/analytics/performance', [TaskController::class, 'getPerformanceAnalytics']);
    Route::get('tasks/reports/summary', [TaskController::class, 'getSummaryReport']);
});

// Notification Management Routes
Route::middleware('permission:notifications.read')->group(function () {
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::get('notifications/{notification}', [NotificationController::class, 'show']);
    Route::get('notifications/unread/count', [NotificationController::class, 'getUnreadCount']);
});

Route::middleware('permission:notifications.write')->group(function () {
    Route::post('notifications/{notification}/mark-read', [NotificationController::class, 'markAsRead']);
    Route::post('notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::delete('notifications/{notification}', [NotificationController::class, 'destroy']);
    Route::post('notifications/bulk-delete', [NotificationController::class, 'bulkDelete']);
});

Route::middleware('permission:notifications.send')->group(function () {
    Route::post('notifications', [NotificationController::class, 'store']);
    Route::post('notifications/broadcast', [NotificationController::class, 'broadcast']);
    Route::post('notifications/schedule', [NotificationController::class, 'schedule']);
});

Route::middleware('permission:notifications.analytics')->group(function () {
    Route::get('notifications/analytics/delivery', [NotificationController::class, 'getDeliveryAnalytics']);
    Route::get('notifications/analytics/engagement', [NotificationController::class, 'getEngagementAnalytics']);
});