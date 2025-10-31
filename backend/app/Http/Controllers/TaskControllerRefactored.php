<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\User;
use App\Services\TaskPermissionService;
use App\Services\TaskAssignmentService;
use App\Services\TaskStatisticsService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class TaskControllerRefactored extends Controller
{
    protected TaskPermissionService $permissionService;
    protected TaskAssignmentService $assignmentService;
    protected TaskStatisticsService $statisticsService;
    protected NotificationService $notificationService;

    public function __construct(
        TaskPermissionService $permissionService,
        TaskAssignmentService $assignmentService,
        TaskStatisticsService $statisticsService,
        NotificationService $notificationService
    ) {
        $this->permissionService = $permissionService;
        $this->assignmentService = $assignmentService;
        $this->statisticsService = $statisticsService;
        $this->notificationService = $notificationService;
    }

    /**
     * Get tasks list with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
            'status' => 'nullable|string|in:pending,in_progress,review,completed,cancelled',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
            'category' => 'nullable|string|in:report,maintenance,event,audit,instruction,other',
            'assigned_to' => 'nullable|integer|exists:users,id',
            'created_by' => 'nullable|integer|exists:users,id',
            'search' => 'nullable|string|max:255',
            'deadline_filter' => 'nullable|string|in:approaching,overdue,all',
            'sort_by' => 'nullable|string|in:created_at,deadline,priority,status',
            'sort_direction' => 'nullable|string|in:asc,desc',
            'origin_scope' => 'nullable|string|in:region,sector'
        ]);

        $user = Auth::user();

        try {
            $query = Task::with(['creator', 'assignee', 'assignedInstitution', 'approver']);
            
            $this->permissionService->applyTaskAccessControl($query, $user);

            $this->applyFilters($query, $request);

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
                ]
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
            'category' => 'nullable|string|in:report,maintenance,event,audit,instruction,other',
            'search' => 'nullable|string|max:255',
            'deadline_filter' => 'nullable|string|in:approaching,overdue,all',
            'sort_by' => 'nullable|string|in:created_at,deadline,priority,status',
            'sort_direction' => 'nullable|string|in:asc,desc',
            'origin_scope' => 'nullable|string|in:region,sector'
        ]);

        $user = Auth::user();
        $institutionId = $user->institution_id;

        try {
            $query = Task::with(['creator', 'assignee', 'assignedInstitution', 'approver'])
                ->where(function ($assignedQuery) use ($user, $institutionId) {
                    $assignedQuery->where('assigned_to', $user->id)
                        ->orWhereHas('assignments', function ($assignmentQuery) use ($user, $institutionId) {
                            $assignmentQuery->where('assigned_user_id', $user->id);

                            if ($institutionId) {
                                $assignmentQuery->orWhere('institution_id', $institutionId);
                            }
                        });

                    if ($institutionId) {
                        $assignedQuery->orWhere('assigned_institution_id', $institutionId)
                            ->orWhereJsonContains('target_institutions', $institutionId);
                    }
                });

            $this->applyFilters($query, $request);

            $sortBy = $request->sort_by ?? 'deadline';
            $sortDirection = $request->sort_direction ?? 'asc';
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
                ]
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

        if (!$this->permissionService->canCreateHierarchicalTask($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Tapşırıq yaratmaq səlahiyyətiniz yoxdur.'
            ], 403);
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => [
                'required',
                Rule::in(array_keys(Task::CATEGORIES))
            ],
            'priority' => [
                'required',
                Rule::in(array_keys(Task::PRIORITIES))
            ],
            'deadline' => 'nullable|date|after:now',
            'target_institution_id' => 'required|integer|exists:institutions,id',
            'target_scope' => [
                'nullable',
                Rule::in(array_keys(Task::TARGET_SCOPES))
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
            'assignment_data' => 'nullable|array'
        ]);

        try {
            $result = $this->assignmentService->createHierarchicalTask($request->all(), $user);

            // Send task assignment notifications
            $this->sendTaskAssignmentNotification($result['task'], $result['assignments'] ?? [], $user);

            return response()->json([
                'success' => true,
                'message' => 'Tapşırıq uğurla yaradıldı.',
                'data' => $result
            ], 201);
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

        if (!$this->permissionService->canUserAccessTask($task, $user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırığı görməyə icazəniz yoxdur.'
            ], 403);
        }

        $task->load([
            'creator', 
            'assignee', 
            'assignedInstitution', 
            'approver',
            'assignments.assignedUser',
            'assignments.institution'
        ]);

        return response()->json([
            'success' => true,
            'data' => $task
        ]);
    }

    /**
     * Update task
     */
    public function update(Request $request, Task $task): JsonResponse
    {
        $user = Auth::user();

        if (!$this->permissionService->canUserUpdateTask($task, $user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırığı yeniləməyə icazəniz yoxdur.'
            ], 403);
        }

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'category' => [
                'sometimes',
                Rule::in(array_keys(Task::CATEGORIES))
            ],
            'priority' => [
                'sometimes',
                Rule::in(array_keys(Task::PRIORITIES))
            ],
            'status' => [
                'sometimes',
                Rule::in(array_keys(Task::STATUSES))
            ],
            'progress' => 'sometimes|integer|min:0|max:100',
            'deadline' => 'nullable|date|after:now',
            'notes' => 'nullable|string',
        ]);

        try {
            $task->update($request->only([
                'title', 'description', 'category', 'priority',
                'status', 'progress', 'deadline', 'notes'
            ]));

            $task->load(['creator', 'assignee', 'assignedInstitution']);

            return response()->json([
                'success' => true,
                'message' => 'Tapşırıq uğurla yeniləndi.',
                'data' => $task
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

        if (!$this->permissionService->canUserDeleteTask($task, $user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırığı silməyə icazəniz yoxdur.'
            ], 403);
        }

        try {
            DB::beginTransaction();

            $taskTitle = $task->title;
            $task->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Tapşırıq '{$taskTitle}' uğurla silindi."
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->handleError($e, 'Tapşırıq silinərkən xəta baş verdi.');
        }
    }

    /**
     * Get task assignments with filtering
     */
    public function getTaskAssignments(Request $request, int $taskId): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'status' => 'nullable|string|in:pending,in_progress,completed,cancelled',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'assigned_to' => 'nullable|integer|exists:users,id',
            'priority' => 'nullable|string|in:low,medium,high,urgent'
        ]);

        try {
            $result = $this->assignmentService->getTaskAssignments($taskId, $user, $request->all());

            return response()->json([
                'success' => true,
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Tapşırıq təyinatları alınarkən xəta baş verdi.');
        }
    }

    /**
     * Update assignment status
     */
    public function updateAssignmentStatus(Request $request, int $assignmentId): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'status' => 'required|string|in:pending,in_progress,completed,cancelled',
            'progress' => 'nullable|integer|min:0|max:100',
            'completion_notes' => 'nullable|string'
        ]);

        try {
            $assignment = $this->assignmentService->updateAssignmentStatus($assignmentId, $request->all(), $user);

            return response()->json([
                'success' => true,
                'message' => 'Təyinat statusu uğurla yeniləndi.',
                'data' => $assignment
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Təyinat statusu yenilənərkən xəta baş verdi.');
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
                'data' => $progress
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Tapşırıq irəliləyişi alınarkən xəta baş verdi.');
        }
    }

    /**
     * Bulk update assignment statuses
     */
    public function bulkUpdateAssignments(Request $request): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'assignment_ids' => 'required|array|min:1',
            'assignment_ids.*' => 'integer|exists:task_assignments,id',
            'status' => 'required|string|in:pending,in_progress,completed,cancelled',
            'progress' => 'nullable|integer|min:0|max:100'
        ]);

        try {
            $results = $this->assignmentService->bulkUpdateAssignments(
                $request->assignment_ids, 
                $request->only(['status', 'progress']), 
                $user
            );

            return response()->json([
                'success' => true,
                'message' => 'Kütləvi yenilənmə tamamlandı.',
                'data' => $results
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Kütləvi yenilənmə zamanı xəta baş verdi.');
        }
    }

    /**
     * Get task statistics
     */
    public function getStatistics(Request $request): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
            'category' => 'nullable|string|in:report,maintenance,event,audit,instruction,other'
        ]);

        try {
            $statistics = $this->statisticsService->getTaskStatistics($user, $request->all());

            return response()->json([
                'success' => true,
                'data' => $statistics
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Statistika alınarkən xəta baş verdi.');
        }
    }

    /**
     * Get performance analytics
     */
    public function getPerformanceAnalytics(Request $request): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'group_by' => 'nullable|string|in:institution,user,category,priority'
        ]);

        try {
            $analytics = $this->statisticsService->getPerformanceAnalytics($user, $request->all());

            return response()->json([
                'success' => true,
                'data' => $analytics
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Performans analitikası alınarkən xəta baş verdi.');
        }
    }

    /**
     * Get trend analysis
     */
    public function getTrendAnalysis(Request $request): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'period' => 'nullable|string|in:day,week,month,quarter,year',
            'metric' => 'nullable|string|in:completion_rate,average_completion_time,task_count'
        ]);

        try {
            $trends = $this->statisticsService->getTrendAnalysis($user, $request->all());

            return response()->json([
                'success' => true,
                'data' => $trends
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Trend analizi alınarkən xəta baş verdi.');
        }
    }

    /**
     * Get targetable institutions for current user
     */
    public function getTargetableInstitutions(): JsonResponse
    {
        $user = Auth::user();

        try {
            $institutions = $this->permissionService->getTargetableInstitutions($user);

            return response()->json([
                'success' => true,
                'data' => $institutions
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Targetable institutions alınarkən xəta baş verdi.');
        }
    }

    /**
     * Get allowed target roles for current user
     */
    public function getAllowedTargetRoles(): JsonResponse
    {
        $user = Auth::user();

        try {
            $roles = $this->permissionService->getAllowedTargetRoles($user);

            return response()->json([
                'success' => true,
                'data' => $roles
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'İcazə verilən rollar alınarkən xəta baş verdi.');
        }
    }

    /**
     * Get task creation context
     */
    public function getTaskCreationContext(): JsonResponse
    {
        $user = Auth::user();

        try {
            $context = $this->permissionService->getTaskCreationContext($user);

            return response()->json([
                'success' => true,
                'data' => $context
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Tapşırıq yaradılma konteksti alınarkən xəta baş verdi.');
        }
    }

    /**
     * Get assignable users for task creation based on permissions
     */
    public function getAssignableUsers(Request $request): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'role' => 'nullable|string',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'search' => 'nullable|string|max:255',
            'per_page' => 'nullable|integer|min:1|max:200',
            'origin_scope' => 'nullable|string|in:region,sector',
        ]);

        try {
            $allowedRoles = $this->permissionService->getAllowedTargetRoles($user);
            $originScope = $request->origin_scope;

            if ($originScope) {
                $allowedRoles = $this->permissionService->filterRolesByOriginScope($allowedRoles, $originScope);
            }

            if (empty($allowedRoles)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tapşırıq üçün məsul şəxs təyin etmək icazəniz yoxdur.'
                ], 403);
            }

            $roleFilter = $request->role;
            if ($roleFilter && !in_array($roleFilter, $allowedRoles, true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seçilmiş rola istifadəçi təyin etmək icazəniz yoxdur.'
                ], 403);
            }

            $institutionScope = $this->permissionService->getUserInstitutionScope($user, $originScope);
            $institutionFilter = $request->institution_id;

            if ($institutionFilter && !in_array((int) $institutionFilter, $institutionScope, true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu müəssisədən istifadəçi seçmək icazəniz yoxdur.'
                ], 403);
            }

            \Log::info('TaskController:getAssignableUsers context', [
                'user_id' => $user->id,
                'origin_scope' => $originScope,
                'allowed_roles' => $allowedRoles,
                'institution_scope_count' => count($institutionScope),
            ]);

            $query = User::query()
                ->with(['roles:id,name', 'institution:id,name,level,parent_id'])
                ->select(['id', 'first_name', 'last_name', 'email', 'institution_id', 'is_active'])
                ->where('is_active', true)
                ->whereHas('roles', function ($roleQuery) use ($allowedRoles, $roleFilter) {
                    if ($roleFilter) {
                        $roleQuery->where('name', $roleFilter);
                    } else {
                        $roleQuery->whereIn('name', $allowedRoles);
                    }
                });

            if (!empty($institutionScope)) {
                $query->where(function ($institutionQuery) use ($institutionScope) {
                    $institutionQuery->whereIn('institution_id', $institutionScope)
                        ->orWhereNull('institution_id');
                });
            }

            if ($institutionFilter) {
                $query->where('institution_id', $institutionFilter);
            }

            if ($search = $request->search) {
                $query->where(function ($searchQuery) use ($search) {
                    $searchQuery->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            }

            $perPage = $request->per_page ?? 100;
            $users = $query->orderBy('first_name')->orderBy('last_name')->paginate($perPage);

            \Log::info('TaskController:getAssignableUsers query result', [
                'total' => $users->total(),
                'current_page' => $users->currentPage(),
                'filter_institution' => $institutionFilter,
            ]);

            $institutionMap = $this->permissionService->buildInstitutionHierarchyMap(
                $users->getCollection()->pluck('institution_id')->filter()->unique()->values()->all()
            );

            $data = $users->getCollection()->map(function (User $assignableUser) use ($institutionMap) {
                $primaryRole = $assignableUser->roles->first();
                $institution = $assignableUser->institution;
                $institutionId = $institution?->id;
                $institutionMeta = $institutionId ? ($institutionMap[$institutionId] ?? null) : null;

                return [
                    'id' => $assignableUser->id,
                    'name' => $assignableUser->name,
                    'email' => $assignableUser->email,
                    'institution' => $assignableUser->institution ? [
                        'id' => $assignableUser->institution->id,
                        'name' => $assignableUser->institution->name,
                        'level' => $assignableUser->institution->level,
                        'parent_id' => $assignableUser->institution->parent_id,
                        'hierarchy_path' => $institutionMeta['path'] ?? [],
                        'depth' => $institutionMeta['depth'] ?? 0,
                    ] : null,
                    'role' => $primaryRole?->name,
                    'is_active' => $assignableUser->is_active,
                ];
            });

            \Log::info('TaskController:getAssignableUsers response sample', [
                'first_user' => $data->first(),
            ]);

            return response()->json([
                'success' => true,
                'data' => $data,
                'meta' => [
                    'current_page' => $users->currentPage(),
                    'last_page' => $users->lastPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                ],
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Təyin edilə bilən istifadəçilər alınarkən xəta baş verdi.');
        }
    }

    /**
     * Apply filters to task query
     */
    private function applyFilters($query, Request $request): void
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
                $q->where('origin_scope', $originScope);

                if ($originScope === 'region') {
                    $q->orWhere(function ($subQ) {
                        $subQ->whereNull('origin_scope')
                             ->where('target_scope', 'regional');
                    });
                }

                if ($originScope === 'sector') {
                    $q->orWhere(function ($subQ) {
                        $subQ->whereNull('origin_scope')
                             ->whereIn('target_scope', ['sector', 'sectoral']);
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
     * Send task assignment notification to target users
     */
    private function sendTaskAssignmentNotification($task, array $assignments, $creator): void
    {
        try {
            // Collect all assigned user IDs
            $assignedUserIds = [];

            foreach ($assignments as $assignment) {
                if (isset($assignment['assigned_user_id'])) {
                    $assignedUserIds[] = $assignment['assigned_user_id'];
                }
            }

            if (!empty($assignedUserIds)) {
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
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Handle errors consistently
     */
    private function handleError(\Exception $e, string $defaultMessage): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $defaultMessage,
            'error' => config('app.debug') ? $e->getMessage() : null
        ], 500);
    }
}
