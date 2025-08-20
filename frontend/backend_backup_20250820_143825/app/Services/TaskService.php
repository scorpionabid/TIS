<?php

namespace App\Services;

use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\TaskComment;
use App\Models\TaskProgressLog;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Pagination\LengthAwarePaginator;
use Carbon\Carbon;

class TaskService extends BaseService
{
    protected $model = Task::class;

    /**
     * Get paginated tasks
     */
    public function getPaginatedTasks(array $filters = []): LengthAwarePaginator
    {
        $user = Auth::user();
        $query = Task::with(['creator', 'assignments.assignee'])
            ->where('institution_id', $user->institution_id);

        // Filter by user role and permissions
        if (!$user->hasAnyRole(['SuperAdmin', 'SchoolAdmin'])) {
            // Regular users can only see tasks assigned to them or created by them
            $query->where(function ($q) use ($user) {
                $q->where('creator_id', $user->id)
                  ->orWhereHas('assignments', function ($subQuery) use ($user) {
                      $subQuery->where('assignee_id', $user->id);
                  });
            });
        }

        // Apply filters
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('title', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('description', 'like', '%' . $filters['search'] . '%');
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (!empty($filters['creator_id'])) {
            $query->where('creator_id', $filters['creator_id']);
        }

        if (!empty($filters['assignee_id'])) {
            $query->whereHas('assignments', function ($q) use ($filters) {
                $q->where('assignee_id', $filters['assignee_id']);
            });
        }

        if (!empty($filters['due_date_from'])) {
            $query->whereDate('due_date', '>=', $filters['due_date_from']);
        }

        if (!empty($filters['due_date_to'])) {
            $query->whereDate('due_date', '<=', $filters['due_date_to']);
        }

        // Apply sorting
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDirection = $filters['sort_direction'] ?? 'desc';
        $query->orderBy($sortBy, $sortDirection);

        return $query->paginate($filters['per_page'] ?? 15);
    }

    /**
     * Create new task
     */
    public function createTask(array $data): Task
    {
        return DB::transaction(function () use ($data) {
            $task = Task::create([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'priority' => $data['priority'] ?? 'medium',
                'status' => 'pending',
                'category' => $data['category'] ?? 'general',
                'due_date' => $data['due_date'] ?? null,
                'estimated_hours' => $data['estimated_hours'] ?? null,
                'requires_approval' => $data['requires_approval'] ?? false,
                'creator_id' => Auth::id(),
                'institution_id' => Auth::user()->institution_id,
                'tags' => $data['tags'] ?? [],
                'metadata' => [
                    'created_by' => Auth::user()->username,
                    'created_at' => now()->format('Y-m-d H:i:s'),
                ],
            ]);

            // Create task assignments
            if (!empty($data['assignee_ids'])) {
                $this->assignTaskToUsers($task, $data['assignee_ids']);
            }

            // Log task creation
            $this->logTaskProgress($task, 'Task created', 'created');

            $this->logActivity('task_created', $task->id, [
                'title' => $task->title,
                'assignees_count' => count($data['assignee_ids'] ?? []),
            ]);

            return $task->load(['creator', 'assignments.assignee']);
        });
    }

    /**
     * Update task
     */
    public function updateTask(Task $task, array $data): Task
    {
        return DB::transaction(function () use ($task, $data) {
            $originalStatus = $task->status;
            
            $task->update([
                'title' => $data['title'] ?? $task->title,
                'description' => $data['description'] ?? $task->description,
                'priority' => $data['priority'] ?? $task->priority,
                'status' => $data['status'] ?? $task->status,
                'category' => $data['category'] ?? $task->category,
                'due_date' => $data['due_date'] ?? $task->due_date,
                'estimated_hours' => $data['estimated_hours'] ?? $task->estimated_hours,
                'completion_notes' => $data['completion_notes'] ?? $task->completion_notes,
                'tags' => $data['tags'] ?? $task->tags,
            ]);

            // Log status changes
            if (isset($data['status']) && $data['status'] !== $originalStatus) {
                $this->logTaskProgress($task, "Status changed from {$originalStatus} to {$data['status']}", $data['status']);
                
                if ($data['status'] === 'completed') {
                    $task->update(['completed_at' => now()]);
                }
            }

            // Update assignments if provided
            if (isset($data['assignee_ids'])) {
                $this->updateTaskAssignments($task, $data['assignee_ids']);
            }

            return $task->load(['creator', 'assignments.assignee']);
        });
    }

    /**
     * Update task status
     */
    public function updateTaskStatus(Task $task, string $status, ?string $note = null): Task
    {
        return DB::transaction(function () use ($task, $status, $note) {
            $oldStatus = $task->status;
            
            $task->update([
                'status' => $status,
                'completed_at' => $status === 'completed' ? now() : null,
            ]);

            // Update assignment status for current user
            $assignment = TaskAssignment::where('task_id', $task->id)
                ->where('assignee_id', Auth::id())
                ->first();
                
            if ($assignment) {
                $assignment->update([
                    'status' => $status,
                    'progress_note' => $note,
                    'last_updated_at' => now(),
                ]);
            }

            // Log progress
            $logMessage = $note ?? "Status updated from {$oldStatus} to {$status}";
            $this->logTaskProgress($task, $logMessage, $status);

            return $task->load(['assignments.assignee']);
        });
    }

    /**
     * Add comment to task
     */
    public function addTaskComment(Task $task, array $data): TaskComment
    {
        $comment = TaskComment::create([
            'task_id' => $task->id,
            'user_id' => Auth::id(),
            'content' => $data['content'],
            'comment_type' => $data['comment_type'] ?? 'general',
            'is_internal' => $data['is_internal'] ?? false,
        ]);

        $this->logTaskProgress($task, "Comment added: " . substr($data['content'], 0, 50) . '...', 'comment_added');

        return $comment->load('user');
    }

    /**
     * Bulk assign tasks
     */
    public function bulkAssignTasks(array $taskIds, array $assigneeIds, array $options = []): array
    {
        return DB::transaction(function () use ($taskIds, $assigneeIds, $options) {
            $successful = [];
            $failed = [];

            foreach ($taskIds as $taskId) {
                try {
                    $task = Task::findOrFail($taskId);
                    
                    // Update task if due date provided
                    if (!empty($options['due_date'])) {
                        $task->update(['due_date' => $options['due_date']]);
                    }

                    $this->assignTaskToUsers($task, $assigneeIds);
                    $successful[] = $taskId;
                } catch (\Exception $e) {
                    $failed[] = ['task_id' => $taskId, 'error' => $e->getMessage()];
                }
            }

            return [
                'assigned_count' => count($successful),
                'successful_assignments' => $successful,
                'failed_assignments' => $failed,
            ];
        });
    }

    /**
     * Get tasks assigned to current user
     */
    public function getMyTasks(array $filters = []): \Illuminate\Database\Eloquent\Collection
    {
        $userId = Auth::id();
        
        $query = Task::whereHas('assignments', function ($q) use ($userId) {
            $q->where('assignee_id', $userId);
        })->with(['creator', 'assignments' => function ($q) use ($userId) {
            $q->where('assignee_id', $userId);
        }]);

        // Apply filters
        if (!empty($filters['status'])) {
            $query->whereHas('assignments', function ($q) use ($filters, $userId) {
                $q->where('assignee_id', $userId)
                  ->where('status', $filters['status']);
            });
        }

        if (!empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        if (!empty($filters['overdue'])) {
            $query->where('due_date', '<', now())
                  ->where('status', '!=', 'completed');
        }

        return $query->orderBy('due_date')->get();
    }

    /**
     * Get task statistics
     */
    public function getTaskStatistics(): array
    {
        $user = Auth::user();
        $institutionId = $user->institution_id;
        
        $baseQuery = Task::where('institution_id', $institutionId);
        
        // If not admin, filter by user's tasks
        if (!$user->hasAnyRole(['SuperAdmin', 'SchoolAdmin'])) {
            $baseQuery->where(function ($q) use ($user) {
                $q->where('creator_id', $user->id)
                  ->orWhereHas('assignments', function ($subQuery) use ($user) {
                      $subQuery->where('assignee_id', $user->id);
                  });
            });
        }

        $totalTasks = $baseQuery->count();
        $completedTasks = $baseQuery->where('status', 'completed')->count();
        $inProgressTasks = $baseQuery->where('status', 'in_progress')->count();
        $pendingTasks = $baseQuery->where('status', 'pending')->count();
        $overdueTasks = $baseQuery->where('due_date', '<', now())
            ->where('status', '!=', 'completed')->count();

        // Calculate completion rate
        $completionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 2) : 0;

        // Average completion time (in days)
        $avgCompletionTime = Task::where('institution_id', $institutionId)
            ->where('status', 'completed')
            ->whereNotNull('completed_at')
            ->selectRaw('AVG(DATEDIFF(completed_at, created_at)) as avg_days')
            ->value('avg_days') ?? 0;

        // Priority distribution
        $priorityDistribution = $baseQuery
            ->selectRaw('priority, COUNT(*) as count')
            ->groupBy('priority')
            ->pluck('count', 'priority');

        // Category distribution
        $categoryDistribution = $baseQuery
            ->selectRaw('category, COUNT(*) as count')
            ->groupBy('category')
            ->pluck('count', 'category');

        return [
            'total_tasks' => $totalTasks,
            'completed_tasks' => $completedTasks,
            'in_progress_tasks' => $inProgressTasks,
            'pending_tasks' => $pendingTasks,
            'overdue_tasks' => $overdueTasks,
            'completion_rate' => $completionRate,
            'average_completion_time' => round($avgCompletionTime, 1),
            'priority_distribution' => $priorityDistribution,
            'category_distribution' => $categoryDistribution,
        ];
    }

    /**
     * Get task with all relationships
     */
    public function getTaskWithRelations(Task $task): Task
    {
        return $task->load([
            'creator:id,username,email',
            'assignments.assignee:id,username,email',
            'comments.user:id,username',
            'progressLogs' => function ($query) {
                $query->orderBy('created_at', 'desc')->limit(10);
            }
        ]);
    }

    /**
     * Get overdue tasks
     */
    public function getOverdueTasks(): \Illuminate\Database\Eloquent\Collection
    {
        return Task::with(['creator', 'assignments.assignee'])
            ->where('institution_id', Auth::user()->institution_id)
            ->where('due_date', '<', now())
            ->where('status', '!=', 'completed')
            ->orderBy('due_date')
            ->get();
    }

    /**
     * Get upcoming tasks (due in next 7 days)
     */
    public function getUpcomingTasks(int $days = 7): \Illuminate\Database\Eloquent\Collection
    {
        return Task::with(['creator', 'assignments.assignee'])
            ->where('institution_id', Auth::user()->institution_id)
            ->whereBetween('due_date', [now(), now()->addDays($days)])
            ->where('status', '!=', 'completed')
            ->orderBy('due_date')
            ->get();
    }

    /**
     * Assign task to users
     */
    private function assignTaskToUsers(Task $task, array $userIds): void
    {
        foreach ($userIds as $userId) {
            TaskAssignment::create([
                'task_id' => $task->id,
                'assignee_id' => $userId,
                'status' => 'assigned',
                'assigned_at' => now(),
                'assigned_by' => Auth::id(),
            ]);
        }

        // Send notifications to assignees
        $this->notifyAssignees($task, $userIds);
    }

    /**
     * Update task assignments
     */
    private function updateTaskAssignments(Task $task, array $userIds): void
    {
        // Remove old assignments
        TaskAssignment::where('task_id', $task->id)->delete();
        
        // Create new assignments
        $this->assignTaskToUsers($task, $userIds);
    }

    /**
     * Log task progress
     */
    private function logTaskProgress(Task $task, string $description, string $status): void
    {
        TaskProgressLog::create([
            'task_id' => $task->id,
            'user_id' => Auth::id(),
            'status' => $status,
            'description' => $description,
            'logged_at' => now(),
        ]);
    }

    /**
     * Send notifications to task assignees
     */
    private function notifyAssignees(Task $task, array $userIds): void
    {
        $users = User::whereIn('id', $userIds)->get();
        
        foreach ($users as $user) {
            // Send notification (implementation depends on your notification system)
            // Notification::send($user, new TaskAssignedNotification($task));
        }
    }

    /**
     * Format task for response
     */
    public function formatForResponse(Task $task): array
    {
        return [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'priority' => $task->priority,
            'status' => $task->status,
            'category' => $task->category,
            'due_date' => $task->due_date?->format('Y-m-d H:i'),
            'estimated_hours' => $task->estimated_hours,
            'completed_at' => $task->completed_at?->format('Y-m-d H:i'),
            'creator' => [
                'id' => $task->creator->id,
                'name' => $task->creator->username,
            ],
            'assignees_count' => $task->assignments_count ?? $task->assignments->count(),
            'comments_count' => $task->comments_count ?? $task->comments->count(),
            'tags' => $task->tags ?? [],
            'created_at' => $task->created_at->format('Y-m-d H:i'),
        ];
    }
}