<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\BaseController;
use App\Services\ApprovalWorkflowService;
use App\Services\ApprovalAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class ApprovalApiControllerRefactored extends BaseController
{
    protected $approvalWorkflowService;
    protected $approvalAnalyticsService;

    public function __construct(
        ApprovalWorkflowService $approvalWorkflowService,
        ApprovalAnalyticsService $approvalAnalyticsService
    ) {
        $this->approvalWorkflowService = $approvalWorkflowService;
        $this->approvalAnalyticsService = $approvalAnalyticsService;
    }

    /**
     * Get approval requests with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'status' => 'nullable|string|in:pending,approved,rejected,needs_revision',
                'workflow_type' => 'nullable|string',
                'institution_id' => 'nullable|exists:institutions,id',
                'submitter_id' => 'nullable|exists:users,id',
                'priority' => 'nullable|string|in:low,normal,high,urgent',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'search' => 'nullable|string|max:255',
                'sort' => 'nullable|string|in:created_at,updated_at,priority,request_title',
                'direction' => 'nullable|string|in:asc,desc',
                'per_page' => 'nullable|integer|min:1|max:100'
            ]);

            $user = Auth::user();
            $result = $this->approvalWorkflowService->getApprovalRequests($request, $user);
            
            return $this->successResponse($result, 'Təsdiq tələbləri uğurla alındı');
        }, 'approval.index');
    }

    /**
     * Get single approval request details
     */
    public function show(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $request->validate([
                'include_history' => 'boolean'
            ]);

            $user = Auth::user();
            $approval = $this->approvalWorkflowService->getApprovalRequest($id, $user);
            
            return $this->successResponse($approval, 'Təsdiq tələbi məlumatları alındı');
        }, 'approval.show');
    }

    /**
     * Approve request
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $validated = $request->validate([
                'comments' => 'nullable|string|max:1000',
                'approval_level' => 'nullable|integer|min:1|max:5',
                'additional_data' => 'nullable|array'
            ]);

            $user = Auth::user();
            $approval = $this->approvalWorkflowService->approveRequest($id, $validated, $user);
            
            return $this->successResponse($approval, 'Təsdiq tələbi uğurla təsdiqləndi');
        }, 'approval.approve');
    }

    /**
     * Reject request
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $validated = $request->validate([
                'comments' => 'required|string|max:1000',
                'rejection_reason' => 'nullable|string|in:incomplete_data,policy_violation,insufficient_justification,other',
                'suggest_revision' => 'boolean'
            ]);

            $user = Auth::user();
            $approval = $this->approvalWorkflowService->rejectRequest($id, $validated, $user);
            
            return $this->successResponse($approval, 'Təsdiq tələbi rədd edildi');
        }, 'approval.reject');
    }

    /**
     * Return request for revision
     */
    public function returnForRevision(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $validated = $request->validate([
                'comments' => 'required|string|max:1000',
                'revision_notes' => 'nullable|string|max:2000',
                'required_changes' => 'nullable|array',
                'priority_level' => 'nullable|string|in:low,normal,high'
            ]);

            $user = Auth::user();
            $approval = $this->approvalWorkflowService->returnForRevision($id, $validated, $user);
            
            return $this->successResponse($approval, 'Təsdiq tələbi düzəliş üçün göndərildi');
        }, 'approval.return_for_revision');
    }

    /**
     * Get pending approvals for current user
     */
    public function getPending(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'priority' => 'nullable|string|in:low,normal,high,urgent',
                'workflow_type' => 'nullable|string',
                'per_page' => 'nullable|integer|min:1|max:100'
            ]);

            $user = Auth::user();
            $pendingApprovals = $this->approvalWorkflowService->getPendingApprovals($request, $user);
            
            return $this->successResponse([
                'pending_approvals' => $pendingApprovals,
                'count' => $pendingApprovals->total()
            ], 'Gözləyən təsdiqlər alındı');
        }, 'approval.pending');
    }

    /**
     * Get user's approval history
     */
    public function getMyApprovals(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'action_type' => 'nullable|string|in:approved,rejected,returned_for_revision',
                'per_page' => 'nullable|integer|min:1|max:100'
            ]);

            $user = Auth::user();
            $myApprovals = $this->approvalWorkflowService->getMyApprovals($request, $user);
            
            return $this->successResponse($myApprovals, 'Təsdiq tarixçəsi alındı');
        }, 'approval.my_approvals');
    }

    /**
     * Get approval analytics and statistics
     */
    public function getAnalytics(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'include_trends' => 'boolean',
                'include_bottlenecks' => 'boolean'
            ]);

            $user = Auth::user();
            $analytics = $this->approvalAnalyticsService->getApprovalStats($request, $user);
            
            return $this->successResponse($analytics, 'Təsdiq statistikaları alındı');
        }, 'approval.analytics');
    }

    /**
     * Get approval statistics
     */
    public function getStats(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'group_by' => 'nullable|string|in:day,week,month,workflow_type,status'
            ]);

            $user = Auth::user();
            $stats = $this->approvalAnalyticsService->getApprovalStats($request, $user);
            
            // Return simplified stats for quick overview
            return $this->successResponse([
                'overview' => $stats['overview'],
                'status_breakdown' => $stats['status_breakdown'],
                'processing_times' => $stats['processing_times']
            ], 'Təsdiq statistikaları alındı');
        }, 'approval.stats');
    }

    /**
     * Get available workflows
     */
    public function getWorkflows(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $workflows = $this->approvalAnalyticsService->getWorkflows($request);
            
            return $this->successResponse($workflows, 'İş axınları alındı');
        }, 'approval.workflows');
    }

    /**
     * Create new approval request
     */
    public function createRequest(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'workflow_type' => 'required|string|exists:approval_workflows,workflow_type',
                'institution_id' => 'required|exists:institutions,id',
                'request_title' => 'required|string|max:255',
                'request_description' => 'required|string|max:2000',
                'request_data' => 'nullable|array',
                'priority' => 'nullable|string|in:low,normal,high,urgent',
                'attachments' => 'nullable|array',
                'deadline' => 'nullable|date|after:today'
            ]);

            $user = Auth::user();
            $approval = $this->approvalWorkflowService->createApprovalRequest($validated, $user);
            
            return $this->successResponse($approval, 'Təsdiq tələbi yaradıldı', 201);
        }, 'approval.create');
    }

    /**
     * Bulk approve multiple requests
     */
    public function bulkApprove(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'request_ids' => 'required|array|min:1|max:50',
                'request_ids.*' => 'integer|exists:data_approval_requests,id',
                'comments' => 'nullable|string|max:1000',
                'approval_level' => 'nullable|integer|min:1|max:5'
            ]);

            $user = Auth::user();
            $results = $this->approvalWorkflowService->bulkApprove(
                $validated['request_ids'],
                [
                    'comments' => $validated['comments'] ?? null,
                    'approval_level' => $validated['approval_level'] ?? 1
                ],
                $user
            );
            
            $message = "Kütləvi təsdiq tamamlandı: {$results['approved']} təsdiqləndi";
            if ($results['failed'] > 0) {
                $message .= ", {$results['failed']} uğursuz";
            }
            
            return $this->successResponse($results, $message);
        }, 'approval.bulk_approve');
    }

    /**
     * Get survey responses for approval
     */
    public function getSurveyResponses(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'survey_id' => 'nullable|exists:surveys,id',
                'status' => 'nullable|string|in:submitted,approved,rejected',
                'institution_id' => 'nullable|exists:institutions,id',
                'per_page' => 'nullable|integer|min:1|max:100'
            ]);

            $user = Auth::user();
            $result = $this->approvalAnalyticsService->getSurveyResponsesForApproval($request, $user);
            
            return $this->successResponse($result, 'Survey cavabları alındı');
        }, 'approval.survey_responses');
    }

    /**
     * Get surveys awaiting approval
     */
    public function getSurveysForApproval(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'priority' => 'nullable|string|in:low,normal,high,urgent',
                'survey_type' => 'nullable|string',
                'institution_id' => 'nullable|exists:institutions,id',
                'per_page' => 'nullable|integer|min:1|max:100'
            ]);

            $user = Auth::user();
            $result = $this->approvalAnalyticsService->getSurveysForApproval($request, $user);
            
            return $this->successResponse($result, 'Təsdiq gözləyən sorğular alındı');
        }, 'approval.surveys_for_approval');
    }

    /**
     * Bulk approve survey responses
     */
    public function bulkApproveSurveyResponses(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'response_ids' => 'required|array|min:1',
                'response_ids.*' => 'required|integer|exists:survey_responses,id',
                'comments' => 'nullable|string|max:1000'
            ]);

            $user = Auth::user();
            $results = $this->approvalAnalyticsService->bulkApproveSurveyResponses(
                $validated['response_ids'], 
                $user, 
                $validated['comments'] ?? null
            );
            
            return $this->successResponse($results, 'Survey cavabları bulk təsdiq edildi');
        }, 'approval.bulk_approve_survey_responses');
    }

    /**
     * Bulk reject survey responses
     */
    public function bulkRejectSurveyResponses(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'response_ids' => 'required|array|min:1',
                'response_ids.*' => 'required|integer|exists:survey_responses,id',
                'reason' => 'required|string|max:1000'
            ]);

            $user = Auth::user();
            $results = $this->approvalAnalyticsService->bulkRejectSurveyResponses(
                $validated['response_ids'], 
                $user, 
                $validated['reason']
            );
            
            return $this->successResponse($results, 'Survey cavabları bulk rədd edildi');
        }, 'approval.bulk_reject_survey_responses');
    }
}