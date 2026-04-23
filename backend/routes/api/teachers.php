<?php

use App\Http\Controllers\TeacherPerformanceController;
use Illuminate\Support\Facades\Route;



// Teacher Management Routes (SuperAdmin direct access)
Route::prefix('teachers')->middleware('permission:teachers.read')->group(function () {
    Route::get('/', [App\Http\Controllers\School\SchoolTeacherController::class, 'index']);
    Route::post('/', [App\Http\Controllers\School\SchoolTeacherController::class, 'store'])->middleware('permission:teachers.write');
    // Specific routes BEFORE wildcard routes
    Route::get('/available', [App\Http\Controllers\School\SchoolTeacherController::class, 'getAvailable'])->middleware('permission:teachers.read');
    Route::post('/bulk-create', [App\Http\Controllers\School\SchoolTeacherController::class, 'bulkCreate'])->middleware('permission:teachers.bulk');
    Route::get('/analytics/overview', [App\Http\Controllers\School\SchoolTeacherController::class, 'getAnalytics'])->middleware('permission:teachers.analytics');

    // Import/Export routes
    Route::get('/export', [App\Http\Controllers\School\SchoolTeacherController::class, 'exportTeachers'])->middleware('permission:teachers.read');
    Route::get('/import/template', [App\Http\Controllers\School\SchoolTeacherController::class, 'getImportTemplate'])->middleware('permission:teachers.read');
    Route::post('/import', [App\Http\Controllers\School\SchoolTeacherController::class, 'importTeachers'])->middleware('permission:teachers.write');

    // Teacher Workplace routes
    Route::get('/{teacher}/workplaces', [App\Http\Controllers\TeacherWorkplaceController::class, 'index'])->middleware('permission:teachers.read');
    Route::post('/{teacher}/workplaces', [App\Http\Controllers\TeacherWorkplaceController::class, 'store'])->middleware('permission:teachers.write');

    // Wildcard routes AFTER specific routes
    Route::get('/{teacher}', [App\Http\Controllers\School\SchoolTeacherController::class, 'show']);
    Route::put('/{teacher}', [App\Http\Controllers\School\SchoolTeacherController::class, 'update'])->middleware('permission:teachers.write');
    Route::delete('/{teacher}', [App\Http\Controllers\School\SchoolTeacherController::class, 'destroy'])->middleware('permission:teachers.write');
    Route::post('/{teacher}/assign-classes', [App\Http\Controllers\School\SchoolTeacherController::class, 'assignClasses'])->middleware('permission:teachers.assign');
    Route::get('/{teacher}/performance', [App\Http\Controllers\School\SchoolTeacherController::class, 'getPerformance'])->middleware('permission:teachers.performance');
});

// Teacher Workplace Management Routes
Route::prefix('teacher-workplaces')->middleware('permission:teachers.read')->group(function () {
    Route::get('/{workplace}', [App\Http\Controllers\TeacherWorkplaceController::class, 'show']);
    Route::put('/{workplace}', [App\Http\Controllers\TeacherWorkplaceController::class, 'update'])->middleware('permission:teachers.write');
    Route::delete('/{workplace}', [App\Http\Controllers\TeacherWorkplaceController::class, 'destroy'])->middleware('permission:teachers.write');
    Route::post('/{workplace}/activate', [App\Http\Controllers\TeacherWorkplaceController::class, 'activate'])->middleware('permission:teachers.write');
    Route::post('/{workplace}/deactivate', [App\Http\Controllers\TeacherWorkplaceController::class, 'deactivate'])->middleware('permission:teachers.write');
});

// Teacher Performance Management Routes
Route::prefix('teacher-performance')->group(function () {
    Route::get('/', [TeacherPerformanceController::class, 'index'])->middleware('permission:teacher_performance.read');
    Route::post('/', [TeacherPerformanceController::class, 'store'])->middleware('permission:teacher_performance.write');
    Route::get('/{performance}', [TeacherPerformanceController::class, 'show'])->middleware('permission:teacher_performance.read');
    Route::put('/{performance}', [TeacherPerformanceController::class, 'update'])->middleware('permission:teacher_performance.write');
    Route::delete('/{performance}', [TeacherPerformanceController::class, 'destroy'])->middleware('permission:teacher_performance.write');
    Route::get('/teacher/{teacher}', [TeacherPerformanceController::class, 'getTeacherPerformance'])->middleware('permission:teacher_performance.read');
    Route::get('/teacher/{teacher}/history', [TeacherPerformanceController::class, 'getPerformanceHistory'])->middleware('permission:teacher_performance.read');
    Route::post('/teacher/{teacher}/evaluate', [TeacherPerformanceController::class, 'evaluate'])->middleware('permission:teacher_performance.evaluate');
    Route::get('/analytics/overview', [TeacherPerformanceController::class, 'getAnalyticsOverview'])->middleware('permission:teacher_performance.analytics');
    Route::get('/analytics/trends', [TeacherPerformanceController::class, 'getPerformanceTrends'])->middleware('permission:teacher_performance.analytics');
    Route::get('/reports/summary', [TeacherPerformanceController::class, 'getSummaryReport'])->middleware('permission:teacher_performance.reports');
    Route::post('/bulk-evaluate', [TeacherPerformanceController::class, 'bulkEvaluate'])->middleware('permission:teacher_performance.bulk');
    Route::get('/metrics/definitions', [TeacherPerformanceController::class, 'getMetricDefinitions'])->middleware('permission:teacher_performance.read');
});

// Teacher Profile Approval Routes
Route::prefix('teacher-approvals')->middleware('role:sektoradmin|regionadmin|regionoperator|superadmin')->group(function () {
    Route::get('/', [App\Http\Controllers\API\TeacherApprovalController::class, 'index']);
    Route::get('/stats', [App\Http\Controllers\API\TeacherApprovalController::class, 'stats']);
    Route::get('/{id}', [App\Http\Controllers\API\TeacherApprovalController::class, 'show']);
    Route::post('/{id}/approve', [App\Http\Controllers\API\TeacherApprovalController::class, 'approve']);
    Route::post('/{id}/reject', [App\Http\Controllers\API\TeacherApprovalController::class, 'reject']);
    Route::post('/bulk-approve', [App\Http\Controllers\API\TeacherApprovalController::class, 'bulkApprove']);
});
