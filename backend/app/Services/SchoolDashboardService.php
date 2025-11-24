<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\AssessmentEntry;
use App\Models\Institution;
use App\Models\Student;
use App\Models\Survey;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SchoolDashboardService
{
    public function getDashboardStats(Institution $school): array
    {
        return [
            'pending_surveys' => $this->getPendingSurveys($school),
            'active_tasks' => $this->getActiveTasks($school),
            'total_students' => $this->getTotalStudents($school),
            'today_attendance_rate' => $this->getAttendanceRate($school),
            'attendance_rate' => $this->getAttendanceRate($school),
            'pending_assessments' => $this->getPendingAssessments($school),
            'overdue_tasks' => $this->getOverdueTasks($school),
            'upcoming_deadlines' => $this->getUpcomingDeadlines($school),
            'recent_activities_count' => $this->getRecentActivitiesCount($school),
            'total_staff' => $this->getTotalStaff($school),
            'new_documents_count' => $this->getNewDocumentsCount($school),
            'today_priority_items' => $this->getTodayPriorityItems($school),
            'pending_approvals' => $this->getPendingApprovals($school),
        ];
    }

    private function getPendingSurveys(Institution $school): int
    {
        return Survey::whereIn('status', ['active', 'published'])
            ->whereJsonContains('target_institutions', $school->id)
            ->whereDoesntHave('responses', function ($query) use ($school) {
                $query->where('institution_id', $school->id);
            })
            ->count();
    }

    private function getActiveTasks(Institution $school): int
    {
        return Task::where('assigned_to_institution_id', $school->id)
            ->where('status', '!=', 'completed')
            ->count();
    }

    private function getTotalStudents(Institution $school): int
    {
        return Student::where('institution_id', $school->id)
            ->where('is_active', true)
            ->count();
    }

    private function getAttendanceRate(Institution $school): int
    {
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

        if ($attendanceData && $attendanceData->total_records > 0) {
            return round(($attendanceData->present_count / $attendanceData->total_records) * 100);
        }

        return 0;
    }

    private function getPendingAssessments(Institution $school): int
    {
        return AssessmentEntry::where('institution_id', $school->id)
            ->where('status', 'draft')
            ->count();
    }

    private function getOverdueTasks(Institution $school): int
    {
        return Task::where('assigned_to_institution_id', $school->id)
            ->where('due_date', '<', Carbon::now())
            ->where('status', '!=', 'completed')
            ->count();
    }

    private function getUpcomingDeadlines(Institution $school): int
    {
        return Task::where('assigned_to_institution_id', $school->id)
            ->whereBetween('due_date', [Carbon::now(), Carbon::now()->addDays(7)])
            ->where('status', '!=', 'completed')
            ->count();
    }

    private function getRecentActivitiesCount(Institution $school): int
    {
        return ActivityLog::where('institution_id', $school->id)
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->count();
    }

    private function getTotalStaff(Institution $school): int
    {
        return User::where('institution_id', $school->id)
            ->whereIn('role', ['teacher', 'admin', 'staff'])
            ->where('is_active', true)
            ->count();
    }

    private function getNewDocumentsCount(Institution $school): int
    {
        return DB::table('documents')
            ->where('institution_id', $school->id)
            ->where('status', 'active')
            ->where('created_at', '>=', Carbon::now()->subDays(7))
            ->count();
    }

    private function getTodayPriorityItems(Institution $school): int
    {
        $todayEnd = Carbon::today()->endOfDay();

        // Count surveys with deadline today
        $surveysCount = Survey::whereIn('status', ['active', 'published'])
            ->whereJsonContains('target_institutions', $school->id)
            ->whereDate('end_date', '<=', $todayEnd)
            ->whereDoesntHave('responses', function ($query) use ($school) {
                $query->where('institution_id', $school->id);
            })
            ->count();

        // Count tasks with deadline today
        $tasksCount = Task::where('assigned_to_institution_id', $school->id)
            ->where('status', '!=', 'completed')
            ->whereDate('due_date', '<=', $todayEnd)
            ->count();

        return $surveysCount + $tasksCount;
    }

    private function getPendingApprovals(Institution $school): int
    {
        // Count survey responses waiting for approval
        return DB::table('survey_responses')
            ->where('institution_id', $school->id)
            ->where('status', 'pending')
            ->count();
    }

    /**
     * Get detailed list of pending surveys for the school
     */
    public function getPendingSurveysList(Institution $school, int $limit = 10): array
    {
        return Survey::whereIn('status', ['active', 'published'])
            ->whereJsonContains('target_institutions', $school->id)
            ->whereDoesntHave('responses', function ($query) use ($school) {
                $query->where('institution_id', $school->id);
            })
            ->with(['creator:id,username,email'])
            ->orderBy('end_date', 'asc')
            ->limit($limit)
            ->get()
            ->map(function ($survey) {
                $daysRemaining = Carbon::parse($survey->end_date)->diffInDays(Carbon::now(), false);

                // Get question count from structure
                $structure = is_string($survey->structure) ? json_decode($survey->structure, true) : $survey->structure;
                $questionCount = isset($structure['questions']) ? count($structure['questions']) : 0;

                return [
                    'id' => $survey->id,
                    'title' => $survey->title,
                    'description' => $survey->description,
                    'deadline' => $survey->end_date,
                    'priority' => $daysRemaining <= 1 ? 'high' : ($daysRemaining <= 3 ? 'medium' : 'low'),
                    'question_count' => $questionCount,
                    'estimated_duration' => $questionCount * 2, // 2 minutes per question
                    'days_remaining' => abs($daysRemaining),
                    'is_urgent' => $daysRemaining <= 1,
                    'created_by' => $survey->creator->username ?? 'N/A',
                ];
            })
            ->toArray();
    }

    /**
     * Get today's priority items (urgent surveys and tasks)
     */
    public function getTodayPriorityItemsList(Institution $school): array
    {
        $todayEnd = Carbon::today()->endOfDay();
        $items = [];

        // Get urgent surveys (deadline today or overdue)
        $urgentSurveys = Survey::whereIn('status', ['active', 'published'])
            ->whereJsonContains('target_institutions', $school->id)
            ->whereDate('end_date', '<=', $todayEnd)
            ->whereDoesntHave('responses', function ($query) use ($school) {
                $query->where('institution_id', $school->id);
            })
            ->get()
            ->map(function ($survey) {
                $hoursRemaining = Carbon::parse($survey->end_date)->diffInHours(Carbon::now(), false);

                return [
                    'id' => $survey->id,
                    'type' => 'survey',
                    'title' => $survey->title,
                    'description' => $survey->description,
                    'deadline' => $survey->end_date,
                    'hours_remaining' => abs($hoursRemaining),
                    'is_overdue' => $hoursRemaining < 0,
                    'priority' => $hoursRemaining <= 3 ? 'urgent' : 'high',
                ];
            });

        // Get urgent tasks (deadline today or overdue)
        $urgentTasks = Task::where('assigned_to_institution_id', $school->id)
            ->where('status', '!=', 'completed')
            ->whereDate('due_date', '<=', $todayEnd)
            ->get()
            ->map(function ($task) {
                $hoursRemaining = Carbon::parse($task->due_date)->diffInHours(Carbon::now(), false);

                return [
                    'id' => $task->id,
                    'type' => 'task',
                    'title' => $task->title,
                    'description' => $task->description,
                    'deadline' => $task->due_date,
                    'hours_remaining' => abs($hoursRemaining),
                    'is_overdue' => $hoursRemaining < 0,
                    'priority' => $task->priority ?? 'medium',
                    'status' => $task->status,
                ];
            });

        // Merge and sort by hours remaining
        $items = $urgentSurveys->concat($urgentTasks)
            ->sortBy('hours_remaining')
            ->values()
            ->toArray();

        return $items;
    }

    /**
     * Get recent documents uploaded to the school
     */
    public function getRecentDocuments(Institution $school, int $limit = 10): array
    {
        return DB::table('documents')
            ->join('users', 'documents.uploaded_by', '=', 'users.id')
            ->where('documents.institution_id', $school->id)
            ->where('documents.created_at', '>=', Carbon::now()->subDays(7))
            ->where('documents.status', 'active')
            ->select(
                'documents.id',
                'documents.title',
                'documents.file_type',
                'documents.file_size',
                'documents.original_filename',
                'documents.created_at as uploaded_at',
                'users.username as uploaded_by',
                'users.email as uploader_email'
            )
            ->orderBy('documents.created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($doc) {
                return [
                    'id' => $doc->id,
                    'name' => $doc->original_filename ?? $doc->title,
                    'type' => $doc->file_type,
                    'size' => $doc->file_size,
                    'uploaded_by' => $doc->uploaded_by ?? 'N/A',
                    'uploaded_at' => $doc->uploaded_at,
                    'department_name' => 'Ümumi',
                ];
            })
            ->toArray();
    }
}
