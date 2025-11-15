<?php

use App\Http\Controllers\RegionAdmin\RegionAdminClassController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| RegionAdmin Routes
|--------------------------------------------------------------------------
|
| Routes specific to RegionAdmin role for managing regional operations
|
*/

// Class Management for RegionAdmin
Route::middleware(['auth:sanctum', 'role:regionadmin'])
    ->prefix('regionadmin/classes')
    ->group(function () {
        // List and filter classes
        Route::get('/', [RegionAdminClassController::class, 'index']);

        // Get statistics
        Route::get('/statistics', [RegionAdminClassController::class, 'getStatistics']);

        // Get filter options
        Route::get('/filter-options/institutions', [RegionAdminClassController::class, 'getAvailableInstitutions']);
        Route::get('/filter-options/institutions-grouped', [RegionAdminClassController::class, 'getInstitutionsGroupedBySector']);
        Route::get('/filter-options/academic-years', [RegionAdminClassController::class, 'getAvailableAcademicYears']);

        // Import/Export operations
        Route::post('/import', [RegionAdminClassController::class, 'importClasses']);
        Route::get('/import/progress/{sessionId}', [RegionAdminClassController::class, 'getImportProgress']);
        Route::get('/export/template', [RegionAdminClassController::class, 'exportClassesTemplate']);
        Route::get('/export/template/csv', [RegionAdminClassController::class, 'exportClassesTemplateCSV']);
        Route::post('/export', [RegionAdminClassController::class, 'exportClasses']);

        // Get specific class details
        Route::get('/{id}', [RegionAdminClassController::class, 'show']);
    });
