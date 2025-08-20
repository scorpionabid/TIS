<?php

use App\Http\Controllers\SuperAdminDashboardController;
use App\Http\Controllers\RegionAdmin\RegionAdminDashboardController;
use App\Http\Controllers\RegionAdmin\RegionAdminInstitutionController;
use App\Http\Controllers\RegionAdmin\RegionAdminUserController;
use App\Http\Controllers\RegionAdmin\RegionAdminSurveyController;
use App\Http\Controllers\RegionAdmin\RegionAdminReportsController;
use App\Http\Controllers\RegionAdmin\RegionAdminTaskController;
use App\Http\Controllers\RegionOperator\RegionOperatorDashboardController;
use App\Http\Controllers\SektorAdmin\SektorAdminDashboardController;
use App\Http\Controllers\MektebAdmin\MektebAdminDashboardController;
use App\Http\Controllers\School\SchoolDashboardController;
use App\Http\Controllers\School\SchoolStudentController;
use App\Http\Controllers\School\SchoolTeacherController;
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
    Route::get('dashboard/stats', [RegionAdminDashboardController::class, 'getStats']);
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
    
    // User management endpoints - READ operations
    Route::get('users', [RegionAdminUserController::class, 'getRegionUsers']);
    Route::get('users/{user}', [RegionAdminUserController::class, 'getUserDetails']);
    Route::get('users/{user}/activity', [RegionAdminUserController::class, 'getUserActivity']);
    Route::get('institutions/{institution}/users', [RegionAdminUserController::class, 'getInstitutionUsers']);
    
    // User management endpoints - WRITE operations
    Route::post('users', [RegionAdminUserController::class, 'createUser']);
    Route::put('users/{user}', [RegionAdminUserController::class, 'updateUser']);
    Route::delete('users/{user}', [RegionAdminUserController::class, 'deleteUser']);
    
    // User management helper endpoints
    Route::post('users/{user}/assign-role', [RegionAdminUserController::class, 'assignRole']);
    Route::post('users/{user}/assign-institution', [RegionAdminUserController::class, 'assignInstitution']);
    Route::post('users/bulk-create', [RegionAdminUserController::class, 'bulkCreateUsers']);
    
    // Survey analytics endpoints
    Route::get('surveys/analytics', [RegionAdminSurveyController::class, 'getSurveyAnalytics']);
    Route::get('surveys/{survey}/responses', [RegionAdminSurveyController::class, 'getSurveyResponses']);
    Route::get('surveys/{survey}/statistics', [RegionAdminSurveyController::class, 'getSurveyStatistics']);
    
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
    Route::get('tasks/{taskId}', [SektorAdminDashboardController::class, 'getTaskDetails']);
    Route::post('tasks/{taskId}/approve', [SektorAdminDashboardController::class, 'approveTask']);
    Route::post('tasks/{taskId}/reject', [SektorAdminDashboardController::class, 'rejectTask']);
    Route::get('tasks/statistics', [SektorAdminDashboardController::class, 'getTaskStatistics']);
});

// MektebAdmin Dashboard Routes
Route::prefix('mektebadmin')->middleware(['role:məktəbadmin', 'regional.access:school', 'audit.logging'])->group(function () {
    // Dashboard endpoints
    Route::get('dashboard', [MektebAdminDashboardController::class, 'getDashboard']);
    Route::get('dashboard/stats', [MektebAdminDashboardController::class, 'getStats']);
    Route::get('dashboard/analytics', [MektebAdminDashboardController::class, 'getAnalytics']);
});

// Teacher Dashboard Routes  
Route::prefix('teacher')->middleware(['role:müəllim', 'regional.access:school', 'audit.logging'])->group(function () {
    // Dashboard endpoints
    Route::get('dashboard', [App\Http\Controllers\TeacherDashboardController::class, 'getDashboard']);
    Route::get('dashboard/stats', [App\Http\Controllers\TeacherDashboardController::class, 'getStats']);
    Route::get('classes', [App\Http\Controllers\TeacherDashboardController::class, 'getTeacherClasses']);
});

// School Admin Dashboard Routes
Route::prefix('school-admin')->middleware(['auth:sanctum'])->group(function () {
    // Dashboard endpoints - using new controllers
    Route::get('dashboard/overview', [SchoolDashboardController::class, 'getOverview']);
    Route::get('dashboard/statistics', [SchoolDashboardController::class, 'getStatistics']);
    Route::get('dashboard/analytics', [SchoolDashboardController::class, 'getAnalytics']);
    Route::get('dashboard/recent-activity', [SchoolDashboardController::class, 'getRecentActivity']);
    Route::get('dashboard/quick-actions', [SchoolDashboardController::class, 'getQuickActions']);
    
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
    
    // Class management routes
    Route::get('classes', [App\Http\Controllers\School\SchoolClassController::class, 'index']);
    Route::post('classes', [App\Http\Controllers\School\SchoolClassController::class, 'store']);
    Route::get('classes/{class}', [App\Http\Controllers\School\SchoolClassController::class, 'show']);
    Route::put('classes/{class}', [App\Http\Controllers\School\SchoolClassController::class, 'update']);
    Route::delete('classes/{class}', [App\Http\Controllers\School\SchoolClassController::class, 'destroy']);
    Route::get('classes/{class}/students', [App\Http\Controllers\School\SchoolClassController::class, 'getStudents']);
    Route::post('classes/{class}/students', [App\Http\Controllers\School\SchoolClassController::class, 'assignStudents']);
    
    // Teacher management routes
    Route::get('teachers', [SchoolTeacherController::class, 'index']);
    Route::get('teachers/{teacher}', [SchoolTeacherController::class, 'show']);
    Route::post('teachers/{teacher}/assign-classes', [SchoolTeacherController::class, 'assignClasses']);
    Route::get('teachers/{teacher}/performance', [SchoolTeacherController::class, 'getPerformance']);
    
    // Import routes for school admin
    Route::post('import/students', [App\Http\Controllers\School\SchoolImportController::class, 'importStudents']);
    Route::post('import/teachers', [App\Http\Controllers\School\SchoolImportController::class, 'importTeachers']);
});