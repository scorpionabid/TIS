<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class InventoryTransactionControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected User $assignedUser;
    protected Institution $institution;
    protected InventoryItem $item;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test institution
        $this->institution = Institution::factory()->create([
            'name' => 'Test School',
            'type' => 'school'
        ]);
        
        // Create test users
        $this->user = User::factory()->create([
            'institution_id' => $this->institution->id
        ]);
        
        $this->assignedUser = User::factory()->create([
            'institution_id' => $this->institution->id
        ]);
        
        // Create test inventory item
        $this->item = InventoryItem::factory()->create([
            'name' => 'Test Laptop',
            'status' => 'available',
            'institution_id' => $this->institution->id
        ]);
        
        // Authenticate user
        Sanctum::actingAs($this->user);
    }

    /** @test */
    public function it_can_assign_item_to_user()
    {
        $assignmentData = [
            'user_id' => $this->assignedUser->id,
            'quantity' => 1,
            'expected_return_date' => now()->addDays(30)->format('Y-m-d'),
            'notes' => 'Assigned for testing'
        ];

        $response = $this->postJson("/api/inventory/transactions/{$this->item->id}/assign", $assignmentData);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'type',
                    'quantity',
                    'assigned_user' => [
                        'id',
                        'username',
                        'full_name'
                    ],
                    'item' => [
                        'id',
                        'name',
                        'code'
                    ]
                ]
            ]);

        $this->assertEquals('assignment', $response->json('data.type'));
        $this->assertEquals($this->assignedUser->id, $response->json('data.assigned_user.id'));

        // Check database
        $this->assertDatabaseHas('inventory_transactions', [
            'type' => 'assignment',
            'inventory_item_id' => $this->item->id,
            'assigned_user_id' => $this->assignedUser->id
        ]);

        // Check item status updated
        $this->item->refresh();
        $this->assertEquals('in_use', $this->item->status);
        $this->assertEquals($this->assignedUser->id, $this->item->assigned_to);
    }

    /** @test */
    public function it_validates_assignment_data()
    {
        $response = $this->postJson("/api/inventory/transactions/{$this->item->id}/assign", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['user_id']);
    }

    /** @test */
    public function it_can_return_assigned_item()
    {
        // First assign the item
        $this->item->update([
            'status' => 'in_use',
            'assigned_to' => $this->assignedUser->id
        ]);

        $returnData = [
            'condition' => 'excellent',
            'return_notes' => 'Returned in good condition',
            'damage_report' => null
        ];

        $response = $this->postJson("/api/inventory/transactions/{$this->item->id}/return", $returnData);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'type', 
                    'condition_after'
                ]
            ]);

        $this->assertEquals('return', $response->json('data.type'));
        $this->assertEquals('excellent', $response->json('data.condition_after'));

        // Check database
        $this->assertDatabaseHas('inventory_transactions', [
            'type' => 'return',
            'inventory_item_id' => $this->item->id,
            'condition_after' => 'excellent'
        ]);

        // Check item status updated
        $this->item->refresh();
        $this->assertEquals('available', $this->item->status);
        $this->assertNull($this->item->assigned_to);
    }

    /** @test */
    public function it_can_update_stock_for_consumable_items()
    {
        $consumableItem = InventoryItem::factory()->create([
            'name' => 'Paper Supplies',
            'is_consumable' => true,
            'quantity' => 50,
            'unit' => 'sheets',
            'institution_id' => $this->institution->id
        ]);

        $stockData = [
            'quantity' => 100,
            'operation' => 'add',
            'reason' => 'New stock received',
            'supplier' => 'Office Supplies Ltd'
        ];

        $response = $this->putJson("/api/inventory/transactions/{$consumableItem->id}/stock", $stockData);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'type',
                    'quantity',
                    'description'
                ]
            ]);

        $this->assertEquals('stock_update', $response->json('data.type'));
        $this->assertEquals(100, $response->json('data.quantity'));

        // Check item quantity updated
        $consumableItem->refresh();
        $this->assertEquals(150, $consumableItem->quantity); // 50 + 100
    }

    /** @test */
    public function it_can_transfer_item_between_locations()
    {
        $destinationInstitution = Institution::factory()->create([
            'name' => 'Destination School'
        ]);

        $transferData = [
            'destination_institution_id' => $destinationInstitution->id,
            'transfer_reason' => 'Relocated to new campus',
            'expected_transfer_date' => now()->addDays(7)->format('Y-m-d')
        ];

        $response = $this->postJson("/api/inventory/transactions/{$this->item->id}/transfer", $transferData);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'type',
                    'destination_institution_id',
                    'description'
                ]
            ]);

        $this->assertEquals('transfer', $response->json('data.type'));
        $this->assertEquals($destinationInstitution->id, $response->json('data.destination_institution_id'));

        // Check item institution updated
        $this->item->refresh();
        $this->assertEquals($destinationInstitution->id, $this->item->institution_id);
    }

    /** @test */
    public function it_can_get_transaction_history()
    {
        // Create multiple transactions
        InventoryTransaction::factory()->count(3)->create([
            'inventory_item_id' => $this->item->id,
            'user_id' => $this->user->id
        ]);

        $response = $this->getJson("/api/inventory/transactions/{$this->item->id}/history");

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    '*' => [
                        'id',
                        'type',
                        'transaction_date',
                        'user' => [
                            'id',
                            'username'
                        ]
                    ]
                ]
            ]);

        $this->assertCount(3, $response->json('data'));
    }

    /** @test */
    public function it_can_get_transaction_summary()
    {
        // Create different types of transactions
        InventoryTransaction::factory()->create([
            'inventory_item_id' => $this->item->id,
            'type' => 'assignment',
            'user_id' => $this->user->id
        ]);
        
        InventoryTransaction::factory()->create([
            'inventory_item_id' => $this->item->id,
            'type' => 'return',
            'user_id' => $this->user->id
        ]);

        $response = $this->getJson("/api/inventory/transactions/{$this->item->id}/summary");

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',  
                'data' => [
                    'total_transactions',
                    'by_type',
                    'recent_activity'
                ]
            ]);

        $this->assertEquals(2, $response->json('data.total_transactions'));
        $this->assertEquals(1, $response->json('data.by_type.assignment'));
        $this->assertEquals(1, $response->json('data.by_type.return'));
    }

    /** @test */
    public function it_can_preview_bulk_assignment()
    {
        $items = InventoryItem::factory()->count(3)->create([
            'status' => 'available',
            'institution_id' => $this->institution->id
        ]);

        $previewData = [
            'item_ids' => $items->pluck('id')->toArray(),
            'user_id' => $this->assignedUser->id,
            'expected_return_date' => now()->addDays(30)->format('Y-m-d')
        ];

        $response = $this->postJson('/api/inventory/transactions/bulk/assign/preview', $previewData);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'assignable_items',
                    'non_assignable_items',
                    'summary' => [
                        'total_items',
                        'total_assignable',
                        'total_non_assignable'
                    ]
                ]
            ]);

        $this->assertCount(3, $response->json('data.assignable_items'));
        $this->assertEquals(3, $response->json('data.summary.total_assignable'));
    }

    /** @test */
    public function it_can_perform_bulk_assignment()
    {
        $items = InventoryItem::factory()->count(3)->create([
            'status' => 'available',
            'institution_id' => $this->institution->id
        ]);

        $bulkData = [
            'item_ids' => $items->pluck('id')->toArray(),
            'user_id' => $this->assignedUser->id,
            'expected_return_date' => now()->addDays(30)->format('Y-m-d'),
            'notes' => 'Bulk assignment for training'
        ];

        $response = $this->postJson('/api/inventory/transactions/bulk/assign', $bulkData);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'successful_assignments',
                    'failed_assignments',
                    'summary'
                ]
            ]);

        $this->assertCount(3, $response->json('data.successful_assignments'));
        $this->assertCount(0, $response->json('data.failed_assignments'));

        // Check transactions created
        $this->assertDatabaseCount('inventory_transactions', 3);

        // Check items status updated
        foreach ($items as $item) {
            $item->refresh();
            $this->assertEquals('in_use', $item->status);
            $this->assertEquals($this->assignedUser->id, $item->assigned_to);
        }
    }

    /** @test */
    public function it_can_perform_bulk_return()
    {
        // Create assigned items
        $items = InventoryItem::factory()->count(2)->create([
            'status' => 'in_use',
            'assigned_to' => $this->assignedUser->id,
            'institution_id' => $this->institution->id
        ]);

        $bulkReturnData = [
            'item_ids' => $items->pluck('id')->toArray(),
            'condition' => 'good',
            'return_notes' => 'Bulk return after training'
        ];

        $response = $this->postJson('/api/inventory/transactions/bulk/return', $bulkReturnData);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'successful_returns',
                    'failed_returns',
                    'summary'
                ]
            ]);

        $this->assertCount(2, $response->json('data.successful_returns'));

        // Check items status updated
        foreach ($items as $item) {
            $item->refresh();
            $this->assertEquals('available', $item->status);
            $this->assertNull($item->assigned_to);
        }
    }

    /** @test */
    public function it_can_get_user_assignments()
    {
        // Create assignments for user
        InventoryTransaction::factory()->count(2)->create([
            'type' => 'assignment',
            'assigned_user_id' => $this->assignedUser->id,
            'user_id' => $this->user->id
        ]);

        $response = $this->getJson("/api/inventory/transactions/user/{$this->assignedUser->id}/assignments");

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    '*' => [
                        'id',
                        'type',
                        'assigned_user_id',
                        'item'
                    ]
                ]
            ]);

        $this->assertCount(2, $response->json('data'));
        foreach ($response->json('data') as $assignment) {
            $this->assertEquals('assignment', $assignment['type']);
            $this->assertEquals($this->assignedUser->id, $assignment['assigned_user_id']);
        }
    }

    /** @test */
    public function it_can_get_overdue_returns()
    {
        // Create overdue assignment
        InventoryTransaction::factory()->create([
            'type' => 'assignment',
            'assigned_user_id' => $this->assignedUser->id,
            'expected_return_date' => now()->subDays(5), // 5 days overdue
            'user_id' => $this->user->id
        ]);

        $response = $this->getJson('/api/inventory/transactions/overdue-returns');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    '*' => [
                        'id',
                        'type',
                        'expected_return_date',
                        'days_overdue',
                        'assigned_user',
                        'item'
                    ]
                ]
            ]);

        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('assignment', $response->json('data.0.type'));
        $this->assertTrue($response->json('data.0.days_overdue') > 0);
    }

    /** @test */
    public function it_can_get_transaction_statistics()
    {
        // Create various transactions
        InventoryTransaction::factory()->create([
            'type' => 'assignment',
            'user_id' => $this->user->id
        ]);
        
        InventoryTransaction::factory()->create([
            'type' => 'return',
            'user_id' => $this->user->id
        ]);

        $response = $this->getJson('/api/inventory/transactions/statistics');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'total_transactions',
                    'by_type',
                    'recent_activity',
                    'trends'
                ]
            ]);

        $this->assertEquals(2, $response->json('data.total_transactions'));
        $this->assertIsArray($response->json('data.by_type'));
    }

    /** @test */
    public function it_prevents_assignment_of_unavailable_items()
    {
        $this->item->update(['status' => 'maintenance']);

        $assignmentData = [
            'user_id' => $this->assignedUser->id,
            'quantity' => 1
        ];

        $response = $this->postJson("/api/inventory/transactions/{$this->item->id}/assign", $assignmentData);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false
            ]);
    }

    /** @test */
    public function it_prevents_stock_operations_on_non_consumable_items()
    {
        $stockData = [
            'quantity' => 10,
            'operation' => 'add'
        ];

        $response = $this->putJson("/api/inventory/transactions/{$this->item->id}/stock", $stockData);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false
            ]);
    }

    /** @test */
    public function it_prevents_cross_institution_assignments()
    {
        $otherInstitution = Institution::factory()->create();
        $otherUser = User::factory()->create([
            'institution_id' => $otherInstitution->id
        ]);

        $assignmentData = [
            'user_id' => $otherUser->id,
            'quantity' => 1
        ];

        $response = $this->postJson("/api/inventory/transactions/{$this->item->id}/assign", $assignmentData);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false
            ]);
    }

    /** @test */
    public function it_requires_authentication_for_all_endpoints()
    {
        // Remove authentication
        $this->app['auth']->forgetGuards();

        $endpoints = [
            ['POST', "/api/inventory/transactions/{$this->item->id}/assign"],
            ['POST', "/api/inventory/transactions/{$this->item->id}/return"],
            ['PUT', "/api/inventory/transactions/{$this->item->id}/stock"],
            ['GET', "/api/inventory/transactions/{$this->item->id}/history"],
            ['GET', '/api/inventory/transactions/statistics']
        ];

        foreach ($endpoints as [$method, $endpoint]) {
            $response = $this->json($method, $endpoint);
            $response->assertUnauthorized();
        }
    }

    /** @test */
    public function it_validates_transfer_destination()
    {
        $transferData = [
            'destination_institution_id' => 999999, // Non-existent institution
            'transfer_reason' => 'Test transfer'
        ];

        $response = $this->postJson("/api/inventory/transactions/{$this->item->id}/transfer", $transferData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['destination_institution_id']);
    }

    /** @test */
    public function it_handles_concurrent_assignments_safely()
    {
        // This test would ideally use database transactions to test race conditions
        // For now, we'll test the basic scenario
        
        $assignmentData = [
            'user_id' => $this->assignedUser->id,
            'quantity' => 1
        ];

        $response1 = $this->postJson("/api/inventory/transactions/{$this->item->id}/assign", $assignmentData);
        $response1->assertOk();

        // Second assignment should fail as item is now in_use
        $response2 = $this->postJson("/api/inventory/transactions/{$this->item->id}/assign", $assignmentData);
        $response2->assertStatus(400);
    }
}