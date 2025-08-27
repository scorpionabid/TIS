<?php

namespace App\Services;

use App\Models\Grade;
use App\Models\User;
use App\Models\StudentEnrollment;
use Illuminate\Support\Facades\DB;

class ClassAnalyticsService extends BaseService
{
    /**
     * Get comprehensive class statistics
     */
    public function getClassStatistics(User $user): array
    {
        $query = Grade::query();

        // Apply regional filtering
        if (!$user->hasRole('superadmin')) {
            if ($user->hasRole('regionadmin')) {
                $query->whereHas('institution', function ($q) use ($user) {
                    $q->where('parent_id', $user->institution_id)
                      ->orWhere('id', $user->institution_id);
                });
            } elseif ($user->hasRole(['sektoradmin', 'məktəbadmin', 'müəllim'])) {
                $query->where('institution_id', $user->institution_id);
            }
        }

        $totalClasses = $query->count();
        $activeClasses = $query->where('is_active', true)->count();
        $inactiveClasses = $totalClasses - $activeClasses;

        // Students statistics
        $totalStudents = StudentEnrollment::whereHas('grade', function ($q) use ($query) {
            $q->whereIn('id', $query->pluck('id'));
        })->where('enrollment_status', 'active')->count();

        // Grade level distribution
        $gradeDistribution = $this->getGradeLevelDistribution($query);

        // Capacity statistics
        $capacityStats = $this->getCapacityStatistics($query);

        // Institution breakdown
        $institutionBreakdown = $this->getInstitutionBreakdown($query);

        // Teacher assignment stats
        $teacherStats = $this->getTeacherAssignmentStats($query);

        return [
            'overview' => [
                'total_classes' => $totalClasses,
                'active_classes' => $activeClasses,
                'inactive_classes' => $inactiveClasses,
                'total_students' => $totalStudents,
                'average_class_size' => $activeClasses > 0 ? round($totalStudents / $activeClasses, 2) : 0,
            ],
            'grade_distribution' => $gradeDistribution,
            'capacity_statistics' => $capacityStats,
            'institution_breakdown' => $institutionBreakdown,
            'teacher_statistics' => $teacherStats,
        ];
    }

    /**
     * Get grade level distribution
     */
    private function getGradeLevelDistribution($query): array
    {
        return $query->where('is_active', true)
            ->select('class_level', DB::raw('count(*) as count'))
            ->groupBy('class_level')
            ->orderBy('class_level')
            ->get()
            ->map(function ($item) {
                return [
                    'grade_level' => $item->class_level,
                    'class_count' => $item->count,
                ];
            })
            ->toArray();
    }

    /**
     * Get capacity statistics
     */
    private function getCapacityStatistics($query): array
    {
        return $query->where('is_active', true)
            ->with('room')
            ->get()
            ->reduce(function ($carry, $class) {
                $capacity = $class->room?->capacity ?? 30; // Default capacity
                $currentCount = $class->getCurrentStudentCount();
                
                $carry['total_capacity'] += $capacity;
                $carry['occupied_capacity'] += $currentCount;
                $carry['available_capacity'] = $carry['total_capacity'] - $carry['occupied_capacity'];
                $carry['utilization_rate'] = $carry['total_capacity'] > 0 
                    ? round(($carry['occupied_capacity'] / $carry['total_capacity']) * 100, 2)
                    : 0;
                
                // Track overcrowded classes
                if ($currentCount > $capacity) {
                    $carry['overcrowded_classes']++;
                }
                
                return $carry;
            }, [
                'total_capacity' => 0, 
                'occupied_capacity' => 0, 
                'available_capacity' => 0,
                'utilization_rate' => 0,
                'overcrowded_classes' => 0
            ]);
    }

    /**
     * Get institution breakdown
     */
    private function getInstitutionBreakdown($query): array
    {
        return $query->where('is_active', true)
            ->with('institution')
            ->get()
            ->groupBy('institution.name')
            ->map(function ($classes, $institutionName) {
                $studentCount = $classes->sum(function ($class) {
                    return $class->getCurrentStudentCount();
                });
                
                return [
                    'institution_name' => $institutionName,
                    'class_count' => $classes->count(),
                    'student_count' => $studentCount,
                    'average_class_size' => $classes->count() > 0 ? round($studentCount / $classes->count(), 2) : 0,
                ];
            })
            ->values()
            ->toArray();
    }

