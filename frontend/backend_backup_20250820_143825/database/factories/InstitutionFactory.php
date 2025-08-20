<?php

namespace Database\Factories;

use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Institution>
 */
class InstitutionFactory extends Factory
{
    protected $model = Institution::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->company() . ' School',
            'type' => $this->faker->randomElement(['school', 'sektor', 'region', 'ministry']),
            'level' => $this->faker->numberBetween(1, 4),
            'institution_code' => strtoupper($this->faker->lexify('???')),
            'region_code' => $this->faker->regexify('[A-Z]{2}[0-9]{2}'),
            'short_name' => $this->faker->lexify('???'),
            'established_date' => $this->faker->date(),
            'parent_id' => null,
            'contact_info' => [
                'phone' => $this->faker->phoneNumber(),
                'email' => $this->faker->email(),
                'address' => $this->faker->address(),
            ],
            'location' => [
                'latitude' => $this->faker->latitude(),
                'longitude' => $this->faker->longitude(),
            ],
            'metadata' => [],
            'is_active' => true,
        ];
    }

    /**
     * Create a ministry level institution
     */
    public function ministry(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Təhsil Nazirliyi',
            'type' => 'ministry',
            'level' => 1,
            'institution_code' => 'MIN',
            'parent_id' => null,
        ]);
    }

    /**
     * Create a regional level institution
     */
    public function regional(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $this->faker->city() . ' Regional Office',
            'type' => 'region', 
            'level' => 2,
            'institution_code' => 'REG' . $this->faker->numberBetween(1, 10),
        ]);
    }

    /**
     * Create a sector level institution
     */
    public function sector(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $this->faker->city() . ' Sector',
            'type' => 'sektor',
            'level' => 3,
            'institution_code' => 'SEC' . $this->faker->numberBetween(1, 20),
        ]);
    }

    /**
     * Create a school level institution
     */
    public function school(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $this->faker->numberBetween(1, 100) . ' nömrəli orta məktəb',
            'type' => 'school',
            'level' => 4,
            'institution_code' => 'SCH' . $this->faker->numberBetween(1, 999),
        ]);
    }

    /**
     * Create an inactive institution
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}