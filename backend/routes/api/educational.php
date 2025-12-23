<?php

use App\Http\Controllers\API\ClassAttendanceApiController;
use App\Http\Controllers\API\RegionalScheduleController;
use App\Http\Controllers\API\RegionAssessmentController;
use App\Http\Controllers\API\ScheduleGenerationController;
use App\Http\Controllers\API\TeachingLoadApiController;
use App\Http\Controllers\Attendance\RegionalAttendanceController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\AssessmentResultFieldController;
use App\Http\Controllers\AssessmentStageController;
use App\Http\Controllers\AssessmentTypeController;
use App\Http\Controllers\ClassAttendanceController;
use App\Http\Controllers\Grade\GradeTagController;
use App\Http\Controllers\Grade\GradeUnifiedController;
use App\Http\Controllers\GradeSubjectController;
use App\Http\Controllers\RoomControllerRefactored as RoomController;
use App\Http\Controllers\ScheduleControllerRefactored as ScheduleController;
use App\Http\Controllers\SchoolAssessmentController;
use App\Http\Controllers\SchoolAssessmentReportController;
use App\Http\Controllers\SchoolEventController;
use App\Http\Controllers\StudentControllerRefactored as StudentController;
use App\Http\Controllers\TeacherPerformanceController;
use App\Http\Controllers\UnifiedAssessmentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Educational Management Routes
|--------------------------------------------------------------------------
|
| Routes for educational activities: attendance, schedules, assessments, etc.
|
*/

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

    // TODO: These methods need to be implemented
    // Route::post('/mark-absent', [App\Http\Controllers\SchoolAttendanceController::class, 'markAbsent'])->middleware('permission:school_attendance.write');
    // Route::post('/mark-present', [App\Http\Controllers\SchoolAttendanceController::class, 'markPresent'])->middleware('permission:school_attendance.write');
    // Route::get('/alerts', [App\Http\Controllers\SchoolAttendanceController::class, 'getAttendanceAlerts'])->middleware('permission:school_attendance.read');
    // Route::post('/excuse-absence', [App\Http\Controllers\SchoolAttendanceController::class, 'excuseAbsence'])->middleware('permission:school_attendance.excuse');
    // Route::get('/patterns/{student}', [App\Http\Controllers\SchoolAttendanceController::class, 'getAttendancePatterns'])->middleware('permission:school_attendance.analytics');
});

Route::prefix('regional-attendance')->middleware(['auth:sanctum', 'role:superadmin|regionadmin|regionoperator|sektoradmin'])->group(function () {
    Route::get('/overview', [RegionalAttendanceController::class, 'overview']);
    Route::get('/schools/{school}/classes', [RegionalAttendanceController::class, 'schoolClasses']);
});

// Schedule Management Routes
Route::prefix('schedules')->group(function () {
    Route::get('/', [ScheduleController::class, 'index'])->middleware('permission:schedules.read');

    // Specific routes MUST come before parameterized routes
    Route::get('/weekly', [ScheduleController::class, 'getWeeklySchedule'])->middleware('permission:schedules.read');
    Route::get('/statistics', [ScheduleController::class, 'getStatistics'])->middleware('permission:schedules.read');
    Route::get('/templates', [ScheduleController::class, 'getTemplates'])->middleware('permission:schedules.read');
    Route::get('/conflicts/resolve', [ScheduleController::class, 'resolveConflicts'])->middleware('permission:schedules.manage');
    Route::get('/class/{class}', [ScheduleController::class, 'getClassSchedule'])->middleware('permission:schedules.read');
    Route::get('/teacher/{teacher}', [ScheduleController::class, 'getTeacherSchedule'])->middleware('permission:schedules.read');
    Route::get('/room/{room}', [ScheduleController::class, 'getRoomSchedule'])->middleware('permission:schedules.read');

    // CRUD routes with parameters come after specific routes
    Route::post('/', [ScheduleController::class, 'store'])->middleware('permission:schedules.write');
    Route::get('/{schedule}', [ScheduleController::class, 'show'])->middleware('permission:schedules.read');
    Route::put('/{schedule}', [ScheduleController::class, 'update'])->middleware('permission:schedules.write');
    Route::delete('/{schedule}', [ScheduleController::class, 'destroy'])->middleware('permission:schedules.write');

    // POST routes
    Route::post('/conflicts/check', [ScheduleController::class, 'checkConflicts'])->middleware('permission:schedules.read');
    Route::post('/bulk-create', [ScheduleController::class, 'bulkCreate'])->middleware('permission:schedules.bulk');
    Route::post('/templates', [ScheduleController::class, 'saveTemplate'])->middleware('permission:schedules.write');
});

