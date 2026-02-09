<?php

namespace App\Http\Controllers\SektorAdmin;

use App\Http\Controllers\BaseController;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SektorScheduleController extends BaseController
{
    /**
     * Get sector schedules overview
     */
    public function getSectorSchedules(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            // Get sector schools
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            $schools = Institution::whereIn('id', $schoolIds)
                ->with(['grades' => function ($query) {
                    $query->select('id', 'institution_id', 'name', 'level', 'class_teacher_id')
                        ->with(['classTeacher:id,name']);
                }])
                ->get();

            $scheduleData = $schools->map(function ($school) {
                $classes = $school->grades->map(function ($class) {
                    return [
                        'class_id' => $class->id,
                        'class_name' => $class->name,
                        'grade_level' => $class->level,
                        'class_teacher' => [
                            'id' => $class->classTeacher?->id,
                            'name' => $class->classTeacher?->name,
                        ],
                        'schedule_status' => 'Hazırlanır', // Will be dynamic when schedule system is implemented
                        'weekly_hours' => rand(25, 35), // Mock data - will be real when implemented
                        'subjects_count' => rand(8, 12),
                    ];
                });

                return [
                    'school_id' => $school->id,
                    'school_name' => $school->name,
                    'school_type' => $school->type,
                    'total_classes' => $school->grades->count(),
                    'classes_with_teacher' => $school->grades->whereNotNull('class_teacher_id')->count(),
                    'schedule_completion' => rand(60, 90), // Mock percentage
                    'classes' => $classes,
                ];
            });

            // Calculate sector statistics
            $totalClasses = $scheduleData->sum('total_classes');
            $classesWithTeacher = $scheduleData->sum('classes_with_teacher');
            $averageCompletion = $scheduleData->avg('schedule_completion');

            $statistics = [
                'total_schools' => $schools->count(),
                'total_classes' => $totalClasses,
                'classes_with_teacher' => $classesWithTeacher,
                'teacher_assignment_rate' => $totalClasses > 0 ? round(($classesWithTeacher / $totalClasses) * 100, 1) : 0,
                'average_schedule_completion' => round($averageCompletion, 1),
            ];

            return response()->json([
                'schools' => $scheduleData,
                'statistics' => $statistics,
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                ],
                'note' => 'Dərs cədvəli sistemi hazırlanır. Hazırda əsas məlumatlar göstərilir.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Cədvəl məlumatları yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get teacher schedules for sector
     */
    public function getTeacherSchedules(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            // Get sector schools
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            // Get all teachers in sector schools
            $teachers = User::whereIn('institution_id', $schoolIds)
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'müəllim');
                })
                ->with(['institution', 'profile'])
                ->where('is_active', true)
                ->get();

            $teacherSchedules = $teachers->map(function ($teacher) {
                // Mock schedule data - will be real when schedule system is implemented
                $weeklyHours = rand(18, 25);
                $subjectCount = rand(1, 3);

                return [
                    'teacher_id' => $teacher->id,
                    'teacher_name' => $teacher->name,
                    'school' => [
                        'id' => $teacher->institution->id,
                        'name' => $teacher->institution->name,
                    ],
                    'subjects' => $teacher->profile?->subjects ?? ['Müəyyən edilməyib'],
                    'weekly_hours' => $weeklyHours,
                    'workload_percentage' => round(($weeklyHours / 25) * 100, 1),
                    'assigned_classes' => rand(2, 5),
                    'schedule_status' => $weeklyHours >= 20 ? 'Tam' : 'Qismən',
                    'free_periods' => rand(0, 5),
                ];
            });

            // Group by school
            $bySchool = $teacherSchedules->groupBy('school.id')->map(function ($schoolTeachers, $schoolId) {
                $firstTeacher = $schoolTeachers->first();

                return [
                    'school_id' => $schoolId,
                    'school_name' => $firstTeacher['school']['name'],
                    'teacher_count' => $schoolTeachers->count(),
                    'avg_workload' => round($schoolTeachers->avg('workload_percentage'), 1),
                    'teachers' => $schoolTeachers->values(),
                ];
            })->values();

            $statistics = [
                'total_teachers' => $teachers->count(),
                'avg_weekly_hours' => round($teacherSchedules->avg('weekly_hours'), 1),
                'avg_workload_percentage' => round($teacherSchedules->avg('workload_percentage'), 1),
                'fully_scheduled' => $teacherSchedules->where('workload_percentage', '>=', 80)->count(),
                'under_scheduled' => $teacherSchedules->where('workload_percentage', '<', 60)->count(),
            ];

            return response()->json([
                'teachers' => $teacherSchedules,
                'by_school' => $bySchool,
                'statistics' => $statistics,
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                ],
                'note' => 'Müəllim cədvəl sistemi hazırlanır. Hazırda nümunə məlumatlar göstərilir.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Müəllim cədvəl məlumatları yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get schedule statistics for sector
     */
    public function getScheduleStatistics(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            // Get sector schools
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            $schools = Institution::whereIn('id', $schoolIds)->get();
            $totalClasses = Grade::whereIn('institution_id', $schoolIds)->count();
            $totalTeachers = User::whereIn('institution_id', $schoolIds)
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'müəllim');
                })
                ->where('is_active', true)
                ->count();

            // Mock statistics - will be real when schedule system is implemented
            $statistics = [
                'overview' => [
                    'total_schools' => $schools->count(),
                    'total_classes' => $totalClasses,
                    'total_teachers' => $totalTeachers,
                    'teacher_to_class_ratio' => $totalClasses > 0 ? round($totalTeachers / $totalClasses, 2) : 0,
                ],
                'schedule_completion' => [
                    'completed_schedules' => rand(60, 85),
                    'pending_schedules' => rand(10, 25),
                    'incomplete_schedules' => rand(0, 15),
                    'completion_rate' => rand(70, 90),
                ],
                'teacher_workload' => [
                    'fully_loaded' => rand(40, 65),
                    'under_loaded' => rand(15, 30),
                    'over_loaded' => rand(5, 15),
                    'average_hours_per_week' => rand(20, 24),
                ],
                'by_school' => $schools->map(function ($school) {
                    return [
                        'school_id' => $school->id,
                        'school_name' => $school->name,
                        'completion_rate' => rand(60, 95),
                        'teacher_count' => rand(15, 40),
                        'class_count' => rand(10, 25),
                    ];
                }),
            ];

            return response()->json([
                'statistics' => $statistics,
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'region' => $sector->parent?->name ?? 'Bilinmir',
                ],
                'generated_at' => now()->format('Y-m-d H:i:s'),
                'note' => 'Bu nümunə məlumatlarıdır. Real cədvəl sistemi hazırlandıqdan sonra dəqiq məlumatlar göstəriləcək.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Cədvəl statistikları yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
