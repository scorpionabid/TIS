<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class NotificationTemplateFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = \App\Models\NotificationTemplate::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        return [
            'key' => $this->faker->unique()->slug(2),
            'name' => $this->faker->sentence(3),
            'type' => $this->faker->randomElement([
                'task_assigned', 'task_updated', 'task_deadline',
                'survey_published', 'survey_deadline', 'survey_approved',
                'survey_rejected', 'system_alert', 'maintenance', 'security_alert'
            ]),
            'subject_template' => '{{subject}}',
            'title_template' => '{{title}}',
            'message_template' => 'Hello {{name}}, {{message}}',
            'email_template' => '<p>Hello {{name}},</p><p>{{message}}</p>',
            'sms_template' => 'Hello {{name}}, {{message}}',
            'channels' => ['database', 'email'],
            'priority' => $this->faker->randomElement(['low', 'normal', 'high', 'critical']),
            'is_active' => true,
            'available_variables' => [
                'name' => 'User\'s full name',
                'message' => 'The main message content',
                'subject' => 'Email subject',
                'title' => 'Notification title'
            ],
        ];
    }

    /**
     * Indicate that the template is for a specific type.
     *
     * @param  string  $type
     * @return \Database\Factories\NotificationTemplateFactory
     */
    public function type(string $type)
    {
        return $this->state(function (array $attributes) use ($type) {
            return [
                'type' => $type,
            ];
        });
    }

    /**
     * Indicate that the template is inactive.
     *
     * @return \Database\Factories\NotificationTemplateFactory
     */
    public function inactive()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => false,
            ];
        });
    }
}
