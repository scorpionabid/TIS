<?php

namespace Database\Factories;

use App\Models\Survey;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Survey>
 */
class SurveyFactory extends Factory
{
    protected $model = Survey::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => $this->faker->sentence(4),
            'description' => $this->faker->paragraph(),
            'creator_id' => User::factory(),
            'status' => $this->faker->randomElement(['draft', 'published', 'closed', 'archived']),
            'survey_type' => $this->faker->randomElement(['form', 'poll', 'assessment', 'feedback']),
            'is_anonymous' => $this->faker->boolean(),
            'allow_multiple_responses' => $this->faker->boolean(30), // 30% chance of true
            'structure' => [
                'sections' => [
                    [
                        'id' => $this->faker->uuid(),
                        'title' => $this->faker->sentence(3),
                        'questions' => [
                            [
                                'id' => $this->faker->uuid(),
                                'question' => $this->faker->sentence(6) . '?',
                                'type' => $this->faker->randomElement(['text', 'textarea', 'select', 'radio', 'checkbox', 'number', 'email']),
                                'required' => $this->faker->boolean(70), // 70% chance of required
                                'options' => $this->faker->words(4)
                            ]
                        ]
                    ]
                ]
            ],
            'target_institutions' => [$this->faker->numberBetween(1, 10)],
            'target_departments' => [],
            'start_date' => $this->faker->dateTimeBetween('-1 week', '+1 week'),
            'end_date' => $this->faker->dateTimeBetween('+1 week', '+2 months'),
            'published_at' => null,
            'archived_at' => null,
            'response_count' => 0,
            'completion_threshold' => $this->faker->numberBetween(50, 100),
            'metadata' => [],
        ];
    }

    /**
     * Create a published survey
     */
    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'published',
            'published_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
        ]);
    }

    /**
     * Create a draft survey
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'draft',
            'published_at' => null,
        ]);
    }

    /**
     * Create a closed survey
     */
    public function closed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'closed',
            'published_at' => $this->faker->dateTimeBetween('-2 months', '-1 month'),
            'end_date' => $this->faker->dateTimeBetween('-1 month', 'now'),
        ]);
    }

    /**
     * Create an anonymous survey
     */
    public function anonymous(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_anonymous' => true,
        ]);
    }

    /**
     * Create a survey that allows multiple responses
     */
    public function multipleResponses(): static
    {
        return $this->state(fn (array $attributes) => [
            'allow_multiple_responses' => true,
        ]);
    }
}