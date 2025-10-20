<?php

use App\Http\Controllers\PsychologyController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\InventoryTransactionController;
use App\Http\Controllers\InventoryMaintenanceController;
use App\Http\Controllers\InventoryAnalyticsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Specialized Module Routes
|--------------------------------------------------------------------------
|
| Routes for specialized modules: Psychology, Inventory, etc.
|
*/

// Psychology Assessment Routes
Route::prefix('psychology')->group(function () {
    Route::get('/', [PsychologyController::class, 'index'])->middleware('permission:psychology.read');
    Route::post('/', [PsychologyController::class, 'store'])->middleware('permission:psychology.write');
    Route::get('/{psychology}', [PsychologyController::class, 'show'])->middleware('permission:psychology.read');
    Route::put('/{psychology}', [PsychologyController::class, 'update'])->middleware('permission:psychology.write');
    Route::delete('/{psychology}', [PsychologyController::class, 'destroy'])->middleware('permission:psychology.write');
    Route::get('/student/{student}', [PsychologyController::class, 'getStudentAssessments'])->middleware('permission:psychology.read');
    Route::post('/student/{student}/assess', [PsychologyController::class, 'createAssessment'])->middleware('permission:psychology.assess');
    Route::get('/assessments/types', [PsychologyController::class, 'getAssessmentTypes'])->middleware('permission:psychology.read');
    Route::post('/assessments/schedule', [PsychologyController::class, 'scheduleAssessment'])->middleware('permission:psychology.schedule');
    Route::get('/reports/summary', [PsychologyController::class, 'getSummaryReport'])->middleware('permission:psychology.reports');
    Route::get('/analytics/trends', [PsychologyController::class, 'getTrends'])->middleware('permission:psychology.analytics');
    Route::post('/recommendations/generate', [PsychologyController::class, 'generateRecommendations'])->middleware('permission:psychology.recommend');
    Route::get('/templates', [PsychologyController::class, 'getAssessmentTemplates'])->middleware('permission:psychology.read');
    Route::post('/templates', [PsychologyController::class, 'createTemplate'])->middleware('permission:psychology.templates');
    Route::get('/interventions', [PsychologyController::class, 'getInterventions'])->middleware('permission:psychology.interventions');
    Route::post('/interventions', [PsychologyController::class, 'createIntervention'])->middleware('permission:psychology.interventions');
    Route::get('/progress/{student}', [PsychologyController::class, 'getStudentProgress'])->middleware('permission:psychology.progress');
    Route::post('/referrals', [PsychologyController::class, 'createReferral'])->middleware('permission:psychology.referrals');
    Route::get('/statistics/overview', [PsychologyController::class, 'getStatisticsOverview'])->middleware('permission:psychology.statistics');
    Route::post('/export', [PsychologyController::class, 'exportData'])->middleware('permission:psychology.export');
});

// Inventory Management Routes
Route::prefix('inventory')->group(function () {
    Route::get('/', [InventoryController::class, 'index'])->middleware('permission:inventory.read');
    Route::post('/', [InventoryController::class, 'store'])->middleware('permission:inventory.create');
    Route::get('/search', [InventoryController::class, 'search'])->middleware('permission:inventory.read');
    Route::get('/categories', [InventoryController::class, 'categories'])->middleware('permission:inventory.read');
    Route::get('/{inventory}', [InventoryController::class, 'show'])->middleware('permission:inventory.read');
    Route::put('/{inventory}', [InventoryController::class, 'update'])->middleware('permission:inventory.update');
    Route::delete('/{inventory}', [InventoryController::class, 'destroy'])->middleware('permission:inventory.delete');
    Route::post('/{inventory}/duplicate', [InventoryController::class, 'duplicate'])->middleware('permission:inventory.create');
    Route::post('/bulk-create', [InventoryController::class, 'bulkCreate'])->middleware('permission:inventory.manage');
    Route::post('/bulk-update', [InventoryController::class, 'bulkUpdate'])->middleware('permission:inventory.manage');
    Route::get('/low-stock', [InventoryController::class, 'getLowStockItems'])->middleware('permission:inventory.maintenance');
    Route::get('/expired', [InventoryController::class, 'getExpiredItems'])->middleware('permission:inventory.maintenance');
    Route::post('/{inventory}/reorder', [InventoryController::class, 'reorderItem'])->middleware('permission:inventory.manage');
});

