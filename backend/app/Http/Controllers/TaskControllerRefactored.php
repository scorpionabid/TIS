<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskAssignment;
use App\Services\TaskPermissionService;
use App\Services\TaskAssignmentService;
use App\Services\TaskStatisticsService;
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

    public function __construct(
        TaskPermissionService $permissionService,
        TaskAssignmentService $assignmentService,
        TaskStatisticsService $statisticsService
    ) {
        $this->permissionService = $permissionService;
        $this->assignmentService = $assignmentService;
        $this->statisticsService = $statisticsService;
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
            'sort_direction' => 'nullable|string|in:asc,desc'
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
            'due_date' => 'nullable|date|after:now',
            'target_institution_id' => 'required|integer|exists:institutions,id',
            'target_role' => 'nullable|string',
            'specific_institutions' => 'nullable|array',
            'specific_institutions.*' => 'integer|exists:institutions,id',
            'task_data' => 'nullable|array',
            'assignment_data' => 'nullable|array'
        ]);

        try {
            $result = $this->assignmentService->createHierarchicalTask($request->all(), $user);

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
            'due_date' => 'nullable|date|after:now',
            'notes' => 'nullable|string',
        ]);

        try {
            $task->update($request->only([
                'title', 'description', 'category', 'priority', 
                'status', 'progress', 'due_date', 'notes'
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