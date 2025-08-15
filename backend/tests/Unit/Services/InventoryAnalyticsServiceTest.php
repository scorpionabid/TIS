<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\MaintenanceRecord;
use App\Services\InventoryAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class InventoryAnalyticsServiceTest extends TestCase
{
    use RefreshDatabase;

    protected InventoryAnalyticsService $service;
    protected User $user;
    protected Institution $institution;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->service = new InventoryAnalyticsService();
        
        // Create test institution
        $this->institution = Institution::factory()->create([
            'name' => 'Test School',
            'type' => 'school'
        ]);
        
        // Create test user
        $this->user = User::factory()->create([
            'institution_id' => $this->institution->id
        ]);
        
        $this->actingAs($this->user);
    }

    /** @test */
    public function it_can_get_comprehensive_inventory_statistics()
    {
        // Create test inventory items
        InventoryItem::factory()->create([
            'category' => 'electronics',
            'status' => 'available',
            'condition' => 'excellent',
            'purchase_price' => 1000.00,
            'current_value' => 800.00,
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->create([
            'category' => 'furniture',
            'status' => 'in_use',
            'condition' => 'good',
            'purchase_price' => 500.00,
            'current_value' => 400.00,
            'institution_id' => $this->institution->id
        ]);

        $statistics = $this->service->getInventoryStatistics();

        $this->assertIsArray($statistics);
        $this->assertArrayHasKey('overview', $statistics);
        $this->assertArrayHasKey('by_category', $statistics);
        $this->assertArrayHasKey('by_status', $statistics);
        $this->assertArrayHasKey('by_condition', $statistics);
        $this->assertArrayHasKey('alerts', $statistics);
        
        // Check overview statistics
        $this->assertEquals(2, $statistics['overview']['total_items']);
        $this->assertEquals(1500.00, $statistics['overview']['total_purchase_value']);
        $this->assertEquals(1200.00, $statistics['overview']['total_current_value']);
        
        // Check category breakdown
        $this->assertEquals(1, $statistics['by_category']['electronics']['count']);
        $this->assertEquals(1, $statistics['by_category']['furniture']['count']);
        
        // Check status breakdown
        $this->assertEquals(1, $statistics['by_status']['available']);
        $this->assertEquals(1, $statistics['by_status']['in_use']);
    }

    /** @test */
    public function it_can_get_dashboard_analytics()
    {
        // Create test data
        InventoryItem::factory()->count(10)->create([
            'institution_id' => $this->institution->id
        ]);

        $dashboard = $this->service->getDashboardAnalytics();

        $this->assertIsArray($dashboard);
        $this->assertArrayHasKey('summary_cards', $dashboard);
        $this->assertArrayHasKey('recent_activity', $dashboard);
        $this->assertArrayHasKey('alerts', $dashboard);
        $this->assertArrayHasKey('charts_data', $dashboard);
    }

    /** @test */
    public function it_can_calculate_inventory_valuation()
    {
        InventoryItem::factory()->create([
            'name' => 'Laptop',
            'purchase_price' => 1000.00,
            'current_value' => 800.00,
            'depreciation_rate' => 20.0,
            'purchase_date' => now()->subYear(),
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->create([
            'name' => 'Desk',
            'purchase_price' => 300.00,
            'current_value' => 250.00,
            'depreciation_rate' => 10.0,
            'purchase_date' => now()->subMonths(6),
            'institution_id' => $this->institution->id
        ]);

        $valuation = $this->service->getInventoryValuation();

        $this->assertIsArray($valuation);
        $this->assertArrayHasKey('total_purchase_value', $valuation);
        $this->assertArrayHasKey('total_current_value', $valuation);
        $this->assertArrayHasKey('total_depreciation', $valuation);
        $this->assertArrayHasKey('depreciation_percentage', $valuation);
        $this->assertArrayHasKey('by_category', $valuation);
        
        $this->assertEquals(1300.00, $valuation['total_purchase_value']);
        $this->assertEquals(1050.00, $valuation['total_current_value']);
        $this->assertEquals(250.00, $valuation['total_depreciation']);
    }

    /** @test */
    public function it_can_analyze_depreciation()
    {
        $purchaseDate = now()->subYears(2);
        
        InventoryItem::factory()->create([
            'purchase_price' => 1000.00,
            'current_value' => 600.00,
            'depreciation_rate' => 20.0,
            'purchase_date' => $purchaseDate,
            'institution_id' => $this->institution->id
        ]);

        $depreciation = $this->service->getDepreciationAnalysis();

        $this->assertIsArray($depreciation);
        $this->assertArrayHasKey('total_depreciation', $depreciation);
        $this->assertArrayHasKey('average_depreciation_rate', $depreciation);
        $this->assertArrayHasKey('projected_values', $depreciation);
        $this->assertArrayHasKey('depreciation_schedule', $depreciation);
    }

    /** @test */
    public function it_can_analyze_cost_trends()
    {
        // Create items purchased in different months
        InventoryItem::factory()->create([
            'purchase_price' => 1000.00,
            'purchase_date' => now()->subMonths(3),
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->create([
            'purchase_price' => 1500.00,
            'purchase_date' => now()->subMonths(2),
            'institution_id' => $this->institution->id
        ]);

        $trends = $this->service->getCostTrends();

        $this->assertIsArray($trends);
        $this->assertArrayHasKey('monthly_purchases', $trends);
        $this->assertArrayHasKey('category_trends', $trends);
        $this->assertArrayHasKey('average_item_cost', $trends);
    }

    /** @test */
    public function it_can_calculate_roi_analysis()
    {
        InventoryItem::factory()->create([
            'name' => 'Production Equipment',
            'purchase_price' => 5000.00,
            'current_value' => 3000.00,
            'purchase_date' => now()->subYears(2),
            'institution_id' => $this->institution->id
        ]);

        $roi = $this->service->getRoiAnalysis();

        $this->assertIsArray($roi);
        $this->assertArrayHasKey('total_investment', $roi);
        $this->assertArrayHasKey('current_asset_value', $roi);
        $this->assertArrayHasKey('utilization_metrics', $roi);
        $this->assertArrayHasKey('cost_per_use', $roi);
    }

    /** @test */
    public function it_can_analyze_utilization()
    {
        // Create items with different statuses
        InventoryItem::factory()->create([
            'status' => 'in_use',
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->create([
            'status' => 'available',
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->create([
            'status' => 'maintenance',
            'institution_id' => $this->institution->id
        ]);

        $utilization = $this->service->getUtilizationReport();

        $this->assertIsArray($utilization);
        $this->assertArrayHasKey('overall_utilization', $utilization);
        $this->assertArrayHasKey('by_category', $utilization);
        $this->assertArrayHasKey('underutilized_items', $utilization);
        $this->assertArrayHasKey('high_demand_items', $utilization);
    }

    /** @test */
    public function it_can_analyze_category_performance()
    {
        // Create items in different categories
        InventoryItem::factory()->count(3)->create([
            'category' => 'electronics',
            'purchase_price' => 1000.00,
            'current_value' => 800.00,
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->count(2)->create([
            'category' => 'furniture',
            'purchase_price' => 500.00,
            'current_value' => 450.00,
            'institution_id' => $this->institution->id
        ]);

        $performance = $this->service->getCategoryPerformance();

        $this->assertIsArray($performance);
        $this->assertArrayHasKey('by_category', $performance);
        $this->assertArrayHasKey('best_performing', $performance);
        $this->assertArrayHasKey('worst_performing', $performance);
        
        // Check electronics category
        $this->assertEquals(3, $performance['by_category']['electronics']['count']);
        $this->assertEquals(3000.00, $performance['by_category']['electronics']['total_value']);
    }

    /** @test */
    public function it_can_compare_institutions()
    {
        $otherInstitution = Institution::factory()->create();
        
        // Create items for current institution
        InventoryItem::factory()->count(5)->create([
            'purchase_price' => 1000.00,
            'institution_id' => $this->institution->id
        ]);
        
        // Create items for other institution
        InventoryItem::factory()->count(3)->create([
            'purchase_price' => 800.00,
            'institution_id' => $otherInstitution->id
        ]);

        $comparison = $this->service->getInstitutionComparison();

        $this->assertIsArray($comparison);
        $this->assertArrayHasKey('summary', $comparison);
        $this->assertArrayHasKey('by_institution', $comparison);
        $this->assertArrayHasKey('benchmarks', $comparison);
    }

    /** @test */
    public function it_can_analyze_asset_lifecycle()
    {
        InventoryItem::factory()->create([
            'purchase_date' => now()->subYears(3),
            'status' => 'retired',
            'condition' => 'poor',
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->create([
            'purchase_date' => now()->subYear(),
            'status' => 'in_use',
            'condition' => 'good',
            'institution_id' => $this->institution->id
        ]);

        $lifecycle = $this->service->getAssetLifecycleAnalysis();

        $this->assertIsArray($lifecycle);
        $this->assertArrayHasKey('age_distribution', $lifecycle);
        $this->assertArrayHasKey('lifecycle_stages', $lifecycle);
        $this->assertArrayHasKey('replacement_schedule', $lifecycle);
        $this->assertArrayHasKey('end_of_life_predictions', $lifecycle);
    }

    /** @test */
    public function it_can_analyze_maintenance_costs()
    {
        $item = InventoryItem::factory()->create([
            'institution_id' => $this->institution->id
        ]);
        
        MaintenanceRecord::factory()->create([
            'inventory_item_id' => $item->id,
            'status' => 'completed',
            'actual_cost' => 150.00,
            'maintenance_type' => 'repair'
        ]);
        
        MaintenanceRecord::factory()->create([
            'inventory_item_id' => $item->id,
            'status' => 'completed',
            'actual_cost' => 75.00,
            'maintenance_type' => 'preventive'
        ]);

        $maintenanceCosts = $this->service->getMaintenanceCosts();

        $this->assertIsArray($maintenanceCosts);
        $this->assertArrayHasKey('total_costs', $maintenanceCosts);
        $this->assertArrayHasKey('by_type', $maintenanceCosts);
        $this->assertArrayHasKey('cost_per_item', $maintenanceCosts);
        $this->assertArrayHasKey('trends', $maintenanceCosts);
        
        $this->assertEquals(225.00, $maintenanceCosts['total_costs']);
    }

    /** @test */
    public function it_can_generate_predictive_analytics()
    {
        // Create historical data
        InventoryItem::factory()->count(10)->create([
            'purchase_date' => now()->subMonths(rand(1, 12)),
            'depreciation_rate' => rand(10, 30),
            'institution_id' => $this->institution->id
        ]);

        $predictive = $this->service->getPredictiveAnalytics();

        $this->assertIsArray($predictive);
        $this->assertArrayHasKey('demand_forecast', $predictive);
        $this->assertArrayHasKey('maintenance_predictions', $predictive);
        $this->assertArrayHasKey('replacement_schedule', $predictive);
        $this->assertArrayHasKey('budget_projections', $predictive);
    }

    /** @test */
    public function it_can_generate_compliance_report()
    {
        InventoryItem::factory()->create([
            'warranty_expiry' => now()->addDays(30), // Expiring soon
            'institution_id' => $this->institution->id
        ]);
        
        InventoryItem::factory()->create([
            'warranty_expiry' => now()->subDays(30), // Expired
            'institution_id' => $this->institution->id
        ]);

        $compliance = $this->service->getComplianceReport();

        $this->assertIsArray($compliance);
        $this->assertArrayHasKey('warranty_compliance', $compliance);
        $this->assertArrayHasKey('maintenance_compliance', $compliance);
        $this->assertArrayHasKey('documentation_completeness', $compliance);
        $this->assertArrayHasKey('alerts', $compliance);
    }

    /** @test */
    public function it_can_calculate_performance_benchmarks()
    {
        // Create diverse inventory data
        InventoryItem::factory()->count(20)->create([
            'institution_id' => $this->institution->id,
            'purchase_price' => rand(100, 2000),
            'current_value' => rand(50, 1500),
            'status' => collect(['available', 'in_use', 'maintenance'])->random()
        ]);

        $benchmarks = $this->service->getBenchmarks();

        $this->assertIsArray($benchmarks);
        $this->assertArrayHasKey('utilization_benchmark', $benchmarks);
        $this->assertArrayHasKey('cost_efficiency_benchmark', $benchmarks);
        $this->assertArrayHasKey('maintenance_efficiency_benchmark', $benchmarks);
        $this->assertArrayHasKey('industry_comparison', $benchmarks);
    }

    /** @test */
    public function it_can_generate_custom_reports()
    {
        $reportConfig = [
            'metrics' => ['total_value', 'item_count', 'utilization_rate'],
            'groupBy' => 'category',
            'filters' => [
                'status' => 'available',
                'date_range' => [
                    'start' => now()->subMonths(6)->format('Y-m-d'),
                    'end' => now()->format('Y-m-d')
                ]
            ],
            'format' => 'detailed'
        ];

        $customReport = $this->service->generateCustomReport($reportConfig);

        $this->assertIsArray($customReport);
        $this->assertArrayHasKey('report_data', $customReport);
        $this->assertArrayHasKey('summary', $customReport);
        $this->assertArrayHasKey('metadata', $customReport);
    }

    /** @test */
    public function it_can_export_analytics_data()
    {
        InventoryItem::factory()->count(5)->create([
            'institution_id' => $this->institution->id
        ]);

        $exportConfig = [
            'format' => 'csv',
            'include_charts' => false,
            'sections' => ['overview', 'by_category', 'alerts']
        ];

        $exportData = $this->service->exportAnalyticsData($exportConfig);

        $this->assertIsArray($exportData);
        $this->assertArrayHasKey('filename', $exportData);
        $this->assertArrayHasKey('content_type', $exportData);
        $this->assertArrayHasKey('data', $exportData);
        $this->assertEquals('text/csv', $exportData['content_type']);
    }

    /** @test */
    public function it_filters_data_by_regional_access()
    {
        $otherInstitution = Institution::factory()->create();
        
        // Create items in user's institution
        InventoryItem::factory()->count(3)->create([
            'institution_id' => $this->institution->id
        ]);
        
        // Create items in other institution (should not appear)
        InventoryItem::factory()->count(2)->create([
            'institution_id' => $otherInstitution->id
        ]);

        $statistics = $this->service->getInventoryStatistics();

        // Should only see items from user's institution
        $this->assertEquals(3, $statistics['overview']['total_items']);
    }

    /** @test */
    public function it_handles_empty_data_gracefully()
    {
        // No inventory items created
        
        $statistics = $this->service->getInventoryStatistics();

        $this->assertIsArray($statistics);
        $this->assertEquals(0, $statistics['overview']['total_items']);
        $this->assertEquals(0.00, $statistics['overview']['total_purchase_value']);
        $this->assertIsArray($statistics['by_category']);
        $this->assertIsArray($statistics['alerts']);
    }
}