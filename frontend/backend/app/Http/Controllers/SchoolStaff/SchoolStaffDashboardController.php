<?php

namespace App\Http\Controllers\SchoolStaff;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class SchoolStaffDashboardController extends Controller
{
    /**
     * Get School Staff dashboard data based on role
     */
    public function getDashboardStats(Request $request, string $role): JsonResponse
    {
        $user = $request->user();
        
        // Verify user has appropriate school staff role
        if (!$this->hasSchoolStaffRole($user, $role)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $userSchool = $user->institution;
            
            if (!$userSchool || !in_array($userSchool->type, ['school', 'secondary_school', 'gymnasium', 'vocational'])) {
                return response()->json([
                    'message' => 'İstifadəçi məktəbə təyin edilməyib'
                ], 400);
            }

            // Get role-specific data
            $dashboardData = $this->getRoleSpecificData($role, $user, $userSchool);

            return response()->json($dashboardData);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Dashboard məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get staff workload data
     */
    public function getStaffWorkload(Request $request): JsonResponse
    {
        $user = $request->user();
        
        try {
            $workload = [
                'total_assignments' => rand(8, 25),
                'pending_tasks' => rand(2, 8),
                'completed_tasks' => rand(15, 45),
                'upcoming_events' => rand(1, 5),
                'weekly_hours' => rand(20, 40),
                'this_week_schedule' => $this->generateWeeklySchedule($user)
            ];

            return response()->json(['data' => $workload]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'İş yükü məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get staff notifications
     */
    public function getStaffNotifications(Request $request): JsonResponse
    {
        $user = $request->user();
        
        try {
            $notifications = $this->generateMockNotifications($user);

            return response()->json(['data' => $notifications]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Bildirişlər yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if user has appropriate school staff role
     */
    private function hasSchoolStaffRole(User $user, string $role): bool
    {
        $allowedRoles = [
            'deputy' => ['müavin'],
            'academic_officer' => ['ubr', 'tədris_bilimlər_referenti'],
            'facility_manager' => ['təsərrüfat_müdiri'],
            'psychologist' => ['psixoloq'],
            'teacher' => ['müəllim']
        ];

        $roleNames = $allowedRoles[$role] ?? [];
        
        foreach ($roleNames as $roleName) {
            if ($user->hasRole($roleName)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get role-specific dashboard data
     */
    private function getRoleSpecificData(string $role, User $user, Institution $school): array
    {
        $baseData = [
            'staff_info' => [
                'role' => $role,
                'role_name' => $this->getRoleDisplayName($role),
                'school_name' => $school->name,
                'department' => $user->department?->name
            ],
            'workload' => [
                'total_assignments' => rand(8, 25),
                'pending_tasks' => rand(2, 8),
                'completed_tasks' => rand(15, 45),
                'upcoming_events' => rand(1, 5)
            ],
            'recent_activities' => $this->getRecentActivities($role),
            'notifications' => $this->generateMockNotifications($user)
        ];

        // Add role-specific data
        switch ($role) {
            case 'deputy':
                $baseData['quick_actions'] = $this->getDeputyActions();
                $baseData['staff_info']['assigned_classes'] = $this->getAssignedClasses();
                break;
                
            case 'academic_officer':
                $baseData['quick_actions'] = $this->getAcademicOfficerActions();
                $baseData['upcoming_events'] = $this->getUpcomingEvents();
                break;
                
            case 'facility_manager':
                $baseData['quick_actions'] = $this->getFacilityManagerActions();
                $baseData['inventory_alerts'] = $this->getInventoryAlerts();
                break;
                
            case 'psychologist':
                $baseData['quick_actions'] = $this->getPsychologistActions();
                $baseData['student_cases'] = $this->getStudentCases();
                break;
                
            case 'teacher':
                $baseData['quick_actions'] = $this->getTeacherActions();
                $baseData['staff_info']['assigned_classes'] = $this->getAssignedClasses();
                $baseData['today_schedule'] = $this->getTodaySchedule();
                break;
        }

        return $baseData;
    }

    /**
     * Get role display name in Azerbaijani
     */
    private function getRoleDisplayName(string $role): string
    {
        $names = [
            'deputy' => 'Müavin',
            'academic_officer' => 'Tədris-Bilimlər Referenti',
            'facility_manager' => 'Təsərrüfat Müdiri',
            'psychologist' => 'Psixoloq',
            'teacher' => 'Müəllim'
        ];
        
        return $names[$role] ?? $role;
    }

    /**
     * Get deputy-specific quick actions
     */
    private function getDeputyActions(): array
    {
        return [
            [
                'id' => 'schedule_management',
                'title' => 'Dərs Cədvəli',
                'description' => 'Dərs cədvəllərini idarə et',
                'icon' => 'calendar',
                'url' => '/schedule'
            ],
            [
                'id' => 'teacher_assignments',
                'title' => 'Müəllim Təyinatları',
                'description' => 'Müəllimləri siniflərə təyin et',
                'icon' => 'users',
                'url' => '/teacher-assignments'
            ],
            [
                'id' => 'substitution_management',
                'title' => 'Əvəzetmə İdarəsi',
                'description' => 'Müəllim əvəzetmələrini idarə et',
                'icon' => 'clock',
                'url' => '/substitutions'
            ],
            [
                'id' => 'room_assignments',
                'title' => 'Otaq Təyinatları',
                'description' => 'Siniflərə otaq təyin et',
                'icon' => 'settings',
                'url' => '/room-assignments'
            ]
        ];
    }

    /**
     * Get academic officer quick actions
     */
    private function getAcademicOfficerActions(): array
    {
        return [
            [
                'id' => 'event_planning',
                'title' => 'Tədbir Planlaması',
                'description' => 'Məktəb tədbirlərini planlaşdır',
                'icon' => 'calendar',
                'url' => '/events'
            ],
            [
                'id' => 'exam_scheduling',
                'title' => 'İmtahan Cədvəli',
                'description' => 'İmtahan tarixlərini müəyyən et',
                'icon' => 'file-text',
                'url' => '/exam-schedule'
            ],
            [
                'id' => 'activity_reports',
                'title' => 'Fəaliyyət Hesabatları',
                'description' => 'Akademik fəaliyyət hesabatları',
                'icon' => 'package',
                'url' => '/activity-reports'
            ],
            [
                'id' => 'competition_management',
                'title' => 'Yarış İdarəsi',
                'description' => 'Müsabiqə və yarışları idarə et',
                'icon' => 'users',
                'url' => '/competitions'
            ]
        ];
    }

    /**
     * Get facility manager quick actions
     */
    private function getFacilityManagerActions(): array
    {
        return [
            [
                'id' => 'inventory_management',
                'title' => 'İnventarizasiya',
                'description' => 'Avadanlıq və material uçotu',
                'icon' => 'package',
                'url' => '/inventory'
            ],
            [
                'id' => 'maintenance_requests',
                'title' => 'Təmir Sorğuları',
                'description' => 'Təmir və bərpa işləri',
                'icon' => 'settings',
                'url' => '/maintenance'
            ],
            [
                'id' => 'supply_management',
                'title' => 'Təchizat İdarəsi',
                'description' => 'Təchizat və satınalma',
                'icon' => 'package',
                'url' => '/supplies'
            ],
            [
                'id' => 'budget_tracking',
                'title' => 'Büdcə İzləmə',
                'description' => 'Təsərrüfat büdcəsi',
                'icon' => 'file-text',
                'url' => '/budget'
            ]
        ];
    }

    /**
     * Get psychologist quick actions
     */
    private function getPsychologistActions(): array
    {
        return [
            [
                'id' => 'student_counseling',
                'title' => 'Şagird Məsləhəti',
                'description' => 'Şagirdlərə psixoloji dəstək',
                'icon' => 'heart',
                'url' => '/counseling'
            ],
            [
                'id' => 'assessment_tools',
                'title' => 'Qiymətləndirmə Alətləri',
                'description' => 'Psixoloji qiymətləndirmə',
                'icon' => 'file-text',
                'url' => '/assessments'
            ],
            [
                'id' => 'development_reports',
                'title' => 'İnkişaf Hesabatları',
                'description' => 'Şagird inkişaf hesabatları',
                'icon' => 'users',
                'url' => '/development-reports'
            ],
            [
                'id' => 'group_sessions',
                'title' => 'Qrup Sessiyaları',
                'description' => 'Qrup terapiyası və məşğələlər',
                'icon' => 'users',
                'url' => '/group-sessions'
            ]
        ];
    }

    /**
     * Get teacher quick actions
     */
    private function getTeacherActions(): array
    {
        return [
            [
                'id' => 'class_register',
                'title' => 'Sinif Jurnalı',
                'description' => 'Davamiyyət və qiymətlər',
                'icon' => 'users',
                'url' => '/class-register'
            ],
            [
                'id' => 'lesson_plans',
                'title' => 'Dərs Planları',
                'description' => 'Dərs planlarını hazırla',
                'icon' => 'file-text',
                'url' => '/lesson-plans'
            ],
            [
                'id' => 'student_assessment',
                'title' => 'Şagird Qiymətləndirmə',
                'description' => 'Qiymətləndirmə və testlər',
                'icon' => 'package',
                'url' => '/assessments'
            ],
            [
                'id' => 'parent_communication',
                'title' => 'Valideyn Ünsiyyəti',
                'description' => 'Valideynlərlə əlaqə',
                'icon' => 'users',
                'url' => '/parent-communication'
            ]
        ];
    }

    /**
     * Get recent activities based on role
     */
    private function getRecentActivities(string $role): array
    {
        $activities = [
            'deputy' => [
                [
                    'id' => '1',
                    'type' => 'calendar',
                    'title' => 'Dərs cədvəli yeniləndi',
                    'description' => '5-ci siniflərin riyaziyyat dərsi dəyişdirildi',
                    'time' => '2 saat əvvəl',
                    'status' => 'completed',
                    'class' => '5-A, 5-B'
                ],
                [
                    'id' => '2',
                    'type' => 'users',
                    'title' => 'Müəllim əvəzetməsi',
                    'description' => 'Fizika müəllimi üçün əvəzetmə təyin edildi',
                    'time' => '4 saat əvvəl',
                    'status' => 'completed'
                ]
            ],
            'academic_officer' => [
                [
                    'id' => '1',
                    'type' => 'calendar',
                    'title' => 'Yeni tədbir planlaşdırıldı',
                    'description' => 'Elm olimpiadası 15 mayda keçiriləcək',
                    'time' => '1 saat əvvəl',
                    'status' => 'pending'
                ]
            ],
            'facility_manager' => [
                [
                    'id' => '1',
                    'type' => 'package',
                    'title' => 'İnventarizasiya tamamlandı',
                    'description' => 'Laboratoriya avadanlıqlarının sayımı bitdi',
                    'time' => '3 saat əvvəl',
                    'status' => 'completed'
                ]
            ],
            'psychologist' => [
                [
                    'id' => '1',
                    'type' => 'heart',
                    'title' => 'Şagird məsləhəti',
                    'description' => '8-A sinfindən şagirdlə məsləhət sessiyası',
                    'time' => '1 saat əvvəl',
                    'status' => 'completed'
                ]
            ],
            'teacher' => [
                [
                    'id' => '1',
                    'type' => 'users',
                    'title' => 'Davamiyyət qeydə alındı',
                    'description' => '7-B sinfi üçün bu günün davamiyyəti',
                    'time' => '30 dəqiqə əvvəl',
                    'status' => 'completed',
                    'class' => '7-B'
                ]
            ]
        ];

        return $activities[$role] ?? [];
    }

    /**
     * Generate mock notifications
     */
    private function generateMockNotifications(User $user): array
    {
        return [
            [
                'id' => '1',
                'type' => 'info',
                'title' => 'Sistem yeniləməsi',
                'message' => 'Sistem bu axşam qısa müddət ərzində yenilənəcək',
                'time' => '2 saat əvvəl',
                'read' => false
            ],
            [
                'id' => '2',
                'type' => 'warning',
                'title' => 'Tədbir xatırlatması',
                'message' => 'Sabah valideyn toplantısı saat 15:00-da',
                'time' => '1 gün əvvəl',
                'read' => false
            ],
            [
                'id' => '3',
                'type' => 'success',
                'title' => 'Tapşırıq tamamlandı',
                'message' => 'Aylıq hesabat uğurla təqdim edildi',
                'time' => '2 gün əvvəl',
                'read' => true
            ]
        ];
    }

    /**
     * Get assigned classes (mock data)
     */
    private function getAssignedClasses(): array
    {
        return ['5-A', '7-B', '9-A', '11-C'];
    }

    /**
     * Get today's schedule for teachers
     */
    private function getTodaySchedule(): array
    {
        return [
            ['period' => 1, 'time' => '08:00-08:45', 'class' => '5-A', 'subject' => 'Riyaziyyat'],
            ['period' => 2, 'time' => '08:50-09:35', 'class' => '7-B', 'subject' => 'Riyaziyyat'],
            ['period' => 4, 'time' => '10:25-11:10', 'class' => '9-A', 'subject' => 'Riyaziyyat'],
            ['period' => 6, 'time' => '12:00-12:45', 'class' => '11-C', 'subject' => 'Riyaziyyat']
        ];
    }

    /**
     * Generate weekly schedule
     */
    private function generateWeeklySchedule(User $user): array
    {
        $days = ['Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə'];
        $schedule = [];
        
        foreach ($days as $day) {
            $schedule[$day] = rand(3, 6) . ' dərs';
        }
        
        return $schedule;
    }

    /**
     * Get upcoming events (mock data)
     */
    private function getUpcomingEvents(): array
    {
        return [
            ['title' => 'Elm olimpiadası', 'date' => '2025-05-15', 'location' => 'Məktəb aula'],
            ['title' => 'Valideyn toplantısı', 'date' => '2025-05-20', 'location' => 'Sinif otaqları'],
            ['title' => 'İdman yarışı', 'date' => '2025-05-25', 'location' => 'Məktəb həyəti']
        ];
    }

    /**
     * Get inventory alerts
     */
    private function getInventoryAlerts(): array
    {
        return [
            ['item' => 'Yazı lövhəsi markeri', 'quantity' => 5, 'status' => 'low'],
            ['item' => 'Kağız A4', 'quantity' => 2, 'status' => 'critical'],
            ['item' => 'Təbəşir', 'quantity' => 8, 'status' => 'low']
        ];
    }

    /**
     * Get student counseling cases
     */
    private function getStudentCases(): array
    {
        return [
            ['student' => 'Aysel M.', 'class' => '8-A', 'type' => 'akademik_dəstək', 'priority' => 'medium'],
            ['student' => 'Rəşad K.', 'class' => '7-B', 'type' => 'davranış', 'priority' => 'high'],
            ['student' => 'Leyla H.', 'class' => '9-C', 'type' => 'ailə_məsələsi', 'priority' => 'medium']
        ];
    }
}