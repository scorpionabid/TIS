<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\MaintenanceRecord;
use App\Services\InventoryMaintenanceService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Traits\ValidationRules;
use App\Http\Traits\ResponseHelpers;

class InventoryMaintenanceController extends Controller
{
    use ValidationRules, ResponseHelpers;

    protected InventoryMaintenanceService $maintenanceService;

    public function __construct(InventoryMaintenanceService $maintenanceService)
    {
        $this->maintenanceService = $maintenanceService;
    }

    /**
     * Schedule maintenance for inventory item
     */
    public function schedule(Request $request, InventoryItem $item): JsonResponse
    {
        $validated = $request->validate([
            'maintenance_type' => 'required|string|in:repair,inspection,cleaning,calibration,upgrade,replacement,preventive',
            'description' => 'required|string|max:1000',
            'priority' => 'sometimes|string|in:low,medium,high,urgent',
            'scheduled_date' => 'required|date|after:today',
            'estimated_duration' => 'sometimes|integer|min:1',
            'estimated_cost' => 'sometimes|numeric|min:0',
            'assigned_to' => 'sometimes|integer|exists:users,id',
            'maintenance_category' => 'sometimes|string|max:100',
            'recurring' => 'sometimes|boolean',
            'recurring_interval' => 'sometimes|string|in:weekly,monthly,quarterly,yearly',
            'notes' => 'sometimes|string|max:2000',
            'parts_needed' => 'sometimes|array',
            'external_service' => 'sometimes|boolean',
            'service_provider' => 'sometimes|string|max:255',
            'immediate_maintenance' => 'sometimes|boolean'
        ]);

        try {
            $maintenance = $this->maintenanceService->scheduleMaintenance($item, $validated);
            
            return $this->successResponse(
                $this->maintenanceService->formatMaintenanceForResponse($maintenance),
                'Maintenance scheduled successfully',
                201
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Start maintenance on item
     */
    public function start(Request $request, MaintenanceRecord $maintenance): JsonResponse
    {
        $validated = $request->validate([
            'actual_start_date' => 'sometimes|date',
            'technician_notes' => 'sometimes|string|max:1000',
            'work_order_number' => 'sometimes|string|max:50'
        ]);

        try {
            $updatedMaintenance = $this->maintenanceService->startMaintenance($maintenance, $validated);
            
            return $this->successResponse(
                $this->maintenanceService->formatMaintenanceForResponse($updatedMaintenance),
                'Maintenance started successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Complete maintenance on item
     */
    public function complete(Request $request, MaintenanceRecord $maintenance): JsonResponse
    {
        $validated = $request->validate([
            'completion_notes' => 'required|string|max:2000',
            'actual_cost' => 'sometimes|numeric|min:0',
            'parts_used' => 'sometimes|array',
            'work_performed' => 'required|string|max:2000',
            'next_maintenance_date' => 'sometimes|date|after:today',
            'warranty_period' => 'sometimes|integer|min:1',
            'quality_check_passed' => 'sometimes|boolean',
            'recommendations' => 'sometimes|string|max:1000',
            'item_condition' => 'sometimes|string|in:new,excellent,good,fair,poor,damaged'
        ]);

        try {
            $completedMaintenance = $this->maintenanceService->completeMaintenance($maintenance, $validated);
            
            return $this->successResponse(
                $this->maintenanceService->formatMaintenanceForResponse($completedMaintenance),
                'Maintenance completed successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Cancel scheduled maintenance
     */
    public function cancel(Request $request, MaintenanceRecord $maintenance): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500'
        ]);

        try {
            $cancelledMaintenance = $this->maintenanceService->cancelMaintenance($maintenance, $validated);
            
            return $this->successResponse(
                $this->maintenanceService->formatMaintenanceForResponse($cancelledMaintenance),
                'Maintenance cancelled successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get maintenance records for item
     */
    public function records(Request $request, InventoryItem $item): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'sometimes|string|in:scheduled,in_progress,completed,cancelled',
            'maintenance_type' => 'sometimes|string',
            'date_from' => 'sometimes|date',
            'date_to' => 'sometimes|date|after_or_equal:date_from',
            'assigned_to' => 'sometimes|integer|exists:users,id',
            'per_page' => 'sometimes|integer|min:1|max:100'
        ]);

        try {
            $history = $this->maintenanceService->getMaintenanceHistory($item, $validated);
            
            return $this->successResponse($history, 'Maintenance records retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get maintenance schedule
     */
    public function getSchedule(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => 'sometimes|date',
            'date_to' => 'sometimes|date|after_or_equal:date_from',
            'assigned_to' => 'sometimes|integer|exists:users,id',
            'priority' => 'sometimes|string|in:low,medium,high,urgent',
            'maintenance_type' => 'sometimes|string',
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'per_page' => 'sometimes|integer|min:1|max:100'
        ]);

        try {
            $schedule = $this->maintenanceService->getMaintenanceSchedule($validated);
            
            return $this->successResponse($schedule, 'Maintenance schedule retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Update maintenance status
     */
    public function updateStatus(Request $request, MaintenanceRecord $maintenance): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:scheduled,in_progress,completed,cancelled',
            'notes' => 'sometimes|string|max:1000'
        ]);

        try {
            $status = $validated['status'];
            $notes = $validated['notes'] ?? null;
            
            $updatedMaintenance = match($status) {
                'in_progress' => $this->maintenanceService->startMaintenance($maintenance, ['technician_notes' => $notes]),
                'cancelled' => $this->maintenanceService->cancelMaintenance($maintenance, ['reason' => $notes ?? 'Status updated']),
                default => throw new \Exception("Cannot update status to {$status} using this endpoint")
            };
            
            return $this->successResponse(
                $this->maintenanceService->formatMaintenanceForResponse($updatedMaintenance),
                'Maintenance status updated successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get upcoming maintenance due
     */
    public function upcomingDue(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days_ahead' => 'sometimes|integer|min:1|max:365',
            'priority' => 'sometimes|string|in:low,medium,high,urgent',
            'assigned_to' => 'sometimes|integer|exists:users,id',
            'per_page' => 'sometimes|integer|min:1|max:100'
        ]);

        try {
            $upcomingMaintenance = $this->maintenanceService->getUpcomingDueMaintenance($validated);
            
            return $this->successResponse($upcomingMaintenance, 'Upcoming maintenance retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get overdue maintenance
     */
    public function overdue(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days_overdue' => 'sometimes|integer|min:1',
            'priority' => 'sometimes|string|in:low,medium,high,urgent',
            'assigned_to' => 'sometimes|integer|exists:users,id',
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'per_page' => 'sometimes|integer|min:1|max:100'
        ]);

        try {
            $overdueMaintenance = $this->maintenanceService->getOverdueMaintenance($validated);
            
            return $this->successResponse($overdueMaintenance, 'Overdue maintenance retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get maintenance statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => 'sometimes|date',
            'date_to' => 'sometimes|date|after_or_equal:date_from',
            'maintenance_type' => 'sometimes|string',
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'assigned_to' => 'sometimes|integer|exists:users,id'
        ]);

        try {
            $statistics = $this->maintenanceService->getMaintenanceStatistics($validated);
            
            return $this->successResponse($statistics, 'Maintenance statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get maintenance cost summary
     */
    public function costSummary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => 'sometimes|date',
            'date_to' => 'sometimes|date|after_or_equal:date_from',
            'maintenance_type' => 'sometimes|string',
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'category' => 'sometimes|string'
        ]);

        try {
            $costSummary = $this->maintenanceService->getMaintenanceCostSummary($validated);
            
            return $this->successResponse($costSummary, 'Maintenance cost summary retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Bulk schedule maintenance
     */
    public function bulkSchedule(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_ids' => 'required|array|min:1|max:50',
            'item_ids.*' => 'required|integer|exists:inventory_items,id',
            'maintenance_type' => 'required|string|in:repair,inspection,cleaning,calibration,upgrade,replacement,preventive',
            'description' => 'required|string|max:1000',
            'priority' => 'sometimes|string|in:low,medium,high,urgent',
            'scheduled_date' => 'required|date|after:today',
            'estimated_duration' => 'sometimes|integer|min:1',
            'estimated_cost' => 'sometimes|numeric|min:0',
            'assigned_to' => 'sometimes|integer|exists:users,id',
            'notes' => 'sometimes|string|max:2000'
        ]);

        try {
            $result = $this->maintenanceService->bulkScheduleMaintenance(
                $validated['item_ids'],
                $validated
            );
            
            return $this->successResponse($result, 'Bulk maintenance scheduling completed');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get maintenance calendar
     */
    public function calendar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'month' => 'sometimes|integer|min:1|max:12',
            'year' => 'sometimes|integer|min:2020|max:2030',
            'assigned_to' => 'sometimes|integer|exists:users,id',
            'maintenance_type' => 'sometimes|string',
            'institution_id' => 'sometimes|integer|exists:institutions,id'
        ]);

        try {
            $calendar = $this->maintenanceService->getMaintenanceCalendar($validated);
            
            return $this->successResponse($calendar, 'Maintenance calendar retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }
}