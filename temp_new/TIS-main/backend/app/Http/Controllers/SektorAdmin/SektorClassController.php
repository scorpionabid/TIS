<?php

namespace App\Http\Controllers\SektorAdmin;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SektorClassController extends Controller
{
    /**
     * Get all classes in sector schools
     */
    public function getSectorClasses(Request $request): JsonResponse
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

            $query = Grade::whereIn('institution_id', $schoolIds)
                ->with(['institution', 'classTeacher']);

            // Apply filters
            if ($request->filled('school_id')) {
                $query->where('institution_id', $request->school_id);
            }

            if ($request->filled('grade_level')) {
                $query->where('level', $request->grade_level);
            }

            if ($request->filled('academic_year')) {
                $query->where('academic_year', $request->academic_year);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                        ->orWhere('short_name', 'LIKE', "%{$search}%");
                });
            }

            $classes = $query->orderBy('institution_id')
                ->orderBy('level')
                ->orderBy('name')
                ->paginate($request->get('per_page', 20));

            $transformedClasses = $classes->getCollection()->map(function ($class) {
                // Get student count for this class
                $studentCount = Student::where('class_id', $class->id)
                    ->where('is_active', true)
                    ->count();

                return [
                    'id' => $class->id,
                    'name' => $class->name,
                    'short_name' => $class->short_name,
                    'level' => $class->level,
                    'section' => $class->section,
                    'school' => [
                        'id' => $class->institution?->id,
                        'name' => $class->institution?->name,
                        'type' => $class->institution?->type,
                    ],
                    'class_teacher' => [
                        'id' => $class->classTeacher?->id,
                        'name' => $class->classTeacher?->name,
                        'email' => $class->classTeacher?->email,
                    ],
                    'student_count' => $studentCount,
                    'max_capacity' => $class->max_capacity ?? 30,
                    'academic_year' => $class->academic_year,
                    'room_number' => $class->room_number,
                    'is_active' => $class->is_active,
                    'created_at' => $class->created_at->format('Y-m-d'),
                ];
            });

            // Get class statistics
            $statistics = [
                'total_classes' => $classes->total(),
                'by_school' => Grade::whereIn('institution_id', $schoolIds)
                    ->join('institutions', 'grades.institution_id', '=', 'institutions.id')
                    ->selectRaw('institutions.id, institutions.name, COUNT(*) as class_count')
                    ->groupBy('institutions.id', 'institutions.name')
                    ->get(),
                'by_grade_level' => Grade::whereIn('institution_id', $schoolIds)
                    ->selectRaw('level, COUNT(*) as class_count')
                    ->groupBy('level')
                    ->orderBy('level')
                    ->get(),
                'total_students_in_classes' => Student::whereIn('class_id', function ($query) use ($schoolIds) {
                    $query->select('id')
                        ->from('grades')
                        ->whereIn('institution_id', $schoolIds);
                })->where('is_active', true)->count(),
                'average_class_size' => $this->getAverageClassSize($schoolIds),
            ];

            return response()->json([
                'classes' => $transformedClasses,
                'pagination' => [
                    'current_page' => $classes->currentPage(),
                    'last_page' => $classes->lastPage(),
                    'per_page' => $classes->perPage(),
                    'total' => $classes->total(),
                    'from' => $classes->firstItem(),
                    'to' => $classes->lastItem(),
                ],
                'statistics' => $statistics,
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sinif məlumatları yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get classes by specific school
     */
    public function getClassesBySchool(Request $request, int $schoolId): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        // Verify school belongs to sector
        $school = Institution::where('id', $schoolId)
            ->where('parent_id', $sector->id)
            ->first();

        if (! $school) {
            return response()->json([
                'message' => 'Seçilən məktəb sizin sektora aid deyil',
            ], 404);
        }

        try {
            $classes = Grade::where('institution_id', $schoolId)
                ->with(['classTeacher'])
                ->orderBy('level')
                ->orderBy('name')
                ->get();

            $transformedClasses = $classes->map(function ($class) {
                $studentCount = Student::where('class_id', $class->id)
                    ->where('is_active', true)
                    ->count();

                return [
                    'id' => $class->id,
                    'name' => $class->name,
                    'level' => $class->level,
                    'section' => $class->section,
                    'class_teacher' => [
                        'id' => $class->classTeacher?->id,
                        'name' => $class->classTeacher?->name,
                        'email' => $class->classTeacher?->email,
                    ],
                    'student_count' => $studentCount,
                    'max_capacity' => $class->max_capacity ?? 30,
                    'occupancy_rate' => $class->max_capacity ? round(($studentCount / $class->max_capacity) * 100, 1) : 0,
                    'room_number' => $class->room_number,
                    'academic_year' => $class->academic_year,
                    'is_active' => $class->is_active,
                ];
            });

            // Get school class statistics
            $schoolStats = [
                'total_classes' => $classes->count(),
                'total_students' => $transformedClasses->sum('student_count'),
                'by_grade_level' => $classes->groupBy('level')->map(function ($group) {
                    return $group->count();
                }),
                'average_class_size' => $transformedClasses->avg('student_count'),
                'classes_with_teacher' => $classes->whereNotNull('class_teacher_id')->count(),
            ];

            return response()->json([
                'school' => [
                    'id' => $school->id,
                    'name' => $school->name,
                    'type' => $school->type,
                ],
                'classes' => $transformedClasses,
                'statistics' => $schoolStats,
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Məktəb sinif məlumatları yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get class students
     */
    public function getClassStudents(Request $request, int $classId): JsonResponse
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
            // Get class and verify it belongs to sector
            $class = Grade::with(['institution'])
                ->whereHas('institution', function ($query) use ($sector) {
                    $query->where('parent_id', $sector->id);
                })
                ->find($classId);

            if (! $class) {
                return response()->json([
                    'message' => 'Sinif tapılmadı və ya sizin sektora aid deyil',
                ], 404);
            }

            $students = Student::where('class_id', $classId)
                ->where('is_active', true)
                ->orderBy('first_name')
                ->get();

            $transformedStudents = $students->map(function ($student) {
                return [
                    'id' => $student->id,
                    'student_id' => $student->student_id,
                    'full_name' => $student->first_name . ' ' . $student->last_name,
                    'gender' => $student->gender,
                    'date_of_birth' => $student->date_of_birth,
                    'enrollment_date' => $student->enrollment_date,
                    'status' => $student->status,
                    'contact_phone' => $student->contact_phone,
                ];
            });

            // Get class details with teacher
            $classDetails = [
                'id' => $class->id,
                'name' => $class->name,
                'level' => $class->level,
                'section' => $class->section,
                'school' => [
                    'id' => $class->institution->id,
                    'name' => $class->institution->name,
                ],
                'class_teacher' => $class->classTeacher ? [
                    'id' => $class->classTeacher->id,
                    'name' => $class->classTeacher->name,
                    'email' => $class->classTeacher->email,
                ] : null,
                'max_capacity' => $class->max_capacity,
                'room_number' => $class->room_number,
                'academic_year' => $class->academic_year,
            ];

            return response()->json([
                'class' => $classDetails,
                'students' => $transformedStudents,
                'student_count' => $students->count(),
                'statistics' => [
                    'total_students' => $students->count(),
                    'male_students' => $students->where('gender', 'male')->count(),
                    'female_students' => $students->where('gender', 'female')->count(),
                    'occupancy_rate' => $class->max_capacity ?
                        round(($students->count() / $class->max_capacity) * 100, 1) : 0,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sinif şagird məlumatları yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get class schedules overview
     */
    public function getClassSchedules(Request $request): JsonResponse
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

            // For now, return basic class information
            // When Schedule model is implemented, this will be enhanced
            $classes = Grade::whereIn('institution_id', $schoolIds)
                ->with(['institution'])
                ->get();

            $scheduleData = $classes->map(function ($class) {
                return [
                    'class_id' => $class->id,
                    'class_name' => $class->name,
                    'grade_level' => $class->level,
                    'school' => [
                        'id' => $class->institution->id,
                        'name' => $class->institution->name,
                    ],
                    'schedule_status' => 'Cədvəl sistemi hazırlanır',
                    'has_schedule' => false,
                ];
            });

            return response()->json([
                'classes' => $scheduleData,
                'total_classes' => $classes->count(),
                'message' => 'Dərs cədvəli sistemi hazırlanır',
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sinif cədvəl məlumatları yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Calculate average class size for sector schools
     */
    private function getAverageClassSize(array $schoolIds): float
    {
        $totalStudents = Student::whereIn('class_id', function ($query) use ($schoolIds) {
            $query->select('id')
                ->from('grades')
                ->whereIn('institution_id', $schoolIds);
        })->where('is_active', true)->count();

        $totalClasses = Grade::whereIn('institution_id', $schoolIds)->count();

        return $totalClasses > 0 ? round($totalStudents / $totalClasses, 1) : 0;
    }
}