    /**
     * Get teacher assignment statistics
     */
    private function getTeacherAssignmentStats($query): array
    {
        $classes = $query->where('is_active', true)
            ->with('homeroomTeacher')
            ->get();

        $assignedClasses = $classes->filter(function ($class) {
            return $class->homeroom_teacher_id !== null;
        })->count();

        $unassignedClasses = $classes->count() - $assignedClasses;

        $teacherWorkload = $classes
            ->filter(function ($class) {
                return $class->homeroom_teacher_id !== null;
            })
            ->groupBy('homeroom_teacher_id')
            ->map(function ($teacherClasses) {
                $teacher = $teacherClasses->first()->homeroomTeacher;
                return [
                    'teacher_id' => $teacher->id,
                    'teacher_name' => $teacher->profile 
                        ? "{$teacher->profile->first_name} {$teacher->profile->last_name}"
                        : $teacher->username,
                    'class_count' => $teacherClasses->count(),
                    'student_count' => $teacherClasses->sum(function ($class) {
                        return $class->getCurrentStudentCount();
                    }),
                ];
            })
            ->values()
            ->toArray();

        return [
            'assigned_classes' => $assignedClasses,
            'unassigned_classes' => $unassignedClasses,
            'assignment_rate' => $classes->count() > 0 
                ? round(($assignedClasses / $classes->count()) * 100, 2) 
                : 0,
            'teacher_workload' => $teacherWorkload,
        ];
    }

    /**
     * Get class performance metrics
     */
    public function getClassPerformanceMetrics(Grade $class): array
    {
        $studentCount = $class->getCurrentStudentCount();
        $capacity = $class->room?->capacity ?? 30;
        
        return [
            'enrollment' => [
                'current_students' => $studentCount,
                'capacity' => $capacity,
                'utilization_rate' => $capacity > 0 ? round(($studentCount / $capacity) * 100, 2) : 0,
                'remaining_spots' => max(0, $capacity - $studentCount),
                'is_overcrowded' => $studentCount > $capacity,
            ],
            'academic_performance' => $this->getAcademicPerformance($class),
            'attendance' => $this->getAttendanceMetrics($class),
        ];
    }

    /**
     * Get academic performance for class
     */
    private function getAcademicPerformance(Grade $class): array
    {
        // This would typically involve grade/assessment data
        // For now, returning placeholder structure
        return [
            'average_grade' => 0,
            'passing_rate' => 0,
            'subject_performance' => [],
            'top_performers' => [],
            'struggling_students' => [],
        ];
    }

    /**
     * Get attendance metrics for class
     */
    private function getAttendanceMetrics(Grade $class): array
    {
        // This would typically involve attendance data
        // For now, returning placeholder structure
        return [
            'overall_attendance_rate' => 0,
            'chronic_absenteeism_rate' => 0,
            'perfect_attendance_count' => 0,
            'monthly_trends' => [],
        ];
    }

    /**
     * Get class comparison data
     */
    public function getClassComparison(array $classIds): array
    {
        $classes = Grade::whereIn('id', $classIds)
            ->with(['institution', 'room', 'activeStudents'])
            ->get();

        return $classes->map(function ($class) {
            return [
                'class_id' => $class->id,
                'class_name' => $class->display_name,
                'institution' => $class->institution->name,
                'student_count' => $class->getCurrentStudentCount(),
                'capacity' => $class->room?->capacity ?? 30,
                'utilization_rate' => $this->calculateUtilizationRate($class),
                'performance_metrics' => $this->getClassPerformanceMetrics($class),
            ];
        })->toArray();
    }

    /**
     * Calculate utilization rate for a class
     */
    private function calculateUtilizationRate(Grade $class): float
    {
        $studentCount = $class->getCurrentStudentCount();
        $capacity = $class->room?->capacity ?? 30;
        
        return $capacity > 0 ? round(($studentCount / $capacity) * 100, 2) : 0;
    }

    /**
     * Get trending classes (most/least enrolled)
     */
    public function getTrendingClasses(User $user, string $type = 'most_enrolled'): array
    {
        $query = Grade::with(['institution', 'room', 'academicYear'])
            ->where('is_active', true);

        // Apply regional filtering
        if (!$user->hasRole('superadmin')) {
            if ($user->hasRole('regionadmin')) {
                $query->whereHas('institution', function ($q) use ($user) {
                    $q->where('parent_id', $user->institution_id)
                      ->orWhere('id', $user->institution_id);
                });
            } elseif ($user->hasRole(['sektoradmin', 'məktəbadmin', 'müəllim'])) {
                $query->where('institution_id', $user->institution_id);
            }
        }

        $classes = $query->get()->map(function ($class) {
            return [
                'id' => $class->id,
                'name' => $class->display_name,
                'institution' => $class->institution->name,
                'student_count' => $class->getCurrentStudentCount(),
                'capacity' => $class->room?->capacity ?? 30,
                'utilization_rate' => $this->calculateUtilizationRate($class),
                'academic_year' => $class->academicYear->name,
            ];
        });

        // Sort based on type
        if ($type === 'most_enrolled') {
            return $classes->sortByDesc('student_count')->take(10)->values()->toArray();
        } elseif ($type === 'least_enrolled') {
            return $classes->sortBy('student_count')->take(10)->values()->toArray();
        } elseif ($type === 'overcrowded') {
            return $classes->filter(function ($class) {
                return $class['student_count'] > $class['capacity'];
            })->sortByDesc('utilization_rate')->values()->toArray();
        }

        return [];
    }
}