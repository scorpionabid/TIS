<?php

use App\Http\Controllers\SurveyResponseApprovalController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Survey Response Approval Routes
|--------------------------------------------------------------------------
|
| Enterprise-grade survey response approval system routes
| Handles 600+ institutions with hierarchical approval workflows
|
*/

Route::middleware(['auth:sanctum'])->group(function () {
    
    // Survey Response Approval Management
    Route::prefix('survey-response-approval')->name('survey-response-approval.')->group(function () {
        
        // Get published surveys for approval dashboard
        Route::get('surveys/published', [SurveyResponseApprovalController::class, 'getPublishedSurveys'])
            ->middleware('permission:survey_responses.read')
            ->name('published-surveys');
            
        // Get survey responses for approval with advanced filtering
        Route::get('surveys/{survey}/responses', [SurveyResponseApprovalController::class, 'getResponsesForApproval'])
            ->middleware('permission:survey_responses.read')
            ->name('responses');
            
        // Get approval statistics for dashboard
        Route::get('surveys/{survey}/stats', [SurveyResponseApprovalController::class, 'getApprovalStats'])
            ->middleware('permission:survey_responses.read')
            ->name('stats');

        // Get table editing view for responses
        Route::get('surveys/{survey}/table-view', [SurveyResponseApprovalController::class, 'getTableEditingView'])
            ->middleware('permission:survey_responses.read')
            ->name('table-view');

        // Export survey responses to Excel
        Route::get('surveys/{survey}/export', [SurveyResponseApprovalController::class, 'exportSurveyResponses'])
            ->middleware('permission:survey_responses.export')
            ->name('export');
    });
    
    // Individual Survey Response Operations
    Route::prefix('survey-responses')->name('survey-responses.')->group(function () {
        
        // Response detail and management
        Route::get('{response}/detail', [SurveyResponseApprovalController::class, 'getResponseDetail'])
            ->middleware('permission:survey_responses.read')
            ->name('detail');
            
        Route::put('{response}/update', [SurveyResponseApprovalController::class, 'updateResponseData'])
            ->middleware('permission:survey_responses.write')
            ->name('update');
            
        // Approval workflow operations
        Route::post('{response}/submit-approval', [SurveyResponseApprovalController::class, 'createApprovalRequest'])
            ->middleware('permission:survey_responses.write')
            ->name('submit-approval');
            
        Route::post('{response}/approve', [SurveyResponseApprovalController::class, 'approveResponse'])
            ->middleware('permission:survey_responses.approve')
            ->name('approve');
            
        Route::post('{response}/reject', [SurveyResponseApprovalController::class, 'rejectResponse'])
            ->middleware('permission:survey_responses.approve')
            ->name('reject');
            
        Route::post('{response}/return', [SurveyResponseApprovalController::class, 'returnForRevision'])
            ->middleware('permission:survey_responses.approve')
            ->name('return');
            
        // Bulk operations for enterprise scalability
        Route::post('bulk-approval', [SurveyResponseApprovalController::class, 'bulkApprovalOperation'])
            ->middleware(['permission:survey_responses.approve', 'permission:survey_responses.bulk_approve'])
            ->name('bulk-approval');

        // Batch update multiple responses
        Route::post('batch-update', [SurveyResponseApprovalController::class, 'batchUpdateResponses'])
            ->middleware('permission:survey_responses.write')
            ->name('batch-update');
    });
});

/*
|--------------------------------------------------------------------------
| API Endpoint Documentation
|--------------------------------------------------------------------------
|
| Survey Response Approval Endpoints:
|
| 1. GET /api/survey-response-approval/surveys/published
|    - Get all published surveys available for response approval
|    - Returns: {success, data: surveys[], message}
|
| 2. GET /api/survey-response-approval/surveys/{survey}/responses
|    - Get paginated survey responses with advanced filtering
|    - Filters: status, approval_status, institution_id, institution_type, 
|              date_from, date_to, search, per_page
|    - Returns: {success, data: {responses, pagination, stats}, message}
|
| 3. GET /api/survey-response-approval/surveys/{survey}/stats  
|    - Get approval statistics for dashboard
|    - Returns: {success, data: {total, pending, approved, rejected, draft, completion_rate}, message}
|
| 4. GET /api/survey-responses/{response}/detail
|    - Get detailed response with approval history
|    - Returns: {success, data: {response, approval_history, can_edit, can_approve}, message}
|
| 5. PUT /api/survey-responses/{response}/update
|    - Update survey response data
|    - Body: {responses: {question_id: answer, ...}}
|    - Returns: {success, data: updated_response, message}
|
| 6. POST /api/survey-responses/{response}/submit-approval
|    - Submit response for approval
|    - Body: {notes?: string, deadline?: date}
|    - Returns: {success, data: approval_request, message}
|
| 7. POST /api/survey-responses/{response}/approve
|    - Approve a survey response
|    - Body: {comments?: string, metadata?: object}
|    - Returns: {success, data: {status, message}, message}
|
| 8. POST /api/survey-responses/{response}/reject
|    - Reject a survey response
|    - Body: {comments: string, metadata?: object}
|    - Returns: {success, data: {status, message}, message}
|
| 9. POST /api/survey-responses/{response}/return
|    - Return response for revision
|    - Body: {comments: string, metadata?: object}
|    - Returns: {success, data: {status, message}, message}
|
| 10. POST /api/survey-responses/bulk-approval
|     - Bulk approval operations (up to 500 responses)
|     - Body: {response_ids: number[], action: 'approve|reject|return', comments?: string}
|     - Returns: {success, data: {successful, failed, results, errors}, message}
|
| 11. GET /api/survey-response-approval/surveys/{survey}/export
|     - Export survey responses to Excel/CSV format
|     - Params: format=xlsx|csv, status, approval_status, institution_id, date_from, date_to, search
|     - Returns: Excel/CSV file download
|
|--------------------------------------------------------------------------
| Performance Features:
|--------------------------------------------------------------------------
|
| - Optimized database queries with composite indexes
| - Hierarchical role-based access control
| - Pagination support (10-100 results per page)
| - Advanced filtering and search capabilities
| - Bulk operations with transaction safety
| - Permission-based API access control
| - Enterprise scalability for 600+ institutions
|
|--------------------------------------------------------------------------
*/