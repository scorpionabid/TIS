<?php

namespace App\Services;

use App\Models\ApprovalWorkflow;
use App\Models\DataApprovalRequest;
use App\Models\ApprovalAction;
use App\Models\ApprovalNotification;
use App\Models\ApprovalDelegate;
use App\Models\User;
use App\Services\BaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Exception;

class ApprovalWorkflowService extends BaseService
{
    /**
     * Get approval requests with filtering and pagination
     */
    public function getApprovalRequests(Request $request, $user)
    {
        $query = DataApprovalRequest::with([
            'workflow:id,name,workflow_type',
            'institution:id,name,type',
            'submitter:id,name,username,email',
            'approvalActions.approver:id,name,username'
        ]);

        // Apply user-based filtering
        $this->filterByApprovalAuthority($query, $user);

        // Apply filters
        $query = $this->applyFilters($query, $request);

        // Apply sorting
        $sortField = $request->get('sort', 'created_at');
        $direction = $request->get('direction', 'desc');
        $query->orderBy($sortField, $direction);

        // Paginate results
        $perPage = $request->get('per_page', 15);
        $approvals = $query->paginate($perPage);

        return [
            'approvals' => $approvals,
            'total' => $approvals->total(),
            'current_page' => $approvals->currentPage(),
            'last_page' => $approvals->lastPage(),
            'per_page' => $approvals->perPage()
        ];
    }

    /**
     * Get single approval request details
     */
    public function getApprovalRequest($id, $user)
    {
        $approval = DataApprovalRequest::with([
            'workflow',
            'institution',
            'submitter',
            'approvalActions' => function ($query) {
                $query->orderBy('created_at', 'desc');
            },
            'approvalActions.approver'
        ])->findOrFail($id);

        if (!$this->canUserViewApproval($user, $approval)) {
            throw new Exception('Bu təsdiq tələbinə giriş icazəniz yoxdur', 403);
        }

        return $approval;
    }

    /**
     * Approve request
     */
    public function approveRequest($id, array $data, $user)
    {
        return DB::transaction(function () use ($id, $data, $user) {
            $approval = DataApprovalRequest::findOrFail($id);

            if (!$this->canUserViewApproval($user, $approval)) {
                throw new Exception('Bu təsdiq tələbinə giriş icazəniz yoxdur', 403);
            }

            if ($approval->current_status !== 'pending') {
                throw new Exception('Bu təsdiq tələbi artıq işlənmişdir', 422);
            }

            // Create approval action
            ApprovalAction::create([
                'approval_request_id' => $approval->id,
                'approver_id' => $user->id,
                'action_type' => 'approved',
                'comments' => $data['comments'] ?? null,
                'approval_level' => $data['approval_level'] ?? 1,
                'approved_at' => now()
            ]);

            // Determine next step based on workflow
            $workflow = $approval->workflow;
            $nextStatus = $this->determineNextStatus($approval, $workflow, 'approved');

            // Update approval request status
            $approval->update([
                'current_status' => $nextStatus,
                'current_approver_role' => $nextStatus === 'approved' ? null : $this->getNextApproverRole($workflow, $approval->current_approver_role),
                'approved_at' => $nextStatus === 'approved' ? now() : null,
                'processed_at' => now()
            ]);

            // Create notifications
            if ($nextStatus === 'approved') {
                $this->createCompletionNotification($approval);
            } else {
                $this->createNextLevelNotification($approval);
            }

            return $approval->fresh(['approvalActions.approver']);
        });
    }

    /**
     * Reject request
     */
    public function rejectRequest($id, array $data, $user)
    {
        return DB::transaction(function () use ($id, $data, $user) {
            $approval = DataApprovalRequest::findOrFail($id);

            if (!$this->canUserViewApproval($user, $approval)) {
                throw new Exception('Bu təsdiq tələbinə giriş icazəniz yoxdur', 403);
            }

            if ($approval->current_status !== 'pending') {
                throw new Exception('Bu təsdiq tələbi artıq işlənmişdir', 422);
            }

            // Create rejection action
            ApprovalAction::create([
                'approval_request_id' => $approval->id,
                'approver_id' => $user->id,
                'action_type' => 'rejected',
                'comments' => $data['comments'],
                'rejection_reason' => $data['rejection_reason'] ?? null,
                'approved_at' => now()
            ]);

            // Update approval request status
            $approval->update([
                'current_status' => 'rejected',
                'current_approver_role' => null,
                'rejected_at' => now(),
                'processed_at' => now()
            ]);

            // Create rejection notification
            $this->createRejectionNotification($approval, $data['comments']);

            return $approval->fresh(['approvalActions.approver']);
        });
    }

