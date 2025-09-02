<?php

namespace App\Http\Controllers;

use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Services\SurveyResponseApprovalService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use App\Http\Controllers\Controller;

class SurveyResponseApprovalController extends Controller
{
    protected function getApprovalService()
    {
        return new SurveyResponseApprovalService();
    }

    /**
     * Get survey responses for approval with filtering and pagination
     * GET /api/surveys/{survey}/responses/approval
     */
    public function getResponsesForApproval(Survey $survey, Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'status' => 'sometimes|in:draft,submitted,approved,rejected',
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
            // Check user access to this response
            $this->authorize('view', $response);

            $response->load([
                'survey',
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
                    'can_approve' => $this->canApprove($response),
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
            // Check user can edit this response
            $this->authorize('update', $response);

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
            $this->authorize('submit', $response);

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
            $this->authorize('approve', $response);

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
            $this->authorize('approve', $response);

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
            $this->authorize('approve', $response);

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
            $surveys = Survey::where('status', 'published')
                ->where(function($query) {
                    $query->whereNull('end_date')
                          ->orWhere('end_date', '>=', now());
                })
                ->select(['id', 'title', 'description', 'start_date', 'end_date', 'target_institutions'])
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
     * Check if current user can approve a response
     */
    private function canApprove(SurveyResponse $response): bool
    {
        $user = Auth::user();
        
        if (!$response->approvalRequest) {
            return false;
        }

        // Check if user has appropriate role for current approval level
        $approvalRequest = $response->approvalRequest;
        $workflow = $approvalRequest->workflow;
        $currentLevel = $approvalRequest->current_approval_level;
        
        if (!isset($workflow->approval_chain[$currentLevel - 1])) {
            return false;
        }

        $requiredRole = $workflow->approval_chain[$currentLevel - 1]['role'];
        $userRole = $user->role ?? $user->roles->pluck('name')->first();

        return $userRole === $requiredRole || $userRole === 'superadmin';
    }
}