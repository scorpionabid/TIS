<?php

namespace App\Services;

use App\Models\AcademicYearTransition;
use App\Models\AcademicYearTransitionDetail;
use App\Models\Grade;
use App\Models\StudentEnrollment;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StudentPromotionService
{
    /**
     * Bulk promote students from source year to target year.
     *
     * @param  array<int, int|null>  $gradeMapping  [source_grade_id => target_grade_id]
     * @return array{promoted: int, graduated: int, skipped: int, retained: int}
     */
    public function bulkPromoteStudents(
        int $sourceAcademicYearId,
        int $targetAcademicYearId,
        int $institutionId,
        array $gradeMapping,
        AcademicYearTransition $transition,
        array $options = []
    ): array {
        $excludeStudentIds = $options['exclude_student_ids'] ?? [];
        $retainStudentIds = $options['retain_student_ids'] ?? [];

        // Get all active enrollments from source year
        $enrollments = StudentEnrollment::where('academic_year_id', $sourceAcademicYearId)
            ->where('enrollment_status', 'active')
            ->whereHas('grade', function ($query) use ($institutionId) {
                $query->where('institution_id', $institutionId);
            })
            ->with(['student', 'grade'])
            ->get();

        $promoted = 0;
        $graduated = 0;
        $skipped = 0;
        $retained = 0;

        foreach ($enrollments as $enrollment) {
            // Skip excluded students (manual decision later)
            if (in_array($enrollment->student_id, $excludeStudentIds)) {
                $skipped++;

                AcademicYearTransitionDetail::log(
                    $transition->id,
                    AcademicYearTransitionDetail::ENTITY_STUDENT_ENROLLMENT,
                    AcademicYearTransitionDetail::ACTION_SKIPPED,
                    $enrollment->id,
                    null,
                    'Manual qərar üçün saxlanıldı',
                    [
                        'student_id' => $enrollment->student_id,
                        'student_name' => $enrollment->student?->name,
                        'source_grade' => $enrollment->grade?->class_level . '-' . $enrollment->grade?->name,
                    ]
                );

                continue;
            }

            try {
                // Check if 12th grade - graduation
                if ($enrollment->grade && $enrollment->grade->class_level >= 12) {
                    $this->processGraduation($enrollment, $transition);
                    $graduated++;
                    continue;
                }

                // Check if student should be retained (same grade level)
                if (in_array($enrollment->student_id, $retainStudentIds)) {
                    $this->processRetention(
                        $enrollment,
                        $targetAcademicYearId,
                        $gradeMapping,
                        $transition
                    );
                    $retained++;
                    continue;
                }

                // Normal promotion to next grade
                $targetGradeId = $gradeMapping[$enrollment->grade_id] ?? null;

                if (! $targetGradeId) {
                    // No target grade found
                    $skipped++;

                    AcademicYearTransitionDetail::log(
                        $transition->id,
                        AcademicYearTransitionDetail::ENTITY_STUDENT_ENROLLMENT,
                        AcademicYearTransitionDetail::ACTION_SKIPPED,
                        $enrollment->id,
                        null,
                        'Hədəf sinif tapılmadı',
                        [
                            'student_id' => $enrollment->student_id,
                            'source_grade_id' => $enrollment->grade_id,
                        ]
                    );

                    continue;
                }

                $newEnrollment = $this->promoteStudent(
                    $enrollment,
                    $targetGradeId,
                    $targetAcademicYearId,
                    $transition
                );

                $promoted++;

            } catch (\Exception $e) {
                Log::error('Student promotion failed', [
                    'enrollment_id' => $enrollment->id,
                    'student_id' => $enrollment->student_id,
                    'error' => $e->getMessage(),
                ]);

                AcademicYearTransitionDetail::log(
                    $transition->id,
                    AcademicYearTransitionDetail::ENTITY_STUDENT_ENROLLMENT,
                    AcademicYearTransitionDetail::ACTION_FAILED,
                    $enrollment->id,
                    null,
                    $e->getMessage(),
                    ['student_id' => $enrollment->student_id]
                );

                throw $e;
            }
        }

        // Update student counts in target grades
        $this->updateGradeStudentCounts($targetAcademicYearId, $institutionId);

        return [
            'promoted' => $promoted,
            'graduated' => $graduated,
            'skipped' => $skipped,
            'retained' => $retained,
        ];
    }

    /**
     * Promote a single student to the next grade.
     */
    public function promoteStudent(
        StudentEnrollment $currentEnrollment,
        int $targetGradeId,
        int $targetAcademicYearId,
        AcademicYearTransition $transition
    ): StudentEnrollment {
        // Check if student already enrolled in target year
        $existingEnrollment = StudentEnrollment::where('student_id', $currentEnrollment->student_id)
            ->where('academic_year_id', $targetAcademicYearId)
            ->where('enrollment_status', 'active')
            ->first();

        if ($existingEnrollment) {
            throw new \Exception('Şagird artıq hədəf tədris ilində qeydiyyatdadır');
        }

        // Mark current enrollment as promoted
        $currentEnrollment->update([
            'enrollment_status' => 'promoted',
        ]);

        // Create new enrollment in target year
        $newEnrollment = StudentEnrollment::create([
            'student_id' => $currentEnrollment->student_id,
            'grade_id' => $targetGradeId,
            'academic_year_id' => $targetAcademicYearId,
            'enrollment_date' => now(),
            'student_number' => $currentEnrollment->student_number, // Keep same student number
            'enrollment_status' => 'active',
            'enrollment_type' => $currentEnrollment->enrollment_type,
            'primary_guardian_id' => $currentEnrollment->primary_guardian_id,
            'secondary_guardian_id' => $currentEnrollment->secondary_guardian_id,
            'emergency_contacts' => $currentEnrollment->emergency_contacts,
            'medical_information' => $currentEnrollment->medical_information,
            'transportation_info' => $currentEnrollment->transportation_info,
            'special_requirements' => $currentEnrollment->special_requirements,
            'attendance_target_percentage' => $currentEnrollment->attendance_target_percentage,
            'photo_permission' => $currentEnrollment->photo_permission,
            'medical_consent' => $currentEnrollment->medical_consent,
            'trip_permission' => $currentEnrollment->trip_permission,
            'expected_graduation_date' => $currentEnrollment->expected_graduation_date,
        ]);

        $targetGrade = Grade::find($targetGradeId);

        AcademicYearTransitionDetail::log(
            $transition->id,
            AcademicYearTransitionDetail::ENTITY_STUDENT_ENROLLMENT,
            AcademicYearTransitionDetail::ACTION_PROMOTED,
            $currentEnrollment->id,
            $newEnrollment->id,
            null,
            [
                'student_id' => $currentEnrollment->student_id,
                'student_name' => $currentEnrollment->student?->name,
                'from_grade' => $currentEnrollment->grade?->class_level . '-' . $currentEnrollment->grade?->name,
                'to_grade' => $targetGrade ? ($targetGrade->class_level . '-' . $targetGrade->name) : null,
            ]
        );

        return $newEnrollment;
    }

    /**
     * Process graduation for 12th grade students.
     */
    public function processGraduation(
        StudentEnrollment $enrollment,
        AcademicYearTransition $transition
    ): void {
        $enrollment->update([
            'enrollment_status' => 'graduated',
            'withdrawal_date' => now(),
            'withdrawal_reason' => 'Məzun oldu',
        ]);

        AcademicYearTransitionDetail::log(
            $transition->id,
            AcademicYearTransitionDetail::ENTITY_STUDENT_ENROLLMENT,
            AcademicYearTransitionDetail::ACTION_GRADUATED,
            $enrollment->id,
            null,
            '12-ci sinifi bitirdi',
            [
                'student_id' => $enrollment->student_id,
                'student_name' => $enrollment->student?->name,
                'grade' => $enrollment->grade?->class_level . '-' . $enrollment->grade?->name,
            ]
        );
    }

    /**
     * Process retention - student stays at same grade level.
     */
    public function processRetention(
        StudentEnrollment $enrollment,
        int $targetAcademicYearId,
        array $gradeMapping,
        AcademicYearTransition $transition
    ): StudentEnrollment {
        // Find grade with same class_level in target year
        $sameClassLevel = $enrollment->grade->class_level;
        $institutionId = $enrollment->grade->institution_id;

        $targetGrade = Grade::where('academic_year_id', $targetAcademicYearId)
            ->where('institution_id', $institutionId)
            ->where('class_level', $sameClassLevel)
            ->where('name', $enrollment->grade->name)
            ->first();

        if (! $targetGrade) {
            // Try any grade with same class level
            $targetGrade = Grade::where('academic_year_id', $targetAcademicYearId)
                ->where('institution_id', $institutionId)
                ->where('class_level', $sameClassLevel)
                ->first();
        }

        if (! $targetGrade) {
            throw new \Exception("Saxlanma üçün hədəf sinif tapılmadı (səviyyə: {$sameClassLevel})");
        }

        // Mark current as retained
        $enrollment->update([
            'enrollment_status' => 'retained',
        ]);

        // Create new enrollment at same level
        $newEnrollment = StudentEnrollment::create([
            'student_id' => $enrollment->student_id,
            'grade_id' => $targetGrade->id,
            'academic_year_id' => $targetAcademicYearId,
            'enrollment_date' => now(),
            'student_number' => $enrollment->student_number,
            'enrollment_status' => 'active',
            'enrollment_type' => $enrollment->enrollment_type,
            'primary_guardian_id' => $enrollment->primary_guardian_id,
            'secondary_guardian_id' => $enrollment->secondary_guardian_id,
            'emergency_contacts' => $enrollment->emergency_contacts,
            'medical_information' => $enrollment->medical_information,
            'transportation_info' => $enrollment->transportation_info,
            'special_requirements' => $enrollment->special_requirements,
            'attendance_target_percentage' => $enrollment->attendance_target_percentage,
            'photo_permission' => $enrollment->photo_permission,
            'medical_consent' => $enrollment->medical_consent,
            'trip_permission' => $enrollment->trip_permission,
            'expected_graduation_date' => $enrollment->expected_graduation_date,
            'enrollment_notes' => 'Saxlanıldı - əvvəlki il',
        ]);

        AcademicYearTransitionDetail::log(
            $transition->id,
            AcademicYearTransitionDetail::ENTITY_STUDENT_ENROLLMENT,
            AcademicYearTransitionDetail::ACTION_RETAINED,
            $enrollment->id,
            $newEnrollment->id,
            'Eyni sinif səviyyəsində saxlanıldı',
            [
                'student_id' => $enrollment->student_id,
                'student_name' => $enrollment->student?->name,
                'grade_level' => $sameClassLevel,
            ]
        );

        return $newEnrollment;
    }

    /**
     * Get all students for preview.
     */
    public function getStudentsForPreview(
        int $sourceAcademicYearId,
        int $institutionId,
        ?int $gradeId = null
    ): Collection {
        $query = StudentEnrollment::where('academic_year_id', $sourceAcademicYearId)
            ->where('enrollment_status', 'active')
            ->whereHas('grade', function ($q) use ($institutionId) {
                $q->where('institution_id', $institutionId);
            })
            ->with(['student.profile', 'grade']);

        if ($gradeId) {
            $query->where('grade_id', $gradeId);
        }

        return $query->get()->map(function ($enrollment) {
            return [
                'enrollment_id' => $enrollment->id,
                'student_id' => $enrollment->student_id,
                'student_name' => $enrollment->student?->name,
                'student_number' => $enrollment->student_number,
                'grade_id' => $enrollment->grade_id,
                'grade_name' => $enrollment->grade?->class_level . '-' . $enrollment->grade?->name,
                'class_level' => $enrollment->grade?->class_level,
                'is_graduating' => $enrollment->grade?->class_level >= 12,
                'enrollment_type' => $enrollment->enrollment_type,
            ];
        });
    }

    /**
     * Get promotion preview statistics.
     */
    public function getPromotionPreview(
        int $sourceAcademicYearId,
        int $targetAcademicYearId,
        int $institutionId,
        array $gradeMapping
    ): array {
        $enrollments = StudentEnrollment::where('academic_year_id', $sourceAcademicYearId)
            ->where('enrollment_status', 'active')
            ->whereHas('grade', function ($q) use ($institutionId) {
                $q->where('institution_id', $institutionId);
            })
            ->with('grade')
            ->get();

        $toPromote = 0;
        $toGraduate = 0;
        $noTargetGrade = 0;

        foreach ($enrollments as $enrollment) {
            if ($enrollment->grade && $enrollment->grade->class_level >= 12) {
                $toGraduate++;
            } elseif (isset($gradeMapping[$enrollment->grade_id]) && $gradeMapping[$enrollment->grade_id]) {
                $toPromote++;
            } else {
                $noTargetGrade++;
            }
        }

        return [
            'total' => $enrollments->count(),
            'to_promote' => $toPromote,
            'to_graduate' => $toGraduate,
            'no_target_grade' => $noTargetGrade,
            'by_grade_level' => $enrollments->groupBy(fn ($e) => $e->grade?->class_level ?? 0)
                ->map(fn ($group) => $group->count())
                ->toArray(),
        ];
    }

    /**
     * Update student counts in grades after promotion.
     */
    private function updateGradeStudentCounts(int $academicYearId, int $institutionId): void
    {
        $grades = Grade::where('academic_year_id', $academicYearId)
            ->where('institution_id', $institutionId)
            ->get();

        foreach ($grades as $grade) {
            $counts = StudentEnrollment::where('grade_id', $grade->id)
                ->where('enrollment_status', 'active')
                ->selectRaw('
                    COUNT(*) as total,
                    SUM(CASE WHEN EXISTS (
                        SELECT 1 FROM user_profiles
                        WHERE user_profiles.user_id = student_enrollments.student_id
                        AND user_profiles.gender = \'male\'
                    ) THEN 1 ELSE 0 END) as male,
                    SUM(CASE WHEN EXISTS (
                        SELECT 1 FROM user_profiles
                        WHERE user_profiles.user_id = student_enrollments.student_id
                        AND user_profiles.gender = \'female\'
                    ) THEN 1 ELSE 0 END) as female
                ')
                ->first();

            $grade->update([
                'student_count' => $counts->total ?? 0,
                'male_student_count' => $counts->male ?? 0,
                'female_student_count' => $counts->female ?? 0,
            ]);
        }
    }
}
