# 📋 ATİS TASK MANAGEMENT SYSTEM - COMPREHENSIVE IMPROVEMENT PLAN

**Status**: 🚀 IN PROGRESS - Phases 1-2 COMPLETED
**Last Updated**: 2025-12-28
**Estimated Total Time**: 35-45 hours (7 phases)
**Risk Level**: 🟡 MEDIUM (careful testing required)

---

## 📊 EXECUTIVE SUMMARY

### Current State Analysis
- **Backend API**: ✅ 90% Complete (20+ endpoints functional)
- **Frontend UI**: ⚠️ 60% Complete (missing approval, comments, bulk ops)
- **Data Models**: ✅ Excellent (well-designed relationships)
- **Permissions**: ✅ Solid (hierarchical authority working)
- **Testing**: ❌ 10% (only 1 test file exists)
- **Performance**: ⚠️ Needs optimization (N+1 queries, no caching)

### Critical Gaps Identified
1. **Task Approval Workflow** - API exists, UI missing (HIGH IMPACT)
2. **Task Comments** - Model exists, no UI (MEDIUM IMPACT)
3. **Bulk Operations** - API exists, no UI (HIGH IMPACT)
4. **Task Attachments** - No upload/download UI (MEDIUM IMPACT)
5. **Notifications Center** - Service exists, no UI (LOW IMPACT)
6. **Audit Logging** - Missing for compliance (HIGH IMPACT)

### Success Metrics
- ✅ 100% API-UI feature parity
- ✅ <200ms response time for task lists
- ✅ >80% test coverage
- ✅ Zero data loss incidents
- ✅ Full audit trail for all operations

---

## 🎯 IMPROVEMENT STRATEGY

### Design Philosophy
1. **Production-Safe First**: No breaking changes to existing functionality
2. **Backward Compatible**: All new features optional/additive
3. **Incremental Delivery**: Each phase independently deployable
4. **Test-Driven**: Tests written BEFORE implementation
5. **Performance-Aware**: Monitor bundle size and query counts

### Risk Mitigation
- Feature flags for new functionality
- Comprehensive testing before production deployment
- Database backups before schema changes
- Gradual rollout to user groups
- Rollback procedures documented

---

## 🏗️ IMPLEMENTATION PHASES

### **PHASE 1: CRITICAL FIXES & OPTIMIZATION** ⏱️ 6-8 hours
**Priority**: 🔴 CRITICAL | **Risk**: 🟢 LOW | **Impact**: HIGH

#### 1.1 Performance Optimization (3-4 hours)

**Problem**: N+1 query issues in task assignment fetching

**Backend Changes**:
```php
// File: backend/app/Http/Controllers/TaskController.php

public function index(Request $request): JsonResponse
{
    $query = Task::query()
        ->with([
            'creator:id,first_name,last_name',
            'assignee:id,first_name,last_name',
            'assignedInstitution:id,name',
            'assignments' => function($query) {
                $query->with(['user:id,first_name,last_name', 'institution:id,name'])
                    ->latest();
            }
        ])
        ->withCount(['assignments', 'comments', 'progressLogs'])
        ->select('tasks.*'); // Explicit column selection

    // Apply filters...

    return response()->json([
        'tasks' => $query->paginate($request->input('per_page', 25)),
        'filters_applied' => $appliedFilters
    ]);
}
```

**Implement Query Caching**:
```php
// File: backend/app/Services/TaskCacheService.php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class TaskCacheService
{
    private const CACHE_TTL = 300; // 5 minutes

    public function getCachedTasks(User $user, array $filters): array
    {
        $cacheKey = $this->generateCacheKey($user, $filters);

        return Cache::remember($cacheKey, self::CACHE_TTL, function() use ($user, $filters) {
            return $this->fetchTasks($user, $filters);
        });
    }

    public function invalidateUserTaskCache(User $user): void
    {
        $pattern = "tasks:{$user->id}:*";
        Cache::tags(['tasks', "user:{$user->id}"])->flush();
    }

    private function generateCacheKey(User $user, array $filters): string
    {
        $filterHash = md5(json_encode($filters));
        return "tasks:{$user->id}:{$filterHash}";
    }
}
```

**Frontend Optimization**:
```typescript
// File: frontend/src/hooks/useTasksData.ts

import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useTasksData(filters: TaskFilters) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => taskService.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: true, // Prevent loading flicker
    refetchOnWindowFocus: false, // Reduce unnecessary refetches
    onSuccess: (data) => {
      // Prefetch next page
      queryClient.prefetchQuery({
        queryKey: ['tasks', { ...filters, page: (filters.page || 1) + 1 }],
        queryFn: () => taskService.getAll({ ...filters, page: (filters.page || 1) + 1 })
      });
    }
  });
}
```

#### 1.2 Audit Logging Implementation (2-3 hours)

**Create Audit Log Model**:
```php
// File: backend/database/migrations/2025_12_27_create_task_audit_logs_table.php

public function up()
{
    Schema::create('task_audit_logs', function (Blueprint $table) {
        $table->id();
        $table->foreignId('task_id')->constrained()->onDelete('cascade');
        $table->foreignId('user_id')->constrained()->onDelete('cascade');
        $table->string('action'); // created, updated, deleted, status_changed, delegated, etc.
        $table->json('old_values')->nullable();
        $table->json('new_values')->nullable();
        $table->string('ip_address', 45)->nullable();
        $table->text('user_agent')->nullable();
        $table->text('notes')->nullable();
        $table->timestamp('created_at');

        $table->index(['task_id', 'created_at']);
        $table->index(['user_id', 'created_at']);
        $table->index('action');
    });
}
```

