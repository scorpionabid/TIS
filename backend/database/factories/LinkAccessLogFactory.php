<?php

namespace Database\Factories;

use App\Models\LinkAccessLog;
use App\Models\LinkShare;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LinkAccessLog>
 */
class LinkAccessLogFactory extends Factory
{
    protected $model = LinkAccessLog::class;

    public function definition(): array
    {
        return [
            'link_share_id' => LinkShare::factory(),
            'user_id' => User::factory(),
            'ip_address' => $this->faker->ipv4(),
            'user_agent' => $this->faker->userAgent(),
            'referrer' => $this->faker->url(),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
