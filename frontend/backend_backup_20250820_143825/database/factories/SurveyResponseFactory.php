<?php

namespace Database\Factories;

use App\Models\SurveyResponse;
use App\Models\Survey;
use App\Models\User;
use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SurveyResponse>
 */
class SurveyResponseFactory extends Factory
{
    protected $model = SurveyResponse::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'survey_id' => Survey::factory(),
            'user_id' => User::factory(),
            'institution_id' => Institution::factory(),
            'status' => $this->faker->randomElement(['draft', 'submitted', 'approved', 'rejected']),
            'response_data' => [
                'responses' => [
                    $this->faker->uuid() => $this->faker->text(100),
                    $this->faker->uuid() => $this->faker->randomElement(['Option 1', 'Option 2', 'Option 3']),
                    $this->faker->uuid() => $this->faker->numberBetween(1, 10),
                ]
            ],
            'is_complete' => $this->faker->boolean(80), // 80% chance of being complete
            'progress_percentage' => $this->faker->numberBetween(50, 100),
            'started_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
            'completed_at' => null,
            'submitted_at' => null,
            'approved_at' => null,
            'rejected_at' => null,
            'submission_metadata' => [
                'ip_address' => $this->faker->ipv4(),
                'user_agent' => $this->faker->userAgent(),
                'submitted_from' => $this->faker->randomElement(['web', 'mobile', 'tablet'])
            ],
        ];
    }

    /**
     * Create a completed survey response
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'submitted',
            'is_complete' => true,
            'progress_percentage' => 100,
            'completed_at' => $this->faker->dateTimeBetween('-1 week', 'now'),
            'submitted_at' => $this->faker->dateTimeBetween('-1 week', 'now'),
        ]);
    }

    /**
     * Create a draft survey response
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'draft',
            'is_complete' => false,
            'progress_percentage' => $this->faker->numberBetween(10, 80),
            'completed_at' => null,
            'submitted_at' => null,
        ]);
    }

    /**
     * Create an approved survey response
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
            'is_complete' => true,
            'progress_percentage' => 100,
            'completed_at' => $this->faker->dateTimeBetween('-2 weeks', '-1 week'),
            'submitted_at' => $this->faker->dateTimeBetween('-2 weeks', '-1 week'),
            'approved_at' => $this->faker->dateTimeBetween('-1 week', 'now'),
        ]);
    }

    /**
     * Create a rejected survey response
     */
    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'rejected',
            'is_complete' => true,
            'progress_percentage' => 100,
            'completed_at' => $this->faker->dateTimeBetween('-2 weeks', '-1 week'),
            'submitted_at' => $this->faker->dateTimeBetween('-2 weeks', '-1 week'),
            'rejected_at' => $this->faker->dateTimeBetween('-1 week', 'now'),
        ]);
    }
}