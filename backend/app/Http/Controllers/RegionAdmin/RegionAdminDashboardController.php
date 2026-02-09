<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Http\Controllers\BaseController;
use App\Services\RegionAdmin\RegionAdminDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RegionAdminDashboardController extends BaseController
{
    protected $dashboardService;

    public function __construct(RegionAdminDashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    /**
     * Get RegionAdmin dashboard statistics
     */
    public function getDashboardStats(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;

        // Debug logging
        \Log::info('RegionAdmin Dashboard Stats Request', [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'user_email' => $user->email,
            'institution_id' => $userRegionId,
            'roles' => $user->getRoleNames(),
        ]);

        // Check if user has institution_id
        if (! $userRegionId) {
            \Log::error('RegionAdmin user has no institution_id', [
                'user_id' => $user->id,
                'user_email' => $user->email,
            ]);

            return response()->json([
                'error' => 'User has no assigned institution',
                'message' => 'RegionAdmin user must be assigned to a regional institution',
                'region_overview' => [
                    'total_sectors' => 0,
                    'total_schools' => 0,
                    'total_users' => 0,
                    'active_users' => 0,
                ],
                'survey_metrics' => [],
                'task_metrics' => [],
                'sector_performance' => [],
                'recent_activities' => [],
                'notifications' => [],
                'user_role' => $user->getRoleNames()->first(),
                'region_id' => null,
            ], 200);
        }

        try {
            // Get all institution IDs for the region
            $regionInstitutions = $this->dashboardService->getRegionInstitutions($userRegionId);
            $allRegionInstitutions = $this->dashboardService->getAllRegionInstitutions($regionInstitutions);
            $institutionIds = $allRegionInstitutions->pluck('id');

            // Calculate metrics using service methods
            $regionOverview = $this->dashboardService->calculateRegionOverview($userRegionId, $institutionIds);
            $surveyMetrics = $this->dashboardService->calculateSurveyMetrics($user, $institutionIds);
            $taskMetrics = $this->dashboardService->calculateTaskMetrics($user, $institutionIds);
            $sectorPerformance = $this->dashboardService->calculateSectorPerformance($userRegionId);
            $recentActivities = $this->dashboardService->getRecentActivities($user, $institutionIds);
            $notifications = $this->dashboardService->getNotifications($user);

            \Log::info('RegionAdmin Dashboard Stats Success', [
                'user_id' => $user->id,
                'region_id' => $userRegionId,
                'institution_count' => $institutionIds->count(),
            ]);

            return response()->json([
                'region_overview' => $regionOverview,
                'survey_metrics' => $surveyMetrics,
                'task_metrics' => $taskMetrics,
                'sector_performance' => $sectorPerformance,
                'recent_activities' => $recentActivities,
                'notifications' => $notifications,
                'user_role' => $user->getRoleNames()->first(),
                'region_id' => $userRegionId,
            ]);
        } catch (\Exception $e) {
            \Log::error('RegionAdmin Dashboard Stats Error', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Dashboard data could not be loaded',
                'message' => $e->getMessage(),
                'region_overview' => [
                    'total_sectors' => 0,
                    'total_schools' => 0,
                    'total_users' => 0,
                    'active_users' => 0,
                ],
                'survey_metrics' => [],
                'task_metrics' => [],
                'sector_performance' => [],
                'recent_activities' => [],
                'notifications' => [],
                'user_role' => $user->getRoleNames()->first(),
                'region_id' => $userRegionId,
            ], 200);
        }
    }

    /**
     * Get RegionAdmin dashboard activities
     */
    public function getDashboardActivities(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;

        try {
            // Get all institution IDs for the region
            $regionInstitutions = $this->dashboardService->getRegionInstitutions($userRegionId);
            $allRegionInstitutions = $this->dashboardService->getAllRegionInstitutions($regionInstitutions);
            $institutionIds = $allRegionInstitutions->pluck('id');

            $activities = $this->dashboardService->getRecentActivities($user, $institutionIds);

            return response()->json([
                'success' => true,
                'data' => $activities,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Regional activities data could not be retrieved',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get RegionAdmin dashboard (alias for getDashboardStats)
     */
    public function getDashboard(Request $request): JsonResponse
    {
        return $this->getDashboardStats($request);
    }

    /**
     * Get RegionAdmin dashboard analytics
     */
    public function getAnalytics(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;

        try {
            // Get all institution IDs for the region
            $regionInstitutions = $this->dashboardService->getRegionInstitutions($userRegionId);
            $allRegionInstitutions = $this->dashboardService->getAllRegionInstitutions($regionInstitutions);
            $institutionIds = $allRegionInstitutions->pluck('id');

            // Calculate detailed analytics
            $analytics = [
                'performance_metrics' => $this->dashboardService->calculateSectorPerformance($userRegionId),
                'survey_metrics' => $this->dashboardService->calculateSurveyMetrics($user, $institutionIds),
                'task_metrics' => $this->dashboardService->calculateTaskMetrics($user, $institutionIds),
                'region_overview' => $this->dashboardService->calculateRegionOverview($userRegionId, $institutionIds),
                'recent_activities' => $this->dashboardService->getRecentActivities($user, $institutionIds),
            ];

            return response()->json([
                'success' => true,
                'data' => $analytics,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Analytics data could not be retrieved',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
