<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ApprovalWorkflow;
use App\Models\DataApprovalRequest;
use App\Models\ApprovalAction;
use App\Models\ApprovalNotification;
use App\Models\ApprovalDelegate;
use App\Models\ApprovalTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ApprovalApiController extends Controller
{
    /**
     * Get approval requests with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $query = DataApprovalRequest::with([
            'workflow:id,name,workflow_type',
            'institution:id,name,type',
            'submitter:id,name,username,email',
            'approvalActions.approver:id,name,username'
        ]);

        // Filter by status
        if ($status = $request->get('status')) {
            $query->where('current_status', $status);
        }

        // Filter by workflow type
        if ($type = $request->get('type')) {
            $query->whereHas('workflow', function ($q) use ($type) {
                $q->where('workflow_type', $type);
            });
        }

        // Filter by institution (for institutional users)
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            $query->where('institution_id', $user->institution_id);
        }

        // Filter by user's approval authority
        if ($user->hasRole(['sektoradmin', 'schooladmin'])) {
            $this->filterByApprovalAuthority($query, $user);
        }

        $approvals = $query->orderBy('created_at', 'desc')
                          ->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $approvals
        ]);
    }

    /**
     * Show specific approval request
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $approval = DataApprovalRequest::with([
            'workflow',
            'institution',
            'submitter',
            'approvalActions.approver',
            'notifications.recipient'
        ])->findOrFail($id);

        // Check if user can view this approval
        if (!$this->canUserViewApproval($request->user(), $approval)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu təsdiq sorğusunu görməyə icazəniz yoxdur'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $approval
        ]);
    }

    /**
     * Approve a request
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'comments' => 'nullable|string|max:1000'
        ]);

        $approval = DataApprovalRequest::with('workflow')->findOrFail($id);
        $user = $request->user();

        // Check if user can approve
        if (!$approval->canBeApprovedBy($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu səviyyədə təsdiq etməyə icazəniz yoxdur'
            ], 403);
        }

        DB::beginTransaction();
        try {
            // Create approval action
            ApprovalAction::create([
                'approval_request_id' => $approval->id,
                'approver_id' => $user->id,
                'approval_level' => $approval->current_approval_level,
                'action' => 'approved',
                'comments' => $validated['comments'],
                'action_taken_at' => now(),
            ]);

            // Check if workflow is fully approved
            if ($approval->workflow->isFullyApproved($approval->current_approval_level)) {
                $approval->update([
                    'current_status' => 'approved',
                    'completed_at' => now(),
                ]);
            } else {
                // Move to next approval level
                $approval->update([
                    'current_status' => 'in_progress',
                    'current_approval_level' => $approval->current_approval_level + 1,
                ]);

                // Create notification for next approver
                $this->createNextLevelNotification($approval);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sorğu uğurla təsdiqləndi'
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            
            return response()->json([
                'success' => false,
                'message' => 'Təsdiq zamanı xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject a request
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'comments' => 'required|string|max:1000'
        ]);

        $approval = DataApprovalRequest::findOrFail($id);
        $user = $request->user();

        // Check if user can approve (reject permissions same as approve)
        if (!$approval->canBeApprovedBy($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu səviyyədə rədd etməyə icazəniz yoxdur'
            ], 403);
        }

        DB::beginTransaction();
        try {
            // Create rejection action
            ApprovalAction::create([
                'approval_request_id' => $approval->id,
                'approver_id' => $user->id,
                'approval_level' => $approval->current_approval_level,
                'action' => 'rejected',
                'comments' => $validated['comments'],
                'action_taken_at' => now(),
            ]);

            // Update approval status
            $approval->update([
                'current_status' => 'rejected',
                'completed_at' => now(),
            ]);

            // Notify submitter of rejection
            $this->createRejectionNotification($approval, $validated['comments']);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sorğu rədd edildi'
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            
            return response()->json([
                'success' => false,
                'message' => 'Rədd zamanı xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Return request for revision
     */
    public function returnForRevision(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'comments' => 'required|string|max:1000'
        ]);

        $approval = DataApprovalRequest::findOrFail($id);
        $user = $request->user();

        if (!$approval->canBeApprovedBy($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyatı icra etməyə icazəniz yoxdur'
            ], 403);
        }

        DB::beginTransaction();
        try {
            // Create return action
            ApprovalAction::create([
                'approval_request_id' => $approval->id,
                'approver_id' => $user->id,
                'approval_level' => $approval->current_approval_level,
                'action' => 'returned',
                'comments' => $validated['comments'],
                'action_taken_at' => now(),
            ]);

            // Reset to pending and level 1
            $approval->update([
                'current_status' => 'pending',
                'current_approval_level' => 1,
            ]);

            // Notify submitter
            $this->createRevisionNotification($approval, $validated['comments']);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sorğu yenidən baxılmaq üçün göndərildi'
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            
            return response()->json([
                'success' => false,
                'message' => 'Əməliyyat zamanı xəta baş verdi'
            ], 500);
        }
    }

    /**
     * Get pending approvals for current user
     */
    public function getPending(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $query = DataApprovalRequest::with([
            'workflow:id,name,workflow_type,approval_chain',
            'institution:id,name,type',
            'submitter:id,name,username,email'
        ])->where('current_status', 'pending');

        // Filter by user's approval authority
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            if ($user->hasRole('sektoradmin')) {
                $this->filterByApprovalAuthority($query, $user);
            } else {
                $query->where('institution_id', $user->institution_id);
            }
        }

        // Only show approvals that can be approved by this user
        $query->whereHas('workflow', function ($q) use ($user) {
            $q->whereJsonContains('approval_chain', ['role' => $user->getRoleNames()->first()]);
        });

        $approvals = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $approvals
        ]);
    }

    /**
     * Get user's own approval requests
     */
    public function getMyApprovals(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $approvals = DataApprovalRequest::with([
            'workflow:id,name,workflow_type',
            'institution:id,name,type',
            'submitter:id,name,username,email'
        ])
        ->where('submitted_by', $user->id)
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'data' => $approvals
        ]);
    }

    /**
     * Get approval analytics/statistics
     */
    public function getAnalytics(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $baseQuery = DataApprovalRequest::query();
        
        // Filter by user's scope
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            if ($user->hasRole('sektoradmin')) {
                $baseQuery->whereHas('institution', function ($q) use ($user) {
                    $q->where('parent_id', $user->institution_id);
                });
            } else {
                $baseQuery->where('institution_id', $user->institution_id);
            }
        }

        // Get pending approvals for current user
        $myPendingQuery = clone $baseQuery;
        $myPendingQuery->where('current_status', 'pending')
                      ->whereHas('workflow', function ($q) use ($user) {
                          $q->whereJsonContains('approval_chain', ['role' => $user->getRoleNames()->first()]);
                      });

        $stats = [
            'pending' => (clone $baseQuery)->where('current_status', 'pending')->count(),
            'approved' => (clone $baseQuery)->where('current_status', 'approved')->count(),
            'rejected' => (clone $baseQuery)->where('current_status', 'rejected')->count(),
            'returned' => (clone $baseQuery)->where('current_status', 'returned')->count(),
            'my_pending' => $myPendingQuery->count(),
            'total_this_month' => (clone $baseQuery)->whereMonth('created_at', now()->month)->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Get approval statistics
     */
    public function getStats(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $baseQuery = DataApprovalRequest::query();
        
        // Filter by user's scope
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            $baseQuery->where('institution_id', $user->institution_id);
        }

        $stats = [
            'pending' => (clone $baseQuery)->where('current_status', 'pending')->count(),
            'in_progress' => (clone $baseQuery)->where('current_status', 'in_progress')->count(),
            'approved_today' => (clone $baseQuery)
                ->where('current_status', 'approved')
                ->whereDate('completed_at', today())
                ->count(),
            'rejected_today' => (clone $baseQuery)
                ->where('current_status', 'rejected')
                ->whereDate('completed_at', today())
                ->count(),
            'overdue' => (clone $baseQuery)
                ->where('deadline', '<', now())
                ->whereIn('current_status', ['pending', 'in_progress'])
                ->count(),
            'total_this_month' => (clone $baseQuery)
                ->whereMonth('created_at', now()->month)
                ->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Get approval workflows
     */
    public function getWorkflows(Request $request): JsonResponse
    {
        $workflows = ApprovalWorkflow::active()
            ->select('id', 'name', 'workflow_type', 'description')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $workflows
        ]);
    }

    /**
     * Create approval request
     */
    public function createRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'workflow_id' => 'required|exists:approval_workflows,id',
            'approvalable_type' => 'required|string',
            'approvalable_id' => 'required|integer',
            'submission_notes' => 'nullable|string|max:1000',
            'deadline' => 'nullable|date|after:today',
            'request_metadata' => 'nullable|array',
        ]);

        $user = $request->user();

        $approval = DataApprovalRequest::create([
            'workflow_id' => $validated['workflow_id'],
            'institution_id' => $user->institution_id,
            'approvalable_type' => $validated['approvalable_type'],
            'approvalable_id' => $validated['approvalable_id'],
            'submitted_by' => $user->id,
            'submitted_at' => now(),
            'submission_notes' => $validated['submission_notes'],
            'deadline' => $validated['deadline'],
            'request_metadata' => $validated['request_metadata'] ?? [],
        ]);

        // Create initial notification
        $this->createInitialNotification($approval);

        return response()->json([
            'success' => true,
            'data' => $approval->load('workflow', 'institution'),
            'message' => 'Təsdiq sorğusu yaradıldı'
        ]);
    }

    /**
     * Filter query by user's approval authority
     */
    private function filterByApprovalAuthority($query, $user): void
    {
        if ($user->hasRole('sektoradmin')) {
            // SektorAdmin can approve requests from schools in their sector
            $query->whereHas('institution', function ($q) use ($user) {
                $q->where('parent_id', $user->institution_id);
            });
        }
    }

    /**
     * Check if user can view specific approval
     */
    private function canUserViewApproval($user, DataApprovalRequest $approval): bool
    {
        if ($user->hasRole(['superadmin', 'regionadmin'])) {
            return true;
        }

        if ($user->hasRole('sektoradmin')) {
            // Can view if from institutions in their sector
            return $approval->institution->parent_id === $user->institution_id;
        }

        // Can view own institution's requests
        return $approval->institution_id === $user->institution_id;
    }

    /**
     * Create notification for next approval level
     */
    private function createNextLevelNotification(DataApprovalRequest $approval): void
    {
        $nextStep = $approval->workflow->getNextApprovalLevel($approval->current_approval_level - 1);
        
        if (!$nextStep) return;

        // Find users with required role in appropriate institutions
        $approvers = $this->findApprovers($approval, $nextStep['role']);

        foreach ($approvers as $approver) {
            ApprovalNotification::create([
                'approval_request_id' => $approval->id,
                'recipient_id' => $approver->id,
                'notification_type' => 'approval_required',
                'title' => "Təsdiq tələb olunur: {$approval->workflow->name}",
                'message' => "Yeni təsdiq sorğusu sizin baxışınızı gözləyir.",
                'status' => 'pending',
                'scheduled_for' => now(),
            ]);
        }
    }

    /**
     * Create rejection notification
     */
    private function createRejectionNotification(DataApprovalRequest $approval, string $comments): void
    {
        ApprovalNotification::create([
            'approval_request_id' => $approval->id,
            'recipient_id' => $approval->submitted_by,
            'notification_type' => 'rejected',
            'title' => "Sorğu rədd edildi: {$approval->workflow->name}",
            'message' => "Sorğunuz rədd edildi. Səbəb: {$comments}",
            'status' => 'pending',
            'scheduled_for' => now(),
        ]);
    }

    /**
     * Create revision notification
     */
    private function createRevisionNotification(DataApprovalRequest $approval, string $comments): void
    {
        ApprovalNotification::create([
            'approval_request_id' => $approval->id,
            'recipient_id' => $approval->submitted_by,
            'notification_type' => 'request_submitted',
            'title' => "Düzəliş tələb olunur: {$approval->workflow->name}",
            'message' => "Sorğunuz düzəliş üçün qaytarıldı. Qeyd: {$comments}",
            'status' => 'pending',
            'scheduled_for' => now(),
        ]);
    }

    /**
     * Create initial notification
     */
    private function createInitialNotification(DataApprovalRequest $approval): void
    {
        $workflow = $approval->workflow;
        $firstStep = collect($workflow->approval_chain)->first();
        
        if (!$firstStep) return;

        $approvers = $this->findApprovers($approval, $firstStep['role']);

        foreach ($approvers as $approver) {
            ApprovalNotification::create([
                'approval_request_id' => $approval->id,
                'recipient_id' => $approver->id,
                'notification_type' => 'approval_required',
                'title' => "Yeni təsdiq sorğusu: {$workflow->name}",
                'message' => "Yeni təsdiq sorğusu sizin baxışınızı gözləyir.",
                'status' => 'pending',
                'scheduled_for' => now(),
            ]);
        }
    }

    /**
     * Find approvers for a specific role and approval request
     */
    private function findApprovers(DataApprovalRequest $approval, string $role): \Illuminate\Database\Eloquent\Collection
    {
        // Logic to find users with specific role who can approve this request
        // This would depend on institution hierarchy and delegation rules
        
        if ($role === 'sektoradmin') {
            // Find SektorAdmin for the sector containing this institution
            return \App\Models\User::whereHas('roles', function ($q) use ($role) {
                $q->where('name', $role);
            })->whereHas('institution', function ($q) use ($approval) {
                $q->where('id', $approval->institution->parent_id);
            })->get();
        }

        if ($role === 'regionadmin') {
            // Find RegionAdmin for the region containing this institution
            return \App\Models\User::whereHas('roles', function ($q) use ($role) {
                $q->where('name', $role);
            })->whereHas('institution', function ($q) use ($approval) {
                // Navigate up the hierarchy to find region
                $institution = $approval->institution;
                while ($institution && $institution->level < 2) {
                    $institution = $institution->parent;
                }
                if ($institution) {
                    $q->where('id', $institution->id);
                }
            })->get();
        }

        // Default: find users with role in same institution
        return \App\Models\User::whereHas('roles', function ($q) use ($role) {
            $q->where('name', $role);
        })->where('institution_id', $approval->institution_id)->get();
    }

    /**
     * Bulk approve requests
     */
    public function bulkApprove(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:data_approval_requests,id',
            'comments' => 'nullable|string|max:1000'
        ]);

        $user = $request->user();
        $successful = [];
        $failed = [];

        foreach ($validated['ids'] as $id) {
            try {
                $approval = DataApprovalRequest::with('workflow')->findOrFail($id);
                
                if (!$approval->canBeApprovedBy($user)) {
                    $failed[] = ['id' => $id, 'reason' => 'İcazə yoxdur'];
                    continue;
                }

                DB::beginTransaction();

                ApprovalAction::create([
                    'approval_request_id' => $approval->id,
                    'approver_id' => $user->id,
                    'approval_level' => $approval->current_approval_level,
                    'action' => 'approved',
                    'comments' => $validated['comments'],
                    'action_taken_at' => now(),
                ]);

                if ($approval->workflow->isFullyApproved($approval->current_approval_level)) {
                    $approval->update([
                        'current_status' => 'approved',
                        'completed_at' => now(),
                    ]);
                } else {
                    $approval->update([
                        'current_status' => 'in_progress',
                        'current_approval_level' => $approval->current_approval_level + 1,
                    ]);
                    $this->createNextLevelNotification($approval);
                }

                DB::commit();
                $successful[] = $id;

            } catch (\Exception $e) {
                DB::rollback();
                $failed[] = ['id' => $id, 'reason' => $e->getMessage()];
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'successful' => $successful,
                'failed' => $failed,
                'total_processed' => count($validated['ids']),
                'successful_count' => count($successful),
                'failed_count' => count($failed),
            ],
            'message' => count($successful) . ' sorğu təsdiqləndi'
        ]);
    }

    /**
     * Get surveys available for approval (hierarchical)
     */
    public function getSurveysForApproval(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $surveysQuery = \App\Models\Survey::with(['creator.institution:id,name,type'])
            ->select('id', 'title', 'description', 'creator_id', 'status', 'created_at')
            ->where('status', 'published');

        // Filter by user's hierarchy
        if (!$user->hasRole('superadmin')) {
            if ($user->hasRole('regionadmin')) {
                // RegionAdmin sees surveys from creators in their region
                $regionUsers = \App\Models\User::where('institution_id', $user->institution_id)
                    ->orWhereHas('institution', function($q) use ($user) {
                        $q->where('parent_id', $user->institution_id);
                    })->pluck('id');
                $surveysQuery->whereIn('creator_id', $regionUsers);
            } elseif ($user->hasRole('sektoradmin')) {
                // SektorAdmin sees surveys from their sector users
                $sectorUsers = \App\Models\User::where('institution_id', $user->institution_id)->pluck('id');
                $surveysQuery->whereIn('creator_id', $sectorUsers);
            } else {
                // Others see only their own surveys
                $surveysQuery->where('creator_id', $user->id);
            }
        }

        $surveys = $surveysQuery->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $surveys
        ]);
    }

    /**
     * Get survey responses for approval
     */
    public function getSurveyResponses(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'survey_id' => 'required|exists:surveys,id',
            'status' => 'nullable|in:submitted,approved,rejected',
        ]);

        $user = $request->user();
        $surveyId = $validated['survey_id'];
        $status = $validated['status'] ?? 'submitted';

        // Get institutions based on user hierarchy
        $institutionIds = $this->getUserInstitutionIds($user);

        $responses = \App\Models\SurveyResponse::with([
            'survey:id,title,category',
            'institution:id,name,type,code',
            'respondent:id,name,email',
            'approvedBy:id,name'
        ])
        ->where('survey_id', $surveyId)
        ->where('status', $status)
        ->whereIn('institution_id', $institutionIds)
        ->orderBy('submitted_at', 'desc')
        ->get()
        ->map(function ($response) {
            return [
                'id' => $response->id,
                'survey' => [
                    'id' => $response->survey->id,
                    'title' => $response->survey->title,
                    'category' => $response->survey->category,
                ],
                'institution' => [
                    'id' => $response->institution->id,
                    'name' => $response->institution->name,
                    'type' => $response->institution->type,
                    'code' => $response->institution->code,
                ],
                'respondent' => [
                    'id' => $response->respondent->id,
                    'name' => $response->respondent->name,
                    'email' => $response->respondent->email,
                ],
                'response_data' => $response->responses,
                'progress_percentage' => $response->progress_percentage,
                'is_complete' => $response->is_complete,
                'status' => $response->status,
                'submitted_at' => $response->submitted_at,
                'approved_by' => $response->approvedBy ? $response->approvedBy->name : null,
                'approved_at' => $response->approved_at,
                'rejection_reason' => $response->rejection_reason,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $responses
        ]);
    }

    /**
     * Approve a survey response
     */
    public function approveSurveyResponse(Request $request, int $responseId): JsonResponse
    {
        $validated = $request->validate([
            'comments' => 'nullable|string|max:1000'
        ]);

        $user = $request->user();
        $response = \App\Models\SurveyResponse::findOrFail($responseId);

        // Check if user can approve this response (hierarchy check)
        $institutionIds = $this->getUserInstitutionIds($user);
        if (!in_array($response->institution_id, $institutionIds)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sorğu cavabını təsdiq etməyə icazəniz yoxdur'
            ], 403);
        }

        if ($response->status !== 'submitted') {
            return response()->json([
                'success' => false,
                'message' => 'Bu sorğu cavabı artıq işlənib'
            ], 400);
        }

        $response->update([
            'status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
            'rejection_reason' => null,
        ]);

        // Log the approval action
        \App\Models\SurveyAuditLog::create([
            'survey_id' => $response->survey_id,
            'survey_response_id' => $response->id,
            'user_id' => $user->id,
            'action' => 'approved',
            'details' => $validated['comments'] ?? 'Sorğu cavabı təsdiqləndi',
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sorğu cavabı uğurla təsdiqləndi'
        ]);
    }

    /**
     * Reject a survey response
     */
    public function rejectSurveyResponse(Request $request, int $responseId): JsonResponse
    {
        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000'
        ]);

        $user = $request->user();
        $response = \App\Models\SurveyResponse::findOrFail($responseId);

        // Check if user can approve this response (hierarchy check)
        $institutionIds = $this->getUserInstitutionIds($user);
        if (!in_array($response->institution_id, $institutionIds)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sorğu cavabını rədd etməyə icazəniz yoxdur'
            ], 403);
        }

        if ($response->status !== 'submitted') {
            return response()->json([
                'success' => false,
                'message' => 'Bu sorğu cavabı artıq işlənib'
            ], 400);
        }

        $response->update([
            'status' => 'rejected',
            'approved_by' => $user->id,
            'approved_at' => now(),
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        // Log the rejection action
        \App\Models\SurveyAuditLog::create([
            'survey_id' => $response->survey_id,
            'survey_response_id' => $response->id,
            'user_id' => $user->id,
            'action' => 'rejected',
            'details' => $validated['rejection_reason'],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sorğu cavabı rədd edildi'
        ]);
    }

    /**
     * Bulk approve survey responses
     */
    public function bulkApproveSurveyResponses(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'response_ids' => 'required|array|min:1',
            'response_ids.*' => 'exists:survey_responses,id',
            'comments' => 'nullable|string|max:1000'
        ]);

        $user = $request->user();
        $institutionIds = $this->getUserInstitutionIds($user);
        
        $responses = \App\Models\SurveyResponse::whereIn('id', $validated['response_ids'])
            ->whereIn('institution_id', $institutionIds)
            ->where('status', 'submitted')
            ->get();

        $approvedCount = 0;
        $failedCount = 0;

        foreach ($responses as $response) {
            try {
                $response->update([
                    'status' => 'approved',
                    'approved_by' => $user->id,
                    'approved_at' => now(),
                    'rejection_reason' => null,
                ]);

                // Log the approval action
                \App\Models\SurveyAuditLog::create([
                    'survey_id' => $response->survey_id,
                    'survey_response_id' => $response->id,
                    'user_id' => $user->id,
                    'action' => 'bulk_approved',
                    'details' => $validated['comments'] ?? 'Kütləvi təsdiq',
                    'ip_address' => $request->ip(),
                ]);

                $approvedCount++;
            } catch (\Exception $e) {
                $failedCount++;
            }
        }

        return response()->json([
            'success' => true,
            'message' => "{$approvedCount} sorğu cavabı təsdiqləndi" . ($failedCount > 0 ? ", {$failedCount} xəta" : ''),
            'data' => [
                'approved_count' => $approvedCount,
                'failed_count' => $failedCount,
                'total_requested' => count($validated['response_ids'])
            ]
        ]);
    }

    /**
     * Get user's accessible institution IDs based on hierarchy
     */
    private function getUserInstitutionIds($user): array
    {
        if ($user->hasRole('superadmin')) {
            return \App\Models\Institution::pluck('id')->toArray();
        }

        if ($user->hasRole('regionadmin')) {
            // RegionAdmin sees all institutions in their region
            return \App\Models\Institution::where('parent_id', $user->institution_id)
                ->orWhere('id', $user->institution_id)
                ->pluck('id')
                ->toArray();
        }

        if ($user->hasRole('sektoradmin')) {
            // SektorAdmin sees all schools in their sector
            return \App\Models\Institution::where('parent_id', $user->institution_id)
                ->pluck('id')
                ->toArray();
        }

        // Others see only their own institution
        return [$user->institution_id];
    }

    /**
     * Get approval templates
     */
    public function getTemplates(Request $request): JsonResponse
    {
        $templates = ApprovalTemplate::active()
            ->select('id', 'name', 'template_type', 'description', 'default_approval_chain')
            ->orderBy('is_system_template', 'desc')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $templates
        ]);
    }
}