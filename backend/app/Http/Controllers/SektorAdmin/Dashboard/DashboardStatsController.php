<?php

namespace App\Http\Controllers\SektorAdmin\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use App\Models\Student;
use App\Models\Survey;
use App\Models\Task;
use App\Models\SurveyResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardStatsController extends Controller
{
    /**
     * Get SektorAdmin dashboard statistics
     */
    public function getDashboardStats(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Verify user has sektoradmin role
        if (!$user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            // Get user's sector (institution)
            $userSector = $user->institution;
            
            if (!$userSector || $userSector->type !== 'sector_education_office') {
                return response()->json([
                    'message' => 'İstifadəçi sektora təyin edilməyib'
                ], 400);
            }

            // Get all schools under this sector
            $sectorSchools = Institution::where('parent_id', $userSector->id)
                ->where('level', 4) // School level
                ->get();

            $totalSchools = $sectorSchools->count();
            $activeSchools = $sectorSchools->where('is_active', true)->count();

            // Get total students and teachers from real data
            $totalStudents = $this->calculateTotalStudents($sectorSchools);
            $totalTeachers = $this->calculateTotalTeachers($sectorSchools);

            // Get sector users count
            $sectorUsers = User::where('institution_id', $userSector->id)
                ->where('is_active', true)
                ->count();

            // Add school users
            $schoolUserIds = $sectorSchools->pluck('id');
            $schoolUsers = User::whereIn('institution_id', $schoolUserIds)
                ->where('is_active', true)
                ->count();

            $totalSektorUsers = $sectorUsers + $schoolUsers;

            // Get real survey and task data
            $activeSurveys = Survey::where('status', 'published')->count();
            $pendingTasks = Task::where('status', 'pending')->count();

            // Get sector information
            $sektorInfo = [
                'name' => $userSector->name,
                'region' => $userSector->parent?->name ?? 'Bilinmir',
                'establishedYear' => $userSector->established_date ? date('Y', strtotime($userSector->established_date)) : '2010'
            ];

            // Get recent activities
            $recentActivities = $this->getRecentActivities($userSector, $sectorSchools);

            // Get schools list with basic stats
            $schoolsList = $this->getSchoolsList($sectorSchools);

            return response()->json([
                'totalSchools' => $totalSchools,
                'activeSchools' => $activeSchools,
                'totalStudents' => $totalStudents,
                'totalTeachers' => $totalTeachers,
                'sektorUsers' => $totalSektorUsers,
                'activeSurveys' => $activeSurveys,
                'pendingReports' => $pendingTasks,
                'sektorInfo' => $sektorInfo,
                'recentActivities' => $recentActivities,
                'schoolsList' => $schoolsList
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Dashboard məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get sector performance analytics
     */
    public function getSectorAnalytics(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $userSector = $user->institution;
            $sectorSchools = Institution::where('parent_id', $userSector->id)
                ->where('level', 4)
                ->get();

            // Mock analytics data
            $analytics = [
                'enrollment_trend' => [
                    ['month' => 'Yanvar', 'students' => 3100],
                    ['month' => 'Fevral', 'students' => 3150],
                    ['month' => 'Mart', 'students' => 3200],
                    ['month' => 'Aprel', 'students' => 3250],
                ],
                'school_performance' => $sectorSchools->map(function($school) {
                    return [
                        'school_name' => $school->name,
                        'attendance_rate' => rand(85, 98),
                        'academic_score' => rand(70, 95),
                        'teacher_ratio' => rand(12, 25)
                    ];
                }),
                'subject_statistics' => [
                    ['subject' => 'Riyaziyyat', 'average_score' => 82, 'teachers' => 25],
                    ['subject' => 'Azərbaycan dili', 'average_score' => 87, 'teachers' => 20],
                    ['subject' => 'İngilis dili', 'average_score' => 79, 'teachers' => 18],
                    ['subject' => 'Tarix', 'average_score' => 85, 'teachers' => 12],
                    ['subject' => 'Fizika', 'average_score' => 76, 'teachers' => 15],
                ]
            ];

            return response()->json($analytics);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Analitik məlumatlar yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate total students from real data
     */
    private function calculateTotalStudents($schools): int
    {
        $schoolIds = $schools->pluck('id')->toArray();
        return Student::whereIn('institution_id', $schoolIds)
                     ->where('is_active', true)
                     ->count();
    }

    /**
     * Calculate total teachers from real data
     */
    private function calculateTotalTeachers($schools): int
    {
        $schoolIds = $schools->pluck('id')->toArray();
        return User::whereIn('institution_id', $schoolIds)
                  ->whereHas('roles', function($query) {
                      $query->where('name', 'müəllim');
                  })
                  ->where('is_active', true)
                  ->count();
    }

    /**
     * Get recent activities for the sector based on real data
     */
    private function getRecentActivities($sector, $schools): array
    {
        $activities = [];
        $schoolIds = $schools->pluck('id')->toArray();
        
        // Get recent survey responses
        $recentSurveyResponses = SurveyResponse::with(['survey', 'respondent', 'institution'])
            ->where(function($query) use ($schoolIds, $sector) {
                $query->where('institution_id', $sector->id)
                      ->orWhereIn('institution_id', $schoolIds);
            })
            ->orderBy('created_at', 'desc')
            ->take(2)
            ->get();
            
        foreach ($recentSurveyResponses as $response) {
            $activities[] = [
                'id' => 'survey_' . $response->id,
                'type' => 'survey',
                'title' => 'Sorğu cavabı təqdim edildi',
                'description' => $response->survey->title ?? 'Sorğu',
                'time' => $response->created_at->diffForHumans(),
                'status' => 'completed',
                'school' => $response->institution->name ?? null
            ];
        }
        
        // Get recent tasks
        $recentTasks = Task::orderBy('updated_at', 'desc')
            ->take(2)
            ->get();
            
        foreach ($recentTasks as $task) {
            $activities[] = [
                'id' => 'task_' . $task->id,
                'type' => 'task',
                'title' => $task->title,
                'description' => $task->description ?? 'Tapşırıq yerinə yetirilir',
                'time' => $task->updated_at->diffForHumans(),
                'status' => $task->status
            ];
        }
        
        // Get recent user registrations in sector schools
        $recentUsers = User::whereIn('institution_id', $schoolIds)
            ->orWhere('institution_id', $sector->id)
            ->orderBy('created_at', 'desc')
            ->take(2)
            ->get();
            
        foreach ($recentUsers as $user) {
            $roleName = $user->roles->first()?->name ?? 'istifadəçi';
            $activities[] = [
                'id' => 'user_' . $user->id,
                'type' => 'user',
                'title' => 'Yeni ' . $roleName . ' qeydiyyatı',
                'description' => $user->name . ' sistemi qeydiyyatdan keçdi',
                'time' => $user->created_at->diffForHumans(),
                'status' => 'completed',
                'school' => $user->institution->name ?? null
            ];
        }
        
        // Sort by time and take first 4
        return collect($activities)->sortByDesc('time')->take(4)->values()->toArray();
    }

    /**
     * Get schools list with real statistics
     */
    private function getSchoolsList($schools): array
    {
        return $schools->take(6)->map(function($school) {
            // Get real student count for this school
            $studentCount = Student::where('institution_id', $school->id)
                                  ->where('is_active', true)
                                  ->count();
                                  
            // Get real teacher count for this school
            $teacherCount = User::where('institution_id', $school->id)
                               ->whereHas('roles', function($query) {
                                   $query->where('name', 'müəllim');
                               })
                               ->where('is_active', true)
                               ->count();
                               
            return [
                'id' => $school->id,
                'name' => $school->name,
                'type' => $school->type,
                'students' => $studentCount,
                'teachers' => $teacherCount,
                'status' => $school->is_active ? 'active' : 'inactive'
            ];
        })->toArray();
    }
}