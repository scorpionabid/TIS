<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\Survey;
use App\Models\Task;
use App\Models\Student;
use App\Models\AssessmentEntry;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SchoolDashboardService
{
    public function getDashboardStats(Institution $school): array
    {
        return [
            'pending_surveys' => $this->getPendingSurveys($school),
            'active_tasks' => $this->getActiveTasks($school),
            'total_students' => $this->getTotalStudents($school),
            'attendance_rate' => $this->getAttendanceRate($school),
            'pending_assessments' => $this->getPendingAssessments($school),
            'overdue_tasks' => $this->getOverdueTasks($school),
            'upcoming_deadlines' => $this->getUpcomingDeadlines($school),
            'recent_activities_count' => $this->getRecentActivitiesCount($school),
            'total_staff' => $this->getTotalStaff($school),
        ];
    }

    private function getPendingSurveys(Institution $school): int
    {
        return Survey::where('status', 'active')
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
}