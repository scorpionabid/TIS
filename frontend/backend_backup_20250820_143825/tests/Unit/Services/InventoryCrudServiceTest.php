<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\InventoryItem;
use App\Services\InventoryCrudService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class InventoryCrudServiceTest extends TestCase
{
    use RefreshDatabase;

    protected InventoryCrudService $service;
    protected User $user;
    protected Institution $institution;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->service = new InventoryCrudService();
        
        // Create test user and institution
        $this->institution = Institution::factory()->create([
            'name' => 'Test School',
            'type' => 'school'
        ]);
        
        $this->user = User::factory()->create([
            'institution_id' => $this->institution->id
        ]);
        
        $this->actingAs($this->user);
    }

    /** @test */
    public function it_can_get_paginated_inventory_list()
    {
        // Create test inventory items
        InventoryItem::factory()->count(25)->create([
            'institution_id' => $this->institution->id
        ]);

        $params = [
            'per_page' => 10,
            'page' => 1
        ];

        $result = $this->service->getPaginatedList($params);

        $this->assertInstanceOf(LengthAwarePaginator::class, $result);
        $this->assertEquals(10, $result->perPage());
        $this->assertEquals(25, $result->total());
        $this->assertEquals(1, $result->currentPage());
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

        $params = ['category' => 'electronics'];
        $result = $this->service->getPaginatedList($params);

        $this->assertEquals(1, $result->total());
        $this->assertEquals('electronics', $result->first()->category);
    }

    /** @test */
    public function it_can_filter_inventory_by_status()
    {
        InventoryItem::factory()->create([
            'status' => 'available',
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->create([
            'status' => 'in_use',
            'institution_id' => $this->institution->id
        ]);

        $params = ['status' => 'available'];
        $result = $this->service->getPaginatedList($params);

        $this->assertEquals(1, $result->total());
        $this->assertEquals('available', $result->first()->status);
    }

    /** @test */
    public function it_can_search_inventory_items()
    {
        InventoryItem::factory()->create([
            'name' => 'Dell Laptop',
            'description' => 'High performance laptop',
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->create([
            'name' => 'HP Printer',
            'description' => 'Color printer',
            'institution_id' => $this->institution->id
        ]);

        $params = ['search' => 'laptop'];
        $result = $this->service->getPaginatedList($params);

        $this->assertEquals(1, $result->total());
        $this->assertStringContainsString('Dell Laptop', $result->first()->name);
    }

    /** @test */
    public function it_can_create_inventory_item()
    {
        $data = [
            'name' => 'Test Laptop',
            'description' => 'Test laptop for unit testing',
            'category' => 'electronics',
            'condition' => 'new',
            'purchase_price' => 1000.00,
            'current_value' => 1000.00,
            'institution_id' => $this->institution->id
        ];

        $item = $this->service->create($data);

        $this->assertInstanceOf(InventoryItem::class, $item);
        $this->assertEquals('Test Laptop', $item->name);
        $this->assertEquals('electronics', $item->category);
        $this->assertEquals('new', $item->condition);
        $this->assertEquals(1000.00, $item->purchase_price);
        
        $this->assertDatabaseHas('inventory_items', [
            'name' => 'Test Laptop',
            'category' => 'electronics'
        ]);
    }

    /** @test */
    public function it_auto_generates_item_code_when_creating()
    {
        $data = [
            'name' => 'Test Item',
            'category' => 'electronics',
            'condition' => 'new',
            'institution_id' => $this->institution->id
        ];

        $item = $this->service->create($data);

        $this->assertNotNull($item->code);
        $this->assertStringStartsWith('ELE-', $item->code);
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

        $updatedItem = $this->service->update($item, $updateData);

        $this->assertEquals('Updated Name', $updatedItem->name);
        $this->assertEquals('in_use', $updatedItem->status);
        
        $this->assertDatabaseHas('inventory_items', [
            'id' => $item->id,
            'name' => 'Updated Name',
            'status' => 'in_use'
        ]);
    }

    /** @test */
    public function it_can_soft_delete_inventory_item()
    {
        $item = InventoryItem::factory()->create([
            'institution_id' => $this->institution->id
        ]);

        $this->service->delete($item);

        $this->assertSoftDeleted('inventory_items', [
            'id' => $item->id
        ]);
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

        $duplicate = $this->service->duplicate($original, $duplicateData);

        $this->assertEquals('Duplicated Item', $duplicate->name);
        $this->assertEquals('DUP-001', $duplicate->code);
        $this->assertEquals($original->category, $duplicate->category);
        $this->assertEquals($original->condition, $duplicate->condition);
        
        $this->assertDatabaseHas('inventory_items', [
            'name' => 'Duplicated Item',
            'code' => 'DUP-001'
        ]);
    }

    /** @test */
    public function it_can_get_categories_with_counts()
    {
        InventoryItem::factory()->count(3)->create([
            'category' => 'electronics',
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->count(2)->create([
            'category' => 'furniture',
            'institution_id' => $this->institution->id
        ]);

        $categories = $this->service->getCategoriesWithCounts();

        $this->assertIsArray($categories);
        $this->assertEquals(3, $categories['electronics']);
        $this->assertEquals(2, $categories['furniture']);
    }

    /** @test */
    public function it_can_search_items_with_query()
    {
        InventoryItem::factory()->create([
            'name' => 'Dell Laptop Pro',
            'code' => 'LAP-001',
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->create([
            'name' => 'HP Printer',
            'code' => 'PRT-001',
            'institution_id' => $this->institution->id
        ]);

        $searchParams = [
            'query' => 'Dell',
            'limit' => 10
        ];

        $results = $this->service->searchItems($searchParams);

        $this->assertCount(1, $results);
        $this->assertEquals('Dell Laptop Pro', $results[0]->name);
    }

    /** @test */
    public function it_can_get_item_for_public_view()
    {
        $item = InventoryItem::factory()->create([
            'name' => 'Public Item',
            'description' => 'Description for public',
            'institution_id' => $this->institution->id
        ]);

        $publicData = $this->service->getItemForPublicView($item);

        $this->assertIsArray($publicData);
        $this->assertEquals('Public Item', $publicData['name']);
        $this->assertArrayHasKey('code', $publicData);
        $this->assertArrayHasKey('category', $publicData);
        // Sensitive fields should not be included
        $this->assertArrayNotHasKey('purchase_price', $publicData);
    }

    /** @test */
    public function it_formats_item_for_response_correctly()
    {
        $item = InventoryItem::factory()->create([
            'name' => 'Test Item',
            'purchase_price' => 1000.00,
            'current_value' => 800.00,
            'institution_id' => $this->institution->id
        ]);

        $formatted = $this->service->formatForResponse($item);

        $this->assertIsArray($formatted);
        $this->assertEquals('Test Item', $formatted['name']);
        $this->assertEquals(1000.00, $formatted['purchase_price']);
        $this->assertEquals(800.00, $formatted['current_value']);
    }

    /** @test */
    public function it_formats_detailed_item_for_response_correctly()
    {
        $item = InventoryItem::factory()->create([
            'specifications' => ['cpu' => 'Intel i5', 'ram' => '8GB'],
            'institution_id' => $this->institution->id
        ]);

        $formatted = $this->service->formatDetailedForResponse($item);

        $this->assertIsArray($formatted);
        $this->assertArrayHasKey('specifications', $formatted);
        $this->assertEquals('Intel i5', $formatted['specifications']['cpu']);
        $this->assertEquals('8GB', $formatted['specifications']['ram']);
    }

    /** @test */
    public function it_applies_regional_access_control()
    {
        // Create items in different institutions
        $otherInstitution = Institution::factory()->create();
        
        InventoryItem::factory()->create([
            'name' => 'My Institution Item',
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->create([
            'name' => 'Other Institution Item', 
            'institution_id' => $otherInstitution->id
        ]);

        $result = $this->service->getPaginatedList([]);

        // Should only see items from user's institution
        $this->assertEquals(1, $result->total());
        $this->assertEquals('My Institution Item', $result->first()->name);
    }

    /** @test */
    public function it_handles_consumable_items_correctly()
    {
        $data = [
            'name' => 'Paper Supplies',
            'category' => 'supplies',
            'condition' => 'new',
            'is_consumable' => true,
            'quantity' => 100,
            'min_quantity' => 10,
            'unit' => 'sheets',
            'institution_id' => $this->institution->id
        ];

        $item = $this->service->create($data);

        $this->assertTrue($item->is_consumable);
        $this->assertEquals(100, $item->quantity);
        $this->assertEquals(10, $item->min_quantity);
        $this->assertEquals('sheets', $item->unit);
    }

    /** @test */
    public function it_validates_required_fields_for_consumables()
    {
        $this->expectException(\Exception::class);

        $data = [
            'name' => 'Paper Supplies',
            'category' => 'supplies',
            'condition' => 'new',
            'is_consumable' => true,
            // Missing required quantity and unit for consumables
            'institution_id' => $this->institution->id
        ];

        $this->service->create($data);
    }
}