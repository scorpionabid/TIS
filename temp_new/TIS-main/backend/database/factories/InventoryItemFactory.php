<?php

namespace Database\Factories;

use App\Models\Institution;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\InventoryItem>
 */
class InventoryItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $categories = [
            'electronics', 'furniture', 'books', 'equipment', 'supplies',
            'vehicles', 'sports', 'laboratory', 'medical', 'safety',
            'cleaning', 'stationery', 'tools', 'software', 'other',
        ];

        $conditions = ['new', 'excellent', 'good', 'fair', 'poor', 'damaged'];

        $category = fake()->randomElement($categories);
        $purchaseDate = fake()->dateTimeBetween('-5 years', 'now');
        $warrantyExpiry = fake()->dateTimeBetween($purchaseDate, '+3 years');
        $purchasePrice = fake()->randomFloat(2, 10, 10000);

        return [
            'institution_id' => Institution::factory(),
            'assigned_to' => null, // Will be set by specific factory states
            'category' => $category,
            'subcategory' => fake()->optional()->word(),
            'name' => fake()->words(3, true),
            'description' => fake()->optional()->sentence(),
            'brand' => fake()->optional()->company(),
            'model' => fake()->optional()->bothify('Model-###-??'),
            'serial_number' => fake()->optional()->bothify('SN-########'),
            'asset_tag' => fake()->bothify('AT-####'),
            'purchase_date' => $purchaseDate,
            'purchase_price' => $purchasePrice,
            'vendor' => fake()->optional()->company(),
            'warranty_expiry' => $warrantyExpiry,
            'condition' => fake()->randomElement($conditions),
            'status' => 'available',
            'location' => fake()->optional()->words(2, true),
            'room_id' => null, // Will be set by specific factory states
            'specifications' => null,
            'accessories' => null,
            'maintenance_schedule' => null,
            'last_maintenance_date' => fake()->optional()->dateTimeBetween('-1 year', 'now'),
            'next_maintenance_date' => fake()->optional()->dateTimeBetween('now', '+1 year'),
            'depreciation_rate' => fake()->randomFloat(4, 0.01, 0.30), // 1% to 30% annual
            'current_value' => $purchasePrice * fake()->randomFloat(2, 0.20, 0.95),
            'is_consumable' => fake()->boolean(20), // 20% chance of being consumable
            'stock_quantity' => fake()->numberBetween(0, 100),
            'min_stock_level' => fake()->numberBetween(5, 20),
            'max_stock_level' => fake()->numberBetween(50, 200),
            'unit_of_measure' => fake()->optional()->randomElement(['piece', 'kg', 'liter', 'meter', 'box']),
            'barcode' => fake()->optional()->ean13(),
            'qr_code' => fake()->optional()->uuid(),
            'notes' => fake()->optional()->paragraph(),
            'metadata' => null,
        ];
    }

    /**
     * Indicate that the item is assigned to a user.
     */
    public function assigned(): static
    {
        return $this->state(fn (array $attributes) => [
            'assigned_to' => User::factory(),
            'status' => 'in_use',
        ]);
    }

    /**
     * Indicate that the item is available.
     */
    public function available(): static
    {
        return $this->state(fn (array $attributes) => [
            'assigned_to' => null,
            'status' => 'available',
        ]);
    }

    /**
     * Indicate that the item is in maintenance.
     */
    public function inMaintenance(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'maintenance',
            'next_maintenance_date' => fake()->dateTimeBetween('-30 days', '+30 days'),
        ]);
    }

    /**
     * Indicate that the item is damaged.
     */
    public function damaged(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'damaged',
            'condition' => 'damaged',
        ]);
    }

    /**
     * Indicate that the item is consumable with stock.
     */
    public function consumable(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_consumable' => true,
            'stock_quantity' => fake()->numberBetween(10, 100),
            'min_stock_level' => 10,
            'max_stock_level' => 200,
            'unit_of_measure' => fake()->randomElement(['piece', 'kg', 'liter', 'box']),
        ]);
    }

    /**
     * Indicate that the item has low stock.
     */
    public function lowStock(): static
    {
        return $this->consumable()->state(fn (array $attributes) => [
            'stock_quantity' => fake()->numberBetween(1, 9),
            'min_stock_level' => 10,
        ]);
    }

    /**
     * Indicate that the item's warranty is expiring soon.
     */
    public function warrantyExpiring(): static
    {
        return $this->state(fn (array $attributes) => [
            'warranty_expiry' => fake()->dateTimeBetween('now', '+30 days'),
        ]);
    }

    /**
     * Indicate that the item needs maintenance.
     */
    public function needsMaintenance(): static
    {
        return $this->state(fn (array $attributes) => [
            'next_maintenance_date' => fake()->dateTimeBetween('-30 days', 'now'),
            'status' => 'available', // Available but needs maintenance
        ]);
    }

    /**
     * Configure the model factory for a specific category.
     */
    public function category(string $category): static
    {
        $subcategories = [
            'electronics' => ['computer', 'printer', 'projector', 'tablet', 'phone'],
            'furniture' => ['desk', 'chair', 'cabinet', 'shelf', 'table'],
            'equipment' => ['tool', 'machine', 'device', 'instrument', 'apparatus'],
            'supplies' => ['stationery', 'cleaning', 'maintenance', 'office', 'consumable'],
        ];

        return $this->state(fn (array $attributes) => [
            'category' => $category,
            'subcategory' => fake()->randomElement($subcategories[$category] ?? ['general']),
        ]);
    }

    /**
     * Configure the model factory with a specific room.
     */
    public function inRoom(): static
    {
        return $this->state(fn (array $attributes) => [
            'room_id' => Room::factory(),
            'location' => fake()->words(2, true),
        ]);
    }
}
