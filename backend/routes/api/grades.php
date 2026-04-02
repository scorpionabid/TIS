<?php

use App\Http\Controllers\CurriculumPlanController;
use App\Http\Controllers\Grade\GradeTagController;
use App\Http\Controllers\Grade\GradeUnifiedController;
use App\Http\Controllers\GradeSubjectController;
use App\Http\Controllers\RoomControllerRefactored as RoomController;
use Illuminate\Support\Facades\Route;

// Class Management Routes — Migrated to GradeUnifiedController (/api/grades)
// Note: /api/classes routes now proxy to GradeUnifiedController for backward compatibility
Route::prefix('classes')->group(function () {
    Route::get('/', [GradeUnifiedController::class, 'index'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin|teacher');
    Route::post('/', [GradeUnifiedController::class, 'store'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/{grade}', [GradeUnifiedController::class, 'show'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin|teacher');
    Route::put('/{grade}', [GradeUnifiedController::class, 'update'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::delete('/{grade}', [GradeUnifiedController::class, 'destroy'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/{grade}/students', [GradeUnifiedController::class, 'students'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin|teacher');
    Route::post('/{grade}/students', [GradeUnifiedController::class, 'enrollMultipleStudents'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::delete('/{grade}/students/{student}', [GradeUnifiedController::class, 'unenrollStudent'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::post('/{grade}/teachers', [GradeUnifiedController::class, 'assignTeacher'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::delete('/{grade}/teachers/{teacher}', [GradeUnifiedController::class, 'removeTeacher'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/{grade}/analytics', [GradeUnifiedController::class, 'getAnalytics'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
});

// Unified Grades Management Routes (New Implementation)
// Note: Using role-based access for read operations due to guard incompatibility
Route::prefix('grades')->group(function () {
    // Grade tag system routes (MUST BE BEFORE {grade} routes to avoid conflict)
    Route::get('/tags', [GradeTagController::class, 'index'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/tags/list', [GradeTagController::class, 'list'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/tags/categories', [GradeTagController::class, 'categories'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    // Education programs are static data - no permission required for authenticated users
    Route::get('/education-programs', [GradeTagController::class, 'educationPrograms']);

    // Core CRUD operations
    Route::get('/', [GradeUnifiedController::class, 'index'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::post('/', [GradeUnifiedController::class, 'store'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/{grade}', [GradeUnifiedController::class, 'show'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin|teacher');
    Route::put('/{grade}', [GradeUnifiedController::class, 'update'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::post('/{grade}/deactivate', [GradeUnifiedController::class, 'deactivate'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::delete('/{grade}', [GradeUnifiedController::class, 'destroy'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');

    // Student management within grades
    Route::get('/{grade}/students', [GradeUnifiedController::class, 'students'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin|teacher');

    // Teacher assignment
    Route::post('/{grade}/assign-teacher', [GradeUnifiedController::class, 'assignTeacher'])->middleware('permission:grades.assign_teacher');
    Route::delete('/{grade}/remove-teacher', [GradeUnifiedController::class, 'removeTeacher'])->middleware('permission:grades.assign_teacher');

    // Student enrollment management
    Route::post('/{grade}/students/enroll', [GradeUnifiedController::class, 'enrollStudent'])->middleware('permission:grades.manage_students');
    Route::post('/{grade}/students/enroll-multiple', [GradeUnifiedController::class, 'enrollMultipleStudents'])->middleware('permission:grades.manage_students');
    Route::delete('/{grade}/students/{student}', [GradeUnifiedController::class, 'unenrollStudent'])->middleware('permission:grades.manage_students');
    Route::put('/{grade}/students/{student}/status', [GradeUnifiedController::class, 'updateStudentStatus'])->middleware('permission:grades.manage_students');

    // Analytics
    Route::get('/{grade}/analytics', [GradeUnifiedController::class, 'getAnalytics'])->middleware('permission:grades.analytics');

    // Duplicate/Copy grade
    Route::post('/{grade}/duplicate', [GradeUnifiedController::class, 'duplicate'])->middleware('permission:grades.create');

    // Smart naming system routes
    Route::get('/naming/options', [GradeUnifiedController::class, 'getNamingOptions'])->middleware('permission:grades.create');
    Route::get('/naming/suggestions', [GradeUnifiedController::class, 'getNamingSuggestions'])->middleware('permission:grades.create');
    Route::get('/naming/system-stats', [GradeUnifiedController::class, 'getNamingSystemStats'])->middleware('permission:grades.read');

    // Statistics and reporting
    Route::get('/reports/capacity', [GradeUnifiedController::class, 'capacityReport'])->middleware('permission:grades.reports');

    // Curriculum management (grade subjects)
    Route::get('/{grade}/subjects', [GradeSubjectController::class, 'index'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin|teacher');
    Route::get('/{grade}/subjects/available', [GradeSubjectController::class, 'availableSubjects'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::post('/{grade}/subjects', [GradeSubjectController::class, 'store'])->middleware('permission:grades.manage');
    Route::put('/{grade}/subjects/{gradeSubject}', [GradeSubjectController::class, 'update'])->middleware('permission:grades.manage');
    Route::delete('/{grade}/subjects/{gradeSubject}', [GradeSubjectController::class, 'destroy'])->middleware('permission:grades.manage');
    Route::get('/{grade}/subjects/statistics', [GradeSubjectController::class, 'statistics'])->middleware('permission:grades.read');

    // Bulk Import/Export
    Route::get('/bulk/download-template', [GradeUnifiedController::class, 'downloadTemplate'])->middleware('permission:grades.read');
    Route::post('/bulk/import', [GradeUnifiedController::class, 'importGrades'])->middleware('permission:grades.create');
    Route::post('/bulk/export', [GradeUnifiedController::class, 'exportGrades'])->middleware('permission:grades.read');
    Route::get('/bulk/statistics', [GradeUnifiedController::class, 'getImportExportStats'])->middleware('permission:grades.read');
});

Route::prefix('curriculum-plans')
    ->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin')
    ->group(function () {
        // Region Administration (Lock/Deadline) - Moved to top to ensure priority
        Route::get('/settings', [CurriculumPlanController::class, 'getSettings']);
        Route::post('/settings', [CurriculumPlanController::class, 'updateSettings']);

        Route::get('/', [CurriculumPlanController::class, 'index']);
        Route::post('/', [CurriculumPlanController::class, 'store']);
        Route::post('/delete', [CurriculumPlanController::class, 'destroy']);

        // Approval Workflow
        Route::post('/submit', [CurriculumPlanController::class, 'submit']);
        Route::post('/approve', [CurriculumPlanController::class, 'approve']);
        Route::post('/return', [CurriculumPlanController::class, 'return']);
        Route::post('/reset', [CurriculumPlanController::class, 'reset']);
    });

// Room Management Routes
Route::prefix('rooms')->group(function () {
    Route::get('/', [RoomController::class, 'index'])->middleware('permission:rooms.read');
    Route::post('/', [RoomController::class, 'store'])->middleware('permission:rooms.write');
    Route::get('/{room}', [RoomController::class, 'show'])->middleware('permission:rooms.read');
    Route::put('/{room}', [RoomController::class, 'update'])->middleware('permission:rooms.write');
    Route::delete('/{room}', [RoomController::class, 'destroy'])->middleware('permission:rooms.write');
    Route::get('/{room}/schedule', [RoomController::class, 'getSchedule'])->middleware('permission:rooms.schedule');
    Route::get('/{room}/availability', [RoomController::class, 'checkAvailability'])->middleware('permission:rooms.read');
    Route::post('/{room}/reserve', [RoomController::class, 'reserve'])->middleware('permission:rooms.reserve');
    Route::get('/search/available', [RoomController::class, 'searchAvailable'])->middleware('permission:rooms.read');
    Route::get('/available', [RoomController::class, 'getAvailable'])->middleware('permission:rooms.read');
    Route::get('/types', [RoomController::class, 'getRoomTypes'])->middleware('permission:rooms.read');
    Route::post('/bulk-create', [RoomController::class, 'bulkCreate'])->middleware('permission:rooms.bulk');
    Route::get('/analytics/utilization', [RoomController::class, 'getUtilizationAnalytics'])->middleware('permission:rooms.analytics');
    Route::get('/maintenance/schedule', [RoomController::class, 'getMaintenanceSchedule'])->middleware('permission:rooms.maintenance');
    Route::post('/maintenance/request', [RoomController::class, 'requestMaintenance'])->middleware('permission:rooms.maintenance');
});
