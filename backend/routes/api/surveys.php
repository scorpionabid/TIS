<?php

use App\Http\Controllers\BulkJobController;
use App\Http\Controllers\SurveyAnalyticsController;
use App\Http\Controllers\SurveyController;
use App\Http\Controllers\SurveyNotificationController;
use App\Http\Controllers\SurveyResponseController;
use App\Http\Controllers\SurveyStatusController;
use App\Http\Controllers\SurveyTargetingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Survey Management Routes
|--------------------------------------------------------------------------
|
| Routes for survey creation, management, responses, and analytics
|
*/

// Enhanced Survey Analytics & Statistics (must be before {survey} routes)
Route::middleware('permission:surveys.read')->group(function () {
    Route::get('surveys/analytics/overview', [SurveyAnalyticsController::class, 'dashboard']);
    Route::get('surveys/analytics/region', [SurveyAnalyticsController::class, 'regionAnalytics']);
    Route::get('surveys/hierarchical', [SurveyController::class, 'getHierarchicalList']);

    // NEW: Survey Results Analytics Endpoints (MUST be before generic /analytics route)
    Route::get('surveys/{survey}/analytics/overview', [SurveyAnalyticsController::class, 'analyticsOverview']);
    Route::get('surveys/{survey}/analytics/trends', [SurveyAnalyticsController::class, 'responseTimeTrends']);
    Route::get('surveys/{survey}/analytics/hierarchical-institutions', [SurveyAnalyticsController::class, 'hierarchicalInstitutionsAnalytics']);
    Route::get('surveys/{survey}/analytics/non-responding-institutions', [SurveyAnalyticsController::class, 'nonRespondingInstitutions']);

    // Generic analytics routes (after specific ones)
    Route::get('surveys/{survey}/analytics', [SurveyAnalyticsController::class, 'analytics']);
    Route::get('surveys/{survey}/statistics', [SurveyAnalyticsController::class, 'statistics']);
    Route::get('surveys/{survey}/insights', [SurveyAnalyticsController::class, 'insights']);
    Route::get('surveys/{survey}/institution-breakdown', [SurveyAnalyticsController::class, 'institutionBreakdown']);
    Route::get('surveys/{survey}/hierarchical-breakdown', [SurveyAnalyticsController::class, 'hierarchicalBreakdown']);
});

// Survey CRUD operations
Route::middleware('permission:surveys.read')->group(function () {
    Route::get('surveys', [SurveyController::class, 'index']);
    Route::get('surveys/{survey}', [SurveyController::class, 'show']);
    Route::get('surveys/{survey}/questions', [SurveyController::class, 'getQuestions']);
    Route::get('surveys/{survey}/question-restrictions', [SurveyController::class, 'getQuestionRestrictions']);
    Route::get('surveys/{survey}/preview', [SurveyController::class, 'preview']);
    Route::get('surveys/{survey}/form', [SurveyController::class, 'getSurveyForResponse']);
    Route::get('surveys/{survey}/export', [SurveyController::class, 'export']);
});

Route::middleware('permission:surveys.write')->group(function () {
    Route::post('surveys', [SurveyController::class, 'store']);
    Route::put('surveys/{survey}', [SurveyController::class, 'update']);
    Route::delete('surveys/{survey}', [SurveyController::class, 'destroy']);
    Route::post('surveys/{survey}/duplicate', [SurveyController::class, 'duplicate']);

    // Question reordering
    Route::post('surveys/{survey}/reorder-questions', [SurveyController::class, 'reorderQuestions']);

    // Status management routes - delegated to SurveyStatusController
    Route::post('surveys/{survey}/publish', [SurveyStatusController::class, 'publish']);
    Route::post('surveys/{survey}/pause', [SurveyStatusController::class, 'pause']);
    Route::post('surveys/{survey}/archive', [SurveyStatusController::class, 'archive']);
    Route::post('surveys/{survey}/restore', [SurveyStatusController::class, 'restore']);
    Route::post('surveys/{survey}/close', [SurveyStatusController::class, 'close']);
    Route::post('surveys/{survey}/reopen', [SurveyStatusController::class, 'reopen']);
    Route::post('surveys/{survey}/resume', [SurveyStatusController::class, 'resume']);
});

// Survey targeting routes
Route::middleware('permission:surveys.target')->group(function () {
    Route::get('surveys/{survey}/targeting', [SurveyTargetingController::class, 'getTargeting']);
    Route::post('surveys/{survey}/targeting', [SurveyTargetingController::class, 'setTargeting']);
    Route::put('surveys/{survey}/targeting', [SurveyTargetingController::class, 'updateTargeting']);
    Route::delete('surveys/{survey}/targeting', [SurveyTargetingController::class, 'clearTargeting']);
    Route::get('surveys/{survey}/eligible-users', [SurveyTargetingController::class, 'getEligibleUsers']);
    Route::post('surveys/{survey}/notify-targets', [SurveyTargetingController::class, 'notifyTargets']);
    Route::get('targeting/preview', [SurveyTargetingController::class, 'previewTargeting']);
    Route::get('targeting/templates', [SurveyTargetingController::class, 'getTargetingTemplates']);
    Route::post('targeting/templates', [SurveyTargetingController::class, 'saveTargetingTemplate']);
});

