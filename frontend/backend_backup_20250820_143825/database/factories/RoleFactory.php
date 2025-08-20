<?php

namespace Database\Factories;

use App\Models\Role;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class RoleFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Role::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        $name = $this->faker->unique()->word;
        
        return [
            'name' => $name,
            'display_name' => ucfirst($name) . ' Role',
            'description' => $this->faker->sentence,
            'guard_name' => 'api',
            'level' => $this->faker->numberBetween(1, 10),
            'department_access' => $this->faker->randomElements(
                ['it', 'hr', 'finance', 'operations', 'support'],
                $this->faker->numberBetween(1, 3)
            ),
            'max_institutions' => $this->faker->numberBetween(1, 10),
            'is_active' => $this->faker->boolean(90), // 90% chance of being active
        ];
    }

    /**
     * Indicate that the role is active.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function active()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => true,
            ];
        });
    }

    /**
     * Indicate that the role is inactive.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function inactive()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => false,
            ];
        });
    }

    /**
     * Set the department access for the role.
     *
     * @param  array  $departments
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function withDepartments(array $departments)
    {
        return $this->state(function (array $attributes) use ($departments) {
            return [
                'department_access' => $departments,
            ];
        });
    }
}
