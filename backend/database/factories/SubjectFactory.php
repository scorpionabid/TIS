<?php

namespace Database\Factories;

use App\Models\Subject;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Subject>
 */
class SubjectFactory extends Factory
{
    protected $model = Subject::class;

    public function definition(): array
    {
        $name = 'Riyaziyyat';

        return [
            'name' => $name,
            'short_name' => substr($name, 0, 10),
            'code' => strtoupper($this->faker->unique()->bothify('SUB-###')),
            'category' => $this->faker->randomElement(['core', 'elective']),
            'class_level_start' => 1,
            'class_level_end' => 11,
            'description' => $this->faker->optional()->sentence(),
            'is_active' => true,
            'grade_levels' => range(1, 11),
            'weekly_hours' => $this->faker->numberBetween(1, 6),
            'metadata' => [],
        ];
    }
}
