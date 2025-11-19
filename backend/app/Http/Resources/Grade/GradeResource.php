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
        if (!$this->room || !$this->room->capacity) {
            return 'unknown';
        }

        $utilization = $this->student_count / $this->room->capacity;

        if ($utilization >= 0.95) {
            return 'full';
        } elseif ($utilization >= 0.75) {
            return 'near_full';
        } elseif ($utilization >= 0.5) {
            return 'normal';
        } else {
            return 'low';
        }
    }

    /**
     * Calculate utilization rate for the grade.
     */
    private function calculateUtilizationRate(): float
    {
        if (!$this->room || !$this->room->capacity) {
            return 0.0;
        }

        return round(($this->student_count / $this->room->capacity) * 100, 2);
    }
}
