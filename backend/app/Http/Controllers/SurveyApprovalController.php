<?php

namespace App\Http\Controllers;

use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Services\SurveyApprovalService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class SurveyApprovalController extends Controller
{
    use AuthorizesRequests;
    protected function getApprovalService()
    {
        // Use container resolution to support feature flags
        return app(SurveyApprovalService::class);
    }

    /**
     * Get survey responses for approval with filtering and pagination
     * GET /api/surveys/{survey}/responses/approval
     */
    public function getResponsesForApproval(Survey $survey, Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'status' => 'sometimes|in:draft,submitted,approved,rejected,returned',
                'approval_status' => 'sometimes|in:pending,in_progress,approved,rejected,returned',
                'institution_id' => 'sometimes|integer|exists:institutions,id',
                'institution_type' => 'sometimes|string',
                'date_from' => 'sometimes|date',
                'date_to' => 'sometimes|date|after_or_equal:date_from',
                'search' => 'sometimes|string|max:255',
                'per_page' => 'sometimes|integer|min:10|max:100',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $result = $this->getApprovalService()->getResponsesForApproval(
                $survey, 
                $request, 
                Auth::user()
            );

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Survey responses retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving survey responses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get detailed response data with approval history
     * GET /api/survey-responses/{response}/detail
     */
    public function getResponseDetail(SurveyResponse $response): JsonResponse
    {
        try {
            // Simple permission check
            if (!Auth::user()->can('survey_responses.read')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient permissions'
                ], 403);
            }

            $response->load([
                'survey.questions' => function($query) {
                    $query->where('is_active', true)->orderBy('order_index');
                },
                'institution',
                'department',
                'respondent',
                'approvalRequest.approvalActions.approver',
                'approvalRequest.workflow'
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'response' => $response,
                    'approval_history' => $response->approvalRequest?->approvalActions ?? [],
                    'can_edit' => $response->status === 'draft',
                    'can_approve' => $response->status === 'submitted',
                ],
                'message' => 'Response details retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving response details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update survey response data
     * PUT /api/survey-responses/{response}/update
     */
    public function updateResponseData(SurveyResponse $response, Request $request): JsonResponse
    {
        try {
            // Simple permission check
            if (!Auth::user()->can('survey_responses.write')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient permissions'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'responses' => 'required|array',
                'responses.*' => 'required', // Each question response is required
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $updatedResponse = $this->getApprovalService()->updateResponseData(
                $response,
                $request->input('responses')
            );

            return response()->json([
                'success' => true,
                'data' => $updatedResponse,
                'message' => 'Response updated successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating response',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create approval request for a response
     * POST /api/survey-responses/{response}/submit-approval
     */
    public function createApprovalRequest(SurveyResponse $response, Request $request): JsonResponse
    {
        try {
            if (!Auth::user()->can('survey_responses.write')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient permissions'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'notes' => 'sometimes|string|max:1000',
                'deadline' => 'sometimes|date|after:now',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $approvalRequest = $this->getApprovalService()->createApprovalRequest(
                $response,
                $request->only(['notes', 'deadline'])
            );

            return response()->json([
                'success' => true,
                'data' => $approvalRequest,
                'message' => 'Approval request created successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating approval request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve a survey response
     * POST /api/survey-responses/{response}/approve
     */
    public function approveResponse(SurveyResponse $response, Request $request): JsonResponse
    {
        try {
            if (!Auth::user()->can('survey_responses.approve')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient permissions'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'comments' => 'sometimes|string|max:1000',
                'metadata' => 'sometimes|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $result = $this->getApprovalService()->approveResponse(
                $response,
                Auth::user(),
                $request->only(['comments', 'metadata'])
            );

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Response approved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error approving response',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject a survey response
     * POST /api/survey-responses/{response}/reject
     */
    public function rejectResponse(SurveyResponse $response, Request $request): JsonResponse
    {
        try {
            if (!Auth::user()->can('survey_responses.approve')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient permissions'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'comments' => 'required|string|max:1000',
                'metadata' => 'sometimes|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $result = $this->getApprovalService()->rejectResponse(
                $response,
                Auth::user(),
                $request->only(['comments', 'metadata'])
            );

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Response rejected successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error rejecting response',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Return response for revision
     * POST /api/survey-responses/{response}/return
     */
    public function returnForRevision(SurveyResponse $response, Request $request): JsonResponse
    {
        try {
            if (!Auth::user()->can('survey_responses.approve')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient permissions'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'comments' => 'required|string|max:1000',
                'metadata' => 'sometimes|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $result = $this->getApprovalService()->returnForRevision(
                $response,
                Auth::user(),
                $request->only(['comments', 'metadata'])
            );

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Response returned for revision'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error returning response',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk approval operations
     * POST /api/survey-responses/bulk-approval
     */
    public function bulkApprovalOperation(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'response_ids' => 'required|array|min:1|max:500', // Limit to 500 for performance
                'response_ids.*' => 'integer|exists:survey_responses,id',
                'action' => 'required|in:approve,reject,return',
                'comments' => 'sometimes|string|max:1000',
                'metadata' => 'sometimes|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check user has permission for bulk operations
            if (!Auth::user()->can('survey_responses.bulk_approve')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient permissions for bulk operations'
                ], 403);
            }

            $result = $this->getApprovalService()->bulkApprovalOperation(
                $request->input('response_ids'),
                $request->input('action'),
                Auth::user(),
                $request->only(['comments', 'metadata'])
            );

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => "Bulk {$request->input('action')} operation completed"
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error performing bulk operation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get approval statistics for dashboard
     * GET /api/surveys/{survey}/approval-stats
     */
    public function getApprovalStats(Survey $survey): JsonResponse
    {
        try {
            $result = $this->getApprovalService()->getResponsesForApproval(
                $survey,
                request(),
                Auth::user()
            );

            return response()->json([
                'success' => true,
                'data' => $result['stats'],
                'message' => 'Approval statistics retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get published surveys for approval dashboard
     * GET /api/surveys/published
     */
    public function getPublishedSurveys(): JsonResponse
    {
        try {
            $surveys = Survey::with('questions')
                ->where('status', 'published')
                ->where(function($query) {
                    $query->whereNull('end_date')
                          ->orWhere('end_date', '>=', now());
                })
                ->select(['id', 'title', 'description', 'start_date', 'end_date', 'target_institutions', 'current_questions_count'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $surveys,
                'message' => 'Published surveys retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving published surveys',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get responses in table editing format
     * EXTEND existing functionality, not duplicate
     * GET /api/survey-response-approval/surveys/{survey}/table-view
     */
    public function getTableEditingView(Survey $survey, Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'status' => 'sometimes|in:draft,submitted,approved,rejected,returned',
                'institution_type' => 'sometimes|string',
                'search' => 'sometimes|string|max:255',
                'per_page' => 'sometimes|integer|min:10|max:100',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $result = $this->getApprovalService()->getResponsesForTableView(
                $survey,
                $request,
                Auth::user()
            );

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Table editing view retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving table editing view',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Batch update multiple responses
     * LEVERAGE existing updateResponseData method
     * POST /api/survey-response-approval/responses/batch-update
     */
    public function batchUpdateResponses(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'updates' => 'required|array|min:1',
                'updates.*.response_id' => 'required|integer|exists:survey_responses,id',
                'updates.*.responses' => 'required|array'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $results = $this->getApprovalService()->batchUpdateResponses(
                $request->input('updates'),
                Auth::user()
            );

            $message = $results['successful'] > 0
                ? "{$results['successful']} responses updated successfully"
                : 'No responses were updated';

            if ($results['failed'] > 0) {
                $message .= ", {$results['failed']} failed";
            }

            return response()->json([
                'success' => $results['successful'] > 0,
                'data' => $results,
                'message' => $message
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error performing batch update',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export survey responses to Excel format
     * GET /api/survey-response-approval/surveys/{survey}/export
     */
    public function exportSurveyResponses(Survey $survey, Request $request)
    {
        \Log::info('🎬 [CONTROLLER] Export method called', [
            'survey_id' => $survey->id,
            'request_data' => $request->all(),
            'user_authenticated' => Auth::check(),
            'user_id' => Auth::id(),
            'request_method' => $request->method(),
            'request_url' => $request->fullUrl()
        ]);

        try {
            // Production optimization for large datasets (600+ schools)
            ini_set('memory_limit', '2G');        // Increase to 2GB for large exports
            ini_set('max_execution_time', 300);   // Allow 5 minutes for processing

            \Log::info('🚀 [EXPORT] Starting production export', [
                'survey_id' => $survey->id,
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time'),
                'current_memory_mb' => round(memory_get_usage(true) / 1024 / 1024, 2)
            ]);

            $validator = Validator::make($request->all(), [
                'format' => 'sometimes|in:xlsx,csv',
                'status' => 'sometimes|in:draft,submitted,approved,rejected,returned',
                'approval_status' => 'sometimes|in:pending,in_progress,approved,rejected,returned',
                'institution_id' => 'sometimes|integer|exists:institutions,id',
                'institution_type' => 'sometimes|string',
                'date_from' => 'sometimes|date',
                'date_to' => 'sometimes|date|after_or_equal:date_from',
                'search' => 'sometimes|string|max:255',
                'response_ids' => 'sometimes|array',
                'response_ids.*' => 'integer|exists:survey_responses,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check user has permission for export
            $user = Auth::user();
            \Log::info('🔐 [CONTROLLER] Export permission check', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'user_role' => $user->role,
                'user_institution_id' => $user->institution_id,
                'user_institution_name' => $user->institution?->name,
                'has_read_permission' => $user->can('survey_responses.read')
            ]);

            if (!$user->can('survey_responses.read')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient permissions for survey response access'
                ], 403);
            }

            // Clear any previous output to prevent memory buildup
            if (ob_get_level()) {
                ob_end_clean();
            }

            $startTime = microtime(true);
            $result = $this->getApprovalService()->exportSurveyResponses(
                $survey,
                $request,
                Auth::user()
            );

            $processingTime = round((microtime(true) - $startTime) * 1000, 2);
            \Log::info('📊 [EXPORT] Processing completed', [
                'processing_time_ms' => $processingTime,
                'memory_usage_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
                'peak_memory_mb' => round(memory_get_peak_usage(true) / 1024 / 1024, 2)
            ]);

            // Return Excel file for download
            $format = $request->input('format', 'xlsx');
            $filename = "survey_{$survey->id}_responses_" . date('Y-m-d_H-i-s') . ".{$format}";

            return response()->download($result['file_path'], $filename)->deleteFileAfterSend();

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error exporting survey responses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

}