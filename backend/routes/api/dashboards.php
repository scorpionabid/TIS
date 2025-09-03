<?php

use App\Http\Controllers\SuperAdminDashboardController;
use App\Http\Controllers\RegionAdmin\RegionAdminDashboardController;
use App\Http\Controllers\RegionAdmin\RegionAdminInstitutionController;
use App\Http\Controllers\RegionAdmin\RegionAdminUserController;
use App\Http\Controllers\RegionAdmin\RegionAdminReportsController;
use App\Http\Controllers\RegionAdmin\RegionAdminTaskController;
use App\Http\Controllers\SurveyController;
use App\Http\Controllers\RegionOperator\RegionOperatorDashboardController;
use App\Http\Controllers\SektorAdmin\SektorAdminDashboardController;
use App\Http\Controllers\MektebAdmin\MektebAdminDashboardController;
use App\Http\Controllers\School\SchoolDashboardController;
use App\Http\Controllers\School\SchoolStudentController;
use App\Http\Controllers\School\SchoolTeacherController;
use App\Http\Controllers\Grade\GradeUnifiedController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Dashboard Routes
|--------------------------------------------------------------------------
|
| Role-specific dashboard routes for different user types
|
*/

// Dashboard routes
Route::get('dashboard/stats', [App\Http\Controllers\DashboardController::class, 'getStats']);
Route::get('dashboard/activity', [App\Http\Controllers\DashboardController::class, 'getRecentActivity']);

// SuperAdmin advanced dashboard routes
Route::middleware('role:superadmin')->group(function () {
    Route::get('dashboard/superadmin-analytics', [SuperAdminDashboardController::class, 'getSuperAdminAnalytics']);
    Route::get('dashboard/recent-activity', [SuperAdminDashboardController::class, 'getRecentActivity']);
    Route::get('dashboard/superadmin/system-health', [SuperAdminDashboardController::class, 'getSystemHealth']);
    Route::get('dashboard/superadmin/user-analytics', [SuperAdminDashboardController::class, 'getUserAnalytics']);
    Route::get('dashboard/superadmin/institution-stats', [SuperAdminDashboardController::class, 'getInstitutionStats']);
    Route::get('dashboard/superadmin/performance-metrics', [SuperAdminDashboardController::class, 'getPerformanceMetrics']);
});

