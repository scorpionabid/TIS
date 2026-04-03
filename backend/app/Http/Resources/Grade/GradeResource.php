<?php

namespace App\Http\Resources\Grade;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GradeResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'full_name' => $this->full_name,
            'class_level' => $this->class_level,
            'specialty' => $this->specialty,
            'student_count' => $this->student_count,
            'male_student_count' => $this->male_student_count ?? 0,
            'female_student_count' => $this->female_student_count ?? 0,

            // Real student counts from /students page (students table)
            'real_student_count' => $this->real_student_count ?? 0,
            'real_male_count' => $this->real_male_count ?? 0,
            'real_female_count' => $this->real_female_count ?? 0,

            // Lesson load hours from grade_subjects (curriculum)
            'lesson_load_hours' => (float) ($this->curriculum_hours ?? $this->lesson_load_hours ?? 0),
            'curriculum_hours' => (float) ($this->curriculum_hours ?? null),
            'extra_hours' => (float) ($this->extra_hours ?? 0),
            'club_hours' => (float) ($this->club_hours ?? 0),
            'individual_hours' => (float) ($this->individual_hours ?? 0),
            'home_hours' => (float) ($this->home_hours ?? 0),
            'special_hours' => (float) ($this->special_hours ?? 0),

            // Education-type based hour totals (computed from grade_subjects)
            'umumi_edu_hours' => (float) ($this->umumi_edu_hours ?? 0),
            'ferdi_edu_hours' => (float) ($this->ferdi_edu_hours ?? 0),
            'evde_edu_hours' => (float) ($this->evde_edu_hours ?? 0),
            'xususi_edu_hours' => (float) ($this->xususi_edu_hours ?? 0),

            // New split hours
            'split_foreign_lang_1' => (float) ($this->split_foreign_lang_1 ?? 0),
            'split_foreign_lang_2' => (float) ($this->split_foreign_lang_2 ?? 0),
            'split_physical_ed' => (float) ($this->split_physical_ed ?? 0),
            'split_informatics' => (float) ($this->split_informatics ?? 0),
            'split_technology' => (float) ($this->split_technology ?? 0),
            'split_state_lang' => (float) ($this->split_state_lang ?? 0),
            'split_steam' => (float) ($this->split_steam ?? 0),
            'split_digital_skills' => (float) ($this->split_digital_skills ?? 0),

            'education_program' => $this->education_program,
            'class_type' => $this->class_type,
            'class_profile' => $this->class_profile,
            'teaching_shift' => $this->teaching_shift,
            'is_active' => $this->is_active,

            // Relationships
            'academic_year' => $this->whenLoaded('academicYear', function () {
                return [
                    'id' => $this->academicYear->id,
                    'name' => $this->academicYear->name,
                    'is_active' => $this->academicYear->is_active,
                    'start_date' => $this->academicYear->start_date,
                    'end_date' => $this->academicYear->end_date,
                ];
            }),

            'institution' => $this->whenLoaded('institution', function () {
                return [
                    'id' => $this->institution->id,
                    'name' => $this->institution->name,
                    'type' => $this->institution->type,
                ];
            }),

            'room' => $this->whenLoaded('room', function () {
                return [
                    'id' => $this->room->id,
                    'name' => $this->room->name,
                    'capacity' => $this->room->capacity,
                ];
            }),

            'homeroom_teacher' => $this->whenLoaded('homeroomTeacher', function () {
                return [
                    'id' => $this->homeroomTeacher->id,
                    'full_name' => $this->homeroomTeacher->full_name,
                    'email' => $this->homeroomTeacher->email,
                ];
            }),

            'tags' => $this->whenLoaded('tags', function () {
                return $this->tags->map(function ($tag) {
                    return [
                        'id' => $tag->id,
                        'name' => $tag->name,
                        'color' => $tag->color ?? null,
                    ];
                });
            }),

            'students' => $this->whenLoaded('students', function () {
                return StudentResource::collection($this->students);
            }),

            'subjects' => $this->whenLoaded('subjects', function () {
                return SubjectResource::collection($this->subjects);
            }),

            'grade_subjects' => $this->whenLoaded('gradeSubjects', function () {
                return $this->gradeSubjects->map(function ($gs) {
                    return [
                        'id' => $gs->id,
                        'subject_id' => $gs->subject_id,
                        'subject_name' => $gs->subject?->name,
                        'subject_code' => $gs->subject?->code,
                        'weekly_hours' => $gs->weekly_hours,
                        'education_type' => $gs->education_type,
                        'is_teaching_activity' => $gs->is_teaching_activity,
                        'is_split_groups' => $gs->is_split_groups,
                        'group_count' => $gs->group_count,
                        'teacher_id' => $gs->teacher_id,
                        'teacher_name' => $gs->teacher?->name,
                        'has_grade_book' => $gs->gradeBook !== null,
                        'grade_book_id' => $gs->gradeBook?->id,
                        'grade_book_status' => $gs->gradeBook?->status,
                    ];
                });
            }),

            // IDs for relationships
            'academic_year_id' => $this->academic_year_id,
            'institution_id' => $this->institution_id,
            'room_id' => $this->room_id,
            'homeroom_teacher_id' => $this->homeroom_teacher_id,

            // Calculated fields
            'capacity_status' => $this->when($this->room, function () {
                return $this->calculateCapacityStatus();
            }),

            'utilization_rate' => $this->when($this->room, function () {
                return $this->calculateUtilizationRate();
            }),

            // Metadata
            'metadata' => $this->metadata,

            // Timestamps
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    /**
     * Calculate capacity status for the grade.
     */
    private function calculateCapacityStatus(): string
    {
        if (! $this->room || ! $this->room->capacity) {
            return 'unknown';
        }

        $utilization = $this->student_count / $this->room->capacity;

        if ($utilization >= 0.95) {
            return 'full';
        } elseif ($utilization >= 0.75) {
            return 'near_full';
        } elseif ($utilization >= 0.5) {
            return 'normal';
        }

        return 'low';
    }

    /**
     * Calculate utilization rate for the grade.
     */
    private function calculateUtilizationRate(): float
    {
        if (! $this->room || ! $this->room->capacity) {
            return 0.0;
        }

        return round(($this->student_count / $this->room->capacity) * 100, 2);
    }
}
