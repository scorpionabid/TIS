<?php

use App\Http\Controllers\RegionAdmin\RegionAdminClassController;
use App\Http\Controllers\RegionAdmin\RegionStudentController;
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

// Class Management for RegionAdmin — Read-only (RegionOperator daxil)
Route::middleware(['auth:sanctum', 'role:regionadmin|superadmin|regionoperator'])
    ->prefix('regionadmin/classes')
    ->group(function () {
        Route::get('/', [RegionAdminClassController::class, 'index']);
        Route::get('/statistics', [RegionAdminClassController::class, 'getStatistics']);
        Route::get('/filter-options/institutions', [RegionAdminClassController::class, 'getAvailableInstitutions']);
        Route::get('/filter-options/institutions-grouped', [RegionAdminClassController::class, 'getInstitutionsGroupedBySector']);
        Route::get('/filter-options/academic-years', [RegionAdminClassController::class, 'getAvailableAcademicYears']);
        Route::get('/import/progress/{sessionId}', [RegionAdminClassController::class, 'getImportProgress']);
        Route::get('/export/template', [RegionAdminClassController::class, 'exportClassesTemplate']);
        Route::get('/export/template/csv', [RegionAdminClassController::class, 'exportClassesTemplateCSV']);
        Route::get('/{id}', [RegionAdminClassController::class, 'show']);
    });

// Class Management for RegionAdmin — Write operations (RegionAdmin/SuperAdmin only)
Route::middleware(['auth:sanctum', 'role:regionadmin|superadmin'])
    ->prefix('regionadmin/classes')
    ->group(function () {
        Route::post('/import', [RegionAdminClassController::class, 'importClasses']);
        Route::post('/export', [RegionAdminClassController::class, 'exportClasses']);
        Route::post('/bulk-delete', [RegionAdminClassController::class, 'bulkDelete']);
        Route::put('/{id}', [RegionAdminClassController::class, 'update']);
        Route::delete('/{id}', [RegionAdminClassController::class, 'destroy']);
    });

// Student Management for RegionAdmin — Read-only (RegionOperator daxil)
Route::middleware(['auth:sanctum', 'role:regionadmin|superadmin|regionoperator'])
    ->prefix('regionadmin/students')
    ->group(function () {
        Route::get('/', [RegionStudentController::class, 'index']);
        Route::get('/filter-options', [RegionStudentController::class, 'filterOptions']);
        Route::get('/export', [RegionStudentController::class, 'export']);
    });

// Student Management for RegionAdmin — Write operations (RegionAdmin/SuperAdmin only)
Route::middleware(['auth:sanctum', 'role:regionadmin|superadmin'])
    ->prefix('regionadmin/students')
    ->group(function () {
        Route::get('/template', [RegionStudentController::class, 'downloadTemplate']);
        Route::post('/import', [RegionStudentController::class, 'import']);
    });

// Teacher Management for RegionAdmin — Read-only (RegionOperator daxil)
Route::middleware(['auth:sanctum', 'role:regionadmin|superadmin|regionoperator'])
    ->prefix('regionadmin/teachers')
    ->group(function () {
        Route::get('/', [RegionTeacherController::class, 'index']);
        Route::get('/sectors', [RegionTeacherController::class, 'getSectors']);
        Route::get('/schools', [RegionTeacherController::class, 'getSchools']);
        Route::get('/{id}', [RegionTeacherController::class, 'show']);
    });

// Teacher Management for RegionAdmin — Write operations (RegionAdmin/SuperAdmin only)
Route::middleware(['auth:sanctum', 'role:regionadmin|superadmin'])
    ->prefix('regionadmin/teachers')
    ->group(function () {
        Route::post('/', [RegionTeacherController::class, 'store']);
        Route::put('/{id}', [RegionTeacherController::class, 'update']);
        Route::delete('/{id}/soft', [RegionTeacherController::class, 'softDelete']);
        Route::delete('/{id}/hard', [RegionTeacherController::class, 'hardDelete']);
        Route::post('/bulk-update-status', [RegionTeacherController::class, 'bulkUpdateStatus']);
        Route::post('/bulk-delete', [RegionTeacherController::class, 'bulkDelete']);
        Route::post('/import/validate', [RegionTeacherController::class, 'validateImport']);
        Route::post('/import/export-errors', [RegionTeacherController::class, 'exportValidationErrors']);
        Route::post('/import', [RegionTeacherController::class, 'import']);
        Route::get('/import-template', [RegionTeacherController::class, 'downloadImportTemplate']);
        Route::post('/export', [RegionTeacherController::class, 'export']);
    });