// RegionAdmin Dashboard Routes
Route::prefix('regionadmin')->middleware(['role_or_permission:regionadmin|superadmin', 'regional.access:institutions', 'audit.logging'])->group(function () {
    // Dashboard endpoints
    Route::get('dashboard', [RegionAdminDashboardController::class, 'getDashboard']);
    Route::get('dashboard/stats', [RegionAdminDashboardController::class, 'getDashboardStats']);
    Route::get('dashboard/activities', [RegionAdminDashboardController::class, 'getDashboardActivities']);
    Route::get('dashboard/analytics', [RegionAdminDashboardController::class, 'getAnalytics']);
    
    // Institution management endpoints - READ operations
    Route::get('institutions', [RegionAdminInstitutionController::class, 'getRegionInstitutions']);
    Route::get('institutions/{institution}', [RegionAdminInstitutionController::class, 'getInstitutionDetails']);
    Route::get('institutions/{institution}/stats', [RegionAdminInstitutionController::class, 'getInstitutionStats']);
    Route::get('institutions/{institution}/hierarchy', [RegionAdminInstitutionController::class, 'getInstitutionHierarchy']);
    
    // Institution management endpoints - WRITE operations
    Route::post('institutions', [RegionAdminInstitutionController::class, 'createInstitution']);
    Route::put('institutions/{institution}', [RegionAdminInstitutionController::class, 'updateInstitution']);
    Route::delete('institutions/{institution}', [RegionAdminInstitutionController::class, 'deleteInstitution']);
    
    // Department management endpoints
    Route::get('institutions/{institution}/departments', [RegionAdminInstitutionController::class, 'getDepartments']);
    Route::post('institutions/{institution}/departments', [RegionAdminInstitutionController::class, 'createDepartment']);
    Route::put('departments/{department}', [RegionAdminInstitutionController::class, 'updateDepartment']);
    Route::delete('departments/{department}', [RegionAdminInstitutionController::class, 'deleteDepartment']);
    
    // Classes management endpoints for RegionAdmin - Updated to use GradeUnifiedController
    Route::get('grades', [GradeUnifiedController::class, 'index']);
    Route::get('grades/{grade}', [GradeUnifiedController::class, 'show']);
    Route::get('institutions/{institution}/grades', [RegionAdminInstitutionController::class, 'getInstitutionClasses']);
    
    // User management endpoints - READ operations
    Route::get('users', [RegionAdminUserController::class, 'index']);
    Route::get('users/{user}', [RegionAdminUserController::class, 'show']);
    Route::get('users/{user}/activity', [RegionAdminUserController::class, 'getUserActivity']);
    // Route::get('institutions/{institution}/users', [RegionAdminUserController::class, 'getInstitutionUsers']); // TODO: Implement this method
    
    // User management endpoints - WRITE operations
    Route::post('users', [RegionAdminUserController::class, 'store']);
    Route::put('users/{user}', [RegionAdminUserController::class, 'update']);
    Route::delete('users/{user}', [RegionAdminUserController::class, 'destroy']);
    
    // User management helper endpoints (TODO: Implement these methods)
    // Route::post('users/{user}/assign-role', [RegionAdminUserController::class, 'assignRole']);
    // Route::post('users/{user}/assign-institution', [RegionAdminUserController::class, 'assignInstitution']);
    // Route::post('users/bulk-create', [RegionAdminUserController::class, 'bulkCreateUsers']);
    
    // Survey analytics endpoints for RegionAdmin dashboard
    Route::get('surveys/dashboard-analytics', [SurveyController::class, 'getRegionAnalytics']);
    
    // Reports endpoints
    Route::get('reports/institutions', [RegionAdminReportsController::class, 'getInstitutionReports']);
    Route::get('reports/users', [RegionAdminReportsController::class, 'getUserReports']);
    Route::get('reports/surveys', [RegionAdminReportsController::class, 'getSurveyReports']);
    Route::get('reports/performance', [RegionAdminReportsController::class, 'getPerformanceReports']);
    Route::post('reports/generate', [RegionAdminReportsController::class, 'generateCustomReport']);
    Route::get('reports/{reportId}/download', [RegionAdminReportsController::class, 'downloadReport']);
    Route::get('reports/scheduled', [RegionAdminReportsController::class, 'getScheduledReports']);
    Route::post('reports/schedule', [RegionAdminReportsController::class, 'scheduleReport']);
    
    // Task management endpoints
    Route::get('tasks', [RegionAdminTaskController::class, 'getRegionTasks']);
    Route::post('tasks', [RegionAdminTaskController::class, 'createTask']);
    Route::put('tasks/{task}', [RegionAdminTaskController::class, 'updateTask']);
    Route::delete('tasks/{task}', [RegionAdminTaskController::class, 'deleteTask']);
    Route::get('tasks/{task}/progress', [RegionAdminTaskController::class, 'getTaskProgress']);
    Route::post('tasks/{task}/assign', [RegionAdminTaskController::class, 'assignTask']);
});

// RegionOperator Dashboard Routes
Route::prefix('regionoperator')->middleware(['role:regionoperator', 'regional.access:departments', 'audit.logging'])->group(function () {
    // Dashboard endpoints
    Route::get('dashboard', [RegionOperatorDashboardController::class, 'getDashboard']);
    Route::get('dashboard/stats', [RegionOperatorDashboardController::class, 'getStats']);
    Route::get('tasks/pending', [RegionOperatorDashboardController::class, 'getPendingTasks']);
    Route::get('reports/daily', [RegionOperatorDashboardController::class, 'getDailyReports']);
});

