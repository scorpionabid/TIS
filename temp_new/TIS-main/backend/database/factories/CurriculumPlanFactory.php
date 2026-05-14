<?php

namespace Database\Factories;

use App\Models\AcademicYear;
use App\Models\CurriculumPlan;
use App\Models\Institution;
use App\Models\Subject;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CurriculumPlan>
 */
class CurriculumPlanFactory extends Factory
{
    protected $model = CurriculumPlan::class;

    public function definition(): array
    {
        return [
            'institution_id' => Institution::factory()->school(),
            'academic_year_id' => AcademicYear::factory()->active(),
            'class_level' => $this->faker->numberBetween(1, 11),
            'subject_id' => Subject::factory(),
            'education_type' => 'umumi',
            'hours' => $this->faker->randomFloat(1, 1, 8),
            'is_extra' => false,
        ];
    }

    public function forInstitution(Institution $institution): static
    {
        return $this->state(fn (array $attrs) => ['institution_id' => $institution->id]);
    }

    public function forYear(AcademicYear $year): static
    {
        return $this->state(fn (array $attrs) => ['academic_year_id' => $year->id]);
    }

    public function forSubject(Subject $subject): static
    {
        return $this->state(fn (array $attrs) => ['subject_id' => $subject->id]);
    }

    public function umumi(): static
    {
        return $this->state(fn (array $attrs) => ['education_type' => 'umumi']);
    }

    public function ferdi(): static
    {
        return $this->state(fn (array $attrs) => ['education_type' => 'ferdi']);
    }

    public function evde(): static
    {
        return $this->state(fn (array $attrs) => ['education_type' => 'evde']);
    }

    public function xususi(): static
    {
        return $this->state(fn (array $attrs) => ['education_type' => 'xususi']);
    }

    public function extra(): static
    {
        return $this->state(fn (array $attrs) => ['is_extra' => true]);
    }
}
