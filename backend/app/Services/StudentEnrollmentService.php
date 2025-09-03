<?php

namespace App\Services;

use App\Models\Grade;
use App\Models\User;
use App\Models\StudentEnrollment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

/**
 * Student Enrollment Service
 * 
 * Handles all business logic related to student enrollments in grades/classes.
 * Manages enrollment status, transfers, and academic progression.
 */
class StudentEnrollmentService
{
    /**
     * Get students enrolled in a specific grade
     */
    public function getStudentsForGrade(Grade $grade, array $filters = [], array $options = []): array
    {
        $query = StudentEnrollment::where('grade_id', $grade->id)
            ->with(['student.profile']);

        // Apply filters
        $this->applyEnrollmentFilters($query, $filters);

        // Apply sorting
        $query->orderBy('student_number', 'asc')
              ->orderBy('enrollment_date', 'asc');

        // Paginate if requested
        if (isset($options['per_page'])) {
            $enrollments = $query->paginate($options['per_page']);
            
            return [
                'grade_info' => [
                    'id' => $grade->id,
                    'name' => $grade->name,
                    'full_name' => $grade->full_name,
                    'class_level' => $grade->class_level,
                    'total_capacity' => $grade->room?->capacity ?? 0,
                    'enrolled_count' => $enrollments->total(),
                    'available_spots' => max(0, ($grade->room?->capacity ?? 0) - $enrollments->total()),
                ],
                'students' => $enrollments->through(function ($enrollment) use ($options) {
                    return $this->formatStudentEnrollmentResponse($enrollment, $options);
                })->toArray(),
                'pagination' => [
                    'current_page' => $enrollments->currentPage(),
                    'per_page' => $enrollments->perPage(),
                    'total' => $enrollments->total(),
                    'total_pages' => $enrollments->lastPage(),
                    'from' => $enrollments->firstItem(),
                    'to' => $enrollments->lastItem(),
                ],
            ];
        } else {
            $enrollments = $query->get();
            
            return [
                'grade_info' => [
                    'id' => $grade->id,
                    'name' => $grade->name,
                    'full_name' => $grade->full_name,
                    'class_level' => $grade->class_level,
                    'total_capacity' => $grade->room?->capacity ?? 0,
                    'enrolled_count' => $enrollments->count(),
                    'available_spots' => max(0, ($grade->room?->capacity ?? 0) - $enrollments->count()),
                ],
                'students' => $enrollments->map(function ($enrollment) use ($options) {
                    return $this->formatStudentEnrollmentResponse($enrollment, $options);
                })->toArray(),
            ];
        }
    }