// Inventory Transaction Routes
Route::prefix('inventory/transactions')->middleware('permission:inventory.transactions')->group(function () {
    Route::get('/', [InventoryTransactionController::class, 'index']);
    Route::post('/', [InventoryTransactionController::class, 'store']);
    Route::get('/{transaction}', [InventoryTransactionController::class, 'show']);
    Route::put('/{transaction}', [InventoryTransactionController::class, 'update']);
    Route::delete('/{transaction}', [InventoryTransactionController::class, 'destroy']);
    Route::get('/item/{item}', [InventoryTransactionController::class, 'getItemTransactions']);
    Route::get('/user/{user}', [InventoryTransactionController::class, 'getUserTransactions']);
    Route::post('/bulk-process', [InventoryTransactionController::class, 'bulkProcess']);
    Route::get('/types', [InventoryTransactionController::class, 'getTransactionTypes']);
    Route::post('/approve/{transaction}', [InventoryTransactionController::class, 'approve']);
    Route::post('/reject/{transaction}', [InventoryTransactionController::class, 'reject']);
    Route::get('/pending-approval', [InventoryTransactionController::class, 'getPendingApproval']);
    Route::get('/reports/summary', [InventoryTransactionController::class, 'getSummaryReport']);
    Route::get('/reports/detailed', [InventoryTransactionController::class, 'getDetailedReport']);
    Route::post('/export', [InventoryTransactionController::class, 'export']);
    Route::get('/analytics/trends', [InventoryTransactionController::class, 'getTransactionTrends']);
    Route::get('/audit-trail/{transaction}', [InventoryTransactionController::class, 'getAuditTrail']);
    Route::post('/reconcile', [InventoryTransactionController::class, 'reconcileInventory']);
    Route::get('/discrepancies', [InventoryTransactionController::class, 'getDiscrepancies']);
    Route::post('/adjust-stock', [InventoryTransactionController::class, 'adjustStock']);
    Route::get('/stock-movements', [InventoryTransactionController::class, 'getStockMovements']);
    Route::post('/transfer', [InventoryTransactionController::class, 'transferStock']);
    Route::get('/transfer-requests', [InventoryTransactionController::class, 'getTransferRequests']);
    Route::post('/reserve', [InventoryTransactionController::class, 'reserveStock']);
    Route::get('/reservations', [InventoryTransactionController::class, 'getReservations']);
    Route::post('/release-reservation', [InventoryTransactionController::class, 'releaseReservation']);
    Route::get('/valuation', [InventoryTransactionController::class, 'getInventoryValuation']);
    Route::post('/cycle-count', [InventoryTransactionController::class, 'performCycleCount']);
    Route::get('/cycle-count/schedule', [InventoryTransactionController::class, 'getCycleCountSchedule']);
    Route::post('/write-off', [InventoryTransactionController::class, 'writeOffItems']);
    Route::get('/write-offs', [InventoryTransactionController::class, 'getWriteOffs']);
});

