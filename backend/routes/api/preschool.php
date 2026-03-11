<?php

use App\Http\Controllers\Preschool\PreschoolAttendanceController;
use App\Http\Controllers\Preschool\PreschoolAttendanceReportController;
use App\Http\Controllers\Preschool\PreschoolGroupController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Preschool Module Routes
|--------------------------------------------------------------------------
|
| Routes for preschool (məktəbəqədər) attendance and group management.
| All routes require authentication (applied in routes/api.php wrapper).
|
*/

// ==============================
// Preschool Group Management
// ==============================
Route::prefix('preschool/groups')
    ->middleware(['permission:preschool.groups.manage'])
    ->group(function () {
        Route::get('/', [PreschoolGroupController::class, 'index']);
        Route::post('/', [PreschoolGroupController::class, 'store']);
        Route::put('/{grade}', [PreschoolGroupController::class, 'update']);
        Route::delete('/{grade}', [PreschoolGroupController::class, 'destroy']);
    });

// ==============================
// Preschool Attendance Entry
// ==============================
Route::prefix('preschool/attendance')->group(function () {

    // Specific sub-routes BEFORE parameterized ones to avoid route conflicts
    Route::get('/reports', [PreschoolAttendanceReportController::class, 'index'])
        ->middleware(['permission:preschool.attendance.reports']);

    Route::get('/reports/export', [PreschoolAttendanceReportController::class, 'exportPhotosZip'])
        ->middleware(['permission:preschool.attendance.export']);

    Route::get('/photos/{photo}/serve', [PreschoolAttendanceController::class, 'servePhoto'])
        ->middleware(['permission:preschool.attendance.read'])
        ->name('preschool.photos.serve');

    Route::delete('/photos/{photo}', [PreschoolAttendanceController::class, 'deletePhoto'])
        ->middleware(['permission:preschool.attendance.write']);

    Route::get('/', [PreschoolAttendanceController::class, 'index'])
        ->middleware(['permission:preschool.attendance.read']);

    Route::post('/', [PreschoolAttendanceController::class, 'store'])
        ->middleware(['permission:preschool.attendance.write']);

    Route::post('/{attendance}/photos', [PreschoolAttendanceController::class, 'uploadPhotos'])
        ->middleware(['permission:preschool.attendance.write']);
});
