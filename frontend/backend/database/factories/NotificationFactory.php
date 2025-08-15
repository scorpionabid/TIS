<?php

namespace Database\Factories;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class NotificationFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Notification::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        $types = array_keys(Notification::TYPES);
        $priorities = array_keys(Notification::PRIORITIES);
        $channels = array_keys(Notification::CHANNELS);
        
        return [
            'title' => $this->faker->sentence,
            'message' => $this->faker->paragraph,
            'type' => $this->faker->randomElement($types),
            'priority' => $this->faker->randomElement($priorities),
            'channel' => $this->faker->randomElement($channels),
            'user_id' => User::factory(),
            'target_users' => $this->faker->optional(0.7, [])->randomElements(
                User::factory(3)->create()->pluck('id')->toArray(),
                $this->faker->numberBetween(1, 3)
            ),
            'is_sent' => $this->faker->boolean(80), // 80% chance of being sent
            'is_read' => $this->faker->boolean(30), // 30% chance of being read
            'sent_at' => $this->faker->optional(0.8)->dateTimeBetween('-1 month', 'now'),
            'read_at' => function (array $attributes) {
                return $attributes['is_read'] ? $this->faker->dateTimeBetween($attributes['sent_at'] ?? '-1 month', 'now') : null;
            },
            'scheduled_at' => $this->faker->optional(0.3)->dateTimeBetween('+1 day', '+1 month'),
            'email_status' => $this->faker->optional(0.7)->randomElement(['pending', 'sent', 'failed']),
            'sms_status' => $this->faker->optional(0.3)->randomElement(['pending', 'sent', 'failed']),
            'delivery_error' => $this->faker->optional(0.2)->sentence,
            'language' => $this->faker->randomElement(['az', 'en', 'ru']),
            'metadata' => $this->faker->optional(0.5, [])->randomElements([
                'key1' => $this->faker->word,
                'key2' => $this->faker->sentence,
                'key3' => $this->faker->numberBetween(1, 100),
            ]),
            'action_data' => $this->faker->optional(0.6, [])->randomElements([
                'action' => $this->faker->randomElement(['view', 'edit', 'delete', 'approve']),
                'url' => $this->faker->url,
                'button_text' => $this->faker->words(2, true),
            ]),
        ];
    }

    /**
     * Indicate that the notification is sent.
     *
     * @return \Database\Factories\NotificationFactory
     */
    public function sent()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_sent' => true,
                'sent_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
            ];
        });
    }

    /**
     * Indicate that the notification is read.
     *
     * @return \Database\Factories\NotificationFactory
     */
    public function read()
    {
        return $this->state(function (array $attributes) {
            $sentAt = $attributes['sent_at'] ?? $this->faker->dateTimeBetween('-1 month', 'now');
            return [
                'is_sent' => true,
                'is_read' => true,
                'sent_at' => $sentAt,
                'read_at' => $this->faker->dateTimeBetween($sentAt, 'now'),
            ];
        });
    }

    /**
     * Indicate that the notification is scheduled.
     *
     * @param  \DateTime|string  $date
     * @return \Database\Factories\NotificationFactory
     */
    public function scheduled($date = null)
    {
        return $this->state(function (array $attributes) use ($date) {
            return [
                'is_sent' => false,
                'sent_at' => null,
                'scheduled_at' => $date ?? $this->faker->dateTimeBetween('+1 day', '+1 month'),
            ];
        });
    }

    /**
     * Indicate that the notification is high priority.
     *
     * @return \Database\Factories\NotificationFactory
     */
    public function highPriority()
    {
        return $this->state(function (array $attributes) {
            return [
                'priority' => 'high',
            ];
        });
    }

    /**
     * Indicate that the notification is critical priority.
     *
     * @return \Database\Factories\NotificationFactory
     */
    public function critical()
    {
        return $this->state(function (array $attributes) {
            return [
                'priority' => 'critical',
            ];
        });
    }

    /**
     * Indicate the channel of the notification.
     *
     * @param  string  $channel
     * @return \Database\Factories\NotificationFactory
     */
    public function channel($channel)
    {
        return $this->state(function (array $attributes) use ($channel) {
            return [
                'channel' => $channel,
            ];
        });
    }

    /**
     * Indicate the type of the notification.
     *
     * @param  string  $type
     * @return \Database\Factories\NotificationFactory
     */
    public function ofType($type)
    {
        return $this->state(function (array $attributes) use ($type) {
            return [
                'type' => $type,
            ];
        });
    }
}
