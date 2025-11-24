<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\TaskProgressLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TaskAssignmentService extends BaseService
{
    protected TaskPermissionService $permissionService;

    protected NotificationService $notificationService;

    public function __construct(TaskPermissionService $permissionService, NotificationService $notificationService)
    {
        $this->permissionService = $permissionService;
        $this->notificationService = $notificationService;
    }

    /**
     * Create hierarchical task assignments
     */
    public function createHierarchicalTask(array $data, $user): array
    {
        if (! $this->permissionService->canCreateHierarchicalTask($user)) {
            throw new \Exception('İerarxik tapşırıq yaratmaq icazəniz yoxdur');
        }

        return DB::transaction(function () use ($data, $user) {
            $targetInstitutions = $this->getTargetInstitutions($data, $user);
            if ($targetInstitutions->isEmpty()) {
                throw new \Exception('Hədəf müəssisə tapılmadı və ya icazə yoxdur');
            }

            $targetInstitutionIds = $targetInstitutions->pluck('id')->values()->all();

            $selectedUserIds = collect($data['assigned_user_ids'] ?? ($data['assignment_data']['selected_user_ids'] ?? []))
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all();

            $task = Task::create([
                'title' => $data['title'],
                'description' => $data['description'],
                'category' => $data['category'],
                'priority' => $data['priority'] ?? 'medium',
                'deadline' => $data['deadline'] ?? null,
                'created_by' => $user->id,
                'assigned_to' => ! empty($selectedUserIds)
                    ? $selectedUserIds[0]
                    : ($data['assigned_to'] ?? null),
                'assigned_institution_id' => $data['target_institution_id'] ?? null,
                'target_institutions' => $targetInstitutionIds,
                'target_departments' => $data['target_departments'] ?? null,
                'target_roles' => $this->normalizeStringArray($data['target_roles'] ?? []),
                'target_scope' => $data['target_scope'] ?? 'specific',
                'origin_scope' => $this->determineOriginScope($user, $data['target_scope'] ?? null),
                'notes' => $data['notes'] ?? null,
                'requires_approval' => (bool) ($data['requires_approval'] ?? false),
                'status' => 'pending',
                'progress' => 0,
            ]);

            $assignments = [];

            foreach ($targetInstitutions as $institution) {
                $assignmentResult = $this->createInstitutionalAssignments(
                    $task,
                    $institution,
                    $data,
                    $user,
                    $selectedUserIds
                );
                $assignments = array_merge($assignments, $assignmentResult);
            }

            $this->updateTaskProgressFromAssignments($task->fresh('assignments'));

            return [
                'task' => $task->fresh(['assignments.assignedUser', 'assignments.institution']),
                'assignments' => $assignments,
                'statistics' => [
                    'institutions_targeted' => $targetInstitutions->count(),
                    'assignments_created' => count($assignments),
                    'users_assigned' => collect($assignments)->pluck('assigned_user_id')->filter()->unique()->count(),
                ],
            ];
        });
    }

    /**
     * Determine task origin scope from user role or explicit target scope
     */
    private function determineOriginScope($user, ?string $targetScope): ?string
    {
        if ($targetScope === 'regional') {
            return 'region';
        }

        if (in_array($targetScope, ['sector', 'sectoral'])) {
            return 'sector';
        }

        if ($user->hasRole('regionadmin')) {
            return 'region';
        }

        if ($user->hasRole('sektoradmin')) {
            return 'sector';
        }

        return null;
    }

    /**
     * Get task assignments with filtering
     */
    public function getTaskAssignments($taskId, $user, array $filters = []): array
    {
        $task = Task::findOrFail($taskId);

        if (! $this->permissionService->canUserAccessTask($task, $user)) {
            throw new \Exception('Bu tapşırığa giriş icazəniz yoxdur');
        }

        $query = TaskAssignment::with(['assignedUser', 'institution', 'task'])
            ->where('task_id', $taskId);

        // Apply permission-based filtering
        $this->permissionService->applyAssignmentAccessControl($query, $user);

        // Apply additional filters
        if (! empty($filters['status'])) {
            if (is_array($filters['status'])) {
                $query->whereIn('assignment_status', $filters['status']);
            } else {
                $query->where('assignment_status', $filters['status']);
            }
        }

        if (! empty($filters['institution_id'])) {
            $query->where('institution_id', $filters['institution_id']);
        }

        if (! empty($filters['assigned_to'])) {
            $query->where('assigned_user_id', $filters['assigned_to']);
        }

        if (! empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        $assignments = $query->orderBy('created_at', 'desc')->get();

        return [
            'task' => [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'status' => $task->status,
                'progress' => $task->progress,
            ],
            'assignments' => $assignments->map(function ($assignment) {
                return $this->transformAssignmentData($assignment);
            }),
            'summary' => $this->getAssignmentsSummary($assignments),
        ];
    }

    /**
     * Update assignment status with progress tracking
     */
    public function updateAssignmentStatus(int $assignmentId, array $data, $user): TaskAssignment
    {
        return DB::transaction(function () use ($assignmentId, $data, $user) {
            $assignment = TaskAssignment::with(['task', 'assignedUser', 'institution'])->findOrFail($assignmentId);

            if (! $this->permissionService->canUserUpdateAssignment($assignment, $user)) {
                throw new \Exception('Bu tapşırıq təyinatını yeniləmək icazəniz yoxdur');
            }

            $oldStatus = $assignment->assignment_status;
            $newStatus = $data['status'];

            // Validate status transition
            $this->validateStatusTransition($assignment, $oldStatus, $newStatus);

            $desiredProgress = array_key_exists('progress', $data)
                ? (int) $data['progress']
                : ($newStatus === 'completed'
                    ? 100
                    : ($assignment->progress ?? ($newStatus === 'in_progress' ? 25 : 0)));

            // Update assignment
            $assignment->update([
                'assignment_status' => $newStatus,
                'progress' => $desiredProgress,
                'completion_notes' => $data['completion_notes'] ?? $assignment->completion_notes,
                'completion_data' => $data['completion_data'] ?? $assignment->completion_data,
                'completed_at' => $newStatus === 'completed' ? now() : $assignment->completed_at,
                'updated_by' => $user->id,
            ]);

            // Log progress change
            $this->logProgressChange(
                $assignment,
                $oldStatus,
                $newStatus,
                $user,
                $data['completion_notes'] ?? null
            );

            // Update parent task progress
            $this->updateTaskProgressFromAssignments($assignment->task->fresh('assignments'));

            // Send notifications if needed
            if ($newStatus === 'completed' && $assignment->task->created_by !== $user->id) {
                $this->notifyTaskCompletion($assignment, $user);
            }

            return $assignment->fresh(['task', 'assignedUser', 'institution']);
        });
    }

    /**
     * Get task progress overview
     */
    public function getTaskProgress(int $taskId, $user): array
    {
        $task = Task::with(['assignments.assignedUser', 'assignments.institution'])
            ->findOrFail($taskId);

        if (! $this->permissionService->canUserAccessTask($task, $user)) {
            throw new \Exception('Bu tapşırığa giriş icazəniz yoxdur');
        }

        $assignments = $task->assignments;
        $totalAssignments = $assignments->count();

        if ($totalAssignments === 0) {
            return [
                'task_id' => $taskId,
                'overall_progress' => 0,
                'status_breakdown' => [],
                'institutional_progress' => [],
                'timeline' => [],
            ];
        }

        // Calculate status breakdown
        $statusBreakdown = $assignments->groupBy('assignment_status')->map(function ($group) use ($totalAssignments) {
            return [
                'count' => $group->count(),
                'percentage' => round(($group->count() / $totalAssignments) * 100, 2),
            ];
        });

        // Calculate institutional progress
        $institutionalProgress = $assignments->groupBy('institution_id')->map(function ($group) {
            $total = $group->count();
            $completed = $group->where('assignment_status', 'completed')->count();
            $inProgress = $group->where('assignment_status', 'in_progress')->count();

            return [
                'institution' => [
                    'id' => $group->first()->institution->id,
                    'name' => $group->first()->institution->name,
                ],
                'total_assignments' => $total,
                'completed' => $completed,
                'in_progress' => $inProgress,
                'pending' => $total - $completed - $inProgress,
                'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 2) : 0,
            ];
        });

        // Calculate overall progress
        $overallProgress = $this->calculateTaskProgress($task);

        // Generate timeline
        $timeline = $this->generateProgressTimeline($task);

        return [
            'task_id' => $taskId,
            'overall_progress' => $overallProgress,
            'status_breakdown' => $statusBreakdown,
            'institutional_progress' => $institutionalProgress->values(),
            'timeline' => $timeline,
            'estimated_completion' => $this->estimateCompletionDate($task),
            'bottlenecks' => $this->identifyBottlenecks($assignments),
        ];
    }

    /**
     * Bulk update assignment statuses
     */
    public function bulkUpdateAssignments(array $assignmentIds, array $data, $user): array
    {
        if (! $this->permissionService->canPerformBulkOperations($user)) {
            throw new \Exception('Kütləvi əməliyyat icazəniz yoxdur');
        }

        $results = [
            'updated' => [],
            'failed' => [],
            'summary' => [
                'total' => count($assignmentIds),
                'success' => 0,
                'failed' => 0,
            ],
        ];

        DB::transaction(function () use ($assignmentIds, $data, $user, &$results) {
            foreach ($assignmentIds as $assignmentId) {
                try {
                    $assignment = $this->updateAssignmentStatus($assignmentId, $data, $user);
                    $results['updated'][] = $assignment;
                    $results['summary']['success']++;
                } catch (\Exception $e) {
                    $results['failed'][] = [
                        'assignment_id' => $assignmentId,
                        'error' => $e->getMessage(),
                    ];
                    $results['summary']['failed']++;
                }
            }
        });

        // Add top-level fields for backward compatibility with tests
        $results['successful'] = $results['summary']['success'];
        $results['failed_count'] = $results['summary']['failed'];

        return $results;
    }

    /**
     * Create assignments for specific institution
     */
    private function createInstitutionalAssignments(Task $task, Institution $institution, array $data, $user, array $selectedUserIds = []): array
    {
        $assignments = [];
        $targetRole = $data['target_role'] ?? 'schooladmin';
        $assignmentNotes = $data['assignment_notes'] ?? null;
        $assignmentMetadata = $data['assignment_data'] ?? null;
        $dueDate = $data['deadline'] ?? null;
        $priority = $data['priority'] ?? 'medium';

        $targetUsers = collect();

        if (! empty($selectedUserIds)) {
            $targetUsers = User::whereIn('id', $selectedUserIds)
                ->where('is_active', true)
                ->with('roles')
                ->get();
        }

        if ($targetUsers->isEmpty()) {
            // Get users with target role in this institution
            $targetUsers = User::whereHas('roles', function ($q) use ($targetRole) {
                $q->where('name', $targetRole);
            })
                ->where('institution_id', $institution->id)
                ->where('is_active', true)
                ->with('roles')
                ->get();
        }

        if ($targetUsers->isEmpty()) {
            $assignments[] = TaskAssignment::create([
                'task_id' => $task->id,
                'institution_id' => $institution->id,
                'assigned_role' => $targetRole,
                'priority' => $priority,
                'progress' => 0,
                'due_date' => $dueDate,
                'assignment_notes' => $assignmentNotes,
                'assignment_metadata' => $assignmentMetadata,
                'assignment_status' => 'pending',
            ]);

            return $assignments;
        }

        foreach ($targetUsers as $targetUser) {
            // Ensure user has an allowed management role when manually selected
            $roleName = $targetUser->roles->first()?->name;
            if (! empty($selectedUserIds) && ! in_array($roleName, ['regionadmin', 'regionoperator', 'sektoradmin'])) {
                continue;
            }

            $assignments[] = TaskAssignment::create([
                'task_id' => $task->id,
                'institution_id' => $institution->id,
                'assigned_role' => ! empty($selectedUserIds) ? ($roleName ?? $targetRole) : $targetRole,
                'assigned_user_id' => $targetUser->id,
                'priority' => $priority,
                'progress' => 0,
                'due_date' => $dueDate,
                'assignment_notes' => $assignmentNotes,
                'assignment_metadata' => array_merge(
                    is_array($assignmentMetadata) ? $assignmentMetadata : [],
                    ! empty($selectedUserIds) ? ['selected_by_creator' => true] : []
                ),
                'assignment_status' => 'pending',
            ]);
        }

        return $assignments;
    }

    /**
     * Get target institutions for assignment
     */
    private function getTargetInstitutions(array $data, $user)
    {
        if (! empty($data['specific_institutions'])) {
            // Specific institutions provided
            $institutionIds = $data['specific_institutions'];
        } else {
            // Get all institutions in user's scope
            $scopeIds = $this->permissionService->getUserInstitutionScope($user);
            $institutionIds = $scopeIds;
        }

        // Filter by institution type/level if specified
        $query = Institution::whereIn('id', $institutionIds)->where('is_active', true);

        if (! empty($data['target_institution_type'])) {
            $query->where('type', $data['target_institution_type']);
        }

        if (! empty($data['target_institution_level'])) {
            $query->where('level', $data['target_institution_level']);
        }

        return $query->get();
    }

    /**
     * Calculate task progress from assignments
     */
    private function calculateTaskProgress(Task $task): float
    {
        $assignments = $task->assignments;

        if ($assignments->isEmpty()) {
            return 0.0;
        }

        $totalWeight = 0;
        $completedWeight = 0;

        foreach ($assignments as $assignment) {
            $weight = 1; // Default weight, could be customized
            $totalWeight += $weight;

            if ($assignment->assignment_status === 'completed') {
                $completedWeight += $weight;
            } elseif ($assignment->assignment_status === 'in_progress') {
                $completedWeight += ($weight * ($assignment->progress ?? 50) / 100);
            }
        }

        return $totalWeight > 0 ? round(($completedWeight / $totalWeight) * 100, 2) : 0;
    }

    /**
     * Update task progress from assignments
     */
    public function updateTaskProgressFromAssignments(Task $task): void
    {
        $progress = $this->calculateTaskProgress($task);

        $newStatus = $task->status;
        if ($progress >= 100) {
            // When all assignments are completed, task goes to 'review' status
            // awaiting creator's final approval
            $newStatus = 'review';
        } elseif ($progress > 0) {
            $newStatus = 'in_progress';
        }

        $task->update([
            'progress' => $progress,
            'status' => $newStatus,
            'completed_at' => $newStatus === 'completed' ? now() : null,
        ]);
    }

    /**
     * Validate status transition
     */
    private function validateStatusTransition(TaskAssignment $assignment, string $oldStatus, string $newStatus): void
    {
        $validTransitions = $this->getStatusTransitionMap();

        if (! isset($validTransitions[$oldStatus]) ||
            ! in_array($newStatus, $validTransitions[$oldStatus])) {
            throw new \Exception("Status dəyişikliyi mümkün deyil: {$oldStatus} -> {$newStatus}");
        }
    }

    /**
     * Public helper for controllers/transformers
     */
    public function getAllowedTransitions(TaskAssignment $assignment): array
    {
        $transitions = $this->getStatusTransitionMap();

        return $transitions[$assignment->assignment_status] ?? [];
    }

    private function getStatusTransitionMap(): array
    {
        return [
            'pending' => ['in_progress', 'completed', 'cancelled'],
            'in_progress' => ['completed', 'cancelled', 'pending'],
            'completed' => ['in_progress'], // Allow reopening
            'cancelled' => ['pending', 'in_progress'],
        ];
    }

    /**
     * Transform assignment data for API response
     */
    private function transformAssignmentData(TaskAssignment $assignment): array
    {
        return [
            'id' => $assignment->id,
            'task_id' => $assignment->task_id,
            'institution' => [
                'id' => $assignment->institution->id,
                'name' => $assignment->institution->name,
                'type' => $assignment->institution->type,
            ],
            'assigned_user' => $assignment->assignedUser ? [
                'id' => $assignment->assignedUser->id,
                'name' => $assignment->assignedUser->name,
                'email' => $assignment->assignedUser->email,
            ] : null,
            'assigned_role' => $assignment->assigned_role,
            'assigned_user_id' => $assignment->assigned_user_id,
            'status' => $assignment->assignment_status,
            'priority' => $assignment->priority,
            'progress' => $assignment->progress,
            'due_date' => $assignment->due_date,
            'assignment_notes' => $assignment->assignment_notes,
            'assignment_metadata' => $assignment->assignment_metadata,
            'completed_at' => $assignment->completed_at,
            'completion_notes' => $assignment->completion_notes,
            'created_at' => $assignment->created_at,
            'is_overdue' => $assignment->due_date && Carbon::parse($assignment->due_date)->isPast() && $assignment->assignment_status !== 'completed',
        ];
    }

    /**
     * Get assignments summary
     */
    private function getAssignmentsSummary($assignments): array
    {
        $total = $assignments->count();
        $statusCounts = $assignments->groupBy('assignment_status')->map->count();

        return [
            'total_assignments' => $total,
            'pending' => $statusCounts['pending'] ?? 0,
            'in_progress' => $statusCounts['in_progress'] ?? 0,
            'completed' => $statusCounts['completed'] ?? 0,
            'cancelled' => $statusCounts['cancelled'] ?? 0,
            'completion_rate' => $total > 0 ? round((($statusCounts['completed'] ?? 0) / $total) * 100, 2) : 0,
            'overdue_count' => $assignments->filter(function ($assignment) {
                return $assignment->due_date &&
                       Carbon::parse($assignment->due_date)->isPast() &&
                       $assignment->assignment_status !== 'completed';
            })->count(),
        ];
    }

    /**
     * Additional helper methods would be implemented here
     */
    private function logProgressChange($assignment, $oldStatus, $newStatus, $user, ?string $notes = null): void
    {
        try {
            TaskProgressLog::create([
                'task_id' => $assignment->task_id,
                'updated_by' => $user->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'progress_percentage' => $assignment->progress ?? 0,
                'notes' => $notes,
            ]);
        } catch (\Exception $e) {
            Log::warning('Task progress log yazıla bilmədi', [
                'assignment_id' => $assignment->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function notifyTaskCompletion($assignment, $user): void
    {
        try {
            $task = $assignment->task?->fresh('creator');
            if (! $task || ! $task->creator) {
                return;
            }

            $this->notificationService->send([
                'title' => 'Tapşırıq tamamlandı',
                'message' => "{$user->name} \"{$task->title}\" tapşırığını tamamladı.",
                'type' => 'task_assignment_completed',
                'channel' => 'in_app',
                'user_id' => $task->created_by,
                'related_type' => Task::class,
                'related_id' => $task->id,
                'metadata' => [
                    'assignment_id' => $assignment->id,
                    'institution_id' => $assignment->institution_id,
                ],
            ]);
        } catch (\Exception $e) {
            Log::warning('Tapşırıq tamamlanma bildirişi göndərilə bilmədi', [
                'assignment_id' => $assignment->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function generateProgressTimeline($task): array
    {
        // Implementation for generating progress timeline
        return [];
    }

    private function estimateCompletionDate($task): ?string
    {
        // Implementation for estimating completion date
        return null;
    }

    private function identifyBottlenecks($assignments): array
    {
        // Implementation for identifying bottlenecks
        return [];
    }

    /**
     * Normalize array of string values (e.g. roles) to a consistent format.
     */
    private function normalizeStringArray($values): array
    {
        if (empty($values) || ! is_array($values)) {
            return [];
        }

        return collect($values)
            ->filter(fn ($value) => ! is_null($value) && $value !== '')
            ->map(function ($value) {
                return is_string($value) ? trim($value) : $value;
            })
            ->unique()
            ->values()
            ->all();
    }
}
