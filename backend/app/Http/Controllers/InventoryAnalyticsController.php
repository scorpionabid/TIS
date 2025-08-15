<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Services\InventoryAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Traits\ValidationRules;
use App\Http\Traits\ResponseHelpers;

class InventoryAnalyticsController extends Controller
{
    use ValidationRules, ResponseHelpers;

    protected InventoryAnalyticsService $analyticsService;

    public function __construct(InventoryAnalyticsService $analyticsService)
    {
        $this->analyticsService = $analyticsService;
    }

    /**
     * Get comprehensive inventory statistics
     */
    public function statistics(): JsonResponse
    {
        try {
            $statistics = $this->analyticsService->getInventoryStatistics();
            return $this->successResponse($statistics, 'Inventory statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get inventory valuation report
     */
    public function valuation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'category' => 'sometimes|string|in:electronics,furniture,books,equipment,supplies,vehicles,sports,laboratory,medical,safety,cleaning,stationery,tools,software,other',
            'valuation_date' => 'sometimes|date',
            'include_items' => 'sometimes|boolean'
        ]);

        try {
            $valuation = $this->analyticsService->getInventoryValuation($validated);
            return $this->successResponse($valuation, 'Inventory valuation report generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get utilization report
     */
    public function utilization(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => 'sometimes|date',
            'date_to' => 'sometimes|date|after_or_equal:date_from',
            'category' => 'sometimes|string',
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'utilization_threshold' => 'sometimes|numeric|min:0|max:100'
        ]);

        try {
            $utilization = $this->analyticsService->getUtilizationReport($validated);
            return $this->successResponse($utilization, 'Utilization report generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get depreciation report
     */
    public function depreciation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => 'sometimes|string',
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'age_from' => 'sometimes|integer|min:0',
            'age_to' => 'sometimes|integer|min:0',
            'depreciation_method' => 'sometimes|string|in:straight_line,declining_balance,sum_of_years'
        ]);

        try {
            $depreciation = $this->analyticsService->getDepreciationReport($validated);
            return $this->successResponse($depreciation, 'Depreciation report generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get maintenance cost analysis
     */
    public function maintenanceCosts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => 'sometimes|date',
            'date_to' => 'sometimes|date|after_or_equal:date_from',
            'maintenance_type' => 'sometimes|string',
            'category' => 'sometimes|string',
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'include_budget_analysis' => 'sometimes|boolean'
        ]);

        try {
            $analysis = $this->analyticsService->getMaintenanceCostAnalysis($validated);
            return $this->successResponse($analysis, 'Maintenance cost analysis generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get dashboard statistics
     */
    public function dashboard(): JsonResponse
    {
        try {
            $dashboard = $this->analyticsService->getDashboardStatistics();
            return $this->successResponse($dashboard, 'Dashboard statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get category performance analysis
     */
    public function categoryPerformance(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => 'sometimes|date',
            'date_to' => 'sometimes|date|after_or_equal:date_from',
            'metric' => 'sometimes|string|in:utilization,cost,maintenance,depreciation',
            'institution_id' => 'sometimes|integer|exists:institutions,id'
        ]);

        try {
            $performance = $this->analyticsService->getCategoryPerformance($validated);
            return $this->successResponse($performance, 'Category performance analysis generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get institution comparison
     */
    public function institutionComparison(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_ids' => 'sometimes|array|min:2|max:10',
            'institution_ids.*' => 'integer|exists:institutions,id',
            'metrics' => 'sometimes|array',
            'metrics.*' => 'string|in:total_value,utilization_rate,maintenance_cost,item_count',
            'date_from' => 'sometimes|date',
            'date_to' => 'sometimes|date|after_or_equal:date_from'
        ]);

        try {
            $comparison = $this->analyticsService->getInstitutionComparison($validated);
            return $this->successResponse($comparison, 'Institution comparison generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get asset lifecycle analysis
     */
    public function assetLifecycle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => 'sometimes|string',
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'lifecycle_stage' => 'sometimes|string|in:new,active,declining,retirement'
        ]);

        try {
            $analysis = $this->analyticsService->getAssetLifecycleAnalysis($validated);
            return $this->successResponse($analysis, 'Asset lifecycle analysis generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get cost trend analysis
     */
    public function costTrends(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => 'sometimes|date',
            'date_to' => 'sometimes|date|after_or_equal:date_from',
            'period' => 'sometimes|string|in:daily,weekly,monthly,quarterly,yearly',
            'cost_type' => 'sometimes|string|in:purchase,maintenance,total',
            'category' => 'sometimes|string',
            'institution_id' => 'sometimes|integer|exists:institutions,id'
        ]);

        try {
            $trends = $this->analyticsService->getCostTrends($validated);
            return $this->successResponse($trends, 'Cost trend analysis generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get ROI analysis
     */
    public function roiAnalysis(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => 'sometimes|string',
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'calculation_method' => 'sometimes|string|in:simple,npv,irr',
            'discount_rate' => 'sometimes|numeric|min:0|max:50'
        ]);

        try {
            $roi = $this->analyticsService->getROIAnalysis($validated);
            return $this->successResponse($roi, 'ROI analysis generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get predictive analytics
     */
    public function predictiveAnalytics(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'prediction_type' => 'required|string|in:maintenance_needs,replacement_schedule,cost_forecast,utilization_forecast',
            'time_horizon' => 'sometimes|integer|min:1|max:60', // months
            'category' => 'sometimes|string',
            'institution_id' => 'sometimes|integer|exists:institutions,id'
        ]);

        try {
            $predictions = $this->analyticsService->getPredictiveAnalytics($validated);
            return $this->successResponse($predictions, 'Predictive analytics generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get compliance report
     */
    public function complianceReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'compliance_type' => 'sometimes|string|in:warranty,maintenance,safety,regulatory',
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'category' => 'sometimes|string',
            'status' => 'sometimes|string|in:compliant,non_compliant,expiring_soon'
        ]);

        try {
            $report = $this->analyticsService->getComplianceReport($validated);
            return $this->successResponse($report, 'Compliance report generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Export analytics data
     */
    public function export(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'report_type' => 'required|string|in:statistics,valuation,utilization,depreciation,maintenance_costs',
            'format' => 'sometimes|string|in:json,csv,excel,pdf',
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'category' => 'sometimes|string',
            'date_from' => 'sometimes|date',
            'date_to' => 'sometimes|date|after_or_equal:date_from'
        ]);

        try {
            $export = $this->analyticsService->exportAnalyticsData($validated);
            return $this->successResponse($export, 'Analytics data export generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get custom report
     */
    public function customReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'metrics' => 'required|array|min:1',
            'metrics.*' => 'string|in:total_value,item_count,utilization_rate,maintenance_cost,depreciation,roi',
            'filters' => 'sometimes|array',
            'filters.category' => 'sometimes|string',
            'filters.institution_id' => 'sometimes|integer|exists:institutions,id',
            'filters.status' => 'sometimes|string',
            'filters.condition' => 'sometimes|string',
            'filters.date_from' => 'sometimes|date',
            'filters.date_to' => 'sometimes|date|after_or_equal:filters.date_from',
            'grouping' => 'sometimes|array',
            'grouping.*' => 'string|in:category,institution,status,condition,purchase_year',
            'sorting' => 'sometimes|array',
            'sorting.field' => 'required_with:sorting|string',
            'sorting.direction' => 'sometimes|string|in:asc,desc'
        ]);

        try {
            $report = $this->analyticsService->generateCustomReport($validated);
            return $this->successResponse($report, 'Custom report generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get performance benchmarks
     */
    public function benchmarks(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'benchmark_type' => 'sometimes|string|in:utilization,maintenance_cost,depreciation,lifecycle',
            'category' => 'sometimes|string',
            'institution_type' => 'sometimes|string',
            'comparison_period' => 'sometimes|string|in:current_year,last_year,industry_average'
        ]);

        try {
            $benchmarks = $this->analyticsService->getPerformanceBenchmarks($validated);
            return $this->successResponse($benchmarks, 'Performance benchmarks retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }
}