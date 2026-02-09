<?php

namespace App\Http\Controllers\Grade;

use App\Http\Controllers\BaseController;
use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\Institution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GradeStatsController extends BaseController
{
    /**
     * Get grade statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Grade::query();

        // Apply regional access control
        if (! $user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            $query->whereIn('institution_id', $accessibleInstitutions);
        }

        // Filter by academic year (default to active)
        $academicYearId = $request->get('academic_year_id');
        if ($academicYearId) {
            $query->where('academic_year_id', $academicYearId);
        } else {
            $activeYear = AcademicYear::where('is_active', true)->first();
            if ($activeYear) {
                $query->where('academic_year_id', $activeYear->id);
            }
        }

        $totalGrades = $query->count();
        $activeGrades = $query->where('is_active', true)->count();
        $inactiveGrades = $totalGrades - $activeGrades;

        // Class level distribution
        $levelDistribution = $query->where('is_active', true)
            ->select('class_level', DB::raw('count(*) as count'))
            ->groupBy('class_level')
            ->orderBy('class_level')
            ->get()
            ->map(function ($item) {
                return [
                    'class_level' => $item->class_level,
                    'count' => $item->count,
                ];
            });

        // Student statistics
        $studentStats = $query->where('is_active', true)
            ->selectRaw('
                AVG(student_count) as average_students,
                MIN(student_count) as min_students,
                MAX(student_count) as max_students,
                SUM(student_count) as total_students
            ')
            ->first();

        // Room utilization
        $gradesWithRooms = $query->where('is_active', true)->whereNotNull('room_id')->count();
        $gradesWithoutRooms = $activeGrades - $gradesWithRooms;

        // Teacher assignment
        $gradesWithTeachers = $query->where('is_active', true)->whereNotNull('homeroom_teacher_id')->count();
        $gradesWithoutTeachers = $activeGrades - $gradesWithTeachers;

        // Specialty distribution
        $specialtyStats = $query->where('is_active', true)
            ->whereNotNull('specialty')
            ->select('specialty', DB::raw('count(*) as count'))
            ->groupBy('specialty')
            ->get()
            ->map(function ($item) {
                return [
                    'specialty' => $item->specialty,
                    'count' => $item->count,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'overview' => [
                    'total_grades' => $totalGrades,
                    'active_grades' => $activeGrades,
                    'inactive_grades' => $inactiveGrades,
                    'grades_with_rooms' => $gradesWithRooms,
                    'grades_without_rooms' => $gradesWithoutRooms,
                    'grades_with_teachers' => $gradesWithTeachers,
                    'grades_without_teachers' => $gradesWithoutTeachers,
                ],
                'students' => [
                    'total_students' => (int) $studentStats->total_students,
                    'average_per_grade' => round($studentStats->average_students, 1),
                    'min_per_grade' => (int) $studentStats->min_students,
                    'max_per_grade' => (int) $studentStats->max_students,
                ],
                'class_level_distribution' => $levelDistribution,
                'specialty_distribution' => $specialtyStats,
                'resource_utilization' => [
                    'room_assignment_rate' => $activeGrades > 0
                        ? round(($gradesWithRooms / $activeGrades) * 100, 2)
                        : 0,
                    'teacher_assignment_rate' => $activeGrades > 0
                        ? round(($gradesWithTeachers / $activeGrades) * 100, 2)
                        : 0,
                ],
            ],
            'message' => 'Sinif statistikaları uğurla alındı',
        ]);
    }

    /**
     * Get capacity analysis for grades.
     */
    public function capacityAnalysis(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Grade::with('room');

        // Apply regional access control
        if (! $user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            $query->whereIn('institution_id', $accessibleInstitutions);
        }

        // Filter by institution if provided
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        // Filter by academic year (default to active)
        $academicYearId = $request->get('academic_year_id');
        if ($academicYearId) {
            $query->where('academic_year_id', $academicYearId);
        } else {
            $activeYear = AcademicYear::where('is_active', true)->first();
            if ($activeYear) {
                $query->where('academic_year_id', $activeYear->id);
            }
        }

        $grades = $query->where('is_active', true)->get();

        $capacityData = [
            'total_capacity' => 0,
            'total_students' => 0,
            'utilization_percentage' => 0,
            'overutilized_grades' => 0,
            'underutilized_grades' => 0,
            'optimal_grades' => 0,
            'no_room_grades' => 0,
            'capacity_breakdown' => [
                'available' => [],
                'full' => [],
                'over_capacity' => [],
                'no_room' => [],
            ],
        ];

        foreach ($grades as $grade) {
            if (! $grade->room) {
                $capacityData['no_room_grades']++;
                $capacityData['capacity_breakdown']['no_room'][] = [
                    'id' => $grade->id,
                    'name' => $grade->name,
                    'student_count' => $grade->student_count,
                    'class_level' => $grade->class_level,
                ];

                continue;
            }

            $capacity = $grade->room->capacity;
            $studentCount = $grade->student_count;
            $utilizationRate = $capacity > 0 ? ($studentCount / $capacity) * 100 : 0;

            $capacityData['total_capacity'] += $capacity;
            $capacityData['total_students'] += $studentCount;

            $gradeInfo = [
                'id' => $grade->id,
                'name' => $grade->name,
                'student_count' => $studentCount,
                'capacity' => $capacity,
                'utilization_rate' => round($utilizationRate, 2),
                'class_level' => $grade->class_level,
                'room_name' => $grade->room->name,
            ];

            if ($studentCount > $capacity) {
                $capacityData['overutilized_grades']++;
                $capacityData['capacity_breakdown']['over_capacity'][] = $gradeInfo;
            } elseif ($studentCount === $capacity) {
                $capacityData['optimal_grades']++;
                $capacityData['capacity_breakdown']['full'][] = $gradeInfo;
            } else {
                $capacityData['underutilized_grades']++;
                $capacityData['capacity_breakdown']['available'][] = $gradeInfo;
            }
        }

        $capacityData['utilization_percentage'] = $capacityData['total_capacity'] > 0
            ? round(($capacityData['total_students'] / $capacityData['total_capacity']) * 100, 2)
            : 0;

        return response()->json([
            'success' => true,
            'data' => $capacityData,
            'message' => 'Sinif tutum analizi uğurla alındı',
        ]);
    }

    /**
     * Get performance trends for grades.
     */
    public function performanceTrends(Request $request): JsonResponse
    {
        $user = $request->user();

        // Get accessible institutions
        $accessibleInstitutions = [];
        if (! $user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
        }

        // Get recent academic years for trend analysis
        $academicYears = AcademicYear::orderBy('start_date', 'desc')
            ->take(3)
            ->get();

        $trends = [];

        foreach ($academicYears as $year) {
            $query = Grade::where('academic_year_id', $year->id);

            if (! empty($accessibleInstitutions)) {
                $query->whereIn('institution_id', $accessibleInstitutions);
            }

            $yearData = [
                'academic_year' => [
                    'id' => $year->id,
                    'name' => $year->name,
                ],
                'total_grades' => $query->count(),
                'active_grades' => $query->where('is_active', true)->count(),
                'total_students' => $query->sum('student_count'),
                'average_class_size' => round($query->avg('student_count'), 1),
                'class_level_distribution' => $query->select('class_level', DB::raw('count(*) as count'))
                    ->groupBy('class_level')
                    ->get()
                    ->pluck('count', 'class_level'),
            ];

            $trends[] = $yearData;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'trends' => $trends,
                'summary' => [
                    'years_analyzed' => count($trends),
                    'trend_direction' => $this->calculateTrendDirection($trends),
                ],
            ],
            'message' => 'Sinif performans trendləri uğurla alındı',
        ]);
    }

    /**
     * Helper methods
     */
    private function getUserAccessibleInstitutions($user): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }

        $institutions = [];

        if ($user->hasRole('regionadmin')) {
            $institutions = Institution::where('parent_id', $user->institution_id)->pluck('id')->toArray();
            $institutions[] = $user->institution_id;
        } elseif ($user->hasRole('sektoradmin')) {
            $institutions = Institution::where('parent_id', $user->institution_id)->pluck('id')->toArray();
            $institutions[] = $user->institution_id;
        } else {
            $institutions = [$user->institution_id];
        }

        return $institutions;
    }

    private function calculateTrendDirection($trends): string
    {
        if (count($trends) < 2) {
            return 'insufficient_data';
        }

        $latest = $trends[0]['total_students'] ?? 0;
        $previous = $trends[1]['total_students'] ?? 0;

        if ($latest > $previous) {
            return 'increasing';
        } elseif ($latest < $previous) {
            return 'decreasing';
        }

        return 'stable';
    }
}
