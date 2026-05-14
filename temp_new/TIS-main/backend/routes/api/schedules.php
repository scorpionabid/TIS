<?php

use App\Http\Controllers\API\RegionalScheduleController;
use App\Http\Controllers\API\ScheduleGenerationController;
use App\Http\Controllers\ScheduleControllerRefactored as ScheduleController;
use App\Http\Controllers\SchoolEventController;
use Illuminate\Support\Facades\Route;

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
