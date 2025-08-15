<?php

namespace Database\Factories;

use App\Models\Permission;
use Illuminate\Database\Eloquent\Factories\Factory;

class PermissionFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Permission::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        $name = $this->faker->unique()->word . '-' . $this->faker->word;
        
        return [
            'name' => $name,
            'display_name' => ucfirst(str_replace('-', ' ', $name)),
            'description' => $this->faker->sentence,
            'guard_name' => 'api',
        ];
    }

    /**
     * Set the guard name for the permission.
     *
     * @param  string  $guard
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function withGuard(string $guard)
    {
        return $this->state(function (array $attributes) use ($guard) {
            return [
                'guard_name' => $guard,
            ];
        });
    }
}
