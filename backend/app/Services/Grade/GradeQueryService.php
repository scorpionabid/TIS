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
     */
    protected function applySubjectFilters(Builder $query, int $subjectId, ?string $eduType, $institutionId, Request $request): void
    {
        $query->where(function ($mainQ) use ($subjectId, $eduType, $institutionId, $request) {
            // Option 1: Explicitly assigned in Sinif Tədris Planı (grade_subjects)
            $mainQ->whereHas('gradeSubjects', function ($q) use ($subjectId, $eduType) {
                $q->where('grade_subjects.subject_id', $subjectId);
                if ($eduType) {
                    $q->where(function ($q2) use ($eduType) {
                        $q2->where('grade_subjects.education_type', $eduType);
                        if ($eduType === 'umumi') {
                            $q2->orWhereNull('grade_subjects.education_type');
                        }
                    });
                }
            })
            // Option 2: Planned for this class level in Master Plan (curriculum_plans)
            ->orWhereExists(function ($q) use ($subjectId, $eduType, $institutionId, $request) {
                $q->select(\DB::raw(1))
                    ->from('curriculum_plans')
                    ->whereColumn('curriculum_plans.class_level', 'grades.class_level')
                    ->where('curriculum_plans.subject_id', $subjectId)
                    ->where('curriculum_plans.institution_id', (int) $institutionId);
                
                if ($request->has('academic_year_id')) {
                    $q->where('curriculum_plans.academic_year_id', $request->academic_year_id);
                }

                if ($eduType) {
                    $q->where('curriculum_plans.education_type', $eduType);
                }
            });
        });

        // Exclude fully covered subjects
        $eduTypeVal = $eduType ?? 'umumi';
        $query->whereRaw(
            'NOT EXISTS (
                SELECT 1
                FROM grade_subjects gs2
                INNER JOIN classes c2
                    ON  c2.institution_id   = grades.institution_id
                    AND c2.academic_year_id = grades.academic_year_id
                    AND c2.grade_level      = grades.class_level
                    AND c2.section          = grades.name
                WHERE gs2.grade_id    = grades.id
                  AND gs2.subject_id  = ?
                  AND (gs2.education_type = ? OR (? = \'umumi\' AND gs2.education_type IS NULL))
                  AND (
                      SELECT COALESCE(SUM(tl.weekly_hours), 0)
                      FROM teaching_loads tl
                      WHERE tl.class_id    = c2.id
                        AND tl.subject_id  = ?
                        AND tl.deleted_at  IS NULL
                        AND (tl.education_type = ? OR (? = \'umumi\' AND tl.education_type IS NULL))
                  ) >= gs2.weekly_hours
                     * CASE WHEN gs2.is_split_groups THEN gs2.group_count ELSE 1 END
            )',
            [$subjectId, $eduTypeVal, $eduTypeVal, $subjectId, $eduTypeVal, $eduTypeVal]
        );
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
