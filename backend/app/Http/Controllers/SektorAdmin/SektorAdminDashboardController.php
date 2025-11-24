<?php

namespace App\Http\Controllers\SektorAdmin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\SektorAdmin\Dashboard\DashboardStatsController;
use App\Http\Controllers\SektorAdmin\Dashboard\SchoolManagementController;
// Note: SurveyApprovalController and TaskApprovalController have been consolidated
// into the main SurveyApprovalController and will be handled via service layer
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SektorAdminDashboardController extends Controller
{
    protected $statsController;

    protected $schoolController;

    public function __construct()
    {
        $this->statsController = new DashboardStatsController;
        $this->schoolController = new SchoolManagementController;
    }

    /**
     * Get SektorAdmin dashboard data
     */
    public function getDashboardStats(Request $request): JsonResponse
    {
        return $this->statsController->getDashboardStats($request);
    }

    /**
     * Get detailed schools data for the sector
     */
    public function getSectorSchools(Request $request): JsonResponse
    {
        return $this->schoolController->getSectorSchools($request);
    }

    /**
     * Get sector performance analytics
     */
    public function getSectorAnalytics(Request $request): JsonResponse
    {
        return $this->statsController->getSectorAnalytics($request);
    }

    /**
     * Survey approval methods moved to main SurveyApprovalController
     * These methods are deprecated and will redirect to the new controller
     */

    /**
     * @deprecated Use SurveyApprovalController instead
     */
    public function getPendingSurveyResponses(Request $request): JsonResponse
    {
        // Redirect to new approval system
        return response()->json([
            'message' => 'Survey approval functionality has been moved to /api/survey-approval endpoints',
            'redirect_to' => '/api/survey-approval/pending',
        ], 301);
    }

    /**
     * @deprecated Use SurveyApprovalController instead
     */
    public function getSurveyResponseDetails(Request $request, int $responseId): JsonResponse
    {
        return response()->json([
            'message' => 'Survey approval functionality has been moved to /api/survey-approval endpoints',
            'redirect_to' => "/api/survey-approval/requests/{$responseId}",
        ], 301);
    }

    /**
     * @deprecated Use SurveyApprovalController instead
     */
    public function approveSurveyResponse(Request $request, int $responseId): JsonResponse
    {
        return response()->json([
            'message' => 'Survey approval functionality has been moved to /api/survey-approval endpoints',
            'redirect_to' => "/api/survey-approval/requests/{$responseId}/approve",
        ], 301);
    }

    /**
     * @deprecated Use SurveyApprovalController instead
     */
    public function rejectSurveyResponse(Request $request, int $responseId): JsonResponse
    {
        return response()->json([
            'message' => 'Survey approval functionality has been moved to /api/survey-approval endpoints',
            'redirect_to' => "/api/survey-approval/requests/{$responseId}/reject",
        ], 301);
    }

    /**
     * @deprecated Task approval functionality to be handled by task management system
     */
    public function getPendingTasks(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'Task approval functionality handled by task management system',
            'redirect_to' => '/api/tasks/pending',
        ], 301);
    }

    /**
     * @deprecated Task approval functionality to be handled by task management system
     */
    public function getTaskDetails(Request $request, int $taskId): JsonResponse
    {
        return response()->json([
            'message' => 'Task approval functionality handled by task management system',
            'redirect_to' => "/api/tasks/{$taskId}",
        ], 301);
    }

    /**
     * @deprecated Task approval functionality to be handled by task management system
     */
    public function approveTask(Request $request, int $taskId): JsonResponse
    {
        return response()->json([
            'message' => 'Task approval functionality handled by task management system',
            'redirect_to' => "/api/tasks/{$taskId}/approve",
        ], 301);
    }

    /**
     * @deprecated Task approval functionality to be handled by task management system
     */
    public function rejectTask(Request $request, int $taskId): JsonResponse
    {
        return response()->json([
            'message' => 'Task approval functionality handled by task management system',
            'redirect_to' => "/api/tasks/{$taskId}/reject",
        ], 301);
    }

    /**
     * @deprecated Task approval functionality to be handled by task management system
     */
    public function getTaskStatistics(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'Task statistics handled by task management system',
            'redirect_to' => '/api/tasks/statistics',
        ], 301);
    }
}
