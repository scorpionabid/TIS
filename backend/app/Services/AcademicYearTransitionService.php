<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\AcademicYearTransition;
use App\Models\AcademicYearTransitionDetail;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AcademicYearTransitionService
{
    public function __construct(
        private GradeTransitionService $gradeTransitionService,
        private StudentPromotionService $studentPromotionService,
        private TeacherAssignmentTransitionService $teacherAssignmentService
    ) {}

    /**
     * Preview transition without executing.
     */
    public function previewTransition(
        int $sourceAcademicYearId,
        int $targetAcademicYearId,
        int $institutionId,
        array $options = []
    ): array {
        $sourceYear = AcademicYear::findOrFail($sourceAcademicYearId);
        $targetYear = AcademicYear::findOrFail($targetAcademicYearId);
        $institution = Institution::findOrFail($institutionId);

        // Grade preview
        $gradePreview = $this->gradeTransitionService->previewGradeTransition(
            $sourceAcademicYearId,
            $targetAcademicYearId,
            $institutionId
        );

        // Get grade mapping for student preview
        $gradeMapping = $this->gradeTransitionService->getGradeMapping(
            $sourceAcademicYearId,
            $targetAcademicYearId,
            $institutionId
        );

        // Student preview
        $studentPreview = $this->studentPromotionService->getPromotionPreview(
            $sourceAcademicYearId,
            $targetAcademicYearId,
            $institutionId,
            $gradeMapping
        );

        // Teacher preview
        $teacherPreview = $this->teacherAssignmentService->getTeacherAssignmentPreview(
            $sourceAcademicYearId,
            $institutionId
        );

        return [
            'source_year' => [
                'id' => $sourceYear->id,
                'name' => $sourceYear->name,
            ],
            'target_year' => [
                'id' => $targetYear->id,
                'name' => $targetYear->name,
            ],
            'institution' => [
                'id' => $institution->id,
                'name' => $institution->name,
            ],
            'grades' => $gradePreview,
            'students' => $studentPreview,
            'teachers' => $teacherPreview,
            'warnings' => $this->generateWarnings($gradePreview, $studentPreview, $teacherPreview),
        ];
    }

    /**
     * Initiate the transition process.
     */
    public function initiateTransition(
        int $sourceAcademicYearId,
        int $targetAcademicYearId,
        int $institutionId,
        User $initiatedBy,
        array $options = []
    ): AcademicYearTransition {
        // Validate years exist
        $sourceYear = AcademicYear::findOrFail($sourceAcademicYearId);
        $targetYear = AcademicYear::findOrFail($targetAcademicYearId);
        $institution = Institution::findOrFail($institutionId);

        // Check for existing in-progress transition
        $existingTransition = AcademicYearTransition::where('institution_id', $institutionId)
            ->where('target_academic_year_id', $targetAcademicYearId)
            ->whereIn('status', [
                AcademicYearTransition::STATUS_PENDING,
                AcademicYearTransition::STATUS_IN_PROGRESS,
            ])
            ->first();

        if ($existingTransition) {
            throw new \Exception('Bu təşkilat üçün artıq davam edən keçid var');
        }

        // Create transition record
        $transition = AcademicYearTransition::create([
            'source_academic_year_id' => $sourceAcademicYearId,
            'target_academic_year_id' => $targetAcademicYearId,
            'institution_id' => $institutionId,
            'initiated_by' => $initiatedBy->id,
            'options' => $options,
            'status' => AcademicYearTransition::STATUS_PENDING,
        ]);

        // Execute transition
        try {
            $this->executeTransition($transition, $options);
        } catch (\Exception $e) {
            $transition->markAsFailed($e->getMessage());
            throw $e;
        }

        return $transition->fresh();
    }

    /**
     * Execute the transition process.
     */
    private function executeTransition(AcademicYearTransition $transition, array $options): void
    {
        $transition->markAsStarted();

        $copySubjects = $options['copy_subjects'] ?? true;
        $copyTeachers = $options['copy_teachers'] ?? false;
        $promoteStudents = $options['promote_students'] ?? true;
        $copyHomeroomTeachers = $options['copy_homeroom_teachers'] ?? false;
        $copySubjectTeachers = $options['copy_subject_teachers'] ?? false;
        $copyTeachingLoads = $options['copy_teaching_loads'] ?? false;
        $excludeStudentIds = $options['exclude_student_ids'] ?? [];
        $retainStudentIds = $options['retain_student_ids'] ?? [];

        DB::beginTransaction();

        try {
            // Step 1: Copy grades (20%)
            $transition->updateProgress(5, 'Siniflər kopyalanır...');

            $gradeResult = $this->gradeTransitionService->copyGradesToNewYear(
                $transition->source_academic_year_id,
                $transition->target_academic_year_id,
                $transition->institution_id,
                $transition,
                [
                    'copy_subjects' => $copySubjects,
                    'copy_teachers' => $copyTeachers,
                ]
            );

            $transition->update([
                'grades_created' => $gradeResult['created'],
                'grades_skipped' => $gradeResult['skipped'],
            ]);

            $transition->updateProgress(20, 'Siniflər kopyalandı');

            // Get grade mapping for subsequent steps
            $gradeMapping = $this->gradeTransitionService->getGradeMapping(
                $transition->source_academic_year_id,
                $transition->target_academic_year_id,
                $transition->institution_id
            );

            // Step 2: Promote students (50%)
            if ($promoteStudents) {
                $transition->updateProgress(25, 'Şagirdlər yüksəldilir...');

                $studentResult = $this->studentPromotionService->bulkPromoteStudents(
                    $transition->source_academic_year_id,
                    $transition->target_academic_year_id,
                    $transition->institution_id,
                    $gradeMapping,
                    $transition,
                    [
                        'exclude_student_ids' => $excludeStudentIds,
                        'retain_student_ids' => $retainStudentIds,
                    ]
                );

                $transition->update([
                    'students_promoted' => $studentResult['promoted'],
                    'students_graduated' => $studentResult['graduated'],
                    'students_retained' => $studentResult['retained'],
                    'students_skipped' => $studentResult['skipped'],
                ]);

                $transition->updateProgress(50, 'Şagirdlər yüksəldildi');
            }

            // Step 3: Copy teacher assignments (80%)
            $teacherAssignmentsCopied = 0;

            if ($copyHomeroomTeachers) {
                $transition->updateProgress(55, 'Sinif rəhbərləri kopyalanır...');

                $homeroomResult = $this->teacherAssignmentService->copyHomeroomAssignments(
                    $gradeMapping,
                    $transition
                );

                $teacherAssignmentsCopied += $homeroomResult['copied'];
                $transition->updateProgress(65, 'Sinif rəhbərləri kopyalandı');
            }

            if ($copySubjectTeachers) {
                $transition->updateProgress(68, 'Fənn müəllimləri kopyalanır...');

                $subjectResult = $this->teacherAssignmentService->copySubjectTeacherAssignments(
                    $gradeMapping,
                    $transition
                );

                $teacherAssignmentsCopied += $subjectResult['copied'];
                $transition->updateProgress(75, 'Fənn müəllimləri kopyalandı');
            }

            if ($copyTeachingLoads) {
                $transition->updateProgress(78, 'Tədris yükləri kopyalanır...');

                $loadResult = $this->teacherAssignmentService->copyTeachingLoads(
                    $transition->source_academic_year_id,
                    $transition->target_academic_year_id,
                    $transition->institution_id,
                    $gradeMapping,
                    $transition
                );

                $teacherAssignmentsCopied += $loadResult['copied'];
                $transition->updateProgress(90, 'Tədris yükləri kopyalandı');
            }

            $transition->update([
                'teacher_assignments_copied' => $teacherAssignmentsCopied,
            ]);

            // Step 4: Finalize
            $transition->updateProgress(95, 'Tamamlanır...');

            // Store rollback data
            $transition->update([
                'rollback_data' => [
                    'grade_mapping' => $gradeMapping,
                    'options' => $options,
                ],
            ]);

            DB::commit();

            $transition->markAsCompleted();

            Log::info('Academic year transition completed', [
                'transition_id' => $transition->id,
                'summary' => $transition->getSummary(),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Academic year transition failed', [
                'transition_id' => $transition->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Rollback a completed transition.
     */
    public function rollbackTransition(AcademicYearTransition $transition): void
    {
        if (! $transition->canBeRolledBack()) {
            throw new \Exception('Bu keçid geri qaytarıla bilməz');
        }

        DB::beginTransaction();

        try {
            $rollbackData = $transition->rollback_data ?? [];
            $gradeMapping = $rollbackData['grade_mapping'] ?? [];

            // Delete created grades (cascades to grade_subjects)
            $createdGradeIds = array_values($gradeMapping);
            Grade::whereIn('id', $createdGradeIds)->delete();

            // Revert enrollment statuses
            $promotedEnrollments = $transition->details()
                ->where('entity_type', AcademicYearTransitionDetail::ENTITY_STUDENT_ENROLLMENT)
                ->whereIn('action', [
                    AcademicYearTransitionDetail::ACTION_PROMOTED,
                    AcademicYearTransitionDetail::ACTION_GRADUATED,
                    AcademicYearTransitionDetail::ACTION_RETAINED,
                ])
                ->get();

            foreach ($promotedEnrollments as $detail) {
                // Revert source enrollment status
                if ($detail->source_entity_id) {
                    DB::table('student_enrollments')
                        ->where('id', $detail->source_entity_id)
                        ->update(['enrollment_status' => 'active']);
                }

                // Delete target enrollment
                if ($detail->target_entity_id) {
                    DB::table('student_enrollments')
                        ->where('id', $detail->target_entity_id)
                        ->delete();
                }
            }

            // Delete copied teaching loads
            $copiedLoads = $transition->details()
                ->where('entity_type', AcademicYearTransitionDetail::ENTITY_TEACHING_LOAD)
                ->where('action', AcademicYearTransitionDetail::ACTION_COPIED)
                ->pluck('target_entity_id');

            DB::table('teaching_loads')->whereIn('id', $copiedLoads)->delete();

            // Update transition status
            $transition->update([
                'status' => AcademicYearTransition::STATUS_ROLLED_BACK,
                'can_rollback' => false,
            ]);

            DB::commit();

            Log::info('Academic year transition rolled back', [
                'transition_id' => $transition->id,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Academic year transition rollback failed', [
                'transition_id' => $transition->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Get transition status with details.
     */
    public function getTransitionStatus(AcademicYearTransition $transition): array
    {
        $transition->load(['sourceAcademicYear', 'targetAcademicYear', 'institution', 'initiator']);

        return [
            'id' => $transition->id,
            'status' => $transition->status,
            'progress_percentage' => $transition->progress_percentage,
            'current_step' => $transition->current_step,
            'source_year' => $transition->sourceAcademicYear?->name,
            'target_year' => $transition->targetAcademicYear?->name,
            'institution' => $transition->institution?->name,
            'initiated_by' => $transition->initiator?->name,
            'summary' => $transition->getSummary(),
            'can_rollback' => $transition->canBeRolledBack(),
            'rollback_expires_at' => $transition->rollback_expires_at?->toIso8601String(),
            'started_at' => $transition->started_at?->toIso8601String(),
            'completed_at' => $transition->completed_at?->toIso8601String(),
            'error_message' => $transition->error_message,
        ];
    }

    /**
     * Get transition history for an institution.
     */
    public function getTransitionHistory(int $institutionId, int $perPage = 15): \Illuminate\Pagination\LengthAwarePaginator
    {
        return AcademicYearTransition::where('institution_id', $institutionId)
            ->with(['sourceAcademicYear', 'targetAcademicYear', 'initiator'])
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    /**
     * Generate warnings for preview.
     */
    private function generateWarnings(array $gradePreview, array $studentPreview, array $teacherPreview): array
    {
        $warnings = [];

        // Grade warnings
        if (count($gradePreview['already_exist']) > 0) {
            $warnings[] = [
                'type' => 'grade_exists',
                'message' => count($gradePreview['already_exist']) . ' sinif artıq hədəf ildə mövcuddur və atlanacaq',
                'count' => count($gradePreview['already_exist']),
            ];
        }

        // Student warnings
        if ($studentPreview['no_target_grade'] > 0) {
            $warnings[] = [
                'type' => 'no_target_grade',
                'message' => $studentPreview['no_target_grade'] . ' şagird üçün hədəf sinif tapılmadı',
                'count' => $studentPreview['no_target_grade'],
            ];
        }

        if ($studentPreview['to_graduate'] > 0) {
            $warnings[] = [
                'type' => 'graduating',
                'message' => $studentPreview['to_graduate'] . ' şagird məzun olacaq (12-ci sinif)',
                'count' => $studentPreview['to_graduate'],
                'severity' => 'info',
            ];
        }

        return $warnings;
    }
}
