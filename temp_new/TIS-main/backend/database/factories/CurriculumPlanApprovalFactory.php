<?php

namespace Database\Factories;

use App\Models\AcademicYear;
use App\Models\CurriculumPlanApproval;
use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CurriculumPlanApproval>
 */
class CurriculumPlanApprovalFactory extends Factory
{
    protected $model = CurriculumPlanApproval::class;

    public function definition(): array
    {
        return [
            'institution_id' => Institution::factory()->school(),
            'academic_year_id' => AcademicYear::factory()->active(),
            'status' => 'draft',
            'return_comment' => null,
            'submitted_at' => null,
            'approved_at' => null,
            'returned_at' => null,
            'updated_by_id' => null,
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

    public function draft(): static
    {
        return $this->state(fn (array $attrs) => [
            'status' => 'draft',
            'submitted_at' => null,
            'approved_at' => null,
            'returned_at' => null,
            'return_comment' => null,
        ]);
    }

    public function submitted(): static
    {
        return $this->state(fn (array $attrs) => [
            'status' => 'submitted',
            'submitted_at' => now(),
            'approved_at' => null,
            'returned_at' => null,
            'return_comment' => null,
        ]);
    }

    public function approved(): static
    {
        return $this->state(fn (array $attrs) => [
            'status' => 'approved',
            'submitted_at' => now()->subHour(),
            'approved_at' => now(),
            'returned_at' => null,
            'return_comment' => null,
        ]);
    }

    public function returned(): static
    {
        return $this->state(fn (array $attrs) => [
            'status' => 'returned',
            'submitted_at' => now()->subHour(),
            'approved_at' => null,
            'returned_at' => now(),
            'return_comment' => 'Planı düzəldin.',
        ]);
    }
}