    /**
     * Return for revision
     */
    public function returnForRevision($id, array $data, $user)
    {
        return DB::transaction(function () use ($id, $data, $user) {
            $approval = DataApprovalRequest::findOrFail($id);

            if (!$this->canUserViewApproval($user, $approval)) {
                throw new Exception('Bu təsdiq tələbinə giriş icazəniz yoxdur', 403);
            }

            if ($approval->current_status !== 'pending') {
                throw new Exception('Bu təsdiq tələbi artıq işlənmişdir', 422);
            }

            // Create revision action
            ApprovalAction::create([
                'approval_request_id' => $approval->id,
                'approver_id' => $user->id,
                'action_type' => 'returned_for_revision',
                'comments' => $data['comments'],
                'revision_notes' => $data['revision_notes'] ?? null,
                'approved_at' => now()
            ]);

            // Update approval request status
            $approval->update([
                'current_status' => 'needs_revision',
                'current_approver_role' => null,
                'processed_at' => now()
            ]);

            // Create revision notification
            $this->createRevisionNotification($approval, $data['comments']);

            return $approval->fresh(['approvalActions.approver']);
        });
    }

    /**
     * Get pending approvals for user
     */
    public function getPendingApprovals(Request $request, $user)
    {
        $query = DataApprovalRequest::with(['workflow', 'institution', 'submitter'])
            ->where('current_status', 'pending');

        // Filter by user's approval authority
        $this->filterByApprovalAuthority($query, $user);

        // Additional filters
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('workflow_type')) {
            $query->whereHas('workflow', function ($q) use ($request) {
                $q->where('workflow_type', $request->workflow_type);
            });
        }

        // Sort by priority and created date
        $query->orderByDesc('priority')
              ->orderBy('created_at', 'asc');

