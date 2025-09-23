<?php

use App\Http\Controllers\SurveyApprovalController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Survey Approval Routes
|--------------------------------------------------------------------------
|
| Enhanced survey approval system routes
| Bu routes mövcud surveys.php routes-ni tamamlayır, əvəz etmir
|
*/

Route::middleware(['auth:sanctum'])->group(function () {
    
    // Survey Response Approval Operations
    Route::prefix('survey-approval')->group(function () {
        
        // Response approval workflow
        Route::post('responses/{response}/submit', [SurveyApprovalController::class, 'submitForApproval'])
            ->middleware('permission:survey_responses.write')
            ->name('survey-approval.submit-response');
            
        Route::post('requests/{dataApprovalRequest}/approve', [SurveyApprovalController::class, 'approveResponse'])
            ->middleware('permission:survey_responses.approve')
            ->name('survey-approval.approve-response');

        Route::post('requests/{dataApprovalRequest}/delegate', [SurveyApprovalController::class, 'delegateApproval'])
            ->middleware('permission:survey_responses.approve')
            ->name('survey-approval.delegate');
            
        // Bulk operations
        Route::post('bulk-approve', [SurveyApprovalController::class, 'bulkApprove'])
            ->middleware('permission:survey_responses.approve')
            ->name('survey-approval.bulk-approve');
            
        // Pending approvals
        Route::get('pending', [SurveyApprovalController::class, 'getPendingApprovals'])
            ->middleware('permission:survey_responses.read')
            ->name('survey-approval.pending');
            
        // Dashboard stats
        Route::get('dashboard-stats', [SurveyApprovalController::class, 'getDashboardStats'])
            ->middleware('permission:survey_responses.read')
            ->name('survey-approval.dashboard-stats');
            
        // Rejection
        Route::post('requests/{dataApprovalRequest}/reject', [SurveyApprovalController::class, 'rejectResponse'])
            ->middleware('permission:survey_responses.approve')
            ->name('survey-approval.reject-response');

        // Cancel approval request
        Route::post('requests/{dataApprovalRequest}/cancel', [SurveyApprovalController::class, 'cancelApprovalRequest'])
            ->middleware('permission:survey_responses.write')
            ->name('survey-approval.cancel-request');
            
        // Trends
        Route::get('trends', [SurveyApprovalController::class, 'getApprovalTrends'])
            ->middleware('permission:survey_responses.read')
            ->name('survey-approval.trends');
            
        // Export
        Route::get('export', [SurveyApprovalController::class, 'exportApprovalData'])
            ->middleware('permission:survey_responses.read')
            ->name('survey-approval.export');
            
        // Institution performance
        Route::get('institution-performance', [SurveyApprovalController::class, 'getInstitutionPerformance'])
            ->middleware('permission:survey_responses.read')
            ->name('survey-approval.institution-performance');
    });
    
    // Survey Template Approval
    Route::prefix('survey-templates')->group(function () {
        Route::post('{survey}/submit-for-approval', [SurveyApprovalController::class, 'submitTemplateForApproval'])
            ->middleware('permission:surveys.write')
            ->name('survey-templates.submit-approval');
    });
    
    // Analytics & Reporting
    Route::prefix('survey-approval-analytics')->group(function () {
        Route::get('/', [SurveyApprovalController::class, 'getApprovalAnalytics'])
            ->middleware('permission:surveys.read')
            ->name('survey-approval.analytics');
            
        Route::get('surveys/{survey}/history', [SurveyApprovalController::class, 'getApprovalHistory'])
            ->middleware('permission:surveys.read')
            ->name('survey-approval.history');
    });
    
    // Delegation Management
    Route::prefix('approval-delegation')->group(function () {
        Route::get('requests/{dataApprovalRequest}/status', [SurveyApprovalController::class, 'checkDelegationStatus'])
            ->middleware('permission:survey_responses.read')
            ->name('approval-delegation.status');
    });
    
    // Workflow Templates
    Route::prefix('approval-workflows')->group(function () {
        Route::get('templates', [SurveyApprovalController::class, 'getWorkflowTemplates'])
            ->middleware('permission:survey_responses.read')
            ->name('approval-workflows.templates');
            
        Route::get('config/{type}', [SurveyApprovalController::class, 'getWorkflowConfig'])
            ->middleware('permission:survey_responses.read')
            ->name('approval-workflows.config.get');
            
        Route::put('config/{type}', [SurveyApprovalController::class, 'updateWorkflowConfig'])
            ->middleware('permission:survey_responses.approve')
            ->name('approval-workflows.config.update');
    });
    
    // User Management for delegation
    Route::prefix('users')->group(function () {
        Route::get('for-delegation', [SurveyApprovalController::class, 'getUsersForDelegation'])
            ->middleware('permission:survey_responses.read')
            ->name('users.for-delegation');
    });
});