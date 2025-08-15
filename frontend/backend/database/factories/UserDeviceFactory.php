<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserDevice;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class UserDeviceFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = UserDevice::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        $deviceTypes = ['mobile', 'tablet', 'desktop', 'laptop', 'unknown'];
        $browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
        $os = ['Windows', 'macOS', 'Linux', 'iOS', 'Android'];
        $resolutions = ['1920x1080', '1366x768', '1536x864', '1440x900'];
        $languages = ['en-US', 'az-AZ', 'ru-RU', 'tr-TR'];
        $cities = ['Baku', 'Ganja', 'Sumqayit', 'Lankaran', 'Shaki'];
        
        return [
            'user_id' => User::factory(),
            'device_id' => 'device_' . Str::random(16),
            'device_name' => $this->faker->randomElement($deviceTypes) . ' ' . $this->faker->word,
            'device_type' => $this->faker->randomElement($deviceTypes),
            'browser_name' => $this->faker->randomElement($browsers),
            'browser_version' => $this->faker->randomFloat(1, 50, 100),
            'operating_system' => $this->faker->randomElement($os),
            'platform' => $this->faker->randomElement($os),
            'user_agent' => $this->faker->userAgent,
            'screen_resolution' => $this->faker->randomElement($resolutions),
            'timezone' => $this->faker->timezone,
            'language' => $this->faker->randomElement($languages),
            'device_fingerprint' => [
                'canvas' => Str::random(32),
                'webgl' => [
                    'vendor' => $this->faker->company,
                    'renderer' => $this->faker->word . ' Graphics',
                ],
                'plugins' => $this->faker->words(3, false),
                'timezone' => $this->faker->timezone,
                'touchSupport' => $this->faker->boolean,
            ],
            'last_ip_address' => $this->faker->ipv4,
            'registration_ip' => $this->faker->ipv4,
            'last_location_country' => 'Azerbaijan',
            'last_location_city' => $this->faker->randomElement($cities),
            'is_trusted' => $this->faker->boolean(70), // 70% chance of being trusted
            'is_active' => $this->faker->boolean(90), // 90% chance of being active
            'trusted_at' => $this->faker->optional(0.7)->dateTimeBetween('-1 year', 'now'), // 70% chance of having a trusted_at date
            'last_seen_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
            'registered_at' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'requires_verification' => $this->faker->boolean(20), // 20% chance of requiring verification
            'failed_verification_attempts' => $this->faker->numberBetween(0, 5),
            'verification_blocked_until' => $this->faker->optional(0.1)->dateTimeBetween('now', '+1 hour'), // 10% chance of being blocked
        ];
    }

    /**
     * Indicate that the device is trusted.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function trusted()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_trusted' => true,
                'trusted_at' => now(),
            ];
        });
    }

    /**
     * Indicate that the device is not trusted.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function untrusted()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_trusted' => false,
                'trusted_at' => null,
            ];
        });
    }

    /**
     * Indicate that the device is active.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function active()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => true,
                'last_seen_at' => now(),
            ];
        });
    }

    /**
     * Indicate that the device is inactive.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function inactive()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => false,
                'last_seen_at' => now()->subMonths(3),
            ];
        });
    }

    /**
     * Indicate that the device requires verification.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function requiresVerification()
    {
        return $this->state(function (array $attributes) {
            return [
                'requires_verification' => true,
                'failed_verification_attempts' => $this->faker->numberBetween(1, 5),
            ];
        });
    }

    /**
     * Indicate that the device is blocked from verification.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function blocked()
    {
        return $this->state(function (array $attributes) {
            return [
                'requires_verification' => true,
                'failed_verification_attempts' => 5,
                'verification_blocked_until' => now()->addHours(1),
            ];
        });
    }
}
