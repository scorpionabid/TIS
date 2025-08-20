<?php

namespace Database\Factories;

use App\Models\TeachingLoad;
use App\Models\User;
use App\Models\Classes;
use App\Models\Subject;
use App\Models\AcademicYear;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TeachingLoad>
 */
class TeachingLoadFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = TeachingLoad::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $weeklyHours = $this->faker->numberBetween(2, 6);
        
        return [
            'teacher_id' => User::factory(),
            'class_id' => Classes::factory(),
            'subject_id' => Subject::factory(),
            'academic_year_id' => AcademicYear::factory(),
            'weekly_hours' => $weeklyHours,
            'total_hours' => $weeklyHours * 36, // Assuming 36 weeks in academic year
            'semester' => $this->faker->randomElement([1, 2, 'full']),
            'status' => $this->faker->randomElement(['pending', 'active', 'completed', 'cancelled']),
            'start_date' => $this->faker->dateTimeBetween('-1 month', 'now'),
            'end_date' => $this->faker->dateTimeBetween('+1 month', '+6 months'),
            'notes' => $this->faker->optional()->sentence(),
            'load_metadata' => json_encode([
                'difficulty_level' => $this->faker->randomElement(['basic', 'intermediate', 'advanced']),
                'teaching_method' => $this->faker->randomElement(['traditional', 'project_based', 'interactive']),
                'assessment_frequency' => $this->faker->randomElement(['weekly', 'biweekly', 'monthly']),
                'required_resources' => $this->faker->randomElements(['projector', 'computer', 'lab_equipment', 'textbooks'], $this->faker->numberBetween(1, 3))
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    /**
     * Indicate that the teaching load is active.
     */
    public function active(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'active',
                'start_date' => now()->subDays(30),
                'end_date' => now()->addMonths(6),
            ];
        });
    }

    /**
     * Indicate that the teaching load is pending.
     */
    public function pending(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'pending',
                'start_date' => now()->addDays(7),
                'end_date' => now()->addMonths(6),
            ];
        });
    }

    /**
     * Indicate that the teaching load is completed.
     */
    public function completed(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'completed',
                'start_date' => now()->subMonths(6),
                'end_date' => now()->subDays(30),
            ];
        });
    }

    /**
     * Indicate that this is for first semester.
     */
    public function firstSemester(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'semester' => 1,
                'start_date' => now()->startOfYear()->addMonths(8), // September
                'end_date' => now()->startOfYear()->addMonths(11)->endOfMonth(), // December
            ];
        });
    }

    /**
     * Indicate that this is for second semester.
     */
    public function secondSemester(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'semester' => 2,
                'start_date' => now()->startOfYear()->addMonths(12)->addDays(15), // January 15
                'end_date' => now()->startOfYear()->addMonths(17)->endOfMonth(), // June
            ];
        });
    }

    /**
     * Indicate that this is for full year.
     */
    public function fullYear(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'semester' => 'full',
                'start_date' => now()->startOfYear()->addMonths(8), // September
                'end_date' => now()->startOfYear()->addMonths(17)->endOfMonth(), // June next year
            ];
        });
    }

    /**
     * Indicate a specific weekly hours amount.
     */
    public function withWeeklyHours(int $hours): Factory
    {
        return $this->state(function (array $attributes) use ($hours) {
            return [
                'weekly_hours' => $hours,
                'total_hours' => $hours * 36,
            ];
        });
    }

    /**
     * Indicate high intensity teaching load.
     */
    public function highIntensity(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'weekly_hours' => $this->faker->numberBetween(5, 8),
                'total_hours' => function (array $attributes) {
                    return $attributes['weekly_hours'] * 36;
                },
                'load_metadata' => json_encode([
                    'difficulty_level' => 'advanced',
                    'teaching_method' => 'interactive',
                    'assessment_frequency' => 'weekly',
                    'required_resources' => ['projector', 'computer', 'lab_equipment', 'textbooks'],
                    'intensity' => 'high',
                    'preparation_time' => 'extensive'
                ]),
            ];
        });
    }

    /**
     * Indicate low intensity teaching load.
     */
    public function lowIntensity(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'weekly_hours' => $this->faker->numberBetween(1, 3),
                'total_hours' => function (array $attributes) {
                    return $attributes['weekly_hours'] * 36;
                },
                'load_metadata' => json_encode([
                    'difficulty_level' => 'basic',
                    'teaching_method' => 'traditional',
                    'assessment_frequency' => 'monthly',
                    'required_resources' => ['textbooks'],
                    'intensity' => 'low',
                    'preparation_time' => 'minimal'
                ]),
            ];
        });
    }
}