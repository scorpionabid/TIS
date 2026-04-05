<?php

use App\Http\Controllers\API\RegionAssessmentController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\AssessmentResultFieldController;
use App\Http\Controllers\AssessmentStageController;
use App\Http\Controllers\AssessmentTypeController;
use App\Http\Controllers\GradeBookAnalyticsController;
use App\Http\Controllers\GradeBookAuditLogController;
use App\Http\Controllers\GradeBookController;
use App\Http\Controllers\GradeHistoryController;
use App\Http\Controllers\SchoolAssessmentController;
use App\Http\Controllers\SchoolAssessmentReportController;
use App\Http\Controllers\UnifiedAssessmentController;
use Illuminate\Support\Facades\Route;

// Assessment Management Routes
Route::prefix('assessments')->middleware('permission:assessments.read')->group(function () {
    Route::get('/', [AssessmentController::class, 'index']);
    Route::post('/', [AssessmentController::class, 'store'])->middleware('permission:assessments.create');
    Route::get('/{assessment}', [AssessmentController::class, 'show']);
    Route::put('/{assessment}', [AssessmentController::class, 'update'])->middleware('permission:assessments.update');
    Route::delete('/{assessment}', [AssessmentController::class, 'destroy'])->middleware('permission:assessments.update');

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
    Route::put('/{assessmentType}', [AssessmentTypeController::class, 'update'])->middleware('role:superadmin|regionadmin|regionoperator|schooladmin');
    Route::delete('/{assessmentType}', [AssessmentTypeController::class, 'destroy'])->middleware('role:superadmin|regionadmin|regionoperator|schooladmin');
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
    Route::put('/{assessmentStage}', [AssessmentStageController::class, 'update'])->middleware('role:superadmin|regionadmin|regionoperator|schooladmin');
    Route::delete('/{assessmentStage}', [AssessmentStageController::class, 'destroy'])->middleware('role:superadmin|regionadmin|regionoperator|schooladmin');
});

Route::prefix('assessment-types/{assessmentType}/result-fields')->middleware('auth:sanctum')->group(function () {
    Route::get('/', [AssessmentResultFieldController::class, 'index'])->middleware('permission:assessment-types.read');
    Route::post('/', [AssessmentResultFieldController::class, 'store'])->middleware('permission:assessment-types.create');
    Route::put('/{assessmentResultField}', [AssessmentResultFieldController::class, 'update'])->middleware('role:superadmin|regionadmin|regionoperator|schooladmin');
    Route::delete('/{assessmentResultField}', [AssessmentResultFieldController::class, 'destroy'])->middleware('role:superadmin|regionadmin|regionoperator|schooladmin');
});

Route::prefix('school-assessments')->middleware('auth:sanctum')->group(function () {
    Route::get('/', [SchoolAssessmentController::class, 'index'])->middleware('role:superadmin|regionadmin|regionoperator|schooladmin');
    Route::post('/', [SchoolAssessmentController::class, 'store'])->middleware('role:superadmin|regionadmin|regionoperator|schooladmin');
    Route::get('/reports/summary', SchoolAssessmentReportController::class)->middleware('role:superadmin|regionadmin|regionoperator|schooladmin');
    Route::get('/reports/summary/export', [SchoolAssessmentReportController::class, 'export'])->middleware('role:superadmin|regionadmin|regionoperator|schooladmin');
    Route::get('/{schoolAssessment}', [SchoolAssessmentController::class, 'show'])->middleware('role:superadmin|regionadmin|regionoperator|schooladmin');
    Route::get('/{schoolAssessment}/export', [SchoolAssessmentController::class, 'export'])->middleware('role:superadmin|regionadmin|regionoperator|schooladmin');
    Route::post('/{schoolAssessment}/class-results', [SchoolAssessmentController::class, 'storeClassResults'])->middleware('role:superadmin|regionadmin|regionoperator|schooladmin');
    Route::delete('/{schoolAssessment}/class-results/{classResult}', [SchoolAssessmentController::class, 'deleteClassResult'])->middleware('role:superadmin|regionadmin|regionoperator|schooladmin');
    Route::post('/{schoolAssessment}/complete', [SchoolAssessmentController::class, 'complete'])->middleware('role:superadmin|regionadmin|regionoperator|schooladmin');
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
Route::prefix('region-assessments')->middleware(['auth:sanctum', 'role_or_permission:superadmin|regionadmin|regionoperator'])->group(function () {
    Route::get('/', [RegionAssessmentController::class, 'index']);
    Route::post('/', [RegionAssessmentController::class, 'store']);
    Route::get('/{assessment}', [RegionAssessmentController::class, 'show']);
    Route::put('/{assessment}', [RegionAssessmentController::class, 'update']);
    Route::delete('/{assessment}', [RegionAssessmentController::class, 'destroy']);
    Route::get('/region/{region}/statistics', [RegionAssessmentController::class, 'getRegionStatistics']);
    Route::get('/performance/comparison', [RegionAssessmentController::class, 'getPerformanceComparison']);
});

// Grade Book Analytics Routes (Region Admin)
Route::prefix('analytics/grade-books')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/region-summary', [GradeBookAnalyticsController::class, 'regionSummary'])
        ->middleware('permission:analytics.read');
    Route::get('/performance', [GradeBookAnalyticsController::class, 'performanceAnalytics'])
        ->middleware('permission:analytics.read');
    Route::get('/year-comparison', [GradeBookAnalyticsController::class, 'yearComparison'])
        ->middleware('permission:analytics.read');
    Route::get('/subject-ranking', [GradeBookAnalyticsController::class, 'subjectRanking'])
        ->middleware('permission:analytics.read');
    Route::get('/institution-detail', [GradeBookAnalyticsController::class, 'institutionDetail'])
        ->middleware('permission:analytics.read');
});