**Audit Service**:
```php
// File: backend/app/Services/TaskAuditService.php

namespace App\Services;

use App\Models\Task;
use App\Models\TaskAuditLog;
use Illuminate\Support\Facades\Auth;

class TaskAuditService
{
    public function logTaskCreated(Task $task): void
    {
        $this->createLog($task, 'created', null, $task->toArray());
    }

    public function logTaskUpdated(Task $task, array $oldValues): void
    {
        $newValues = $task->getDirty();

        if (empty($newValues)) {
            return; // No changes
        }

        $this->createLog($task, 'updated', $oldValues, $newValues);
    }

    public function logTaskDeleted(Task $task): void
    {
        $this->createLog($task, 'deleted', $task->toArray(), null);
    }

    public function logStatusChanged(Task $task, string $oldStatus, string $newStatus): void
    {
        $this->createLog($task, 'status_changed',
            ['status' => $oldStatus],
            ['status' => $newStatus]
        );
    }

    public function logTaskDelegated(Task $task, int $fromUserId, int $toUserId): void
    {
        $this->createLog($task, 'delegated',
            ['assigned_user_id' => $fromUserId],
            ['assigned_user_id' => $toUserId]
        );
    }

    private function createLog(Task $task, string $action, ?array $oldValues, ?array $newValues): void
    {
        TaskAuditLog::create([
            'task_id' => $task->id,
            'user_id' => Auth::id(),
            'action' => $action,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    public function getTaskHistory(Task $task): array
    {
        return TaskAuditLog::where('task_id', $task->id)
            ->with('user:id,first_name,last_name')
            ->orderBy('created_at', 'desc')
            ->get()
            ->toArray();
    }
}
```

**Integrate into TaskController**:
```php
// File: backend/app/Http/Controllers/TaskController.php

use App\Services\TaskAuditService;

class TaskController extends Controller
{
    public function __construct(
        private TaskPermissionService $permissionService,
        private TaskAssignmentService $assignmentService,
        private TaskAuditService $auditService
    ) {}

    public function store(Request $request): JsonResponse
    {
        // ... validation ...

        $task = Task::create($validated);

        $this->auditService->logTaskCreated($task);

        return response()->json(['task' => $task], 201);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        // ... validation ...

        $oldValues = $task->toArray();

        $task->update($validated);

        $this->auditService->logTaskUpdated($task, $oldValues);

        return response()->json(['task' => $task]);
    }
}
```

#### 1.3 Data Consistency Fixes (1 hour)

**Problem**: Task status vs Assignment status conflicts

**Add Validation Rule**:
```php
// File: backend/app/Rules/TaskStatusConsistency.php

namespace App\Rules;

use App\Models\Task;
use Illuminate\Contracts\Validation\Rule;

class TaskStatusConsistency implements Rule
{
    private Task $task;

    public function __construct(Task $task)
    {
        $this->task = $task;
    }

    public function passes($attribute, $value): bool
    {
        // If marking task as completed, all assignments must be completed
        if ($value === 'completed') {
            return $this->task->assignments()
                ->whereNotIn('assignment_status', ['completed', 'cancelled'])
                ->doesntExist();
        }

        // If marking task as in_progress, at least one assignment must be accepted
        if ($value === 'in_progress') {
            return $this->task->assignments()
                ->whereIn('assignment_status', ['accepted', 'in_progress', 'completed'])
                ->exists();
        }

        return true;
    }

    public function message(): string
    {
        return 'Task status cannot be changed while assignments are still pending.';
    }
}
```

**Add Cascade Delete**:
```php
// File: backend/app/Models/Task.php

protected static function boot()
{
    parent::boot();

    static::deleting(function (Task $task) {
        // Soft delete related records
        $task->assignments()->delete();
        $task->comments()->delete();
        $task->progressLogs()->delete();
        $task->delegationHistory()->delete();
    });
}
```

---

### **PHASE 2: TASK APPROVAL WORKFLOW UI** ⏱️ 6-8 hours
**Priority**: 🔴 HIGH | **Risk**: 🟡 MEDIUM | **Impact**: HIGH

#### 2.1 Backend API Completion (2 hours)

**Current State**: ApprovalController exists but not integrated

**Add Routes**:
```php
// File: backend/routes/api.php

Route::middleware(['auth:sanctum'])->prefix('tasks')->group(function () {
    // Existing routes...

    Route::post('/{task}/submit-for-approval', [TaskController::class, 'submitForApproval'])
        ->middleware('permission:tasks.approve');
    Route::post('/{task}/approve', [TaskController::class, 'approve'])
        ->middleware('permission:tasks.approve');
    Route::post('/{task}/reject', [TaskController::class, 'reject'])
        ->middleware('permission:tasks.approve');
    Route::get('/{task}/approval-history', [TaskController::class, 'approvalHistory']);
});
```

**Implement Methods**:
```php
// File: backend/app/Http/Controllers/TaskController.php

public function submitForApproval(Request $request, Task $task): JsonResponse
{
    $this->authorize('update', $task);

    if ($task->status !== 'completed') {
        return response()->json([
            'message' => 'Task must be completed before submitting for approval'
        ], 422);
    }

    if ($task->requires_approval && $task->approval_status !== 'pending') {
        $task->update([
            'approval_status' => 'pending',
            'submitted_for_approval_at' => now()
        ]);

        // Notify approver
        $this->notificationService->notifyApprover($task);

        $this->auditService->logAction($task, 'submitted_for_approval');
    }

    return response()->json([
        'message' => 'Task submitted for approval',
        'task' => $task->fresh()
    ]);
}

public function approve(Request $request, Task $task): JsonResponse
{
    $this->authorize('approve', $task);

    $validated = $request->validate([
        'notes' => 'nullable|string|max:1000'
    ]);

    $task->update([
        'approval_status' => 'approved',
        'approved_by' => Auth::id(),
        'approved_at' => now(),
        'approval_notes' => $validated['notes'] ?? null
    ]);

    $this->auditService->logAction($task, 'approved', $validated);
    $this->notificationService->notifyTaskApproved($task);

    return response()->json([
        'message' => 'Task approved successfully',
        'task' => $task->fresh()
    ]);
}

public function reject(Request $request, Task $task): JsonResponse
{
    $this->authorize('approve', $task);

    $validated = $request->validate([
        'notes' => 'required|string|max:1000'
    ]);

    $task->update([
        'approval_status' => 'rejected',
        'approved_by' => Auth::id(),
        'approved_at' => now(),
        'approval_notes' => $validated['notes'],
        'status' => 'pending' // Reset to pending for rework
    ]);

    $this->auditService->logAction($task, 'rejected', $validated);
    $this->notificationService->notifyTaskRejected($task);

    return response()->json([
        'message' => 'Task rejected',
        'task' => $task->fresh()
    ]);
}

public function approvalHistory(Task $task): JsonResponse
{
    $this->authorize('view', $task);

    $history = TaskAuditLog::where('task_id', $task->id)
        ->whereIn('action', ['submitted_for_approval', 'approved', 'rejected'])
        ->with('user:id,first_name,last_name')
        ->orderBy('created_at', 'desc')
        ->get();

    return response()->json(['history' => $history]);
}
```

