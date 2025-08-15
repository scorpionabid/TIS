<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class TeacherDashboardController extends Controller
{
    /**
     * Get Teacher dashboard data
     */
    public function getDashboardStats(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Verify user has müəllim role
        if (!$user->hasRole('müəllim')) {
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

            // Mock class and student data (in real implementation, these would come from actual models)
            $assignedClasses = rand(3, 6);
            $totalStudents = $assignedClasses * rand(20, 30);
            $subjectsTeaching = rand(1, 3);
            $attendanceRate = rand(85, 98) + (rand(0, 9) / 10); // 85.0 - 98.9
            $weeklyHours = $assignedClasses * rand(4, 6);
            $pendingGrades = rand(5, 20);
            $activeSurveys = rand(1, 4);
            $upcomingTasks = rand(2, 8);

            // Get teacher information
            $teacherInfo = [
                'name' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: $user->username,
                'subject' => $this->getRandomSubject(), // In real implementation, get from teacher's assignment
                'school' => $userSchool->name,
                'experienceYears' => $this->calculateExperienceYears($user->created_at),
                'department' => $user->department?->name ?? 'Departament təyin edilməyib'
            ];

            // Generate weekly schedule
            $weeklySchedule = $this->generateWeeklySchedule($assignedClasses, $teacherInfo['subject']);

            // Get recent activities
            $recentActivities = $this->getRecentActivities($assignedClasses);

            // Generate class performance data
            $classPerformance = $this->generateClassPerformance($assignedClasses);

            return response()->json([
                'assignedClasses' => $assignedClasses,
                'totalStudents' => $totalStudents,
                'subjectsTeaching' => $subjectsTeaching,
                'attendanceRate' => round($attendanceRate, 1),
                'weeklyHours' => $weeklyHours,
                'pendingGrades' => $pendingGrades,
                'activeSurveys' => $activeSurveys,
                'upcomingTasks' => $upcomingTasks,
                'teacherInfo' => $teacherInfo,
                'weeklySchedule' => $weeklySchedule,
                'recentActivities' => $recentActivities,
                'classPerformance' => $classPerformance
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Dashboard məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get teacher's class details
     */
    public function getTeacherClasses(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('müəllim')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $userSchool = $user->institution;
            
            if (!$userSchool) {
                return response()->json([
                    'message' => 'İstifadəçi məktəbə təyin edilməyib'
                ], 400);
            }

            // Mock classes data (in real implementation, this would come from class assignments)
            $classes = [];
            $grades = [5, 6, 7, 8, 9, 10, 11];
            $sections = ['A', 'B', 'C'];
            $subject = $this->getRandomSubject();
            
            $classCount = rand(3, 6);
            for ($i = 0; $i < $classCount; $i++) {
                $grade = $grades[array_rand($grades)];
                $section = $sections[array_rand($sections)];
                $students = rand(20, 32);
                
                $classes[] = [
                    'id' => $i + 1,
                    'grade' => $grade,
                    'section' => $section,
                    'subject' => $subject,
                    'students' => $students,
                    'averageGrade' => rand(65, 95) / 10, // 6.5 - 9.5
                    'attendanceRate' => rand(85, 98),
                    'schedule' => $this->generateClassSchedule($grade, $section),
                    'nextClass' => $this->getNextClassTime()
                ];
            }

            return response()->json([
                'classes' => $classes,
                'total_classes' => count($classes),
                'total_students' => array_sum(array_column($classes, 'students')),
                'average_class_size' => round(array_sum(array_column($classes, 'students')) / count($classes), 1),
                'subject' => $subject,
                'teacher' => [
                    'name' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: $user->username,
                    'school' => $userSchool->name
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
     * Get teacher's gradebook
     */
    public function getGradebook(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('müəllim')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            // Mock gradebook data
            $gradebook = [];
            $classes = ['5-A', '6-B', '7-A', '8-C'];
            $subject = $this->getRandomSubject();
            
            foreach ($classes as $class) {
                $students = [];
                $studentCount = rand(20, 30);
                
                for ($i = 1; $i <= $studentCount; $i++) {
                    $students[] = [
                        'id' => $i,
                        'name' => $this->generateStudentName(),
                        'grades' => $this->generateGrades(),
                        'attendance' => rand(85, 100),
                        'average' => rand(65, 95) / 10
                    ];
                }
                
                $gradebook[] = [
                    'class' => $class,
                    'subject' => $subject,
                    'students' => $students,
                    'class_average' => round(array_sum(array_column($students, 'average')) / count($students), 1),
                    'total_students' => count($students)
                ];
            }

            return response()->json([
                'gradebook' => $gradebook,
                'subject' => $subject,
                'pending_grades' => rand(8, 25),
                'total_students' => array_sum(array_column($gradebook, 'total_students'))
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Qiymət dəftəri yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate teacher experience years
     */
    private function calculateExperienceYears($createdAt): int
    {
        // Mock calculation - in real implementation this would be based on hire date
        return Carbon::parse($createdAt)->diffInYears(now()) + rand(1, 10);
    }

    /**
     * Get random subject for teacher assignment
     */
    private function getRandomSubject(): string
    {
        $subjects = [
            'Riyaziyyat', 'Azərbaycan dili', 'İngilis dili', 'Tarix', 
            'Fizika', 'Kimya', 'Biologiya', 'Coğrafiya', 'Bədən tərbiyəsi',
            'Musiqi', 'Təsviri sənət', 'İnformatika', 'Ədəbiyyat'
        ];
        
        return $subjects[array_rand($subjects)];
    }

    /**
     * Generate weekly schedule for teacher
     */
    private function generateWeeklySchedule($classCount, $subject): array
    {
        $days = ['Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə'];
        $timeSlots = [
            '08:30-09:15', '09:25-10:10', '10:20-11:05', 
            '11:15-12:00', '12:10-12:55', '13:05-13:50'
        ];
        $classes = ['5-A', '6-B', '7-A', '8-C', '9-A', '10-B'];
        $rooms = ['Sinif 201', 'Sinif 202', 'Sinif 301', 'Sinif 302'];
        
        $schedule = [];
        foreach ($days as $day) {
            $dayClasses = [];
            $lessonsPerDay = rand(2, 4);
            
            for ($i = 0; $i < $lessonsPerDay; $i++) {
                $dayClasses[] = [
                    'time' => $timeSlots[array_rand($timeSlots)],
                    'subject' => $subject,
                    'class' => $classes[array_rand($classes)],
                    'room' => $rooms[array_rand($rooms)]
                ];
            }
            
            $schedule[] = [
                'day' => $day,
                'classes' => $dayClasses
            ];
        }
        
        return $schedule;
    }

    /**
     * Generate class schedule for specific grade and section
     */
    private function generateClassSchedule($grade, $section): array
    {
        $timeSlots = ['08:30-09:15', '09:25-10:10', '10:20-11:05', '11:15-12:00'];
        $days = ['Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə'];
        
        $schedule = [];
        foreach ($days as $day) {
            $schedule[$day] = [
                'time' => $timeSlots[array_rand($timeSlots)],
                'room' => "Sinif {$grade}0{$section}"
            ];
        }
        
        return $schedule;
    }

    /**
     * Get next class time (mock)
     */
    private function getNextClassTime(): ?string
    {
        $nextTimes = [
            'Bugün 10:20-11:05',
            'Sabah 08:30-09:15', 
            'Çərşənbə 09:25-10:10',
            null // No class today
        ];
        
        return $nextTimes[array_rand($nextTimes)];
    }

    /**
     * Generate recent activities for teacher
     */
    private function getRecentActivities($classCount): array
    {
        $activities = [
            [
                'id' => '1',
                'type' => 'grade',
                'title' => 'Qiymət qeyd edildi',
                'description' => '5-A sinfi üçün riyaziyyat qiyməti əlavə edildi',
                'time' => '2 saat əvvəl',
                'status' => 'completed',
                'class' => '5-A sinfi'
            ],
            [
                'id' => '2',
                'type' => 'attendance',
                'title' => 'Davamiyyət yoxlandı',
                'description' => '6-B sinfi üçün davamiyyət qeyd edildi',
                'time' => '4 saat əvvəl',
                'status' => 'completed',
                'class' => '6-B sinfi'
            ],
            [
                'id' => '3',
                'type' => 'survey',
                'title' => 'Sorğu cavablandı',
                'description' => 'Müəllim qiymətləndirmə sorğusu tamamlandı',
                'time' => '1 gün əvvəl',
                'status' => 'completed'
            ],
            [
                'id' => '4',
                'type' => 'task',
                'title' => 'Tapşırıq təyin edildi',
                'description' => 'Yeni ev tapşırığı 7-A sinfinə verildi',
                'time' => '2 gün əvvəl',
                'status' => 'completed',
                'class' => '7-A sinfi'
            ],
            [
                'id' => '5',
                'type' => 'planning',
                'title' => 'Dərs planı hazırlandı',
                'description' => 'Növbəti həftə üçün dərs planı yeniləndi',
                'time' => '3 gün əvvəl',
                'status' => 'completed'
            ]
        ];
        
        return array_slice($activities, 0, rand(3, 5));
    }

    /**
     * Generate class performance data
     */
    private function generateClassPerformance($classCount): array
    {
        $classes = ['5-A', '6-B', '7-A', '8-C', '9-A', '10-B'];
        $subject = $this->getRandomSubject();
        $performance = [];
        
        for ($i = 0; $i < min($classCount, count($classes)); $i++) {
            $performance[] = [
                'class' => $classes[$i],
                'subject' => $subject,
                'students' => rand(20, 32),
                'averageGrade' => rand(65, 95) / 10,
                'attendanceRate' => rand(85, 98)
            ];
        }
        
        return $performance;
    }

    /**
     * Generate student name (mock)
     */
    private function generateStudentName(): string
    {
        $firstNames = [
            'Əli', 'Aysel', 'Rəşad', 'Nigar', 'Farid', 'Leyla', 
            'Mübariz', 'Gülnar', 'Vüsal', 'Səbinə', 'Tural', 'Aynur'
        ];
        $lastNames = [
            'Məmmədov', 'Quliyeva', 'Əliyev', 'Həsənova', 'Bayramov', 
            'Qasımova', 'Həsənov', 'Əhmədova', 'Rəhimli', 'Sultanova'
        ];
        
        return $firstNames[array_rand($firstNames)] . ' ' . $lastNames[array_rand($lastNames)];
    }

    /**
     * Generate grades for a student (mock)
     */
    private function generateGrades(): array
    {
        $grades = [];
        $gradeCount = rand(3, 8);
        
        for ($i = 0; $i < $gradeCount; $i++) {
            $grades[] = rand(5, 10);
        }
        
        return $grades;
    }
}