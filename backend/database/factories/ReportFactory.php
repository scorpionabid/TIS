<?php

namespace Database\Factories;

use App\Models\Institution;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Report>
 */
class ReportFactory extends Factory
{
    protected $model = Report::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $scheduleType = $this->faker->randomElement(['manual', 'daily', 'weekly', 'monthly']);

        return [
            'institution_id' => Institution::factory(),
            'name' => $this->faker->sentence(4),
            'description' => $this->faker->paragraph(),
            'type' => $this->faker->randomElement([
                'survey_analysis',
                'institution_performance',
                'response_summary',
            ]),
            'status' => $this->faker->randomElement(['draft', 'generating', 'completed', 'failed']),
            'config' => [
                'filters' => [
                    'date_range' => [
                        'start' => now()->subDays(7)->format('Y-m-d'),
                        'end' => now()->format('Y-m-d'),
                    ],
                ],
            ],
            'parameters' => [
                'start_date' => now()->subDays(7)->format('Y-m-d'),
                'end_date' => now()->format('Y-m-d'),
            ],
            'schedule_type' => $scheduleType,
            'schedule_config' => $scheduleType === 'manual'
                ? null
                : ['time' => '08:00'],
            'is_active' => true,
            'created_by' => User::factory(),
            'updated_by' => null,
            'result_data' => null,
            'result_files' => [],
            'file_path' => null,
            'file_size' => null,
            'generation_time' => null,
            'data_points_count' => null,
            'generation_started_at' => null,
            'generated_at' => null,
            'generation_completed_at' => null,
            'generation_failed_at' => null,
        ];
    }

    /**
     * Indicate that the report has been generated successfully.
     */
    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => 'completed',
            'result_data' => ['rows' => 10],
            'generation_time' => 2450,
            'data_points_count' => 128,
            'generation_started_at' => now()->subMinutes(5),
            'generated_at' => now(),
            'generation_completed_at' => now(),
        ]);
    }

    /**
     * Indicate that the report generation failed.
     */
    public function failed(): static
    {
        return $this->state(fn () => [
            'status' => 'failed',
            'generation_started_at' => now()->subMinutes(5),
            'generation_failed_at' => now(),
        ]);
    }
}
