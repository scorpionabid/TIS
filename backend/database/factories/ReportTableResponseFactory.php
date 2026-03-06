<?php

namespace Database\Factories;

use App\Models\Institution;
use App\Models\ReportTable;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ReportTableResponse>
 */
class ReportTableResponseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'report_table_id' => ReportTable::factory()->published(),
            'institution_id'  => Institution::factory()->school(),
            'respondent_id'   => User::factory(),
            'rows'            => [
                ['name' => $this->faker->name(), 'value' => $this->faker->numberBetween(1, 100)],
            ],
            'status'          => 'draft',
            'submitted_at'    => null,
            'row_statuses'    => null,
        ];
    }

    /**
     * Draft status (default).
     */
    public function draft(): static
    {
        return $this->state([
            'status'       => 'draft',
            'submitted_at' => null,
        ]);
    }

    /**
     * Submitted status.
     */
    public function submitted(): static
    {
        return $this->state([
            'status'       => 'submitted',
            'submitted_at' => now(),
            'row_statuses' => [
                ['status' => 'submitted', 'submitted_at' => now()->toISOString()],
            ],
        ]);
    }

    /**
     * With a submitted row at given index.
     */
    public function withSubmittedRow(int $rowIndex = 0): static
    {
        return $this->state(function (array $attrs) use ($rowIndex) {
            $statuses              = $attrs['row_statuses'] ?? [];
            $statuses[$rowIndex]   = [
                'status'       => 'submitted',
                'submitted_at' => now()->toISOString(),
            ];

            return ['row_statuses' => $statuses];
        });
    }

    /**
     * With rows that have specific data.
     */
    public function withRows(array $rows): static
    {
        return $this->state(['rows' => $rows]);
    }
}
