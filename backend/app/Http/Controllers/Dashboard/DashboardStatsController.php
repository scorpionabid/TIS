<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\BaseController;
use App\Services\DashboardCacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class DashboardStatsController extends BaseController
{
    protected DashboardCacheService $cacheService;

    public function __construct(DashboardCacheService $cacheService)
    {
        $this->cacheService = $cacheService;
    }

    /**
     * Get dashboard statistics
     */
    public function stats(): JsonResponse
    {
        try {
            $user = Auth::user();
            $stats = $this->cacheService->getDashboardStats($user);

            return response()->json([
                'success' => true,
                'data' => $stats,
                'cached' => true,
                'user_role' => $user?->getRoleNames()->first(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Dashboard statistikaları alınarkən səhv baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get detailed analytics data
     */
    public function detailedStats(): JsonResponse
    {
        try {
            $user = Auth::user();

            if (! $user || ! $user->hasAnyRole(['SuperAdmin', 'RegionAdmin', 'SektorAdmin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu məlumatlara giriş icazəniz yoxdur',
                ], 403);
            }

            $analytics = $this->cacheService->getAnalyticsData($user);

            return response()->json([
                'success' => true,
                'data' => $analytics,
                'generated_at' => now(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ətraflı statistikalar alınarkən səhv: ' . $e->getMessage(),
            ], 500);
        }
    }
}
