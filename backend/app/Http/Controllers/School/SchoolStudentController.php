<?php

namespace App\Http\Controllers\School;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\User;
use App\Services\SchoolStudentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
        if (! $school && ! $user->hasRole('superadmin')) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $students = $this->studentService->getStudents($school, $request);

        return response()->json([
            'success' => true,
            'data' => $students,
        ]);
    }

    /**
     * Store a new student
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (! $school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'student_number' => 'required|string|unique:students,student_number',
            'name' => 'nullable|string|max:255',
            'email' => 'nullable|email|unique:users,email',
            'grade_id' => 'nullable|exists:grades,id',
            'class_id' => 'nullable|exists:grades,id',
            'phone' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'address' => 'nullable|string',
            'enrollment_date' => 'nullable|date',
            'status' => 'nullable|in:active,inactive',
            'guardian_name' => 'nullable|string|max:255',
            'guardian_phone' => 'nullable|string|max:20',
            'guardian_email' => 'nullable|email',
            'guardian_relation' => 'nullable|string|max:100',
            'emergency_contact' => 'nullable|string',
            'medical_conditions' => 'nullable|string',
            'allergies' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $validated = $validator->validated();
        // Auto-construct 'name' from first_name + last_name if not provided
        if (empty($validated['name'])) {
            $validated['name'] = trim(($validated['first_name'] ?? '') . ' ' . ($validated['last_name'] ?? ''));
        }
        // Map class_id to grade_id if provided
        if (empty($validated['grade_id']) && ! empty($validated['class_id'])) {
            $validated['grade_id'] = $validated['class_id'];
        }

        try {
            $student = $this->studentService->createStudent($school, $validated);

            return response()->json([
                'success' => true,
                'data' => $student,
                'message' => 'Student created successfully',
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Student creation error: ' . $e->getMessage(), [
                'request' => $request->all(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create student: ' . $e->getMessage(),
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
            'data' => $student,
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
            'class_id' => 'sometimes|required|exists:grades,id', // Support class_id from frontend
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
            'is_active' => 'nullable|boolean',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        // Map class_id to grade_id if provided
        if (empty($validated['grade_id']) && ! empty($validated['class_id'])) {
            $validated['grade_id'] = $validated['class_id'];
        }

        try {
            $updatedStudent = $this->studentService->updateStudent($student, $validated);

            return response()->json([
                'success' => true,
                'data' => $updatedStudent,
                'message' => 'Student updated successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update student: ' . $e->getMessage(),
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
                'message' => 'Student deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete student: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sadə şagird yarat (User account yaratmadan) — SchoolAdmin üçün
     * POST /school-students/simple
     */
    public function storeSimple(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        if (! $school) {
            return response()->json(['success' => false, 'message' => 'Məktəb tapılmadı'], 400);
        }

        $validator = Validator::make($request->all(), [
            'utis_code' => 'nullable|string|max:50|unique:students,utis_code',
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'grade_id' => 'nullable|exists:grades,id',
            'grade_level' => 'required|string|max:10',
            'class_name' => 'required|string|max:20',
            'gender' => 'nullable|in:male,female',
            'birth_date' => 'nullable|date',
            'parent_name' => 'nullable|string|max:255',
            'parent_phone' => 'nullable|string|max:30',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $d = $validator->validated();

        try {
            $student = \App\Models\Student::create([
                'utis_code' => $d['utis_code'] ?? null,
                'student_number' => $d['utis_code'] ?? 'ST-' . time() . rand(100, 999),
                'first_name' => $d['first_name'],
                'last_name' => $d['last_name'],
                'institution_id' => $school->id,
                'grade_id' => $d['grade_id'] ?? null,
                'grade_level' => $d['grade_level'],
                'class_name' => $d['class_name'],
                'gender' => $d['gender'] ?? null,
                'birth_date' => $d['birth_date'] ?? null,
                'parent_name' => $d['parent_name'] ?? null,
                'parent_phone' => $d['parent_phone'] ?? null,
                'is_active' => true,
            ]);

            return response()->json([
                'success' => true,
                'data' => $student->load('grade'),
                'message' => 'Şagird uğurla əlavə edildi',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Şagird əlavə edilərkən xəta: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sadə şagird güncəllə (yalnız students cədvəli) — SchoolAdmin üçün
     * PUT /school-students/{id}/simple
     */
    public function updateSimple(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $student = \App\Models\Student::find($id);

        if (! $student) {
            return response()->json(['success' => false, 'message' => 'Şagird tapılmadı'], 404);
        }

        if ($student->institution_id !== $user->institution_id) {
            return response()->json(['success' => false, 'message' => 'İcazə yoxdur'], 403);
        }

        $validator = Validator::make($request->all(), [
            'utis_code' => 'nullable|string|max:50|unique:students,utis_code,' . $id,
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'grade_id' => 'nullable|exists:grades,id',
            'grade_level' => 'required|string|max:10',
            'class_name' => 'required|string|max:20',
            'gender' => 'nullable|in:male,female',
            'birth_date' => 'nullable|date',
            'parent_name' => 'nullable|string|max:255',
            'parent_phone' => 'nullable|string|max:30',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => $validator->errors()->first(),
            ], 422);
        }

        try {
            $student->update($validator->validated());

            return response()->json([
                'success' => true,
                'data' => $student->fresh()->load('grade'),
                'message' => 'Şagird yeniləndi',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Yeniləmə xətası: ' . $e->getMessage(),
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

        if (! $school) {
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
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->studentService->bulkImportStudents($school, $request->students);

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => "Successfully imported {$result['imported']} students",
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to import students: ' . $e->getMessage(),
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

        if (! $school) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        $grades = $this->studentService->getAvailableGrades($school);

        return response()->json([
            'success' => true,
            'data' => $grades,
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
                    'error' => 'Student does not belong to your school',
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
                'data' => $enrollment,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to enroll student: ' . $e->getMessage(),
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
                    'error' => 'Student does not belong to your school',
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
                    'message' => 'Student unenrolled successfully',
                ]);
            }

            return response()->json([
                'error' => 'Student enrollment not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to unenroll student: ' . $e->getMessage(),
            ], 500);
        }
    }
}
