<?php

use App\Http\Controllers\RegionAdmin\RegionAdminClassController;
use App\Http\Controllers\RegionAdmin\RegionTeacherController;
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
        Route::post('/bulk-delete', [RegionAdminClassController::class, 'bulkDelete']);
        Route::put('/{id}', [RegionAdminClassController::class, 'update']);
        Route::delete('/{id}', [RegionAdminClassController::class, 'destroy']);

        // Get specific class details
        Route::get('/{id}', [RegionAdminClassController::class, 'show']);
    });

// Teacher Management for RegionAdmin
Route::middleware(['auth:sanctum', 'role:regionadmin|superadmin'])
    ->prefix('regionadmin/teachers')
    ->group(function () {
        // List and filter teachers
        Route::get('/', [RegionTeacherController::class, 'index']);

        // Get filter options
        Route::get('/sectors', [RegionTeacherController::class, 'getSectors']);
        Route::get('/schools', [RegionTeacherController::class, 'getSchools']);

        // Single teacher operations
        Route::get('/{id}', [RegionTeacherController::class, 'show']);
        Route::post('/', [RegionTeacherController::class, 'store']);
        Route::put('/{id}', [RegionTeacherController::class, 'update']);
        Route::delete('/{id}/soft', [RegionTeacherController::class, 'softDelete']);
        Route::delete('/{id}/hard', [RegionTeacherController::class, 'hardDelete']);

        // Bulk operations
        Route::post('/bulk-update-status', [RegionTeacherController::class, 'bulkUpdateStatus']);
        Route::post('/bulk-delete', [RegionTeacherController::class, 'bulkDelete']);

        // Import/Export operations
        Route::post('/import/validate', [RegionTeacherController::class, 'validateImport']); // NEW: Pre-validation
        Route::post('/import/export-errors', [RegionTeacherController::class, 'exportValidationErrors']); // NEW: Export errors
        Route::post('/import', [RegionTeacherController::class, 'import']);
        Route::get('/import-template', [RegionTeacherController::class, 'downloadImportTemplate']);
        Route::post('/export', [RegionTeacherController::class, 'export']);
    });
