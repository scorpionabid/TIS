<?php

namespace Database\Factories;

use App\Models\AcademicYear;
use App\Models\ClassModel;
use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ClassModel>
 */
class ClassModelFactory extends Factory
{
    protected $model = ClassModel::class;

    public function definition(): array
    {
        $gradeLevel = $this->faker->numberBetween(1, 11);
        $section = $this->faker->randomElement(['A', 'B', 'C', 'D']);

        return [
            'institution_id' => Institution::factory(),
            'academic_year_id' => AcademicYear::factory(),
            'name' => sprintf('%d%s', $gradeLevel, $section),
            'grade_level' => $gradeLevel,
            'section' => $section,
            'max_capacity' => 30,
            'current_enrollment' => $this->faker->numberBetween(20, 30),
            'status' => 'active',
            'class_teacher_id' => null,
            'classroom_location' => $this->faker->optional()->bothify('Otaq-##'),
            'schedule_preferences' => [],
            'metadata' => [],
        ];
    }
}
