<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TaskCrudController extends BaseTaskController
{
    /**
     * Get tasks list with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
            'status' => 'nullable|string|in:pending,in_progress,review,completed,cancelled',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
            'assigned_to' => 'nullable|integer|exists:users,id',
            'created_by' => 'nullable|integer|exists:users,id',
            'search' => 'nullable|string|max:255',
            'deadline_filter' => 'nullable|string|in:approaching,overdue,all',
            'sort_by' => 'nullable|string|in:created_at,deadline,priority,status,title,category,progress',
            'sort_direction' => 'nullable|string|in:asc,desc',
            'origin_scope' => 'nullable|string|in:region,sector',
        ]);

        $user = Auth::user();

        try {
            // Optimized query with selective eager loading
            $query = Task::with([
                'creator:id,first_name,last_name,email',
                'assignee:id,first_name,last_name',
                'assignedInstitution:id,name,type',
                'approver:id,first_name,last_name',
                'assignments' => function ($query) {
                    $query->select('id', 'task_id', 'assigned_user_id', 'institution_id', 'assignment_status', 'progress', 'assignment_metadata')
                        ->with([
                            'assignedUser:id,first_name,last_name',
                            'institution:id,name',
                        ])
                        ->latest()
                        ->limit(10); // Limit assignments to avoid memory issues
                },
            ])
                ->withCount(['assignments', 'comments', 'progressLogs'])
                ->select('tasks.*'); // Explicit column selection for performance

            $this->permissionService->applyTaskAccessControl($query, $user);

            $this->applyFilters($query, $request);

            // Calculate statistics on filtered query BEFORE pagination
            $statisticsQuery = clone $query;
            $statistics = [
                'total' => $statisticsQuery->count(),
                'pending' => (clone $query)->where('status', 'pending')->count(),
                'in_progress' => (clone $query)->where('status', 'in_progress')->count(),
                'completed' => (clone $query)->where('status', 'completed')->count(),
                'overdue' => (clone $query)->where('deadline', '<', now())
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->count(),
            ];

            // Apply sorting
            $sortBy = $request->sort_by ?? 'created_at';
            $sortDirection = $request->sort_direction ?? 'desc';
            $query->orderBy($sortBy, $sortDirection);

            $perPage = $request->per_page ?? 15;
            $tasks = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $tasks->items(),
                'meta' => [
                    'current_page' => $tasks->currentPage(),
                    'from' => $tasks->firstItem(),
                    'last_page' => $tasks->lastPage(),
                    'per_page' => $tasks->perPage(),
                    'to' => $tasks->lastItem(),
                    'total' => $tasks->total(),
                ],
                'statistics' => $statistics,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Error retrieving tasks');
        }
    }

    /**
     * Get tasks assigned to current user or their institution
     */
    public function getAssignedToCurrentUser(Request $request): JsonResponse
    {
        $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
            'status' => 'nullable|string|in:pending,in_progress,review,completed,cancelled',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
            'search' => 'nullable|string|max:255',
            'deadline_filter' => 'nullable|string|in:approaching,overdue,all',
            'sort_by' => 'nullable|string|in:created_at,deadline,priority,status,title,category,progress',
            'sort_direction' => 'nullable|string|in:asc,desc',
            'origin_scope' => 'nullable|string|in:region,sector',
        ]);

        $user = Auth::user();
        $institutionId = $user->institution_id;

        try {
            $query = Task::with([
                'creator',
                'assignee',
                'assignedInstitution',
                'approver',
                'assignments.assignedUser',
                'assignments.institution',
            ])
                ->where(function ($assignedQuery) use ($user, $institutionId) {
                    // Tasks directly assigned to this user
                    $assignedQuery->where('assigned_to', $user->id)
                        // OR tasks with assignment record for this user
                        ->orWhereHas('assignments', function ($assignmentQuery) use ($user) {
                            $assignmentQuery->where('assigned_user_id', $user->id);
                        })
                        // OR tasks assigned to user's institution (only if user has institution)
                        ->orWhere(function ($instQuery) use ($institutionId, $user) {
                            if ($institutionId) {
                                $instQuery->where('assigned_to_institution_id', $institutionId)
                                    ->orWhereJsonContains('target_institutions', $institutionId);
                            }
                        });
                });

            $this->applyFilters($query, $request);

            // Calculate statistics on filtered query BEFORE pagination
            $statisticsQuery = clone $query;
            $statistics = [
                'total' => $statisticsQuery->count(),
                'pending' => (clone $query)->where('status', 'pending')->count(),
                'in_progress' => (clone $query)->where('status', 'in_progress')->count(),
                'completed' => (clone $query)->where('status', 'completed')->count(),
                'overdue' => (clone $query)->where('deadline', '<', now())
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->count(),
            ];

            // Apply sorting
            $sortBy = $request->sort_by ?? 'deadline';
            $sortDirection = $request->sort_direction ?? 'asc';
            $query->orderBy($sortBy, $sortDirection);

            $perPage = $request->per_page ?? 15;
            $tasks = $query->paginate($perPage);

            $tasks->getCollection()->transform(function (Task $task) use ($user, $institutionId) {
                return $this->appendAssignmentContext($task, $user, $institutionId);
            });

            return response()->json([
                'success' => true,
                'data' => $tasks->items(),
                'meta' => [
                    'current_page' => $tasks->currentPage(),
                    'from' => $tasks->firstItem(),
                    'last_page' => $tasks->lastPage(),
                    'per_page' => $tasks->perPage(),
                    'to' => $tasks->lastItem(),
                    'total' => $tasks->total(),
                ],
                'statistics' => $statistics,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Təyin edilmiş tapşırıqlar alınarkən xəta baş verdi.');
        }
    }

    /**
     * Store a new task
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (! $this->permissionService->canCreateHierarchicalTask($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Tapşırıq yaratmaq səlahiyyətiniz yoxdur.',
            ], 403);
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => [
                'nullable',
                Rule::in(array_keys(Task::CATEGORIES)),
            ],
            'source' => [
                'nullable',
                Rule::in(array_keys(Task::SOURCES)),
            ],
            'priority' => [
                'required',
                Rule::in(array_keys(Task::PRIORITIES)),
            ],
            'deadline' => 'nullable|date|after:now',
            'deadline_time' => 'nullable|date_format:H:i',
            'target_institution_id' => 'nullable|integer|exists:institutions,id',
            'target_scope' => [
                'nullable',
                Rule::in(array_keys(Task::TARGET_SCOPES)),
            ],
            'target_departments' => 'nullable|array',
            'target_departments.*' => 'integer|exists:departments,id',
            'target_roles' => 'nullable|array',
            'target_roles.*' => 'string',
            'assignment_notes' => 'nullable|string',
            'assigned_user_ids' => 'nullable|array|min:1',
            'assigned_user_ids.*' => 'integer|exists:users,id',
            'target_role' => 'nullable|string',
            'specific_institutions' => 'nullable|array',
            'specific_institutions.*' => 'integer|exists:institutions,id',
            'task_data' => 'nullable|array',
            'assignment_data' => 'nullable|array',
        ]);

        try {
            // Additional validation: check for potential duplicate assignments
            $assignedUserIds = $request->input('assigned_user_ids', []);
            $assignmentDataUserIds = $request->input('assignment_data.selected_user_ids', []);
            $allUserIds = array_unique(array_merge($assignedUserIds, $assignmentDataUserIds));

            if (! empty($allUserIds)) {
                // Check if any of these users already have assignments for existing tasks
                // This is a pre-emptive check to provide better error messages
                foreach ($allUserIds as $userId) {
                    // We can't check task_id since task doesn't exist yet,
                    // but we can validate the user exists and is active
                    $selectedUser = \App\Models\User::find($userId);
                    if (! $selectedUser || ! $selectedUser->is_active) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Seçilmiş istifadəçi mövcud deyil və ya aktiv deyil.',
                        ], 422);
                    }
                }
            }

            $result = $this->assignmentService->createHierarchicalTask($request->all(), $user);

            // Log task creation
            $this->auditService->logTaskCreated($result['task']);

            // Send task assignment notifications
            $this->sendTaskAssignmentNotification($result['task'], $result['assignments'] ?? [], $user);

            return response()->json([
                'success' => true,
                'message' => 'Tapşırıq uğurla yaradıldı.',
                'data' => $result,
            ], 201);
        } catch (\Illuminate\Database\QueryException $e) {
            // Handle database constraint violations specifically
            if (str_contains($e->getMessage(), 'task_assignments_task_user_unique')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu istifadəçi artıq bu tapşırıq üçün təyin edilib. Təkrar təyinat mümkün deyil.',
                    'error' => 'Duplicate assignment detected',
                ], 422);
            }

            return $this->handleError($e, 'Tapşırıq yaradılarkən xəta baş verdi.');
        } catch (\Exception $e) {
            return $this->handleError($e, 'Tapşırıq yaradılarkən xəta baş verdi.');
        }
    }

    /**
     * Show specific task
     */
    public function show(Task $task): JsonResponse
    {
        $user = Auth::user();

        if (! $this->permissionService->canUserAccessTask($task, $user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırığı görməyə icazəniz yoxdur.',
            ], 403);
        }

        $task->load([
            'creator',
            'assignee',
            'assignedInstitution',
            'approver',
            'assignments.assignedUser',
            'assignments.institution',
        ]);

        return response()->json([
            'success' => true,
            'data' => $task,
        ]);
    }

    /**
     * Update task
     */
    public function update(Request $request, Task $task): JsonResponse
    {
        $user = Auth::user();

        if (! $this->permissionService->canUserUpdateTask($task, $user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırığı yeniləməyə icazəniz yoxdur.',
            ], 403);
        }

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'category' => [
                'sometimes',
                Rule::in(array_keys(Task::CATEGORIES)),
            ],
            'source' => [
                'sometimes',
                Rule::in(array_keys(Task::SOURCES)),
            ],
            'priority' => [
                'sometimes',
                Rule::in(array_keys(Task::PRIORITIES)),
            ],
            'status' => [
                'sometimes',
                Rule::in(array_keys(Task::STATUSES)),
            ],
            'progress' => 'sometimes|integer|min:0|max:100',
            'deadline' => 'nullable|date|after:now',
            'deadline_time' => 'nullable|date_format:H:i',
            'notes' => 'nullable|string',
        ]);

        try {
            // Capture old values before update
            $oldValues = $task->only([
                'title', 'description', 'category', 'source', 'priority',
                'status', 'progress', 'deadline', 'deadline_time', 'notes',
            ]);

            $task->update($request->only([
                'title', 'description', 'category', 'source', 'priority',
                'status', 'progress', 'deadline', 'deadline_time', 'notes',
            ]));

            // Log task update
            $this->auditService->logTaskUpdated($task, $oldValues);

            $task->load(['creator', 'assignee', 'assignedInstitution']);

            return response()->json([
                'success' => true,
                'message' => 'Tapşırıq uğurla yeniləndi.',
                'data' => $task,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Tapşırıq yenilənərkən xəta baş verdi.');
        }
    }

    /**
     * Delete task
     */
    public function destroy(Task $task): JsonResponse
    {
        $user = Auth::user();

        if (! $this->permissionService->canUserDeleteTask($task, $user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırığı silməyə icazəniz yoxdur.',
            ], 403);
        }

        try {
            DB::beginTransaction();

            $taskTitle = $task->title;

            // Log deletion before actually deleting
            $this->auditService->logTaskDeleted($task);

            $task->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Tapşırıq '{$taskTitle}' uğurla silindi.",
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return $this->handleError($e, 'Tapşırıq silinərkən xəta baş verdi.');
        }
    }

    /**
     * Get task progress overview
     */
    public function getTaskProgress(int $taskId): JsonResponse
    {
        $user = Auth::user();

        try {
            $progress = $this->assignmentService->getTaskProgress($taskId, $user);

            return response()->json([
                'success' => true,
                'data' => $progress,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Tapşırıq irəliləyişi alınarkən xəta baş verdi.');
        }
    }
}
