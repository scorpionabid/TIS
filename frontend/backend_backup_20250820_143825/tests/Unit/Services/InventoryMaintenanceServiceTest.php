<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\InventoryItem;
use App\Models\MaintenanceRecord;
use App\Services\InventoryMaintenanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class InventoryMaintenanceServiceTest extends TestCase
{
    use RefreshDatabase;

    protected InventoryMaintenanceService $service;
    protected User $user;
    protected User $technician;
    protected Institution $institution;
    protected InventoryItem $item;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->service = new InventoryMaintenanceService();
        
        // Create test institution
        $this->institution = Institution::factory()->create([
            'name' => 'Test School',
            'type' => 'school'
        ]);
        
        // Create test users
        $this->user = User::factory()->create([
            'institution_id' => $this->institution->id
        ]);
        
        $this->technician = User::factory()->create([
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
    public function it_can_schedule_maintenance()
    {
        $data = [
            'maintenance_type' => 'repair',
            'description' => 'Fix broken screen',
            'priority' => 'high',
            'scheduled_date' => now()->addDays(3)->format('Y-m-d'),
            'estimated_cost' => 150.00,
            'estimated_duration' => 2,
            'assigned_to' => $this->technician->id,
            'parts_needed' => ['LCD Screen', 'Tools'],
            'notes' => 'Handle with care'
        ];

        $maintenance = $this->service->scheduleMaintenance($this->item, $data);

        $this->assertInstanceOf(MaintenanceRecord::class, $maintenance);
        $this->assertEquals('repair', $maintenance->maintenance_type);
        $this->assertEquals('Fix broken screen', $maintenance->description);
        $this->assertEquals('high', $maintenance->priority);
        $this->assertEquals('scheduled', $maintenance->status);
        $this->assertEquals(150.00, $maintenance->estimated_cost);
        $this->assertEquals($this->technician->id, $maintenance->assigned_to);
        $this->assertNotNull($maintenance->work_order_number);
        
        // Check item status updated
        $this->item->refresh();
        $this->assertEquals('maintenance', $this->item->status);
        
        $this->assertDatabaseHas('maintenance_records', [
            'inventory_item_id' => $this->item->id,
            'maintenance_type' => 'repair',
            'status' => 'scheduled'
        ]);
    }

    /** @test */
    public function it_generates_unique_work_order_numbers()
    {
        $data = [
            'maintenance_type' => 'preventive',
            'description' => 'Regular maintenance',
            'scheduled_date' => now()->addDays(1)->format('Y-m-d')
        ];

        $maintenance1 = $this->service->scheduleMaintenance($this->item, $data);
        
        $item2 = InventoryItem::factory()->create([
            'institution_id' => $this->institution->id
        ]);
        
        $maintenance2 = $this->service->scheduleMaintenance($item2, $data);

        $this->assertNotEquals($maintenance1->work_order_number, $maintenance2->work_order_number);
        $this->assertStringStartsWith('WO-', $maintenance1->work_order_number);
        $this->assertStringStartsWith('WO-', $maintenance2->work_order_number);
    }

    /** @test */
    public function it_can_start_maintenance()
    {
        $maintenance = MaintenanceRecord::factory()->create([
            'inventory_item_id' => $this->item->id,
            'status' => 'scheduled',
            'assigned_to' => $this->technician->id
        ]);

        $data = [
            'actual_start_date' => now()->format('Y-m-d H:i:s'),
            'notes' => 'Started maintenance work'
        ];

        $updatedMaintenance = $this->service->startMaintenance($maintenance, $data);

        $this->assertEquals('in_progress', $updatedMaintenance->status);
        $this->assertNotNull($updatedMaintenance->actual_start_date);
        $this->assertEquals('Started maintenance work', $updatedMaintenance->notes);
        
        $this->assertDatabaseHas('maintenance_records', [
            'id' => $maintenance->id,
            'status' => 'in_progress'
        ]);
    }

    /** @test */
    public function it_can_complete_maintenance()
    {
        $maintenance = MaintenanceRecord::factory()->create([
            'inventory_item_id' => $this->item->id,
            'status' => 'in_progress',
            'estimated_cost' => 150.00
        ]);

        $data = [
            'actual_completion_date' => now()->format('Y-m-d H:i:s'),
            'actual_cost' => 175.00,
            'actual_duration' => 3,
            'work_performed' => 'Replaced screen and cleaned internals',
            'parts_used' => ['LCD Screen', 'Cleaning supplies'],
            'condition_after' => 'excellent',
            'notes' => 'Maintenance completed successfully'
        ];

        $completedMaintenance = $this->service->completeMaintenance($maintenance, $data);

        $this->assertEquals('completed', $completedMaintenance->status);
        $this->assertNotNull($completedMaintenance->actual_completion_date);
        $this->assertEquals(175.00, $completedMaintenance->actual_cost);
        $this->assertEquals(3, $completedMaintenance->actual_duration);
        $this->assertEquals('excellent', $completedMaintenance->condition_after);
        
        // Check item status updated
        $this->item->refresh();
        $this->assertEquals('available', $this->item->status);
        $this->assertEquals('excellent', $this->item->condition);
        
        $this->assertDatabaseHas('maintenance_records', [
            'id' => $maintenance->id,
            'status' => 'completed',
            'actual_cost' => 175.00
        ]);
    }

    /** @test */
    public function it_can_cancel_maintenance()
    {
        $maintenance = MaintenanceRecord::factory()->create([
            'inventory_item_id' => $this->item->id,
            'status' => 'scheduled'
        ]);

        $data = [
            'cancellation_reason' => 'Item no longer needs repair',
            'cancelled_by' => $this->user->id
        ];

        $cancelledMaintenance = $this->service->cancelMaintenance($maintenance, $data);

        $this->assertEquals('cancelled', $cancelledMaintenance->status);
        $this->assertEquals('Item no longer needs repair', $cancelledMaintenance->cancellation_reason);
        $this->assertEquals($this->user->id, $cancelledMaintenance->cancelled_by);
        
        // Check item status reverted
        $this->item->refresh();
        $this->assertEquals('available', $this->item->status);
        
        $this->assertDatabaseHas('maintenance_records', [
            'id' => $maintenance->id,
            'status' => 'cancelled'
        ]);
    }

    /** @test */
    public function it_can_get_maintenance_records_for_item()
    {
        MaintenanceRecord::factory()->count(3)->create([
            'inventory_item_id' => $this->item->id
        ]);

        $records = $this->service->getMaintenanceRecords($this->item);

        $this->assertCount(3, $records);
        $this->assertInstanceOf(MaintenanceRecord::class, $records->first());
    }

    /** @test */
    public function it_can_get_maintenance_schedule()
    {
        $startDate = now()->startOfWeek();
        $endDate = now()->endOfWeek();

        // Create maintenance within date range
        MaintenanceRecord::factory()->create([
            'scheduled_date' => now()->addDays(2),
            'status' => 'scheduled'
        ]);

        // Create maintenance outside date range
        MaintenanceRecord::factory()->create([
            'scheduled_date' => now()->addWeeks(2),
            'status' => 'scheduled'
        ]);

        $schedule = $this->service->getMaintenanceSchedule($startDate, $endDate);

        $this->assertCount(1, $schedule);
        $this->assertTrue($schedule->first()->scheduled_date->between($startDate, $endDate));
    }

    /** @test */
    public function it_can_get_upcoming_due_maintenance()
    {
        // Create maintenance due soon
        MaintenanceRecord::factory()->create([
            'scheduled_date' => now()->addDays(2),
            'status' => 'scheduled'
        ]);

        // Create maintenance due later
        MaintenanceRecord::factory()->create([
            'scheduled_date' => now()->addDays(10),
            'status' => 'scheduled'
        ]);

        $upcomingDue = $this->service->getUpcomingDueMaintenance(7); // Next 7 days

        $this->assertCount(1, $upcomingDue);
        $this->assertTrue($upcomingDue->first()->scheduled_date->between(now(), now()->addDays(7)));
    }

    /** @test */
    public function it_can_get_overdue_maintenance()
    {
        // Create overdue maintenance
        MaintenanceRecord::factory()->create([
            'scheduled_date' => now()->subDays(5),
            'status' => 'scheduled'
        ]);

        // Create future maintenance
        MaintenanceRecord::factory()->create([
            'scheduled_date' => now()->addDays(5),
            'status' => 'scheduled'
        ]);

        $overdue = $this->service->getOverdueMaintenance();

        $this->assertCount(1, $overdue);
        $this->assertTrue($overdue->first()->scheduled_date->isPast());
        $this->assertEquals('scheduled', $overdue->first()->status);
    }

    /** @test */
    public function it_can_get_maintenance_calendar()
    {
        $year = now()->year;
        $month = now()->month;

        // Create maintenance in current month
        MaintenanceRecord::factory()->create([
            'scheduled_date' => now()->setDay(15),
            'status' => 'scheduled'
        ]);

        $calendar = $this->service->getMaintenanceCalendar($year, $month);

        $this->assertIsArray($calendar);
        $this->assertArrayHasKey('events', $calendar);
        $this->assertCount(1, $calendar['events']);
    }

    /** @test */
    public function it_can_perform_bulk_maintenance_scheduling()
    {
        $items = InventoryItem::factory()->count(3)->create([
            'institution_id' => $this->institution->id
        ]);

        $data = [
            'item_ids' => $items->pluck('id')->toArray(),
            'maintenance_type' => 'preventive',
            'description' => 'Annual maintenance check',
            'scheduled_date' => now()->addDays(7)->format('Y-m-d'),
            'assigned_to' => $this->technician->id
        ];

        $result = $this->service->bulkScheduleMaintenance($data);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('successful_schedules', $result);
        $this->assertArrayHasKey('failed_schedules', $result);
        $this->assertCount(3, $result['successful_schedules']);
        
        // Check maintenance records created
        $this->assertDatabaseCount('maintenance_records', 3);
        
        // Check items status updated
        foreach ($items as $item) {
            $item->refresh();
            $this->assertEquals('maintenance', $item->status);
        }
    }

    /** @test */
    public function it_can_get_maintenance_statistics()
    {
        // Create various maintenance records
        MaintenanceRecord::factory()->create([
            'status' => 'completed',
            'maintenance_type' => 'repair',
            'actual_cost' => 100.00
        ]);
        
        MaintenanceRecord::factory()->create([
            'status' => 'in_progress',
            'maintenance_type' => 'preventive',
            'estimated_cost' => 50.00
        ]);

        $statistics = $this->service->getMaintenanceStatistics();

        $this->assertIsArray($statistics);
        $this->assertArrayHasKey('total_records', $statistics);
        $this->assertArrayHasKey('by_status', $statistics);
        $this->assertArrayHasKey('by_type', $statistics);
        $this->assertArrayHasKey('cost_summary', $statistics);
        $this->assertEquals(2, $statistics['total_records']);
    }

    /** @test */
    public function it_can_get_maintenance_cost_summary()
    {
        // Create completed maintenance with costs
        MaintenanceRecord::factory()->create([
            'status' => 'completed',
            'estimated_cost' => 100.00,
            'actual_cost' => 120.00
        ]);
        
        MaintenanceRecord::factory()->create([
            'status' => 'completed',
            'estimated_cost' => 200.00,
            'actual_cost' => 180.00
        ]);

        $costSummary = $this->service->getMaintenanceCostSummary();

        $this->assertIsArray($costSummary);
        $this->assertArrayHasKey('total_estimated', $costSummary);
        $this->assertArrayHasKey('total_actual', $costSummary);
        $this->assertArrayHasKey('variance', $costSummary);
        $this->assertEquals(300.00, $costSummary['total_estimated']);
        $this->assertEquals(300.00, $costSummary['total_actual']);
    }

    /** @test */
    public function it_validates_maintenance_scheduling_permissions()
    {
        // Try to schedule maintenance for item from different institution
        $otherInstitution = Institution::factory()->create();
        $otherItem = InventoryItem::factory()->create([
            'institution_id' => $otherInstitution->id
        ]);

        $this->expectException(\Exception::class);

        $data = [
            'maintenance_type' => 'repair',
            'description' => 'Fix issue',
            'scheduled_date' => now()->addDays(1)->format('Y-m-d')
        ];

        $this->service->scheduleMaintenance($otherItem, $data);
    }

    /** @test */
    public function it_prevents_scheduling_maintenance_on_retired_items()
    {
        $this->item->update(['status' => 'retired']);

        $this->expectException(\Exception::class);

        $data = [
            'maintenance_type' => 'repair',
            'description' => 'Fix issue',
            'scheduled_date' => now()->addDays(1)->format('Y-m-d')
        ];

        $this->service->scheduleMaintenance($this->item, $data);
    }

    /** @test */
    public function it_calculates_maintenance_duration_correctly()
    {
        $maintenance = MaintenanceRecord::factory()->create([
            'inventory_item_id' => $this->item->id,
            'status' => 'in_progress',
            'actual_start_date' => now()->subHours(5)
        ]);

        $data = [
            'actual_completion_date' => now()->format('Y-m-d H:i:s'),
            'work_performed' => 'Completed repair',
            'condition_after' => 'good'
        ];

        $completedMaintenance = $this->service->completeMaintenance($maintenance, $data);

        $this->assertNotNull($completedMaintenance->actual_duration);
        $this->assertEquals(5, $completedMaintenance->actual_duration);
    }
}