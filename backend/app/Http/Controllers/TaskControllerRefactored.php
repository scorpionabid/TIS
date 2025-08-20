<?php

namespace App\Http\Controllers;

use App\Http\Traits\HasAuthorization;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskAssignment;
use App\Models\TaskProgressLog;
use App\Models\TaskNotification;
use App\Models\Institution;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TaskControllerRefactored extends Controller
{
    use HasAuthorization;

    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
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
            'priority' => 'nullable|string|in:asagi,orta,yuksek,tecili',
            'category' => 'nullable|string|in:hesabat,temir,tedbir,audit,telimat',
            'assigned_to' => 'nullable|integer|exists:users,id',
            'created_by' => 'nullable|integer|exists:users,id',
            'search' => 'nullable|string|max:255',
            'deadline_filter' => 'nullable|string|in:approaching,overdue,all',
            'sort_by' => 'nullable|string|in:created_at,deadline,priority,status',
            'sort_direction' => 'nullable|string|in:asc,desc'
        ]);

        $user = Auth::user();
        $query = Task::with(['creator', 'assignee', 'assignedInstitution', 'approver']);

        // Apply role-based access control using trait
        $query = $this->applyTaskAccessScope($query, $user);

        // Apply filters
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

        // Sorting
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
    }

    /**
     * Store a new task
     */
    public function store(Request $request): JsonResponse
    {
        // Check authorization using trait
        $authResult = $this->requireRole(['superadmin', 'regionadmin', 'sektoradmin']);
        if ($authResult instanceof JsonResponse) {
            return $authResult;
        }

        $user = Auth::user();

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
            'assigned_to' => 'required|integer|exists:users,id',
            'assigned_institution_id' => 'nullable|integer|exists:institutions,id',
            'target_institutions' => 'nullable|array',
            'target_institutions.*' => 'integer|exists:institutions,id',
            'target_scope' => [
                'required',
                Rule::in(array_keys(Task::TARGET_SCOPES))
            ],
            'notes' => 'nullable|string',
            'requires_approval' => 'nullable|boolean',
        ]);

        $task = Task::create([
            'title' => $request->title,
            'description' => $request->description,
            'category' => $request->category,
            'priority' => $request->priority,
            'deadline' => $request->deadline,
            'created_by' => $user->id,
            'assigned_to' => $request->assigned_to,
            'assigned_institution_id' => $request->assigned_institution_id,
            'target_institutions' => $request->target_institutions,
            'target_scope' => $request->target_scope,
            'notes' => $request->notes,
            'requires_approval' => $request->requires_approval ?? false,
        ]);

        $task->load(['creator', 'assignee', 'assignedInstitution']);

        // Send notification to assigned user
        $this->notificationService->sendTaskAssigned($task);

        return response()->json([
            'success' => true,
            'message' => 'Tapşırıq uğurla yaradıldı.',
            'data' => $task
        ], 201);
    }

    /**
     * Show specific task
     */
    public function show(Task $task): JsonResponse
    {
        // Check access permission using trait
        $authResult = $this->authorizeOrFail(
            $this->canUserAccessTask($task),
            'Bu tapşırığı görməyə icazəniz yoxdur.'
        );
        
        if ($authResult instanceof JsonResponse) {
            return $authResult;
        }

        $task->load([
            'creator', 
            'assignee', 
            'assignedInstitution', 
            'approver',
            'comments.user'
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
        // Check permission to update using trait
        $authResult = $this->authorizeOrFail(
            $this->canUserUpdateTask($task),
            'Bu tapşırığı yeniləməyə icazəniz yoxdur.'
        );
        
        if ($authResult instanceof JsonResponse) {
            return $authResult;
        }

        $user = Auth::user();

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

        $oldStatus = $task->status;
        $oldProgress = $task->progress;

        $task->update($request->only([
            'title', 'description', 'category', 'priority', 
            'status', 'progress', 'deadline', 'notes'
        ]));

        // Log status or progress changes
        if ($task->status !== $oldStatus) {
            TaskComment::create([
                'task_id' => $task->id,
                'user_id' => $user->id,
                'comment' => "Status '{$oldStatus}'-dən '{$task->status}'-ə dəyişdirildi.",
                'type' => 'status_change'
            ]);
        }

        if ($task->progress !== $oldProgress) {
            TaskComment::create([
                'task_id' => $task->id,
                'user_id' => $user->id,
                'comment' => "İrəliləyiş {$oldProgress}%-dən {$task->progress}%-ə yeniləndi.",
                'type' => 'progress_update'
            ]);
        }

        $task->load(['creator', 'assignee', 'assignedInstitution']);

        return response()->json([
            'success' => true,
            'message' => 'Tapşırıq uğurla yeniləndi.',
            'data' => $task
        ]);
    }

    /**
     * Delete task
     */
    public function destroy(Request $request, Task $task): JsonResponse
    {
        $user = Auth::user();

        // Check deletion permission using trait
        $authResult = $this->authorizeOrFail(
            $user->hasRole('superadmin') || $this->isResourceOwner($task, 'created_by'),
            'Bu tapşırığı silməyə icazəniz yoxdur.'
        );
        
        if ($authResult instanceof JsonResponse) {
            return $authResult;
        }

        $deleteType = $request->query('type', 'soft');

        try {
            DB::beginTransaction();

            if ($deleteType === 'hard') {
                $taskTitle = $task->title;
                $task->delete();
                $message = "Tapşırıq '{$taskTitle}' tam olaraq silindi.";
            } else {
                $task->update([
                    'status' => 'cancelled',
                    'deleted_at' => now(),
                    'cancelled_at' => now(),
                    'cancelled_by' => $user->id
                ]);
                $message = "Tapşırıq '{$task->title}' ləğv edildi.";
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $message
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Tapşırıq silinərkən xəta baş verdi.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add comment to task
     */
    public function addComment(Request $request, Task $task): JsonResponse
    {
        $authResult = $this->authorizeOrFail(
            $this->canUserAccessTask($task),
            'Bu tapşırığa şərh yazmağa icazəniz yoxdur.'
        );
        
        if ($authResult instanceof JsonResponse) {
            return $authResult;
        }

        $user = Auth::user();

        $request->validate([
            'comment' => 'required|string',
            'attachments' => 'nullable|array',
            'attachments.*' => 'string'
        ]);

        $comment = TaskComment::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'comment' => $request->comment,
            'attachments' => $request->attachments,
            'type' => 'comment'
        ]);

        $comment->load('user');

        return response()->json([
            'success' => true,
            'message' => 'Şərh əlavə edildi.',
            'data' => $comment
        ], 201);
    }

    /**
     * Get task statistics
     */
    public function getStatistics(): JsonResponse
    {
        $user = Auth::user();
        $query = Task::query();
        
        // Apply scope using trait
        $query = $this->applyTaskAccessScope($query, $user);

        $stats = [
            'total' => $query->count(),
            'pending' => $query->clone()->byStatus('pending')->count(),
            'in_progress' => $query->clone()->byStatus('in_progress')->count(),
            'completed' => $query->clone()->byStatus('completed')->count(),
            'overdue' => $query->clone()->overdue()->count(),
            'approaching_deadline' => $query->clone()->deadlineApproaching(3)->count(),
            'by_priority' => [
                'tecili' => $query->clone()->byPriority('tecili')->count(),
                'yuksek' => $query->clone()->byPriority('yuksek')->count(),
                'orta' => $query->clone()->byPriority('orta')->count(),
                'asagi' => $query->clone()->byPriority('asagi')->count(),
            ],
            'by_category' => [
                'hesabat' => $query->clone()->byCategory('hesabat')->count(),
                'temir' => $query->clone()->byCategory('temir')->count(),
                'tedbir' => $query->clone()->byCategory('tedbir')->count(),
                'audit' => $query->clone()->byCategory('audit')->count(),
                'telimat' => $query->clone()->byCategory('telimat')->count(),
            ]
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Apply task access scope using trait methods
     */
    private function applyTaskAccessScope($query, $user)
    {
        if ($user->hasRole(['regionadmin', 'sektoradmin'])) {
            $userInstitutions = $this->getUserInstitutionScope($user);
            $query->where(function ($q) use ($user, $userInstitutions) {
                $q->where('created_by', $user->id)
                  ->orWhere('assigned_to', $user->id)
                  ->orWhereIn('assigned_institution_id', $userInstitutions)
                  ->orWhere(function ($subQ) use ($userInstitutions) {
                      foreach ($userInstitutions as $institutionId) {
                          $subQ->orWhereJsonContains('target_institutions', $institutionId);
                      }
                  });
            });
        } elseif ($user->hasRole(['schooladmin', 'müəllim'])) {
            $userInstitution = $user->institution_id;
            $query->where(function ($q) use ($user, $userInstitution) {
                $q->where('assigned_to', $user->id)
                  ->orWhere('assigned_institution_id', $userInstitution)
                  ->orWhereJsonContains('target_institutions', $userInstitution);
            });
        }
        // SuperAdmin can see all tasks (no additional filtering)

        return $query;
    }

    /**
     * Check if user can access task using trait methods
     */
    private function canUserAccessTask($task): bool
    {
        $user = Auth::user();

        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($this->isResourceOwner($task, 'created_by') || $this->isResourceOwner($task, 'assigned_to')) {
            return true;
        }

        if ($user->hasRole(['regionadmin', 'sektoradmin'])) {
            return $this->canAccessInstitution($task->assigned_institution_id) ||
                   !empty(array_intersect($task->target_institutions ?? [], $this->getUserInstitutionScope()));
        }

        if ($user->hasRole(['schooladmin', 'müəllim'])) {
            return $task->assigned_institution_id === $user->institution_id ||
                   in_array($user->institution_id, $task->target_institutions ?? []);
        }

        return false;
    }

    /**
     * Check if user can update task using trait methods
     */
    private function canUserUpdateTask($task): bool
    {
        $user = Auth::user();

        // Creator can always update
        if ($this->isResourceOwner($task, 'created_by')) {
            return true;
        }

        // Assigned user can update status, progress, and notes
        if ($this->isResourceOwner($task, 'assigned_to')) {
            return true;
        }

        // SuperAdmin can update any task
        return $user->hasRole('superadmin');
    }
}