Route::prefix('grade-books')->middleware('auth:sanctum')->group(function () {
    // Admin Hierarchy and Analysis APIs
    Route::get('/hierarchy', [GradeBookController::class, 'getHierarchy'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin');
    Route::post('/sync', [GradeBookController::class, 'sync'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');

    // Analysis endpoints (schooladmin öz məktəbinin analizinə baxa bilər)
    Route::get('/analysis/multi-level', [GradeBookController::class, 'getMultiLevelAnalysis'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin');
    Route::get('/analysis/overview', [GradeBookController::class, 'getAnalysisOverview'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');
    Route::get('/analysis/comparison', [GradeBookController::class, 'getAnalysisComparison'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');
    Route::get('/analysis/trends', [GradeBookController::class, 'getAnalysisTrends'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');
    Route::get('/analysis/deep-dive', [GradeBookController::class, 'getAnalysisDeepDive'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');
    Route::get('/analysis/pivot', [GradeBookController::class, 'getPivotAnalysis'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');
    Route::get('/analysis/class-level-subject', [GradeBookController::class, 'getClassLevelSubjectAnalysis'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');
    Route::get('/analysis/region-trends', [GradeBookController::class, 'getRegionTrends'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin');
    Route::get('/analysis/journal-completion', [GradeBookController::class, 'getJournalCompletion'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');
    Route::get('/analysis/scoreboard', [GradeBookController::class, 'getScoreboard'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');
    Route::get('/analysis/available-grades', [GradeBookController::class, 'getAnalysisAvailableGrades'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');
    Route::get('/analysis/pivot-nested', [GradeBookController::class, 'getNestedPivotAnalysis'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');
    Route::get('/analysis/export', [GradeBookController::class, 'exportAnalysis'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');
    Route::get('/analysis/export-comprehensive', [GradeBookController::class, 'exportComprehensive'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');

    // CRUD
    Route::get('/', [GradeBookController::class, 'index'])->middleware('permission:assessments.read');
    Route::post('/', [GradeBookController::class, 'store'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');
    Route::get('/{gradeBook}', [GradeBookController::class, 'show'])->middleware('permission:assessments.read');

    // Students with scores
    Route::get('/{gradeBook}/students', [GradeBookController::class, 'getStudentsWithScores'])->middleware('permission:assessments.read');

    // Student grade history analytics
    Route::get('/{gradeBook}/students/{studentId}/history', [GradeHistoryController::class, 'history'])->middleware('permission:assessments.read');
    Route::get('/{gradeBook}/students/{studentId}/trend', [GradeHistoryController::class, 'trend'])->middleware('permission:assessments.read');
    Route::get('/{gradeBook}/students/{studentId}/comparison', [GradeHistoryController::class, 'comparison'])->middleware('permission:assessments.read');

    // Excel Import/Export
    Route::get('/{gradeBook}/export-template', [GradeBookController::class, 'exportTemplate'])->middleware('permission:assessments.read');
    Route::get('/{gradeBook}/export', [GradeBookController::class, 'exportGradeBook'])->middleware('permission:assessments.read');
    Route::post('/{gradeBook}/import', [GradeBookController::class, 'importScores'])->middleware('permission:assessments.write');

    // Audit Logs
    Route::get('/{gradeBook}/audit-logs', [GradeBookAuditLogController::class, 'index'])->middleware('permission:assessments.read');
    Route::get('/{gradeBook}/audit-logs/student/{studentId}', [GradeBookAuditLogController::class, 'studentHistory'])->middleware('permission:assessments.read');
    Route::get('/{gradeBook}/audit-logs/recent-activity', [GradeBookAuditLogController::class, 'recentActivity'])->middleware('permission:assessments.read');
    Route::get('/{gradeBook}/audit-logs/suspicious-activity', [GradeBookAuditLogController::class, 'suspiciousActivity'])->middleware('permission:assessments.read');
    Route::get('/{gradeBook}/audit-logs/cell/{cellId}', [GradeBookAuditLogController::class, 'cellHistory'])->middleware('permission:assessments.read');

    // Columns (Exams)
    Route::post('/{gradeBook}/columns', [GradeBookController::class, 'storeColumn'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin|teacher');
    Route::patch('/columns/{column}', [GradeBookController::class, 'updateColumn'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin|teacher');
    Route::delete('/columns/{column}', [GradeBookController::class, 'archiveColumn'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin|teacher');

    // Cells (Scores)
    Route::patch('/cells/{cell}', [GradeBookController::class, 'updateCell'])->middleware('permission:assessments.update');
    Route::post('/{gradeBook}/cells/bulk-update', [GradeBookController::class, 'bulkUpdateCells'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin|teacher');

    // Teachers
    Route::post('/{gradeBook}/teachers', [GradeBookController::class, 'assignTeacher'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');
    Route::delete('/teachers/{teacherAssignment}', [GradeBookController::class, 'removeTeacher'])->middleware('permission:assessments.delete');

    // Recalculation
    Route::post('/{gradeBook}/recalculate', [GradeBookController::class, 'recalculate'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin|teacher');

    // Orphaned Grade Books Management
    Route::get('/orphaned', [GradeBookController::class, 'findOrphaned'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');
    Route::post('/cleanup-orphaned', [GradeBookController::class, 'cleanupOrphaned'])->middleware('role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin');
});
