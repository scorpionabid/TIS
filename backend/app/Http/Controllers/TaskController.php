<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskAssignment;
use App\Models\TaskProgressLog;
use App\Models\TaskNotification;
use App\Models\Institution;
use App\Models\Department;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
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

        // Role-based access control
        if ($user->hasRole(['regionadmin', 'sektoradmin'])) {
            // RegionAdmin and SektorAdmin can see tasks they created or assigned to their scope
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
            // SchoolAdmin and Teachers can only see tasks assigned to them or their institution
            $userInstitution = $user->institution_id;
            $query->where(function ($q) use ($user, $userInstitution) {
                $q->where('assigned_to', $user->id)
                  ->orWhere('assigned_institution_id', $userInstitution)
                  ->orWhereJsonContains('target_institutions', $userInstitution);
            });
        }
        // SuperAdmin can see all tasks (no additional filtering)

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
        $user = Auth::user();

        // Only RegionAdmin and SektorAdmin can create tasks
        if (!$user->hasRole(['superadmin', 'regionadmin', 'sektoradmin'])) {
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
        $user = Auth::user();

        // Check access permission
        if (!$this->canUserAccessTask($user, $task)) {
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
        $user = Auth::user();

        // Check permission to update
        if (!$this->canUserUpdateTask($user, $task)) {
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
     * Delete task (soft delete by deactivating or hard delete by removal)
     */
    public function destroy(Request $request, Task $task): JsonResponse
    {
        $user = Auth::user();

        // Only creator or superadmin can delete tasks
        if (!$user->hasRole('superadmin') && $task->created_by !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırığı silməyə icazəniz yoxdur.'
            ], 403);
        }

        $deleteType = $request->query('type', 'soft');

        try {
            DB::beginTransaction();

            if ($deleteType === 'hard') {
                // Hard delete - permanent removal
                $taskTitle = $task->title;
                $task->delete();

                $message = "Tapşırıq '{$taskTitle}' tam olaraq silindi.";
            } else {
                // Soft delete - mark as deleted and set status to cancelled
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
        $user = Auth::user();

        if (!$this->canUserAccessTask($user, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırığa şərh yazmağa icazəniz yoxdur.'
            ], 403);
        }

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
        
        // Apply role-based filtering
        if (!$user->hasRole('superadmin')) {
            if ($user->hasRole(['regionadmin', 'sektoradmin'])) {
                $userInstitutions = $this->getUserInstitutionScope($user);
                $query->where(function ($q) use ($user, $userInstitutions) {
                    $q->where('created_by', $user->id)
                      ->orWhere('assigned_to', $user->id)
                      ->orWhereIn('assigned_institution_id', $userInstitutions);
                });
            } else {
                $query->where('assigned_to', $user->id);
            }
        }

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
     * Get targetable institutions for current user
     */
    public function getTargetableInstitutions(): JsonResponse
    {
        $user = Auth::user();
        $targetableIds = Task::getUserTargetableInstitutions($user);
        
        $institutions = Institution::whereIn('id', $targetableIds)
                                  ->where('is_active', true)
                                  ->with('parent')
                                  ->get();

        return response()->json([
            'success' => true,
            'data' => $institutions
        ]);
    }

    /**
     * Get allowed target roles for current user
     */
    public function getAllowedTargetRoles(): JsonResponse
    {
        $user = Auth::user();
        $allowedRoles = Task::getAllowedTargetRoles($user);

        return response()->json([
            'success' => true,
            'data' => $allowedRoles
        ]);
    }

    /**
     * Create task with hierarchical assignments
     */
    public function createHierarchicalTask(Request $request): JsonResponse
    {
        $user = Auth::user();

        // Check if user has authority to create tasks
        if (!$user->hasRole(['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'sektoroperator', 'schooladmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Tapşırıq yaratmaq səlahiyyətiniz yoxdur.'
            ], 403);
        }

        $request->validate([
            'title' => 'required|string|max:300',
            'description' => 'required|string',
            'category' => ['required', Rule::in(['report', 'maintenance', 'event', 'audit', 'instruction', 'other'])],
            'priority' => ['required', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'deadline' => 'nullable|date|after:now',
            'target_institutions' => 'required|array|min:1',
            'target_institutions.*' => 'integer|exists:institutions,id',
            'target_departments' => 'nullable|array',
            'target_departments.*' => 'integer|exists:departments,id',
            'target_roles' => 'nullable|array',
            'target_roles.*' => 'string',
            'notes' => 'nullable|string',
            'requires_approval' => 'nullable|boolean',
        ]);

        // Check if user can target these institutions
        if (!Task::canCreateTaskForTargets($user, $request->target_institutions)) {
            return response()->json([
                'success' => false,
                'message' => 'Seçilən təşkilatlara tapşırıq təyin etməyə səlahiyyətiniz yoxdur.'
            ], 403);
        }

        // Create the main task
        $task = Task::create([
            'title' => $request->title,
            'description' => $request->description,
            'category' => $request->category,
            'priority' => $request->priority,
            'deadline' => $request->deadline,
            'created_by' => $user->id,
            'assigned_to' => $user->id, // Initially assigned to creator
            'target_institutions' => $request->target_institutions,
            'target_departments' => $request->target_departments,
            'target_roles' => $request->target_roles,
            'target_scope' => 'specific',
            'notes' => $request->notes,
            'requires_approval' => $request->requires_approval ?? false,
        ]);

        // Create task assignments for each target institution
        foreach ($request->target_institutions as $institutionId) {
            $assignment = TaskAssignment::create([
                'task_id' => $task->id,
                'institution_id' => $institutionId,
                'assigned_role' => $request->target_roles[0] ?? 'schooladmin', // Default to schooladmin
                'assignment_status' => 'pending',
                'assigned_at' => now(),
            ]);

            // Create notification for each assignment
            $this->createTaskNotification($task, $assignment);
        }

        // Log task creation
        TaskProgressLog::create([
            'task_id' => $task->id,
            'updated_by' => $user->id,
            'old_status' => null,
            'new_status' => 'pending',
            'progress_percentage' => 0,
            'notes' => 'Task created and assigned to ' . count($request->target_institutions) . ' institutions',
        ]);

        $task->load(['creator', 'assignments.institution', 'assignments.assignedUser']);

        return response()->json([
            'success' => true,
            'message' => 'Tapşırıq uğurla yaradıldı və təyin edildi.',
            'data' => $task
        ], 201);
    }

    /**
     * Get task assignments for monitoring
     */
    public function getTaskAssignments(Task $task): JsonResponse
    {
        $user = Auth::user();

        if (!$this->canUserAccessTask($user, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırığın təyinatlarını görməyə icazəniz yoxdur.'
            ], 403);
        }

        $assignments = TaskAssignment::where('task_id', $task->id)
                                   ->with(['institution', 'department', 'assignedUser'])
                                   ->get();

        return response()->json([
            'success' => true,
            'data' => $assignments
        ]);
    }

    /**
     * Update task assignment status
     */
    public function updateAssignmentStatus(Request $request, TaskAssignment $assignment): JsonResponse
    {
        $user = Auth::user();

        // Check if user can update this assignment
        if (!$this->canUserUpdateAssignment($user, $assignment)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu təyinatı yeniləməyə icazəniz yoxdur.'
            ], 403);
        }

        $request->validate([
            'assignment_status' => ['required', Rule::in(['accepted', 'in_progress', 'completed', 'rejected'])],
            'assignment_notes' => 'nullable|string',
            'completion_data' => 'nullable|array',
        ]);

        $oldStatus = $assignment->assignment_status;
        
        $assignment->update([
            'assignment_status' => $request->assignment_status,
            'assignment_notes' => $request->assignment_notes,
            'completion_data' => $request->completion_data,
            'assigned_user_id' => $assignment->assigned_user_id ?? $user->id,
        ]);

        // Log progress
        TaskProgressLog::create([
            'task_id' => $assignment->task_id,
            'updated_by' => $user->id,
            'old_status' => $oldStatus,
            'new_status' => $request->assignment_status,
            'progress_percentage' => $this->calculateTaskProgress($assignment->task),
            'notes' => "Assignment for {$assignment->institution->name} updated to {$request->assignment_status}",
        ]);

        // Update main task progress
        $this->updateTaskProgressFromAssignments($assignment->task);

        return response()->json([
            'success' => true,
            'message' => 'Təyinat statusu yeniləndi.',
            'data' => $assignment->fresh(['institution', 'assignedUser'])
        ]);
    }

    /**
     * Get task progress overview
     */
    public function getTaskProgress(Task $task): JsonResponse
    {
        $user = Auth::user();

        if (!$this->canUserAccessTask($user, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırığın irəliləyişini görməyə icazəniz yoxdur.'
            ], 403);
        }

        $assignments = TaskAssignment::where('task_id', $task->id)->get();
        
        $progress = [
            'total_assignments' => $assignments->count(),
            'pending' => $assignments->where('assignment_status', 'pending')->count(),
            'accepted' => $assignments->where('assignment_status', 'accepted')->count(),
            'in_progress' => $assignments->where('assignment_status', 'in_progress')->count(),
            'completed' => $assignments->where('assignment_status', 'completed')->count(),
            'rejected' => $assignments->where('assignment_status', 'rejected')->count(),
            'completion_percentage' => $this->calculateTaskProgress($task),
        ];

        return response()->json([
            'success' => true,
            'data' => $progress
        ]);
    }

    /**
     * Check if user can access task
     */
    private function canUserAccessTask($user, $task): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($task->created_by === $user->id || $task->assigned_to === $user->id) {
            return true;
        }

        if ($user->hasRole(['regionadmin', 'sektoradmin'])) {
            $userInstitutions = $this->getUserInstitutionScope($user);
            return in_array($task->assigned_institution_id, $userInstitutions) ||
                   !empty(array_intersect($task->target_institutions ?? [], $userInstitutions));
        }

        if ($user->hasRole(['schooladmin', 'müəllim'])) {
            return $task->assigned_institution_id === $user->institution_id ||
                   in_array($user->institution_id, $task->target_institutions ?? []);
        }

        return false;
    }

    /**
     * Check if user can update task
     */
    private function canUserUpdateTask($user, $task): bool
    {
        // Creator can always update
        if ($task->created_by === $user->id) {
            return true;
        }

        // Assigned user can update status, progress, and notes
        if ($task->assigned_to === $user->id) {
            return true;
        }

        // SuperAdmin can update any task
        return $user->hasRole('superadmin');
    }

    /**
     * Get user's institution scope based on role
     */
    private function getUserInstitutionScope($user): array
    {
        // This would need to be implemented based on your hierarchy logic
        // For now, return user's institution and children
        if ($user->institution_id) {
            $institution = Institution::find($user->institution_id);
            if ($institution) {
                return $institution->getAllChildrenIds();
            }
        }
        
        return [];
    }

    /**
     * Check if user can update task assignment
     */
    private function canUserUpdateAssignment($user, $assignment): bool
    {
        // SuperAdmin can update any assignment
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Task creator can update assignments
        if ($assignment->task->created_by === $user->id) {
            return true;
        }

        // User from the assigned institution with proper role can update
        if ($user->institution_id === $assignment->institution_id) {
            $userRole = $user->roles->first();
            return $userRole && $userRole->name === $assignment->assigned_role;
        }

        return false;
    }

    /**
     * Calculate task progress based on assignments
     */
    private function calculateTaskProgress($task): int
    {
        $assignments = TaskAssignment::where('task_id', $task->id)->get();
        
        if ($assignments->isEmpty()) {
            return 0;
        }

        $completedAssignments = $assignments->where('assignment_status', 'completed')->count();
        $totalAssignments = $assignments->count();

        return (int) round(($completedAssignments / $totalAssignments) * 100);
    }

    /**
     * Update main task progress from assignments
     */
    private function updateTaskProgressFromAssignments($task): void
    {
        $progress = $this->calculateTaskProgress($task);
        
        $task->update(['progress' => $progress]);

        // If all assignments are completed, mark task as completed
        if ($progress === 100) {
            $task->update([
                'status' => 'completed',
                'completed_at' => now()
            ]);
        } elseif ($progress > 0 && $task->status === 'pending') {
            $task->update(['status' => 'in_progress']);
        }
    }

    /**
     * Create task notification for assignment
     */
    private function createTaskNotification($task, $assignment): void
    {
        // Find users with the assigned role in the target institution
        $users = \App\Models\User::whereHas('roles', function($q) use ($assignment) {
            $q->where('name', $assignment->assigned_role);
        })
        ->where('institution_id', $assignment->institution_id)
        ->get();

        foreach ($users as $user) {
            TaskNotification::create([
                'task_id' => $task->id,
                'user_id' => $user->id,
                'notification_type' => 'assigned',
                'message' => "Sizə yeni tapşırıq təyin edildi: {$task->title}",
                'is_read' => false,
            ]);
        }
    }
}