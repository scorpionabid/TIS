<?php

namespace App\Services\RegionAdmin;

use App\Models\User;
use App\Models\Institution;
use App\Models\Survey;
use App\Models\Task;
use App\Models\Notification;
use App\Models\SurveyResponse;
use Carbon\Carbon;

class RegionAdminDashboardService
{
    /**
     * Get region institutions for a given region admin
     */
    public function getRegionInstitutions($userRegionId)
    {
        return Institution::where(function($query) use ($userRegionId) {
            $query->where('id', $userRegionId) // The region itself
                  ->orWhere('parent_id', $userRegionId); // Sectors in region
        })->get();
    }

    /**
     * Get all institutions including schools for a region
     */
    public function getAllRegionInstitutions($regionInstitutions)
    {
        return Institution::where(function($query) use ($regionInstitutions) {
            $query->whereIn('id', $regionInstitutions->pluck('id'))
                  ->orWhereIn('parent_id', $regionInstitutions->pluck('id'));
        })->get();
    }

    /**
     * Calculate region overview statistics
     */
    public function calculateRegionOverview($userRegionId, $institutionIds)
    {
        $regionInstitutions = $this->getRegionInstitutions($userRegionId);
        $allRegionInstitutions = $this->getAllRegionInstitutions($regionInstitutions);
        
        $sectors = $regionInstitutions->where('level', 3)->count();
        $schools = $allRegionInstitutions->where('level', 4)->count();
        
        $totalUsers = User::whereIn('institution_id', $institutionIds)->count();
        $activeUsers = User::whereIn('institution_id', $institutionIds)
            ->where('last_login_at', '>=', Carbon::now()->subDays(30))
            ->count();
        
        return [
            'region_name' => Institution::find($userRegionId)?->name ?? 'Unknown Region',
            'total_sectors' => $sectors,
            'total_schools' => $schools,
            'total_users' => $totalUsers,
            'active_users' => $activeUsers,
            'user_activity_rate' => $totalUsers > 0 ? round(($activeUsers / $totalUsers) * 100, 1) : 0
        ];
    }

    /**
     * Calculate survey metrics for region admin
     */
    public function calculateSurveyMetrics($user, $institutionIds)
    {
        // For now, get surveys created by regional admin users from their region
        $totalSurveys = Survey::where('created_by', $user->id)->count();
            
        $activeSurveys = Survey::where('status', 'published')
            ->where('created_by', $user->id)
            ->count();
            
        $surveyResponses = SurveyResponse::whereHas('survey', function($query) use ($user) {
            $query->where('created_by', $user->id);
        })->count();

        return [
            'total_surveys' => $totalSurveys,
            'active_surveys' => $activeSurveys,
            'total_responses' => $surveyResponses,
            'response_rate' => $totalSurveys > 0 ? round(($surveyResponses / ($totalSurveys * 10)) * 100, 1) : 0
        ];
    }

    /**
     * Calculate task metrics for region admin
     */
    public function calculateTaskMetrics($user, $institutionIds)
    {
        $totalTasks = Task::where('created_by', $user->id)
            ->orWhereIn('assigned_to_institution', $institutionIds)
            ->count();
            
        $completedTasks = Task::where('status', 'completed')
            ->where(function($query) use ($user, $institutionIds) {
                $query->where('created_by', $user->id)
                      ->orWhereIn('assigned_to_institution', $institutionIds);
            })->count();
            
        $pendingTasks = Task::where('status', 'pending')
            ->where(function($query) use ($user, $institutionIds) {
                $query->where('created_by', $user->id)
                      ->orWhereIn('assigned_to_institution', $institutionIds);
            })->count();

        return [
            'total_tasks' => $totalTasks,
            'completed_tasks' => $completedTasks,
            'pending_tasks' => $pendingTasks,
            'completion_rate' => $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 1) : 0
        ];
    }

    /**
     * Calculate sector performance metrics
     */
    public function calculateSectorPerformance($userRegionId)
    {
        return Institution::where('parent_id', $userRegionId)
            ->where('level', 3)
            ->get()
            ->map(function($sector) {
                $sectorSchools = Institution::where('parent_id', $sector->id)->get();
                $schoolIds = $sectorSchools->pluck('id');
                
                $users = User::whereIn('institution_id', $schoolIds)->count();
                $surveys = Survey::count(); // Simplified for now
                $tasks = Task::whereIn('assigned_to_institution', $schoolIds)->count();
                $completedTasks = Task::where('status', 'completed')
                    ->whereIn('assigned_to_institution', $schoolIds)->count();
                
                return [
                    'sector_name' => $sector->name,
                    'schools_count' => $sectorSchools->count(),
                    'users_count' => $users,
                    'surveys_count' => $surveys,
                    'tasks_count' => $tasks,
                    'completion_rate' => $tasks > 0 ? round(($completedTasks / $tasks) * 100, 1) : 0
                ];
            });
    }

    /**
     * Get recent activities in the region
     */
    public function getRecentActivities($user, $institutionIds)
    {
        $recentSurveys = Survey::where('created_by', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function($survey) {
                return [
                    'id' => $survey->id,
                    'type' => 'survey',
                    'action' => 'sorğu yaradıldı: ' . $survey->title,
                    'user' => $survey->creator->username ?? 'System',
                    'time' => $survey->created_at->diffForHumans(),
                    'timestamp' => $survey->created_at
                ];
            });
        
        $recentTasks = Task::where('created_by', $user->id)
            ->orWhereIn('assigned_to_institution', $institutionIds)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function($task) {
                return [
                    'id' => $task->id,
                    'type' => 'task',
                    'action' => 'tapşırıq yaradıldı: ' . $task->title,
                    'user' => $task->creator->username ?? 'System',
                    'time' => $task->created_at->diffForHumans(),
                    'timestamp' => $task->created_at
                ];
            });
        
        return $recentSurveys->concat($recentTasks)
            ->sortByDesc('timestamp')
            ->take(10)
            ->values();
    }

    /**
     * Get notifications for region admin
     */
    public function getNotifications($user)
    {
        return Notification::where('user_id', $user->id)
            ->orWhere('user_id', null) // System-wide notifications
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function($notification) {
                return [
                    'id' => $notification->id,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'type' => $notification->type,
                    'is_read' => (bool) $notification->read_at,
                    'created_at' => $notification->created_at->format('Y-m-d H:i:s'),
                    'time_ago' => $notification->created_at->diffForHumans()
                ];
            });
    }
}