// SektorAdmin Dashboard Routes
Route::prefix('sektoradmin')->middleware(['role:sektoradmin', 'regional.access:sector', 'audit.logging'])->group(function () {
    // Dashboard endpoints
    Route::get('dashboard', [SektorAdminDashboardController::class, 'getDashboardStats']);
    Route::get('dashboard/analytics', [SektorAdminDashboardController::class, 'getSectorAnalytics']);
    Route::get('schools', [SektorAdminDashboardController::class, 'getSectorSchools']);
    
    // Survey Response Approval endpoints
    Route::get('survey-responses/pending', [SektorAdminDashboardController::class, 'getPendingSurveyResponses']);
    Route::get('survey-responses/{responseId}', [SektorAdminDashboardController::class, 'getSurveyResponseDetails']);
    Route::post('survey-responses/{responseId}/approve', [SektorAdminDashboardController::class, 'approveSurveyResponse']);
    Route::post('survey-responses/{responseId}/reject', [SektorAdminDashboardController::class, 'rejectSurveyResponse']);
    
    // Task Approval endpoints
    Route::get('tasks/pending', [SektorAdminDashboardController::class, 'getPendingTasks']);
    Route::get('tasks/statistics', [SektorAdminDashboardController::class, 'getTaskStatistics']);
    Route::get('tasks/{taskId}', [SektorAdminDashboardController::class, 'getTaskDetails']);
    Route::post('tasks/{taskId}/approve', [SektorAdminDashboardController::class, 'approveTask']);
    Route::post('tasks/{taskId}/reject', [SektorAdminDashboardController::class, 'rejectTask']);
    
    // Enhanced SektorAdmin Management Routes
    
    // User Management
    Route::get('users', [App\Http\Controllers\SektorAdmin\SektorUserController::class, 'getSectorUsers']);
    Route::get('teachers', [App\Http\Controllers\SektorAdmin\SektorUserController::class, 'getSectorTeachers']);
    Route::post('users', [App\Http\Controllers\SektorAdmin\SektorUserController::class, 'createSchoolUser']);
    Route::get('available-schools', [App\Http\Controllers\SektorAdmin\SektorUserController::class, 'getAvailableSchools']);
    
    // Student Management
    Route::get('students', [App\Http\Controllers\SektorAdmin\SektorStudentController::class, 'getSectorStudents']);
    Route::get('schools/{schoolId}/students', [App\Http\Controllers\SektorAdmin\SektorStudentController::class, 'getStudentsBySchool']);
    Route::get('students/statistics', [App\Http\Controllers\SektorAdmin\SektorStudentController::class, 'getStudentStatistics']);
    Route::get('students/export', [App\Http\Controllers\SektorAdmin\SektorStudentController::class, 'exportStudentData']);
    
    // Grade Management - Updated to use GradeUnifiedController
    Route::get('grades', [GradeUnifiedController::class, 'index']);
    Route::get('schools/{schoolId}/grades', [GradeUnifiedController::class, 'index']);
    Route::get('grades/{gradeId}/students', [GradeUnifiedController::class, 'students']);
    Route::get('grades/{gradeId}', [GradeUnifiedController::class, 'show']);
    
    // Schedule Management
    Route::get('schedules', [App\Http\Controllers\SektorAdmin\SektorScheduleController::class, 'getSectorSchedules']);
    Route::get('schedules/teachers', [App\Http\Controllers\SektorAdmin\SektorScheduleController::class, 'getTeacherSchedules']);
    Route::get('schedules/statistics', [App\Http\Controllers\SektorAdmin\SektorScheduleController::class, 'getScheduleStatistics']);
    
    // Attendance Management
    Route::get('attendance/reports', [App\Http\Controllers\SektorAdmin\SektorAttendanceController::class, 'getAttendanceReports']);
    Route::get('attendance/daily', [App\Http\Controllers\SektorAdmin\SektorAttendanceController::class, 'getDailyAttendanceSummary']);
    Route::get('attendance/trends', [App\Http\Controllers\SektorAdmin\SektorAttendanceController::class, 'getAttendanceTrends']);
    Route::get('attendance/analysis', [App\Http\Controllers\SektorAdmin\SektorAttendanceController::class, 'getAbsenteeismAnalysis']);
    
    // Assessment Management
    Route::get('assessments/reports', [App\Http\Controllers\SektorAdmin\SektorAssessmentController::class, 'getAssessmentReports']);
    Route::get('assessments/comparative', [App\Http\Controllers\SektorAdmin\SektorAssessmentController::class, 'getComparativeAnalysis']);
    Route::get('assessments/trends', [App\Http\Controllers\SektorAdmin\SektorAssessmentController::class, 'getAssessmentTrends']);
    Route::get('assessments/export', [App\Http\Controllers\SektorAdmin\SektorAssessmentController::class, 'exportAssessmentData']);
});

