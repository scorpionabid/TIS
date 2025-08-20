<?php

namespace App\Http\Controllers\School;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskProgressLog;
use App\Services\TaskNotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class SchoolTaskController extends Controller
{
    private TaskNotificationService $notificationService;

    public function __construct(TaskNotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Get tasks assigned to this school
     */
    public function getAssignedTasks(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $request->validate([
            'status' => 'nullable|string|in:pending,in_progress,review,completed,cancelled',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
            'category' => 'nullable|string|in:report,maintenance,event,audit,instruction,other',
        ]);

        // Get tasks assigned to this school
        $query = Task::forInstitution($school->id)
            ->with(['creator:id,name,email', 'progressLogs' => function ($q) {
                $q->recent()->limit(3);
            }])
            ->orderBy('deadline', 'asc')
            ->orderBy('priority', 'desc');

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

        $tasks = $query->get()->map(function ($task) {
            return [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'category' => $task->category,
                'priority' => $task->priority,
                'status' => $task->status,
                'deadline' => $task->deadline,
                'created_by' => $task->creator->name ?? 'Sistem',
                'created_at' => $task->created_at,
                'progress_percentage' => $task->progress_percentage ?? 0,
                'days_until_deadline' => $task->deadline 
                    ? Carbon::parse($task->deadline)->diffInDays(Carbon::now(), false) 
                    : null,
                'is_overdue' => $task->deadline && Carbon::now()->gt($task->deadline),
                'recent_progress' => $task->progressLogs->map(function ($log) {
                    return [
                        'id' => $log->id,
                        'comment' => $log->comment,
                        'progress_percentage' => $log->progress_percentage,
                        'created_at' => $log->created_at,
                        'created_by' => $log->user->name ?? 'İstifadəçi',
                    ];
                }),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $tasks,
            'message' => count($tasks) . ' tapşırıq tapıldı'
        ]);
    }

    /**
     * Get detailed information about a specific task
     */
    public function getTaskDetails(Request $request, int $taskId): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (!$school) {
                return response()->json(['error' => 'User is not associated with a school'], 400);
            }

            $task = Task::where('id', $taskId)
                ->forInstitution($school->id)
                ->with([
                    'creator:id,name,email',
                    'progressLogs' => function ($query) {
                        $query->with('user:id,name')->orderBy('created_at', 'desc');
                    },
                    'attachments'
                ])
                ->firstOrFail();

            $taskData = [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'category' => $task->category,
                'priority' => $task->priority,
                'status' => $task->status,
                'deadline' => $task->deadline,
                'created_by' => $task->creator->name ?? 'Sistem',
                'created_at' => $task->created_at,
                'updated_at' => $task->updated_at,
                'progress_percentage' => $task->progress_percentage ?? 0,
                'requirements' => $task->requirements ?? [],
                'deliverables' => $task->deliverables ?? [],
                'instructions' => $task->instructions,
                'days_until_deadline' => $task->deadline 
                    ? Carbon::parse($task->deadline)->diffInDays(Carbon::now(), false) 
                    : null,
                'is_overdue' => $task->deadline && Carbon::now()->gt($task->deadline),
                'can_edit' => in_array($task->status, ['pending', 'in_progress']),
                'can_submit' => $task->status === 'in_progress' && $task->progress_percentage >= 100,
                'progress_logs' => $task->progressLogs->map(function ($log) {
                    return [
                        'id' => $log->id,
                        'comment' => $log->comment,
                        'progress_percentage' => $log->progress_percentage,
                        'created_at' => $log->created_at,
                        'created_by' => $log->user->name ?? 'İstifadəçi',
                        'attachments' => $log->attachments ?? [],
                    ];
                }),
                'attachments' => $task->attachments->map(function ($attachment) {
                    return [
                        'id' => $attachment->id,
                        'name' => $attachment->name,
                        'file_path' => $attachment->file_path,
                        'file_size' => $attachment->file_size,
                        'uploaded_at' => $attachment->created_at,
                    ];
                }),
            ];

            return response()->json([
                'success' => true,
                'data' => $taskData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Tapşırıq məlumatları əldə edilərkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update task progress
     */
    public function updateTaskProgress(Request $request, int $taskId): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (!$school) {
                return response()->json(['error' => 'User is not associated with a school'], 400);
            }

            $task = Task::where('id', $taskId)
                ->forInstitution($school->id)
                ->firstOrFail();

            if (!in_array($task->status, ['pending', 'in_progress'])) {
                return response()->json([
                    'error' => 'Bu tapşırığın statusu dəyişdirilə bilməz'
                ], 400);
            }

            $request->validate([
                'comment' => 'required|string|max:1000',
                'progress_percentage' => 'required|integer|min:0|max:100',
                'attachments' => 'nullable|array',
                'attachments.*' => 'file|max:10240', // 10MB max per file
            ]);

            // Create progress log
            $progressLog = TaskProgressLog::create([
                'task_id' => $taskId,
                'user_id' => $user->id,
                'comment' => $request->comment,
                'progress_percentage' => $request->progress_percentage,
                'attachments' => $request->attachments ?? [],
                'logged_at' => Carbon::now(),
            ]);

            // Update task progress and status
            $task->update([
                'progress_percentage' => $request->progress_percentage,
                'status' => $request->progress_percentage > 0 ? 'in_progress' : 'pending',
                'last_progress_at' => Carbon::now(),
            ]);

            // Send notification to task creator
            $this->notificationService->sendTaskProgressNotification($task, $progressLog);

            return response()->json([
                'success' => true,
                'message' => 'Tapşırıq irəliləməsi qeydə alındı',
                'progress_percentage' => $task->progress_percentage,
                'status' => $task->status,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Tapşırıq yenilənərkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit task for approval
     */
    public function submitTaskForApproval(Request $request, int $taskId): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (!$school) {
                return response()->json(['error' => 'User is not associated with a school'], 400);
            }

            $task = Task::where('id', $taskId)
                ->forInstitution($school->id)
                ->firstOrFail();

            if ($task->status !== 'in_progress') {
                return response()->json([
                    'error' => 'Yalnız işləmə vəziyyətindəki tapşırıqlar təqdim edilə bilər'
                ], 400);
            }

            if ($task->progress_percentage < 100) {
                return response()->json([
                    'error' => 'Tapşırıq tam tamamlanmadan təqdim edilə bilməz'
                ], 400);
            }

            $request->validate([
                'final_comment' => 'nullable|string|max:1000',
                'deliverables' => 'nullable|array',
            ]);

            // Create final progress log
            if ($request->final_comment) {
                TaskProgressLog::create([
                    'task_id' => $taskId,
                    'user_id' => $user->id,
                    'comment' => $request->final_comment,
                    'progress_percentage' => 100,
                    'logged_at' => Carbon::now(),
                ]);
            }

            // Update task status to review
            $task->update([
                'status' => 'review',
                'submitted_at' => Carbon::now(),
                'submitted_by' => $user->id,
                'deliverables' => array_merge($task->deliverables ?? [], $request->deliverables ?? []),
            ]);

            // Send notification to task creator for review
            $this->notificationService->sendTaskSubmissionNotification($task);

            return response()->json([
                'success' => true,
                'message' => 'Tapşırıq təsdiq üçün göndərildi',
                'status' => $task->status,
                'submitted_at' => $task->submitted_at,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Tapşırıq təqdim edilərkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }
}