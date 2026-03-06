<?php

namespace App\Http\Controllers;

use App\Services\NotificationService;
use App\Services\TaskAssignmentService;
use App\Services\TaskAuditService;
use App\Services\TaskPermissionService;
use App\Services\TaskStatisticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class BaseTaskController extends Controller
{
    protected TaskPermissionService $permissionService;
    protected TaskAssignmentService $assignmentService;
    protected TaskStatisticsService $statisticsService;
    protected NotificationService $notificationService;
    protected TaskAuditService $auditService;

    public function __construct(
        TaskPermissionService $permissionService,
        TaskAssignmentService $assignmentService,
        TaskStatisticsService $statisticsService,
        NotificationService $notificationService,
        TaskAuditService $auditService
    ) {
        $this->permissionService = $permissionService;
        $this->assignmentService = $assignmentService;
        $this->statisticsService = $statisticsService;
        $this->notificationService = $notificationService;
        $this->auditService = $auditService;
    }

    /**
     * Handle errors consistently across all task controllers
     */
    protected function handleError(\Exception $e, string $defaultMessage): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $defaultMessage,
            'error' => config('app.debug') ? $e->getMessage() : null,
        ], 500);
    }

    /**
     * Send task assignment notification to target users
     */
    protected function sendTaskAssignmentNotification($task, array $assignments, $creator): void
    {
        try {
            // Collect all assigned user IDs
            $assignedUserIds = [];

            foreach ($assignments as $assignment) {
                if (isset($assignment['assigned_user_id'])) {
                    $assignedUserIds[] = $assignment['assigned_user_id'];
                }
            }

            if (! empty($assignedUserIds)) {
                // Prepare notification data
                $notificationData = [
                    'creator_name' => $creator->name,
                    'creator_institution' => $creator->institution?->name ?? 'N/A',
                    'task_title' => $task->title ?? 'Yeni Tapşırıq',
                    'task_category' => $task->category ?? 'other',
                    'task_priority' => $task->priority ?? 'normal',
                    'description' => $task->description ?? '',
                    'due_date' => $task->deadline ? date('d.m.Y H:i', strtotime($task->deadline)) : null,
                    'target_institution' => $task->assignedInstitution?->name ?? '',
                    'action_url' => "/tasks/{$task->id}",
                ];

                $this->notificationService->sendTaskNotification(
                    $task,
                    'assigned',
                    $assignedUserIds,
                    $notificationData
                );
            }
        } catch (\Exception $e) {
            \Log::error('Failed to send task assignment notification', [
                'task_id' => $task->id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Apply filters to task query
     */
    protected function applyFilters($query, Request $request): void
    {
        if ($request->status) {
            $query->byStatus($request->status);
        }

        if ($request->priority) {
            $query->byPriority($request->priority);
        }

        if ($request->category) {
            $query->byCategory($request->category);
        }

        if ($request->assigned_to) {
            $query->assignedTo($request->assigned_to);
        }

        if ($request->created_by) {
            $query->createdBy($request->created_by);
        }

        if ($request->origin_scope) {
            $originScope = $request->origin_scope;
            $query->where(function ($q) use ($originScope) {
                // Filter by origin_scope field
                $q->where('origin_scope', $originScope);

                if ($originScope === 'region') {
                    // Also include tasks with target_scope = 'regional'
                    $q->orWhere(function ($subQ) {
                        $subQ->whereNull('origin_scope')
                            ->where('target_scope', 'regional');
                    });
                    // Also include tasks where target_roles contains 'regionoperator'
                    $q->orWhereJsonContains('target_roles', 'regionoperator');
                    // Also include tasks with assignments for current user (specific tasks)
                    $q->orWhereHas('assignments', function ($assignmentQuery) {
                        $assignmentQuery->where('assigned_user_id', auth()->id());
                    });
                }

                if ($originScope === 'sector') {
                    // Also include tasks with target_scope = 'sector' or 'sectoral'
                    $q->orWhere(function ($subQ) {
                        $subQ->whereNull('origin_scope')
                            ->whereIn('target_scope', ['sector', 'sectoral']);
                    });
                    // Also include tasks where target_roles contains 'sektoradmin'
                    $q->orWhereJsonContains('target_roles', 'sektoradmin');
                    // Also include tasks with assignments for current user (specific tasks)
                    $q->orWhereHas('assignments', function ($assignmentQuery) {
                        $assignmentQuery->where('assigned_user_id', auth()->id());
                    });
                }
            });
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->deadline_filter) {
            switch ($request->deadline_filter) {
                case 'approaching':
                    $query->deadlineApproaching(3);
                    break;
                case 'overdue':
                    $query->overdue();
                    break;
            }
        }
    }

    /**
     * Append assignment context to task
     */
    protected function appendAssignmentContext($task, $user, ?int $institutionId)
    {
        $task->loadMissing([
            'assignments.assignedUser',
            'assignments.institution',
            'assignedInstitution',
        ]);

        $task->setAttribute(
            'user_assignment',
            $this->prepareUserAssignmentPayload($task, $user, $institutionId)
        );

        return $task;
    }

    /**
     * Prepare user assignment payload
     */
    protected function prepareUserAssignmentPayload($task, $user, ?int $institutionId): ?array
    {
        $assignment = $task->assignments->first(function ($assignment) use ($user) {
            return $assignment->assigned_user_id === $user->id;
        });

        if (! $assignment) {
            return null;
        }

        return [
            'id' => $assignment->id,
            'status' => $assignment->assignment_status,
            'progress' => $assignment->progress,
            'due_date' => optional($assignment->due_date)?->toISOString(),
            'completion_notes' => $assignment->completion_notes,
            'completion_data' => $assignment->completion_data,
            'institution' => $assignment->institution ? [
                'id' => $assignment->institution->id,
                'name' => $assignment->institution->name,
                'type' => $assignment->institution->type,
            ] : null,
            'can_update' => $this->permissionService->canUserUpdateAssignment($assignment, $user),
            'can_delegate' => $this->permissionService->canUserDelegateTask($task, $user),
            'allowed_transitions' => $this->assignmentService->getAllowedTransitions($assignment),
        ];
    }

    /**
     * Sync task status with active assignments
     * Ignores delegated and rejected assignments as they are terminal states
     */
    protected function syncTaskStatusWithAssignments($task): void
    {
        // Check for active (non-delegated, non-rejected) assignments
        $activeAssignment = $task->assignments()
            ->whereIn('assignment_status', ['in_progress', 'accepted'])
            ->first();

        if ($activeAssignment) {
            $newStatus = $activeAssignment->assignment_status === 'in_progress' ? 'in_progress' : 'pending';

            if ($task->status !== $newStatus) {
                $task->update(['status' => $newStatus]);
            }

            return;
        }

        // Check if there are pending assignments (e.g., after delegation)
        $pendingAssignment = $task->assignments()
            ->where('assignment_status', 'pending')
            ->first();

        if ($pendingAssignment && $task->status !== 'in_progress') {
            // Task stays in_progress when delegated (new pending assignments exist)
            $hasDelegated = $task->assignments()
                ->where('assignment_status', 'delegated')
                ->exists();

            if ($hasDelegated) {
                $task->update(['status' => 'in_progress']);
            }
        }
    }
}
