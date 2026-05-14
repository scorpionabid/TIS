<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ReportTable>
 */
class ReportTableFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->optional()->sentence(),
            'notes' => null,
            'creator_id' => User::factory(),
            'status' => 'draft',
            'is_template' => false,
            'cloned_from_id' => null,
            'template_category' => null,
            'columns' => [
                ['key' => 'name', 'label' => 'Ad', 'type' => 'text', 'required' => true],
                ['key' => 'value', 'label' => 'Dəyər', 'type' => 'number'],
            ],
            'fixed_rows' => null,
            'max_rows' => 50,
            'target_institutions' => [],
            'deadline' => null,
        ];
    }

    /**
     * Draft status.
     */
    public function draft(): static
    {
        return $this->state(['status' => 'draft']);
    }

    /**
     * Published status.
     */
    public function published(): static
    {
        return $this->state([
            'status' => 'published',
            'published_at' => now(),
        ]);
    }

    /**
     * Archived status.
     */
    public function archived(): static
    {
        return $this->state([
            'status' => 'archived',
            'archived_at' => now(),
        ]);
    }

    /**
     * Template state.
     */
    public function asTemplate(?string $category = null): static
    {
        return $this->state([
            'is_template' => true,
            'template_category' => $category,
        ]);
    }

    /**
     * With specific target institutions.
     */
    public function forInstitution(int|array $institutionIds): static
    {
        return $this->state([
            'target_institutions' => (array) $institutionIds,
        ]);
    }

    /**
     * With a past deadline (expired).
     */
    public function expired(): static
    {
        return $this->state([
            'deadline' => now()->subDay(),
        ]);
    }
}
