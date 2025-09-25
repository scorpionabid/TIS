<?php

use App\Http\Controllers\SurveyController;
use App\Http\Controllers\SurveyResponseController;
use App\Http\Controllers\SurveyTargetingController;
use App\Http\Controllers\SurveyNotificationController;
use App\Http\Controllers\BulkJobController;
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
    Route::get('surveys/analytics/overview', [SurveyController::class, 'getAnalyticsOverview']);
    Route::get('surveys/analytics/region', [SurveyController::class, 'getRegionAnalytics']);
    Route::get('surveys/hierarchical', [SurveyController::class, 'getHierarchicalList']);
    Route::get('surveys/analytics/response-trends', [SurveyController::class, 'getResponseTrends']);
    Route::get('surveys/analytics/completion-rates', [SurveyController::class, 'getCompletionRates']);
    Route::get('surveys/analytics/demographics', [SurveyController::class, 'getDemographicAnalysis']);
    Route::get('surveys/analytics/export/{format}', [SurveyController::class, 'exportAnalytics']);
    Route::get('surveys/{survey}/analytics', [SurveyController::class, 'getSurveyAnalytics']);
    Route::get('surveys/{survey}/analytics/responses', [SurveyController::class, 'getResponseAnalytics']);
    Route::get('surveys/{survey}/analytics/export', [SurveyController::class, 'exportSurveyAnalytics']);
    Route::get('surveys/{survey}/statistics', [SurveyController::class, 'getAdvancedStatistics']);
    Route::get('surveys/{survey}/insights', [SurveyController::class, 'getSurveyInsights']);
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
    Route::post('surveys/{survey}/publish', [SurveyController::class, 'publish']);
    Route::post('surveys/{survey}/unpublish', [SurveyController::class, 'unpublish']);
    Route::post('surveys/{survey}/archive', [SurveyController::class, 'archive']);
    Route::post('surveys/{survey}/restore', [SurveyController::class, 'restore']);
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
    Route::post('survey-notifications/{surveyId}/mark-read', [SurveyNotificationController::class, 'markAsRead']);
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