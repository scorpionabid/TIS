<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\InventoryItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class InventoryControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected Institution $institution;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            \Database\Seeders\RoleSeeder::class,
            \Database\Seeders\PermissionSeeder::class,
        ]);

        $this->institution = Institution::factory()->create([
            'type' => 'school',
            'level' => 4,
        ]);

        $this->superadmin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'is_active' => true,
        ]);

        $this->superadmin->assignRole('superadmin');
        $this->superadmin->givePermissionTo(
            Permission::where('guard_name', 'web')->pluck('name')->all()
        );

        Sanctum::actingAs($this->superadmin);
    }

    public function test_superadmin_can_list_inventory_items(): void
    {
        InventoryItem::factory()->count(3)->create([
            'institution_id' => $this->institution->id,
        ]);

        $response = $this->getJson('/api/inventory');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Inventory items retrieved successfully',
            ]);

        $this->assertSame(3, $response->json('data.total'));
    }

    public function test_superadmin_can_create_inventory_item(): void
    {
        $payload = [
            'name' => 'Test Laptop',
            'category' => 'electronics',
            'condition' => 'new',
            'institution_id' => $this->institution->id,
            'purchase_price' => 1250.50,
        ];

        $response = $this->postJson('/api/inventory', $payload);

        $response->assertCreated()
            ->assertJsonFragment([
                'success' => true,
                'message' => 'Inventory item created successfully',
                'name' => 'Test Laptop',
                'category' => 'electronics',
            ]);

        $this->assertDatabaseHas('inventory_items', [
            'name' => 'Test Laptop',
            'institution_id' => $this->institution->id,
        ]);
    }

    public function test_create_inventory_item_requires_mandatory_fields(): void
    {
        $response = $this->postJson('/api/inventory', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'category', 'condition']);
    }

    public function test_superadmin_can_update_inventory_item(): void
    {
        $item = InventoryItem::factory()->create([
            'institution_id' => $this->institution->id,
            'name' => 'Old Name',
            'status' => 'available',
        ]);

        $response = $this->putJson("/api/inventory/{$item->id}", [
            'name' => 'Updated Name',
            'status' => 'in_use',
        ]);

        $response->assertOk();
        $this->assertTrue($response->json('success'));
        $this->assertEquals('Inventory item updated successfully', $response->json('message'));

    }

    public function test_superadmin_can_delete_inventory_item(): void
    {
        $item = InventoryItem::factory()->create([
            'institution_id' => $this->institution->id,
        ]);

        $response = $this->deleteJson("/api/inventory/{$item->id}");

        $response->assertOk();
        $this->assertTrue($response->json('success'));
        $this->assertEquals('Inventory item deleted successfully', $response->json('message'));
    }

    public function test_categories_endpoint_returns_counts(): void
    {
        InventoryItem::factory()->count(2)->create([
            'institution_id' => $this->institution->id,
            'category' => 'electronics',
        ]);

        InventoryItem::factory()->create([
            'institution_id' => $this->institution->id,
            'category' => 'furniture',
        ]);

        $response = $this->getJson('/api/inventory/categories');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Inventory categories retrieved successfully',
            ]);

        $this->assertEquals(2, $response->json('data.electronics'));
        $this->assertEquals(1, $response->json('data.furniture'));
    }

    public function test_search_endpoint_filters_by_query(): void
    {
        InventoryItem::factory()->create([
            'institution_id' => $this->institution->id,
            'name' => 'Dell Latitude Laptop',
            'category' => 'electronics',
        ]);

        InventoryItem::factory()->create([
            'institution_id' => $this->institution->id,
            'name' => 'Office Chair',
            'category' => 'furniture',
        ]);

        $response = $this->getJson('/api/inventory/search?query=Dell&limit=5');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Search results retrieved successfully',
            ]);

        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Dell Latitude Laptop', $response->json('data.0.name'));
    }
}
