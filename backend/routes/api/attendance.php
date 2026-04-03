<?php

use App\Http\Controllers\API\ClassAttendanceApiController;
use App\Http\Controllers\API\TeacherAvailabilityApiController;
use App\Http\Controllers\API\TeachingLoadApiController;
use App\Http\Controllers\Attendance\RegionalAttendanceController;
use App\Http\Controllers\ClassAttendanceController;
use Illuminate\Support\Facades\Route;

// Class Attendance API Routes (Legacy - will be deprecated)
Route::prefix('class-attendance')->group(function () {
    Route::get('/', [ClassAttendanceApiController::class, 'index'])->middleware('permission:attendance.read');
    Route::post('/', [ClassAttendanceApiController::class, 'store'])->middleware('permission:attendance.write');
    Route::get('/{attendance}', [ClassAttendanceApiController::class, 'show'])->middleware('permission:attendance.read');
    Route::put('/{attendance}', [ClassAttendanceApiController::class, 'update'])->middleware('permission:attendance.write');
});

// New Comprehensive Attendance Record API
Route::prefix('attendance-records')->group(function () {
    Route::get('/', [App\Http\Controllers\API\AttendanceRecordApiController::class, 'index'])->middleware('permission:attendance.read');
    Route::post('/', [App\Http\Controllers\API\AttendanceRecordApiController::class, 'store'])->middleware('permission:attendance.write');
    Route::get('/{attendanceRecord}', [App\Http\Controllers\API\AttendanceRecordApiController::class, 'show'])->middleware('permission:attendance.read');
    Route::put('/{attendanceRecord}', [App\Http\Controllers\API\AttendanceRecordApiController::class, 'update'])->middleware('permission:attendance.write');
    Route::delete('/{attendanceRecord}', [App\Http\Controllers\API\AttendanceRecordApiController::class, 'destroy'])->middleware('permission:attendance.write');

    // Bulk operations
    Route::post('/bulk', [App\Http\Controllers\API\AttendanceRecordApiController::class, 'bulkStore'])->middleware('permission:attendance.bulk');

    // Statistics
    Route::get('/statistics/class', [App\Http\Controllers\API\AttendanceRecordApiController::class, 'getClassStatistics'])->middleware('permission:attendance.read');
});

