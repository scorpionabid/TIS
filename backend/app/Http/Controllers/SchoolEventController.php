<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Events\EventQueryController;
use App\Http\Controllers\Events\EventManagementController;
use App\Http\Controllers\Events\EventApprovalController;
use App\Http\Controllers\Events\EventStatisticsController;
use App\Models\SchoolEvent;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SchoolEventController extends Controller
{
    protected $queryController;
    protected $managementController;
    protected $approvalController;
    protected $statisticsController;

    public function __construct()
    {
        $this->queryController = new EventQueryController();
        $this->managementController = new EventManagementController();
        $this->approvalController = new EventApprovalController();
        $this->statisticsController = new EventStatisticsController();
    }

    /**
     * Display a listing of events with filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        return $this->queryController->index($request);
    }

    /**
     * Store a new event.
     */
    public function store(Request $request): JsonResponse
    {
        return $this->managementController->store($request);
    }

    /**
     * Show a specific event.
     */
    public function show(Request $request, SchoolEvent $event): JsonResponse
    {
        return $this->queryController->show($request, $event);
    }

    /**
     * Update an existing event.
     */
    public function update(Request $request, SchoolEvent $event): JsonResponse
    {
        return $this->managementController->update($request, $event);
    }

    /**
     * Delete an event.
     */
    public function destroy(Request $request, SchoolEvent $event): JsonResponse
    {
        return $this->managementController->destroy($request, $event);
    }

    /**
     * Approve an event.
     */
    public function approve(Request $request, SchoolEvent $event): JsonResponse
    {
        return $this->approvalController->approve($request, $event);
    }

    /**
     * Cancel an event.
     */
    public function cancel(Request $request, SchoolEvent $event): JsonResponse
    {
        return $this->approvalController->cancel($request, $event);
    }

    /**
     * Submit event for approval.
     */
    public function submitForApproval(Request $request, SchoolEvent $event): JsonResponse
    {
        return $this->approvalController->submitForApproval($request, $event);
    }

    /**
     * Get event statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        return $this->statisticsController->statistics($request);
    }

    /**
     * Get detailed statistics for a specific time period.
     */
    public function periodStatistics(Request $request): JsonResponse
    {
        return $this->statisticsController->periodStatistics($request);
    }
}