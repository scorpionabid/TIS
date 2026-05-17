<?php

use App\Http\Controllers\School\SchoolStudentController;
use App\Http\Controllers\StudentControllerRefactored as StudentController;
use Illuminate\Support\Facades\Route;

// Student Management Routes - Using SchoolStudentController for students table
Route::prefix('students')->middleware('auth:sanctum')->group(function () {
    Route::get('/', [SchoolStudentController::class, 'index']);
    Route::post('/', [SchoolStudentController::class, 'store']);
    Route::get('/{student}', [SchoolStudentController::class, 'show']);
    Route::put('/{student}', [SchoolStudentController::class, 'update']);
    Route::delete('/{student}', [SchoolStudentController::class, 'destroy']);
    Route::get('/{student}/grades', [StudentController::class, 'getGrades'])->middleware('permission:students.grades');
    Route::get('/{student}/attendance', [StudentController::class, 'getAttendance'])->middleware('permission:students.attendance');
    Route::get('/{student}/schedule', [StudentController::class, 'getSchedule'])->middleware('permission:students.schedule');
    Route::post('/{student}/enroll', [StudentController::class, 'enroll'])->middleware('permission:students.enroll');
    Route::post('/{student}/transfer', [StudentController::class, 'transfer'])->middleware('permission:students.transfer');
    Route::post('/{student}/graduate', [StudentController::class, 'graduate'])->middleware('permission:students.graduate');
    Route::get('/search/{query}', [StudentController::class, 'search'])->middleware('permission:students.read');
    Route::post('/bulk-create', [StudentController::class, 'bulkCreate'])->middleware('permission:students.bulk');
    Route::post('/bulk-update', [StudentController::class, 'bulkUpdate'])->middleware('permission:students.bulk');
    Route::post('/bulk-delete', [StudentController::class, 'bulkDelete'])->middleware('permission:students.bulk');
    Route::get('/analytics/overview', [StudentController::class, 'getAnalytics'])->middleware('permission:students.analytics');
    Route::get('/reports/performance', [StudentController::class, 'getPerformanceReport'])->middleware('permission:students.reports');
    Route::get('/reports/demographics', [StudentController::class, 'getDemographicsReport'])->middleware('permission:students.reports');
    Route::post('/import', [StudentController::class, 'import'])->middleware('permission:students.import');
    Route::get('/export', [StudentController::class, 'export'])->middleware('permission:students.export');

    // New bulk import/export endpoints
    Route::get('/bulk/download-template', [StudentController::class, 'downloadTemplate'])->middleware('permission:students.import');
    Route::post('/bulk/import', [StudentController::class, 'importStudents'])->middleware('permission:students.import');
    Route::post('/bulk/export', [StudentController::class, 'exportStudents'])->middleware('permission:students.export');

    // Available students for grade enrollment
    Route::get('/available-for-grade/{grade}', [SchoolStudentController::class, 'getAvailableForGrade'])->middleware('permission:students.read');
});

// School Student Management Routes (for schools to manage their own students)
Route::prefix('school-students')->middleware('auth:sanctum')->group(function () {
    // CRUD operations
    Route::get('/', [SchoolStudentController::class, 'index'])->middleware('permission:students.read');
    Route::post('/', [SchoolStudentController::class, 'store'])->middleware('permission:students.write');
    Route::get('/{id}', [SchoolStudentController::class, 'show'])->middleware('permission:students.read');
    Route::put('/{id}', [SchoolStudentController::class, 'update'])->middleware('permission:students.write');
    Route::delete('/{id}', [SchoolStudentController::class, 'destroy'])->middleware('permission:students.delete');

    // Lightweight CRUD (no User account creation) — SchoolAdmin üçün
    Route::post('/simple', [SchoolStudentController::class, 'storeSimple'])->middleware('permission:students.write');
    Route::put('/{id}/simple', [SchoolStudentController::class, 'updateSimple'])->middleware('permission:students.write');

    // Bulk import
    Route::post('/bulk-import', [SchoolStudentController::class, 'bulkImport'])->middleware('permission:students.bulk');

    // Get by grade level
    Route::get('/by-grade/{gradeLevel}', [SchoolStudentController::class, 'getByGrade'])->middleware('permission:students.read');
});