        return $query->paginate($request->get('per_page', 15));
    }

    /**
     * Get user's approval history
     */
    public function getMyApprovals(Request $request, $user)
    {
        $query = ApprovalAction::with([
            'approvalRequest.workflow',
            'approvalRequest.institution',
            'approvalRequest.submitter'
        ])->where('approver_id', $user->id);

        // Apply date filters
        if ($request->filled('date_from')) {
            $query->whereDate('approved_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('approved_at', '<=', $request->date_to);
        }

        if ($request->filled('action_type')) {
            $query->where('action_type', $request->action_type);
        }

        $query->orderBy('approved_at', 'desc');

        return $query->paginate($request->get('per_page', 15));
    }

    /**
     * Create new approval request
     */
    public function createApprovalRequest(array $data, $user)
    {
        return DB::transaction(function () use ($data, $user) {
            // Find workflow
            $workflow = ApprovalWorkflow::where('workflow_type', $data['workflow_type'])
                ->where('is_active', true)
                ->firstOrFail();

            // Create approval request
            $approval = DataApprovalRequest::create([
                'workflow_id' => $workflow->id,
                'institution_id' => $data['institution_id'],
                'submitter_id' => $user->id,
                'request_title' => $data['request_title'],
                'request_description' => $data['request_description'],
                'request_data' => $data['request_data'] ?? null,
                'priority' => $data['priority'] ?? 'normal',
                'current_status' => 'pending',
                'current_approver_role' => $this->getFirstApproverRole($workflow),
                'submitted_at' => now()
            ]);

            // Create initial notification
            $this->createInitialNotification($approval);

            return $approval->load(['workflow', 'institution']);
        });
    }

    /**
     * Bulk approve requests
     */
    public function bulkApprove(array $requestIds, array $data, $user)
    {
        return DB::transaction(function () use ($requestIds, $data, $user) {
            $results = [
                'approved' => 0,
                'failed' => 0,
                'errors' => []
            ];

            foreach ($requestIds as $id) {
                try {
                    $this->approveRequest($id, $data, $user);
                    $results['approved']++;
                } catch (Exception $e) {
                    $results['failed']++;
                    $results['errors'][] = "ID {$id}: " . $e->getMessage();
                }
            }

            return $results;
        });
    }

    /**
     * Get approval analytics
     */
    public function getAnalytics(Request $request, $user)
    {
        $dateFrom = $request->get('date_from', Carbon::now()->subMonth()->format('Y-m-d'));
        $dateTo = $request->get('date_to', Carbon::now()->format('Y-m-d'));

        $query = DataApprovalRequest::whereBetween('created_at', [$dateFrom, $dateTo]);

        // Filter by user authority if not superadmin
        if (!$user->hasRole('superadmin')) {
            $this->filterByApprovalAuthority($query, $user);
        }

        // Status distribution
        $statusStats = $query->selectRaw('current_status, COUNT(*) as count')
            ->groupBy('current_status')
            ->pluck('count', 'current_status')
            ->toArray();

        // Processing time analytics
        $processingTimes = DataApprovalRequest::whereBetween('created_at', [$dateFrom, $dateTo])
            ->whereNotNull('processed_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, processed_at)) as avg_hours')
            ->value('avg_hours');

        // Approval rate by workflow type
        $workflowStats = $query->join('approval_workflows', 'data_approval_requests.workflow_id', '=', 'approval_workflows.id')
            ->selectRaw('approval_workflows.workflow_type, 
                        COUNT(*) as total,
                        SUM(CASE WHEN current_status = "approved" THEN 1 ELSE 0 END) as approved')
            ->groupBy('approval_workflows.workflow_type')
            ->get()
            ->map(function ($item) {
                $item->approval_rate = $item->total > 0 ? round(($item->approved / $item->total) * 100, 2) : 0;
                return $item;
            });

        return [
            'status_distribution' => $statusStats,
            'average_processing_time_hours' => round($processingTimes ?? 0, 2),
            'workflow_statistics' => $workflowStats,
            'total_requests' => array_sum($statusStats),
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo
            ]
        ];
    }

    /**
     * Apply filters to query
     */
    private function applyFilters($query, Request $request)
    {
        if ($request->filled('status')) {
            $query->where('current_status', $request->status);
        }

        if ($request->filled('workflow_type')) {
            $query->whereHas('workflow', function ($q) use ($request) {
                $q->where('workflow_type', $request->workflow_type);
            });
        }

        if ($request->filled('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->filled('submitter_id')) {
            $query->where('submitter_id', $request->submitter_id);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('request_title', 'like', "%{$search}%")
                  ->orWhere('request_description', 'like', "%{$search}%");
            });
        }

        return $query;
    }

    /**
     * Filter by user's approval authority
     */
    private function filterByApprovalAuthority($query, $user): void
    {
        if ($user->hasRole('superadmin')) {
            return; // SuperAdmin can see all
        }

        if ($user->hasRole('regionadmin')) {
            $regionInstitution = $user->institution;
            if ($regionInstitution && $regionInstitution->level == 2) {
                $childIds = $regionInstitution->getAllChildrenIds();
                $query->whereIn('institution_id', $childIds);
            }
        } elseif ($user->hasRole('sektoradmin')) {
            $sectorInstitution = $user->institution;
            if ($sectorInstitution && $sectorInstitution->level == 3) {
                $childIds = $sectorInstitution->getAllChildrenIds();
                $query->whereIn('institution_id', $childIds);
            }
        } elseif ($user->hasRole('schooladmin')) {
            $schoolInstitution = $user->institution;
            if ($schoolInstitution) {
                $query->where('institution_id', $schoolInstitution->id);
            }
        } else {
            // For other roles, show requests where they are the current approver or submitter
            $query->where(function ($q) use ($user) {
                $q->where('submitter_id', $user->id)
                  ->orWhere('current_approver_role', $user->role->name);
            });
        }
    }

    /**
     * Check if user can view approval request
     */
    private function canUserViewApproval($user, DataApprovalRequest $approval): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Submitter can view their own requests
        if ($approval->submitter_id === $user->id) {
            return true;
        }

        // Current approver can view
        if ($approval->current_approver_role === $user->role->name) {
            return true;
        }

        // Check institutional hierarchy access
        $userInstitution = $user->institution;
        if (!$userInstitution) {
            return false;
        }

        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $allowedIds = $userInstitution->getAllChildrenIds();
            return in_array($approval->institution_id, $allowedIds);
        }

        if ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $allowedIds = $userInstitution->getAllChildrenIds();
            return in_array($approval->institution_id, $allowedIds);
        }

        if ($user->hasRole('schooladmin')) {
            return $userInstitution->id === $approval->institution_id;
        }

        return false;
    }

    /**
     * Determine next status based on workflow and action
     */
    private function determineNextStatus($approval, $workflow, $action): string
    {
        if ($action === 'approved') {
            // Check if this is the final approval level
            $currentLevel = $approval->approvalActions()->where('action_type', 'approved')->count();
            $requiredLevels = $workflow->required_approval_levels ?? 1;
            
            return $currentLevel >= $requiredLevels ? 'approved' : 'pending';
        }

        return $approval->current_status;
    }

    /**
     * Get first approver role from workflow
     */
    private function getFirstApproverRole($workflow): ?string
    {
        $config = $workflow->workflow_config ?? [];
        return $config['first_approver_role'] ?? 'schooladmin';
    }

    /**
     * Get next approver role based on current role
     */
    private function getNextApproverRole($workflow, $currentRole): ?string
    {
        $config = $workflow->workflow_config ?? [];
        $hierarchy = $config['approval_hierarchy'] ?? ['schooladmin', 'sektoradmin', 'regionadmin'];
        
        $currentIndex = array_search($currentRole, $hierarchy);
        return $currentIndex !== false && isset($hierarchy[$currentIndex + 1]) 
            ? $hierarchy[$currentIndex + 1] 
            : null;
    }

    /**
     * Create notification for next level approver
     */
    private function createNextLevelNotification(DataApprovalRequest $approval): void
    {
        $approvers = $this->findApprovers($approval, $approval->current_approver_role);
        
        foreach ($approvers as $approver) {
            ApprovalNotification::create([
                'approval_request_id' => $approval->id,
                'user_id' => $approver->id,
                'notification_type' => 'approval_required',
                'title' => "Yeni təsdiq tələbi: {$approval->request_title}",
                'message' => "Sizin təsdiqqinizi gözləyən yeni tələb var.",
                'is_read' => false
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
            'user_id' => $approval->submitter_id,
            'notification_type' => 'request_rejected',
            'title' => "Tələb rədd edildi: {$approval->request_title}",
            'message' => "Tələbiniz rədd edildi. Səbəb: {$comments}",
            'is_read' => false
        ]);
    }

    /**
     * Create revision notification
     */
    private function createRevisionNotification(DataApprovalRequest $approval, string $comments): void
    {
        ApprovalNotification::create([
            'approval_request_id' => $approval->id,
            'user_id' => $approval->submitter_id,
            'notification_type' => 'revision_required',
            'title' => "Düzəliş tələb olunur: {$approval->request_title}",
            'message' => "Tələbinizdə düzəliş edilməsi gərəkir. Qeydlər: {$comments}",
            'is_read' => false
        ]);
    }

    /**
     * Create initial notification
     */
    private function createInitialNotification(DataApprovalRequest $approval): void
    {
        $this->createNextLevelNotification($approval);
    }

    /**
     * Create completion notification
     */
    private function createCompletionNotification(DataApprovalRequest $approval): void
    {
        ApprovalNotification::create([
            'approval_request_id' => $approval->id,
            'user_id' => $approval->submitter_id,
            'notification_type' => 'request_approved',
            'title' => "Tələb təsdiqləndi: {$approval->request_title}",
            'message' => "Tələbiniz uğurla təsdiqləndi və tətbiq edildi.",
            'is_read' => false
        ]);
    }

    /**
     * Find approvers by role
     */
    private function findApprovers(DataApprovalRequest $approval, string $role)
    {
        $institution = $approval->institution;
        
        // Find users in the same institution hierarchy with the specified role
        if ($role === 'schooladmin') {
            return User::whereHas('role', function ($q) use ($role) {
                $q->where('name', $role);
            })->where('institution_id', $institution->id)->get();
        }
        
        if ($role === 'sektoradmin' && $institution->level >= 3) {
            $sectorInstitution = $institution->level === 4 ? $institution->parent : $institution;
            return User::whereHas('role', function ($q) use ($role) {
                $q->where('name', $role);
            })->where('institution_id', $sectorInstitution->id)->get();
        }
        
        if ($role === 'regionadmin' && $institution->level >= 2) {
            $ancestors = $institution->getAncestors();
            $regionInstitution = $ancestors->firstWhere('level', 2);
            if ($regionInstitution) {
                return User::whereHas('role', function ($q) use ($role) {
                    $q->where('name', $role);
                })->where('institution_id', $regionInstitution->id)->get();
            }
        }
        
        return collect();
    }
}