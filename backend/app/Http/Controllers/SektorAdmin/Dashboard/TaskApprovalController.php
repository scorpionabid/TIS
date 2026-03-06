<?php

namespace App\Http\Controllers\SektorAdmin\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\Task;
use App\Models\TaskProgressLog;
use App\Services\TaskNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskApprovalController extends Controller
{
    /**
     * Get pending tasks for approval
     */
    public function getPendingTasks(Request $request): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (! $sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        // Get all schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        // Get pending tasks from schools in this sector that require approval
        $pendingTasks = Task::whereIn('id', function ($query) use ($schoolIds) {
            // Tasks that are either assigned to schools or target schools in this sector
            $query->select('id')->from('tasks')
                ->where(function ($q) use ($schoolIds) {
                    $q->whereIn('assigned_to_institution_id', $schoolIds)
                        ->orWhere(function ($subQ) use ($schoolIds) {
                            foreach ($schoolIds as $schoolId) {
                                $subQ->orWhereJsonContains('target_institutions', $schoolId);
                            }
                        });
                });
        })
            ->where('status', 'review')
            ->where('requires_approval', true)
            ->with([
                'creator:id,name,email',
                'assignedInstitution:id,name',
                'progressLogs' => function ($query) {
                    $query->latest()->limit(1);
                },
            ])
            ->orderBy('completed_at', 'desc')
            ->get()
            ->map(function ($task) {
                $latestLog = $task->progressLogs->first();

                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'category' => $task->category,
                    'category_label' => $task->category_label,
                    'priority' => $task->priority,
                    'priority_label' => $task->priority_label,
                    'status' => $task->status,
                    'status_label' => $task->status_label,
                    'progress' => $task->progress,
                    'deadline' => $task->deadline,
                    'completed_at' => $task->completed_at,
                    'created_by' => $task->creator->name ?? 'System',
                    'assigned_institution' => $task->assignedInstitution ? $task->assignedInstitution->name : 'Multiple Schools',
                    'target_institutions_count' => count($task->target_institutions ?? []),
                    'latest_notes' => $latestLog ? $latestLog->notes : null,
                    'is_overdue' => $task->isOverdue(),
                ];
            });

        return response()->json([
            'pending_tasks' => $pendingTasks,
            'total_count' => $pendingTasks->count(),
            'sector' => [
                'id' => $sector->id,
                'name' => $sector->name,
            ],
        ]);
    }

    /**
     * Get task details for review
     */
    public function getTaskDetails(Request $request, int $taskId): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (! $sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        // Get schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        $task = Task::where(function ($q) use ($schoolIds) {
            $q->whereIn('assigned_to_institution_id', $schoolIds)
                ->orWhere(function ($subQ) use ($schoolIds) {
                    foreach ($schoolIds as $schoolId) {
                        $subQ->orWhereJsonContains('target_institutions', $schoolId);
                    }
                });
        })
            ->with([
                'creator:id,name,email',
                'assignedInstitution:id,name',
                'progressLogs.updatedBy:id,name,email,institution_id',
                'progressLogs' => function ($query) {
                    $query->orderBy('created_at', 'desc');
                },
            ])
            ->find($taskId);

        if (! $task) {
            return response()->json(['error' => 'Task not found or not accessible'], 404);
        }

        // Get schools that completed this task
        $completedSchools = [];
        if ($task->target_institutions) {
            $completedSchools = Institution::whereIn('id', $task->target_institutions)
                ->get()
                ->map(function ($school) use ($task) {
                    $latestProgress = TaskProgressLog::where('task_id', $task->id)
                        ->whereHas('updatedBy', function ($q) use ($school) {
                            $q->where('institution_id', $school->id);
                        })
                        ->latest()
                        ->first();

                    return [
                        'id' => $school->id,
                        'name' => $school->name,
                        'status' => $latestProgress ? $latestProgress->new_status : 'pending',
                        'progress' => $latestProgress ? $latestProgress->progress_percentage : 0,
                        'notes' => $latestProgress ? $latestProgress->notes : null,
                        'updated_at' => $latestProgress ? $latestProgress->created_at : null,
                    ];
                });
        }

        return response()->json([
            'task' => [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'category' => $task->category,
                'category_label' => $task->category_label,
                'priority' => $task->priority,
                'priority_label' => $task->priority_label,
                'status' => $task->status,
                'status_label' => $task->status_label,
                'progress' => $task->progress,
                'deadline' => $task->deadline,
                'created_at' => $task->created_at,
                'started_at' => $task->started_at,
                'completed_at' => $task->completed_at,
                'created_by' => $task->creator->name ?? 'System',
                'requires_approval' => $task->requires_approval,
                'notes' => $task->notes,
                'attachments' => $task->attachments,
                'target_institutions' => $task->target_institutions,
                'is_overdue' => $task->isOverdue(),
            ],
            'progress_logs' => $task->progressLogs->map(function ($log) {
                return [
                    'id' => $log->id,
                    'old_status' => $log->old_status,
                    'new_status' => $log->new_status,
                    'progress_percentage' => $log->progress_percentage,
                    'notes' => $log->notes,
                    'updated_by' => $log->updatedBy->name ?? 'System',
                    'school' => $log->updatedBy->institution->name ?? 'Unknown',
                    'created_at' => $log->created_at,
                ];
            }),
            'completed_schools' => $completedSchools,
        ]);
    }

    /**
     * Approve task
     */
    public function approveTask(Request $request, int $taskId): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (! $sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        // Get schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        $task = Task::where(function ($q) use ($schoolIds) {
            $q->whereIn('assigned_to_institution_id', $schoolIds)
                ->orWhere(function ($subQ) use ($schoolIds) {
                    foreach ($schoolIds as $schoolId) {
                        $subQ->orWhereJsonContains('target_institutions', $schoolId);
                    }
                });
        })
            ->where('status', 'review')
            ->where('requires_approval', true)
            ->find($taskId);

        if (! $task) {
            return response()->json(['error' => 'Task not found or not accessible'], 404);
        }

        $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        // Approve the task
        $oldStatus = $task->status;
        $task->status = 'completed';
        $task->approved_by = $user->id;
        $task->approved_at = now();
        $task->save();

        // Log the approval
        TaskProgressLog::create([
            'task_id' => $task->id,
            'updated_by' => $user->id,
            'old_status' => $oldStatus,
            'new_status' => 'completed',
            'progress_percentage' => 100,
            'notes' => 'SektorAdmin tərəfindən təsdiqləndi' . ($request->notes ? ': ' . $request->notes : ''),
        ]);

        // Send approval notification
        $notificationService = app(TaskNotificationService::class);
        $notificationService->notifyTaskApprovalDecision($task, 'approved', $user, $request->notes);

        return response()->json([
            'message' => 'Task approved successfully',
            'task_id' => $task->id,
            'status' => $task->status,
            'approved_at' => $task->approved_at,
            'approved_by' => $user->name,
        ]);
    }

    /**
     * Reject task
     */
    public function rejectTask(Request $request, int $taskId): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (! $sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        $request->validate([
            'reason' => 'required|string|min:10|max:500',
        ]);

        // Get schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        $task = Task::where(function ($q) use ($schoolIds) {
            $q->whereIn('assigned_to_institution_id', $schoolIds)
                ->orWhere(function ($subQ) use ($schoolIds) {
                    foreach ($schoolIds as $schoolId) {
                        $subQ->orWhereJsonContains('target_institutions', $schoolId);
                    }
                });
        })
            ->where('status', 'review')
            ->where('requires_approval', true)
            ->find($taskId);

        if (! $task) {
            return response()->json(['error' => 'Task not found or not accessible'], 404);
        }

        // Reject the task - send back to in_progress for revision
        $oldStatus = $task->status;
        $task->status = 'in_progress';
        $task->save();

        // Log the rejection
        TaskProgressLog::create([
            'task_id' => $task->id,
            'updated_by' => $user->id,
            'old_status' => $oldStatus,
            'new_status' => 'in_progress',
            'progress_percentage' => $task->progress,
            'notes' => 'SektorAdmin tərəfindən rədd edildi - Səbəb: ' . $request->reason,
        ]);

        // Send rejection notification
        $notificationService = app(TaskNotificationService::class);
        $notificationService->notifyTaskApprovalDecision($task, 'rejected', $user, $request->reason);

        return response()->json([
            'message' => 'Task rejected and sent back for revision',
            'task_id' => $task->id,
            'status' => $task->status,
            'rejection_reason' => $request->reason,
        ]);
    }

    /**
     * Get task statistics for sector
     */
    public function getTaskStatistics(Request $request): JsonResponse
    {
        $user = Auth::user();
        $sector = $user->institution;

        if (! $sector) {
            return response()->json(['error' => 'User is not associated with a sector'], 400);
        }

        // Get all schools under this sector
        $schoolIds = Institution::where('parent_id', $sector->id)->pluck('id');

        // Get task statistics
        $stats = [
            'total_tasks' => Task::where(function ($q) use ($schoolIds) {
                $q->whereIn('assigned_to_institution_id', $schoolIds)
                    ->orWhere(function ($subQ) use ($schoolIds) {
                        foreach ($schoolIds as $schoolId) {
                            $subQ->orWhereJsonContains('target_institutions', $schoolId);
                        }
                    });
            })->count(),

            'pending_approval' => Task::where(function ($q) use ($schoolIds) {
                $q->whereIn('assigned_to_institution_id', $schoolIds)
                    ->orWhere(function ($subQ) use ($schoolIds) {
                        foreach ($schoolIds as $schoolId) {
                            $subQ->orWhereJsonContains('target_institutions', $schoolId);
                        }
                    });
            })->where('status', 'review')->where('requires_approval', true)->count(),

            'approved_tasks' => Task::where(function ($q) use ($schoolIds) {
                $q->whereIn('assigned_to_institution_id', $schoolIds)
                    ->orWhere(function ($subQ) use ($schoolIds) {
                        foreach ($schoolIds as $schoolId) {
                            $subQ->orWhereJsonContains('target_institutions', $schoolId);
                        }
                    });
            })->where('status', 'completed')->whereNotNull('approved_by')->count(),

            'in_progress_tasks' => Task::where(function ($q) use ($schoolIds) {
                $q->whereIn('assigned_to_institution_id', $schoolIds)
                    ->orWhere(function ($subQ) use ($schoolIds) {
                        foreach ($schoolIds as $schoolId) {
                            $subQ->orWhereJsonContains('target_institutions', $schoolId);
                        }
                    });
            })->where('status', 'in_progress')->count(),

            'overdue_tasks' => Task::where(function ($q) use ($schoolIds) {
                $q->whereIn('assigned_to_institution_id', $schoolIds)
                    ->orWhere(function ($subQ) use ($schoolIds) {
                        foreach ($schoolIds as $schoolId) {
                            $subQ->orWhereJsonContains('target_institutions', $schoolId);
                        }
                    });
            })->overdue()->count(),
        ];

        return response()->json($stats);
    }
}
