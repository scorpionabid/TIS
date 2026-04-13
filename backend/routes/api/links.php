<?php

use App\Http\Controllers\LinkShare\LinkShareAccessController;
use App\Http\Controllers\LinkShare\LinkShareAnalyticsController;
use App\Http\Controllers\LinkShare\LinkShareBulkController;
use App\Http\Controllers\LinkShare\LinkShareCrudController;
use App\Http\Controllers\LinkShare\LinkShareDatabaseController;
use App\Http\Controllers\LinkShare\LinkShareTrackingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Link Share Management Routes
|--------------------------------------------------------------------------
|
| Routes for link sharing, management, and tracking
|
*/

// Link Share Management Routes
Route::prefix('links')->group(function () {
    // CRUD
    Route::get('/', [LinkShareCrudController::class, 'index'])->middleware('permission:links.read');
    Route::post('/', [LinkShareCrudController::class, 'store'])->middleware('permission:links.create');
    Route::get('/grouped-sharing-overview', [LinkShareCrudController::class, 'groupedSharingOverview'])->middleware('permission:links.read');
    Route::get('/{linkShare}', [LinkShareCrudController::class, 'show'])->middleware('permission:links.read');
    Route::put('/{linkShare}', [LinkShareCrudController::class, 'update'])->middleware('permission:links.update');
    Route::delete('/{linkShare}', [LinkShareCrudController::class, 'destroy'])->middleware('permission:links.delete');
    Route::patch('/{linkShare}/restore', [LinkShareCrudController::class, 'restore'])->middleware('permission:links.update');
    Route::delete('/{linkShare}/force', [LinkShareCrudController::class, 'forceDelete'])->middleware('permission:links.delete');
    Route::get('/{linkShare}/sharing-overview', [LinkShareCrudController::class, 'sharingOverview'])->middleware('permission:links.read');

    // Analytics & Stats
    Route::get('/stats', [LinkShareAnalyticsController::class, 'getStats'])->middleware('permission:links.read');
    Route::get('/popular/list', [LinkShareAnalyticsController::class, 'getPopularLinks'])->middleware('permission:links.read');
    Route::get('/featured/list', [LinkShareAnalyticsController::class, 'getFeaturedLinks'])->middleware('permission:links.read');

    // Access
    Route::post('/{linkShare}/access', [LinkShareAccessController::class, 'access'])->middleware('permission:links.read');

    // Bulk
    Route::post('/bulk-create', [LinkShareBulkController::class, 'bulkCreate'])->middleware('permission:links.bulk');
    Route::post('/bulk-delete', [LinkShareBulkController::class, 'bulkAction'])->middleware('permission:links.bulk');
    Route::get('/bulk-template', [LinkShareBulkController::class, 'downloadBulkTemplate'])->middleware('permission:links.bulk');
    Route::get('/bulk-metadata', [LinkShareBulkController::class, 'getBulkMetadata'])->middleware('permission:links.bulk');

    // Tracking
    Route::get('/tracking/activity', [LinkShareTrackingController::class, 'getTrackingActivity'])->middleware('permission:links.tracking');
    Route::get('/{linkShare}/tracking/history', [LinkShareTrackingController::class, 'getLinkHistory'])->middleware('permission:links.tracking');
    Route::post('/{linkShare}/click', [LinkShareTrackingController::class, 'recordClick'])->middleware('permission:links.read');
});

// My Resources Routes (for all authenticated roles)
// auth:sanctum + auth.custom: validates token, is_active, account_locked_until
Route::prefix('my-resources')->middleware(['auth:sanctum', 'auth.custom'])->group(function () {
    // Get resources assigned to current user's institution
    Route::get('/assigned', [LinkShareAccessController::class, 'getAssignedResources'])
        ->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin|regionoperator|teacher');

    // Mark a resource as viewed
    Route::post('/{type}/{id}/view', [LinkShareAccessController::class, 'markAsViewed'])
        ->where('type', 'link|document');
});

// Link Database Routes (Department and Sector based link management)
Route::prefix('link-database')->middleware('permission:links.read')->group(function () {
    // Get links by department type
    Route::get('/by-department/{departmentType}', [LinkShareDatabaseController::class, 'getLinksByDepartmentType']);

    // Get links by sector
    Route::get('/by-sector/{sectorId}', [LinkShareDatabaseController::class, 'getLinksBySector']);

    // Get all sectors for dropdown
    Route::get('/sectors', [LinkShareDatabaseController::class, 'getSectorsForLinkDatabase']);

    // Get department types
    Route::get('/department-types', [LinkShareDatabaseController::class, 'getDepartmentTypes']);

    // Create link for specific department
    Route::post('/department/{departmentType}', [LinkShareDatabaseController::class, 'createLinkForDepartment'])
        ->middleware('permission:links.create');

    // Create link for specific sector
    Route::post('/sector/{sectorId}', [LinkShareDatabaseController::class, 'createLinkForSector'])
        ->middleware('permission:links.create');
});
