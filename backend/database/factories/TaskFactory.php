<?php

namespace Database\Factories;

use App\Models\Institution;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaskFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Task::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        $categories = array_keys(Task::CATEGORIES);
        $priorities = array_keys(Task::PRIORITIES);
        $statuses = array_keys(Task::STATUSES);
        $targetScopes = array_keys(Task::TARGET_SCOPES);

        return [
            'title' => $this->faker->sentence,
            'description' => $this->faker->paragraph,
            'category' => $this->faker->randomElement($categories),
            'priority' => $this->faker->randomElement($priorities),
            'status' => $this->faker->randomElement($statuses),
            'progress' => $this->faker->numberBetween(0, 100),
            'deadline' => $this->faker->dateTimeBetween('+1 week', '+1 month')->format('Y-m-d H:i:s'),
            'started_at' => $this->faker->optional(0.7)->dateTimeBetween('-1 month', 'now'),
            'completed_at' => $this->faker->optional(0.3)->dateTimeBetween('-1 month', 'now'),
            'created_by' => User::factory(),
            'assigned_to' => User::factory(),
            'assigned_institution_id' => Institution::factory(),
            'target_scope' => $this->faker->randomElement($targetScopes),
            'target_institutions' => $this->faker->optional(0.5, [])->randomElements(
                range(1, 10),
                $this->faker->numberBetween(1, 5)
            ),
            'notes' => $this->faker->optional(0.7)->paragraph,
            'attachments' => $this->faker->optional(0.3, [])->randomElements(
                [
                    ['name' => 'document.pdf', 'url' => 'documents/document.pdf'],
                    ['name' => 'image.jpg', 'url' => 'images/image.jpg'],
                    ['name' => 'spreadsheet.xlsx', 'url' => 'files/spreadsheet.xlsx'],
                ],
                $this->faker->numberBetween(1, 3)
            ),
            'requires_approval' => $this->faker->boolean(30),
            'approved_by' => function (array $attributes) {
                return $attributes['requires_approval'] ? User::factory() : null;
            },
            'approved_at' => function (array $attributes) {
                return $attributes['requires_approval'] ? $this->faker->dateTimeBetween('-1 month', 'now') : null;
            },
        ];
    }

    /**
     * Indicate that the task is pending.
     *
     * @return \Database\Factories\TaskFactory
     */
    public function pending()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'pending',
                'progress' => 0,
                'started_at' => null,
                'completed_at' => null,
            ];
        });
    }

    /**
     * Indicate that the task is in progress.
     *
     * @return \Database\Factories\TaskFactory
     */
    public function inProgress()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'in_progress',
                'progress' => $this->faker->numberBetween(1, 99),
                'started_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
                'completed_at' => null,
            ];
        });
    }

    /**
     * Indicate that the task is completed.
     *
     * @return \Database\Factories\TaskFactory
     */
    public function completed()
    {
        return $this->state(function (array $attributes) {
            $completedAt = $this->faker->dateTimeBetween('-1 month', 'now');
            return [
                'status' => 'completed',
                'progress' => 100,
                'started_at' => $this->faker->dateTimeBetween('-2 months', $completedAt),
                'completed_at' => $completedAt,
            ];
        });
    }

    /**
     * Indicate that the task is high priority.
     *
     * @return \Database\Factories\TaskFactory
     */
    public function highPriority()
    {
        return $this->state(function (array $attributes) {
            return [
                'priority' => 'yuksek',
            ];
        });
    }

    /**
     * Indicate that the task is urgent.
     *
     * @return \Database\Factories\TaskFactory
     */
    public function urgent()
    {
        return $this->state(function (array $attributes) {
            return [
                'priority' => 'tecili',
            ];
        });
    }

    /**
     * Indicate that the task is overdue.
     *
     * @return \Database\Factories\TaskFactory
     */
    public function overdue()
    {
        return $this->state(function (array $attributes) {
            return [
                'deadline' => $this->faker->dateTimeBetween('-1 month', '-1 day'),
                'status' => $this->faker->randomElement(['pending', 'in_progress']),
            ];
        });
    }

    /**
     * Indicate that the task requires approval.
     *
     * @return \Database\Factories\TaskFactory
     */
    public function requiresApproval()
    {
        return $this->state(function (array $attributes) {
            return [
                'requires_approval' => true,
                'approved_by' => User::factory(),
                'approved_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
            ];
        });
    }
}
