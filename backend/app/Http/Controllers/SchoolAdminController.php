<?php

namespace App\Http\Controllers;

use App\Models\Institution;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\Task;
use App\Models\TaskProgressLog;
use App\Models\User;
use App\Models\Student;
use App\Models\AssessmentEntry;
use App\Models\AttendanceRecord;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Services\TaskNotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SchoolAdminController extends Controller
{
    // No constructor needed - middleware is applied at route level

    /**
     * Get dashboard statistics for school admin
     */
    public function getDashboardStats(): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        // Get pending surveys for this school
        $pendingSurveys = Survey::where('status', 'active')
            ->whereJsonContains('target_institutions', $school->id)
            ->whereDoesntHave('responses', function ($query) use ($school) {
                $query->where('institution_id', $school->id);
            })
            ->count();

        // Get active tasks assigned to this school
        $activeTasks = Task::where('assigned_to_institution_id', $school->id)
            ->where('status', '!=', 'completed')
            ->count();

        // Get total students in the school
        $totalStudents = Student::where('institution_id', $school->id)
            ->where('is_active', true)
            ->count();

        // Calculate today's attendance rate
        $today = Carbon::today();
        $attendanceData = DB::table('attendance_records')
            ->join('students', 'attendance_records.student_id', '=', 'students.id')
            ->where('students.institution_id', $school->id)
            ->where('attendance_records.attendance_date', $today)
            ->selectRaw('
                COUNT(*) as total_records,
                SUM(CASE WHEN attendance_records.status = "present" THEN 1 ELSE 0 END) as present_count
            ')
            ->first();

        $attendanceRate = 0;
        if ($attendanceData && $attendanceData->total_records > 0) {
            $attendanceRate = round(($attendanceData->present_count / $attendanceData->total_records) * 100);
        }

        // Get pending assessments
        $pendingAssessments = AssessmentEntry::where('institution_id', $school->id)
            ->where('status', 'draft')
            ->count();

        // Get overdue tasks
        $overdueTasks = Task::where('assigned_to_institution_id', $school->id)
            ->where('due_date', '<', Carbon::now())
            ->where('status', '!=', 'completed')
            ->count();

        // Get upcoming deadlines (next 7 days)
        $upcomingDeadlines = Task::where('assigned_to_institution_id', $school->id)
            ->whereBetween('due_date', [Carbon::now(), Carbon::now()->addDays(7)])
            ->where('status', '!=', 'completed')
            ->count();

        // Count recent activities (last 30 days)
        $recentActivitiesCount = ActivityLog::where('institution_id', $school->id)
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->count();

        return response()->json([
            'pending_surveys' => $pendingSurveys,
            'active_tasks' => $activeTasks,
            'total_students' => $totalStudents,
            'today_attendance_rate' => $attendanceRate,
            'pending_assessments' => $pendingAssessments,
            'overdue_tasks' => $overdueTasks,
            'upcoming_deadlines' => $upcomingDeadlines,
            'recent_activities_count' => $recentActivitiesCount,
        ]);
    }

    /**
     * Get recent activities for school
     */
    public function getRecentActivities(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;
        $limit = $request->get('limit', 10);

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        // Get recent activities from ActivityLog
        $activities = ActivityLog::where('institution_id', $school->id)
            ->with(['user:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'type' => $activity->activity_type,
                    'title' => $activity->description ?: 'Fəaliyyət',
                    'description' => $activity->full_description,
                    'time' => $activity->created_at->diffForHumans(),
                    'user_name' => $activity->user->name ?? 'Sistem',
                    'entity_type' => $activity->entity_type
                ];
            });

        return response()->json($activities);
    }

    /**
     * Get upcoming deadlines
     */
    public function getUpcomingDeadlines(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;
        $limit = $request->get('limit', 5);

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $deadlines = Task::where('assigned_to_institution_id', $school->id)
            ->where('due_date', '>=', Carbon::now())
            ->where('status', '!=', 'completed')
            ->orderBy('due_date', 'asc')
            ->limit($limit)
            ->get()
            ->map(function ($task) {
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'due_date' => $task->due_date,
                    'priority' => $task->priority ?? 'medium',
                    'type' => 'task',
                    'status' => $task->status,
                    'days_until_due' => Carbon::parse($task->due_date)->diffInDays(Carbon::now())
                ];
            });

        return response()->json($deadlines);
    }

    /**
     * Get notifications for school
     */
    public function getNotifications(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;
        $perPage = $request->get('per_page', 5);

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        // Get notifications for the school/user
        $notifications = Notification::where(function ($query) use ($user, $school) {
                $query->forUser($user->id)
                      ->orWhere('target_institutions', 'like', '%"' . $school->id . '"%');
            })
            ->orderBy('created_at', 'desc')
            ->limit($perPage)
            ->get()
            ->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'type' => $notification->type,
                    'priority' => $notification->priority,
                    'created_at' => $notification->created_at->toISOString(),
                    'read' => $notification->is_read
                ];
            });

        return response()->json($notifications);
    }

    /**
     * Get quick actions for school admin
     */
    public function getQuickActions(): JsonResponse
    {
        return response()->json([
            [
                'id' => 'add_student',
                'title' => 'Yeni Şagird Əlavə Et',
                'description' => 'Məktəbə yeni şagird qeydiyyatı',
                'icon' => 'user-plus',
                'path' => '/school/students',
                'color' => 'primary'
            ],
            [
                'id' => 'respond_survey',
                'title' => 'Sorğu Cavabla',
                'description' => 'Gözləyən sorğuları cavablandır',
                'icon' => 'clipboard',
                'path' => '/school/surveys',
                'color' => 'success'
            ],
            [
                'id' => 'record_attendance',
                'title' => 'Davamiyyət Qeydə Al',
                'description' => 'Günlük davamiyyət qeydiyyatı',
                'icon' => 'check-square',
                'path' => '/school/attendance',
                'color' => 'warning'
            ],
            [
                'id' => 'manage_tasks',
                'title' => 'Tapşırıqları İdarə Et',
                'description' => 'Aktiv tapşırıqları idarə et',
                'icon' => 'list',
                'path' => '/school/tasks',
                'color' => 'info'
            ]
        ]);
    }

    /**
     * Get surveys assigned to this school
     */
    public function getAssignedSurveys(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        // Get surveys where this institution is in target_institutions
        $surveys = Survey::forInstitution($school->id)
            ->active()
            ->with(['creator:id,name,email', 'responses' => function ($query) use ($school) {
                $query->where('institution_id', $school->id);
            }])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($survey) use ($school) {
                // Check if this school has already responded
                $existingResponse = $survey->responses->first();
                
                return [
                    'id' => $survey->id,
                    'title' => $survey->title,
                    'description' => $survey->description,
                    'category' => $survey->category,
                    'frequency' => $survey->frequency,
                    'start_date' => $survey->start_date,
                    'end_date' => $survey->end_date,
                    'created_by' => $survey->creator->name ?? 'Sistem',
                    'questions_count' => $survey->current_questions_count,
                    'estimated_time' => $survey->current_questions_count * 2, // 2 minutes per question
                    'response_status' => $existingResponse ? 
                        ($existingResponse->is_complete ? 'completed' : 'in_progress') : 
                        'not_started',
                    'response_id' => $existingResponse->id ?? null,
                    'completion_percentage' => $existingResponse->progress_percentage ?? 0,
                    'can_respond' => $survey->canInstitutionRespond($school->id),
                    'is_anonymous' => $survey->is_anonymous,
                    'allow_multiple_responses' => $survey->allow_multiple_responses,
                    'approval_status' => $survey->approval_status,
                    'due_date' => $survey->end_date,
                    'assigned_at' => $survey->published_at,
                    'days_remaining' => $survey->end_date ? 
                        max(0, Carbon::now()->diffInDays($survey->end_date, false)) : null,
                ];
            });

        return response()->json($surveys);
    }

    /**
     * Get survey details with questions for response
     */
    public function getSurveyForResponse(Request $request, int $surveyId): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $survey = Survey::with(['questions' => function ($query) {
            $query->active()->ordered();
        }])->find($surveyId);

        if (!$survey) {
            return response()->json(['error' => 'Survey not found'], 404);
        }

        if (!$survey->canInstitutionRespond($school->id)) {
            return response()->json(['error' => 'Cannot respond to this survey'], 403);
        }

        // Get existing response if any
        $existingResponse = SurveyResponse::where('survey_id', $surveyId)
            ->where('institution_id', $school->id)
            ->first();

        return response()->json([
            'survey' => [
                'id' => $survey->id,
                'title' => $survey->title,
                'description' => $survey->description,
                'category' => $survey->category,
                'end_date' => $survey->end_date,
                'is_anonymous' => $survey->is_anonymous,
                'questions' => $survey->questions->map(function ($question) {
                    return [
                        'id' => $question->id,
                        'title' => $question->title,
                        'description' => $question->description,
                        'type' => $question->type,
                        'order_index' => $question->order_index,
                        'is_required' => $question->is_required,
                        'options' => $question->options,
                        'min_value' => $question->min_value,
                        'max_value' => $question->max_value,
                        'min_length' => $question->min_length,
                        'max_length' => $question->max_length,
                        'rating_min' => $question->rating_min,
                        'rating_max' => $question->rating_max,
                        'rating_min_label' => $question->rating_min_label,
                        'rating_max_label' => $question->rating_max_label,
                        'table_headers' => $question->table_headers,
                        'table_rows' => $question->table_rows,
                    ];
                })
            ],
            'existing_response' => $existingResponse ? [
                'id' => $existingResponse->id,
                'responses' => $existingResponse->responses,
                'progress_percentage' => $existingResponse->progress_percentage,
                'status' => $existingResponse->status,
                'is_complete' => $existingResponse->is_complete,
                'started_at' => $existingResponse->started_at,
                'submitted_at' => $existingResponse->submitted_at,
            ] : null
        ]);
    }

    /**
     * Start or get survey response
     */
    public function startSurveyResponse(Request $request, int $surveyId): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $survey = Survey::find($surveyId);

        if (!$survey) {
            return response()->json(['error' => 'Survey not found'], 404);
        }

        if (!$survey->canInstitutionRespond($school->id)) {
            return response()->json(['error' => 'Cannot respond to this survey'], 403);
        }

        // Check if response already exists
        $response = SurveyResponse::where('survey_id', $surveyId)
            ->where('institution_id', $school->id)
            ->first();

        if (!$response) {
            // Create new response
            $response = SurveyResponse::create([
                'survey_id' => $surveyId,
                'institution_id' => $school->id,
                'respondent_id' => $user->id,
                'respondent_role' => 'schooladmin',
                'responses' => [],
                'progress_percentage' => 0,
                'is_complete' => false,
                'status' => 'draft',
                'ip_address' => $request->ip(),
                'user_agent' => $request->header('User-Agent'),
                'started_at' => now(),
            ]);
        }

        return response()->json([
            'response_id' => $response->id,
            'status' => $response->status,
            'progress_percentage' => $response->progress_percentage,
            'responses' => $response->responses,
            'started_at' => $response->started_at,
        ]);
    }

    /**
     * Save survey response progress
     */
    public function saveSurveyProgress(Request $request, int $responseId): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $response = SurveyResponse::where('id', $responseId)
            ->where('institution_id', $school->id)
            ->first();

        if (!$response) {
            return response()->json(['error' => 'Response not found'], 404);
        }

        if ($response->isSubmitted()) {
            return response()->json(['error' => 'Cannot modify submitted response'], 400);
        }

        $request->validate([
            'responses' => 'required|array',
            'responses.*' => 'nullable',
        ]);

        // Update responses
        $response->responses = $request->responses;
        
        // Calculate progress
        $survey = $response->survey;
        $totalQuestions = $survey->questions()->active()->count();
        $answeredQuestions = 0;

        foreach ($request->responses as $questionId => $answer) {
            if ($answer !== null && $answer !== '' && $answer !== []) {
                $answeredQuestions++;
            }
        }

        $response->progress_percentage = $totalQuestions > 0 
            ? round(($answeredQuestions / $totalQuestions) * 100) 
            : 0;

        $response->is_complete = $response->progress_percentage >= 100;
        $response->save();

        return response()->json([
            'message' => 'Progress saved successfully',
            'progress_percentage' => $response->progress_percentage,
            'is_complete' => $response->is_complete,
            'status' => $response->status,
        ]);
    }

    /**
     * Submit survey response for approval
     */
    public function submitSurveyResponse(Request $request, int $responseId): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $response = SurveyResponse::where('id', $responseId)
            ->where('institution_id', $school->id)
            ->first();

        if (!$response) {
            return response()->json(['error' => 'Response not found'], 404);
        }

        if ($response->isSubmitted()) {
            return response()->json(['error' => 'Response already submitted'], 400);
        }

        // Validate all required questions are answered
        $survey = $response->survey;
        $requiredQuestions = $survey->questions()->active()->where('is_required', true)->get();
        $errors = [];

        foreach ($requiredQuestions as $question) {
            $answer = $response->responses[$question->id] ?? null;
            if ($answer === null || $answer === '' || $answer === []) {
                $errors[] = "Question '{$question->title}' is required";
            }
        }

        if (!empty($errors)) {
            return response()->json([
                'error' => 'Please answer all required questions',
                'validation_errors' => $errors
            ], 422);
        }

        // Submit response
        $response->status = 'submitted';
        $response->is_complete = true;
        $response->submitted_at = now();
        $response->progress_percentage = 100;
        $response->save();

        return response()->json([
            'message' => 'Survey response submitted successfully',
            'status' => $response->status,
            'submitted_at' => $response->submitted_at,
        ]);
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

        $tasks = $query->get()->map(function ($task) use ($school) {
            // Get latest progress log for this school
            $latestProgress = TaskProgressLog::where('task_id', $task->id)
                ->whereHas('updatedBy', function ($q) use ($school) {
                    $q->where('institution_id', $school->id);
                })
                ->latest()
                ->first();

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
                'created_by' => $task->creator->name ?? 'System',
                'requires_approval' => $task->requires_approval,
                'notes' => $task->notes,
                'is_overdue' => $task->isOverdue(),
                'is_deadline_approaching' => $task->isDeadlineApproaching(),
                'days_until_deadline' => $task->deadline ? 
                    max(0, Carbon::now()->diffInDays($task->deadline, false)) : null,
                'latest_progress' => $latestProgress ? [
                    'status' => $latestProgress->new_status,
                    'progress' => $latestProgress->progress_percentage,
                    'notes' => $latestProgress->notes,
                    'updated_at' => $latestProgress->created_at,
                ] : null,
            ];
        });

        return response()->json([
            'tasks' => $tasks,
            'summary' => [
                'total' => $tasks->count(),
                'pending' => $tasks->where('status', 'pending')->count(),
                'in_progress' => $tasks->where('status', 'in_progress')->count(),
                'completed' => $tasks->where('status', 'completed')->count(),
                'overdue' => $tasks->where('is_overdue', true)->count(),
            ],
        ]);
    }

    /**
     * Get task details for school
     */
    public function getTaskDetails(Request $request, int $taskId): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $task = Task::forInstitution($school->id)
            ->with(['creator:id,name,email', 'progressLogs.updatedBy:id,name,email'])
            ->find($taskId);

        if (!$task) {
            return response()->json(['error' => 'Task not found or not accessible'], 404);
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
                'created_by' => $task->creator->name ?? 'System',
                'created_at' => $task->created_at,
                'started_at' => $task->started_at,
                'completed_at' => $task->completed_at,
                'requires_approval' => $task->requires_approval,
                'notes' => $task->notes,
                'completion_notes' => $task->completion_notes,
                'attachments' => $task->attachments,
                'is_overdue' => $task->isOverdue(),
                'is_deadline_approaching' => $task->isDeadlineApproaching(),
            ],
            'progress_logs' => $task->progressLogs->map(function ($log) {
                return [
                    'id' => $log->id,
                    'old_status' => $log->old_status,
                    'new_status' => $log->new_status,
                    'progress_percentage' => $log->progress_percentage,
                    'notes' => $log->notes,
                    'updated_by' => $log->updatedBy->name ?? 'System',
                    'created_at' => $log->created_at,
                ];
            }),
        ]);
    }

    /**
     * Update task status and progress
     */
    public function updateTaskProgress(Request $request, int $taskId): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $task = Task::forInstitution($school->id)->find($taskId);

        if (!$task) {
            return response()->json(['error' => 'Task not found or not accessible'], 404);
        }

        $request->validate([
            'status' => 'required|string|in:pending,in_progress,review,completed',
            'progress' => 'nullable|integer|min:0|max:100',
            'notes' => 'nullable|string|max:1000',
            'completion_notes' => 'nullable|string|max:1000',
        ]);

        // Store old values for logging
        $oldStatus = $task->status;
        $oldProgress = $task->progress;

        // Update task
        $task->status = $request->status;
        if ($request->has('progress')) {
            $task->progress = $request->progress;
        }
        if ($request->has('completion_notes')) {
            $task->completion_notes = $request->completion_notes;
        }

        // Auto-set timestamps based on status
        if ($request->status === 'in_progress' && !$task->started_at) {
            $task->started_at = now();
        } elseif ($request->status === 'completed') {
            $task->completed_at = now();
            $task->progress = 100;
        }

        $task->save();

        // Log the progress update
        TaskProgressLog::create([
            'task_id' => $task->id,
            'updated_by' => $user->id,
            'old_status' => $oldStatus,
            'new_status' => $task->status,
            'progress_percentage' => $task->progress,
            'notes' => $request->notes,
        ]);

        // Send notification if status changed
        if ($oldStatus !== $task->status) {
            $notificationService = app(TaskNotificationService::class);
            $notificationService->notifyTaskStatusUpdate($task, $oldStatus, $user);
        }

        return response()->json([
            'message' => 'Task progress updated successfully',
            'task' => [
                'id' => $task->id,
                'status' => $task->status,
                'status_label' => $task->status_label,
                'progress' => $task->progress,
                'started_at' => $task->started_at,
                'completed_at' => $task->completed_at,
            ],
        ]);
    }

    /**
     * Submit task for approval (when completed)
     */
    public function submitTaskForApproval(Request $request, int $taskId): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $task = Task::forInstitution($school->id)->find($taskId);

        if (!$task) {
            return response()->json(['error' => 'Task not found or not accessible'], 404);
        }

        if ($task->status !== 'completed') {
            return response()->json(['error' => 'Task must be completed before submission'], 400);
        }

        if (!$task->requires_approval) {
            return response()->json(['error' => 'This task does not require approval'], 400);
        }

        $request->validate([
            'notes' => 'required|string|min:10|max:1000',
        ]);

        // Update task status to review
        $oldStatus = $task->status;
        $task->status = 'review';
        $task->save();

        // Log the submission
        TaskProgressLog::create([
            'task_id' => $task->id,
            'updated_by' => $user->id,
            'old_status' => $oldStatus,
            'new_status' => 'review',
            'progress_percentage' => 100,
            'notes' => 'Təsdiq üçün göndərildi: ' . $request->notes,
        ]);

        return response()->json([
            'message' => 'Task submitted for approval successfully',
            'task' => [
                'id' => $task->id,
                'status' => $task->status,
                'status_label' => $task->status_label,
                'notes' => $request->notes,
            ],
        ]);
    }
}