// Student Management Routes - Using SchoolStudentController for students table
Route::prefix('students')->middleware('auth:sanctum')->group(function () {
    Route::get('/', [App\Http\Controllers\School\SchoolStudentController::class, 'index']);
    Route::post('/', [App\Http\Controllers\School\SchoolStudentController::class, 'store']);
    Route::get('/{student}', [App\Http\Controllers\School\SchoolStudentController::class, 'show']);
    Route::put('/{student}', [App\Http\Controllers\School\SchoolStudentController::class, 'update']);
    Route::delete('/{student}', [App\Http\Controllers\School\SchoolStudentController::class, 'destroy']);
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
    Route::get('/bulk/statistics', [StudentController::class, 'getExportStats'])->middleware('permission:students.read');

    // Available students for grade enrollment
    Route::get('/available-for-grade/{grade}', [App\Http\Controllers\School\SchoolStudentController::class, 'getAvailableForGrade'])->middleware('permission:students.read');
});

// SchoolAdmin Teacher Management Routes
Route::prefix('schooladmin/teachers')->group(function () {
    Route::get('/', [App\Http\Controllers\School\SchoolTeacherController::class, 'index']);
    Route::post('/', [App\Http\Controllers\School\SchoolTeacherController::class, 'createTeacher']);
    Route::get('/{id}', [App\Http\Controllers\School\SchoolTeacherController::class, 'show']);
    Route::put('/{id}', [App\Http\Controllers\School\SchoolTeacherController::class, 'updateTeacher']);
    Route::delete('/{id}', [App\Http\Controllers\School\SchoolTeacherController::class, 'deleteTeacher']);

    // Import/Export routes
    Route::get('/export', [App\Http\Controllers\School\SchoolTeacherController::class, 'exportTeachers']);
    Route::post('/import', [App\Http\Controllers\School\SchoolTeacherController::class, 'importTeachers']);
});

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

