<?php

namespace App\Http\Controllers\SektorAdmin;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SektorStudentController extends Controller
{
    /**
     * Get all students in sector schools
     */
    public function getSectorStudents(Request $request): JsonResponse
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

            $query = Student::whereIn('institution_id', $schoolIds)
                ->with(['institution', 'grade'])
                ->where('is_active', true);

            // Apply filters
            if ($request->filled('school_id')) {
                $query->where('institution_id', $request->school_id);
            }

            if ($request->filled('grade_level')) {
                $query->whereHas('grade', function ($q) use ($request) {
                    $q->where('level', $request->grade_level);
                });
            }

            if ($request->filled('class_id')) {
                $query->where('class_id', $request->class_id);
            }

            if ($request->filled('gender')) {
                $query->where('gender', $request->gender);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'LIKE', "%{$search}%")
                        ->orWhere('last_name', 'LIKE', "%{$search}%")
                        ->orWhere('student_id', 'LIKE', "%{$search}%")
                        ->orWhere('national_id', 'LIKE', "%{$search}%");
                });
            }

            $students = $query->orderBy('first_name')
                ->paginate($request->get('per_page', 25));

            $transformedStudents = $students->getCollection()->map(function ($student) {
                return [
                    'id' => $student->id,
                    'student_id' => $student->student_id,
                    'full_name' => $student->first_name . ' ' . $student->last_name,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'national_id' => $student->national_id,
                    'date_of_birth' => $student->date_of_birth,
                    'gender' => $student->gender,
                    'school' => [
                        'id' => $student->institution?->id,
                        'name' => $student->institution?->name,
                        'type' => $student->institution?->type,
                    ],
                    'grade' => [
                        'id' => $student->grade?->id,
                        'name' => $student->grade?->name,
                        'level' => $student->grade?->level,
                    ],
                    'enrollment_date' => $student->enrollment_date,
                    'status' => $student->status,
                    'parent_contact' => [
                        'father_name' => $student->father_name,
                        'mother_name' => $student->mother_name,
                        'contact_phone' => $student->contact_phone,
                        'address' => $student->address,
                    ],
                    'academic_year' => $student->academic_year,
                    'created_at' => $student->created_at->format('Y-m-d'),
                ];
            });

            // Get student statistics
            $statistics = [
                'total_students' => $students->total(),
                'by_school' => Student::whereIn('institution_id', $schoolIds)
                    ->where('is_active', true)
                    ->join('institutions', 'students.institution_id', '=', 'institutions.id')
                    ->selectRaw('institutions.id, institutions.name, COUNT(*) as count')
                    ->groupBy('institutions.id', 'institutions.name')
                    ->get(),
                'by_grade_level' => Student::whereIn('institution_id', $schoolIds)
                    ->where('is_active', true)
                    ->join('grades', 'students.class_id', '=', 'grades.id')
                    ->selectRaw('grades.level, COUNT(*) as count')
                    ->groupBy('grades.level')
                    ->orderBy('grades.level')
                    ->get(),
                'by_gender' => Student::whereIn('institution_id', $schoolIds)
                    ->where('is_active', true)
                    ->selectRaw('gender, COUNT(*) as count')
                    ->groupBy('gender')
                    ->get(),
                'enrollment_trend' => $this->getEnrollmentTrend($schoolIds),
            ];

            return response()->json([
                'students' => $transformedStudents,
                'pagination' => [
                    'current_page' => $students->currentPage(),
                    'last_page' => $students->lastPage(),
                    'per_page' => $students->perPage(),
                    'total' => $students->total(),
                    'from' => $students->firstItem(),
                    'to' => $students->lastItem(),
                ],
                'statistics' => $statistics,
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Şagird məlumatları yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get students by specific school
     */
    public function getStudentsBySchool(Request $request, int $schoolId): JsonResponse
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
            $students = Student::where('institution_id', $schoolId)
                ->with(['grade'])
                ->where('is_active', true)
                ->orderBy('first_name')
                ->get();

            $transformedStudents = $students->map(function ($student) {
                return [
                    'id' => $student->id,
                    'student_id' => $student->student_id,
                    'full_name' => $student->first_name . ' ' . $student->last_name,
                    'grade' => [
                        'id' => $student->grade?->id,
                        'name' => $student->grade?->name,
                        'level' => $student->grade?->level,
                    ],
                    'gender' => $student->gender,
                    'date_of_birth' => $student->date_of_birth,
                    'enrollment_date' => $student->enrollment_date,
                    'status' => $student->status,
                ];
            });

            // Get school-specific statistics
            $schoolStats = [
                'total_students' => $students->count(),
                'by_grade' => $students->groupBy('grade.level')->map(function ($group) {
                    return $group->count();
                }),
                'by_gender' => $students->groupBy('gender')->map(function ($group) {
                    return $group->count();
                }),
                'enrollment_this_year' => $students->where('created_at', '>=', now()->startOfYear())->count(),
            ];

            return response()->json([
                'school' => [
                    'id' => $school->id,
                    'name' => $school->name,
                    'type' => $school->type,
                ],
                'students' => $transformedStudents,
                'statistics' => $schoolStats,
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Məktəb şagird məlumatları yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get sector student statistics
     */
    public function getStudentStatistics(Request $request): JsonResponse
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
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            $statistics = [
                'overview' => [
                    'total_students' => Student::whereIn('institution_id', $schoolIds)->where('is_active', true)->count(),
                    'total_schools' => count($schoolIds),
                    'average_students_per_school' => count($schoolIds) > 0
                        ? round(Student::whereIn('institution_id', $schoolIds)->where('is_active', true)->count() / count($schoolIds), 1)
                        : 0,
                ],
                'by_school' => Student::whereIn('institution_id', $schoolIds)
                    ->where('is_active', true)
                    ->join('institutions', 'students.institution_id', '=', 'institutions.id')
                    ->selectRaw('institutions.id, institutions.name, institutions.type, COUNT(*) as student_count')
                    ->groupBy('institutions.id', 'institutions.name', 'institutions.type')
                    ->orderBy('student_count', 'desc')
                    ->get(),
                'by_grade_level' => Student::whereIn('institution_id', $schoolIds)
                    ->where('is_active', true)
                    ->join('grades', 'students.class_id', '=', 'grades.id')
                    ->selectRaw('grades.level as grade_level, COUNT(*) as student_count')
                    ->groupBy('grades.level')
                    ->orderBy('grades.level')
                    ->get(),
                'gender_distribution' => Student::whereIn('institution_id', $schoolIds)
                    ->where('is_active', true)
                    ->selectRaw('gender, COUNT(*) as count')
                    ->groupBy('gender')
                    ->get(),
                'enrollment_trend' => $this->getEnrollmentTrend($schoolIds),
                'age_distribution' => $this->getAgeDistribution($schoolIds),
            ];

            return response()->json([
                'statistics' => $statistics,
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'region' => $sector->parent?->name ?? 'Bilinmir',
                ],
                'generated_at' => now()->format('Y-m-d H:i:s'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Statistik məlumatlar yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export student data for sector
     */
    public function exportStudentData(Request $request): JsonResponse
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
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            $students = Student::whereIn('institution_id', $schoolIds)
                ->with(['institution', 'grade'])
                ->where('is_active', true)
                ->orderBy('institution_id')
                ->orderBy('first_name')
                ->get();

            $exportData = $students->map(function ($student) {
                return [
                    'Şagird ID' => $student->student_id,
                    'Ad' => $student->first_name,
                    'Soyad' => $student->last_name,
                    'Milli ID' => $student->national_id,
                    'Doğum tarixi' => $student->date_of_birth,
                    'Cinsi' => $student->gender === 'male' ? 'Kişi' : 'Qadın',
                    'Məktəb' => $student->institution?->name,
                    'Sinif' => $student->grade?->name,
                    'Sinif səviyyəsi' => $student->grade?->level,
                    'Qeydiyyat tarixi' => $student->enrollment_date,
                    'Status' => $student->status,
                    'Ata adı' => $student->father_name,
                    'Ana adı' => $student->mother_name,
                    'Əlaqə telefonu' => $student->contact_phone,
                    'Ünvan' => $student->address,
                    'Dərs ili' => $student->academic_year,
                ];
            });

            return response()->json([
                'message' => 'Şagird məlumatları ixrac edildi',
                'data' => $exportData,
                'total_records' => $exportData->count(),
                'export_date' => now()->format('Y-m-d H:i:s'),
                'sector' => $sector->name,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Məlumatlar ixrac edilə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get enrollment trend for schools
     */
    private function getEnrollmentTrend(array $schoolIds): array
    {
        return Student::whereIn('institution_id', $schoolIds)
            ->where('is_active', true)
            ->where('created_at', '>=', now()->subMonths(12))
            ->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(*) as count')
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->toArray();
    }

    /**
     * Get age distribution of students
     */
    private function getAgeDistribution(array $schoolIds): array
    {
        return Student::whereIn('institution_id', $schoolIds)
            ->where('is_active', true)
            ->selectRaw('
                CASE 
                    WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 6 AND 8 THEN "6-8 yaş"
                    WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 9 AND 11 THEN "9-11 yaş"
                    WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 12 AND 14 THEN "12-14 yaş"
                    WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 15 AND 17 THEN "15-17 yaş"
                    ELSE "18+ yaş"
                END as age_group,
                COUNT(*) as count
            ')
            ->groupBy('age_group')
            ->get()
            ->toArray();
    }
}
