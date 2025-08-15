<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Http\Controllers\Controller;
use App\Services\RegionAdmin\RegionAdminDashboardService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RegionAdminDashboardController extends Controller
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
        
        return response()->json([
            'region_overview' => $regionOverview,
            'survey_metrics' => $surveyMetrics,
            'task_metrics' => $taskMetrics,
            'sector_performance' => $sectorPerformance,
            'recent_activities' => $recentActivities,
            'notifications' => $notifications,
            'user_role' => $user->getRoleNames()->first(),
            'region_id' => $userRegionId
        ]);
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
                'data' => $activities
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Regional activities data could not be retrieved',
                'error' => $e->getMessage()
            ], 500);
        }
    }

}