// Inventory Maintenance Routes
Route::prefix('inventory/maintenance')->middleware('permission:inventory.maintenance')->group(function () {
    Route::get('/', [InventoryMaintenanceController::class, 'index']);
    Route::post('/', [InventoryMaintenanceController::class, 'store']);
    Route::get('/{maintenance}', [InventoryMaintenanceController::class, 'show']);
    Route::put('/{maintenance}', [InventoryMaintenanceController::class, 'update']);
    Route::delete('/{maintenance}', [InventoryMaintenanceController::class, 'destroy']);
    Route::get('/item/{item}', [InventoryMaintenanceController::class, 'getItemMaintenance']);
    Route::post('/{maintenance}/complete', [InventoryMaintenanceController::class, 'complete']);
    Route::get('/schedule/upcoming', [InventoryMaintenanceController::class, 'getUpcomingMaintenance']);
    Route::get('/schedule/overdue', [InventoryMaintenanceController::class, 'getOverdueMaintenance']);
    Route::post('/schedule/bulk', [InventoryMaintenanceController::class, 'bulkSchedule']);
    Route::get('/types', [InventoryMaintenanceController::class, 'getMaintenanceTypes']);
    Route::get('/contractors', [InventoryMaintenanceController::class, 'getContractors']);
    Route::post('/work-orders', [InventoryMaintenanceController::class, 'createWorkOrder']);
    Route::get('/work-orders', [InventoryMaintenanceController::class, 'getWorkOrders']);
    Route::put('/work-orders/{workOrder}', [InventoryMaintenanceController::class, 'updateWorkOrder']);
    Route::post('/work-orders/{workOrder}/assign', [InventoryMaintenanceController::class, 'assignWorkOrder']);
    Route::get('/reports/costs', [InventoryMaintenanceController::class, 'getCostReports']);
    Route::get('/reports/efficiency', [InventoryMaintenanceController::class, 'getEfficiencyReports']);
    Route::post('/preventive/schedule', [InventoryMaintenanceController::class, 'schedulePreventiveMaintenance']);
    Route::get('/preventive/due', [InventoryMaintenanceController::class, 'getDuePreventiveMaintenance']);
    Route::get('/analytics/downtime', [InventoryMaintenanceController::class, 'getDowntimeAnalytics']);
    Route::get('/analytics/mttr', [InventoryMaintenanceController::class, 'getMTTRAnalytics']);
    Route::post('/inspections', [InventoryMaintenanceController::class, 'createInspection']);
    Route::get('/inspections', [InventoryMaintenanceController::class, 'getInspections']);
    Route::get('/warranties/expiring', [InventoryMaintenanceController::class, 'getExpiringWarranties']);
});

// Inventory Analytics Routes
Route::prefix('inventory/analytics')->middleware('permission:inventory.analytics')->group(function () {
    Route::get('/', [InventoryAnalyticsController::class, 'index']);
    Route::get('/overview', [InventoryAnalyticsController::class, 'getOverview']);
    Route::get('/turnover', [InventoryAnalyticsController::class, 'getTurnoverAnalytics']);
    Route::get('/abc-analysis', [InventoryAnalyticsController::class, 'getABCAnalysis']);
    Route::get('/usage-trends', [InventoryAnalyticsController::class, 'getUsageTrends']);
    Route::get('/seasonal-patterns', [InventoryAnalyticsController::class, 'getSeasonalPatterns']);
    Route::get('/demand-forecast', [InventoryAnalyticsController::class, 'getDemandForecast']);
    Route::get('/reorder-recommendations', [InventoryAnalyticsController::class, 'getReorderRecommendations']);
    Route::get('/cost-analysis', [InventoryAnalyticsController::class, 'getCostAnalysis']);
    Route::get('/carrying-costs', [InventoryAnalyticsController::class, 'getCarryingCosts']);
    Route::get('/stockout-analysis', [InventoryAnalyticsController::class, 'getStockoutAnalysis']);
    Route::get('/excess-inventory', [InventoryAnalyticsController::class, 'getExcessInventory']);
    Route::get('/vendor-performance', [InventoryAnalyticsController::class, 'getVendorPerformance']);
    Route::get('/category-performance', [InventoryAnalyticsController::class, 'getCategoryPerformance']);
    Route::get('/location-analysis', [InventoryAnalyticsController::class, 'getLocationAnalysis']);
    Route::get('/optimization-opportunities', [InventoryAnalyticsController::class, 'getOptimizationOpportunities']);
});

// Test WebSocket routes (for development)
Route::prefix('test/websocket')->group(function () {
    Route::post('/broadcast', function () {
        broadcast(new \App\Events\TestEvent('Test message from API'));
        return response()->json(['message' => 'Test event broadcasted']);
    });
    Route::get('/status', function () {
        return response()->json(['websocket' => 'available', 'timestamp' => now()]);
    });
});