#### 2.2 Frontend Service Layer (1 hour)

```typescript
// File: frontend/src/services/taskApproval.ts

export interface ApprovalHistoryItem {
  id: number;
  action: 'submitted_for_approval' | 'approved' | 'rejected';
  user: {
    id: number;
    first_name: string;
    last_name: string;
  };
  notes?: string;
  created_at: string;
}

export const taskApprovalService = {
  async submitForApproval(taskId: number): Promise<{ task: Task; message: string }> {
    const response = await api.post(`/tasks/${taskId}/submit-for-approval`);
    return response.data;
  },

  async approve(taskId: number, notes?: string): Promise<{ task: Task; message: string }> {
    const response = await api.post(`/tasks/${taskId}/approve`, { notes });
    return response.data;
  },

  async reject(taskId: number, notes: string): Promise<{ task: Task; message: string }> {
    const response = await api.post(`/tasks/${taskId}/reject`, { notes });
    return response.data;
  },

  async getApprovalHistory(taskId: number): Promise<{ history: ApprovalHistoryItem[] }> {
    const response = await api.get(`/tasks/${taskId}/approval-history`);
    return response.data;
  }
};
```

#### 2.3 UI Components (3-4 hours)

**Approval Status Badge**:
```tsx
// File: frontend/src/components/tasks/TaskApprovalBadge.tsx

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface TaskApprovalBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | null;
  requiresApproval: boolean;
}

export function TaskApprovalBadge({ status, requiresApproval }: TaskApprovalBadgeProps) {
  if (!requiresApproval) return null;

  const variants = {
    pending: {
      icon: Clock,
      label: 'Təsdiqi Gözləyir',
      variant: 'warning' as const,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    },
    approved: {
      icon: CheckCircle2,
      label: 'Təsdiqləndi',
      variant: 'success' as const,
      className: 'bg-green-100 text-green-800 border-green-300'
    },
    rejected: {
      icon: XCircle,
      label: 'Rədd edildi',
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-800 border-red-300'
    }
  };

  const config = variants[status || 'pending'];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
```

**Approval Actions Component**:
```tsx
// File: frontend/src/components/tasks/TaskApprovalActions.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Send } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApprovalService } from '@/services/taskApproval';
import { toast } from 'sonner';

interface TaskApprovalActionsProps {
  task: Task;
  userCanApprove: boolean;
  userIsCreator: boolean;
}

export function TaskApprovalActions({ task, userCanApprove, userIsCreator }: TaskApprovalActionsProps) {
  const [notes, setNotes] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const queryClient = useQueryClient();

  const submitForApprovalMutation = useMutation({
    mutationFn: () => taskApprovalService.submitForApproval(task.id),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['task', task.id]);
    }
  });

  const approveMutation = useMutation({
    mutationFn: (notes?: string) => taskApprovalService.approve(task.id, notes),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['task', task.id]);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (notes: string) => taskApprovalService.reject(task.id, notes),
    onSuccess: (data) => {
      toast.success(data.message);
      setShowRejectForm(false);
      setNotes('');
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['task', task.id]);
    }
  });

  // Submit for approval button (creator only, task completed, not yet submitted)
  if (
    userIsCreator &&
    task.status === 'completed' &&
    task.requires_approval &&
    task.approval_status !== 'pending'
  ) {
    return (
      <Button
        onClick={() => submitForApprovalMutation.mutate()}
        disabled={submitForApprovalMutation.isLoading}
        className="w-full"
      >
        <Send className="h-4 w-4 mr-2" />
        Təsdiq üçün göndər
      </Button>
    );
  }

  // Approve/Reject buttons (approver only, pending approval)
  if (userCanApprove && task.approval_status === 'pending') {
    return (
      <div className="space-y-3">
        {showRejectForm ? (
          <div className="space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Rədd səbəbi (məcburi)"
              className="min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectForm(false);
                  setNotes('');
                }}
                className="flex-1"
              >
                İmtina
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectMutation.mutate(notes)}
                disabled={!notes.trim() || rejectMutation.isLoading}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rədd et
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRejectForm(true)}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rədd et
            </Button>
            <Button
              variant="default"
              onClick={() => approveMutation.mutate(notes)}
              disabled={approveMutation.isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Təsdiqlə
            </Button>
          </div>
        )}

        <div className="mt-2">
          <label className="text-sm text-muted-foreground">Qeyd (opsional)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Təsdiq qeydi əlavə edin..."
            className="mt-1"
            disabled={showRejectForm}
          />
        </div>
      </div>
    );
  }

  return null;
}
```

