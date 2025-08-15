<?php

namespace Database\Factories;

use App\Models\DocumentShare;
use App\Models\Document;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DocumentShare>
 */
class DocumentShareFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = DocumentShare::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'document_id' => Document::factory(),
            'shared_by' => User::factory(),
            'shared_with_users' => json_encode([]),
            'shared_with_roles' => json_encode([]),
            'shared_with_institutions' => json_encode([]),
            'share_type' => $this->faker->randomElement(['view', 'edit']),
            'message' => $this->faker->optional()->sentence(),
            'expires_at' => $this->faker->optional()->dateTimeBetween('+1 day', '+1 month'),
            'is_active' => true,
            'allow_download' => $this->faker->boolean(80),
            'allow_reshare' => $this->faker->boolean(30),
            'public_token' => null,
            'password_protected' => false,
            'access_password' => null,
            'max_downloads' => null,
            'access_count' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    /**
     * Indicate that this is a public link share.
     */
    public function publicLink(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'share_type' => 'public_link',
                'public_token' => Str::random(32),
                'shared_with_users' => json_encode([]),
                'shared_with_roles' => json_encode([]),
                'shared_with_institutions' => json_encode([]),
                'expires_at' => $this->faker->dateTimeBetween('+1 day', '+1 month'),
                'max_downloads' => $this->faker->optional()->numberBetween(5, 100),
            ];
        });
    }

    /**
     * Indicate that this is a password-protected share.
     */
    public function passwordProtected(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'password_protected' => true,
                'access_password' => bcrypt('password123'),
            ];
        });
    }

    /**
     * Indicate that this share is inactive.
     */
    public function inactive(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => false,
            ];
        });
    }

    /**
     * Indicate that this share has been accessed.
     */
    public function accessed(int $count = null): Factory
    {
        $accessCount = $count ?? $this->faker->numberBetween(1, 50);
        
        return $this->state(function (array $attributes) use ($accessCount) {
            return [
                'access_count' => $accessCount,
            ];
        });
    }

    /**
     * Indicate that this share is expired.
     */
    public function expired(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'expires_at' => $this->faker->dateTimeBetween('-1 month', '-1 day'),
            ];
        });
    }

    /**
     * Indicate that this share allows download.
     */
    public function downloadable(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'allow_download' => true,
            ];
        });
    }

    /**
     * Indicate that this share allows resharing.
     */
    public function resharable(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'allow_reshare' => true,
            ];
        });
    }

    /**
     * Create a share with specific users.
     */
    public function withUsers(array $userIds): Factory
    {
        return $this->state(function (array $attributes) use ($userIds) {
            return [
                'shared_with_users' => json_encode($userIds),
                'share_type' => 'view',
            ];
        });
    }

    /**
     * Create a share with specific roles.
     */
    public function withRoles(array $roles): Factory
    {
        return $this->state(function (array $attributes) use ($roles) {
            return [
                'shared_with_roles' => json_encode($roles),
                'share_type' => 'view',
            ];
        });
    }

    /**
     * Create a share with specific institutions.
     */
    public function withInstitutions(array $institutionIds): Factory
    {
        return $this->state(function (array $attributes) use ($institutionIds) {
            return [
                'shared_with_institutions' => json_encode($institutionIds),
                'share_type' => 'view',
            ];
        });
    }
}