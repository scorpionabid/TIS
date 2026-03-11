<?php

namespace Database\Factories;

use App\Models\Grade;
use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Grade>
 */
class GradeFactory extends Factory
{
    protected $model = Grade::class;

    public function definition(): array
    {
        return [
            'institution_id' => Institution::factory(),
            'name'           => $this->faker->randomElement(['A', 'B', 'C', 'D', 'Fidan', 'Günəş', 'Lalə']),
            'class_level'    => 0,
            'student_count'  => $this->faker->numberBetween(10, 30),
            'is_active'      => true,
        ];
    }
}
