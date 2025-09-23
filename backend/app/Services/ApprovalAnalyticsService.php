<?php

namespace App\Services;

use App\Models\DataApprovalRequest;
use App\Models\ApprovalAction;
use App\Models\ApprovalWorkflow;
use App\Models\Survey;
use App\Services\BaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ApprovalAnalyticsService extends BaseService
{
    /**
     * Get comprehensive approval statistics
     */
    public function getApprovalStats(Request $request, $user): array
    {
        $dateFrom = $request->get('date_from', Carbon::now()->subMonth()->format('Y-m-d'));
        $dateTo = $request->get('date_to', Carbon::now()->format('Y-m-d'));

        $baseQuery = DataApprovalRequest::whereBetween('data_approval_requests.created_at', [$dateFrom, $dateTo]);
        
        // Apply user-based filtering
        if (!$user->hasRole('superadmin')) {
            $this->applyUserAccessControl($baseQuery, $user);
        }

        return [
            'overview' => $this->getOverviewStats(clone $baseQuery),
            'status_breakdown' => $this->getStatusBreakdown(clone $baseQuery),
            'workflow_performance' => $this->getWorkflowPerformance(clone $baseQuery),
            'processing_times' => $this->getProcessingTimeStats(clone $baseQuery),
            'approver_performance' => $this->getApproverPerformance(clone $baseQuery, $user),
            'trends' => $this->getTrendAnalysis($dateFrom, $dateTo, $user),
            'bottlenecks' => $this->getBottleneckAnalysis(clone $baseQuery),
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo
            ]
        ];
    }

    /**
     * Get survey responses for approval with hierarchical filtering
     */
    public function getSurveyResponsesForApproval(Request $request, $user): array
    {
        $query = \App\Models\SurveyResponse::with([
            'survey:id,title,description,survey_type',
            'institution:id,name,type',
            'respondent:id,name,username,email',
            'department:id,name'
        ])->where('status', 'submitted');

        // Apply hierarchical filtering based on user role
        $this->applySurveyResponseHierarchy($query, $user);
        
        // Apply filters
        if ($request->filled('survey_id')) {
            $query->where('survey_id', $request->survey_id);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->filled('institution_id') && $user->hasRole(['superadmin', 'regionadmin'])) {
            $query->where('institution_id', $request->institution_id);
        }

        // Sort by submission date
        $query->orderBy('submitted_at', 'desc');

        $perPage = $request->get('per_page', 15);
        $responses = $query->paginate($perPage);

        return [
            'survey_responses' => $responses->items(),
            'meta' => [
                'current_page' => $responses->currentPage(),
                'last_page' => $responses->lastPage(),
                'per_page' => $responses->perPage(),
                'total' => $responses->total(),
                'from' => $responses->firstItem(),
                'to' => $responses->lastItem()
            ],
            'filters_applied' => $this->getAppliedFilters($request, $user)
        ];
    }

    /**
     * Get surveys for approval
     */
    public function getSurveysForApproval(Request $request, $user): array
    {
        $query = Survey::where('approval_status', 'pending');

        // Apply user-based filtering
        if (!$user->hasRole('superadmin')) {
            $this->applySurveyAccessControl($query, $user);
        }

        // Apply filters
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('survey_type')) {
            $query->where('survey_type', $request->survey_type);
        }

        if ($request->filled('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        // Sort by priority and creation date
        $query->orderByDesc('priority')
              ->orderBy('created_at', 'asc');

        $surveys = $query->paginate($request->get('per_page', 15));

        return [
            'surveys' => $surveys,
            'summary' => [
                'total' => $surveys->total(),
                'high_priority' => Survey::where('approval_status', 'pending')
                    ->where('priority', 'high')->count(),
                'awaiting_approval' => $surveys->total()
            ]
        ];
    }

    /**
     * Get workflow templates and configurations
     */
    public function getWorkflows(Request $request): array
    {
        $workflows = ApprovalWorkflow::with(['approvalRequests' => function ($query) {
            $query->selectRaw('workflow_id, COUNT(*) as total_requests, 
                              AVG(CASE WHEN current_status = "approved" THEN 1 ELSE 0 END) as approval_rate')
                  ->groupBy('workflow_id');
        }])->where('is_active', true)->get();

        return $workflows->map(function ($workflow) {
            return [
                'id' => $workflow->id,
                'name' => $workflow->name,
                'workflow_type' => $workflow->workflow_type,
                'description' => $workflow->description,
                'required_approval_levels' => $workflow->required_approval_levels,
                'is_active' => $workflow->is_active,
                'total_requests' => $workflow->approvalRequests->sum('total_requests') ?? 0,
                'approval_rate' => round(($workflow->approvalRequests->avg('approval_rate') ?? 0) * 100, 2),
                'workflow_config' => $workflow->workflow_config
            ];
        })->toArray();
    }

    /**
     * Get overview statistics
     */
    private function getOverviewStats($baseQuery): array
    {
        try {
            $total = $baseQuery->count();
            $approved = (clone $baseQuery)->where('current_status', 'approved')->count();
            $rejected = (clone $baseQuery)->where('current_status', 'rejected')->count();
            $pending = (clone $baseQuery)->where('current_status', 'pending')->count();
            $revision = (clone $baseQuery)->where('current_status', 'needs_revision')->count();

            return [
                'total_requests' => $total,
                'approved' => $approved,
                'rejected' => $rejected,
                'pending' => $pending,
                'needs_revision' => $revision,
                'approval_rate' => $total > 0 ? round(($approved / $total) * 100, 2) : 0,
                'rejection_rate' => $total > 0 ? round(($rejected / $total) * 100, 2) : 0
            ];
        } catch (\Exception $e) {
            return [
                'total_requests' => 0,
                'approved' => 0,
                'rejected' => 0,
                'pending' => 0,
                'needs_revision' => 0,
                'approval_rate' => 0,
                'rejection_rate' => 0
            ];
        }
    }

    /**
     * Get status breakdown with percentages
     */
    private function getStatusBreakdown($baseQuery): array
    {
        $statusCounts = $baseQuery->selectRaw('current_status, COUNT(*) as count')
            ->groupBy('current_status')
            ->pluck('count', 'current_status')
            ->toArray();

        $total = array_sum($statusCounts);

        return array_map(function ($count) use ($total) {
            return [
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 2) : 0
            ];
        }, $statusCounts);
    }

    /**
     * Get workflow performance metrics
     */
    private function getWorkflowPerformance($baseQuery): array
    {
        try {
            $results = $baseQuery->join('approval_workflows', 'data_approval_requests.workflow_id', '=', 'approval_workflows.id')
                ->selectRaw('
                    approval_workflows.workflow_type,
                    approval_workflows.name,
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN current_status = "approved" THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN current_status = "rejected" THEN 1 ELSE 0 END) as rejected,
                    AVG(CASE 
                        WHEN completed_at IS NOT NULL 
                        THEN (julianday(completed_at) - julianday(data_approval_requests.created_at)) * 24 
                        ELSE NULL 
                    END) as avg_processing_hours
                ')
                ->groupBy('approval_workflows.id', 'approval_workflows.workflow_type', 'approval_workflows.name')
                ->get()
                ->map(function ($item) {
                    $item->approval_rate = $item->total_requests > 0 
                        ? round(($item->approved / $item->total_requests) * 100, 2) 
                        : 0;
                    $item->rejection_rate = $item->total_requests > 0 
                        ? round(($item->rejected / $item->total_requests) * 100, 2) 
                        : 0;
                    $item->avg_processing_hours = round($item->avg_processing_hours ?? 0, 2);
                    return $item;
                });

            return $results->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Get processing time statistics
     */
    private function getProcessingTimeStats($baseQuery): array
    {
        $processedRequests = $baseQuery->whereNotNull('completed_at');

        $stats = $processedRequests->selectRaw('
            AVG((julianday(completed_at) - julianday(created_at)) * 24) as avg_hours,
            MIN((julianday(completed_at) - julianday(created_at)) * 24) as min_hours,
            MAX((julianday(completed_at) - julianday(created_at)) * 24) as max_hours,
            0 as stddev_hours
        ')->first();

        // Get processing time distribution
        $distribution = $processedRequests->selectRaw('
            CASE 
                WHEN (julianday(completed_at) - julianday(created_at)) * 24 < 24 THEN "0-1 gün"
                WHEN (julianday(completed_at) - julianday(created_at)) * 24 < 72 THEN "1-3 gün"
                WHEN (julianday(completed_at) - julianday(created_at)) * 24 < 168 THEN "3-7 gün"
                ELSE "1 həftədən çox"
            END as time_range,
            COUNT(*) as count
        ')
        ->groupBy('time_range')
        ->pluck('count', 'time_range')
        ->toArray();

        return [
            'average_hours' => round($stats->avg_hours ?? 0, 2),
            'minimum_hours' => round($stats->min_hours ?? 0, 2),
            'maximum_hours' => round($stats->max_hours ?? 0, 2),
            'standard_deviation' => round($stats->stddev_hours ?? 0, 2),
            'distribution' => $distribution
        ];
    }

    /**
     * Get approver performance metrics
     */
    private function getApproverPerformance($baseQuery, $user): array
    {
        try {
            $requestIds = $baseQuery->pluck('id');
            
            if ($requestIds->isEmpty()) {
                return [];
            }

            $approverStats = ApprovalAction::whereIn('approval_request_id', $requestIds)
                ->join('users', 'approval_actions.approver_id', '=', 'users.id')
                ->selectRaw('
                    users.id as approver_id,
                    users.username as approver_name,
                    COUNT(*) as total_actions,
                    SUM(CASE WHEN action = "approved" THEN 1 ELSE 0 END) as approved_count,
                    SUM(CASE WHEN action = "rejected" THEN 1 ELSE 0 END) as rejected_count,
                    AVG((julianday(action_taken_at) - julianday(approval_actions.created_at)) * 24) as avg_response_hours
                ')
                ->groupBy('users.id', 'users.username')
                ->get()
                ->map(function ($item) {
                    $item->approval_rate = $item->total_actions > 0 
                        ? round(($item->approved_count / $item->total_actions) * 100, 2) 
                        : 0;
                    $item->avg_response_hours = round($item->avg_response_hours ?? 0, 2);
                    return $item;
                });

            return $approverStats->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Get trend analysis over time
     */
    private function getTrendAnalysis($dateFrom, $dateTo, $user): array
    {
        $query = DataApprovalRequest::whereBetween('created_at', [$dateFrom, $dateTo]);
        
        if (!$user->hasRole('superadmin')) {
            $this->applyUserAccessControl($query, $user);
        }

        // Monthly trends
        $monthlyTrends = $query->selectRaw('
            strftime("%Y-%m", created_at) as month,
            COUNT(*) as total,
            SUM(CASE WHEN current_status = "approved" THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN current_status = "rejected" THEN 1 ELSE 0 END) as rejected
        ')
        ->groupBy('month')
        ->orderBy('month')
        ->get()
        ->map(function ($item) {
            $item->approval_rate = $item->total > 0 ? round(($item->approved / $item->total) * 100, 2) : 0;
            return $item;
        });

        // Weekly trends (last 8 weeks)
        $weeklyTrends = DataApprovalRequest::where('created_at', '>=', Carbon::now()->subWeeks(8))
            ->selectRaw('
                strftime("%Y%W", created_at) as week,
                COUNT(*) as total,
                SUM(CASE WHEN current_status = "approved" THEN 1 ELSE 0 END) as approved
            ')
            ->groupBy('week')
            ->orderBy('week')
            ->get();

        return [
            'monthly' => $monthlyTrends->toArray(),
            'weekly' => $weeklyTrends->toArray()
        ];
    }

    /**
     * Get bottleneck analysis
     */
    private function getBottleneckAnalysis($baseQuery): array
    {
        try {
            // Find requests taking longer than average
            $longProcessingRequests = (clone $baseQuery)->where('current_status', 'pending')
                ->where('created_at', '<', Carbon::now()->subDays(3))
                ->with(['workflow', 'submitter'])
                ->orderBy('created_at')
                ->limit(10)
                ->get();

            // Find approvers with high pending counts
            $pendingByApprover = (clone $baseQuery)->where('current_status', 'pending')
                ->selectRaw('current_approver_role, COUNT(*) as pending_count')
                ->groupBy('current_approver_role')
                ->orderByDesc('pending_count')
                ->get();

            return [
                'long_processing_requests' => $longProcessingRequests->map(function ($request) {
                    return [
                        'id' => $request->id,
                        'title' => $request->request_title,
                        'workflow_type' => $request->workflow->workflow_type ?? 'Unknown',
                        'submitter' => $request->submitter->name ?? 'Unknown',
                        'days_pending' => Carbon::parse($request->created_at)->diffInDays(now()),
                        'current_approver_role' => $request->current_approver_role
                    ];
                }),
                'approver_bottlenecks' => $pendingByApprover->toArray()
            ];
        } catch (\Exception $e) {
            return [
                'long_processing_requests' => [],
                'approver_bottlenecks' => []
            ];
        }
    }

    /**
     * Apply user-based access control to approval queries
     */
    private function applyUserAccessControl($query, $user): void
    {
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
            // For other roles, show only their own requests
            $query->where('submitter_id', $user->id);
        }
    }

    /**
     * Apply user-based access control to survey queries
     */
    private function applySurveyAccessControl($query, $user): void
    {
        if ($user->hasRole('regionadmin')) {
            $regionInstitution = $user->institution;
            if ($regionInstitution && $regionInstitution->level == 2) {
                $childIds = $regionInstitution->getAllChildrenIds();
                $query->whereHas('creator', function($q) use ($childIds) {
                    $q->whereIn('institution_id', $childIds);
                });
            }
        } elseif ($user->hasRole('sektoradmin')) {
            $sectorInstitution = $user->institution;
            if ($sectorInstitution && $sectorInstitution->level == 3) {
                $childIds = $sectorInstitution->getAllChildrenIds();
                $query->whereHas('creator', function($q) use ($childIds) {
                    $q->whereIn('institution_id', $childIds);
                });
            }
        } elseif ($user->hasRole('schooladmin')) {
            $schoolInstitution = $user->institution;
            if ($schoolInstitution) {
                $query->whereHas('creator', function($q) use ($schoolInstitution) {
                    $q->where('institution_id', $schoolInstitution->id);
                });
            }
        }
    }

    /**
     * Apply hierarchical access control for survey responses
     */
    private function applySurveyResponseHierarchy($query, $user)
    {
        if ($user->hasRole(['superadmin'])) {
            // SuperAdmin can see all survey responses
            return;
        }

        if ($user->hasRole('regionadmin')) {
            // RegionAdmin: Can see SektorAdmin and SchoolAdmin responses in their region
            $regionInstitution = $user->institution;
            if ($regionInstitution && $regionInstitution->level == 2) {
                $childIds = $regionInstitution->getAllChildrenIds();
                $query->whereIn('institution_id', $childIds)
                      ->whereHas('respondent', function($q) {
                          $q->whereHas('roles', function($roleQuery) {
                              $roleQuery->whereIn('name', ['sektoradmin', 'schooladmin']);
                          });
                      });
            }
        } 
        elseif ($user->hasRole('sektoradmin')) {
            // SektorAdmin: Can only see SchoolAdmin responses in their sector
            $sectorInstitution = $user->institution;
            if ($sectorInstitution && $sectorInstitution->level == 3) {
                $childIds = $sectorInstitution->getAllChildrenIds();
                $query->whereIn('institution_id', $childIds)
                      ->whereHas('respondent', function($q) {
                          $q->whereHas('roles', function($roleQuery) {
                              $roleQuery->where('name', 'schooladmin');
                          });
                      });
            }
        } 
        else {
            // Other roles can only see their own institution's responses
            if ($user->institution) {
                $query->where('institution_id', $user->institution->id);
            }
        }
    }

    /**
     * Get applied filters information
     */
    private function getAppliedFilters(Request $request, $user): array
    {
        return [
            'user_role' => $user->getRoleNames()->first(),
            'institution_filter' => $user->institution ? $user->institution->name : null,
            'status_filter' => $request->get('status', 'submitted'),
            'survey_filter' => $request->filled('survey_id') ? $request->survey_id : null,
        ];
    }

    /**
     * Bulk approve survey responses
     */
    public function bulkApproveSurveyResponses(array $responseIds, $user, ?string $comments = null): array
    {
        $approvedCount = 0;
        $failedCount = 0;
        $errors = [];

        foreach ($responseIds as $responseId) {
            try {
                $response = \App\Models\SurveyResponse::findOrFail($responseId);

                // Check if user has permission to approve this response
                if ($this->canUserApproveResponse($user, $response)) {
                    // Ensure approval request exists before approving
                    $response->ensureApprovalRequestExists();

                    $response->approve($user);
                    $approvedCount++;
                } else {
                    $failedCount++;
                    $errors[] = "Response {$responseId}: İcazəniz yoxdur";
                }
            } catch (\Exception $e) {
                $failedCount++;
                $errors[] = "Response {$responseId}: " . $e->getMessage();
            }
        }

        return [
            'total_requested' => count($responseIds),
            'approved_count' => $approvedCount,
            'failed_count' => $failedCount,
            'errors' => $errors,
            'success_rate' => count($responseIds) > 0 ? ($approvedCount / count($responseIds)) * 100 : 0
        ];
    }

    /**
     * Bulk reject survey responses
     */
    public function bulkRejectSurveyResponses(array $responseIds, $user, string $reason): array
    {
        $rejectedCount = 0;
        $failedCount = 0;
        $errors = [];

        foreach ($responseIds as $responseId) {
            try {
                $response = \App\Models\SurveyResponse::findOrFail($responseId);

                // Check if user has permission to reject this response
                if ($this->canUserApproveResponse($user, $response)) {
                    // Ensure approval request exists before rejecting
                    $response->ensureApprovalRequestExists();

                    $response->reject($reason, $user);
                    $rejectedCount++;
                } else {
                    $failedCount++;
                    $errors[] = "Response {$responseId}: İcazəniz yoxdur";
                }
            } catch (\Exception $e) {
                $failedCount++;
                $errors[] = "Response {$responseId}: " . $e->getMessage();
            }
        }

        return [
            'total_requested' => count($responseIds),
            'rejected_count' => $rejectedCount,
            'failed_count' => $failedCount,
            'errors' => $errors,
            'success_rate' => count($responseIds) > 0 ? ($rejectedCount / count($responseIds)) * 100 : 0
        ];
    }

    /**
     * Check if user can approve/reject a survey response based on hierarchy
     */
    private function canUserApproveResponse($user, $response): bool
    {
        // SuperAdmin can approve anything
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // RegionAdmin can approve responses from their region
        if ($user->hasRole('regionadmin')) {
            if ($user->institution && $user->institution->level == 2) {
                $childIds = $user->institution->getAllChildrenIds();
                return in_array($response->institution_id, $childIds);
            }
        }

        // SektorAdmin can approve responses from their sector schools
        if ($user->hasRole('sektoradmin')) {
            if ($user->institution && $user->institution->level == 3) {
                $childIds = $user->institution->getAllChildrenIds();
                return in_array($response->institution_id, $childIds);
            }
        }

        return false;
    }
}