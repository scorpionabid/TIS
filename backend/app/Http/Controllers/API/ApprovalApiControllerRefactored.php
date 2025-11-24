<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\BaseController;
use App\Models\Institution;
use App\Models\SchoolEvent;
use App\Models\Task;
use App\Services\ApprovalAnalyticsService;
use App\Services\ApprovalWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

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
                'per_page' => 'nullable|integer|min:1|max:100',
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
                'include_history' => 'boolean',
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
                'additional_data' => 'nullable|array',
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
                'suggest_revision' => 'boolean',
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
                'priority_level' => 'nullable|string|in:low,normal,high',
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
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            $user = Auth::user();
            $pendingApprovals = $this->approvalWorkflowService->getPendingApprovals($request, $user);

            return $this->successResponse([
                'pending_approvals' => $pendingApprovals,
                'count' => $pendingApprovals->total(),
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
                'per_page' => 'nullable|integer|min:1|max:100',
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
                'include_bottlenecks' => 'boolean',
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
                'group_by' => 'nullable|string|in:day,week,month,workflow_type,status',
            ]);

            $user = Auth::user();
            $stats = $this->approvalAnalyticsService->getApprovalStats($request, $user);

            // Return simplified stats for quick overview
            return $this->successResponse([
                'overview' => $stats['overview'],
                'status_breakdown' => $stats['status_breakdown'],
                'processing_times' => $stats['processing_times'],
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
                'deadline' => 'nullable|date|after:today',
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
                'approval_level' => 'nullable|integer|min:1|max:5',
            ]);

            $user = Auth::user();
            $results = $this->approvalWorkflowService->bulkApprove(
                $validated['request_ids'],
                [
                    'comments' => $validated['comments'] ?? null,
                    'approval_level' => $validated['approval_level'] ?? 1,
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
                'per_page' => 'nullable|integer|min:1|max:100',
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
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            $user = Auth::user();
            $result = $this->approvalAnalyticsService->getSurveysForApproval($request, $user);

            return $this->successResponse($result, 'Təsdiq gözləyən sorğular alındı');
        }, 'approval.surveys_for_approval');
    }

    // REMOVED: bulkApproveSurveyResponses() - use SurveyApprovalController::bulkApprovalOperation instead

    // REMOVED: bulkRejectSurveyResponses() - use SurveyApprovalController::bulkApprovalOperation instead

    /**
     * Event Approval Methods - Consolidated from EventApprovalController
     */

    /**
     * Approve a school event
     */
    public function approveEvent(Request $request, SchoolEvent $event): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $event) {
            $user = Auth::user();

            // Check permissions
            if (! $this->canApproveEvent($user, $event)) {
                return $this->errorResponse('Bu tədbiri təsdiqləmək üçün icazəniz yoxdur', 403);
            }

            // Validate current status
            if ($event->status !== 'pending') {
                return $this->errorResponse('Yalnız gözləmə statusundakı tədbirlər təsdiqlənə bilər', 400);
            }

            // Validate event details before approval
            $validationResult = $this->validateEventForApproval($event);
            if (! $validationResult['valid']) {
                return $this->errorResponse('Tədbir təsdiq üçün uyğun deyil', 422, [
                    'validation_errors' => $validationResult['errors'],
                ]);
            }

            DB::beginTransaction();

            $event->update([
                'status' => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now(),
                'approval_notes' => $request->approval_notes,
            ]);

            // If event start date is today or in the past, set it to active
            if ($event->start_date <= now()->toDateString()) {
                $event->update(['status' => 'active']);
            }

            DB::commit();

            // Load relationships for response
            $event->load([
                'institution:id,name,type',
                'organizer:id,name,email',
                'approver:id,name,email',
            ]);

            return $this->successResponse([
                'event' => [
                    'id' => $event->id,
                    'title' => $event->title,
                    'status' => $event->status,
                    'approved_at' => $event->approved_at,
                    'approval_notes' => $event->approval_notes,
                    'approved_by' => $event->approver ? [
                        'id' => $event->approver->id,
                        'name' => $event->approver->name,
                        'email' => $event->approver->email,
                    ] : null,
                ],
            ], 'Tədbir uğurla təsdiqləndi');
        }, 'approval.approve_event');
    }

    /**
     * Reject a school event
     */
    public function rejectEvent(Request $request, SchoolEvent $event): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $event) {
            $request->validate([
                'rejection_reason' => 'required|string|max:1000',
            ]);

            $user = Auth::user();

            if (! $this->canApproveEvent($user, $event)) {
                return $this->errorResponse('Bu tədbiri rədd etmək üçün icazəniz yoxdur', 403);
            }

            if ($event->status !== 'pending') {
                return $this->errorResponse('Yalnız gözləmə statusundakı tədbirlər rədd edilə bilər', 400);
            }

            DB::beginTransaction();

            $event->update([
                'status' => 'rejected',
                'rejected_by' => $user->id,
                'rejected_at' => now(),
                'rejection_reason' => $request->rejection_reason,
            ]);

            DB::commit();

            $event->load(['institution:id,name,type', 'organizer:id,name,email']);

            return $this->successResponse([
                'event' => [
                    'id' => $event->id,
                    'title' => $event->title,
                    'status' => $event->status,
                    'rejected_at' => $event->rejected_at,
                    'rejection_reason' => $event->rejection_reason,
                ],
            ], 'Tədbir uğurla rədd edildi');
        }, 'approval.reject_event');
    }

    /**
     * Advanced Approval Features - Templates, Workflows, and Delegation
     */

    /**
     * Get approval workflow templates
     */
    public function getWorkflowTemplates(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'category' => 'nullable|string|in:events,tasks,surveys,documents,general',
                'active_only' => 'boolean',
            ]);

            $user = Auth::user();
            $templates = $this->approvalWorkflowService->getWorkflowTemplates($request, $user);

            return $this->successResponse($templates, 'İş axını şablonları alındı');
        }, 'approval.workflow_templates');
    }

    /**
     * Create workflow template (SuperAdmin/RegionAdmin only)
     */
    public function createWorkflowTemplate(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string|max:1000',
                'category' => 'required|string|in:events,tasks,surveys,documents,general',
                'approval_levels' => 'required|array|min:1|max:5',
                'approval_levels.*.level' => 'required|integer|min:1|max:5',
                'approval_levels.*.role' => 'required|string',
                'approval_levels.*.required' => 'required|boolean',
                'approval_levels.*.auto_approve_threshold' => 'nullable|integer|min:0',
                'approval_levels.*.timeout_days' => 'nullable|integer|min:1|max:30',
                'auto_approval_rules' => 'nullable|array',
                'escalation_rules' => 'nullable|array',
                'notification_settings' => 'nullable|array',
                'is_active' => 'boolean',
            ]);

            $user = Auth::user();
            if (! $user->can('approvals.template_manage')) {
                return $this->errorResponse('İş axını şablonu yaratmaq üçün icazəniz yoxdur', 403);
            }

            $template = $this->approvalWorkflowService->createWorkflowTemplate($validated, $user);

            return $this->successResponse($template, 'İş axını şablonu yaradıldı', 201);
        }, 'approval.create_template');
    }

    /**
     * Update workflow template
     */
    public function updateWorkflowTemplate(Request $request, int $templateId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $templateId) {
            $validated = $request->validate([
                'name' => 'nullable|string|max:255',
                'description' => 'nullable|string|max:1000',
                'approval_levels' => 'nullable|array|min:1|max:5',
                'approval_levels.*.level' => 'required_with:approval_levels|integer|min:1|max:5',
                'approval_levels.*.role' => 'required_with:approval_levels|string',
                'approval_levels.*.required' => 'required_with:approval_levels|boolean',
                'approval_levels.*.auto_approve_threshold' => 'nullable|integer|min:0',
                'approval_levels.*.timeout_days' => 'nullable|integer|min:1|max:30',
                'auto_approval_rules' => 'nullable|array',
                'escalation_rules' => 'nullable|array',
                'notification_settings' => 'nullable|array',
                'is_active' => 'boolean',
            ]);

            $user = Auth::user();
            if (! $user->can('approvals.template_manage')) {
                return $this->errorResponse('İş axını şablonu dəyişdirmək üçün icazəniz yoxdur', 403);
            }

            $template = $this->approvalWorkflowService->updateWorkflowTemplate($templateId, $validated, $user);

            return $this->successResponse($template, 'İş axını şablonu yeniləndi');
        }, 'approval.update_template');
    }

    /**
     * Delegate approval to another user
     */
    public function delegateApproval(Request $request, int $approvalId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $approvalId) {
            $validated = $request->validate([
                'delegate_to' => 'required|exists:users,id',
                'delegation_reason' => 'required|string|max:500',
                'delegation_expires_at' => 'nullable|date|after:now',
                'include_comment' => 'nullable|string|max:1000',
            ]);

            $user = Auth::user();
            $result = $this->approvalWorkflowService->delegateApproval($approvalId, $validated, $user);

            return $this->successResponse($result, 'Təsdiq səlahiyyəti həvalə edildi');
        }, 'approval.delegate');
    }

    /**
     * Get delegated approvals (approvals delegated to current user)
     */
    public function getDelegatedApprovals(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'status' => 'nullable|string|in:pending,active,expired',
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            $user = Auth::user();
            $delegatedApprovals = $this->approvalWorkflowService->getDelegatedApprovals($request, $user);

            return $this->successResponse($delegatedApprovals, 'Həvalə edilmiş təsdiqlər alındı');
        }, 'approval.delegated');
    }

    /**
     * Accept delegated approval
     */
    public function acceptDelegation(Request $request, int $delegationId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $delegationId) {
            $validated = $request->validate([
                'comments' => 'nullable|string|max:500',
            ]);

            $user = Auth::user();
            $result = $this->approvalWorkflowService->acceptDelegation($delegationId, $validated, $user);

            return $this->successResponse($result, 'Həvalə qəbul edildi');
        }, 'approval.accept_delegation');
    }

    /**
     * Decline delegated approval
     */
    public function declineDelegation(Request $request, int $delegationId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $delegationId) {
            $validated = $request->validate([
                'decline_reason' => 'required|string|max:500',
            ]);

            $user = Auth::user();
            $result = $this->approvalWorkflowService->declineDelegation($delegationId, $validated, $user);

            return $this->successResponse($result, 'Həvalə rədd edildi');
        }, 'approval.decline_delegation');
    }

    /**
     * Auto-approve eligible requests based on rules
     */
    public function runAutoApproval(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'workflow_type' => 'nullable|string',
                'institution_id' => 'nullable|exists:institutions,id',
                'dry_run' => 'boolean',
            ]);

            $user = Auth::user();
            if (! $user->can('approvals.workflow_manage')) {
                return $this->errorResponse('Avtomatik təsdiq işlətmək üçün icazəniz yoxdur', 403);
            }

            $result = $this->approvalWorkflowService->runAutoApproval($request, $user);

            $message = $request->dry_run
                ? "Avtomatik təsdiq simulyasiyası: {$result['eligible_count']} təsdiq tələbi uyğundur"
                : "Avtomatik təsdiq tamamlandı: {$result['approved_count']} təsdiqləndi";

            return $this->successResponse($result, $message);
        }, 'approval.auto_approve');
    }

    /**
     * Escalate overdue approvals
     */
    public function escalateOverdueApprovals(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'workflow_type' => 'nullable|string',
                'overdue_days' => 'nullable|integer|min:1',
                'dry_run' => 'boolean',
            ]);

            $user = Auth::user();
            if (! $user->can('approvals.workflow_manage')) {
                return $this->errorResponse('Təsdiq escalation üçün icazəniz yoxdur', 403);
            }

            $result = $this->approvalWorkflowService->escalateOverdueApprovals($request, $user);

            $message = $request->dry_run
                ? "Escalation simulyasiyası: {$result['eligible_count']} vaxtı keçmiş təsdiq"
                : "Escalation tamamlandı: {$result['escalated_count']} escalate edildi";

            return $this->successResponse($result, $message);
        }, 'approval.escalate');
    }

    /**
     * Get approval workflow audit trail
     */
    public function getAuditTrail(Request $request, int $approvalId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $approvalId) {
            $request->validate([
                'include_delegations' => 'boolean',
                'include_notifications' => 'boolean',
            ]);

            $user = Auth::user();
            $auditTrail = $this->approvalWorkflowService->getAuditTrail($approvalId, $request, $user);

            return $this->successResponse($auditTrail, 'Təsdiq audit izi alındı');
        }, 'approval.audit_trail');
    }

    /**
     * Task Approval Methods - Consolidated from TaskApprovalController
     */

    /**
     * Get pending tasks for approval
     */
    public function getPendingTasks(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $user = Auth::user();
            $institution = $user->institution;

            if (! $institution) {
                return $this->errorResponse('İstifadəçi heç bir müəssisə ilə əlaqəli deyil', 400);
            }

            $query = Task::with([
                'assignedInstitution:id,name,type',
                'assignedBy:id,name,email',
                'completedBy:id,name,email',
            ])->where('approval_status', 'pending');

            // Filter based on user role and institution hierarchy
            if ($user->hasRole('sektoradmin')) {
                // Sector admin sees tasks from schools under their sector
                $schoolIds = Institution::where('parent_id', $institution->id)->pluck('id');
                $query->whereIn('assigned_institution_id', $schoolIds);
            } elseif ($user->hasRole('regionadmin')) {
                // Region admin sees tasks from sectors and schools under their region
                $institutionIds = $this->getHierarchicalInstitutionIds($user, $institution);
                $query->whereIn('assigned_institution_id', $institutionIds);
            }

            $tasks = $query->where('status', 'completed')
                ->orderBy('completed_at', 'desc')
                ->paginate($request->per_page ?? 15);

            return $this->successResponse($tasks, 'Təsdiq gözləyən tapşırıqlar alındı');
        }, 'approval.pending_tasks');
    }

    /**
     * Approve a task
     */
    public function approveTask(Request $request, Task $task): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $task) {
            $user = Auth::user();

            if (! $this->canApproveTask($user, $task)) {
                return $this->errorResponse('Bu tapşırığı təsdiqləmək üçün icazəniz yoxdur', 403);
            }

            if ($task->approval_status !== 'pending') {
                return $this->errorResponse('Yalnız təsdiq gözləyən tapşırıqlar təsdiqlənə bilər', 400);
            }

            DB::beginTransaction();

            $task->update([
                'approval_status' => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now(),
                'approval_notes' => $request->approval_notes,
            ]);

            DB::commit();

            $task->load(['assignedInstitution:id,name', 'assignedBy:id,name', 'approver:id,name']);

            return $this->successResponse([
                'task' => $task,
            ], 'Tapşırıq uğurla təsdiqləndi');
        }, 'approval.approve_task');
    }

    /**
     * Reject a task
     */
    public function rejectTask(Request $request, Task $task): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $task) {
            $request->validate([
                'rejection_reason' => 'required|string|max:1000',
            ]);

            $user = Auth::user();

            if (! $this->canApproveTask($user, $task)) {
                return $this->errorResponse('Bu tapşırığı rədd etmək üçün icazəniz yoxdur', 403);
            }

            if ($task->approval_status !== 'pending') {
                return $this->errorResponse('Yalnız təsdiq gözləyən tapşırıqlar rədd edilə bilər', 400);
            }

            DB::beginTransaction();

            $task->update([
                'approval_status' => 'rejected',
                'rejected_by' => $user->id,
                'rejected_at' => now(),
                'rejection_reason' => $request->rejection_reason,
            ]);

            DB::commit();

            return $this->successResponse([
                'task' => $task,
            ], 'Tapşırıq uğurla rədd edildi');
        }, 'approval.reject_task');
    }

    /**
     * Helper Methods
     */

    /**
     * Check if user can approve event
     */
    private function canApproveEvent($user, $event): bool
    {
        // SuperAdmin can approve any event
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // RegionAdmin can approve events from institutions in their region
        if ($user->hasRole('regionadmin')) {
            return $this->isInUserHierarchy($user, $event->institution_id);
        }

        // SektorAdmin can approve events from schools in their sector
        if ($user->hasRole('sektoradmin')) {
            $schoolIds = Institution::where('parent_id', $user->institution_id)->pluck('id');

            return $schoolIds->contains($event->institution_id);
        }

        return false;
    }

    /**
     * Check if user can approve task
     */
    private function canApproveTask($user, $task): bool
    {
        // SuperAdmin can approve any task
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // RegionAdmin can approve tasks assigned to institutions in their hierarchy
        if ($user->hasRole('regionadmin')) {
            return $this->isInUserHierarchy($user, $task->assigned_institution_id);
        }

        // SektorAdmin can approve tasks from schools under their sector
        if ($user->hasRole('sektoradmin')) {
            $schoolIds = Institution::where('parent_id', $user->institution_id)->pluck('id');

            return $schoolIds->contains($task->assigned_institution_id);
        }

        return false;
    }

    /**
     * Validate event for approval
     */
    private function validateEventForApproval($event): array
    {
        $errors = [];

        if (! $event->title) {
            $errors[] = 'Tədbir başlığı tələb olunur';
        }

        if (! $event->start_date) {
            $errors[] = 'Başlama tarixi tələb olunur';
        }

        if (! $event->location) {
            $errors[] = 'Məkan məlumatı tələb olunur';
        }

        if ($event->start_date && $event->start_date < now()->toDateString()) {
            $errors[] = 'Keçmişdəki tarixlərdə tədbir təsdiqlənə bilməz';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Check if institution is in user hierarchy
     */
    private function isInUserHierarchy($user, $institutionId): bool
    {
        $userInstitution = $user->institution;
        if (! $userInstitution) {
            return false;
        }

        // Get all institutions under user's hierarchy
        $hierarchyIds = $this->getHierarchicalInstitutionIds($user, $userInstitution);

        return in_array($institutionId, $hierarchyIds);
    }

    /**
     * Get hierarchical institution IDs for user
     */
    private function getHierarchicalInstitutionIds($user, $institution): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }

        $ids = [$institution->id];

        if ($user->hasRole('regionadmin')) {
            // Include all sectors and schools under this region
            $sectors = Institution::where('parent_id', $institution->id)->get();
            foreach ($sectors as $sector) {
                $ids[] = $sector->id;
                $schools = Institution::where('parent_id', $sector->id)->pluck('id')->toArray();
                $ids = array_merge($ids, $schools);
            }
        }

        return $ids;
    }
}
