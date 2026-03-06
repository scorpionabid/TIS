<?php

use App\Http\Controllers\PermissionController;
use Illuminate\Support\Facades\Route;

/**
 * Permission Management Routes
 *
 * SuperAdmin-only routes for managing system permissions.
 * Includes CRUD operations, permission matrix, audit logs, and validation.
 */
Route::prefix('permissions')->middleware(['auth:sanctum', 'role:superadmin'])->group(function () {
    // List & Search
    Route::get('/', [PermissionController::class, 'index']);

    // Metadata & Grouping
    Route::get('/categories', [PermissionController::class, 'getCategories']);
    Route::get('/scopes', [PermissionController::class, 'getScopes']);
    Route::get('/grouped', [PermissionController::class, 'getGroupedPermissions']);

    // Permission Matrix (Role-Permission visualization)
    Route::get('/matrix', [PermissionController::class, 'getPermissionMatrix']);

    // Single Permission Operations
    Route::get('/{permission}', [PermissionController::class, 'show']);
    Route::put('/{permission}', [PermissionController::class, 'update']);
    Route::get('/{permission}/usage', [PermissionController::class, 'getUsageStats']);

    // Bulk Operations
    Route::post('/bulk-update', [PermissionController::class, 'bulkUpdate']);

    // Role-Permission Sync
    Route::post('/sync-role', [PermissionController::class, 'syncRolePermissions']);
});
