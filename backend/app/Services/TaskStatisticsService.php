<?php

namespace App\Services;

use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\Institution;
use App\Models\User;
use App\Services\BaseService;
use App\Services\TaskPermissionService;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TaskStatisticsService extends BaseService
{
    protected $permissionService;

    public function __construct(TaskPermissionService $permissionService)
    {
        $this->permissionService = $permissionService;
    }

    /**
     * Get comprehensive task statistics
     */
    public function getTaskStatistics($user, array $filters = []): array
    {
        $dateFrom = $filters['date_from'] ?? Carbon::now()->subMonth();
        $dateTo = $filters['date_to'] ?? Carbon::now();

        return [
            'overview' => $this->getOverviewStatistics($user, $dateFrom, $dateTo),
            'status_breakdown' => $this->getStatusBreakdown($user, $dateFrom, $dateTo),
            'priority_analysis' => $this->getPriorityAnalysis($user, $dateFrom, $dateTo),
            'completion_trends' => $this->getCompletionTrends($user, $dateFrom, $dateTo),
            'institutional_performance' => $this->getInstitutionalPerformance($user, $filters),
            'user_performance' => $this->getUserPerformance($user, $filters),
            'overdue_analysis' => $this->getOverdueAnalysis($user),
            'type_distribution' => $this->getTaskTypeDistribution($user, $dateFrom, $dateTo),
            'assignment_metrics' => $this->getAssignmentMetrics($user, $dateFrom, $dateTo)
        ];
    }

    /**
     * Get overview statistics
     */
    private function getOverviewStatistics($user, Carbon $dateFrom, Carbon $dateTo): array
    {
        $baseQuery = Task::whereBetween('created_at', [$dateFrom, $dateTo]);
        $this->permissionService->applyTaskAccessControl($baseQuery, $user);

        $totalTasks = $baseQuery->count();
        $completedTasks = $baseQuery->where('status', 'completed')->count();
        $inProgressTasks = $baseQuery->where('status', 'in_progress')->count();
        $pendingTasks = $baseQuery->where('status', 'pending')->count();

        // Calculate completion rate
        $completionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 2) : 0;

        // Get average completion time
        $avgCompletionTime = $this->calculateAverageCompletionTime($user, $dateFrom, $dateTo);

        // Compare with previous period
        $previousPeriod = $dateFrom->diffInDays($dateTo);
        $prevDateFrom = $dateFrom->copy()->subDays($previousPeriod);
        $prevDateTo = $dateFrom->copy();

        $prevQuery = Task::whereBetween('created_at', [$prevDateFrom, $prevDateTo]);
        $this->permissionService->applyTaskAccessControl($prevQuery, $user);
        $prevTotal = $prevQuery->count();

        return [
            'total_tasks' => $totalTasks,
            'completed_tasks' => $completedTasks,
            'in_progress_tasks' => $inProgressTasks,
            'pending_tasks' => $pendingTasks,
            'completion_rate' => $completionRate,
            'average_completion_days' => $avgCompletionTime,
            'trend' => [
                'tasks_change' => $this->calculatePercentageChange($totalTasks, $prevTotal),
                'period_comparison' => [
                    'current_period' => $totalTasks,
                    'previous_period' => $prevTotal
                ]
            ]
        ];
    }

    /**
     * Get status breakdown with detailed metrics
     */
    private function getStatusBreakdown($user, Carbon $dateFrom, Carbon $dateTo): array
    {
        $baseQuery = Task::whereBetween('created_at', [$dateFrom, $dateTo]);
        $this->permissionService->applyTaskAccessControl($baseQuery, $user);

        $statusCounts = $baseQuery->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $total = array_sum($statusCounts);

        $breakdown = [];
        $statuses = ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'];

        foreach ($statuses as $status) {
            $count = $statusCounts[$status] ?? 0;
            $breakdown[$status] = [
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 2) : 0
            ];
        }

        // Add overdue tasks (not a real status, but calculated)
        $overdueCount = Task::where('deadline', '<', now())
            ->whereNotIn('status', ['completed', 'cancelled']);
        $this->permissionService->applyTaskAccessControl($overdueCount, $user);
        $overdueCount = $overdueCount->count();

        $breakdown['overdue'] = [
            'count' => $overdueCount,
            'percentage' => $total > 0 ? round(($overdueCount / $total) * 100, 2) : 0
        ];

        return $breakdown;
    }

    /**
     * Get priority analysis
     */
    private function getPriorityAnalysis($user, Carbon $dateFrom, Carbon $dateTo): array
    {
        $baseQuery = Task::whereBetween('created_at', [$dateFrom, $dateTo]);
        $this->permissionService->applyTaskAccessControl($baseQuery, $user);

        return $baseQuery->selectRaw('
            priority,
            COUNT(*) as total,
            SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed,
            AVG(CASE WHEN status = "completed" AND completed_at IS NOT NULL 
                THEN TIMESTAMPDIFF(DAY, created_at, completed_at) 
                ELSE NULL END) as avg_completion_days
        ')
        ->groupBy('priority')
        ->get()
        ->map(function ($item) {
            return [
                'priority' => $item->priority,
                'total' => $item->total,
                'completed' => $item->completed,
                'completion_rate' => $item->total > 0 ? round(($item->completed / $item->total) * 100, 2) : 0,
                'avg_completion_days' => round($item->avg_completion_days ?? 0, 1)
            ];
        })
        ->keyBy('priority')
        ->toArray();
    }

    /**
     * Get completion trends over time
     */
    private function getCompletionTrends($user, Carbon $dateFrom, Carbon $dateTo): array
    {
        $periodDays = $dateFrom->diffInDays($dateTo);
        $groupBy = $periodDays > 30 ? 'week' : 'day';
        $dateFormat = $groupBy === 'week' ? '%Y-%u' : '%Y-%m-%d';

        $baseQuery = Task::whereBetween('created_at', [$dateFrom, $dateTo]);
        $this->permissionService->applyTaskAccessControl($baseQuery, $user);

        $creationTrends = $baseQuery->selectRaw("
            DATE_FORMAT(created_at, '{$dateFormat}') as period,
            COUNT(*) as created
        ")
        ->groupBy('period')
        ->orderBy('period')
        ->pluck('created', 'period')
        ->toArray();

        $completionQuery = Task::whereBetween('completed_at', [$dateFrom, $dateTo])
            ->where('status', 'completed');
        $this->permissionService->applyTaskAccessControl($completionQuery, $user);

        $completionTrends = $completionQuery->selectRaw("
            DATE_FORMAT(completed_at, '{$dateFormat}') as period,
            COUNT(*) as completed
        ")
        ->groupBy('period')
        ->orderBy('period')
        ->pluck('completed', 'period')
        ->toArray();

        return [
            'period_type' => $groupBy,
            'creation_trends' => $creationTrends,
            'completion_trends' => $completionTrends,
            'combined_trends' => $this->combineTimelineData([$creationTrends, $completionTrends])
        ];
    }

    /**
     * Get institutional performance metrics
     */
    private function getInstitutionalPerformance($user, array $filters): array
    {
        $targetableInstitutions = $this->permissionService->getTargetableInstitutions($user);
        $institutionIds = collect($targetableInstitutions)->pluck('id')->toArray();

        if (empty($institutionIds)) {
            return [];
        }

        $query = Task::whereIn('assigned_institution_id', $institutionIds);

        // Apply date filter if provided
        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to']);
        }

        $institutionalStats = $query->selectRaw('
            assigned_institution_id,
            COUNT(*) as total_tasks,
            SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed_tasks,
            SUM(CASE WHEN status = "in_progress" THEN 1 ELSE 0 END) as in_progress_tasks,
            SUM(CASE WHEN deadline < NOW() AND status NOT IN ("completed", "cancelled") THEN 1 ELSE 0 END) as overdue_tasks,
            AVG(progress) as avg_progress
        ')
        ->groupBy('assigned_institution_id')
        ->get();

        return $institutionalStats->map(function ($stat) use ($targetableInstitutions) {
            $institution = collect($targetableInstitutions)->firstWhere('id', $stat->assigned_institution_id);
            
            return [
                'institution' => [
                    'id' => $stat->assigned_institution_id,
                    'name' => $institution['name'] ?? 'N/A',
                    'type' => $institution['type'] ?? 'N/A',
                    'level' => $institution['level'] ?? 0
                ],
                'metrics' => [
                    'total_tasks' => $stat->total_tasks,
                    'completed_tasks' => $stat->completed_tasks,
                    'in_progress_tasks' => $stat->in_progress_tasks,
                    'overdue_tasks' => $stat->overdue_tasks,
                    'completion_rate' => $stat->total_tasks > 0 ? 
                        round(($stat->completed_tasks / $stat->total_tasks) * 100, 2) : 0,
                    'average_progress' => round($stat->avg_progress ?? 0, 2),
                    'performance_score' => $this->calculateInstitutionPerformanceScore($stat)
                ]
            ];
        })
        ->sortByDesc('metrics.performance_score')
        ->values()
        ->toArray();
    }

    /**
     * Get user performance metrics
     */
    private function getUserPerformance($user, array $filters): array
    {
        if (!$user->hasAnyRole(['superadmin', 'regionadmin', 'sektoradmin'])) {
            return [];
        }

        $scopeIds = $this->permissionService->getUserInstitutionScope($user);
        
        $query = TaskAssignment::whereHas('task', function($q) use ($scopeIds) {
            $q->whereIn('assigned_institution_id', $scopeIds);
        })
        ->whereNotNull('assigned_user_id');

        // Apply date filter
        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to']);
        }

        $userStats = $query->selectRaw('
            assigned_user_id,
            COUNT(*) as total_assignments,
            SUM(CASE WHEN assignment_status = "completed" THEN 1 ELSE 0 END) as completed_assignments,
            SUM(CASE WHEN due_date < NOW() AND assignment_status NOT IN ("completed", "cancelled") THEN 1 ELSE 0 END) as overdue_assignments,
            AVG(progress) as avg_progress
        ')
        ->groupBy('assigned_user_id')
        ->having('total_assignments', '>', 0)
        ->get();

        return $userStats->map(function ($stat) {
            $assignedUser = User::find($stat->assigned_user_id);
            
            return [
                'user' => [
                    'id' => $stat->assigned_user_id,
                    'name' => $assignedUser->name ?? 'N/A',
                    'email' => $assignedUser->email ?? 'N/A',
                    'institution' => $assignedUser->institution?->name ?? 'N/A'
                ],
                'metrics' => [
                    'total_assignments' => $stat->total_assignments,
                    'completed_assignments' => $stat->completed_assignments,
                    'overdue_assignments' => $stat->overdue_assignments,
                    'completion_rate' => $stat->total_assignments > 0 ? 
                        round(($stat->completed_assignments / $stat->total_assignments) * 100, 2) : 0,
                    'average_progress' => round($stat->avg_progress ?? 0, 2),
                    'reliability_score' => $this->calculateUserReliabilityScore($stat)
                ]
            ];
        })
        ->sortByDesc('metrics.reliability_score')
        ->values()
        ->take(20)
        ->toArray();
    }

    /**
     * Get overdue analysis
     */
    private function getOverdueAnalysis($user): array
    {
        $overdueQuery = Task::where('deadline', '<', now())
            ->whereNotIn('status', ['completed', 'cancelled']);
        $this->permissionService->applyTaskAccessControl($overdueQuery, $user);

        $overdueCount = $overdueQuery->count();
        
        $overdueByPriority = $overdueQuery->selectRaw('priority, COUNT(*) as count')
            ->groupBy('priority')
            ->pluck('count', 'priority')
            ->toArray();

        $overdueByDays = $overdueQuery->selectRaw('
            CASE 
                WHEN TIMESTAMPDIFF(DAY, deadline, NOW()) <= 7 THEN "1-7 days"
                WHEN TIMESTAMPDIFF(DAY, deadline, NOW()) <= 30 THEN "8-30 days"
                WHEN TIMESTAMPDIFF(DAY, deadline, NOW()) <= 90 THEN "31-90 days"
                ELSE "90+ days"
            END as overdue_period,
            COUNT(*) as count
        ')
        ->groupBy('overdue_period')
        ->pluck('count', 'overdue_period')
        ->toArray();

        return [
            'total_overdue' => $overdueCount,
            'by_priority' => $overdueByPriority,
            'by_overdue_period' => $overdueByDays,
            'critical_overdue' => $overdueQuery->where('priority', 'high')->count()
        ];
    }

    /**
     * Get task type distribution
     */
    private function getTaskTypeDistribution($user, Carbon $dateFrom, Carbon $dateTo): array
    {
        $baseQuery = Task::whereBetween('created_at', [$dateFrom, $dateTo]);
        $this->permissionService->applyTaskAccessControl($baseQuery, $user);

        return $baseQuery->selectRaw('
            category,
            COUNT(*) as count,
            SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed,
            AVG(progress) as avg_progress
        ')
        ->groupBy('category')
        ->get()
        ->map(function ($item) {
            return [
                'type' => $item->category,
                'count' => $item->count,
                'completed' => $item->completed,
                'completion_rate' => $item->count > 0 ? round(($item->completed / $item->count) * 100, 2) : 0,
                'avg_progress' => round($item->avg_progress ?? 0, 2)
            ];
        })
        ->keyBy('type')
        ->toArray();
    }

    /**
     * Get assignment metrics
     */
    private function getAssignmentMetrics($user, Carbon $dateFrom, Carbon $dateTo): array
    {
        $assignmentQuery = TaskAssignment::whereBetween('created_at', [$dateFrom, $dateTo]);
        $this->permissionService->applyAssignmentAccessControl($assignmentQuery, $user);

        $totalAssignments = (clone $assignmentQuery)->count();
        $completedAssignments = (clone $assignmentQuery)->where('assignment_status', 'completed')->count();
        $overdueAssignments = (clone $assignmentQuery)->where('due_date', '<', now())
            ->whereNotIn('assignment_status', ['completed', 'cancelled'])
            ->count();

        return [
            'total_assignments' => $totalAssignments,
            'completed_assignments' => $completedAssignments,
            'overdue_assignments' => $overdueAssignments,
            'completion_rate' => $totalAssignments > 0 ? 
                round(($completedAssignments / $totalAssignments) * 100, 2) : 0,
            'average_assignments_per_task' => $this->calculateAverageAssignmentsPerTask($user, $dateFrom, $dateTo)
        ];
    }

    /**
     * Calculate average completion time
     */
    private function calculateAverageCompletionTime($user, Carbon $dateFrom, Carbon $dateTo): float
    {
        $completedQuery = Task::whereBetween('completed_at', [$dateFrom, $dateTo])
            ->where('status', 'completed')
            ->whereNotNull('completed_at');
        
        $this->permissionService->applyTaskAccessControl($completedQuery, $user);

        $avgDays = $completedQuery->selectRaw('AVG(TIMESTAMPDIFF(DAY, created_at, completed_at)) as avg_days')
            ->value('avg_days');

        return round($avgDays ?? 0, 1);
    }

    /**
     * Calculate percentage change
     */
    private function calculatePercentageChange($current, $previous): float
    {
        if ($previous == 0) {
            return $current > 0 ? 100.0 : 0.0;
        }
        
        return round((($current - $previous) / $previous) * 100, 2);
    }

    /**
     * Combine timeline data from multiple arrays
     */
    private function combineTimelineData(array $timelines): array
    {
        $combined = [];
        
        foreach ($timelines as $timeline) {
            foreach ($timeline as $period => $value) {
                $combined[$period] = ($combined[$period] ?? 0) + $value;
            }
        }
        
        return $combined;
    }

    /**
     * Calculate institution performance score
     */
    private function calculateInstitutionPerformanceScore($stat): float
    {
        $completionRate = $stat->total_tasks > 0 ? ($stat->completed_tasks / $stat->total_tasks) * 100 : 0;
        $overdueRate = $stat->total_tasks > 0 ? ($stat->overdue_tasks / $stat->total_tasks) * 100 : 0;
        $progressScore = $stat->avg_progress ?? 0;

        // Weighted score calculation
        $score = (
            $completionRate * 0.5 + // 50% weight on completion rate
            (100 - $overdueRate) * 0.3 + // 30% weight on avoiding overdue (inverted)
            $progressScore * 0.2 // 20% weight on average progress
        );

        return round($score, 2);
    }

    /**
     * Calculate user reliability score
     */
    private function calculateUserReliabilityScore($stat): float
    {
        $completionRate = $stat->total_assignments > 0 ? ($stat->completed_assignments / $stat->total_assignments) * 100 : 0;
        $overdueRate = $stat->total_assignments > 0 ? ($stat->overdue_assignments / $stat->total_assignments) * 100 : 0;
        $progressScore = $stat->avg_progress ?? 0;

        // Weighted score calculation
        $score = (
            $completionRate * 0.6 + // 60% weight on completion rate
            (100 - $overdueRate) * 0.3 + // 30% weight on avoiding overdue
            $progressScore * 0.1 // 10% weight on average progress
        );

        return round($score, 2);
    }

    /**
     * Calculate average assignments per task
     */
    private function calculateAverageAssignmentsPerTask($user, Carbon $dateFrom, Carbon $dateTo): float
    {
        $taskQuery = Task::whereBetween('created_at', [$dateFrom, $dateTo]);
        $this->permissionService->applyTaskAccessControl($taskQuery, $user);

        $taskIds = $taskQuery->pluck('id');
        
        if ($taskIds->isEmpty()) {
            return 0;
        }

        $totalAssignments = TaskAssignment::whereIn('task_id', $taskIds)->count();
        
        return round($totalAssignments / $taskIds->count(), 2);
    }
}