// Class Management Routes
// Note: Using role-based access for read operations due to guard incompatibility
Route::prefix('classes')->group(function () {
    Route::get('/', [App\Http\Controllers\ClassesControllerRefactored::class, 'index'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin|teacher');
    Route::post('/', [App\Http\Controllers\ClassesControllerRefactored::class, 'store'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/{class}', [App\Http\Controllers\ClassesControllerRefactored::class, 'show'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin|teacher');
    Route::put('/{class}', [App\Http\Controllers\ClassesControllerRefactored::class, 'update'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::delete('/{class}', [App\Http\Controllers\ClassesControllerRefactored::class, 'destroy'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/{class}/students', [App\Http\Controllers\ClassesControllerRefactored::class, 'getStudents'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin|teacher');
    Route::post('/{class}/students', [App\Http\Controllers\ClassesControllerRefactored::class, 'addStudents'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::delete('/{class}/students/{student}', [App\Http\Controllers\ClassesControllerRefactored::class, 'removeStudent'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/{class}/teachers', [App\Http\Controllers\ClassesControllerRefactored::class, 'getTeachers'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::post('/{class}/teachers', [App\Http\Controllers\ClassesControllerRefactored::class, 'assignTeacher'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::delete('/{class}/teachers/{teacher}', [App\Http\Controllers\ClassesControllerRefactored::class, 'unassignTeacher'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::get('/{class}/schedule', [App\Http\Controllers\ClassesControllerRefactored::class, 'getSchedule'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin|teacher');
    Route::get('/{class}/attendance', [App\Http\Controllers\ClassesControllerRefactored::class, 'getAttendance'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin|teacher');
    Route::get('/{class}/grades', [App\Http\Controllers\ClassesControllerRefactored::class, 'getGrades'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin|teacher');
    Route::post('/bulk-create', [App\Http\Controllers\ClassesControllerRefactored::class, 'bulkCreate'])->middleware('role:superadmin|regionadmin');
    Route::get('/analytics/overview', [App\Http\Controllers\ClassesControllerRefactored::class, 'getAnalytics'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
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
    Route::get('/statistics/overview', [GradeUnifiedController::class, 'statistics'])->middleware('permission:grades.statistics');
    Route::get('/reports/capacity', [GradeUnifiedController::class, 'capacityReport'])->middleware('permission:grades.reports');

    // Curriculum management (grade subjects)
    Route::get('/{grade}/subjects', [GradeSubjectController::class, 'index'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin|teacher');
    Route::get('/{grade}/subjects/available', [GradeSubjectController::class, 'availableSubjects'])->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin');
    Route::post('/{grade}/subjects', [GradeSubjectController::class, 'store'])->middleware('permission:grades.read');
    Route::put('/{grade}/subjects/{gradeSubject}', [GradeSubjectController::class, 'update'])->middleware('permission:grades.read');
    Route::delete('/{grade}/subjects/{gradeSubject}', [GradeSubjectController::class, 'destroy'])->middleware('permission:grades.read');
    Route::get('/{grade}/subjects/statistics', [GradeSubjectController::class, 'statistics'])->middleware('permission:grades.read');
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

// School Event Management Routes
Route::prefix('events')->group(function () {
    Route::get('/', [SchoolEventController::class, 'index'])->middleware('permission:events.read');
    Route::post('/', [SchoolEventController::class, 'store'])->middleware('permission:events.write');
    Route::get('/{event}', [SchoolEventController::class, 'show'])->middleware('permission:events.read');
    Route::put('/{event}', [SchoolEventController::class, 'update'])->middleware('permission:events.write');
    Route::delete('/{event}', [SchoolEventController::class, 'destroy'])->middleware('permission:events.write');
    Route::post('/{event}/approve', [SchoolEventController::class, 'approve'])->middleware('permission:events.approve');
    Route::post('/{event}/cancel', [SchoolEventController::class, 'cancel'])->middleware('permission:events.cancel');
    Route::post('/{event}/submit-for-approval', [SchoolEventController::class, 'submitForApproval'])->middleware('permission:events.submit');
    Route::get('/statistics', [SchoolEventController::class, 'statistics'])->middleware('permission:events.analytics');
    Route::get('/period-statistics', [SchoolEventController::class, 'periodStatistics'])->middleware('permission:events.analytics');
    Route::get('/calendar', [SchoolEventController::class, 'getCalendar'])->middleware('permission:events.read');
    Route::post('/{event}/register', [SchoolEventController::class, 'register'])->middleware('permission:events.register');
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

// Assessment Management Routes
Route::prefix('assessments')->middleware('permission:assessments.read')->group(function () {
    Route::get('/', [AssessmentController::class, 'index']);
    Route::post('/', [AssessmentController::class, 'store'])->middleware('permission:assessments.write');
    Route::get('/{assessment}', [AssessmentController::class, 'show']);
    Route::put('/{assessment}', [AssessmentController::class, 'update'])->middleware('permission:assessments.write');
    Route::delete('/{assessment}', [AssessmentController::class, 'destroy'])->middleware('permission:assessments.write');

    // KSQ Assessment Routes - TODO: Implement KSQAssessmentController
    Route::prefix('ksq')->group(function () {
        // Route::get('/', [App\Http\Controllers\KSQAssessmentController::class, 'index']);
        // Route::post('/', [App\Http\Controllers\KSQAssessmentController::class, 'store'])->middleware('permission:assessments.write');
        // Route::get('/{assessment}', [App\Http\Controllers\KSQAssessmentController::class, 'show']);
        // Route::put('/{assessment}', [App\Http\Controllers\KSQAssessmentController::class, 'update'])->middleware('permission:assessments.write');
        // Route::delete('/{assessment}', [App\Http\Controllers\KSQAssessmentController::class, 'destroy'])->middleware('permission:assessments.write');
    });

    // BSQ Assessment Routes - TODO: Implement BSQAssessmentController
    Route::prefix('bsq')->group(function () {
        // Route::get('/', [App\Http\Controllers\BSQAssessmentController::class, 'index']);
        // Route::post('/', [App\Http\Controllers\BSQAssessmentController::class, 'store'])->middleware('permission:assessments.write');
        // Route::get('/{assessment}', [App\Http\Controllers\BSQAssessmentController::class, 'show']);
        // Route::put('/{assessment}', [App\Http\Controllers\BSQAssessmentController::class, 'update'])->middleware('permission:assessments.write');
        // Route::delete('/{assessment}', [App\Http\Controllers\BSQAssessmentController::class, 'destroy'])->middleware('permission:assessments.write');
    });
});

// Unified Assessment Hub Routes (New Implementation)
Route::prefix('unified-assessments')->middleware('permission:assessments.read')->group(function () {
    // Dashboard data endpoint for SchoolAssessments.tsx
    Route::get('/dashboard', [UnifiedAssessmentController::class, 'getDashboardData']);

    // Assessment overview data (KSQ, BSQ, regular assessments)
    Route::get('/overview', [UnifiedAssessmentController::class, 'getAssessmentOverview']);

    // Gradebook data with filtering
    Route::get('/gradebook', [UnifiedAssessmentController::class, 'getGradebookData']);

    // Comprehensive analytics for reports
    Route::get('/analytics', [UnifiedAssessmentController::class, 'getAnalyticsData']);
});

// Assessment Type Management Routes
Route::prefix('assessment-types')->middleware('auth:sanctum')->group(function () {
    Route::get('/', [AssessmentTypeController::class, 'index'])->middleware('permission:assessment-types.read');
    Route::post('/', [AssessmentTypeController::class, 'store'])->middleware('permission:assessment-types.create');
    Route::get('/dropdown', [AssessmentTypeController::class, 'dropdown'])->middleware('permission:assessment-types.read');
    Route::get('/{assessmentType}', [AssessmentTypeController::class, 'show'])->middleware('permission:assessment-types.read');
    Route::put('/{assessmentType}', [AssessmentTypeController::class, 'update'])->middleware('role:superadmin|regionadmin|schooladmin');
    Route::delete('/{assessmentType}', [AssessmentTypeController::class, 'destroy'])->middleware('role:superadmin|regionadmin|schooladmin');
    Route::get('/by-institution/{institution}', [AssessmentTypeController::class, 'getByInstitution'])->middleware('permission:assessment-types.read');
    Route::post('/bulk-create', [AssessmentTypeController::class, 'bulkCreate'])->middleware('permission:assessment_types.bulk');

    // Institution assignment routes
    Route::post('/{assessmentType}/institutions', [AssessmentTypeController::class, 'assignInstitutions'])->middleware('permission:assessment_types.assign');
    Route::delete('/{assessmentType}/institutions/{institution}', [AssessmentTypeController::class, 'unassignInstitution'])->middleware('permission:assessment_types.assign');
    Route::get('/{assessmentType}/institutions', [AssessmentTypeController::class, 'getAssignedInstitutions']);
});

Route::prefix('assessment-types/{assessmentType}/stages')->middleware('auth:sanctum')->group(function () {
    Route::get('/', [AssessmentStageController::class, 'index'])->middleware('permission:assessment-types.read');
    Route::post('/', [AssessmentStageController::class, 'store'])->middleware('permission:assessment-types.create');
    Route::put('/{assessmentStage}', [AssessmentStageController::class, 'update'])->middleware('role:superadmin|regionadmin|schooladmin');
    Route::delete('/{assessmentStage}', [AssessmentStageController::class, 'destroy'])->middleware('role:superadmin|regionadmin|schooladmin');
});

Route::prefix('assessment-types/{assessmentType}/result-fields')->middleware('auth:sanctum')->group(function () {
    Route::get('/', [AssessmentResultFieldController::class, 'index'])->middleware('permission:assessment-types.read');
    Route::post('/', [AssessmentResultFieldController::class, 'store'])->middleware('permission:assessment-types.create');
    Route::put('/{assessmentResultField}', [AssessmentResultFieldController::class, 'update'])->middleware('role:superadmin|regionadmin|schooladmin');
    Route::delete('/{assessmentResultField}', [AssessmentResultFieldController::class, 'destroy'])->middleware('role:superadmin|regionadmin|schooladmin');
});

Route::prefix('school-assessments')->middleware('auth:sanctum')->group(function () {
    Route::get('/', [SchoolAssessmentController::class, 'index'])->middleware('role:superadmin|regionadmin|schooladmin');
    Route::post('/', [SchoolAssessmentController::class, 'store'])->middleware('role:superadmin|regionadmin|schooladmin');
    Route::get('/reports/summary', SchoolAssessmentReportController::class)->middleware('role:superadmin|regionadmin|schooladmin');
    Route::get('/reports/summary/export', [SchoolAssessmentReportController::class, 'export'])->middleware('role:superadmin|regionadmin|schooladmin');
    Route::get('/{schoolAssessment}', [SchoolAssessmentController::class, 'show'])->middleware('role:superadmin|regionadmin|schooladmin');
    Route::get('/{schoolAssessment}/export', [SchoolAssessmentController::class, 'export'])->middleware('role:superadmin|regionadmin|schooladmin');
    Route::post('/{schoolAssessment}/class-results', [SchoolAssessmentController::class, 'storeClassResults'])->middleware('role:superadmin|regionadmin|schooladmin');
    Route::delete('/{schoolAssessment}/class-results/{classResult}', [SchoolAssessmentController::class, 'deleteClassResult'])->middleware('role:superadmin|regionadmin|schooladmin');
    Route::post('/{schoolAssessment}/complete', [SchoolAssessmentController::class, 'complete'])->middleware('role:superadmin|regionadmin|schooladmin');
});

// Assessment Student Management
Route::prefix('assessment-students')->middleware('auth:sanctum')->group(function () {
    Route::get('/', [App\Http\Controllers\AssessmentStudentController::class, 'index'])->middleware('permission:assessments.students.read');
    Route::post('/', [App\Http\Controllers\AssessmentStudentController::class, 'store'])->middleware('permission:assessments.students.write');
    Route::get('/{assessmentStudent}', [App\Http\Controllers\AssessmentStudentController::class, 'show'])->middleware('permission:assessments.students.read');
    Route::put('/{assessmentStudent}', [App\Http\Controllers\AssessmentStudentController::class, 'update'])->middleware('permission:assessments.students.write');
    Route::delete('/{assessmentStudent}', [App\Http\Controllers\AssessmentStudentController::class, 'destroy'])->middleware('permission:assessments.students.write');
});

// Assessment Entry Management
Route::prefix('assessment-entries')->middleware('auth:sanctum')->group(function () {
    Route::get('/', [App\Http\Controllers\AssessmentEntryController::class, 'index'])->middleware('permission:assessments.entries.read');
    Route::post('/', [App\Http\Controllers\AssessmentEntryController::class, 'store'])->middleware('permission:assessments.entries.write');
    Route::get('/{assessmentEntry}', [App\Http\Controllers\AssessmentEntryController::class, 'show'])->middleware('permission:assessments.entries.read');
    Route::put('/{assessmentEntry}', [App\Http\Controllers\AssessmentEntryController::class, 'update'])->middleware('permission:assessments.entries.write');
    Route::delete('/{assessmentEntry}', [App\Http\Controllers\AssessmentEntryController::class, 'destroy'])->middleware('permission:assessments.entries.write');
    Route::post('/bulk-create', [App\Http\Controllers\AssessmentEntryController::class, 'bulkCreate'])->middleware('permission:assessments.entries.bulk');
    Route::get('/by-student/{student}', [App\Http\Controllers\AssessmentEntryController::class, 'getByStudent'])->middleware('permission:assessments.entries.read');
    Route::get('/by-assessment/{assessment}', [App\Http\Controllers\AssessmentEntryController::class, 'getByAssessment'])->middleware('permission:assessments.entries.read');
});

// Region Assessment Management
Route::prefix('region-assessments')->middleware(['auth:sanctum', 'role_or_permission:superadmin|regionadmin'])->group(function () {
    Route::get('/', [RegionAssessmentController::class, 'index']);
    Route::post('/', [RegionAssessmentController::class, 'store']);
    Route::get('/{assessment}', [RegionAssessmentController::class, 'show']);
    Route::put('/{assessment}', [RegionAssessmentController::class, 'update']);
    Route::delete('/{assessment}', [RegionAssessmentController::class, 'destroy']);
    Route::get('/region/{region}/statistics', [RegionAssessmentController::class, 'getRegionStatistics']);
    Route::get('/performance/comparison', [RegionAssessmentController::class, 'getPerformanceComparison']);
});

// Schedule Generation Routes
Route::prefix('schedule-generation')->middleware(['auth:sanctum'])->group(function () {
    // Workload integration
    Route::get('/workload-ready-data', [ScheduleGenerationController::class, 'getWorkloadReadyData'])
        ->middleware('permission:schedules.read');

    Route::get('/integration-status', [ScheduleGenerationController::class, 'getSchedulingIntegrationStatus'])
        ->middleware('permission:schedules.read');

    // Generation settings
    Route::get('/settings', [ScheduleGenerationController::class, 'getGenerationSettings'])
        ->middleware('permission:schedules.settings');

    Route::put('/settings', [ScheduleGenerationController::class, 'updateGenerationSettings'])
        ->middleware('permission:schedules.settings');

    Route::post('/settings/validate', [ScheduleGenerationController::class, 'validateGenerationSettings'])
        ->middleware('permission:schedules.settings');

    // Schedule generation
    Route::post('/generate-from-workload', [ScheduleGenerationController::class, 'generateFromWorkload'])
        ->middleware('permission:schedules.create');

    // Teaching load management
    Route::post('/teaching-loads/mark-ready', [ScheduleGenerationController::class, 'markTeachingLoadsAsReady'])
        ->middleware('permission:teaching_loads.update');

    Route::post('/teaching-loads/reset-status', [ScheduleGenerationController::class, 'resetSchedulingStatus'])
        ->middleware('permission:teaching_loads.update');

    // Real-time generation tracking
    Route::get('/progress', [ScheduleGenerationController::class, 'getGenerationProgress'])
        ->middleware('permission:schedules.read');

    Route::post('/cancel', [ScheduleGenerationController::class, 'cancelGeneration'])
        ->middleware('permission:schedules.create');

    // Validation and analytics
    Route::post('/validate-workload', [ScheduleGenerationController::class, 'validateWorkloadData'])
        ->middleware('permission:schedules.read');

    Route::get('/time-slots', [ScheduleGenerationController::class, 'getTimeSlots'])
        ->middleware('permission:schedules.read');

    Route::post('/preview-generation', [ScheduleGenerationController::class, 'previewGeneration'])
        ->middleware('permission:schedules.read');

    // Conflict management
    Route::get('/conflicts/{schedule}', [ScheduleGenerationController::class, 'getScheduleConflicts'])
        ->middleware('permission:schedules.read');

    Route::post('/resolve-conflict', [ScheduleGenerationController::class, 'resolveConflict'])
        ->middleware('permission:schedules.manage');

    Route::get('/analytics/{schedule}', [ScheduleGenerationController::class, 'getScheduleAnalytics'])
        ->middleware('permission:schedules.analytics');

    // Export functionality
    Route::get('/export/{schedule}', [ScheduleGenerationController::class, 'exportSchedule'])
        ->middleware('permission:schedules.export');

    // Template management
    Route::get('/templates', [ScheduleGenerationController::class, 'getScheduleTemplates'])
        ->middleware('permission:schedules.templates');

    Route::post('/templates', [ScheduleGenerationController::class, 'createScheduleTemplate'])
        ->middleware('permission:schedules.templates');

    Route::post('/templates/{template}/apply', [ScheduleGenerationController::class, 'applyScheduleTemplate'])
        ->middleware('permission:schedules.templates');

    // Optimization features
    Route::post('/optimization-suggestions', [ScheduleGenerationController::class, 'getOptimizationSuggestions'])
        ->middleware('permission:schedules.analytics');

    Route::post('/simulate-scenarios', [ScheduleGenerationController::class, 'simulateScenarios'])
        ->middleware('permission:schedules.analytics');

    Route::get('/generation-progress/{generationId}', [ScheduleGenerationController::class, 'getGenerationProgress'])
        ->middleware('permission:schedules.read');

    Route::post('/cancel-generation/{generationId}', [ScheduleGenerationController::class, 'cancelGeneration'])
        ->middleware('permission:schedules.manage');

    // Workload distribution
    Route::get('/workload-distribution-suggestions/{teachingLoad}', [ScheduleGenerationController::class, 'getWorkloadDistributionSuggestions'])
        ->middleware('permission:teaching_loads.analytics');

    Route::put('/apply-workload-distribution/{teachingLoad}', [ScheduleGenerationController::class, 'applyWorkloadDistribution'])
        ->middleware('permission:teaching_loads.update');

    // Schedule comparison
    Route::post('/compare-schedules', [ScheduleGenerationController::class, 'compareSchedules'])
        ->middleware('permission:schedules.analytics');

    Route::get('/schedule-history', [ScheduleGenerationController::class, 'getScheduleHistory'])
        ->middleware('permission:schedules.read');
});

// Regional Schedule Management Routes
Route::prefix('regional-schedules')->middleware(['auth:sanctum', 'role_or_permission:superadmin|regionadmin|regionoperator'])->group(function () {
    // Dashboard overview
    Route::get('/dashboard-overview', [RegionalScheduleController::class, 'getDashboardOverview']);

    // Institution schedules management
    Route::get('/institution-schedules', [RegionalScheduleController::class, 'getInstitutionSchedules']);

    // Institution analytics
    Route::get('/institution-analytics/{institution}', [RegionalScheduleController::class, 'getInstitutionAnalytics']);

    // Multi-institution comparison
    Route::post('/compare-institutions', [RegionalScheduleController::class, 'compareInstitutions']);

    // Regional performance trends
    Route::get('/regional-trends', [RegionalScheduleController::class, 'getRegionalTrends']);

    // Reporting and export
    Route::post('/export-report', [RegionalScheduleController::class, 'exportRegionalReport']);
});
