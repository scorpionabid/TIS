<?php

namespace App\Services;

use App\Models\AcademicYearTransition;
use App\Models\AcademicYearTransitionDetail;
use App\Models\Grade;
use App\Models\TeachingLoad;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TeacherAssignmentTransitionService
{
    /**
     * Copy homeroom teacher assignments from source grades to target grades.
     *
     * @param  array<int, int>  $gradeMapping  [source_grade_id => target_grade_id]
     * @return array{copied: int, skipped: int}
     */
    public function copyHomeroomAssignments(
        array $gradeMapping,
        AcademicYearTransition $transition,
        array $options = []
    ): array {
        $copied = 0;
        $skipped = 0;

        foreach ($gradeMapping as $sourceGradeId => $targetGradeId) {
            if (! $targetGradeId) {
                continue;
            }

            $sourceGrade = Grade::find($sourceGradeId);
            $targetGrade = Grade::find($targetGradeId);

            if (! $sourceGrade || ! $targetGrade) {
                continue;
            }

            // Skip if no homeroom teacher assigned
            if (! $sourceGrade->homeroom_teacher_id) {
                $skipped++;
                continue;
            }

            // Check if teacher is still active in the institution
            $teacher = User::find($sourceGrade->homeroom_teacher_id);
            if (! $teacher || ! $this->isTeacherActiveInInstitution($teacher, $sourceGrade->institution_id)) {
                $skipped++;

                AcademicYearTransitionDetail::log(
                    $transition->id,
                    AcademicYearTransitionDetail::ENTITY_HOMEROOM_TEACHER,
                    AcademicYearTransitionDetail::ACTION_SKIPPED,
                    $sourceGrade->id,
                    $targetGrade->id,
                    'Müəllim artıq təşkilatda aktiv deyil',
                    [
                        'teacher_id' => $sourceGrade->homeroom_teacher_id,
                        'grade_name' => $sourceGrade->class_level . '-' . $sourceGrade->name,
                    ]
                );

                continue;
            }

            // Check if teacher is already assigned to another grade in target year
            $existingAssignment = Grade::where('academic_year_id', $targetGrade->academic_year_id)
                ->where('institution_id', $targetGrade->institution_id)
                ->where('homeroom_teacher_id', $sourceGrade->homeroom_teacher_id)
                ->where('id', '!=', $targetGrade->id)
                ->first();

            if ($existingAssignment) {
                $skipped++;

                AcademicYearTransitionDetail::log(
                    $transition->id,
                    AcademicYearTransitionDetail::ENTITY_HOMEROOM_TEACHER,
                    AcademicYearTransitionDetail::ACTION_SKIPPED,
                    $sourceGrade->id,
                    $targetGrade->id,
                    'Müəllim artıq başqa sinifə təyin edilib',
                    [
                        'teacher_id' => $sourceGrade->homeroom_teacher_id,
                        'existing_grade' => $existingAssignment->class_level . '-' . $existingAssignment->name,
                    ]
                );

                continue;
            }

            // Copy assignment
            $targetGrade->update([
                'homeroom_teacher_id' => $sourceGrade->homeroom_teacher_id,
                'teacher_assigned_at' => now(),
            ]);

            $copied++;

            AcademicYearTransitionDetail::log(
                $transition->id,
                AcademicYearTransitionDetail::ENTITY_HOMEROOM_TEACHER,
                AcademicYearTransitionDetail::ACTION_COPIED,
                $sourceGrade->id,
                $targetGrade->id,
                null,
                [
                    'teacher_id' => $sourceGrade->homeroom_teacher_id,
                    'teacher_name' => $teacher->name,
                    'grade_name' => $targetGrade->class_level . '-' . $targetGrade->name,
                ]
            );
        }

        return [
            'copied' => $copied,
            'skipped' => $skipped,
        ];
    }

    /**
     * Copy subject teacher assignments from grade_subjects.
     *
     * @param  array<int, int>  $gradeMapping  [source_grade_id => target_grade_id]
     * @return array{copied: int, skipped: int}
     */
    public function copySubjectTeacherAssignments(
        array $gradeMapping,
        AcademicYearTransition $transition,
        array $options = []
    ): array {
        $copied = 0;
        $skipped = 0;

        foreach ($gradeMapping as $sourceGradeId => $targetGradeId) {
            if (! $targetGradeId) {
                continue;
            }

            $sourceGrade = Grade::find($sourceGradeId);

            // Get source grade subjects with teachers
            $sourceSubjects = DB::table('grade_subjects')
                ->where('grade_id', $sourceGradeId)
                ->whereNotNull('teacher_id')
                ->get();

            foreach ($sourceSubjects as $sourceSubject) {
                // Find corresponding target grade subject
                $targetSubject = DB::table('grade_subjects')
                    ->where('grade_id', $targetGradeId)
                    ->where('subject_id', $sourceSubject->subject_id)
                    ->first();

                if (! $targetSubject) {
                    $skipped++;
                    continue;
                }

                // Check if teacher is still active
                $teacher = User::find($sourceSubject->teacher_id);
                if (! $teacher || ! $this->isTeacherActiveInInstitution($teacher, $sourceGrade->institution_id)) {
                    $skipped++;
                    continue;
                }

                // Update target grade subject with teacher
                DB::table('grade_subjects')
                    ->where('id', $targetSubject->id)
                    ->update([
                        'teacher_id' => $sourceSubject->teacher_id,
                        'updated_at' => now(),
                    ]);

                $copied++;

                AcademicYearTransitionDetail::log(
                    $transition->id,
                    AcademicYearTransitionDetail::ENTITY_GRADE_SUBJECT,
                    AcademicYearTransitionDetail::ACTION_COPIED,
                    $sourceSubject->id,
                    $targetSubject->id,
                    null,
                    [
                        'teacher_id' => $sourceSubject->teacher_id,
                        'teacher_name' => $teacher->name,
                        'subject_id' => $sourceSubject->subject_id,
                        'grade_id' => $targetGradeId,
                    ]
                );
            }
        }

        return [
            'copied' => $copied,
            'skipped' => $skipped,
        ];
    }

    /**
     * Copy teaching loads from source year to target year.
     *
     * @return array{copied: int, skipped: int}
     */
    public function copyTeachingLoads(
        int $sourceAcademicYearId,
        int $targetAcademicYearId,
        int $institutionId,
        array $gradeMapping,
        AcademicYearTransition $transition,
        array $options = []
    ): array {
        $copied = 0;
        $skipped = 0;

        // Get all teaching loads from source year
        $sourceLoads = TeachingLoad::where('academic_year_id', $sourceAcademicYearId)
            ->where('institution_id', $institutionId)
            ->where('status', 'active')
            ->get();

        foreach ($sourceLoads as $sourceLoad) {
            // Check if teacher still active
            $teacher = User::find($sourceLoad->teacher_id);
            if (! $teacher || ! $this->isTeacherActiveInInstitution($teacher, $institutionId)) {
                $skipped++;

                AcademicYearTransitionDetail::log(
                    $transition->id,
                    AcademicYearTransitionDetail::ENTITY_TEACHING_LOAD,
                    AcademicYearTransitionDetail::ACTION_SKIPPED,
                    $sourceLoad->id,
                    null,
                    'Müəllim artıq aktiv deyil',
                    ['teacher_id' => $sourceLoad->teacher_id]
                );

                continue;
            }

            // Map class_id to new grade if applicable
            $targetClassId = null;
            if ($sourceLoad->class_id && isset($gradeMapping[$sourceLoad->class_id])) {
                $targetClassId = $gradeMapping[$sourceLoad->class_id];
            }

            // Check for duplicate
            $existingLoad = TeachingLoad::where('academic_year_id', $targetAcademicYearId)
                ->where('teacher_id', $sourceLoad->teacher_id)
                ->where('subject_id', $sourceLoad->subject_id)
                ->where('class_id', $targetClassId)
                ->first();

            if ($existingLoad) {
                $skipped++;
                continue;
            }

            // Create new teaching load
            $newLoad = TeachingLoad::create([
                'teacher_id' => $sourceLoad->teacher_id,
                'subject_id' => $sourceLoad->subject_id,
                'class_id' => $targetClassId,
                'academic_year_id' => $targetAcademicYearId,
                'institution_id' => $institutionId,
                'weekly_hours' => $sourceLoad->weekly_hours,
                'total_hours' => $sourceLoad->total_hours,
                'status' => 'active',
                'is_scheduled' => false, // Schedule needs to be regenerated
                'schedule_generation_status' => 'pending',
                'scheduling_constraints' => $sourceLoad->scheduling_constraints,
                'preferred_time_slots' => $sourceLoad->preferred_time_slots,
                'unavailable_periods' => $sourceLoad->unavailable_periods,
                'distribution_pattern' => $sourceLoad->distribution_pattern,
                'priority_level' => $sourceLoad->priority_level,
            ]);

            $copied++;

            AcademicYearTransitionDetail::log(
                $transition->id,
                AcademicYearTransitionDetail::ENTITY_TEACHING_LOAD,
                AcademicYearTransitionDetail::ACTION_COPIED,
                $sourceLoad->id,
                $newLoad->id,
                null,
                [
                    'teacher_id' => $sourceLoad->teacher_id,
                    'teacher_name' => $teacher->name,
                    'subject_id' => $sourceLoad->subject_id,
                    'weekly_hours' => $sourceLoad->weekly_hours,
                ]
            );
        }

        return [
            'copied' => $copied,
            'skipped' => $skipped,
        ];
    }

    /**
     * Check if a teacher is still active in an institution.
     */
    private function isTeacherActiveInInstitution(User $teacher, int $institutionId): bool
    {
        // Check if user is active
        if (! $teacher->is_active) {
            return false;
        }

        // Check if user belongs to institution
        if ($teacher->institution_id !== $institutionId) {
            return false;
        }

        // Check if user has teacher role
        return $teacher->hasRole(['müəllim', 'müavin', 'direktor']);
    }

    /**
     * Get preview of teacher assignments to be copied.
     */
    public function getTeacherAssignmentPreview(
        int $sourceAcademicYearId,
        int $institutionId
    ): array {
        // Homeroom teachers
        $homeroomTeachers = Grade::where('academic_year_id', $sourceAcademicYearId)
            ->where('institution_id', $institutionId)
            ->whereNotNull('homeroom_teacher_id')
            ->with('homeroomTeacher')
            ->get()
            ->map(fn ($g) => [
                'grade_id' => $g->id,
                'grade_name' => $g->class_level . '-' . $g->name,
                'teacher_id' => $g->homeroom_teacher_id,
                'teacher_name' => $g->homeroomTeacher?->name,
            ]);

        // Subject teachers count
        $subjectTeachersCount = DB::table('grade_subjects')
            ->join('grades', 'grade_subjects.grade_id', '=', 'grades.id')
            ->where('grades.academic_year_id', $sourceAcademicYearId)
            ->where('grades.institution_id', $institutionId)
            ->whereNotNull('grade_subjects.teacher_id')
            ->count();

        // Teaching loads count
        $teachingLoadsCount = TeachingLoad::where('academic_year_id', $sourceAcademicYearId)
            ->where('institution_id', $institutionId)
            ->where('status', 'active')
            ->count();

        return [
            'homeroom_teachers' => $homeroomTeachers,
            'homeroom_count' => $homeroomTeachers->count(),
            'subject_teachers_count' => $subjectTeachersCount,
            'teaching_loads_count' => $teachingLoadsCount,
        ];
    }
}
