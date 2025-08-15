<?php

namespace Database\Factories;

use App\Models\DocumentDownload;
use App\Models\Document;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DocumentDownload>
 */
class DocumentDownloadFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = DocumentDownload::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'document_id' => Document::factory(),
            'user_id' => User::factory(),
            'downloaded_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
            'ip_address' => $this->faker->ipv4(),
            'user_agent' => $this->faker->userAgent(),
        ];
    }

    /**
     * Recent downloads (within last week).
     */
    public function recent(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'downloaded_at' => $this->faker->dateTimeBetween('-1 week', 'now'),
            ];
        });
    }

    /**
     * Downloads from today.
     */
    public function today(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'downloaded_at' => $this->faker->dateTimeBetween('today', 'now'),
            ];
        });
    }
}