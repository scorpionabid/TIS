<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Http\Controllers\BaseController;
use App\Models\Institution;
use App\Models\Task;
use App\Models\TaskProgressLog;
use App\Services\TaskNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class RegionAdminTaskController extends BaseController
{
    /**
     * Get tasks list for RegionAdmin with filtering
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $region = $user->institution;

        if (! $region) {
            return response()->json(['error' => 'User is not associated with a region'], 400);
        }

        $request->validate([
            'status' => 'nullable|string|in:pending,in_progress,review,completed,cancelled',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
            'category' => 'nullable|string|in:report,maintenance,event,audit,instruction,other',
            'per_page' => 'nullable|integer|min:1|max:100',
            'search' => 'nullable|string|max:255',
        ]);

        // Get all institutions under this region that can be targeted
        $targetableInstitutions = Institution::where('parent_id', $region->id)
            ->orWhere(function ($query) use ($region) {
                $query->whereHas('parent', function ($q) use ($region) {
                    $q->where('parent_id', $region->id);
                });
            })
            ->pluck('id');

        $query = Task::where('created_by', $user->id)
            ->with([
                'creator:id,name,email',
                'assignedInstitution:id,name',
                'progressLogs' => function ($q) {
                    $q->latest()->limit(1);
                },
            ])
            ->orderBy('created_at', 'desc');

        // Apply filters
        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->priority) {
            $query->where('priority', $request->priority);
        }

        if ($request->category) {
            $query->where('category', $request->category);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        $perPage = $request->per_page ?? 15;
        $tasks = $query->paginate($perPage);

        // Add calculated fields
        $tasks->getCollection()->transform(function ($task) {
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
                'created_at' => $task->created_at,
                'target_institutions' => $task->target_institutions,
                'target_institutions_count' => count($task->target_institutions ?? []),
                'target_scope' => $task->target_scope,
                'origin_scope' => $task->origin_scope ?? 'region',
                'origin_scope_label' => $task->origin_scope_label ?? 'Regional Task',
                'requires_approval' => $task->requires_approval,
                'is_overdue' => $task->isOverdue(),
                'latest_update' => $latestLog ? [
                    'status' => $latestLog->new_status,
                    'notes' => $latestLog->notes,
                    'updated_at' => $latestLog->created_at,
                ] : null,
            ];
        });

        return response()->json([
            'tasks' => $tasks->items(),
            'meta' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'per_page' => $tasks->perPage(),
                'total' => $tasks->total(),
            ],
        ]);
    }

    /**
     * Create a new task
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        $region = $user->institution;

        if (! $region) {
            return response()->json(['error' => 'User is not associated with a region'], 400);
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => [
                'required',
                Rule::in(['report', 'maintenance', 'event', 'audit', 'instruction', 'other']),
            ],
            'priority' => [
                'required',
                Rule::in(['low', 'medium', 'high', 'urgent']),
            ],
            'deadline' => 'nullable|date|after:now',
            'target_institutions' => 'required|array|min:1',
            'target_institutions.*' => 'integer|exists:institutions,id',
            'notes' => 'nullable|string',
            'requires_approval' => 'nullable|boolean',
        ]);

        // Validate that target institutions are under this region's authority
        $validInstitutions = Institution::whereIn('id', $request->target_institutions)
            ->where(function ($query) use ($region) {
                $query->where('parent_id', $region->id) // Direct children (sectors)
                    ->orWhere(function ($q) use ($region) {
                        $q->whereHas('parent', function ($subQ) use ($region) {
                            $subQ->where('parent_id', $region->id); // Schools under sectors
                        });
                    });
            })
            ->pluck('id');

        $invalidInstitutions = collect($request->target_institutions)->diff($validInstitutions);
        if ($invalidInstitutions->isNotEmpty()) {
            return response()->json([
                'error' => 'Some target institutions are not under your authority',
                'invalid_institutions' => $invalidInstitutions->values(),
            ], 403);
        }

        $task = Task::create([
            'title' => $request->title,
            'description' => $request->description,
            'category' => $request->category,
            'priority' => $request->priority,
            'deadline' => $request->deadline,
            'created_by' => $user->id,
            'target_institutions' => $request->target_institutions,
            'target_scope' => 'regional',
            'origin_scope' => 'region',
            'notes' => $request->notes,
            'requires_approval' => $request->requires_approval ?? true,
            'status' => 'pending',
            'progress' => 0,
        ]);

        // Log task creation
        TaskProgressLog::create([
            'task_id' => $task->id,
            'updated_by' => $user->id,
            'old_status' => null,
            'new_status' => 'pending',
            'progress_percentage' => 0,
            'notes' => 'Task created by RegionAdmin for ' . count($request->target_institutions) . ' institutions',
        ]);

        $task->load(['creator:id,name,email']);

        // Send notification to target institutions
        $notificationService = app(TaskNotificationService::class);
        $notificationService->notifyTaskCreated($task);

        return response()->json([
            'message' => 'Task created successfully',
            'task' => $task,
        ], 201);
    }

    /**
     * Get task details
     */
    public function show(Request $request, int $taskId): JsonResponse
    {
        $user = Auth::user();

        $task = Task::where('created_by', $user->id)
            ->with([
                'creator:id,name,email',
                'progressLogs.updatedBy:id,name,email,institution_id',
                'progressLogs.updatedBy.institution:id,name',
            ])
            ->find($taskId);

        if (! $task) {
            return response()->json(['error' => 'Task not found or not accessible'], 404);
        }

        // Get institutions that this task targets
        $targetInstitutions = [];
        if ($task->target_institutions) {
            $targetInstitutions = Institution::whereIn('id', $task->target_institutions)
                ->get(['id', 'name', 'type'])
                ->map(function ($institution) use ($task) {
                    // Get latest progress for this institution
                    $latestProgress = TaskProgressLog::where('task_id', $task->id)
                        ->whereHas('updatedBy', function ($q) use ($institution) {
                            $q->where('institution_id', $institution->id);
                        })
                        ->latest()
                        ->first();

                    return [
                        'id' => $institution->id,
                        'name' => $institution->name,
                        'type' => $institution->type,
                        'status' => $latestProgress ? $latestProgress->new_status : 'pending',
                        'progress' => $latestProgress ? $latestProgress->progress_percentage : 0,
                        'latest_notes' => $latestProgress ? $latestProgress->notes : null,
                        'last_updated' => $latestProgress ? $latestProgress->created_at : null,
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
                'target_scope' => $task->target_scope,
                'origin_scope' => $task->origin_scope ?? 'region',
                'origin_scope_label' => $task->origin_scope_label ?? 'Regional Task',
                'requires_approval' => $task->requires_approval,
                'notes' => $task->notes,
                'is_overdue' => $task->isOverdue(),
            ],
            'target_institutions' => $targetInstitutions,
            'progress_logs' => $task->progressLogs->map(function ($log) {
                return [
                    'id' => $log->id,
                    'old_status' => $log->old_status,
                    'new_status' => $log->new_status,
                    'progress_percentage' => $log->progress_percentage,
                    'notes' => $log->notes,
                    'updated_by' => $log->updatedBy->name ?? 'System',
                    'institution' => $log->updatedBy->institution->name ?? 'Unknown',
                    'created_at' => $log->created_at,
                ];
            }),
        ]);
    }

    /**
     * Update task
     */
    public function update(Request $request, int $taskId): JsonResponse
    {
        $user = Auth::user();

        $task = Task::where('created_by', $user->id)->find($taskId);

        if (! $task) {
            return response()->json(['error' => 'Task not found or not accessible'], 404);
        }

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'category' => [
                'sometimes',
                Rule::in(['report', 'maintenance', 'event', 'audit', 'instruction', 'other']),
            ],
            'priority' => [
                'sometimes',
                Rule::in(['low', 'medium', 'high', 'urgent']),
            ],
            'deadline' => 'nullable|date|after:now',
            'notes' => 'nullable|string',
            'requires_approval' => 'nullable|boolean',
        ]);

        $oldData = $task->only(['title', 'priority', 'deadline']);

        $task->update($request->only([
            'title', 'description', 'category', 'priority',
            'deadline', 'notes', 'requires_approval',
        ]));

        // Log significant changes
        $changes = [];
        if ($request->has('title') && $task->title !== $oldData['title']) {
            $changes[] = 'Title updated';
        }
        if ($request->has('priority') && $task->priority !== $oldData['priority']) {
            $changes[] = "Priority changed to {$task->priority}";
        }
        if ($request->has('deadline') && $task->deadline !== $oldData['deadline']) {
            $changes[] = 'Deadline updated';
        }

        if (! empty($changes)) {
            TaskProgressLog::create([
                'task_id' => $task->id,
                'updated_by' => $user->id,
                'old_status' => $task->status,
                'new_status' => $task->status,
                'progress_percentage' => $task->progress,
                'notes' => 'RegionAdmin updated task: ' . implode(', ', $changes),
            ]);
        }

        return response()->json([
            'message' => 'Task updated successfully',
            'task' => $task,
        ]);
    }

    /**
     * Get available target institutions for task creation
     */
    public function getTargetableInstitutions(Request $request): JsonResponse
    {
        $user = Auth::user();
        $region = $user->institution;

        if (! $region) {
            return response()->json(['error' => 'User is not associated with a region'], 400);
        }

        // Get sectors under this region
        $sectors = Institution::where('parent_id', $region->id)
            ->where('is_active', true)
            ->with(['children' => function ($query) {
                $query->where('is_active', true)->orderBy('name');
            }])
            ->orderBy('name')
            ->get();

        $institutionTree = $sectors->map(function ($sector) {
            return [
                'id' => $sector->id,
                'name' => $sector->name,
                'type' => $sector->type,
                'level' => 'sector',
                'children' => $sector->children->map(function ($school) {
                    return [
                        'id' => $school->id,
                        'name' => $school->name,
                        'type' => $school->type,
                        'level' => 'school',
                    ];
                }),
            ];
        });

        return response()->json([
            'region' => [
                'id' => $region->id,
                'name' => $region->name,
            ],
            'institution_tree' => $institutionTree,
        ]);
    }

    /**
     * Get task statistics for RegionAdmin
     */
    public function getStatistics(Request $request): JsonResponse
    {
        $user = Auth::user();

        $stats = [
            'total_tasks' => Task::where('created_by', $user->id)->count(),
            'pending_tasks' => Task::where('created_by', $user->id)->where('status', 'pending')->count(),
            'in_progress_tasks' => Task::where('created_by', $user->id)->where('status', 'in_progress')->count(),
            'review_tasks' => Task::where('created_by', $user->id)->where('status', 'review')->count(),
            'completed_tasks' => Task::where('created_by', $user->id)->where('status', 'completed')->count(),
            'overdue_tasks' => Task::where('created_by', $user->id)->overdue()->count(),
        ];

        return response()->json($stats);
    }
}
