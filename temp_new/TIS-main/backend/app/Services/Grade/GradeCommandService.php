<?php

namespace App\Services\Grade;

use App\Models\Grade;
use App\Models\User;
use App\Services\InstitutionAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class GradeCommandService
{
    /**
     * Store a newly created grade.
     */
    public function store(array $validated, User $user): Grade
    {
        $className = mb_strtoupper(trim($validated['name']));
        $classLevel = (int) $validated['class_level'];

        // Validation for uniqueness and availability should be done before calling this, 
        // but we can add secondary checks or just proceed if controller handled it.

        return Grade::create([
            'name' => $className,
            'class_level' => $classLevel,
            'academic_year_id' => $validated['academic_year_id'],
            'institution_id' => $validated['institution_id'],
            'room_id' => $validated['room_id'] ?? null,
            'homeroom_teacher_id' => $validated['homeroom_teacher_id'] ?? null,
            'specialty' => $validated['specialty'] ?? null,
            'student_count' => $validated['student_count'] ?? 0,
            'male_student_count' => $validated['male_student_count'] ?? 0,
            'female_student_count' => $validated['female_student_count'] ?? 0,
            'education_program' => $validated['education_program'] ?? 'umumi',
            'class_type' => $validated['class_type'] ?? null,
            'class_profile' => $validated['class_profile'] ?? null,
            'teaching_shift' => $validated['teaching_shift'] ?? null,
            'metadata' => $validated['metadata'] ?? [],
            'is_active' => true,
        ]);
    }

    /**
     * Update an existing grade.
     */
    public function update(Grade $grade, array $validated): bool
    {
        $updateData = array_filter($validated, fn ($key) => in_array($key, [
            'room_id', 'homeroom_teacher_id', 'specialty', 'student_count',
            'male_student_count', 'female_student_count', 'education_program',
            'is_active', 'metadata', 'class_type', 'class_profile', 'teaching_shift',
            'extra_hours', 'individual_hours', 'home_hours', 'special_hours',
            'curriculum_hours',
            'split_foreign_lang_1', 'split_foreign_lang_2', 'split_physical_ed',
            'split_informatics', 'split_technology', 'split_state_lang',
            'split_steam', 'split_digital_skills', 'club_hours',
            'name', 'class_level'
        ]), ARRAY_FILTER_USE_KEY);

        if (isset($updateData['name'])) {
            $updateData['name'] = mb_strtoupper(trim($updateData['name']));
        }

        return $grade->update($updateData);
    }

    /**
     * Deactivate a grade.
     */
    public function deactivate(Grade $grade): bool
    {
        return $grade->update([
            'is_active' => false,
            'deactivated_at' => now(),
        ]);
    }

    /**
     * Duplicate an existing grade.
     */
    public function duplicate(Grade $grade, array $validated): Grade
    {
        return DB::transaction(function () use ($grade, $validated) {
            $targetClassLevel = $validated['class_level'] ?? $grade->class_level;
            $targetAcademicYearId = $validated['academic_year_id'] ?? $grade->academic_year_id;

            $newGradeData = $grade->toArray();
            unset($newGradeData['id'], $newGradeData['created_at'], $newGradeData['updated_at']);

            $newGradeData['name'] = mb_strtoupper(trim($validated['name']));
            $newGradeData['class_level'] = $targetClassLevel;
            $newGradeData['academic_year_id'] = $targetAcademicYearId;
            $newGradeData['homeroom_teacher_id'] = null;
            $newGradeData['room_id'] = null;
            $newGradeData['student_count'] = 0;
            $newGradeData['male_student_count'] = 0;
            $newGradeData['female_student_count'] = 0;

            $newGrade = Grade::create($newGradeData);

            if ($validated['copy_subjects'] ?? true) {
                $this->copySubjects($grade, $newGrade);
            }

            return $newGrade;
        });
    }

    /**
     * Copy subjects from one grade to another.
     */
    protected function copySubjects(Grade $source, Grade $target): void
    {
        $gradeSubjects = DB::table('grade_subjects')
            ->where('grade_id', $source->id)
            ->get();

        foreach ($gradeSubjects as $gs) {
            DB::table('grade_subjects')->insert([
                'grade_id' => $target->id,
                'subject_id' => $gs->subject_id,
                'education_type' => $gs->education_type ?? 'umumi',
                'weekly_hours' => $gs->weekly_hours,
                'calculated_hours' => $gs->calculated_hours ?? $gs->weekly_hours,
                'is_teaching_activity' => $gs->is_teaching_activity ?? false,
                'is_extracurricular' => $gs->is_extracurricular ?? false,
                'is_club' => $gs->is_club ?? false,
                'is_split_groups' => $gs->is_split_groups ?? false,
                'group_count' => $gs->group_count ?? 1,
                'teacher_id' => null,
                'notes' => $gs->notes,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
