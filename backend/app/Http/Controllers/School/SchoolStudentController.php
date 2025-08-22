<?php

namespace App\Http\Controllers\School;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\User;
use App\Models\StudentEnrollment;
use App\Services\SchoolStudentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class SchoolStudentController extends Controller
{
    private SchoolStudentService $studentService;

    public function __construct(SchoolStudentService $studentService)
    {
        $this->studentService = $studentService;
    }

    /**
     * Get students for the school
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        // SuperAdmin can access all schools
        if (!$school && !$user->hasRole('superadmin')) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $students = $this->studentService->getStudents($school, $request);

        return response()->json([
            'success' => true,
            'data' => $students
        ]);
    }

    /**
     * Store a new student
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'grade_id' => 'required|exists:grades,id',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'address' => 'nullable|string',
            'student_number' => 'nullable|string|unique:students,student_number',
            'enrollment_date' => 'nullable|date',
            'parent_name' => 'nullable|string|max:255',
            'parent_phone' => 'nullable|string|max:20',
            'parent_email' => 'nullable|email',
            'emergency_contact' => 'nullable|string',
            'special_needs' => 'nullable|string',
            'medical_conditions' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $student = $this->studentService->createStudent($school, $validator->validated());

            return response()->json([
                'success' => true,
                'data' => $student,
                'message' => 'Student created successfully'
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create student: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show a specific student
     */
    public function show(Student $student): JsonResponse
    {
        $user = Auth::user();
        
        // Check if student belongs to user's school
        if ($student->institution_id !== $user->institution_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $student->load(['user.profile', 'grade', 'enrollments.academicYear']);

        return response()->json([
            'success' => true,
            'data' => $student
        ]);
    }

    /**
     * Update a student
     */
    public function update(Request $request, Student $student): JsonResponse
    {
        $user = Auth::user();
        
        // Check if student belongs to user's school
        if ($student->institution_id !== $user->institution_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $student->user_id,
            'grade_id' => 'sometimes|required|exists:grades,id',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'address' => 'nullable|string',
            'student_number' => 'nullable|string|unique:students,student_number,' . $student->id,
            'parent_name' => 'nullable|string|max:255',
            'parent_phone' => 'nullable|string|max:20',
            'parent_email' => 'nullable|email',
            'emergency_contact' => 'nullable|string',
            'special_needs' => 'nullable|string',
            'medical_conditions' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $updatedStudent = $this->studentService->updateStudent($student, $validator->validated());

            return response()->json([
                'success' => true,
                'data' => $updatedStudent,
                'message' => 'Student updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update student: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a student (soft delete)
     */
    public function destroy(Student $student): JsonResponse
    {
        $user = Auth::user();
        
        // Check if student belongs to user's school
        if ($student->institution_id !== $user->institution_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $this->studentService->deleteStudent($student);

            return response()->json([
                'success' => true,
                'message' => 'Student deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete student: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk import students
     */
    public function bulkImport(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $validator = Validator::make($request->all(), [
            'students' => 'required|array|min:1',
            'students.*.name' => 'required|string|max:255',
            'students.*.email' => 'required|email',
            'students.*.grade_id' => 'required|exists:grades,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $result = $this->studentService->bulkImportStudents($school, $request->students);

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => "Successfully imported {$result['imported']} students"
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to import students: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available grades for the school
     */
    public function getAvailableGrades(): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (!$school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $grades = $this->studentService->getAvailableGrades($school);

        return response()->json([
            'success' => true,
            'data' => $grades
        ]);
    }

    /**
     * Enroll a student in the school
     */
    public function enrollStudent(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'student_id' => 'required|exists:users,id',
                'grade_id' => 'required|exists:grades,id',
            ]);

            $student = User::findOrFail($request->student_id);
            
            // Verify student belongs to this school
            $user = Auth::user();
            if ($student->institution_id !== $user->institution_id) {
                return response()->json([
                    'error' => 'Student does not belong to your school'
                ], 403);
            }

            // Update or create enrollment
            $enrollment = StudentEnrollment::updateOrCreate(
                ['student_id' => $student->id],
                [
                    'grade_id' => $request->grade_id,
                    'enrollment_status' => 'active',
                    'enrollment_date' => now(),
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Student enrolled successfully',
                'data' => $enrollment
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to enroll student: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Unenroll a student from the school
     */
    public function unenrollStudent(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'student_id' => 'required|exists:users,id',
            ]);

            $student = User::findOrFail($request->student_id);
            
            // Verify student belongs to this school
            $user = Auth::user();
            if ($student->institution_id !== $user->institution_id) {
                return response()->json([
                    'error' => 'Student does not belong to your school'
                ], 403);
            }

            // Update enrollment status
            $enrollment = StudentEnrollment::where('student_id', $student->id)
                ->first();

            if ($enrollment) {
                $enrollment->update([
                    'enrollment_status' => 'inactive',
                    'unenrollment_date' => now(),
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Student unenrolled successfully'
                ]);
            } else {
                return response()->json([
                    'error' => 'Student enrollment not found'
                ], 404);
            }

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to unenroll student: ' . $e->getMessage()
            ], 500);
        }
    }
}