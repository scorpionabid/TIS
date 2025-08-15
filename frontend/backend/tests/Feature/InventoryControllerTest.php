<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\InventoryItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class InventoryControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Institution $institution;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test institution
        $this->institution = Institution::factory()->create([
            'name' => 'Test School',
            'type' => 'school'
        ]);
        
        // Create test user
        $this->user = User::factory()->create([
            'institution_id' => $this->institution->id
        ]);
        
        // Authenticate user
        Sanctum::actingAs($this->user);
    }

    /** @test */
    public function it_can_list_inventory_items()
    {
        InventoryItem::factory()->count(5)->create([
            'institution_id' => $this->institution->id
        ]);

        $response = $this->getJson('/api/inventory');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'current_page',
                    'data' => [
                        '*' => [
                            'id',
                            'name',
                            'code',
                            'category',
                            'status',
                            'condition'
                        ]
                    ],
                    'total',
                    'per_page'
                ]
            ]);

        $this->assertEquals(5, $response->json('data.total'));
    }

    /** @test */
    public function it_can_filter_inventory_by_category()
    {
        InventoryItem::factory()->create([
            'category' => 'electronics',
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->create([
            'category' => 'furniture',
            'institution_id' => $this->institution->id
        ]);

        $response = $this->getJson('/api/inventory?category=electronics');

        $response->assertOk();
        $this->assertEquals(1, $response->json('data.total'));
        $this->assertEquals('electronics', $response->json('data.data.0.category'));
    }

    /** @test */
    public function it_can_search_inventory_items()
    {
        InventoryItem::factory()->create([
            'name' => 'Dell Laptop Pro',
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->create([
            'name' => 'HP Printer',
            'institution_id' => $this->institution->id
        ]);

        $response = $this->getJson('/api/inventory?search=Dell');

        $response->assertOk();
        $this->assertEquals(1, $response->json('data.total'));
        $this->assertStringContainsString('Dell', $response->json('data.data.0.name'));
    }

    /** @test */
    public function it_can_create_inventory_item()
    {
        $itemData = [
            'name' => 'Test Laptop',
            'description' => 'Test laptop for API testing',
            'category' => 'electronics',
            'condition' => 'new',
            'purchase_price' => 1000.00,
            'current_value' => 1000.00,
            'institution_id' => $this->institution->id
        ];

        $response = $this->postJson('/api/inventory', $itemData);

        $response->assertCreated()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'name',
                    'category',
                    'condition',
                    'purchase_price'
                ]
            ]);

        $this->assertDatabaseHas('inventory_items', [
            'name' => 'Test Laptop',
            'category' => 'electronics'
        ]);
    }

    /** @test */
    public function it_validates_required_fields_when_creating()
    {
        $response = $this->postJson('/api/inventory', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'category', 'condition']);
    }

    /** @test */
    public function it_can_show_single_inventory_item()
    {
        $item = InventoryItem::factory()->create([
            'name' => 'Test Item',
            'institution_id' => $this->institution->id
        ]);

        $response = $this->getJson("/api/inventory/{$item->id}");

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'name',
                    'code',
                    'category',
                    'status',
                    'condition',
                    'purchase_price',
                    'current_value'
                ]
            ]);

        $this->assertEquals('Test Item', $response->json('data.name'));
    }

    /** @test */
    public function it_returns_404_for_non_existent_item()
    {
        $response = $this->getJson('/api/inventory/999999');

        $response->assertNotFound();
    }

    /** @test */
    public function it_can_update_inventory_item()
    {
        $item = InventoryItem::factory()->create([
            'name' => 'Original Name',
            'status' => 'available',
            'institution_id' => $this->institution->id
        ]);

        $updateData = [
            'name' => 'Updated Name',
            'status' => 'in_use'
        ];

        $response = $this->putJson("/api/inventory/{$item->id}", $updateData);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Updated Name',
                    'status' => 'in_use'
                ]
            ]);

        $this->assertDatabaseHas('inventory_items', [
            'id' => $item->id,
            'name' => 'Updated Name',
            'status' => 'in_use'
        ]);
    }

    /** @test */
    public function it_can_delete_inventory_item()
    {
        $item = InventoryItem::factory()->create([
            'institution_id' => $this->institution->id
        ]);

        $response = $this->deleteJson("/api/inventory/{$item->id}");

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Inventory item deleted successfully'
            ]);

        $this->assertSoftDeleted('inventory_items', [
            'id' => $item->id
        ]);
    }

    /** @test */
    public function it_can_get_item_for_public_view()
    {
        $item = InventoryItem::factory()->create([
            'name' => 'Public Item',
            'institution_id' => $this->institution->id
        ]);

        $response = $this->getJson("/api/inventory/{$item->id}/public");

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'name',
                    'code',
                    'category'
                ]
            ]);

        // Sensitive data should not be included
        $this->assertArrayNotHasKey('purchase_price', $response->json('data'));
    }

    /** @test */
    public function it_can_duplicate_inventory_item()
    {
        $original = InventoryItem::factory()->create([
            'name' => 'Original Item',
            'code' => 'ORIG-001',
            'institution_id' => $this->institution->id
        ]);

        $duplicateData = [
            'name' => 'Duplicated Item',
            'code' => 'DUP-001'
        ];

        $response = $this->postJson("/api/inventory/{$original->id}/duplicate", $duplicateData);

        $response->assertCreated()
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Duplicated Item',
                    'code' => 'DUP-001'
                ]
            ]);

        $this->assertDatabaseHas('inventory_items', [
            'name' => 'Duplicated Item',
            'code' => 'DUP-001'
        ]);
    }

    /** @test */
    public function it_can_get_inventory_categories()
    {
        InventoryItem::factory()->count(3)->create([
            'category' => 'electronics',
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->count(2)->create([
            'category' => 'furniture',
            'institution_id' => $this->institution->id
        ]);

        $response = $this->getJson('/api/inventory-categories');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data'
            ]);

        $categories = $response->json('data');
        $this->assertEquals(3, $categories['electronics']);
        $this->assertEquals(2, $categories['furniture']);
    }

    /** @test */
    public function it_can_search_items_with_advanced_search()
    {
        InventoryItem::factory()->create([
            'name' => 'Dell Laptop Pro',
            'code' => 'LAP-001',
            'category' => 'electronics',
            'institution_id' => $this->institution->id
        ]);

        $response = $this->getJson('/api/inventory-search?query=Dell&category=electronics&limit=10');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'code',
                        'category'
                    ]
                ]
            ]);

        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Dell Laptop Pro', $response->json('data.0.name'));
    }

    /** @test */
    public function it_applies_pagination_correctly()
    {
        InventoryItem::factory()->count(25)->create([
            'institution_id' => $this->institution->id
        ]);

        $response = $this->getJson('/api/inventory?per_page=10&page=2');

        $response->assertOk();
        $this->assertEquals(10, count($response->json('data.data')));
        $this->assertEquals(2, $response->json('data.current_page'));
        $this->assertEquals(25, $response->json('data.total'));
    }

    /** @test */
    public function it_applies_sorting_correctly()
    {
        InventoryItem::factory()->create([
            'name' => 'B Item',
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->create([
            'name' => 'A Item',
            'institution_id' => $this->institution->id
        ]);

        $response = $this->getJson('/api/inventory?sort_by=name&sort_order=asc');

        $response->assertOk();
        $this->assertEquals('A Item', $response->json('data.data.0.name'));
        $this->assertEquals('B Item', $response->json('data.data.1.name'));
    }

    /** @test */
    public function it_only_shows_items_from_users_institution()
    {
        $otherInstitution = Institution::factory()->create();
        
        // Create item in user's institution
        InventoryItem::factory()->create([
            'name' => 'My Item',
            'institution_id' => $this->institution->id
        ]);
        
        // Create item in other institution
        InventoryItem::factory()->create([
            'name' => 'Other Item',
            'institution_id' => $otherInstitution->id
        ]);

        $response = $this->getJson('/api/inventory');

        $response->assertOk();
        $this->assertEquals(1, $response->json('data.total'));
        $this->assertEquals('My Item', $response->json('data.data.0.name'));
    }

    /** @test */
    public function it_requires_authentication()
    {
        // Remove authentication
        $this->app['auth']->forgetGuards();

        $response = $this->getJson('/api/inventory');

        $response->assertUnauthorized();
    }

    /** @test */
    public function it_validates_category_values()
    {
        $itemData = [
            'name' => 'Test Item',
            'category' => 'invalid_category',
            'condition' => 'new'
        ];

        $response = $this->postJson('/api/inventory', $itemData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['category']);
    }

    /** @test */
    public function it_validates_status_values()
    {
        $item = InventoryItem::factory()->create([
            'institution_id' => $this->institution->id
        ]);

        $updateData = [
            'status' => 'invalid_status'
        ];

        $response = $this->putJson("/api/inventory/{$item->id}", $updateData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    /** @test */
    public function it_validates_numeric_fields()
    {
        $itemData = [
            'name' => 'Test Item',
            'category' => 'electronics',
            'condition' => 'new',
            'purchase_price' => 'not_a_number',
            'current_value' => -100
        ];

        $response = $this->postJson('/api/inventory', $itemData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['purchase_price', 'current_value']);
    }

    /** @test */
    public function it_handles_consumable_items_correctly()
    {
        $itemData = [
            'name' => 'Paper Supplies',
            'category' => 'supplies',
            'condition' => 'new',
            'is_consumable' => true,
            'quantity' => 100,
            'unit' => 'sheets',
            'min_quantity' => 10,
            'institution_id' => $this->institution->id
        ];

        $response = $this->postJson('/api/inventory', $itemData);

        $response->assertCreated();
        $this->assertTrue($response->json('data.is_consumable'));
        $this->assertEquals(100, $response->json('data.quantity'));
        $this->assertEquals('sheets', $response->json('data.unit'));
    }

    /** @test */
    public function it_validates_required_fields_for_consumables()
    {
        $itemData = [
            'name' => 'Paper Supplies',
            'category' => 'supplies',
            'condition' => 'new',
            'is_consumable' => true
            // Missing quantity and unit
        ];

        $response = $this->postJson('/api/inventory', $itemData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['quantity', 'unit']);
    }

    /** @test */
    public function it_returns_proper_error_messages()
    {
        $response = $this->postJson('/api/inventory', [
            'name' => '',
            'category' => 'invalid'
        ]);

        $response->assertStatus(422)
            ->assertJsonStructure([
                'message',
                'errors' => [
                    'name',
                    'category',
                    'condition'
                ]
            ]);
    }
}