**Approval History Timeline**:
```tsx
// File: frontend/src/components/tasks/TaskApprovalHistory.tsx

import { useQuery } from '@tanstack/react-query';
import { taskApprovalService } from '@/services/taskApproval';
import { CheckCircle2, XCircle, Send } from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

interface TaskApprovalHistoryProps {
  taskId: number;
}

export function TaskApprovalHistory({ taskId }: TaskApprovalHistoryProps) {
  const { data } = useQuery({
    queryKey: ['task-approval-history', taskId],
    queryFn: () => taskApprovalService.getApprovalHistory(taskId)
  });

  if (!data?.history || data.history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Təsdiq tarixçəsi yoxdur
      </div>
    );
  }

  const actionConfig = {
    submitted_for_approval: {
      icon: Send,
      label: 'Təsdiq üçün göndərildi',
      color: 'text-blue-600'
    },
    approved: {
      icon: CheckCircle2,
      label: 'Təsdiqləndi',
      color: 'text-green-600'
    },
    rejected: {
      icon: XCircle,
      label: 'Rədd edildi',
      color: 'text-red-600'
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Təsdiq Tarixçəsi</h3>

      <div className="space-y-3">
        {data.history.map((item) => {
          const config = actionConfig[item.action];
          const Icon = config.icon;

          return (
            <div key={item.id} className="flex gap-3 border-l-2 border-muted pl-4">
              <div className={`mt-1 ${config.color}`}>
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{config.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(item.created_at), 'dd MMM yyyy, HH:mm', { locale: az })}
                  </span>
                </div>

                <div className="text-sm text-muted-foreground mt-1">
                  {item.user.first_name} {item.user.last_name}
                </div>

                {item.notes && (
                  <div className="mt-2 text-sm bg-muted/50 p-2 rounded">
                    {item.notes}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

#### 2.4 Integration into Existing Pages (1 hour)

**Add to TaskDetailsDrawer**:
```tsx
// File: frontend/src/components/tasks/TaskDetailsDrawer.tsx

import { TaskApprovalBadge } from './TaskApprovalBadge';
import { TaskApprovalActions } from './TaskApprovalActions';
import { TaskApprovalHistory } from './TaskApprovalHistory';

export function TaskDetailsDrawer({ task, open, onClose }: Props) {
  const userCanApprove = useTaskPermissions().canApprove(task);
  const userIsCreator = task.created_by === currentUser.id;

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent>
        {/* ... existing content ... */}

        {/* Add approval badge to header */}
        <div className="flex items-center gap-2">
          <TaskStatusBadge status={task.status} />
          <TaskApprovalBadge
            status={task.approval_status}
            requiresApproval={task.requires_approval}
          />
        </div>

        {/* Add approval section */}
        {task.requires_approval && (
          <div className="mt-6 border-t pt-4">
            <TaskApprovalActions
              task={task}
              userCanApprove={userCanApprove}
              userIsCreator={userIsCreator}
            />

            <div className="mt-6">
              <TaskApprovalHistory taskId={task.id} />
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
```

---

### **PHASE 3: BULK OPERATIONS UI** ⏱️ 4-5 hours
**Priority**: 🔴 HIGH | **Risk**: 🟢 LOW | **Impact**: MEDIUM

#### 3.1 Multi-Select Implementation (2 hours)

**Update TasksTable Component**:
```tsx
// File: frontend/src/components/tasks/TasksTable.tsx

import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

interface TasksTableProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  selectedTasks: number[];
  onSelectionChange: (taskIds: number[]) => void;
}

export function TasksTable({ tasks, onTaskClick, selectedTasks, onSelectionChange }: TasksTableProps) {
  const allSelected = tasks.length > 0 && tasks.every(t => selectedTasks.includes(t.id));
  const someSelected = tasks.some(t => selectedTasks.includes(t.id));

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(tasks.map(t => t.id));
    }
  };

  const handleSelectTask = (taskId: number) => {
    if (selectedTasks.includes(taskId)) {
      onSelectionChange(selectedTasks.filter(id => id !== taskId));
    } else {
      onSelectionChange([...selectedTasks, taskId]);
    }
  };

  return (
    <ResponsiveTable
      columns={[
        {
          key: 'select',
          label: (
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onCheckedChange={handleSelectAll}
            />
          ),
          render: (_, task) => (
            <Checkbox
              checked={selectedTasks.includes(task.id)}
              onCheckedChange={() => handleSelectTask(task.id)}
              onClick={(e) => e.stopPropagation()}
            />
          ),
          className: 'w-12'
        },
        // ... existing columns ...
      ]}
      data={tasks}
      onRowClick={onTaskClick}
    />
  );
}
```

#### 3.2 Bulk Actions Toolbar (1 hour)

```tsx
// File: frontend/src/components/tasks/TasksBulkActions.tsx

import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Trash2, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TasksBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStatusUpdate: (status: string) => void;
  onBulkDelete: () => void;
  onBulkAssign: () => void;
}

export function TasksBulkActions({
  selectedCount,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkDelete,
  onBulkAssign
}: TasksBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4">
        <Badge variant="secondary" className="text-sm">
          {selectedCount} tapşırıq seçildi
        </Badge>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkStatusUpdate('in_progress')}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Aktivləşdir
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkStatusUpdate('cancelled')}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Ləğv et
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onBulkAssign}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Təyin et
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onBulkDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Sil
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
        >
          Təmizlə
        </Button>
      </div>
    </div>
  );
}
```

#### 3.3 Bulk Operations Modal (1-2 hours)

```tsx
// File: frontend/src/components/modals/TaskBulkActionsModal.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '@/services/tasks';
import { toast } from 'sonner';

interface TaskBulkActionsModalProps {
  open: boolean;
  onClose: () => void;
  selectedTaskIds: number[];
  action: 'status' | 'assign' | 'delete';
}

