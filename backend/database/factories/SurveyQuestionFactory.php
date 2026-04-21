<?php

namespace Database\Factories;

use App\Models\Survey;
use App\Models\SurveyQuestion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SurveyQuestion>
 */
class SurveyQuestionFactory extends Factory
{
    protected $model = SurveyQuestion::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'survey_id' => Survey::factory(),
            'title' => $this->faker->sentence(6) . '?',
            'description' => $this->faker->paragraph(),
            'type' => $this->faker->randomElement(['text', 'number', 'date', 'single_choice', 'multiple_choice']),
            'order_index' => $this->faker->numberBetween(1, 10),
            'is_required' => $this->faker->boolean(70),
            'is_active' => true,
            'options' => [
                ['id' => 'opt_1', 'label' => 'Bəli'],
                ['id' => 'opt_2', 'label' => 'Xeyr'],
                ['id' => 'opt_3', 'label' => 'Bilmirəm'],
            ],
            'max_file_size' => 10240,
        ];
    }
}
