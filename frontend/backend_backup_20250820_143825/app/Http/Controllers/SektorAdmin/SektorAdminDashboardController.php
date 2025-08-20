<?php

namespace App\Http\Controllers\SektorAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class SektorAdminDashboardController extends Controller
{
    /**
     * Get SektorAdmin dashboard data
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

            // Get total students and teachers (mock data for now)
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

            // Mock survey and report data
            $activeSurveys = 3;
            $pendingReports = 7;

            // Get sector information
            $sektorInfo = [
                'name' => $userSector->name,
                'region' => $userSector->parent?->name ?? 'Bilinmir',
                'establishedYear' => '2010' // Mock data
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
                'pendingReports' => $pendingReports,
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
     * Get detailed schools data for the sector
     */
    public function getSectorSchools(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $userSector = $user->institution;
            
            if (!$userSector) {
                return response()->json([
                    'message' => 'İstifadəçi sektora təyin edilməyib'
                ], 400);
            }

            $schools = Institution::where('parent_id', $userSector->id)
                ->where('level', 4)
                ->with(['parent'])
                ->get()
                ->map(function($school) {
                    // Mock student and teacher counts
                    $students = rand(200, 600);
                    $teachers = rand(15, 50);
                    
                    return [
                        'id' => $school->id,
                        'name' => $school->name,
                        'short_name' => $school->short_name,
                        'type' => $school->type,
                        'type_display' => $this->getSchoolTypeDisplay($school->type),
                        'is_active' => $school->is_active,
                        'students' => $students,
                        'teachers' => $teachers,
                        'address' => $school->address ?? 'Ünvan qeyd edilməyib',
                        'phone' => $school->phone ?? 'Telefon qeyd edilməyib',
                        'email' => $school->email ?? 'Email qeyd edilməyib',
                        'established_year' => $school->established_year ?? 'Bilinmir',
                        'created_at' => $school->created_at->format('Y-m-d')
                    ];
                });

            return response()->json([
                'schools' => $schools,
                'total_schools' => $schools->count(),
                'active_schools' => $schools->where('is_active', true)->count(),
                'total_students' => $schools->sum('students'),
                'total_teachers' => $schools->sum('teachers'),
                'sector' => [
                    'name' => $userSector->name,
                    'region' => $userSector->parent?->name ?? 'Bilinmir'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Məktəb məlumatları yüklənə bilmədi',
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
     * Calculate total students (mock implementation)
     */
    private function calculateTotalStudents($schools): int
    {
        // Mock calculation - in real implementation this would sum actual student counts
        return $schools->count() * rand(200, 400);
    }

    /**
     * Calculate total teachers (mock implementation)
     */
    private function calculateTotalTeachers($schools): int
    {
        // Mock calculation - in real implementation this would sum actual teacher counts
        return $schools->count() * rand(15, 35);
    }

    /**
     * Get recent activities for the sector
     */
    private function getRecentActivities($sector, $schools): array
    {
        // Mock activities
        return [
            [
                'id' => '1',
                'type' => 'survey',
                'title' => 'Yeni sorğu başladı',
                'description' => 'Müəllimlərin işgüzar qabiliyyəti haqqında sorğu',
                'time' => '3 saat əvvəl',
                'status' => 'in_progress',
                'school' => $schools->first()?->name ?? 'Bilinməyən məktəb'
            ],
            [
                'id' => '2',
                'type' => 'report',
                'title' => 'Aylıq hesabat təqdim edildi',
                'description' => 'Mart ayı üçün təhsil statistikası',
                'time' => '1 gün əvvəl',
                'status' => 'completed'
            ],
            [
                'id' => '3',
                'type' => 'school',
                'title' => 'Məktəb statusu yeniləndi',
                'description' => 'Yeni müəllim qəbulu tamamlandı',
                'time' => '2 gün əvvəl',
                'status' => 'completed',
                'school' => $schools->skip(1)->first()?->name ?? 'Bilinməyən məktəb'
            ],
            [
                'id' => '4',
                'type' => 'user',
                'title' => 'Yeni müəllim qeydiyyatı',
                'description' => 'Fizika müəllimi sistemi qeydiyyatdan keçdi',
                'time' => '3 gün əvvəl',
                'status' => 'completed'
            ]
        ];
    }

    /**
     * Get schools list with basic information
     */
    private function getSchoolsList($schools): array
    {
        return $schools->take(4)->map(function($school) {
            return [
                'id' => $school->id,
                'name' => $school->name,
                'type' => $school->type,
                'students' => rand(200, 600), // Mock data
                'teachers' => rand(15, 50),   // Mock data
                'status' => $school->is_active ? 'active' : 'inactive'
            ];
        })->toArray();
    }

    /**
     * Get school type display name
     */
    private function getSchoolTypeDisplay(string $type): string
    {
        $types = [
            'school' => 'Məktəb',
            'secondary_school' => 'Orta Məktəb',
            'gymnasium' => 'Gimnaziya',
            'vocational' => 'Peşə Məktəbi',
            'kindergarten' => 'Uşaq Bağçası'
        ];

        return $types[$type] ?? $type;
    }
}