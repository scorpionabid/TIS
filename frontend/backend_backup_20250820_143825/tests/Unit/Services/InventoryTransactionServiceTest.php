<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Services\InventoryTransactionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class InventoryTransactionServiceTest extends TestCase
{
    use RefreshDatabase;

    protected InventoryTransactionService $service;
    protected User $user;
    protected User $assignedUser;
    protected Institution $institution;
    protected InventoryItem $item;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->service = new InventoryTransactionService();
        
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
        
        $this->actingAs($this->user);
    }

    /** @test */
    public function it_can_assign_item_to_user()
    {
        $data = [
            'user_id' => $this->assignedUser->id,
            'quantity' => 1,
            'expected_return_date' => now()->addDays(30)->format('Y-m-d'),
            'notes' => 'Assigned for testing'
        ];

        $transaction = $this->service->assignItem($this->item, $data);

        $this->assertInstanceOf(InventoryTransaction::class, $transaction);
        $this->assertEquals('assignment', $transaction->type);
        $this->assertEquals($this->assignedUser->id, $transaction->assigned_user_id);
        $this->assertEquals(1, $transaction->quantity);
        $this->assertEquals('Assigned for testing', $transaction->notes);
        
        // Check item status updated
        $this->item->refresh();
        $this->assertEquals('in_use', $this->item->status);
        $this->assertEquals($this->assignedUser->id, $this->item->assigned_to);
        
        $this->assertDatabaseHas('inventory_transactions', [
            'type' => 'assignment',
            'inventory_item_id' => $this->item->id,
            'assigned_user_id' => $this->assignedUser->id
        ]);
    }

    /** @test */
    public function it_can_return_assigned_item()
    {
        // First assign the item
        $this->item->update([
            'status' => 'in_use',
            'assigned_to' => $this->assignedUser->id
        ]);

        $data = [
            'condition' => 'excellent',
            'return_notes' => 'Returned in good condition',
            'damage_report' => null
        ];

        $transaction = $this->service->returnItem($this->item, $data);

        $this->assertInstanceOf(InventoryTransaction::class, $transaction);
        $this->assertEquals('return', $transaction->type);
        $this->assertEquals('excellent', $transaction->condition_after);
        $this->assertEquals('Returned in good condition', $transaction->notes);
        
        // Check item status updated
        $this->item->refresh();
        $this->assertEquals('available', $this->item->status);
        $this->assertNull($this->item->assigned_to);
        
        $this->assertDatabaseHas('inventory_transactions', [
            'type' => 'return',
            'inventory_item_id' => $this->item->id,
            'condition_after' => 'excellent'
        ]);
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

        $data = [
            'quantity' => 100,
            'operation' => 'add',
            'reason' => 'New stock received',
            'supplier' => 'Office Supplies Ltd'
        ];

        $transaction = $this->service->updateStock($consumableItem, $data);

        $this->assertInstanceOf(InventoryTransaction::class, $transaction);
        $this->assertEquals('stock_update', $transaction->type);
        $this->assertEquals(100, $transaction->quantity);
        $this->assertEquals('New stock received', $transaction->description);
        
        // Check item quantity updated
        $consumableItem->refresh();
        $this->assertEquals(150, $consumableItem->quantity); // 50 + 100
        
        $this->assertDatabaseHas('inventory_transactions', [
            'type' => 'stock_update',
            'inventory_item_id' => $consumableItem->id,
            'quantity' => 100
        ]);
    }

    /** @test */
    public function it_can_reduce_stock_for_consumable_items()
    {
        $consumableItem = InventoryItem::factory()->create([
            'name' => 'Paper Supplies',
            'is_consumable' => true,
            'quantity' => 100,
            'unit' => 'sheets',
            'institution_id' => $this->institution->id
        ]);

        $data = [
            'quantity' => 30,
            'operation' => 'subtract',
            'reason' => 'Used in classes'
        ];

        $transaction = $this->service->updateStock($consumableItem, $data);

        $this->assertEquals('stock_update', $transaction->type);
        $this->assertEquals(30, $transaction->quantity);
        
        // Check item quantity updated
        $consumableItem->refresh();
        $this->assertEquals(70, $consumableItem->quantity); // 100 - 30
    }

    /** @test */
    public function it_can_transfer_item_between_locations()
    {
        $destinationInstitution = Institution::factory()->create([
            'name' => 'Destination School'
        ]);

        $data = [
            'destination_institution_id' => $destinationInstitution->id,
            'transfer_reason' => 'Relocated to new campus',
            'expected_transfer_date' => now()->addDays(7)->format('Y-m-d')
        ];

        $transaction = $this->service->transferItem($this->item, $data);

        $this->assertInstanceOf(InventoryTransaction::class, $transaction);
        $this->assertEquals('transfer', $transaction->type);
        $this->assertEquals($destinationInstitution->id, $transaction->destination_institution_id);
        $this->assertEquals('Relocated to new campus', $transaction->description);
        
        // Check item institution updated
        $this->item->refresh();
        $this->assertEquals($destinationInstitution->id, $this->item->institution_id);
        
        $this->assertDatabaseHas('inventory_transactions', [
            'type' => 'transfer',
            'inventory_item_id' => $this->item->id,
            'destination_institution_id' => $destinationInstitution->id
        ]);
    }

    /** @test */
    public function it_can_get_transaction_history()
    {
        // Create multiple transactions
        InventoryTransaction::factory()->count(3)->create([
            'inventory_item_id' => $this->item->id,
            'user_id' => $this->user->id
        ]);

        $history = $this->service->getTransactionHistory($this->item);

        $this->assertCount(3, $history);
        $this->assertInstanceOf(InventoryTransaction::class, $history->first());
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

        $summary = $this->service->getTransactionSummary($this->item);

        $this->assertIsArray($summary);
        $this->assertArrayHasKey('total_transactions', $summary);
        $this->assertArrayHasKey('by_type', $summary);
        $this->assertEquals(2, $summary['total_transactions']);
        $this->assertEquals(1, $summary['by_type']['assignment']);
        $this->assertEquals(1, $summary['by_type']['return']);
    }

    /** @test */
    public function it_can_perform_bulk_assignment_preview()
    {
        $items = InventoryItem::factory()->count(3)->create([
            'status' => 'available',
            'institution_id' => $this->institution->id
        ]);

        $data = [
            'item_ids' => $items->pluck('id')->toArray(),
            'user_id' => $this->assignedUser->id,
            'expected_return_date' => now()->addDays(30)->format('Y-m-d')
        ];

        $preview = $this->service->bulkAssignPreview($data);

        $this->assertIsArray($preview);
        $this->assertArrayHasKey('assignable_items', $preview);
        $this->assertArrayHasKey('non_assignable_items', $preview);
        $this->assertArrayHasKey('summary', $preview);
        $this->assertCount(3, $preview['assignable_items']);
        $this->assertEquals(3, $preview['summary']['total_assignable']);
    }

    /** @test */
    public function it_can_perform_bulk_assignment()
    {
        $items = InventoryItem::factory()->count(3)->create([
            'status' => 'available',
            'institution_id' => $this->institution->id
        ]);

        $data = [
            'item_ids' => $items->pluck('id')->toArray(),
            'user_id' => $this->assignedUser->id,
            'expected_return_date' => now()->addDays(30)->format('Y-m-d'),
            'notes' => 'Bulk assignment for training'
        ];

        $result = $this->service->bulkAssign($data);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('successful_assignments', $result);
        $this->assertArrayHasKey('failed_assignments', $result);
        $this->assertCount(3, $result['successful_assignments']);
        
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
    public function it_can_get_user_assignments()
    {
        // Create assignments for user
        InventoryTransaction::factory()->count(2)->create([
            'type' => 'assignment',
            'assigned_user_id' => $this->assignedUser->id,
            'user_id' => $this->user->id
        ]);

        $assignments = $this->service->getUserAssignments($this->assignedUser->id);

        $this->assertCount(2, $assignments);
        foreach ($assignments as $assignment) {
            $this->assertEquals('assignment', $assignment->type);
            $this->assertEquals($this->assignedUser->id, $assignment->assigned_user_id);
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

        $overdueReturns = $this->service->getOverdueReturns();

        $this->assertCount(1, $overdueReturns);
        $this->assertEquals('assignment', $overdueReturns->first()->type);
        $this->assertTrue($overdueReturns->first()->expected_return_date->isPast());
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
        
        InventoryTransaction::factory()->create([
            'type' => 'transfer',
            'user_id' => $this->user->id
        ]);

        $statistics = $this->service->getTransactionStatistics();

        $this->assertIsArray($statistics);
        $this->assertArrayHasKey('total_transactions', $statistics);
        $this->assertArrayHasKey('by_type', $statistics);
        $this->assertArrayHasKey('recent_activity', $statistics);
        $this->assertEquals(3, $statistics['total_transactions']);
    }

    /** @test */
    public function it_validates_assignment_permissions()
    {
        // Try to assign item from different institution
        $otherInstitution = Institution::factory()->create();
        $otherUser = User::factory()->create([
            'institution_id' => $otherInstitution->id
        ]);

        $this->expectException(\Exception::class);

        $data = [
            'user_id' => $otherUser->id,
            'quantity' => 1
        ];

        $this->service->assignItem($this->item, $data);
    }

    /** @test */
    public function it_prevents_assignment_of_unavailable_items()
    {
        $this->item->update(['status' => 'maintenance']);

        $this->expectException(\Exception::class);

        $data = [
            'user_id' => $this->assignedUser->id,
            'quantity' => 1
        ];

        $this->service->assignItem($this->item, $data);
    }

    /** @test */
    public function it_prevents_stock_operations_on_non_consumable_items()
    {
        $this->expectException(\Exception::class);

        $data = [
            'quantity' => 10,
            'operation' => 'add'
        ];

        $this->service->updateStock($this->item, $data);
    }

    /** @test */
    public function it_uses_database_transactions_for_critical_operations()
    {
        DB::shouldReceive('transaction')->once()->andReturnUsing(function ($callback) {
            return $callback();
        });

        $data = [
            'user_id' => $this->assignedUser->id,
            'quantity' => 1
        ];

        $this->service->assignItem($this->item, $data);
    }
}