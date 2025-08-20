<?php

namespace Database\Factories;

use App\Models\AcademicYear;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AcademicYear>
 */
class AcademicYearFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = AcademicYear::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startYear = $this->faker->numberBetween(2020, 2025);
        $endYear = $startYear + 1;
        
        $startDate = \Carbon\Carbon::create($startYear, 9, 1); // September 1st
        $endDate = \Carbon\Carbon::create($endYear, 6, 30); // June 30th

        return [
            'name' => "{$startYear}-{$endYear}",
            'start_date' => $startDate,
            'end_date' => $endDate,
            'is_active' => $this->faker->boolean(70),
            'semester_1_start' => $startDate,
            'semester_1_end' => \Carbon\Carbon::create($startYear, 12, 31),
            'semester_2_start' => \Carbon\Carbon::create($endYear, 1, 15),
            'semester_2_end' => $endDate,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    /**
     * Indicate that the academic year is active.
     */
    public function active(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => true,
                'start_date' => now()->startOfYear(),
                'end_date' => now()->endOfYear(),
            ];
        });
    }

    /**
     * Indicate that the academic year is current (2024-2025).
     */
    public function current(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'name' => '2024-2025',
                'start_date' => \Carbon\Carbon::create(2024, 9, 1),
                'end_date' => \Carbon\Carbon::create(2025, 6, 30),
                'is_active' => true,
                'semester_1_start' => \Carbon\Carbon::create(2024, 9, 1),
                'semester_1_end' => \Carbon\Carbon::create(2024, 12, 31),
                'semester_2_start' => \Carbon\Carbon::create(2025, 1, 15),
                'semester_2_end' => \Carbon\Carbon::create(2025, 6, 30),
            ];
        });
    }

    /**
     * Indicate that the academic year is from previous year.
     */
    public function previous(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'name' => '2023-2024',
                'start_date' => \Carbon\Carbon::create(2023, 9, 1),
                'end_date' => \Carbon\Carbon::create(2024, 6, 30),
                'is_active' => false,
                'semester_1_start' => \Carbon\Carbon::create(2023, 9, 1),
                'semester_1_end' => \Carbon\Carbon::create(2023, 12, 31),
                'semester_2_start' => \Carbon\Carbon::create(2024, 1, 15),
                'semester_2_end' => \Carbon\Carbon::create(2024, 6, 30),
            ];
        });
    }
}