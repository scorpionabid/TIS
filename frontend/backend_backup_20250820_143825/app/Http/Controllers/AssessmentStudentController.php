<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class AssessmentStudentController extends Controller
{
    /**
     * Get students for assessment entry by institution
     */
    public function getStudentsByInstitution(Request $request, $institutionId): JsonResponse
    {
        $user = Auth::user();

        // Validate institution access
        $institution = Institution::find($institutionId);
        if (!$institution) {
            return response()->json([
                'success' => false,
                'message' => 'Təşkilat tapılmadı'
            ], 404);
        }

        // Check if user can access this institution's students
        if (!$this->canAccessInstitutionStudents($user, $institution)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu təşkilatın şagirdlərinə giriş icazəniz yoxdur'
            ], 403);
        }

        // Validate query parameters
        $validator = Validator::make($request->all(), [
            'grade_level' => 'sometimes|string|max:10',
            'class_name' => 'sometimes|string|max:50',
            'search' => 'sometimes|string|max:255',
            'per_page' => 'sometimes|integer|min:1|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        // Build query
        $query = Student::forInstitution($institutionId)
            ->active()
            ->orderBy('first_name')
            ->orderBy('last_name');

        // Apply filters
        if ($request->filled('grade_level')) {
            $query->byGradeLevel($request->grade_level);
        }

        if ($request->filled('class_name')) {
            $query->byClass($request->class_name);
        }

        if ($request->filled('search')) {
            $query->search($request->search);
        }

        $perPage = $request->get('per_page', 100);
        $students = $query->paginate($perPage);

        // Transform data for frontend
        $transformedStudents = $students->through(function ($student) {
            return [
                'id' => $student->id,
                'name' => $student->name,
                'student_number' => $student->student_number,
                'class_name' => $student->class_name,
                'grade_level' => $student->grade_level,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'age' => $student->age,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'students' => $transformedStudents->items(),
                'pagination' => [
                    'current_page' => $students->currentPage(),
                    'per_page' => $students->perPage(),
                    'total' => $students->total(),
                    'last_page' => $students->lastPage(),
                    'from' => $students->firstItem(),
                    'to' => $students->lastItem(),
                ]
            ],
            'message' => 'Şagirdlər uğurla yükləndi'
        ]);
    }

    /**
     * Get available grade levels for an institution
     */
    public function getGradeLevels(Request $request, $institutionId): JsonResponse
    {
        $user = Auth::user();

        // Validate institution access
        $institution = Institution::find($institutionId);
        if (!$institution) {
            return response()->json([
                'success' => false,
                'message' => 'Təşkilat tapılmadı'
            ], 404);
        }

        if (!$this->canAccessInstitutionStudents($user, $institution)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu təşkilata giriş icazəniz yoxdur'
            ], 403);
        }

        $gradeLevels = Student::forInstitution($institutionId)
            ->active()
            ->select('grade_level')
            ->distinct()
            ->orderBy('grade_level')
            ->pluck('grade_level')
            ->filter()
            ->values();

        return response()->json([
            'success' => true,
            'data' => $gradeLevels,
            'message' => 'Sinif səviyyələri alındı'
        ]);
    }

    /**
     * Get available classes for an institution
     */
    public function getClasses(Request $request, $institutionId): JsonResponse
    {
        $user = Auth::user();

        // Validate institution access
        $institution = Institution::find($institutionId);
        if (!$institution) {
            return response()->json([
                'success' => false,
                'message' => 'Təşkilat tapılmadı'
            ], 404);
        }

        if (!$this->canAccessInstitutionStudents($user, $institution)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu təşkilata giriş icazəniz yoxdur'
            ], 403);
        }

        $query = Student::forInstitution($institutionId)
            ->active()
            ->select('class_name', 'grade_level')
            ->distinct()
            ->orderBy('grade_level')
            ->orderBy('class_name');

        // Filter by grade level if provided
        if ($request->filled('grade_level')) {
            $query->where('grade_level', $request->grade_level);
        }

        $classes = $query->get()
            ->groupBy('grade_level')
            ->map(function ($classes, $gradeLevel) {
                return [
                    'grade_level' => $gradeLevel,
                    'classes' => $classes->pluck('class_name')->unique()->values()
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => $classes,
            'message' => 'Siniflər alındı'
        ]);
    }

    /**
     * Get student count by institution
     */
    public function getStudentCount(Request $request, $institutionId): JsonResponse
    {
        $user = Auth::user();

        // Validate institution access
        $institution = Institution::find($institutionId);
        if (!$institution) {
            return response()->json([
                'success' => false,
                'message' => 'Təşkilat tapılmadı'
            ], 404);
        }

        if (!$this->canAccessInstitutionStudents($user, $institution)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu təşkilata giriş icazəniz yoxdur'
            ], 403);
        }

        $query = Student::forInstitution($institutionId)->active();

        // Apply filters for count
        if ($request->filled('grade_level')) {
            $query->byGradeLevel($request->grade_level);
        }

        if ($request->filled('class_name')) {
            $query->byClass($request->class_name);
        }

        $count = $query->count();

        return response()->json([
            'success' => true,
            'data' => [
                'count' => $count,
                'institution_id' => $institutionId,
                'institution_name' => $institution->name
            ],
            'message' => 'Şagird sayı alındı'
        ]);
    }

    /**
     * Check if user can access institution students
     */
    private function canAccessInstitutionStudents($user, Institution $institution): bool
    {
        // SuperAdmin can access all
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // RegionAdmin can access their own institution
        if ($user->hasRole('regionadmin')) {
            return $institution->id === $user->institution_id;
        }

        // Other roles can access their own institution
        return $institution->id === $user->institution_id;
    }
}