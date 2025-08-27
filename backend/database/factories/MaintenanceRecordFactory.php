<?php

namespace Database\Factories;

use App\Models\InventoryItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MaintenanceRecord>
 */
class MaintenanceRecordFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $maintenanceTypes = [
            'preventive', 'corrective', 'emergency', 'routine', 'upgrade',
            'inspection', 'calibration', 'cleaning', 'repair', 'replacement'
        ];

        $statuses = ['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'];
        $priorities = ['low', 'medium', 'high', 'critical'];
        $conditions = ['poor', 'fair', 'good', 'excellent'];

        $scheduledDate = fake()->dateTimeBetween('-6 months', '+3 months');
        $maintenanceDate = fake()->dateTimeBetween($scheduledDate, '+1 month');
        $completionDate = fake()->optional(0.7)->dateTimeBetween($maintenanceDate, '+1 week');

        $laborHours = fake()->randomFloat(2, 0.5, 24);
        $laborCost = $laborHours * fake()->randomFloat(2, 25, 100);
        $partsCost = fake()->randomFloat(2, 0, 1000);
        $totalCost = $laborCost + $partsCost;

        return [
            'item_id' => InventoryItem::factory(),
            'technician_id' => User::factory(),
            'scheduled_by' => User::factory(),
            'maintenance_type' => fake()->randomElement($maintenanceTypes),
            'maintenance_date' => $maintenanceDate,
            'scheduled_date' => $scheduledDate,
            'completion_date' => $completionDate,
            'description' => fake()->sentence(),
            'work_performed' => fake()->optional()->paragraph(),
            'parts_used' => fake()->optional()->randomElements([
                'Filter', 'Belt', 'Battery', 'Fuse', 'Bulb', 'Cable',
                'Screw', 'Gasket', 'Oil', 'Brake pad', 'Wire'
            ], fake()->numberBetween(0, 3)),
            'labor_hours' => $laborHours,
            'cost' => $totalCost,
            'parts_cost' => $partsCost,
            'labor_cost' => $laborCost,
            'vendor' => fake()->optional()->company(),
            'invoice_number' => fake()->optional()->bothify('INV-######'),
            'warranty_extended' => fake()->boolean(30),
            'warranty_extension_date' => fake()->optional()->dateTimeBetween('+1 month', '+2 years'),
            'condition_before' => fake()->randomElement($conditions),
            'condition_after' => fake()->randomElement(array_slice($conditions, 1)), // Exclude 'poor'
            'issues_found' => fake()->optional()->sentence(),
            'recommendations' => fake()->optional()->sentence(),
            'next_maintenance_date' => fake()->optional()->dateTimeBetween('+1 month', '+1 year'),
            'status' => fake()->randomElement($statuses),
            'priority' => fake()->randomElement($priorities),
            'notes' => fake()->optional()->paragraph(),
            'attachments' => fake()->optional()->randomElements([
                'before_photo.jpg', 'after_photo.jpg', 'receipt.pdf',
                'manual.pdf', 'warranty.pdf'
            ], fake()->numberBetween(0, 2)),
            'metadata' => fake()->optional()->randomElements([
                'downtime_hours' => fake()->numberBetween(1, 48),
                'temperature' => fake()->numberBetween(-20, 50) . '°C',
                'humidity' => fake()->numberBetween(30, 80) . '%',
                'pressure' => fake()->numberBetween(10, 100) . ' PSI',
            ], fake()->numberBetween(0, 2)),
        ];
    }

    /**
     * Indicate that this is a preventive maintenance.
     */
    public function preventive(): static
    {
        return $this->state(fn (array $attributes) => [
            'maintenance_type' => 'preventive',
            'description' => 'Scheduled preventive maintenance',
            'priority' => fake()->randomElement(['low', 'medium']),
        ]);
    }

    /**
     * Indicate that this is an emergency maintenance.
     */
    public function emergency(): static
    {
        return $this->state(fn (array $attributes) => [
            'maintenance_type' => 'emergency',
            'description' => 'Emergency repair required',
            'priority' => 'critical',
            'scheduled_date' => fake()->dateTimeBetween('-1 week', 'now'),
            'maintenance_date' => fake()->dateTimeBetween('-1 week', 'now'),
        ]);
    }

    /**
     * Indicate that this is a routine maintenance.
     */
    public function routine(): static
    {
        return $this->state(fn (array $attributes) => [
            'maintenance_type' => 'routine',
            'description' => 'Routine maintenance check',
            'priority' => 'low',
            'labor_hours' => fake()->randomFloat(2, 0.5, 4),
        ]);
    }

    /**
     * Indicate that this maintenance is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'completion_date' => fake()->dateTimeBetween($attributes['maintenance_date'], 'now'),
            'work_performed' => fake()->paragraph(),
            'condition_after' => fake()->randomElement(['fair', 'good', 'excellent']),
        ]);
    }

    /**
     * Indicate that this maintenance is scheduled.
     */
    public function scheduled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'scheduled',
            'completion_date' => null,
            'work_performed' => null,
            'condition_after' => null,
        ]);
    }

    /**
     * Indicate that this maintenance is in progress.
     */
    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'in_progress',
            'completion_date' => null,
            'condition_after' => null,
        ]);
    }

    /**
     * Indicate that this maintenance is cancelled.
     */
    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
            'completion_date' => null,
            'work_performed' => null,
            'condition_after' => null,
            'notes' => 'Maintenance cancelled - ' . fake()->sentence(),
        ]);
    }

    /**
     * Indicate that this is a high-cost maintenance.
     */
    public function highCost(): static
    {
        return $this->state(fn (array $attributes) => [
            'labor_hours' => fake()->randomFloat(2, 8, 40),
            'parts_cost' => fake()->randomFloat(2, 500, 5000),
            'labor_cost' => fake()->randomFloat(2, 400, 4000),
            'cost' => fake()->randomFloat(2, 1000, 8000),
            'vendor' => fake()->company(),
            'invoice_number' => fake()->bothify('INV-######'),
        ]);
    }

    /**
     * Indicate that this is a low-cost maintenance.
     */
    public function lowCost(): static
    {
        return $this->state(fn (array $attributes) => [
            'labor_hours' => fake()->randomFloat(2, 0.5, 2),
            'parts_cost' => fake()->randomFloat(2, 0, 50),
            'labor_cost' => fake()->randomFloat(2, 25, 200),
            'cost' => fake()->randomFloat(2, 25, 250),
        ]);
    }

    /**
     * Indicate that this maintenance extends warranty.
     */
    public function warrantyExtended(): static
    {
        return $this->state(fn (array $attributes) => [
            'warranty_extended' => true,
            'warranty_extension_date' => fake()->dateTimeBetween('+3 months', '+2 years'),
            'metadata' => array_merge($attributes['metadata'] ?? [], [
                'warranty_provider' => fake()->company(),
                'warranty_terms' => fake()->sentence(),
            ]),
        ]);
    }

    /**
     * Indicate that this maintenance is overdue.
     */
    public function overdue(): static
    {
        return $this->state(fn (array $attributes) => [
            'scheduled_date' => fake()->dateTimeBetween('-2 months', '-1 week'),
            'maintenance_date' => fake()->dateTimeBetween('-2 months', '-1 week'),
            'status' => 'scheduled',
            'priority' => fake()->randomElement(['high', 'critical']),
        ]);
    }

    /**
     * Configure the model factory for a specific item.
     */
    public function forItem(InventoryItem $item): static
    {
        return $this->state(fn (array $attributes) => [
            'item_id' => $item->id,
        ]);
    }

    /**
     * Configure the model factory with a specific technician.
     */
    public function byTechnician(User $technician): static
    {
        return $this->state(fn (array $attributes) => [
            'technician_id' => $technician->id,
        ]);
    }

    /**
     * Configure the model factory for recent maintenance.
     */
    public function recent(): static
    {
        return $this->state(fn (array $attributes) => [
            'maintenance_date' => fake()->dateTimeBetween('-30 days', 'now'),
            'scheduled_date' => fake()->dateTimeBetween('-60 days', '-30 days'),
        ]);
    }
}