// Survey response management
Route::middleware('permission:survey_responses.read')->group(function () {
    Route::get('survey-responses', [SurveyResponseController::class, 'index']);
    Route::get('survey-responses/{response}', [SurveyResponseController::class, 'show']);
    Route::get('surveys/{survey}/responses', [SurveyResponseController::class, 'getSurveyResponses']);
    Route::get('surveys/{survey}/responses/export', [SurveyResponseController::class, 'exportResponses']);
    Route::get('surveys/{survey}/responses/summary', [SurveyResponseController::class, 'getResponsesSummary']);
});

Route::middleware('permission:survey_responses.write')->group(function () {
    Route::post('surveys/{survey}/responses/start', [SurveyResponseController::class, 'startResponse']);
    Route::post('surveys/{survey}/start', [SurveyResponseController::class, 'start']);
    Route::post('surveys/{survey}/respond', [SurveyResponseController::class, 'store']);
    Route::put('survey-responses/{response}', [SurveyResponseController::class, 'update']);
    Route::delete('survey-responses/{response}', [SurveyResponseController::class, 'destroy']);
    Route::post('survey-responses/{response}/submit', [SurveyResponseController::class, 'submit']);
    Route::put('survey-responses/{response}/save', [SurveyResponseController::class, 'saveResponse']);
    Route::post('survey-responses/{response}/save-draft', [SurveyResponseController::class, 'saveDraft']);
    Route::post('survey-responses/{response}/reopen', [SurveyResponseController::class, 'reopen']);
});

// REMOVED: Survey response approval routes - use survey-response-approval.php routes instead
// The following routes have been consolidated:
// - survey-responses/{response}/approve -> /api/survey-responses/{response}/approve
// - survey-responses/{response}/reject -> /api/survey-responses/{response}/reject
// - Bulk approval routes -> /api/survey-responses/bulk-approval

// Bulk job management routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('bulk-jobs/{jobId}/status', [BulkJobController::class, 'getJobStatus']);
    Route::get('bulk-jobs/user/history', [BulkJobController::class, 'getUserJobs']);
    Route::post('bulk-jobs/{jobId}/cancel', [BulkJobController::class, 'cancelJob']);
});

// Admin bulk job statistics
Route::middleware(['auth:sanctum', 'role:superadmin'])->group(function () {
    Route::get('bulk-jobs/statistics', [BulkJobController::class, 'getJobStatistics']);
});

// Survey Notifications - accessible by all authenticated users
Route::middleware('auth:sanctum')->group(function () {
    Route::get('survey-notifications', [SurveyNotificationController::class, 'index']);
    Route::get('survey-notifications/unread-count', [SurveyNotificationController::class, 'unreadCount']);
    Route::get('survey-notifications/stats', [SurveyNotificationController::class, 'stats']);
    Route::post('survey-notifications/{notificationId}/mark-read', [SurveyNotificationController::class, 'markAsRead']);
});

// My Surveys - User-facing survey endpoints
Route::middleware('auth:sanctum')->prefix('my-surveys')->group(function () {
    Route::get('dashboard-stats', [SurveyController::class, 'getMyDashboardStats']);
    Route::get('assigned', [SurveyController::class, 'getAssignedSurveys']);
    Route::get('responses', [SurveyController::class, 'getMyResponses']);
    Route::get('recent', [SurveyController::class, 'getRecentAssignedSurveys']);
});

// Survey Response Reports
Route::middleware('auth:sanctum')->group(function () {
    Route::get('survey-responses/{response}/report', [SurveyResponseController::class, 'downloadReport']);
});

// Survey Template Routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('survey-templates', [\App\Http\Controllers\SurveyTemplateController::class, 'index']);
    Route::get('survey-templates/stats', [\App\Http\Controllers\SurveyTemplateController::class, 'getStats']);
    Route::post('survey-templates', [\App\Http\Controllers\SurveyTemplateController::class, 'store'])->middleware('permission:surveys.write');
    Route::get('survey-templates/{template}', [\App\Http\Controllers\SurveyTemplateController::class, 'show']);
    Route::put('survey-templates/{template}', [\App\Http\Controllers\SurveyTemplateController::class, 'update'])->middleware('permission:surveys.write');
    Route::delete('survey-templates/{template}', [\App\Http\Controllers\SurveyTemplateController::class, 'destroy'])->middleware('permission:surveys.write');
    Route::post('survey-templates/create-from-survey', [\App\Http\Controllers\SurveyTemplateController::class, 'createFromSurvey'])->middleware('permission:surveys.write');
});
