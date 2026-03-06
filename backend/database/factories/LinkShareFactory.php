<?php

namespace Database\Factories;

use App\Models\Institution;
use App\Models\LinkShare;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LinkShare>
 */
class LinkShareFactory extends Factory
{
    protected $model = LinkShare::class;

    public function definition(): array
    {
        return [
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->sentence(),
            'url' => $this->faker->url(),
            'link_type' => 'external',
            'share_scope' => 'institutional',
            'shared_by' => User::factory(),
            'institution_id' => Institution::factory(),
            'target_institutions' => [],
            'target_roles' => [],
            'target_departments' => [],
            'target_users' => [],
            'status' => 'active',
            'is_featured' => false,
        ];
    }
}
