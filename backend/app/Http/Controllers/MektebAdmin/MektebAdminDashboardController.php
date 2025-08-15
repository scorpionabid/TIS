<?php

namespace App\Http\Controllers\MektebAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class MektebAdminDashboardController extends Controller
{
    /**
     * Get MəktəbAdmin dashboard data
     */
    public function getDashboardStats(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Verify user has məktəbadmin role
        if (!$user->hasRole('məktəbadmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            // Get user's school (institution)
            $userSchool = $user->institution;
            
            if (!$userSchool || !in_array($userSchool->type, ['school', 'secondary_school', 'gymnasium', 'vocational'])) {
                return response()->json([
                    'message' => 'İstifadəçi məktəbə təyin edilməyib'
                ], 400);
            }

            // Mock student and teacher data (in real implementation, these would come from actual models)
            $totalStudents = rand(400, 800);
            $totalTeachers = rand(30, 60);
            $totalClasses = rand(20, 30);
            $activeSubjects = rand(12, 18);

            // Get school users count
            $schoolUsers = User::where('institution_id', $userSchool->id)
                ->where('is_active', true)
                ->count();

            // Mock survey and task data
            $activeSurveys = 2;
            $pendingTasks = 5;
            $attendanceRate = rand(90, 98) + (rand(0, 9) / 10); // 90.0 - 98.9

            // Get school information
            $schoolInfo = [
                'name' => $userSchool->name,
                'type' => $this->getSchoolTypeDisplay($userSchool->type),
                'sector' => $userSchool->parent?->name ?? 'Bilinmir',
                'establishedYear' => $userSchool->established_year ?? '1985', // Mock data
                'address' => $userSchool->address ?? 'Ünvan qeyd edilməyib'
            ];

            // Get recent activities
            $recentActivities = $this->getRecentActivities($userSchool);

            // Get classroom stats
            $classroomStats = $this->getClassroomStats();

            // Get teachers by subject
            $teachersBySubject = $this->getTeachersBySubject();

            return response()->json([
                'totalStudents' => $totalStudents,
                'totalTeachers' => $totalTeachers,
                'totalClasses' => $totalClasses,
                'activeSubjects' => $activeSubjects,
                'schoolUsers' => $schoolUsers,
                'activeSurveys' => $activeSurveys,
                'pendingTasks' => $pendingTasks,
                'attendanceRate' => round($attendanceRate, 1),
                'schoolInfo' => $schoolInfo,
                'recentActivities' => $recentActivities,
                'classroomStats' => $classroomStats,
                'teachersBySubject' => $teachersBySubject
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Dashboard məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get detailed school classes information
     */
    public function getSchoolClasses(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('məktəbadmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $userSchool = $user->institution;
            
            if (!$userSchool) {
                return response()->json([
                    'message' => 'İstifadəçi məktəbə təyin edilməyib'
                ], 400);
            }

            // Mock classes data (in real implementation, this would come from a classes model)
            $classes = [];
            $grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
            $sections = ['A', 'B', 'C'];
            $teachers = [
                'Aynur Məmmədova', 'Səbinə Quliyeva', 'Rəşad Əliyev', 
                'Nigar Həsənova', 'Farid Bayramov', 'Leyla Qasımova',
                'Mübariz Həsənov', 'Gülnar Əhmədova', 'Vüsal Məmmədov'
            ];

            $classId = 1;
            foreach ($grades as $grade) {
                $sectionsForGrade = array_slice($sections, 0, rand(1, 3));
                foreach ($sectionsForGrade as $section) {
                    $classes[] = [
                        'id' => $classId++,
                        'grade' => $grade,
                        'section' => $section,
                        'students' => rand(20, 35),
                        'teacher' => $teachers[array_rand($teachers)],
                        'classroom' => "Sinif {$grade}-{$section}",
                        'schedule' => $this->generateClassSchedule($grade)
                    ];
                }
            }

            // Limit to realistic number of classes
            $classes = array_slice($classes, 0, rand(18, 25));

            return response()->json([
                'classes' => $classes,
                'total_classes' => count($classes),
                'total_students' => array_sum(array_column($classes, 'students')),
                'grades_covered' => array_unique(array_column($classes, 'grade')),
                'school' => [
                    'name' => $userSchool->name,
                    'type' => $this->getSchoolTypeDisplay($userSchool->type)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sinif məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get school teachers information
     */
    public function getSchoolTeachers(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('məktəbadmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $userSchool = $user->institution;
            
            // Get teachers assigned to this school
            $teachers = User::where('institution_id', $userSchool->id)
                ->whereHas('roles', function($q) {
                    $q->where('name', 'müəllim');
                })
                ->with(['roles', 'department'])
                ->get()
                ->map(function($teacher) {
                    return [
                        'id' => $teacher->id,
                        'username' => $teacher->username,
                        'full_name' => trim(($teacher->first_name ?? '') . ' ' . ($teacher->last_name ?? '')) ?: $teacher->username,
                        'email' => $teacher->email,
                        'subject' => $this->getRandomSubject(), // Mock subject assignment
                        'classes_assigned' => rand(3, 8),
                        'experience_years' => rand(2, 25),
                        'department' => $teacher->department?->name ?? 'Departament təyin edilməyib',
                        'is_active' => $teacher->is_active,
                        'last_login' => $teacher->last_login_at ? 
                            Carbon::parse($teacher->last_login_at)->diffForHumans() : 'Heç vaxt',
                        'joined_date' => $teacher->created_at->format('Y-m-d')
                    ];
                });

            return response()->json([
                'teachers' => $teachers,
                'total_teachers' => $teachers->count(),
                'active_teachers' => $teachers->where('is_active', true)->count(),
                'subjects_covered' => array_unique($teachers->pluck('subject')->toArray()),
                'average_experience' => round($teachers->avg('experience_years'), 1),
                'school' => [
                    'name' => $userSchool->name,
                    'type' => $this->getSchoolTypeDisplay($userSchool->type)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Müəllim məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get recent activities for the school
     */
    private function getRecentActivities($school): array
    {
        return [
            [
                'id' => '1',
                'type' => 'student',
                'title' => 'Yeni şagird qeydiyyatı',
                'description' => '5-ci sinfə 3 yeni şagird qeydiyyatdan keçdi',
                'time' => '2 saat əvvəl',
                'status' => 'completed',
                'class' => '5-A sinfi'
            ],
            [
                'id' => '2',
                'type' => 'survey',
                'title' => 'Müəllim qiymətləndirmə sorğusu',
                'description' => 'Şagirdlər üçün müəllim qiymətləndirmə sorğusu başladı',
                'time' => '4 saat əvvəl',
                'status' => 'in_progress'
            ],
            [
                'id' => '3',
                'type' => 'teacher',
                'title' => 'Müəllim təyinatı',
                'description' => 'Riyaziyyat müəllimi yeni 9-cu sinifə təyin edildi',
                'time' => '1 gün əvvəl',
                'status' => 'completed',
                'class' => '9-B sinfi'
            ],
            [
                'id' => '4',
                'type' => 'event',
                'title' => 'Valideyn toplantısı',
                'description' => '8-ci sinif valideynləri ilə toplantı planlaşdırıldı',
                'time' => '2 gün əvvəl',
                'status' => 'pending'
            ],
            [
                'id' => '5',
                'type' => 'class',
                'title' => 'Dərs cədvəli yeniləndi',
                'description' => 'Yeni təhsil ili üçün dərs cədvəli hazırlandı',
                'time' => '3 gün əvvəl',
                'status' => 'completed'
            ]
        ];
    }

    /**
     * Get classroom statistics (mock data)
     */
    private function getClassroomStats(): array
    {
        return [
            ['id' => 1, 'grade' => 5, 'section' => 'A', 'students' => 28, 'teacher' => 'Aynur Məmmədova'],
            ['id' => 2, 'grade' => 5, 'section' => 'B', 'students' => 26, 'teacher' => 'Səbinə Quliyeva'],
            ['id' => 3, 'grade' => 9, 'section' => 'A', 'students' => 24, 'teacher' => 'Rəşad Əliyev'],
            ['id' => 4, 'grade' => 9, 'section' => 'B', 'students' => 25, 'teacher' => 'Nigar Həsənova'],
            ['id' => 5, 'grade' => 11, 'section' => 'A', 'students' => 22, 'teacher' => 'Farid Bayramov'],
            ['id' => 6, 'grade' => 7, 'section' => 'A', 'students' => 29, 'teacher' => 'Leyla Qasımova'],
            ['id' => 7, 'grade' => 8, 'section' => 'A', 'students' => 27, 'teacher' => 'Mübariz Həsənov'],
            ['id' => 8, 'grade' => 10, 'section' => 'A', 'students' => 23, 'teacher' => 'Gülnar Əhmədova']
        ];
    }

    /**
     * Get teachers by subject statistics (mock data)
     */
    private function getTeachersBySubject(): array
    {
        return [
            ['subject' => 'Riyaziyyat', 'teachers' => 6, 'classes' => 12],
            ['subject' => 'Azərbaycan dili', 'teachers' => 4, 'classes' => 8],
            ['subject' => 'İngilis dili', 'teachers' => 3, 'classes' => 10],
            ['subject' => 'Tarix', 'teachers' => 2, 'classes' => 6],
            ['subject' => 'Fizika', 'teachers' => 2, 'classes' => 5],
            ['subject' => 'Kimya', 'teachers' => 2, 'classes' => 4],
            ['subject' => 'Biologiya', 'teachers' => 1, 'classes' => 3],
            ['subject' => 'Coğrafiya', 'teachers' => 1, 'classes' => 3]
        ];
    }

    /**
     * Generate mock class schedule
     */
    private function generateClassSchedule($grade): array
    {
        $subjects = $this->getSubjectsForGrade($grade);
        $days = ['Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə'];
        
        $schedule = [];
        foreach ($days as $day) {
            $schedule[$day] = array_slice($subjects, 0, rand(4, 6));
        }
        
        return $schedule;
    }

    /**
     * Get subjects for specific grade
     */
    private function getSubjectsForGrade($grade): array
    {
        $baseSubjects = ['Azərbaycan dili', 'Riyaziyyat', 'İngilis dili', 'Tarix', 'Bədən tərbiyəsi'];
        
        if ($grade >= 7) {
            $baseSubjects = array_merge($baseSubjects, ['Fizika', 'Kimya', 'Biologiya', 'Coğrafiya']);
        }
        
        if ($grade >= 10) {
            $baseSubjects = array_merge($baseSubjects, ['Ədəbiyyat', 'Fəlsəfə']);
        }
        
        return $baseSubjects;
    }

    /**
     * Get random subject for teacher assignment
     */
    private function getRandomSubject(): string
    {
        $subjects = [
            'Riyaziyyat', 'Azərbaycan dili', 'İngilis dili', 'Tarix', 
            'Fizika', 'Kimya', 'Biologiya', 'Coğrafiya', 'Bədən tərbiyəsi',
            'Musiqi', 'Təsviri sənət', 'İnformatika'
        ];
        
        return $subjects[array_rand($subjects)];
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