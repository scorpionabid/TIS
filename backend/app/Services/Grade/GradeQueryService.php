<?php

namespace App\Services\Grade;

use App\Models\AcademicYear;
use App\Models\Grade;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class GradeQueryService
{
    /**
     * Build the grade query with filters and counts.
     */
    public function getFilteredQuery(Request $request): Builder
    {
        $query = $this->applyFilters($request);

        // Real student counts from students table
        $query->withCount([
            'assignedStudents as real_student_count',
            'assignedStudents as real_male_count' => fn ($q) => $q->where('gender', 'male'),
            'assignedStudents as real_female_count' => fn ($q) => $q->where('gender', 'female'),
        ]);

        // Lesson load hours from grade_subjects
        $query->withSum(
            ['gradeSubjects as lesson_load_hours' => fn ($q) => $q->where('is_teaching_activity', true)],
            'weekly_hours'
        )->withSum(
            ['gradeSubjects as extracurricular_hours' => fn ($q) => $q->where('is_extracurricular', true)],
            'weekly_hours'
        )->withSum(
            ['gradeSubjects as club_subjects_sum' => fn ($q) => $q->where('is_club', true)],
            'weekly_hours'
        )->withSum(
            ['gradeSubjects as umumi_edu_hours' => fn ($q) => $q->where('education_type', 'umumi')],
            'weekly_hours'
        )->withSum(
            ['gradeSubjects as ferdi_edu_hours' => fn ($q) => $q->where('education_type', 'ferdi')],
            'weekly_hours'
        )->withSum(
            ['gradeSubjects as evde_edu_hours' => fn ($q) => $q->where('education_type', 'evde')],
            'weekly_hours'
        )->withSum(
            ['gradeSubjects as xususi_edu_hours' => fn ($q) => $q->where('education_type', 'xususi')],
            'weekly_hours'
        );

        return $query;
    }

    /**
     * Apply filters to the grade query.
     */
    public function applyFilters(Request $request): Builder
    {
        $query = Grade::query();

        // Apply regional access control
        $user = $request->user();
        if (! $user->hasRole('superadmin')) {
            $accessibleInstitutions = \App\Services\InstitutionAccessService::getAccessibleInstitutions($user);
            $query->whereIn('institution_id', $accessibleInstitutions);
        }

        // Determine institution ID
        $institutionId = $request->input('institution_id') ??
                        $request->input('school_id') ??
                        $request->route('institution') ??
                        $request->route('institutionId') ??
                        $request->route('schoolId') ??
                        $request->route('school_id');

        if ($institutionId) {
            $query->where('institution_id', (int) $institutionId);
        }

        if ($request->has('class_level')) {
            $query->where('class_level', $request->class_level);
        }

        if ($request->has('academic_year_id')) {
            $query->where('academic_year_id', $request->academic_year_id);
        } else {
            $activeYear = AcademicYear::where('is_active', true)->first();
            if ($activeYear) {
                $query->where('academic_year_id', $activeYear->id);
            }
        }

        if ($request->has('room_id')) {
            $query->where('room_id', $request->room_id);
        }

        if ($request->has('homeroom_teacher_id')) {
            $query->where('homeroom_teacher_id', $request->homeroom_teacher_id);
        }

        if ($request->has('specialty')) {
            $query->where('specialty', $request->specialty);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('has_room')) {
            $query->when($request->boolean('has_room'), function ($q) {
                return $q->whereNotNull('room_id');
            }, function ($q) {
                return $q->whereNull('room_id');
            });
        }

        if ($request->has('has_teacher')) {
            $query->when($request->boolean('has_teacher'), function ($q) {
                return $q->whereNotNull('homeroom_teacher_id');
            }, function ($q) {
                return $q->whereNull('homeroom_teacher_id');
            });
        }

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'ILIKE', "%{$request->search}%")
                    ->orWhere('specialty', 'ILIKE', "%{$request->search}%");
            });
        }

        if ($request->has('class_type')) {
            $query->where('class_type', $request->class_type);
        }

        if ($request->has('teaching_shift')) {
            $query->where('teaching_shift', $request->teaching_shift);
        }

        // Filter by subject_id
        if ($request->has('subject_id')) {
            $this->applySubjectFilters($query, (int) $request->subject_id, $request->input('education_type'), $institutionId, $request);
        }

        return $query;
    }

    /**
     * Apply subject-specific filters.
     *
     * Logic:
     *  1. Show only grades whose class_level has a curriculum_plans entry for this subject.
     *  2. Exclude grades where:
     *     a) The subject is NOT split-groups AND at least 1 teacher is already assigned → hide completely.
     *     b) The subject IS split-groups (or individual type) AND total assigned hours >= planned hours → hide.
     */
    protected function applySubjectFilters(Builder $query, int $subjectId, ?string $eduType, $institutionId, Request $request): void
    {
        $eduTypeVal = $eduType ?? 'umumi';
        $isIndividualType = in_array($eduTypeVal, ['ferdi', 'evde', 'xususi']);

        // 1. Only show grades where this subject is actually assigned and NOT fully filled with teachers
        $query->whereRaw(
            'EXISTS (
                SELECT 1 FROM grade_subjects gs
                WHERE gs.grade_id   = grades.id
                  AND gs.subject_id = ?
                  AND gs.weekly_hours > 0
                  AND (
                    CASE 
                      WHEN LOWER(gs.education_type) LIKE \'%ümumi%\' OR LOWER(gs.education_type) LIKE \'%umumi%\' OR gs.education_type IS NULL THEN \'umumi\'
                      WHEN LOWER(gs.education_type) LIKE \'%fərdi%\' OR LOWER(gs.education_type) LIKE \'%ferdi%\' THEN \'ferdi\'
                      WHEN LOWER(gs.education_type) LIKE \'%evdə%\' OR LOWER(gs.education_type) LIKE \'%evde%\' THEN \'evde\'
                      WHEN LOWER(gs.education_type) LIKE \'%xüsusi%\' OR LOWER(gs.education_type) LIKE \'%xususi%\' THEN \'xususi\'
                      ELSE LOWER(gs.education_type)
                    END = ?
                  )
            )',
            [$subjectId, $eduTypeVal]
        );

        if ($isIndividualType) {
            // Individual education types: allow multiple teachers; only hide if hours are exhausted.
            $query->whereRaw(
                'NOT EXISTS (
                    SELECT 1
                    FROM classes c2
                    WHERE c2.institution_id   = grades.institution_id
                      AND c2.academic_year_id = grades.academic_year_id
                      AND c2.grade_level      = grades.class_level
                      AND c2.section          = grades.name
                      AND (
                          SELECT COALESCE(SUM(tl.weekly_hours), 0)
                          FROM teaching_loads tl
                          WHERE tl.class_id     = c2.id
                            AND tl.subject_id   = ?
                            AND tl.deleted_at   IS NULL
                            AND tl.education_type = ?
                      ) >= COALESCE(
                          (
                              SELECT gs2.weekly_hours
                                   * CASE WHEN gs2.is_split_groups THEN COALESCE(gs2.group_count, 1) ELSE 1 END
                              FROM grade_subjects gs2
                              WHERE gs2.grade_id   = grades.id
                                AND gs2.subject_id = ?
                                AND gs2.education_type = ?
                              LIMIT 1
                          ),
                          (
                              SELECT cp2.hours
                              FROM curriculum_plans cp2
                              WHERE cp2.class_level      = grades.class_level
                                AND cp2.institution_id   = grades.institution_id
                                AND cp2.academic_year_id = grades.academic_year_id
                                AND cp2.subject_id       = ?
                                AND cp2.education_type   = ?
                              LIMIT 1
                          )
                      )
                )',
                [$subjectId, $eduTypeVal, $subjectId, $eduTypeVal, $subjectId, $eduTypeVal]
            );
        } else {
            // Ümumi (and similar): a subject can have 1 teacher unless grade_subjects.is_split_groups = true.
            // For non-split: hide grade if ANY teacher is already assigned for this subject.
            // For split:     hide grade if teacher count >= group_count OR hours fully covered.
            $query->whereRaw(
                'NOT EXISTS (
                    SELECT 1
                    FROM classes c2
                    WHERE c2.institution_id   = grades.institution_id
                      AND c2.academic_year_id = grades.academic_year_id
                      AND c2.grade_level      = grades.class_level
                      AND c2.section          = grades.name
                      AND (
                          (
                              NOT EXISTS (
                                  SELECT 1 FROM grade_subjects gs_chk
                                  WHERE gs_chk.grade_id    = grades.id
                                    AND gs_chk.subject_id  = ?
                                    AND (gs_chk.education_type = ? OR (? = \'umumi\' AND gs_chk.education_type IS NULL))
                                    AND gs_chk.is_split_groups = true
                              )
                              AND EXISTS (
                                  SELECT 1 FROM teaching_loads tl_chk
                                  WHERE tl_chk.class_id    = c2.id
                                    AND tl_chk.subject_id  = ?
                                    AND tl_chk.deleted_at  IS NULL
                                    AND (tl_chk.education_type = ? OR (? = \'umumi\' AND tl_chk.education_type IS NULL))
                              )
                          )
                          OR
                          (
                              EXISTS (
                                  SELECT 1 FROM grade_subjects gs_split
                                  WHERE gs_split.grade_id   = grades.id
                                    AND gs_split.subject_id = ?
                                    AND (gs_split.education_type = ? OR (? = \'umumi\' AND gs_split.education_type IS NULL))
                                    AND gs_split.is_split_groups = true
                                    AND (
                                        SELECT COUNT(*) FROM teaching_loads tl_cnt
                                        WHERE tl_cnt.class_id   = c2.id
                                          AND tl_cnt.subject_id = ?
                                          AND tl_cnt.deleted_at IS NULL
                                          AND (tl_cnt.education_type = ? OR (? = \'umumi\' AND tl_cnt.education_type IS NULL))
                                    ) >= COALESCE(gs_split.group_count, 1)
                              )
                          )
                      )
                )',
                [
                    $subjectId, $eduTypeVal, $eduTypeVal,
                    $subjectId, $eduTypeVal, $eduTypeVal,
                    $subjectId, $eduTypeVal, $eduTypeVal,
                    $subjectId, $eduTypeVal, $eduTypeVal,
                ]
            );
        }
    }

    /**
     * Get relationships to eager load based on includes.
     */
    public function getIncludes(Request $request): array
    {
        $includes = $request->get('include', '');
        $with = ['institution', 'academicYear', 'tags'];

        if (str_contains($includes, 'room')) {
            $with[] = 'room';
        }
        if (str_contains($includes, 'teacher')) {
            $with[] = 'homeroomTeacher.profile';
        }
        if (str_contains($includes, 'students')) {
            $with[] = 'students.profile';
        }
        if (str_contains($includes, 'subjects') || str_contains($includes, 'grade_subjects')) {
            $with[] = 'subjects.activeTeacherAssignments.teacher.profile';
            $with[] = 'gradeSubjects.subject';
            $with[] = 'gradeSubjects.teacher';
        }

        return $with;
    }
}
