<?php

namespace Database\Factories;

use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Grade>
 */
class GradeFactory extends Factory
{
    protected $model = Grade::class;

    public function definition(): array
    {
        return [
            'institution_id'    => Institution::factory()->school(),
            'academic_year_id'  => AcademicYear::factory()->active(),
            'name'              => $this->faker->randomElement(['A', 'B', 'C', 'D']),
            'class_level'       => $this->faker->numberBetween(1, 12),
            'student_count'     => $this->faker->numberBetween(10, 35),
            'male_student_count'   => 0,
            'female_student_count' => 0,
            'is_active'         => true,
            'metadata'          => [],
        ];
    }

    /** Deaktiv sinif */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active'      => false,
            'deactivated_at' => now(),
        ]);
    }

    /** Xüsusi sinif səviyyəsi */
    public function forClassLevel(int $level): static
    {
        return $this->state(fn (array $attributes) => [
            'class_level' => $level,
        ]);
    }

    /** Xüsusi müəssisə üçün */
    public function forInstitution(Institution $institution): static
    {
        return $this->state(fn (array $attributes) => [
            'institution_id' => $institution->id,
        ]);
    }

    /** Otaq ilə */
    public function withRoom(Room $room): static
    {
        return $this->state(fn (array $attributes) => [
            'room_id' => $room->id,
        ]);
    }

    /** Sinif rəhbəri ilə */
    public function withTeacher(User $teacher): static
    {
        return $this->state(fn (array $attributes) => [
            'homeroom_teacher_id' => $teacher->id,
        ]);
    }
}