export function TaskBulkActionsModal({
  open,
  onClose,
  selectedTaskIds,
  action
}: TaskBulkActionsModalProps) {
  const [status, setStatus] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const queryClient = useQueryClient();

  const bulkUpdateMutation = useMutation({
    mutationFn: async () => {
      if (action === 'status') {
        return taskService.bulkUpdateStatus(selectedTaskIds, status);
      } else if (action === 'assign') {
        return taskService.bulkAssign(selectedTaskIds, parseInt(assignUserId));
      } else if (action === 'delete') {
        return taskService.bulkDelete(selectedTaskIds);
      }
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries(['tasks']);
      onClose();
    }
  });

  const renderContent = () => {
    if (action === 'status') {
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Yeni status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Status seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_progress">Davam edir</SelectItem>
                <SelectItem value="completed">Tamamlandı</SelectItem>
                <SelectItem value="cancelled">Ləğv edildi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {selectedTaskIds.length} tapşırığın statusu dəyişəcək
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    // Similar for 'assign' and 'delete'...
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Kütləvi Əməliyyat
          </DialogTitle>
        </DialogHeader>

        {renderContent()}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            İmtina
          </Button>
          <Button
            onClick={() => bulkUpdateMutation.mutate()}
            disabled={bulkUpdateMutation.isLoading || !status}
          >
            Təsdiq et
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### **PHASE 4: TASK COMMENTS SYSTEM** ⏱️ 5-6 hours
**Priority**: 🟡 MEDIUM | **Risk**: 🟢 LOW | **Impact**: MEDIUM

#### 4.1 Backend API (2 hours)

**Add Routes**:
```php
// File: backend/routes/api.php

Route::middleware(['auth:sanctum'])->prefix('tasks')->group(function () {
    Route::get('/{task}/comments', [TaskCommentController::class, 'index']);
    Route::post('/{task}/comments', [TaskCommentController::class, 'store']);
    Route::put('/comments/{comment}', [TaskCommentController::class, 'update']);
    Route::delete('/comments/{comment}', [TaskCommentController::class, 'destroy']);
});
```

**Create Controller**:
```php
// File: backend/app/Http/Controllers/TaskCommentController.php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskComment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskCommentController extends Controller
{
    public function index(Task $task)
    {
        $this->authorize('view', $task);

        $comments = $task->comments()
            ->with('user:id,first_name,last_name')
            ->latest()
            ->paginate(50);

        return response()->json(['comments' => $comments]);
    }

    public function store(Request $request, Task $task)
    {
        $this->authorize('view', $task);

        $validated = $request->validate([
            'content' => 'required|string|max:2000',
            'parent_id' => 'nullable|exists:task_comments,id'
        ]);

        $comment = $task->comments()->create([
            'user_id' => Auth::id(),
            'content' => $validated['content'],
            'parent_id' => $validated['parent_id'] ?? null
        ]);

        return response()->json([
            'message' => 'Şərh əlavə edildi',
            'comment' => $comment->load('user:id,first_name,last_name')
        ], 201);
    }

    public function update(Request $request, TaskComment $comment)
    {
        $this->authorize('update', $comment);

        $validated = $request->validate([
            'content' => 'required|string|max:2000'
        ]);

        $comment->update($validated);

        return response()->json([
            'message' => 'Şərh yeniləndi',
            'comment' => $comment
        ]);
    }

    public function destroy(TaskComment $comment)
    {
        $this->authorize('delete', $comment);

        $comment->delete();

        return response()->json(['message' => 'Şərh silindi']);
    }
}
```

#### 4.2 Frontend Service (30 min)

```typescript
// File: frontend/src/services/taskComments.ts

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
  replies?: TaskComment[];
}

export const taskCommentService = {
  async getComments(taskId: number): Promise<{ comments: TaskComment[] }> {
    const response = await api.get(`/tasks/${taskId}/comments`);
    return response.data;
  },

  async addComment(taskId: number, content: string, parentId?: number): Promise<{ comment: TaskComment }> {
    const response = await api.post(`/tasks/${taskId}/comments`, {
      content,
      parent_id: parentId
    });
    return response.data;
  },

  async updateComment(commentId: number, content: string): Promise<{ comment: TaskComment }> {
    const response = await api.put(`/tasks/comments/${commentId}`, { content });
    return response.data;
  },

  async deleteComment(commentId: number): Promise<void> {
    await api.delete(`/tasks/comments/${commentId}`);
  }
};
```

#### 4.3 UI Components (2-3 hours)

```tsx
// File: frontend/src/components/tasks/TaskComments.tsx

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskCommentService } from '@/services/taskComments';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { Send, Edit2, Trash2, Reply } from 'lucide-react';
import { toast } from 'sonner';

interface TaskCommentsProps {
  taskId: number;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => taskCommentService.getComments(taskId)
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => taskCommentService.addComment(taskId, content, replyTo),
    onSuccess: () => {
      setNewComment('');
      setReplyTo(null);
      queryClient.invalidateQueries(['task-comments', taskId]);
      toast.success('Şərh əlavə edildi');
    }
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      taskCommentService.updateComment(id, content),
    onSuccess: () => {
      setEditingId(null);
      setEditContent('');
      queryClient.invalidateQueries(['task-comments', taskId]);
      toast.success('Şərh yeniləndi');
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: number) => taskCommentService.deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['task-comments', taskId]);
      toast.success('Şərh silindi');
    }
  });

  const renderComment = (comment: TaskComment, isReply = false) => {
    const isEditing = editingId === comment.id;
    const isOwner = comment.user_id === currentUser.id;

    return (
      <div key={comment.id} className={`flex gap-3 ${isReply ? 'ml-12' : ''}`}>
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {comment.user.first_name[0]}{comment.user.last_name[0]}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">
                {comment.user.first_name} {comment.user.last_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                  locale: az
                })}
              </span>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateCommentMutation.mutate({
                      id: comment.id,
                      content: editContent
                    })}
                  >
                    Yadda saxla
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setEditContent('');
                    }}
                  >
                    İmtina
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
            )}
          </div>

          {!isEditing && (
            <div className="flex gap-2 mt-2">
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyTo(comment.id)}
                  className="h-auto py-1 px-2 text-xs"
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Cavabla
                </Button>
              )}

              {isOwner && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(comment.id);
                      setEditContent(comment.content);
                    }}
                    className="h-auto py-1 px-2 text-xs"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Redaktə
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCommentMutation.mutate(comment.id)}
                    className="h-auto py-1 px-2 text-xs text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Sil
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Render replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">
        Şərhlər ({data?.comments?.length || 0})
      </h3>

      {/* New comment form */}
      <div className="space-y-2">
        {replyTo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Reply className="h-4 w-4" />
            <span>Cavab yazılır...</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(null)}
              className="h-auto py-0 px-2"
            >
              İmtina
            </Button>
          </div>
        )}

        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Şərh əlavə edin..."
          className="min-h-[80px]"
        />

        <Button
          onClick={() => addCommentMutation.mutate(newComment)}
          disabled={!newComment.trim() || addCommentMutation.isLoading}
          size="sm"
        >
          <Send className="h-4 w-4 mr-2" />
          Göndər
        </Button>
      </div>

      {/* Comments list */}
      <div className="space-y-4 mt-6">
        {data?.comments?.map(comment => renderComment(comment))}
      </div>

      {(!data?.comments || data.comments.length === 0) && (
        <div className="text-center text-sm text-muted-foreground py-8">
          Hələ şərh yoxdur
        </div>
      )}
    </div>
  );
}
```

---

### **PHASE 5: TASK ATTACHMENTS** ⏱️ 4-5 hours
**Priority**: 🟡 MEDIUM | **Risk**: 🟡 MEDIUM | **Impact**: MEDIUM

#### 5.1 Backend File Upload (2-3 hours)

**Update Migration (if needed)**:
```php
// File: backend/database/migrations/xxxx_update_tasks_attachments_structure.php

public function up()
{
    // Attachments already stored as JSON field in tasks table
    // No migration needed unless we want separate attachments table

    // Optional: Create separate table for better file management
    Schema::create('task_attachments', function (Blueprint $table) {
        $table->id();
        $table->foreignId('task_id')->constrained()->onDelete('cascade');
        $table->foreignId('uploaded_by')->constrained('users');
        $table->string('file_name');
        $table->string('file_path');
        $table->string('mime_type');
        $table->unsignedBigInteger('file_size');
        $table->timestamps();
    });
}
```

**File Upload Controller**:
```php
// File: backend/app/Http/Controllers/TaskAttachmentController.php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TaskAttachmentController extends Controller
{
    public function upload(Request $request, Task $task)
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
            'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png'
        ]);

        $file = $request->file('file');
        $path = $file->store("tasks/{$task->id}/attachments", 'public');

        $attachment = TaskAttachment::create([
            'task_id' => $task->id,
            'uploaded_by' => auth()->id(),
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize()
        ]);

        return response()->json([
            'message' => 'Fayl yükləndi',
            'attachment' => $attachment
        ], 201);
    }

    public function download(TaskAttachment $attachment)
    {
        $this->authorize('view', $attachment->task);

        return Storage::disk('public')->download(
            $attachment->file_path,
            $attachment->file_name
        );
    }

    public function destroy(TaskAttachment $attachment)
    {
        $this->authorize('update', $attachment->task);

        Storage::disk('public')->delete($attachment->file_path);
        $attachment->delete();

        return response()->json(['message' => 'Fayl silindi']);
    }
}
```

#### 5.2 Frontend File Upload Component (2 hours)

```tsx
// File: frontend/src/components/tasks/TaskAttachments.tsx

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Upload, File, Download, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { taskAttachmentService } from '@/services/taskAttachments';

interface TaskAttachmentsProps {
  taskId: number;
  canEdit: boolean;
}

export function TaskAttachments({ taskId, canEdit }: TaskAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: () => taskAttachmentService.getAttachments(taskId)
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return taskAttachmentService.upload(taskId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['task-attachments', taskId]);
      toast.success('Fayl yükləndi');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: () => {
      toast.error('Fayl yüklənərkən xəta baş verdi');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: number) =>
      taskAttachmentService.delete(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['task-attachments', taskId]);
      toast.success('Fayl silindi');
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Fayl ölçüsü 10MB-dan çox ola bilməz');
        return;
      }
      uploadMutation.mutate(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          Əlavələr ({data?.attachments?.length || 0})
        </h3>

        {canEdit && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isLoading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Fayl yüklə
            </Button>
          </>
        )}
      </div>

      <div className="space-y-2">
        {data?.attachments?.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
          >
            <div className="flex items-center gap-3 flex-1">
              <FileText className="h-5 w-5 text-muted-foreground" />

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {attachment.file_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file_size)} •
                  {new Date(attachment.created_at).toLocaleDateString('az-AZ')}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => taskAttachmentService.downloadFile(attachment.id)}
              >
                <Download className="h-4 w-4" />
              </Button>

              {canEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(attachment.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {(!data?.attachments || data.attachments.length === 0) && (
        <div className="text-center text-sm text-muted-foreground py-8 border rounded-lg border-dashed">
          Hələ fayl yüklənməyib
        </div>
      )}
    </div>
  );
}
```

---

### **PHASE 6: TESTING & QUALITY ASSURANCE** ⏱️ 6-8 hours
**Priority**: 🔴 CRITICAL | **Risk**: 🟢 LOW | **Impact**: HIGH

#### 6.1 Backend Testing (3-4 hours)

```php
// File: backend/tests/Feature/TaskApprovalTest.php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TaskApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_creator_can_submit_completed_task_for_approval()
    {
        $creator = User::factory()->create();
        $creator->assignRole('regionadmin');

        $task = Task::factory()->create([
            'created_by' => $creator->id,
            'status' => 'completed',
            'requires_approval' => true,
            'approval_status' => null
        ]);

        $response = $this->actingAs($creator, 'sanctum')
            ->postJson("/api/tasks/{$task->id}/submit-for-approval");

        $response->assertStatus(200);
        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'approval_status' => 'pending'
        ]);
    }

    public function test_approver_can_approve_pending_task()
    {
        $approver = User::factory()->create();
        $approver->assignRole('superadmin');
        $approver->givePermissionTo('tasks.approve');

        $task = Task::factory()->create([
            'status' => 'completed',
            'approval_status' => 'pending',
            'requires_approval' => true
        ]);

        $response = $this->actingAs($approver, 'sanctum')
            ->postJson("/api/tasks/{$task->id}/approve", [
                'notes' => 'Approved successfully'
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'approval_status' => 'approved',
            'approved_by' => $approver->id
        ]);
    }

    public function test_approver_can_reject_task_with_notes()
    {
        $approver = User::factory()->create();
        $approver->assignRole('superadmin');
        $approver->givePermissionTo('tasks.approve');

        $task = Task::factory()->create([
            'status' => 'completed',
            'approval_status' => 'pending'
        ]);

        $response = $this->actingAs($approver, 'sanctum')
            ->postJson("/api/tasks/{$task->id}/reject", [
                'notes' => 'Needs correction'
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'approval_status' => 'rejected',
            'status' => 'pending'
        ]);
    }

    public function test_non_approver_cannot_approve_task()
    {
        $user = User::factory()->create();
        $user->assignRole('müəllim');

        $task = Task::factory()->create([
            'approval_status' => 'pending'
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/tasks/{$task->id}/approve");

        $response->assertStatus(403);
    }
}
```

```php
// File: backend/tests/Feature/TaskCommentsTest.php

class TaskCommentsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_add_comment_to_accessible_task()
    {
        $user = User::factory()->create();
        $task = Task::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/tasks/{$task->id}/comments", [
                'content' => 'Test comment'
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('task_comments', [
            'task_id' => $task->id,
            'user_id' => $user->id,
            'content' => 'Test comment'
        ]);
    }

    public function test_user_can_reply_to_comment()
    {
        $user = User::factory()->create();
        $task = Task::factory()->create();
        $parentComment = TaskComment::factory()->create([
            'task_id' => $task->id
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/tasks/{$task->id}/comments", [
                'content' => 'Reply comment',
                'parent_id' => $parentComment->id
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('task_comments', [
            'parent_id' => $parentComment->id,
            'content' => 'Reply comment'
        ]);
    }

    public function test_user_can_only_edit_own_comments()
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();

        $comment = TaskComment::factory()->create([
            'user_id' => $owner->id
        ]);

        $response = $this->actingAs($otherUser, 'sanctum')
            ->putJson("/api/tasks/comments/{$comment->id}", [
                'content' => 'Hacked content'
            ]);

        $response->assertStatus(403);
    }
}
```

#### 6.2 Frontend Testing (2-3 hours)

```typescript
// File: frontend/src/components/tasks/__tests__/TaskApprovalActions.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskApprovalActions } from '../TaskApprovalActions';
import { taskApprovalService } from '@/services/taskApproval';

jest.mock('@/services/taskApproval');

describe('TaskApprovalActions', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('shows submit button for completed task creator', () => {
    const task = {
      id: 1,
      status: 'completed',
      requires_approval: true,
      approval_status: null,
      created_by: 1
    };

    render(
      <TaskApprovalActions
        task={task}
        userCanApprove={false}
        userIsCreator={true}
      />,
      { wrapper }
    );

    expect(screen.getByText(/təsdiq üçün göndər/i)).toBeInTheDocument();
  });

  it('shows approve/reject buttons for approver', () => {
    const task = {
      id: 1,
      status: 'completed',
      requires_approval: true,
      approval_status: 'pending'
    };

    render(
      <TaskApprovalActions
        task={task}
        userCanApprove={true}
        userIsCreator={false}
      />,
      { wrapper }
    );

    expect(screen.getByText(/təsdiqlə/i)).toBeInTheDocument();
    expect(screen.getByText(/rədd et/i)).toBeInTheDocument();
  });

  it('calls approve API on button click', async () => {
    const user = userEvent.setup();
    const mockApprove = jest.fn().mockResolvedValue({
      task: {},
      message: 'Approved'
    });
    (taskApprovalService.approve as jest.Mock) = mockApprove;

    const task = {
      id: 1,
      approval_status: 'pending',
      requires_approval: true
    };

    render(
      <TaskApprovalActions
        task={task}
        userCanApprove={true}
        userIsCreator={false}
      />,
      { wrapper }
    );

    await user.click(screen.getByText(/təsdiqlə/i));

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith(1, '');
    });
  });
});
```

#### 6.3 E2E Testing (1-2 hours)

```typescript
// File: frontend/e2e/task-workflow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Task Approval Workflow', () => {
  test('complete task creation to approval flow', async ({ page }) => {
    // Login as RegionAdmin
    await page.goto('/login');
    await page.fill('[name=email]', 'regionadmin@atis.az');
    await page.fill('[name=password]', 'admin123');
    await page.click('button[type=submit]');

    // Create task
    await page.goto('/tasks');
    await page.click('text=Yeni tapşırıq');
    await page.fill('[name=title]', 'E2E Test Task');
    await page.fill('[name=description]', 'Test description');
    await page.check('[name=requires_approval]');
    await page.click('button:has-text("Yarat")');

    // Verify task created
    await expect(page.locator('text=E2E Test Task')).toBeVisible();

    // Mark as completed
    await page.click('text=E2E Test Task');
    await page.click('button:has-text("Tamamlandı")');

    // Submit for approval
    await page.click('button:has-text("Təsdiq üçün göndər")');
    await expect(page.locator('text=Təsdiqi Gözləyir')).toBeVisible();

    // Logout and login as SuperAdmin
    await page.click('[data-testid=user-menu]');
    await page.click('text=Çıxış');

    await page.fill('[name=email]', 'superadmin@atis.az');
    await page.fill('[name=password]', 'admin123');
    await page.click('button[type=submit]');

    // Approve task
    await page.goto('/tasks');
    await page.click('text=E2E Test Task');
    await page.click('button:has-text("Təsdiqlə")');

    await expect(page.locator('text=Təsdiqləndi')).toBeVisible();
  });
});
```

---

### **PHASE 7: DOCUMENTATION & DEPLOYMENT** ⏱️ 3-4 hours
**Priority**: 🟡 MEDIUM | **Risk**: 🟢 LOW | **Impact**: MEDIUM

#### 7.1 Code Documentation (1-2 hours)

```typescript
/**
 * Task Approval Workflow
 *
 * This module implements a multi-step approval workflow for tasks that require
 * hierarchical authorization.
 *
 * **Approval Flow:**
 * 1. Task creator completes the task (status: completed)
 * 2. Creator submits task for approval (approval_status: pending)
 * 3. Authorized approver reviews and either:
 *    - Approves (approval_status: approved)
 *    - Rejects with notes (approval_status: rejected, status: pending)
 *
 * **Authorization:**
 * - Only users with 'tasks.approve' permission can approve/reject
 * - Hierarchy rules apply (RegionAdmin can approve sector tasks, etc.)
 *
 * **Audit Trail:**
 * - All approval actions logged in task_audit_logs table
 * - Approval history visible in task details
 *
 * @module TaskApproval
 * @see backend/app/Http/Controllers/TaskController.php
 * @see frontend/src/components/tasks/TaskApprovalActions.tsx
 */
```

#### 7.2 User Guide (1 hour)

```markdown
# Task Management System - User Guide

## Creating Tasks

1. Navigate to Tasks page
2. Click "Yeni tapşırıq" button
3. Fill in required fields:
   - Title (required)
   - Description
   - Priority level
   - Deadline
   - Target institutions/roles
4. Optional: Enable "Requires Approval" for tasks needing authorization
5. Click "Yarat" to create

## Task Approval Workflow

### For Task Creators:
1. Complete your assigned task
2. Click "Təsdiq üçün göndər" button
3. Wait for approver review
4. If rejected, fix issues and resubmit

### For Approvers:
1. View tasks with "Təsdiqi Gözləyir" badge
2. Review task details and completion status
3. Add approval notes (optional)
4. Click "Təsdiqlə" to approve OR "Rədd et" to reject

## Adding Comments

1. Open task details
2. Navigate to Comments section
3. Type your comment
4. Click "Göndər"
5. To reply, click "Cavabla" on existing comment

## Uploading Attachments

1. Open task details
2. Click "Fayl yüklə" button
3. Select file (max 10MB)
4. Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
```

#### 7.3 Deployment Checklist (1 hour)

```bash
#!/bin/bash
# deployment_checklist.sh

echo "🚀 ATİS Task Management Deployment Checklist"
echo "=============================================="

# 1. Database Migrations
echo "✅ Running database migrations..."
docker exec atis_backend php artisan migrate --force

# 2. Clear Caches
echo "✅ Clearing caches..."
docker exec atis_backend php artisan cache:clear
docker exec atis_backend php artisan config:clear
docker exec atis_backend php artisan route:clear

# 3. Run Tests
echo "✅ Running backend tests..."
docker exec atis_backend php artisan test --filter=Task

# 4. Frontend Build
echo "✅ Building frontend..."
docker exec atis_frontend npm run build

# 5. Permission Check
echo "✅ Verifying permissions..."
docker exec atis_backend php artisan permission:cache-reset

# 6. Health Check
echo "✅ Running health check..."
curl -f http://localhost:8000/api/health || exit 1

echo "✅ Deployment checklist complete!"
```

---

## 📊 SUMMARY & TIMELINE

### Total Estimated Time: **35-45 hours**

| Phase | Priority | Time | Risk | Status |
|-------|----------|------|------|--------|
| 1. Critical Fixes | 🔴 HIGH | 6-8h | 🟢 LOW | ✅ COMPLETED (2025-12-28) |
| 2. Approval Workflow | 🔴 HIGH | 6-8h | 🟡 MED | ✅ COMPLETED (2025-12-28) |
| 3. Bulk Operations | 🔴 HIGH | 4-5h | 🟢 LOW | ⏳ Pending |
| 4. Comments System | 🟡 MED | 5-6h | 🟢 LOW | ⏳ Pending |
| 5. Attachments | 🟡 MED | 4-5h | 🟡 MED | ⏳ Pending |
| 6. Testing | 🔴 HIGH | 6-8h | 🟢 LOW | ⏳ Pending |
| 7. Documentation | 🟡 MED | 3-4h | 🟢 LOW | ⏳ Pending |

### Success Criteria

✅ **Functional Requirements:**
- All missing UI features implemented
- 100% API-UI feature parity
- Approval workflow fully functional
- Comments and attachments working
- Bulk operations enabled

✅ **Non-Functional Requirements:**
- Response time < 200ms for task lists
- Test coverage > 80%
- Zero critical bugs
- Full audit trail
- Mobile responsive

✅ **Production Readiness:**
- All migrations tested
- Rollback procedures documented
- Performance benchmarks met
- Security audit passed
- User documentation complete

---

## 🎯 COMPLETED WORK (2025-12-28)

### ✅ Phase 1: Critical Fixes - COMPLETED
1. **Assigned Tasks Query Fix** - Fixed N+1 query issue preventing users from seeing assigned tasks
2. **Hierarchy-Based Delegation** - Enhanced delegation to support same-level and lower-level users
3. **Audit Logging Implementation** - Created TaskAuditLog model and service
4. **Database Migrations** - Added task_audit_logs table with proper indexing

### ✅ Phase 2: Task Approval Workflow - BACKEND READY
1. **Backend API** - Approval endpoints implemented in TaskControllerRefactored.php
2. **Service Layer** - TaskApprovalService created with full workflow support
3. **Frontend Components** - TaskApprovalBadge, TaskApprovalActions, TaskApprovalHistory components created
4. **Integration** - Approval workflow integrated into task details drawer

### 📋 Documentation Created
- [TASK_DELEGATION_DEPLOYMENT.md](./TASK_DELEGATION_DEPLOYMENT.md) - Production deployment guide
- [TASK_WORKFLOW_SUMMARY.md](./TASK_WORKFLOW_SUMMARY.md) - Complete workflow documentation
- [TASK_IMPLEMENTATION_PROGRESS.md](./TASK_IMPLEMENTATION_PROGRESS.md) - Implementation details

---

## 🎯 IMMEDIATE NEXT STEPS

1. ✅ ~~Review this plan with stakeholders~~ - DONE
2. ✅ ~~Begin Phase 1 (Critical Fixes)~~ - COMPLETED
3. ✅ ~~Begin Phase 2 (Approval Workflow)~~ - COMPLETED
4. **Deploy to Production** - Deploy completed phases to production
5. **Begin Phase 3** (Bulk Operations) - Next priority

---

**Plan Version**: 1.1
**Created**: 2025-12-27
**Updated**: 2025-12-28
**Author**: Claude Code
**Estimated Completion**: 3-5 weeks remaining (5 phases)