    /**
     * Enroll a student in a grade
     */
    public function enrollStudent(
        User $enrolledBy, 
        int $studentId, 
        int $gradeId, 
        array $enrollmentData = []
    ): StudentEnrollment {
        // Validate inputs
        $student = User::findOrFail($studentId);
        $grade = Grade::findOrFail($gradeId);

        // Check permissions
        if (!$this->canEnrollStudentInGrade($enrolledBy, $student, $grade)) {
            throw ValidationException::withMessages([
                'permission' => ['Bu şagirdi bu sinifə yazmaq icazəniz yoxdur']
            ]);
        }

        // Validate enrollment
        $this->validateEnrollment($student, $grade, $enrollmentData);

        DB::beginTransaction();
        try {
            // Check if student is already enrolled in another grade for same academic year
            $existingEnrollment = StudentEnrollment::where('student_id', $studentId)
                ->whereHas('grade', function ($query) use ($grade) {
                    $query->where('academic_year_id', $grade->academic_year_id)
                          ->where('institution_id', $grade->institution_id);
                })
                ->where('enrollment_status', 'active')
                ->first();

            if ($existingEnrollment) {
                // Transfer student instead of creating new enrollment
                return $this->transferStudent(
                    $enrolledBy, 
                    $existingEnrollment, 
                    $grade, 
                    $enrollmentData['transfer_reason'] ?? 'Sinif dəyişikliyi'
                );
            }

            // Generate student number if not provided
            if (!isset($enrollmentData['student_number'])) {
                $enrollmentData['student_number'] = $this->generateStudentNumber($grade);
            }

            // Create enrollment
            $enrollment = StudentEnrollment::create([
                'student_id' => $studentId,
                'grade_id' => $gradeId,
                'student_number' => $enrollmentData['student_number'],
                'enrollment_date' => $enrollmentData['enrollment_date'] ?? now(),
                'enrollment_status' => 'active',
                'enrolled_by' => $enrolledBy->id,
                'notes' => $enrollmentData['notes'] ?? null,
                'metadata' => $enrollmentData['metadata'] ?? [],
            ]);

            // Update grade student count
            $this->updateGradeStudentCount($grade);

            // Log the enrollment
            activity()
                ->performedOn($enrollment)
                ->causedBy($enrolledBy)
                ->withProperties([
                    'student_name' => $student->name,
                    'grade_name' => $grade->name,
                    'student_number' => $enrollment->student_number,
                ])
                ->log("Şagird qeydiyyatı: {$student->name} -> {$grade->name}");

            DB::commit();

            return $enrollment->load(['student.profile', 'grade']);

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Transfer a student from one grade to another
     */
    public function transferStudent(
        User $transferredBy, 
        StudentEnrollment $currentEnrollment, 
        Grade $newGrade, 
        string $reason = null
    ): StudentEnrollment {
        // Validate transfer
        if (!$this->canTransferStudent($transferredBy, $currentEnrollment, $newGrade)) {
            throw ValidationException::withMessages([
                'permission' => ['Bu şagirdi köçürmək icazəniz yoxdur']
            ]);
        }

        $this->validateTransfer($currentEnrollment, $newGrade);

        DB::beginTransaction();
        try {
            $student = $currentEnrollment->student;
            $oldGrade = $currentEnrollment->grade;

            // Update current enrollment status
            $currentEnrollment->update([
                'enrollment_status' => 'transferred',
                'transfer_date' => now(),
                'transfer_reason' => $reason,
                'transferred_by' => $transferredBy->id,
            ]);

            // Create new enrollment
            $newEnrollment = StudentEnrollment::create([
                'student_id' => $currentEnrollment->student_id,
                'grade_id' => $newGrade->id,
                'student_number' => $this->generateStudentNumber($newGrade),
                'enrollment_date' => now(),
                'enrollment_status' => 'active',
                'enrolled_by' => $transferredBy->id,
                'previous_enrollment_id' => $currentEnrollment->id,
                'notes' => "Köçürülmə: {$oldGrade->name} -> {$newGrade->name}. Səbəb: {$reason}",
            ]);

            // Update student counts
            $this->updateGradeStudentCount($oldGrade);
            $this->updateGradeStudentCount($newGrade);

            // Log the transfer
            activity()
                ->performedOn($newEnrollment)
                ->causedBy($transferredBy)
                ->withProperties([
                    'student_name' => $student->name,
                    'old_grade' => $oldGrade->name,
                    'new_grade' => $newGrade->name,
                    'reason' => $reason,
                    'old_enrollment_id' => $currentEnrollment->id,
                ])
                ->log("Şagird köçürülməsi: {$student->name} ({$oldGrade->name} -> {$newGrade->name})");

            DB::commit();

            return $newEnrollment->load(['student.profile', 'grade']);

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Update enrollment status (graduate, withdraw, etc.)
     */
    public function updateEnrollmentStatus(
        User $updatedBy, 
        StudentEnrollment $enrollment, 
        string $newStatus, 
        array $statusData = []
    ): StudentEnrollment {
        // Validate status change
        if (!$this->canUpdateEnrollmentStatus($updatedBy, $enrollment, $newStatus)) {
            throw ValidationException::withMessages([
                'permission' => ['Bu qeydiyyatın statusunu dəyişmək icazəniz yoxdur']
            ]);
        }

        $this->validateStatusChange($enrollment, $newStatus, $statusData);

        DB::beginTransaction();
        try {
            $oldStatus = $enrollment->enrollment_status;

            // Prepare update data
            $updateData = [
                'enrollment_status' => $newStatus,
                'status_updated_by' => $updatedBy->id,
                'status_updated_at' => now(),
            ];

            // Add status-specific fields
            switch ($newStatus) {
                case 'graduated':
                    $updateData['graduation_date'] = $statusData['graduation_date'] ?? now();
                    $updateData['graduation_notes'] = $statusData['graduation_notes'] ?? null;
                    break;
                case 'withdrawn':
                    $updateData['withdrawal_date'] = $statusData['withdrawal_date'] ?? now();
                    $updateData['withdrawal_reason'] = $statusData['withdrawal_reason'] ?? null;
                    break;
                case 'suspended':
                    $updateData['suspension_start'] = $statusData['suspension_start'] ?? now();
                    $updateData['suspension_end'] = $statusData['suspension_end'] ?? null;
                    $updateData['suspension_reason'] = $statusData['suspension_reason'] ?? null;
                    break;
                case 'transferred':
                    $updateData['transfer_date'] = $statusData['transfer_date'] ?? now();
                    $updateData['transfer_reason'] = $statusData['transfer_reason'] ?? null;
                    break;
            }

            // Add notes if provided
            if (isset($statusData['notes'])) {
                $updateData['notes'] = $enrollment->notes . "\n" . now()->format('Y-m-d H:i') . ": " . $statusData['notes'];
            }

            // Update enrollment
            $enrollment->update($updateData);

            // Update grade student count if needed
            if (in_array($newStatus, ['withdrawn', 'transferred', 'graduated']) && $oldStatus === 'active') {
                $this->updateGradeStudentCount($enrollment->grade);
            } elseif ($newStatus === 'active' && in_array($oldStatus, ['withdrawn', 'suspended'])) {
                $this->updateGradeStudentCount($enrollment->grade);
            }

            // Log the status change
            activity()
                ->performedOn($enrollment)
                ->causedBy($updatedBy)
                ->withProperties([
                    'student_name' => $enrollment->student->name,
                    'grade_name' => $enrollment->grade->name,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'status_data' => $statusData,
                ])
                ->log("Şagird statusu dəyişildi: {$enrollment->student->name} ({$oldStatus} -> {$newStatus})");

            DB::commit();

            return $enrollment->fresh(['student.profile', 'grade']);

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Get enrollment history for a student
     */
    public function getStudentEnrollmentHistory(int $studentId, array $options = []): Collection
    {
        $query = StudentEnrollment::where('student_id', $studentId)
            ->with(['grade.institution', 'grade.academicYear', 'enrolledByUser', 'statusUpdatedByUser']);

        if (isset($options['institution_id'])) {
            $query->whereHas('grade', function ($q) use ($options) {
                $q->where('institution_id', $options['institution_id']);
            });
        }

        if (isset($options['academic_year_id'])) {
            $query->whereHas('grade', function ($q) use ($options) {
                $q->where('academic_year_id', $options['academic_year_id']);
            });
        }

        return $query->orderBy('enrollment_date', 'desc')->get();
    }

    /**
     * Get enrollment statistics
     */
    public function getEnrollmentStatistics(array $filters = []): array
    {
        $query = StudentEnrollment::query();

        if (isset($filters['institution_id'])) {
            $query->whereHas('grade', function ($q) use ($filters) {
                $q->where('institution_id', $filters['institution_id']);
            });
        }

        if (isset($filters['academic_year_id'])) {
            $query->whereHas('grade', function ($q) use ($filters) {
                $q->where('academic_year_id', $filters['academic_year_id']);
            });
        }

        if (isset($filters['date_from'])) {
            $query->where('enrollment_date', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $query->where('enrollment_date', '<=', $filters['date_to']);
        }

        $total = $query->count();
        $byStatus = $query->groupBy('enrollment_status')
            ->selectRaw('enrollment_status, count(*) as count')
            ->pluck('count', 'enrollment_status')
            ->toArray();

        $byGradeLevel = $query->join('grades', 'student_enrollments.grade_id', '=', 'grades.id')
            ->groupBy('grades.class_level')
            ->selectRaw('grades.class_level, count(*) as count')
            ->pluck('count', 'class_level')
            ->toArray();

        return [
            'total_enrollments' => $total,
            'by_status' => $byStatus,
            'by_grade_level' => $byGradeLevel,
            'active_enrollments' => $byStatus['active'] ?? 0,
            'inactive_enrollments' => $total - ($byStatus['active'] ?? 0),
        ];
    }

    /**
     * Format student enrollment response
     */
    public function formatStudentEnrollmentResponse(StudentEnrollment $enrollment, array $options = []): array
    {
        $student = $enrollment->student;
        $includeProfile = $options['include_profile'] ?? true;

        $response = [
            'enrollment_id' => $enrollment->id,
            'student_id' => $student->id,
            'student_number' => $enrollment->student_number,
            'enrollment_date' => $enrollment->enrollment_date,
            'enrollment_status' => $enrollment->enrollment_status,
            'notes' => $enrollment->notes,
        ];

        // Add basic student info
        $response['student'] = [
            'id' => $student->id,
            'name' => $student->name,
            'email' => $student->email,
            'is_active' => $student->is_active,
        ];

        // Add profile info if requested and available
        if ($includeProfile && $student->relationLoaded('profile') && $student->profile) {
            $profile = $student->profile;
            $response['student']['profile'] = [
                'first_name' => $profile->first_name,
                'last_name' => $profile->last_name,
                'full_name' => "{$profile->first_name} {$profile->last_name}",
                'date_of_birth' => $profile->date_of_birth,
                'gender' => $profile->gender,
                'phone' => $profile->phone,
                'address' => $profile->address,
            ];
        }

        // Add enrollment metrics
        if (method_exists($enrollment, 'calculateCurrentAttendanceRate')) {
            $response['metrics'] = [
                'attendance_rate' => $enrollment->calculateCurrentAttendanceRate(),
                'days_enrolled' => $enrollment->enrollment_date ? 
                    now()->diffInDays($enrollment->enrollment_date) : 0,
            ];
        }

        return $response;
    }

    // Permission check methods
    private function canEnrollStudentInGrade(User $user, User $student, Grade $grade): bool
    {
        // Check if user has permission to manage enrollments
        if (!$user->hasPermission('enrollments.create')) {
            return false;
        }

        // Check if user has access to the grade's institution
        if ($user->hasRole('superadmin')) {
            return true;
        }

        return $user->institution_id === $grade->institution_id;
    }

    private function canTransferStudent(User $user, StudentEnrollment $enrollment, Grade $newGrade): bool
    {
        // Check if user has permission to transfer students
        if (!$user->hasPermission('enrollments.transfer')) {
            return false;
        }

        // Check if user has access to both institutions
        if ($user->hasRole('superadmin')) {
            return true;
        }

        return $user->institution_id === $enrollment->grade->institution_id && 
               $user->institution_id === $newGrade->institution_id;
    }

    private function canUpdateEnrollmentStatus(User $user, StudentEnrollment $enrollment, string $newStatus): bool
    {
        // Check if user has permission to update enrollment status
        if (!$user->hasPermission('enrollments.update_status')) {
            return false;
        }

        // Check if user has access to the enrollment's institution
        if ($user->hasRole('superadmin')) {
            return true;
        }

        return $user->institution_id === $enrollment->grade->institution_id;
    }

    // Validation methods
    private function validateEnrollment(User $student, Grade $grade, array $enrollmentData): void
    {
        // Check if student is eligible for enrollment
        if (!$student->hasRole('şagird')) {
            throw ValidationException::withMessages([
                'student' => ['Seçilən istifadəçi şagird deyil']
            ]);
        }

        // Check if student belongs to same institution
        if ($student->institution_id !== $grade->institution_id) {
            throw ValidationException::withMessages([
                'student' => ['Şagird eyni təşkilata aid olmalıdır']
            ]);
        }

        // Check grade capacity
        if ($grade->room && $grade->getCurrentStudentCount() >= $grade->room->capacity) {
            throw ValidationException::withMessages([
                'capacity' => ['Sinifin tutumu doludur']
            ]);
        }

        // Check if student number is unique
        if (isset($enrollmentData['student_number'])) {
            $existingEnrollment = StudentEnrollment::where('student_number', $enrollmentData['student_number'])
                ->whereHas('grade', function ($query) use ($grade) {
                    $query->where('institution_id', $grade->institution_id);
                })
                ->first();

            if ($existingEnrollment) {
                throw ValidationException::withMessages([
                    'student_number' => ['Bu şagird nömrəsi artıq istifadə olunub']
                ]);
            }
        }
    }

    private function validateTransfer(StudentEnrollment $currentEnrollment, Grade $newGrade): void
    {
        // Check if transfer is to same grade
        if ($currentEnrollment->grade_id === $newGrade->id) {
            throw ValidationException::withMessages([
                'grade' => ['Şagird artıq bu sinifdədir']
            ]);
        }

        // Check if both grades are in same institution
        if ($currentEnrollment->grade->institution_id !== $newGrade->institution_id) {
            throw ValidationException::withMessages([
                'institution' => ['Fərqli təşkilatlar arasında köçürmə dəstəklənmir']
            ]);
        }

        // Check new grade capacity
        if ($newGrade->room && $newGrade->getCurrentStudentCount() >= $newGrade->room->capacity) {
            throw ValidationException::withMessages([
                'capacity' => ['Hədəf sinifin tutumu doludur']
            ]);
        }

        // Check if current enrollment is active
        if ($currentEnrollment->enrollment_status !== 'active') {
            throw ValidationException::withMessages([
                'status' => ['Yalnız aktiv qeydiyyatlı şagirdlər köçürülə bilər']
            ]);
        }
    }

    private function validateStatusChange(StudentEnrollment $enrollment, string $newStatus, array $statusData): void
    {
        $validStatuses = ['active', 'inactive', 'suspended', 'withdrawn', 'transferred', 'graduated'];
        
        if (!in_array($newStatus, $validStatuses)) {
            throw ValidationException::withMessages([
                'status' => ['Keçərsiz status']
            ]);
        }

        // Status-specific validations
        switch ($newStatus) {
            case 'graduated':
                if (!isset($statusData['graduation_date'])) {
                    throw ValidationException::withMessages([
                        'graduation_date' => ['Məzuniyyət tarixi tələb olunur']
                    ]);
                }
                break;
            case 'suspended':
                if (!isset($statusData['suspension_reason'])) {
                    throw ValidationException::withMessages([
                        'suspension_reason' => ['Uzaqlaşdırma səbəbi tələb olunur']
                    ]);
                }
                break;
            case 'withdrawn':
                if (!isset($statusData['withdrawal_reason'])) {
                    throw ValidationException::withMessages([
                        'withdrawal_reason' => ['Çıxarılma səbəbi tələb olunur']
                    ]);
                }
                break;
        }
    }

    // Helper methods
    private function generateStudentNumber(Grade $grade): string
    {
        $institution = $grade->institution;
        $academicYear = $grade->academicYear;
        
        // Format: {Institution Code}{Academic Year}{Grade Level}{Sequential Number}
        $prefix = strtoupper(substr($institution->code ?? $institution->name, 0, 3));
        $yearCode = substr($academicYear->name ?? date('Y'), -2);
        $gradeCode = str_pad($grade->class_level, 2, '0', STR_PAD_LEFT);
        
        // Find next sequential number
        $lastNumber = StudentEnrollment::whereHas('grade', function ($query) use ($grade) {
                $query->where('institution_id', $grade->institution_id)
                      ->where('academic_year_id', $grade->academic_year_id);
            })
            ->where('student_number', 'LIKE', "{$prefix}{$yearCode}{$gradeCode}%")
            ->orderBy('student_number', 'desc')
            ->first();

        if ($lastNumber) {
            $lastSequential = intval(substr($lastNumber->student_number, -3));
            $nextSequential = $lastSequential + 1;
        } else {
            $nextSequential = 1;
        }

        return $prefix . $yearCode . $gradeCode . str_pad($nextSequential, 3, '0', STR_PAD_LEFT);
    }

    private function updateGradeStudentCount(Grade $grade): void
    {
        $activeCount = StudentEnrollment::where('grade_id', $grade->id)
            ->where('enrollment_status', 'active')
            ->count();

        $grade->update(['student_count' => $activeCount]);
    }

    private function applyEnrollmentFilters($query, array $filters): void
    {
        if (isset($filters['enrollment_status'])) {
            if ($filters['enrollment_status'] === 'all') {
                // No filter
            } else {
                $query->where('enrollment_status', $filters['enrollment_status']);
            }
        } else {
            // Default to active enrollments
            $query->where('enrollment_status', 'active');
        }

        if (isset($filters['date_from'])) {
            $query->where('enrollment_date', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $query->where('enrollment_date', '<=', $filters['date_to']);
        }

        if (isset($filters['search'])) {
            $search = $filters['search'];
            $query->whereHas('student', function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%");
            })->orWhere('student_number', 'ILIKE', "%{$search}%");
        }
    }
}