// Teacher Dashboard Routes  
Route::prefix('teacher')->middleware(['role:müəllim', 'regional.access:school', 'audit.logging'])->group(function () {
    // Dashboard endpoints
    // Teacher dashboard routes - TODO: Implement TeacherDashboardController
    // Route::get('dashboard', [App\Http\Controllers\TeacherDashboardController::class, 'getDashboard']);
    // Route::get('dashboard/stats', [App\Http\Controllers\TeacherDashboardController::class, 'getStats']);
    // Route::get('classes', [App\Http\Controllers\TeacherDashboardController::class, 'getTeacherClasses']);
});

// School Admin Dashboard Routes - Unified routing structure
Route::prefix('schooladmin')->middleware(['auth:sanctum', 'role_or_permission:superadmin|schooladmin|regionadmin|sektoradmin', 'regional.access:school', 'audit.logging'])->group(function () {
    // Dashboard endpoints - using new controllers
    Route::get('dashboard/overview', [SchoolDashboardController::class, 'getOverview']);
    Route::get('dashboard/statistics', [SchoolDashboardController::class, 'getStatistics']);
    Route::get('dashboard/analytics', [SchoolDashboardController::class, 'getAnalytics']);
    
    // Legacy MektebAdmin dashboard endpoints for backward compatibility
    Route::get('dashboard', [MektebAdminDashboardController::class, 'getDashboard']);
    Route::get('dashboard/stats', [MektebAdminDashboardController::class, 'getStats']);
    Route::get('dashboard/recent-activity', [SchoolDashboardController::class, 'getRecentActivities']);
    Route::get('dashboard/quick-actions', [SchoolDashboardController::class, 'getQuickActions']);
    Route::get('dashboard/notifications', [SchoolDashboardController::class, 'getNotifications']);
    Route::get('dashboard/deadlines', [SchoolDashboardController::class, 'getUpcomingDeadlines']);
    
    // Student management endpoints
    Route::get('students', [SchoolStudentController::class, 'index']);
    Route::post('students', [SchoolStudentController::class, 'store']);
    Route::get('students/{student}', [SchoolStudentController::class, 'show']);
    Route::put('students/{student}', [SchoolStudentController::class, 'update']);
    Route::delete('students/{student}', [SchoolStudentController::class, 'destroy']);
    
    // Survey management routes 
    Route::get('surveys/available', [App\Http\Controllers\School\SchoolSurveyController::class, 'getAvailableSurveys']);
    Route::post('surveys/{survey}/respond', [App\Http\Controllers\School\SchoolSurveyController::class, 'submitResponse']);
    Route::get('surveys/responses', [App\Http\Controllers\School\SchoolSurveyController::class, 'getResponses']);
    Route::get('surveys/{survey}/status', [App\Http\Controllers\School\SchoolSurveyController::class, 'getSurveyStatus']);
    
    // Task management routes
    Route::get('tasks/assigned', [App\Http\Controllers\School\SchoolTaskController::class, 'getAssignedTasks']);
    Route::post('tasks/{task}/complete', [App\Http\Controllers\School\SchoolTaskController::class, 'completeTask']);
    Route::get('tasks/{task}/details', [App\Http\Controllers\School\SchoolTaskController::class, 'getTaskDetails']);
    
    // Grade management routes - Updated to use GradeUnifiedController
    Route::get('grades', [GradeUnifiedController::class, 'index']);
    Route::post('grades', [GradeUnifiedController::class, 'store']);
    Route::get('grades/{grade}', [GradeUnifiedController::class, 'show']);
    Route::put('grades/{grade}', [GradeUnifiedController::class, 'update']);
    Route::delete('grades/{grade}', [GradeUnifiedController::class, 'destroy']);
    Route::get('grades/{grade}/students', [GradeUnifiedController::class, 'students']);
    Route::post('grades/{grade}/students/enroll', [GradeUnifiedController::class, 'enrollStudent']);
    
    // Teacher management routes
    Route::get('teachers', [SchoolTeacherController::class, 'index']);
    Route::get('test', function() {
        return response()->json([
            'success' => true,
            'message' => 'SchoolAdmin endpoint işləyir',
            'timestamp' => now()->toISOString(),
            'user' => auth()->user() ? auth()->user()->username : 'not authenticated'
        ]);
    });
    Route::get('teachers/{teacher}', [SchoolTeacherController::class, 'show']);
    Route::post('teachers/{teacher}/assign-classes', [SchoolTeacherController::class, 'assignClasses']);
    Route::get('teachers/{teacher}/performance', [SchoolTeacherController::class, 'getPerformance']);
    
    // Inventory management routes
    Route::get('inventory', [App\Http\Controllers\School\SchoolInventoryController::class, 'getInventoryItems']);
    Route::get('inventory/{item}', [App\Http\Controllers\School\SchoolInventoryController::class, 'getInventoryItem']);
    Route::get('inventory/statistics/overview', [App\Http\Controllers\School\SchoolInventoryController::class, 'getInventoryStatistics']);
    
    // Bulk Attendance Management Routes - New Feature
    Route::prefix('bulk-attendance')->group(function () {
        Route::get('/', [App\Http\Controllers\School\BulkAttendanceController::class, 'index'])->middleware('permission:attendance.read');
        Route::post('/', [App\Http\Controllers\School\BulkAttendanceController::class, 'store'])->middleware('permission:attendance.create');
        Route::get('daily-report', [App\Http\Controllers\School\BulkAttendanceController::class, 'getDailyReport'])->middleware('permission:attendance.read');
        Route::get('weekly-summary', [App\Http\Controllers\School\BulkAttendanceController::class, 'getWeeklySummary'])->middleware('permission:attendance.read');
        Route::get('export', [App\Http\Controllers\School\BulkAttendanceController::class, 'exportData'])->middleware('permission:attendance.read');
    });
    
    // Import routes for school admin - TODO: implement SchoolImportController
    // Route::post('import/students', [App\Http\Controllers\School\SchoolImportController::class, 'importStudents']);
    // Route::post('import/teachers', [App\Http\Controllers\School\SchoolImportController::class, 'importTeachers']);
});

// Performance monitoring routes (SuperAdmin only)
Route::middleware(['role:SuperAdmin'])->prefix('performance')->group(function () {
    Route::get('metrics', [App\Http\Controllers\PerformanceController::class, 'getRealTimeMetrics']);
    Route::get('trends', [App\Http\Controllers\PerformanceController::class, 'getPerformanceTrends']);
    Route::get('health', [App\Http\Controllers\PerformanceController::class, 'getSystemHealth']);
    Route::get('report', [App\Http\Controllers\PerformanceController::class, 'generateReport']);
});