<?php

use App\Http\Controllers\SurveyApprovalController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Survey Approval Routes (Simplified)
|--------------------------------------------------------------------------
|
| Consolidated survey approval system routes
| Handles 600+ institutions with hierarchical approval workflows
|
*/

Route::middleware(['auth:sanctum'])->group(function () {
    // Survey Management
    Route::prefix('survey-approval')->name('survey-approval.')->group(function () {
        // Get published surveys for approval dashboard
        Route::get('surveys/published', [SurveyApprovalController::class, 'getPublishedSurveys'])
            ->middleware('permission:survey_responses.read')
            ->name('published-surveys');

        // Get survey responses for approval with advanced filtering
        Route::get('surveys/{survey}/responses', [SurveyApprovalController::class, 'getResponsesForApproval'])
            ->middleware('permission:survey_responses.read')
            ->name('responses');

        // Get approval statistics for dashboard
        Route::get('surveys/{survey}/stats', [SurveyApprovalController::class, 'getApprovalStats'])
            ->middleware('permission:survey_responses.read')
            ->name('stats');

        // Get table editing view for responses
        Route::get('surveys/{survey}/table-view', [SurveyApprovalController::class, 'getTableEditingView'])
            ->middleware('permission:survey_responses.read')
            ->name('table-view');

        // Export survey responses to Excel
        Route::get('surveys/{survey}/export', [SurveyApprovalController::class, 'exportSurveyResponses'])
            ->middleware('permission:survey_responses.read')
            ->name('export');
    });

    // Response Operations
    Route::prefix('responses')->name('responses.')->group(function () {
        // Response detail and management
        Route::get('{response}/detail', [SurveyApprovalController::class, 'getResponseDetail'])
            ->middleware('permission:survey_responses.read')
            ->name('detail');

        Route::put('{response}/update', [SurveyApprovalController::class, 'updateResponseData'])
            ->middleware('permission:survey_responses.write')
            ->name('update');

        // Approval workflow operations
        Route::post('{response}/submit-approval', [SurveyApprovalController::class, 'createApprovalRequest'])
            ->middleware('permission:survey_responses.write')
            ->name('submit-approval');

        Route::post('{response}/approve', [SurveyApprovalController::class, 'approveResponse'])
            ->middleware('permission:survey_responses.approve')
            ->name('approve');

        Route::post('{response}/reject', [SurveyApprovalController::class, 'rejectResponse'])
            ->middleware('permission:survey_responses.approve')
            ->name('reject');

        Route::post('{response}/return', [SurveyApprovalController::class, 'returnForRevision'])
            ->middleware('permission:survey_responses.approve')
            ->name('return');

        // Bulk operations for enterprise scalability
        Route::post('bulk-approval', [SurveyApprovalController::class, 'bulkApprovalOperation'])
            ->middleware(['permission:survey_responses.approve', 'permission:survey_responses.bulk_approve'])
            ->name('bulk-approval');

        // Batch update multiple responses
        Route::post('batch-update', [SurveyApprovalController::class, 'batchUpdateResponses'])
            ->middleware('permission:survey_responses.write')
            ->name('batch-update');
    });
});

/*
|--------------------------------------------------------------------------
| API Endpoint Documentation
|--------------------------------------------------------------------------
|
| Survey Approval Endpoints (Simplified):
|
| 1. GET /api/survey-approval/surveys/published
|    - Get all published surveys available for response approval
|    - Returns: {success, data: surveys[], message}
|
| 2. GET /api/survey-approval/surveys/{survey}/responses
|    - Get paginated survey responses with advanced filtering
|    - Filters: status, approval_status, institution_id, institution_type,
|              date_from, date_to, search, per_page
|    - Returns: {success, data: {responses, pagination, stats}, message}
|
| 3. GET /api/survey-approval/surveys/{survey}/stats
|    - Get approval statistics for dashboard
|    - Returns: {success, data: {total, pending, approved, rejected, draft, completion_rate}, message}
|
| 4. GET /api/responses/{response}/detail
|    - Get detailed response with approval history
|    - Returns: {success, data: {response, approval_history, can_edit, can_approve}, message}
|
| 5. PUT /api/responses/{response}/update
|    - Update survey response data
|    - Body: {responses: {question_id: answer, ...}}
|    - Returns: {success, data: updated_response, message}
|
| 6. POST /api/responses/{response}/submit-approval
|    - Submit response for approval
|    - Body: {notes?: string, deadline?: date}
|    - Returns: {success, data: approval_request, message}
|
| 7. POST /api/responses/{response}/approve
|    - Approve a survey response
|    - Body: {comments?: string, metadata?: object}
|    - Returns: {success, data: {status, message}, message}
|
| 8. POST /api/responses/{response}/reject
|    - Reject a survey response
|    - Body: {comments: string, metadata?: object}
|    - Returns: {success, data: {status, message}, message}
|
| 9. POST /api/responses/{response}/return
|    - Return response for revision
|    - Body: {comments: string, metadata?: object}
|    - Returns: {success, data: {status, message}, message}
|
| 10. POST /api/responses/bulk-approval
|     - Bulk approval operations (up to 500 responses)
|     - Body: {response_ids: number[], action: 'approve|reject|return', comments?: string}
|     - Returns: {success, data: {successful, failed, results, errors}, message}
|
| 11. GET /api/survey-approval/surveys/{survey}/export
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
