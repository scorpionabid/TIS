<?php

namespace Database\Factories;

use App\Models\InventoryItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\InventoryTransaction>
 */
class InventoryTransactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $transactionTypes = ['purchase', 'assignment', 'return', 'disposal'];
        $statuses = ['pending', 'approved', 'completed', 'cancelled'];

        $transactionDate = fake()->dateTimeBetween('-1 year', 'now');
        $quantity = fake()->numberBetween(1, 10);
        $unitPrice = fake()->randomFloat(2, 10, 1000);

        return [
            'item_id' => InventoryItem::factory(),
            'user_id' => User::factory(),
            'transaction_type' => fake()->randomElement($transactionTypes),
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'total_amount' => $quantity * $unitPrice,
            'previous_quantity' => fake()->numberBetween(0, 100),
            'new_quantity' => fake()->numberBetween(0, 150),
            'transaction_date' => $transactionDate,
            'reference_number' => fake()->bothify('TR-########'),
            'description' => fake()->sentence(),
            'status' => fake()->randomElement($statuses),
            'metadata' => null,
        ];
    }

    public function purchase(): static
    {
        return $this->state(fn (array $attributes) => [
            'transaction_type' => 'purchase',
            'supplier' => fake()->company(),
            'invoice_number' => fake()->bothify('INV-######'),
            'status' => 'completed',
        ]);
    }

    public function assignment(): static
    {
        return $this->state(fn (array $attributes) => [
            'transaction_type' => 'assignment',
            'assigned_to' => User::factory(),
            'quantity' => 1,
            'unit_price' => null,
            'total_amount' => null,
            'description' => 'Item assigned to user',
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
        ]);
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
        ]);
    }
}