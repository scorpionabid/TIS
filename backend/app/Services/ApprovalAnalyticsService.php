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

        $baseQuery = DataApprovalRequest::whereBetween('created_at', [$dateFrom, $dateTo]);
        
        // Apply user-based filtering
        if (!$user->hasRole('superadmin')) {
            $this->applyUserAccessControl($baseQuery, $user);
        }

        return [
            'overview' => $this->getOverviewStats($baseQuery),
            'status_breakdown' => $this->getStatusBreakdown($baseQuery),
            'workflow_performance' => $this->getWorkflowPerformance($baseQuery),
            'processing_times' => $this->getProcessingTimeStats($baseQuery),
            'approver_performance' => $this->getApproverPerformance($baseQuery, $user),
            'trends' => $this->getTrendAnalysis($dateFrom, $dateTo, $user),
            'bottlenecks' => $this->getBottleneckAnalysis($baseQuery),
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo
            ]
        ];
    }

    /**
     * Get surveys for approval
     */
    public function getSurveysForApproval(Request $request, $user): array
    {
        $query = Survey::with(['creator', 'institution', 'approvalRequest'])
            ->where('status', 'pending_approval');

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
                'high_priority' => Survey::where('status', 'pending_approval')
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
        $total = $baseQuery->count();
        $approved = $baseQuery->where('current_status', 'approved')->count();
        $rejected = $baseQuery->where('current_status', 'rejected')->count();
        $pending = $baseQuery->where('current_status', 'pending')->count();
        $revision = $baseQuery->where('current_status', 'needs_revision')->count();

        return [
            'total_requests' => $total,
            'approved' => $approved,
            'rejected' => $rejected,
            'pending' => $pending,
            'needs_revision' => $revision,
            'approval_rate' => $total > 0 ? round(($approved / $total) * 100, 2) : 0,
            'rejection_rate' => $total > 0 ? round(($rejected / $total) * 100, 2) : 0
        ];
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
        return $baseQuery->join('approval_workflows', 'data_approval_requests.workflow_id', '=', 'approval_workflows.id')
            ->selectRaw('
                approval_workflows.workflow_type,
                approval_workflows.name,
                COUNT(*) as total_requests,
                SUM(CASE WHEN current_status = "approved" THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN current_status = "rejected" THEN 1 ELSE 0 END) as rejected,
                AVG(CASE 
                    WHEN processed_at IS NOT NULL 
                    THEN TIMESTAMPDIFF(HOUR, data_approval_requests.created_at, processed_at) 
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
            })
            ->toArray();
    }

    /**
     * Get processing time statistics
     */
    private function getProcessingTimeStats($baseQuery): array
    {
        $processedRequests = $baseQuery->whereNotNull('processed_at');

        $stats = $processedRequests->selectRaw('
            AVG(TIMESTAMPDIFF(HOUR, created_at, processed_at)) as avg_hours,
            MIN(TIMESTAMPDIFF(HOUR, created_at, processed_at)) as min_hours,
            MAX(TIMESTAMPDIFF(HOUR, created_at, processed_at)) as max_hours,
            STDDEV(TIMESTAMPDIFF(HOUR, created_at, processed_at)) as stddev_hours
        ')->first();

        // Get processing time distribution
        $distribution = $processedRequests->selectRaw('
            CASE 
                WHEN TIMESTAMPDIFF(HOUR, created_at, processed_at) < 24 THEN "0-1 gün"
                WHEN TIMESTAMPDIFF(HOUR, created_at, processed_at) < 72 THEN "1-3 gün"
                WHEN TIMESTAMPDIFF(HOUR, created_at, processed_at) < 168 THEN "3-7 gün"
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
        $approverStats = ApprovalAction::whereIn('approval_request_id', $baseQuery->pluck('id'))
            ->join('users', 'approval_actions.approver_id', '=', 'users.id')
            ->selectRaw('
                users.id as approver_id,
                users.name as approver_name,
                COUNT(*) as total_actions,
                SUM(CASE WHEN action_type = "approved" THEN 1 ELSE 0 END) as approved_count,
                SUM(CASE WHEN action_type = "rejected" THEN 1 ELSE 0 END) as rejected_count,
                AVG(TIMESTAMPDIFF(HOUR, approval_actions.created_at, approved_at)) as avg_response_hours
            ')
            ->groupBy('users.id', 'users.name')
            ->get()
            ->map(function ($item) {
                $item->approval_rate = $item->total_actions > 0 
                    ? round(($item->approved_count / $item->total_actions) * 100, 2) 
                    : 0;
                $item->avg_response_hours = round($item->avg_response_hours ?? 0, 2);
                return $item;
            });

        return $approverStats->toArray();
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
            DATE_FORMAT(created_at, "%Y-%m") as month,
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
                YEARWEEK(created_at) as week,
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
        // Find requests taking longer than average
        $longProcessingRequests = $baseQuery->where('current_status', 'pending')
            ->where('created_at', '<', Carbon::now()->subDays(3))
            ->with(['workflow', 'submitter'])
            ->orderBy('created_at')
            ->limit(10)
            ->get();

        // Find approvers with high pending counts
        $pendingByApprover = $baseQuery->where('current_status', 'pending')
            ->selectRaw('current_approver_role, COUNT(*) as pending_count')
            ->groupBy('current_approver_role')
            ->orderByDesc('pending_count')
            ->get();

        return [
            'long_processing_requests' => $longProcessingRequests->map(function ($request) {
                return [
                    'id' => $request->id,
                    'title' => $request->request_title,
                    'workflow_type' => $request->workflow->workflow_type,
                    'submitter' => $request->submitter->name,
                    'days_pending' => Carbon::parse($request->created_at)->diffInDays(now()),
                    'current_approver_role' => $request->current_approver_role
                ];
            }),
            'approver_bottlenecks' => $pendingByApprover->toArray()
        ];
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
        }
    }
}