// Teaching Load API Routes
// Note: Using role-based access instead of permission middleware due to guard incompatibility
// schooladmin role has all necessary teaching_loads.* permissions
Route::prefix('teaching-loads')->group(function () {
    Route::get('/', [TeachingLoadApiController::class, 'index'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::post('/', [TeachingLoadApiController::class, 'store'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/statistics', [TeachingLoadApiController::class, 'getAnalytics'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/teacher/{teacher}', [TeachingLoadApiController::class, 'getByTeacher'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/teacher/{teacher}/subjects', [TeachingLoadApiController::class, 'getTeacherSubjects'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/institution/{institution}', [TeachingLoadApiController::class, 'getByInstitution'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::post('/bulk-assign', [TeachingLoadApiController::class, 'bulkAssign'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/analytics/overview', [TeachingLoadApiController::class, 'getAnalytics'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/{teachingLoad}', [TeachingLoadApiController::class, 'show'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::put('/{teachingLoad}', [TeachingLoadApiController::class, 'update'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::delete('/{teachingLoad}', [TeachingLoadApiController::class, 'destroy'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
});

// Teacher Availability API Routes
Route::prefix('teacher-availabilities')->group(function () {
    Route::get('/', [TeacherAvailabilityApiController::class, 'index'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::post('/', [TeacherAvailabilityApiController::class, 'store'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::put('/{teacherAvailability}', [TeacherAvailabilityApiController::class, 'update'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::delete('/{teacherAvailability}', [TeacherAvailabilityApiController::class, 'destroy'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
});

// Attendance Management Routes
Route::prefix('attendance')->group(function () {
    Route::get('/', [ClassAttendanceController::class, 'index'])->middleware('permission:attendance.read');
    Route::post('/', [ClassAttendanceController::class, 'store'])->middleware('permission:attendance.write');
    Route::get('/{attendance}', [ClassAttendanceController::class, 'show'])->middleware('permission:attendance.read');
    Route::put('/{attendance}', [ClassAttendanceController::class, 'update'])->middleware('permission:attendance.write');
    Route::delete('/{attendance}', [ClassAttendanceController::class, 'destroy'])->middleware('permission:attendance.write');
    Route::get('/class/{class}/date/{date}', [ClassAttendanceController::class, 'getByClassAndDate'])->middleware('permission:attendance.read');
    Route::get('/student/{student}/period/{period}', [ClassAttendanceController::class, 'getStudentAttendance'])->middleware('permission:attendance.read');
    Route::post('/bulk-update', [ClassAttendanceController::class, 'bulkUpdate'])->middleware('permission:attendance.bulk');
    Route::get('/reports/summary', [ClassAttendanceController::class, 'getAttendanceSummary'])->middleware('permission:attendance.reports');
});

// School Attendance Routes (different from class attendance)
Route::prefix('school-attendance')->group(function () {
    // Basic CRUD operations
    Route::get('/', [App\Http\Controllers\SchoolAttendanceController::class, 'index'])->middleware('permission:school_attendance.read|attendance.read');
    Route::post('/', [App\Http\Controllers\SchoolAttendanceController::class, 'store'])->middleware('permission:school_attendance.write');

    // Statistics and filtering (must come before parameterized routes)
    Route::get('/stats', [App\Http\Controllers\SchoolAttendanceController::class, 'stats'])->middleware('permission:school_attendance.read|attendance.read');
    Route::get('/reports', [App\Http\Controllers\SchoolAttendanceController::class, 'reports'])->middleware('permission:school_attendance.read|attendance.read');
    Route::get('/schools/{school}/classes', [App\Http\Controllers\SchoolAttendanceController::class, 'getSchoolClasses'])->middleware('permission:school_attendance.read|attendance.read');

    // Bulk operations
    Route::post('/bulk', [App\Http\Controllers\SchoolAttendanceController::class, 'bulkStore'])->middleware('permission:school_attendance.bulk');
    Route::get('/export', [App\Http\Controllers\SchoolAttendanceController::class, 'export'])->middleware('permission:school_attendance.export');

    // Reporting endpoints
    Route::get('/daily-report', [App\Http\Controllers\SchoolAttendanceController::class, 'getDailyReport'])->middleware('permission:school_attendance.read|attendance.read');
    Route::get('/weekly-summary', [App\Http\Controllers\SchoolAttendanceController::class, 'getWeeklySummary'])->middleware('permission:school_attendance.read|attendance.read');
    Route::get('/monthly-statistics', [App\Http\Controllers\SchoolAttendanceController::class, 'getMonthlyStatistics'])->middleware('permission:school_attendance.read|attendance.read');

    // Parameterized CRUD routes should remain at the end to avoid conflicts
    Route::get('/{schoolAttendance}', [App\Http\Controllers\SchoolAttendanceController::class, 'show'])->middleware('permission:school_attendance.read|attendance.read');
    Route::put('/{schoolAttendance}', [App\Http\Controllers\SchoolAttendanceController::class, 'update'])->middleware('permission:school_attendance.write');
    Route::delete('/{schoolAttendance}', [App\Http\Controllers\SchoolAttendanceController::class, 'destroy'])->middleware('permission:school_attendance.write');
});

Route::prefix('regional-attendance')->middleware(['auth:sanctum', 'role:superadmin|regionadmin|regionoperator|sektoradmin'])->group(function () {
    Route::get('/overview', [RegionalAttendanceController::class, 'overview']);
    Route::get('/export', [RegionalAttendanceController::class, 'export']);
    Route::get('/schools/{school}/classes', [RegionalAttendanceController::class, 'schoolClasses']);
    Route::get('/grade-level-stats', [RegionalAttendanceController::class, 'gradeLevelStats']);
    Route::get('/grade-level-stats/export', [RegionalAttendanceController::class, 'exportGradeLevelStats']);
    Route::get('/school-grade-stats', [RegionalAttendanceController::class, 'schoolGradeStats']);
    Route::get('/school-grade-stats/export', [RegionalAttendanceController::class, 'exportSchoolGradeStats']);
    Route::get('/missing-reports', [RegionalAttendanceController::class, 'getSchoolsWithMissingReports']);
    Route::get('/missing-reports/export', [RegionalAttendanceController::class, 'exportMissingReports']);
});
