<?php

namespace App\Http\Controllers\School;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Task;
use App\Services\SchoolDashboardService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SchoolDashboardController extends Controller
{
    private SchoolDashboardService $dashboardService;

    public function __construct(SchoolDashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    /**
     * Get dashboard overview for school admin
     */
    public function getOverview(): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasRole(['superadmin', 'schooladmin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $school = $user->institution;

        // If user is SuperAdmin and has no institution, use first available school for demo
        if (! $school && $user->hasRole('superadmin')) {
            $school = \App\Models\Institution::where('level', 4)->first();
        }

        if (! $school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $overview = $this->dashboardService->getDashboardStats($school);

        return response()->json([
            'success' => true,
            'data' => $overview,
        ]);
    }

    /**
     * Get dashboard statistics for school admin
     */
    public function getStatistics(): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasRole(['superadmin', 'schooladmin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $school = $user->institution;

        // If user is SuperAdmin and has no institution, use first available school for demo
        if (! $school && $user->hasRole('superadmin')) {
            $school = \App\Models\Institution::where('level', 4)->first();
        }

        if (! $school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $stats = $this->dashboardService->getDashboardStats($school);

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Get dashboard analytics for school admin
     */
    public function getAnalytics(): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasRole(['superadmin', 'schooladmin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $school = $user->institution;

        // If user is SuperAdmin and has no institution, use first available school for demo
        if (! $school && $user->hasRole('superadmin')) {
            $school = \App\Models\Institution::where('level', 4)->first();
        }

        if (! $school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        // Mock analytics data for now
        $analytics = [
            'student_enrollment' => [
                'current' => 450,
                'last_year' => 420,
                'growth_rate' => 7.1,
            ],
            'academic_performance' => [
                'average_grade' => 8.2,
                'pass_rate' => 94,
                'top_performers' => 25,
            ],
            'teacher_metrics' => [
                'total_teachers' => 42,
                'experienced_teachers' => 28,
                'average_experience' => 12,
            ],
            'attendance_metrics' => [
                'average_attendance' => 96.5,
                'chronic_absenteeism' => 3.2,
                'monthly_trend' => [92, 94, 95, 93, 96, 98],
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $analytics,
        ]);
    }

    /**
     * Get dashboard statistics for school admin
     */
    public function getDashboardStats(): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        // If user is SuperAdmin and has no institution, use first available school for demo
        if (! $school && $user->hasRole('superadmin')) {
            $school = \App\Models\Institution::where('level', 4)->first();
        }

        if (! $school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $stats = $this->dashboardService->getDashboardStats($school);

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Get recent activities for the school
     */
    public function getRecentActivities(): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasRole(['superadmin', 'schooladmin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $school = $user->institution;

        if (! $school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        // Get recent activities (last 30 days)
        $activities = \App\Models\ActivityLog::where('institution_id', $school->id)
            ->where('created_at', '>=', \Carbon\Carbon::now()->subDays(30))
            ->with(['user:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $activities,
        ]);
    }

    /**
     * Get quick stats for charts and analytics
     */
    public function getQuickStats(): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (! $school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        // Monthly attendance trend
        $attendanceTrend = $this->getMonthlyAttendanceTrend($school);

        // Tasks completion rate
        $taskStats = $this->getTaskCompletionStats($school);

        // Student enrollment by grade
        $enrollmentByGrade = $this->getEnrollmentByGrade($school);

        return response()->json([
            'success' => true,
            'data' => [
                'attendance_trend' => $attendanceTrend,
                'task_stats' => $taskStats,
                'enrollment_by_grade' => $enrollmentByGrade,
            ],
        ]);
    }

    private function getMonthlyAttendanceTrend($school): array
    {
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = \Carbon\Carbon::now()->subMonths($i);
            $months[] = [
                'month' => $date->format('Y-m'),
                'label' => $date->format('M Y'),
                'rate' => $this->getAttendanceRateForMonth($school, $date),
            ];
        }

        return $months;
    }

    private function getAttendanceRateForMonth($school, $date): float
    {
        $attendanceData = \Illuminate\Support\Facades\DB::table('attendance_records')
            ->join('students', 'attendance_records.student_id', '=', 'students.id')
            ->where('students.institution_id', $school->id)
            ->whereYear('attendance_records.attendance_date', $date->year)
            ->whereMonth('attendance_records.attendance_date', $date->month)
            ->selectRaw('
                COUNT(*) as total_records,
                SUM(CASE WHEN attendance_records.status = "present" THEN 1 ELSE 0 END) as present_count
            ')
            ->first();

        if ($attendanceData && $attendanceData->total_records > 0) {
            return round(($attendanceData->present_count / $attendanceData->total_records) * 100, 1);
        }

        return 0;
    }

    private function getTaskCompletionStats($school): array
    {
        $total = \App\Models\Task::where('assigned_to_institution_id', $school->id)->count();
        $completed = \App\Models\Task::where('assigned_to_institution_id', $school->id)
            ->where('status', 'completed')
            ->count();
        $inProgress = \App\Models\Task::where('assigned_to_institution_id', $school->id)
            ->where('status', 'in_progress')
            ->count();
        $pending = \App\Models\Task::where('assigned_to_institution_id', $school->id)
            ->where('status', 'pending')
            ->count();

        return [
            'total' => $total,
            'completed' => $completed,
            'in_progress' => $inProgress,
            'pending' => $pending,
            'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 1) : 0,
        ];
    }

    private function getEnrollmentByGrade($school): array
    {
        return \Illuminate\Support\Facades\DB::table('students')
            ->join('grades', 'students.grade_id', '=', 'grades.id')
            ->where('students.institution_id', $school->id)
            ->where('students.is_active', true)
            ->select('grades.name as grade_name', \Illuminate\Support\Facades\DB::raw('COUNT(*) as student_count'))
            ->groupBy('grades.id', 'grades.name')
            ->orderBy('grades.id')
            ->get()
            ->toArray();
    }

    /**
     * Get upcoming deadlines
     */
    public function getUpcomingDeadlines(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;
        $limit = $request->get('limit', 5);

        if (! $school) {
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
                    'days_until_due' => Carbon::parse($task->due_date)->diffInDays(Carbon::now()),
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

        if (! $school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        // Get notifications for the school/user
        $notifications = Notification::where(function ($query) use ($user, $school) {
            $query->where('user_id', $user->id) // Direct assignment
                ->orWhereJsonContains('target_users', $user->id);

            if ($school) {
                $query->orWhereJsonContains('target_institutions', $school->id); // Targeted to user's institution
            }
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
                    'read' => $notification->is_read,
                ];
            });

        return response()->json($notifications);
    }

    /**
     * Get quick actions for school admin
     */
    public function getQuickActions(): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasRole(['superadmin', 'schooladmin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            [
                'id' => 'add_student',
                'title' => 'Yeni Şagird Əlavə Et',
                'description' => 'Məktəbə yeni şagird qeydiyyatı',
                'icon' => 'user-plus',
                'path' => '/school/students',
                'color' => 'primary',
            ],
            [
                'id' => 'record_attendance',
                'title' => 'Davamiyyət Qeydə Al',
                'description' => 'Günlük davamiyyət qeydiyyatı',
                'icon' => 'check-square',
                'path' => '/school/attendance',
                'color' => 'warning',
            ],
            [
                'id' => 'manage_tasks',
                'title' => 'Tapşırıqları İdarə Et',
                'description' => 'Aktiv tapşırıqları idarə et',
                'icon' => 'list',
                'path' => '/school/tasks',
                'color' => 'info',
            ],
        ]);
    }

    /**
     * Get pending surveys list with details
     */
    public function getPendingSurveys(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;
        $limit = $request->get('limit', 10);

        if (! $school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $surveys = $this->dashboardService->getPendingSurveysList($school, $limit);

        return response()->json([
            'success' => true,
            'data' => $surveys,
        ]);
    }

    /**
     * Get today's priority items
     */
    public function getTodayPriority(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (! $school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $priorityItems = $this->dashboardService->getTodayPriorityItemsList($school);

        return response()->json([
            'success' => true,
            'data' => $priorityItems,
        ]);
    }

    /**
     * Get recent documents
     */
    public function getRecentDocuments(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;
        $limit = $request->get('limit', 10);

        if (! $school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $documents = $this->dashboardService->getRecentDocuments($school, $limit);

        return response()->json([
            'success' => true,
            'data' => $documents,
        ]);
    }
}
