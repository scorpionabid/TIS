<?php

use App\Http\Controllers\SurveyController;
use App\Http\Controllers\SurveyResponseController;
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
Route::middleware('permission:surveys.analytics')->group(function () {
    Route::get('surveys/analytics/overview', [SurveyController::class, 'getAnalyticsOverview']);
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
    Route::get('surveys/{survey}/preview', [SurveyController::class, 'preview']);
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
    Route::post('surveys/{survey}/respond', [SurveyResponseController::class, 'store']);
    Route::put('survey-responses/{response}', [SurveyResponseController::class, 'update']);
    Route::delete('survey-responses/{response}', [SurveyResponseController::class, 'destroy']);
    Route::post('survey-responses/{response}/submit', [SurveyResponseController::class, 'submit']);
    Route::post('survey-responses/{response}/save-draft', [SurveyResponseController::class, 'saveDraft']);
});

// Survey response approval workflow
Route::middleware('permission:survey_responses.approve')->group(function () {
    Route::get('survey-responses/pending-approval', [SurveyResponseController::class, 'getPendingApproval']);
    Route::post('survey-responses/{response}/approve', [SurveyResponseController::class, 'approve']);
    Route::post('survey-responses/{response}/reject', [SurveyResponseController::class, 'reject']);
    Route::get('survey-responses/{response}/approval-history', [SurveyResponseController::class, 'getApprovalHistory']);
});