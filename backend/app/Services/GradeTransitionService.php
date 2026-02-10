<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\AcademicYearTransition;
use App\Models\AcademicYearTransitionDetail;
use App\Models\Grade;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GradeTransitionService
{
    /**
     * Copy all grades from source year to target year for an institution.
     *
     * @return array{mapping: array, created: int, skipped: int}
     */
    public function copyGradesToNewYear(
        int $sourceAcademicYearId,
        int $targetAcademicYearId,
        int $institutionId,
        AcademicYearTransition $transition,
        array $options = []
    ): array {
        $copySubjects = $options['copy_subjects'] ?? true;
        $copyTeachers = $options['copy_teachers'] ?? false;
        $copyTags = $options['copy_tags'] ?? false;

        // Get all grades from source year
        $sourceGrades = Grade::where('academic_year_id', $sourceAcademicYearId)
            ->where('institution_id', $institutionId)
            ->where('is_active', true)
            ->orderBy('class_level')
            ->orderBy('name')
            ->get();

        $mapping = [];
        $created = 0;
        $skipped = 0;

        foreach ($sourceGrades as $sourceGrade) {
            // Check if grade already exists in target year
            $existingGrade = Grade::where('name', $sourceGrade->name)
                ->where('class_level', $sourceGrade->class_level)
                ->where('academic_year_id', $targetAcademicYearId)
                ->where('institution_id', $institutionId)
                ->first();

            if ($existingGrade) {
                // Grade already exists, map to existing
                $mapping[$sourceGrade->id] = $existingGrade->id;
                $skipped++;

                AcademicYearTransitionDetail::log(
                    $transition->id,
                    AcademicYearTransitionDetail::ENTITY_GRADE,
                    AcademicYearTransitionDetail::ACTION_SKIPPED,
                    $sourceGrade->id,
                    $existingGrade->id,
                    'Sinif artıq mövcuddur',
                    ['grade_name' => $sourceGrade->class_level . '-' . $sourceGrade->name]
                );

                continue;
            }

            try {
                // Duplicate grade
                $newGrade = $this->duplicateGrade(
                    $sourceGrade,
                    $targetAcademicYearId,
                    [
                        'copy_subjects' => $copySubjects,
                        'copy_teachers' => $copyTeachers,
                        'copy_tags' => $copyTags,
                    ]
                );

                $mapping[$sourceGrade->id] = $newGrade->id;
                $created++;

                AcademicYearTransitionDetail::log(
                    $transition->id,
                    AcademicYearTransitionDetail::ENTITY_GRADE,
                    AcademicYearTransitionDetail::ACTION_CREATED,
                    $sourceGrade->id,
                    $newGrade->id,
                    null,
                    ['grade_name' => $newGrade->class_level . '-' . $newGrade->name]
                );

            } catch (\Exception $e) {
                Log::error('Grade transition failed', [
                    'source_grade_id' => $sourceGrade->id,
                    'error' => $e->getMessage(),
                ]);

                AcademicYearTransitionDetail::log(
                    $transition->id,
                    AcademicYearTransitionDetail::ENTITY_GRADE,
                    AcademicYearTransitionDetail::ACTION_FAILED,
                    $sourceGrade->id,
                    null,
                    $e->getMessage(),
                    ['grade_name' => $sourceGrade->class_level . '-' . $sourceGrade->name]
                );

                throw $e;
            }
        }

        return [
            'mapping' => $mapping,
            'created' => $created,
            'skipped' => $skipped,
        ];
    }

    /**
     * Duplicate a single grade to a new academic year.
     * Based on GradeCRUDController::duplicate() pattern.
     */
    public function duplicateGrade(
        Grade $sourceGrade,
        int $targetAcademicYearId,
        array $options = []
    ): Grade {
        $copySubjects = $options['copy_subjects'] ?? true;
        $copyTeachers = $options['copy_teachers'] ?? false;
        $copyTags = $options['copy_tags'] ?? false;

        // Prepare new grade data
        $newGradeData = $sourceGrade->toArray();

        // Remove non-copiable fields
        unset(
            $newGradeData['id'],
            $newGradeData['created_at'],
            $newGradeData['updated_at'],
            $newGradeData['deleted_at']
        );

        // Apply modifications
        $newGradeData['academic_year_id'] = $targetAcademicYearId;
        $newGradeData['homeroom_teacher_id'] = $copyTeachers ? $sourceGrade->homeroom_teacher_id : null;
        $newGradeData['room_id'] = null; // Rooms should be reassigned
        $newGradeData['student_count'] = 0;
        $newGradeData['male_student_count'] = 0;
        $newGradeData['female_student_count'] = 0;

        // Create the new grade
        $newGrade = Grade::create($newGradeData);

        // Copy grade subjects if requested
        if ($copySubjects) {
            $this->copyGradeSubjects($sourceGrade, $newGrade, $copyTeachers);
        }

        // Copy tags if requested
        if ($copyTags && method_exists($sourceGrade, 'tags')) {
            $tagIds = $sourceGrade->tags->pluck('id')->toArray();
            if (! empty($tagIds)) {
                $newGrade->tags()->sync($tagIds);
            }
        }

        return $newGrade;
    }

    /**
     * Copy grade subjects from source to target grade.
     */
    public function copyGradeSubjects(
        Grade $sourceGrade,
        Grade $targetGrade,
        bool $keepTeacherAssignments = false
    ): void {
        $gradeSubjects = DB::table('grade_subjects')
            ->where('grade_id', $sourceGrade->id)
            ->get();

        foreach ($gradeSubjects as $gradeSubject) {
            DB::table('grade_subjects')->insert([
                'grade_id' => $targetGrade->id,
                'subject_id' => $gradeSubject->subject_id,
                'weekly_hours' => $gradeSubject->weekly_hours,
                'is_teaching_activity' => $gradeSubject->is_teaching_activity ?? false,
                'is_extracurricular' => $gradeSubject->is_extracurricular ?? false,
                'is_club' => $gradeSubject->is_club ?? false,
                'is_split_groups' => $gradeSubject->is_split_groups ?? false,
                'group_count' => $gradeSubject->group_count,
                'teacher_id' => $keepTeacherAssignments ? $gradeSubject->teacher_id : null,
                'notes' => $gradeSubject->notes,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Get the mapping of old grades to new grades for student promotion.
     * Maps source grade to the next class level grade in target year.
     *
     * @return array<int, int|null> [source_grade_id => target_grade_id]
     */
    public function getGradeMapping(
        int $sourceAcademicYearId,
        int $targetAcademicYearId,
        int $institutionId
    ): array {
        // Get all source grades
        $sourceGrades = Grade::where('academic_year_id', $sourceAcademicYearId)
            ->where('institution_id', $institutionId)
            ->where('is_active', true)
            ->get();

        // Get all target grades indexed by class_level and name
        $targetGrades = Grade::where('academic_year_id', $targetAcademicYearId)
            ->where('institution_id', $institutionId)
            ->where('is_active', true)
            ->get()
            ->keyBy(fn ($g) => $g->class_level . '-' . $g->name);

        $mapping = [];

        foreach ($sourceGrades as $sourceGrade) {
            $nextClassLevel = $sourceGrade->class_level + 1;

            // 12th grade students graduate - no target grade
            if ($sourceGrade->class_level >= 12) {
                $mapping[$sourceGrade->id] = null;
                continue;
            }

            // Find target grade with same name but next class level
            $targetKey = $nextClassLevel . '-' . $sourceGrade->name;
            $targetGrade = $targetGrades->get($targetKey);

            if ($targetGrade) {
                $mapping[$sourceGrade->id] = $targetGrade->id;
            } else {
                // Try to find any grade with the next class level
                $anyTargetGrade = $targetGrades->first(fn ($g) => $g->class_level === $nextClassLevel);
                $mapping[$sourceGrade->id] = $anyTargetGrade?->id;
            }
        }

        return $mapping;
    }

    /**
     * Preview grade transition without executing.
     */
    public function previewGradeTransition(
        int $sourceAcademicYearId,
        int $targetAcademicYearId,
        int $institutionId
    ): array {
        $sourceGrades = Grade::where('academic_year_id', $sourceAcademicYearId)
            ->where('institution_id', $institutionId)
            ->where('is_active', true)
            ->withCount(['students as active_students_count' => function ($query) {
                $query->whereHas('grades', fn ($q) => $q->where('is_active', true));
            }])
            ->orderBy('class_level')
            ->orderBy('name')
            ->get();

        $existingTargetGrades = Grade::where('academic_year_id', $targetAcademicYearId)
            ->where('institution_id', $institutionId)
            ->pluck('id', DB::raw("CONCAT(class_level, '-', name)"));

        $preview = [
            'to_create' => [],
            'already_exist' => [],
            'total_source' => $sourceGrades->count(),
        ];

        foreach ($sourceGrades as $grade) {
            $key = $grade->class_level . '-' . $grade->name;
            $gradeInfo = [
                'id' => $grade->id,
                'name' => $grade->name,
                'class_level' => $grade->class_level,
                'full_name' => $key,
                'student_count' => $grade->student_count,
                'specialty' => $grade->specialty,
            ];

            if ($existingTargetGrades->has($key)) {
                $gradeInfo['existing_id'] = $existingTargetGrades->get($key);
                $preview['already_exist'][] = $gradeInfo;
            } else {
                $preview['to_create'][] = $gradeInfo;
            }
        }

        return $preview;
    }

    /**
     * Get grades that need manual attention (e.g., no matching target).
     */
    public function getGradesNeedingAttention(
        int $sourceAcademicYearId,
        int $targetAcademicYearId,
        int $institutionId
    ): Collection {
        $mapping = $this->getGradeMapping(
            $sourceAcademicYearId,
            $targetAcademicYearId,
            $institutionId
        );

        $gradesWithoutTarget = [];
        foreach ($mapping as $sourceId => $targetId) {
            if ($targetId === null) {
                $gradesWithoutTarget[] = $sourceId;
            }
        }

        return Grade::whereIn('id', $gradesWithoutTarget)
            ->with(['homeroomTeacher.profile'])
            ->get();
    }
}
