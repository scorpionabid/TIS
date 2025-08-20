<?php

namespace App\Http\Controllers\SektorAdmin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\SektorAdmin\Dashboard\DashboardStatsController;
use App\Http\Controllers\SektorAdmin\Dashboard\SchoolManagementController;
use App\Http\Controllers\SektorAdmin\Dashboard\SurveyApprovalController;
use App\Http\Controllers\SektorAdmin\Dashboard\TaskApprovalController;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SektorAdminDashboardController extends Controller
{
    protected $statsController;
    protected $schoolController;
    protected $surveyController;
    protected $taskController;

    public function __construct()
    {
        $this->statsController = new DashboardStatsController();
        $this->schoolController = new SchoolManagementController();
        $this->surveyController = new SurveyApprovalController();
        $this->taskController = new TaskApprovalController();
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
     * Get pending survey responses for approval
     */
    public function getPendingSurveyResponses(Request $request): JsonResponse
    {
        return $this->surveyController->getPendingSurveyResponses($request);
    }

    /**
     * Get survey response details for review
     */
    public function getSurveyResponseDetails(Request $request, int $responseId): JsonResponse
    {
        return $this->surveyController->getSurveyResponseDetails($request, $responseId);
    }

    /**
     * Approve survey response
     */
    public function approveSurveyResponse(Request $request, int $responseId): JsonResponse
    {
        return $this->surveyController->approveSurveyResponse($request, $responseId);
    }

    /**
     * Reject survey response
     */
    public function rejectSurveyResponse(Request $request, int $responseId): JsonResponse
    {
        return $this->surveyController->rejectSurveyResponse($request, $responseId);
    }


    /**
     * Get pending tasks for approval
     */
    public function getPendingTasks(Request $request): JsonResponse
    {
        return $this->taskController->getPendingTasks($request);
    }

    /**
     * Get task details for review
     */
    public function getTaskDetails(Request $request, int $taskId): JsonResponse
    {
        return $this->taskController->getTaskDetails($request, $taskId);
    }

    /**
     * Approve task
     */
    public function approveTask(Request $request, int $taskId): JsonResponse
    {
        return $this->taskController->approveTask($request, $taskId);
    }

    /**
     * Reject task
     */
    public function rejectTask(Request $request, int $taskId): JsonResponse
    {
        return $this->taskController->rejectTask($request, $taskId);
    }

    /**
     * Get task statistics for sector
     */
    public function getTaskStatistics(Request $request): JsonResponse
    {
        return $this->taskController->getTaskStatistics($request);
    }
}