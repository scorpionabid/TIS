<?php

namespace App\Http\Controllers\Grade;

use App\Http\Controllers\BaseController;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\StudentEnrollment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class GradeStudentController extends BaseController
{
    /**
     * Assign students to grade.
     */
    public function assignStudents(Request $request, Grade $grade): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'student_ids' => 'required|array|min:1',
            'student_ids.*' => 'exists:users,id',
            'enrollment_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check regional access
        $user = $request->user();
        if (! $user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (! in_array($grade->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sinif üçün icazəniz yoxdur',
                ], 403);
            }
        }

        try {
            DB::beginTransaction();

            $assignedCount = 0;
            $errors = [];

            foreach ($request->student_ids as $studentId) {
                $student = User::find($studentId);

                // Check if user is actually a student
                if (! $student->isStudent()) {
                    $errors[] = "İstifadəçi ID {$studentId} şagird deyil";

                    continue;
                }

                // Check if student is already enrolled in this grade
                $existingEnrollment = StudentEnrollment::where('student_id', $studentId)
                    ->where('grade_id', $grade->id)
                    ->where('status', 'active')
                    ->first();

                if ($existingEnrollment) {
                    $errors[] = "Şagird (ID: {$studentId}) artıq bu sinifdə qeydiyyatdadır";

                    continue;
                }

                // Check if student is enrolled in another active grade
                $otherEnrollment = StudentEnrollment::where('student_id', $studentId)
                    ->whereHas('grade', function ($q) use ($grade) {
                        $q->where('academic_year_id', $grade->academic_year_id)
                            ->where('is_active', true);
                    })
                    ->where('status', 'active')
                    ->first();

                if ($otherEnrollment) {
                    $errors[] = "Şagird (ID: {$studentId}) artıq başqa sinifdə qeydiyyatdadır";

                    continue;
                }

                // Create enrollment
                StudentEnrollment::create([
                    'student_id' => $studentId,
                    'grade_id' => $grade->id,
                    'enrollment_date' => $request->enrollment_date ?? now(),
                    'status' => 'active',
                ]);

                $assignedCount++;
            }

            // Update grade student count
            $grade->update([
                'student_count' => StudentEnrollment::where('grade_id', $grade->id)
                    ->where('status', 'active')
                    ->count(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'grade_id' => $grade->id,
                    'assigned_count' => $assignedCount,
                    'total_students' => $grade->fresh()->student_count,
                    'errors' => $errors,
                ],
                'message' => "{$assignedCount} şagird sinifə uğurla təyin edildi",
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Şagirdlər təyin edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove student from grade.
     */
    public function removeStudent(Request $request, Grade $grade, $studentId): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (! $user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (! in_array($grade->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sinif üçün icazəniz yoxdur',
                ], 403);
            }
        }

        $enrollment = StudentEnrollment::where('student_id', $studentId)
            ->where('grade_id', $grade->id)
            ->where('status', 'active')
            ->first();

        if (! $enrollment) {
            return response()->json([
                'success' => false,
                'message' => 'Şagird bu sinifdə qeydiyyatda deyil',
            ], 404);
        }

        try {
            DB::beginTransaction();

            // Update enrollment status
            $enrollment->update([
                'status' => 'withdrawn',
                'withdrawal_date' => now(),
            ]);

            // Update grade student count
            $grade->update([
                'student_count' => StudentEnrollment::where('grade_id', $grade->id)
                    ->where('status', 'active')
                    ->count(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'grade_id' => $grade->id,
                    'student_id' => $studentId,
                    'total_students' => $grade->fresh()->student_count,
                ],
                'message' => 'Şagird sinifdən uğurla çıxarıldı',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Şagird çıxarılarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Transfer student between grades.
     */
    public function transferStudent(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:users,id',
            'from_grade_id' => 'required|exists:grades,id',
            'to_grade_id' => 'required|exists:grades,id',
            'transfer_date' => 'nullable|date',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $fromGrade = Grade::find($request->from_grade_id);
        $toGrade = Grade::find($request->to_grade_id);

        // Check regional access for both grades
        $user = $request->user();
        if (! $user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (! in_array($fromGrade->institution_id, $accessibleInstitutions) ||
                ! in_array($toGrade->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu siniflər üçün icazəniz yoxdur',
                ], 403);
            }
        }

        // Check if grades are in same academic year
        if ($fromGrade->academic_year_id !== $toGrade->academic_year_id) {
            return response()->json([
                'success' => false,
                'message' => 'Müxtəlif təhsil illəri arasında köçürmə mümkün deyil',
            ], 422);
        }

        $currentEnrollment = StudentEnrollment::where('student_id', $request->student_id)
            ->where('grade_id', $fromGrade->id)
            ->where('status', 'active')
            ->first();

        if (! $currentEnrollment) {
            return response()->json([
                'success' => false,
                'message' => 'Şagird başlanğıc sinifdə qeydiyyatda deyil',
            ], 404);
        }

        // Check if student is already in target grade
        $existingEnrollment = StudentEnrollment::where('student_id', $request->student_id)
            ->where('grade_id', $toGrade->id)
            ->where('status', 'active')
            ->first();

        if ($existingEnrollment) {
            return response()->json([
                'success' => false,
                'message' => 'Şagird artıq hədəf sinifdə qeydiyyatdadır',
            ], 422);
        }

        try {
            DB::beginTransaction();

            $transferDate = $request->transfer_date ?? now();

            // End current enrollment
            $currentEnrollment->update([
                'status' => 'transferred',
                'withdrawal_date' => $transferDate,
                'notes' => $request->notes,
            ]);

            // Create new enrollment
            StudentEnrollment::create([
                'student_id' => $request->student_id,
                'grade_id' => $toGrade->id,
                'enrollment_date' => $transferDate,
                'status' => 'active',
                'notes' => $request->notes,
                'previous_enrollment_id' => $currentEnrollment->id,
            ]);

            // Update student counts for both grades
            $fromGrade->update([
                'student_count' => StudentEnrollment::where('grade_id', $fromGrade->id)
                    ->where('status', 'active')
                    ->count(),
            ]);

            $toGrade->update([
                'student_count' => StudentEnrollment::where('grade_id', $toGrade->id)
                    ->where('status', 'active')
                    ->count(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'student_id' => $request->student_id,
                    'from_grade' => [
                        'id' => $fromGrade->id,
                        'name' => $fromGrade->name,
                        'student_count' => $fromGrade->fresh()->student_count,
                    ],
                    'to_grade' => [
                        'id' => $toGrade->id,
                        'name' => $toGrade->name,
                        'student_count' => $toGrade->fresh()->student_count,
                    ],
                    'transfer_date' => $transferDate,
                ],
                'message' => 'Şagird uğurla köçürüldü',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Şagird köçürülürkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get students list for a grade.
     */
    public function getStudents(Request $request, Grade $grade): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (! $user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (! in_array($grade->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sinif üçün icazəniz yoxdur',
                ], 403);
            }
        }

        $query = StudentEnrollment::where('grade_id', $grade->id)
            ->with(['student.profile']);

        // Filter by status
        $status = $request->get('status', 'active');
        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $enrollments = $query->orderBy('enrollment_date')->get();

        $students = $enrollments->map(function ($enrollment) {
            $student = $enrollment->student;

            return [
                'id' => $student->id,
                'full_name' => $student->profile
                    ? "{$student->profile->first_name} {$student->profile->last_name}"
                    : $student->username,
                'email' => $student->email,
                'enrollment_date' => $enrollment->enrollment_date,
                'status' => $enrollment->status,
                'withdrawal_date' => $enrollment->withdrawal_date,
                'notes' => $enrollment->notes,
                'created_at' => $enrollment->created_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'grade' => [
                    'id' => $grade->id,
                    'name' => $grade->name,
                    'class_level' => $grade->class_level,
                ],
                'students' => $students,
                'total_count' => $students->count(),
                'active_count' => $enrollments->where('status', 'active')->count(),
            ],
            'message' => 'Sinif şagirdləri uğurla alındı',
        ]);
    }

    /**
     * Bulk update student enrollments.
     */
    public function bulkUpdateEnrollments(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'operations' => 'required|array|min:1',
            'operations.*.type' => 'required|in:assign,remove,transfer',
            'operations.*.student_id' => 'required|exists:users,id',
            'operations.*.grade_id' => 'required_if:operations.*.type,assign,remove|exists:grades,id',
            'operations.*.from_grade_id' => 'required_if:operations.*.type,transfer|exists:grades,id',
            'operations.*.to_grade_id' => 'required_if:operations.*.type,transfer|exists:grades,id',
            'operations.*.enrollment_date' => 'nullable|date',
            'operations.*.notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $results = [];
        $successCount = 0;
        $failureCount = 0;

        try {
            DB::beginTransaction();

            foreach ($request->operations as $index => $operation) {
                try {
                    switch ($operation['type']) {
                        case 'assign':
                            $this->performAssignOperation($user, $operation, $index, $results, $successCount);
                            break;
                        case 'remove':
                            $this->performRemoveOperation($user, $operation, $index, $results, $successCount);
                            break;
                        case 'transfer':
                            $this->performTransferOperation($user, $operation, $index, $results, $successCount);
                            break;
                    }
                } catch (\Exception $e) {
                    $failureCount++;
                    $results[] = [
                        'operation_index' => $index,
                        'success' => false,
                        'message' => $e->getMessage(),
                        'operation' => $operation,
                    ];
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_operations' => count($request->operations),
                    'successful_operations' => $successCount,
                    'failed_operations' => $failureCount,
                    'results' => $results,
                ],
                'message' => "Toplu əməliyyat tamamlandı: {$successCount} uğurlu, {$failureCount} uğursuz",
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Toplu əməliyyat yerinə yetirilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
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

    private function performAssignOperation($user, $operation, $index, &$results, &$successCount)
    {
        $grade = Grade::find($operation['grade_id']);

        // Check access
        if (! $user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (! in_array($grade->institution_id, $accessibleInstitutions)) {
                throw new \Exception('Bu sinif üçün icazəniz yoxdur');
            }
        }

        // Create enrollment
        StudentEnrollment::create([
            'student_id' => $operation['student_id'],
            'grade_id' => $operation['grade_id'],
            'enrollment_date' => $operation['enrollment_date'] ?? now(),
            'status' => 'active',
            'notes' => $operation['notes'] ?? null,
        ]);

        // Update grade student count
        $grade->update([
            'student_count' => StudentEnrollment::where('grade_id', $grade->id)
                ->where('status', 'active')
                ->count(),
        ]);

        $successCount++;
        $results[] = [
            'operation_index' => $index,
            'success' => true,
            'message' => 'Şagird sinifə təyin edildi',
            'operation' => $operation,
        ];
    }

    private function performRemoveOperation($user, $operation, $index, &$results, &$successCount)
    {
        $grade = Grade::find($operation['grade_id']);

        // Check access
        if (! $user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (! in_array($grade->institution_id, $accessibleInstitutions)) {
                throw new \Exception('Bu sinif üçün icazəniz yoxdur');
            }
        }

        $enrollment = StudentEnrollment::where('student_id', $operation['student_id'])
            ->where('grade_id', $operation['grade_id'])
            ->where('status', 'active')
            ->first();

        if (! $enrollment) {
            throw new \Exception('Şagird bu sinifdə qeydiyyatda deyil');
        }

        $enrollment->update([
            'status' => 'withdrawn',
            'withdrawal_date' => now(),
            'notes' => $operation['notes'] ?? null,
        ]);

        // Update grade student count
        $grade->update([
            'student_count' => StudentEnrollment::where('grade_id', $grade->id)
                ->where('status', 'active')
                ->count(),
        ]);

        $successCount++;
        $results[] = [
            'operation_index' => $index,
            'success' => true,
            'message' => 'Şagird sinifdən çıxarıldı',
            'operation' => $operation,
        ];
    }

    private function performTransferOperation($user, $operation, $index, &$results, &$successCount)
    {
        $fromGrade = Grade::find($operation['from_grade_id']);
        $toGrade = Grade::find($operation['to_grade_id']);

        // Check access for both grades
        if (! $user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (! in_array($fromGrade->institution_id, $accessibleInstitutions) ||
                ! in_array($toGrade->institution_id, $accessibleInstitutions)) {
                throw new \Exception('Bu siniflər üçün icazəniz yoxdur');
            }
        }

        $currentEnrollment = StudentEnrollment::where('student_id', $operation['student_id'])
            ->where('grade_id', $fromGrade->id)
            ->where('status', 'active')
            ->first();

        if (! $currentEnrollment) {
            throw new \Exception('Şagird başlanğıc sinifdə qeydiyyatda deyil');
        }

        $transferDate = $operation['enrollment_date'] ?? now();

        // End current enrollment
        $currentEnrollment->update([
            'status' => 'transferred',
            'withdrawal_date' => $transferDate,
            'notes' => $operation['notes'] ?? null,
        ]);

        // Create new enrollment
        StudentEnrollment::create([
            'student_id' => $operation['student_id'],
            'grade_id' => $toGrade->id,
            'enrollment_date' => $transferDate,
            'status' => 'active',
            'notes' => $operation['notes'] ?? null,
            'previous_enrollment_id' => $currentEnrollment->id,
        ]);

        // Update student counts for both grades
        $fromGrade->update([
            'student_count' => StudentEnrollment::where('grade_id', $fromGrade->id)
                ->where('status', 'active')
                ->count(),
        ]);

        $toGrade->update([
            'student_count' => StudentEnrollment::where('grade_id', $toGrade->id)
                ->where('status', 'active')
                ->count(),
        ]);

        $successCount++;
        $results[] = [
            'operation_index' => $index,
            'success' => true,
            'message' => 'Şagird köçürüldü',
            'operation' => $operation,
        ];
    }

    /**
     * Update student enrollment status in a grade.
     * Created for Sprint 6 Phase 3 delegation from GradeUnifiedController.
     */
    public function updateStudentStatus(Request $request, Grade $grade, $studentId): JsonResponse
    {
        $validator = Validator::make(array_merge($request->all(), ['student_id' => $studentId]), [
            'student_id' => 'required|exists:users,id',
            'status' => 'required|in:active,inactive,transferred,graduated,suspended',
            'notes' => 'sometimes|string|max:500',
            'effective_date' => 'sometimes|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        // Check regional access
        if (! $user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (! in_array($grade->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sinif üçün icazəniz yoxdur',
                ], 403);
            }
        }

        try {
            DB::beginTransaction();

            $enrollment = StudentEnrollment::where('student_id', $studentId)
                ->where('grade_id', $grade->id)
                ->first();

            if (! $enrollment) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => 'Şagird bu sinifdə qeydiyyatda deyil',
                ], 404);
            }

            $status = $request->get('status');
            $notes = $request->get('notes');
            $effectiveDate = $request->get('effective_date', now());

            $enrollment->update([
                'status' => $status,
                'notes' => $notes,
                'updated_at' => $effectiveDate,
            ]);

            // If status changed to withdrawn/graduated, set withdrawal date
            if (in_array($status, ['withdrawn', 'graduated', 'transferred'])) {
                $enrollment->update(['withdrawal_date' => $effectiveDate]);
            }

            // Update grade student count for active students
            $grade->update([
                'student_count' => StudentEnrollment::where('grade_id', $grade->id)
                    ->where('status', 'active')
                    ->count(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tələbə statusu uğurla yeniləndi',
                'data' => [
                    'enrollment' => $enrollment->fresh(),
                    'grade_student_count' => $grade->fresh()->student_count,
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Tələbə statusu yenilənərkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }
}
