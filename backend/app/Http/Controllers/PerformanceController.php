<?php

namespace App\Http\Controllers;

use App\Services\PerformanceMonitoringService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PerformanceController extends BaseController
{
    protected PerformanceMonitoringService $performanceService;

    public function __construct(PerformanceMonitoringService $performanceService)
    {
        $this->performanceService = $performanceService;
    }

    /**
     * Get real-time performance metrics
     */
    public function getRealTimeMetrics(): JsonResponse
    {
        try {
            $metrics = $this->performanceService->getRealTimeMetrics();

            return response()->json([
                'success' => true,
                'data' => $metrics,
                'timestamp' => now()->toISOString(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch performance metrics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get performance trends
     */
    public function getPerformanceTrends(): JsonResponse
    {
        try {
            $trends = $this->performanceService->getPerformanceTrends();

            return response()->json([
                'success' => true,
                'data' => $trends,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch performance trends',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate performance report
     */
    public function generateReport(Request $request): JsonResponse
    {
        try {
            $startDate = Carbon::parse($request->get('start_date', now()->subWeek()));
            $endDate = Carbon::parse($request->get('end_date', now()));

            $report = $this->performanceService->generatePerformanceReport($startDate, $endDate);

            return response()->json([
                'success' => true,
                'data' => $report,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate performance report',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get system health status
     */
    public function getSystemHealth(): JsonResponse
    {
        try {
            $health = $this->performanceService->getSystemHealth();

            return response()->json([
                'success' => true,
                'data' => $health,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch system health',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
