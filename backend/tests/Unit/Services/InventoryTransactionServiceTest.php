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
            'is_consumable' => false,
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
        $this->assertEquals('assignment', $transaction->transaction_type);
        $this->assertEquals($this->assignedUser->id, $transaction->assigned_to);
        $this->assertEquals(1, $transaction->quantity);
        $this->assertEquals('Assigned for testing', $transaction->notes);
        
        // Check item status updated
        $this->item->refresh();
        $this->assertEquals('in_use', $this->item->status);
        $this->assertEquals($this->assignedUser->id, $this->item->assigned_to);
        
        $this->assertDatabaseHas('inventory_transactions', [
            'transaction_type' => 'assignment',
            'item_id' => $this->item->id,
            'assigned_to' => $this->assignedUser->id
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
            'notes' => 'Returned in good condition',
            'damage_report' => null
        ];

        $transaction = $this->service->returnItem($this->item, $data);

        $this->assertInstanceOf(InventoryTransaction::class, $transaction);
        $this->assertEquals('return', $transaction->transaction_type);
        $this->assertEquals('Returned in good condition', $transaction->notes);
        
        // Check item status updated
        $this->item->refresh();
        $this->assertEquals('available', $this->item->status);
        $this->assertNull($this->item->assigned_to);
        
        $this->assertDatabaseHas('inventory_transactions', [
            'transaction_type' => 'return',
            'item_id' => $this->item->id
        ]);
    }

    /** @test */
    public function it_can_update_stock_for_consumable_items()
    {
        $consumableItem = InventoryItem::factory()->create([
            'name' => 'Paper Supplies',
            'is_consumable' => true,
            'stock_quantity' => 50,
            'unit_of_measure' => 'sheets',
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
        $this->assertEquals('adjustment_increase', $transaction->transaction_type);
        $this->assertEquals(100, $transaction->quantity);
        $this->assertEquals('New stock received', $transaction->description);
        
        // Check item quantity updated
        $consumableItem->refresh();
        $this->assertEquals(150, $consumableItem->stock_quantity); // 50 + 100
        
        $this->assertDatabaseHas('inventory_transactions', [
            'transaction_type' => 'adjustment_increase',
            'item_id' => $consumableItem->id,
            'quantity' => 100
        ]);
    }

    /** @test */
    public function it_can_reduce_stock_for_consumable_items()
    {
        $consumableItem = InventoryItem::factory()->create([
            'name' => 'Paper Supplies',
            'is_consumable' => true,
            'stock_quantity' => 100,
            'unit_of_measure' => 'sheets',
            'institution_id' => $this->institution->id
        ]);

        $data = [
            'quantity' => 30,
            'operation' => 'subtract',
            'reason' => 'Used in classes'
        ];

        $transaction = $this->service->updateStock($consumableItem, $data);

        $this->assertEquals('adjustment_decrease', $transaction->transaction_type);
        $this->assertEquals(30, $transaction->quantity);
        
        // Check item quantity updated
        $consumableItem->refresh();
        $this->assertEquals(70, $consumableItem->stock_quantity); // 100 - 30
    }

    /** @test */
    public function it_can_transfer_item_between_locations()
    {
        $destinationInstitution = Institution::factory()->create([
            'name' => 'Destination School'
        ]);

        $data = [
            'location' => 'Destination School',
            'institution_id' => $destinationInstitution->id,
            'reason' => 'Relocated to new campus'
        ];

        $transaction = $this->service->transferItem($this->item, $data);

        $this->assertInstanceOf(InventoryTransaction::class, $transaction);
        $this->assertEquals('transfer', $transaction->transaction_type);
        $this->assertEquals('Destination School', $transaction->location_to);
        $this->assertEquals('Relocated to new campus', $transaction->description);
        
        // Check item institution updated
        $this->item->refresh();
        $this->assertEquals($destinationInstitution->id, $this->item->institution_id);
        
        $this->assertDatabaseHas('inventory_transactions', [
            'transaction_type' => 'transfer',
            'item_id' => $this->item->id,
            'location_to' => 'Destination School'
        ]);
    }

    /** @test */
    public function it_can_get_transaction_history()
    {
        // Create multiple transactions
        InventoryTransaction::factory()->count(3)->create([
            'item_id' => $this->item->id,
            'user_id' => $this->user->id
        ]);

        $history = $this->service->getTransactionHistory($this->item);

        $this->assertIsArray($history);
        $this->assertArrayHasKey('transactions', $history);
        $this->assertArrayHasKey('summary', $history);
    }

    /** @test */
    public function it_can_get_transaction_summary()
    {
        // Create different types of transactions
        InventoryTransaction::factory()->create([
            'item_id' => $this->item->id,
            'transaction_type' => 'assignment',
            'user_id' => $this->user->id
        ]);
        
        InventoryTransaction::factory()->create([
            'item_id' => $this->item->id,
            'transaction_type' => 'return',
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
        $this->markTestSkipped('bulkAssignPreview method not implemented in service');
    }

    /** @test */
    public function it_can_perform_bulk_assignment()
    {
        $this->markTestSkipped('bulkAssign method not implemented in service');
    }

    /** @test */
    public function it_can_get_user_assignments()
    {
        $this->markTestSkipped('getUserAssignments method not implemented in service');
    }

    /** @test */
    public function it_can_get_overdue_returns()
    {
        $this->markTestSkipped('getOverdueReturns method not implemented in service');
    }

    /** @test */
    public function it_can_get_transaction_statistics()
    {
        $this->markTestSkipped('getTransactionStatistics method not implemented in service');
    }

    /** @test */
    public function it_validates_assignment_permissions()
    {
        $this->markTestSkipped('Institution-based assignment validation not implemented in service');
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