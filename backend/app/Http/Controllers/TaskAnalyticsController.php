<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskAnalyticsController extends BaseController
{
    /**
     * Get task statistics
     */
    public function getStatistics(Request $request): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
            'category' => 'nullable|string|in:report,maintenance,event,audit,instruction,other',
        ]);

        try {
            $statistics = $this->statisticsService->getTaskStatistics($user, $request->all());

            return response()->json([
                'success' => true,
                'data' => $statistics,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Statistika alınarkən xəta baş verdi.');
        }
    }

    /**
     * Get performance analytics
     */
    public function getPerformanceAnalytics(Request $request): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'group_by' => 'nullable|string|in:institution,user,category,priority',
        ]);

        try {
            $analytics = $this->statisticsService->getPerformanceAnalytics($user, $request->all());

            return response()->json([
                'success' => true,
                'data' => $analytics,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Performans analitikası alınarkən xəta baş verdi.');
        }
    }

    /**
     * Get trend analysis
     */
    public function getTrendAnalysis(Request $request): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'period' => 'nullable|string|in:day,week,month,quarter,year',
            'metric' => 'nullable|string|in:completion_rate,average_completion_time,task_count',
        ]);

        try {
            $trends = $this->statisticsService->getTrendAnalysis($user, $request->all());

            return response()->json([
                'success' => true,
                'data' => $trends,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Trend analizi alınarkən xəta baş verdi.');
        }
    }
}
