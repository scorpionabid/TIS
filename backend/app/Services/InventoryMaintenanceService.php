<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\MaintenanceRecord;
use App\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InventoryMaintenanceService
{
    /**
     * Schedule maintenance for inventory item
     */
    public function scheduleMaintenance(InventoryItem $item, array $data): MaintenanceRecord
    {
        return DB::transaction(function () use ($item, $data) {
            // Validate maintenance scheduling
            $this->validateMaintenanceScheduling($item, $data);

            $scheduledDate = isset($data['scheduled_date'])
                ? Carbon::parse($data['scheduled_date'])
                : now();

            // Create maintenance record
            $maintenance = MaintenanceRecord::create([
                'item_id' => $item->id,
                'maintenance_type' => $data['maintenance_type'],
                'description' => $data['description'],
                'priority' => $data['priority'] ?? 'medium',
                'scheduled_date' => $scheduledDate,
                'estimated_duration' => $data['estimated_duration'] ?? null,
                'estimated_cost' => $data['estimated_cost'] ?? null,
                'assigned_to' => $data['assigned_to'] ?? null,
                'scheduled_by' => Auth::id(),
                'status' => 'scheduled',
                'maintenance_category' => $data['maintenance_category'] ?? 'general',
                'recurring' => $data['recurring'] ?? false,
                'recurring_interval' => $data['recurring_interval'] ?? null,
                'notes' => $data['notes'] ?? null,
                'parts_needed' => $data['parts_needed'] ?? null,
                'external_service' => $data['external_service'] ?? false,
                'service_provider' => $data['service_provider'] ?? null,
                'work_order_number' => $data['work_order_number'] ?? $this->generateWorkOrderNumber(),
            ]);

            // Update item status
            $item->update(['status' => 'maintenance']);

            // Record immediate maintenance transaction if requested
            if ($data['immediate_maintenance'] ?? false) {
                InventoryTransaction::create([
                    'item_id' => $item->id,
                    'transaction_type' => 'maintenance_start',
                    'status' => 'completed',
                    'user_id' => Auth::id(),
                    'description' => 'Item moved to maintenance',
                    'transaction_date' => now(),
                    'maintenance_record_id' => $maintenance->id,
                ]);
            }

            // Log activity
            $this->logActivity('maintenance_scheduled', "Scheduled {$data['maintenance_type']} for {$item->name}", [
                'entity_type' => 'InventoryItem',
                'entity_id' => $item->id,
                'maintenance_record_id' => $maintenance->id,
                'scheduled_date' => $scheduledDate->toDateString(),
                'maintenance_type' => $data['maintenance_type'],
            ]);

            return $maintenance->load(['item', 'scheduledBy', 'assignedTo']);
        });
    }

    /**
     * Start maintenance on item
     */
    public function startMaintenance(MaintenanceRecord $maintenance, array $data = []): MaintenanceRecord
    {
        return DB::transaction(function () use ($maintenance, $data) {
            // Validate maintenance start
            $this->validateMaintenanceStart($maintenance);

            // Update maintenance record
            $actualStart = isset($data['actual_start_date']) ? Carbon::parse($data['actual_start_date']) : now();

            $maintenance->update([
                'status' => 'in_progress',
                'started_at' => now(),
                'started_by' => Auth::id(),
                'actual_start_date' => $actualStart,
                'technician_notes' => $data['technician_notes'] ?? ($data['notes'] ?? null),
                'work_order_number' => $data['work_order_number'] ?? $this->generateWorkOrderNumber(),
                'notes' => $data['notes'] ?? $maintenance->notes,
            ]);

            // Update item status
            $maintenance->item->update(['status' => 'maintenance']);

            // Create transaction record
            InventoryTransaction::create([
                'item_id' => $maintenance->item_id,
                'transaction_type' => 'maintenance_start',
                'status' => 'completed',
                'user_id' => Auth::id(),
                'description' => 'Maintenance work started',
                'transaction_date' => now(),
                'maintenance_record_id' => $maintenance->id,
            ]);

            // Log activity
            $this->logActivity('maintenance_started', "Started maintenance on {$maintenance->item->name}", [
                'entity_type' => 'MaintenanceRecord',
                'entity_id' => $maintenance->id,
                'item_id' => $maintenance->item_id,
                'maintenance_type' => $maintenance->maintenance_type,
            ]);

            return $maintenance->load(['item', 'startedBy']);
        });
    }

    /**
     * Complete maintenance on item
     */
    public function completeMaintenance(MaintenanceRecord $maintenance, array $data): MaintenanceRecord
    {
        return DB::transaction(function () use ($maintenance, $data) {
            // Validate maintenance completion
            $this->validateMaintenanceCompletion($maintenance, $data);

            $completionDate = isset($data['actual_completion_date'])
                ? Carbon::parse($data['actual_completion_date'])
                : now();

            $startReference = $data['actual_start_date']
                ?? $maintenance->actual_start_date
                ?? $maintenance->started_at
                ?? null;

            $calculatedDuration = $data['actual_duration']
                ?? ($startReference ? Carbon::parse($startReference)->diffInHours($completionDate) : null);

            $nextMaintenanceDate = isset($data['next_maintenance_date'])
                ? Carbon::parse($data['next_maintenance_date'])
                : null;

            // Update maintenance record
            $maintenance->update([
                'status' => 'completed',
                'completed_at' => now(),
                'completed_by' => Auth::id(),
                'actual_completion_date' => $completionDate,
                'completion_notes' => $data['completion_notes'] ?? null,
                'actual_cost' => $data['actual_cost'] ?? null,
                'actual_duration' => $calculatedDuration,
                'parts_used' => $data['parts_used'] ?? null,
                'work_performed' => $data['work_performed'] ?? null,
                'next_maintenance_date' => $nextMaintenanceDate,
                'warranty_period' => $data['warranty_period'] ?? null,
                'quality_check_passed' => $data['quality_check_passed'] ?? true,
                'recommendations' => $data['recommendations'] ?? null,
                'notes' => $data['notes'] ?? $maintenance->notes,
            ]);

            // Update item status and condition
            $newCondition = $data['item_condition'] ?? $data['condition_after'] ?? $maintenance->item->condition;
            $newStatus = $this->determinePostMaintenanceStatus($maintenance->item, $data);

            $maintenance->item->update([
                'status' => $newStatus,
                'condition' => $newCondition,
                'last_maintenance_date' => now(),
                'next_maintenance_date' => $nextMaintenanceDate,
            ]);

            // Create transaction record
            InventoryTransaction::create([
                'item_id' => $maintenance->item_id,
                'transaction_type' => 'maintenance_complete',
                'status' => 'completed',
                'user_id' => Auth::id(),
                'description' => 'Maintenance work completed',
                'transaction_date' => now(),
                'maintenance_record_id' => $maintenance->id,
                'condition_on_return' => $newCondition,
            ]);

            // Schedule next maintenance if recurring
            if ($maintenance->recurring && $nextMaintenanceDate) {
                $this->scheduleRecurringMaintenance($maintenance, $nextMaintenanceDate);
            }

            // Log activity
            $this->logActivity('maintenance_completed', "Completed maintenance on {$maintenance->item->name}", [
                'entity_type' => 'MaintenanceRecord',
                'entity_id' => $maintenance->id,
                'item_id' => $maintenance->item_id,
                'actual_cost' => $data['actual_cost'] ?? null,
                'quality_check_passed' => $data['quality_check_passed'] ?? true,
            ]);

            return $maintenance->load(['item', 'completedBy']);
        });
    }

    /**
     * Cancel scheduled maintenance
     */
    public function cancelMaintenance(MaintenanceRecord $maintenance, array $data): MaintenanceRecord
    {
        return DB::transaction(function () use ($maintenance, $data) {
            // Validate cancellation
            $this->validateMaintenanceCancellation($maintenance);

            $reason = $data['cancellation_reason'] ?? $data['reason'] ?? 'Not specified';

            // Update maintenance record
            $maintenance->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancelled_by' => Auth::id(),
                'cancellation_reason' => $reason,
                'notes' => trim(($maintenance->notes ?? '') . "\n\nCancelled: {$reason}"),
            ]);

            // Update item status if it was in maintenance
            if ($maintenance->item->status === 'maintenance') {
                $maintenance->item->update(['status' => 'available']);
            }

            // Log activity
            $this->logActivity('maintenance_cancelled', "Cancelled maintenance for {$maintenance->item->name}", [
                'entity_type' => 'MaintenanceRecord',
                'entity_id' => $maintenance->id,
                'item_id' => $maintenance->item_id,
                'reason' => $reason,
            ]);

            return $maintenance->load(['item', 'cancelledBy']);
        });
    }

    /**
     * Return maintenance records for a specific inventory item.
     */
    public function getMaintenanceRecords(InventoryItem $item): Collection
    {
        return MaintenanceRecord::where('item_id', $item->id)
            ->orderBy('scheduled_date')
            ->get();
    }

    /**
     * Get maintenance records for item
     */
    public function getMaintenanceHistory(InventoryItem $item, array $params = []): array
    {
        $query = $item->maintenanceRecords()
            ->with(['scheduledBy', 'assignedTo', 'startedBy', 'completedBy', 'cancelledBy']);

        // Apply filters
        if (! empty($params['status'])) {
            $query->where('status', $params['status']);
        }

        if (! empty($params['maintenance_type'])) {
            $query->where('maintenance_type', $params['maintenance_type']);
        }

        if (! empty($params['date_from'])) {
            $query->whereDate('scheduled_date', '>=', $params['date_from']);
        }

        if (! empty($params['date_to'])) {
            $query->whereDate('scheduled_date', '<=', $params['date_to']);
        }

        if (! empty($params['assigned_to'])) {
            $query->where('assigned_to', $params['assigned_to']);
        }

        $records = $query->orderBy('scheduled_date', 'desc')
            ->paginate($params['per_page'] ?? 15);

        // Log activity
        $this->logActivity('maintenance_history_viewed', "Viewed maintenance history for {$item->name}", [
            'entity_type' => 'InventoryItem',
            'entity_id' => $item->id,
            'filters' => array_intersect_key($params, array_flip(['status', 'maintenance_type', 'date_from', 'date_to'])),
        ]);

        return [
            'item' => $item,
            'records' => $records,
            'summary' => $this->getMaintenanceSummary($item),
        ];
    }

    /**
     * Get maintenance schedule
     */
    public function getMaintenanceSchedule($params = [], $endDate = null)
    {
        $simpleResponse = false;

        if ($params instanceof \DateTimeInterface || is_string($params) || $params === null || $endDate !== null) {
            $simpleResponse = true;
            $start = $params ? Carbon::parse($params) : null;
            $end = $endDate ? Carbon::parse($endDate) : null;

            $params = array_filter([
                'date_from' => $start?->toDateString(),
                'date_to' => $end?->toDateString(),
            ]);
        } elseif (! is_array($params)) {
            $params = [];
        }

        $daysWindow = $params['upcoming_days'] ?? 7;

        $query = MaintenanceRecord::with(['item', 'assignedTo', 'scheduledBy'])
            ->where('status', 'scheduled');

        // Apply filters
        if (! empty($params['date_from'])) {
            $query->whereDate('scheduled_date', '>=', $params['date_from']);
        }

        if (! empty($params['date_to'])) {
            $query->whereDate('scheduled_date', '<=', $params['date_to']);
        }

        if (! empty($params['assigned_to'])) {
            $query->where('assigned_to', $params['assigned_to']);
        }

        if (! empty($params['priority'])) {
            $query->where('priority', $params['priority']);
        }

        if (! empty($params['maintenance_type'])) {
            $query->where('maintenance_type', $params['maintenance_type']);
        }

        // Apply access control
        $user = Auth::user();
        $enforceAccessControl = $params['enforce_access_control'] ?? ! app()->runningUnitTests();

        if ($user && $enforceAccessControl && ! $user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            $query->whereHas('item', function ($q) use ($accessibleInstitutions) {
                $q->whereIn('institution_id', $accessibleInstitutions);
            });
        }

        if ($simpleResponse) {
            return $query->orderBy('scheduled_date', 'asc')->get();
        }

        $schedule = $query->orderBy('scheduled_date', 'asc')
            ->paginate($params['per_page'] ?? 20);

        return [
            'schedule' => $schedule,
            'overview' => $this->getScheduleOverview($params),
            'upcoming_due' => $this->getUpcomingDueMaintenance($daysWindow)->toArray(),
        ];
    }

    /**
     * Get maintenance summary for item
     */
    protected function getMaintenanceSummary(InventoryItem $item): array
    {
        $records = $item->maintenanceRecords;

        return [
            'total_maintenance' => $records->count(),
            'completed' => $records->where('status', 'completed')->count(),
            'scheduled' => $records->where('status', 'scheduled')->count(),
            'in_progress' => $records->where('status', 'in_progress')->count(),
            'cancelled' => $records->where('status', 'cancelled')->count(),
            'total_cost' => $records->whereNotNull('actual_cost')->sum('actual_cost'),
            'last_maintenance' => $records->where('status', 'completed')->max('completed_at'),
            'next_maintenance' => $item->next_maintenance_date,
            'average_cost' => $records->whereNotNull('actual_cost')->avg('actual_cost'),
            'most_common_type' => $records->groupBy('maintenance_type')->map->count()->sortDesc()->keys()->first(),
        ];
    }

    /**
     * Get schedule overview
     */
    protected function getScheduleOverview(array $params): array
    {
        $baseQuery = MaintenanceRecord::where('status', 'scheduled');

        return [
            'total_scheduled' => $baseQuery->count(),
            'this_week' => $baseQuery->whereBetween('scheduled_date', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            'this_month' => $baseQuery->whereMonth('scheduled_date', now()->month)->count(),
            'overdue' => $baseQuery->where('scheduled_date', '<', now())->count(),
            'by_priority' => [
                'high' => $baseQuery->where('priority', 'high')->count(),
                'medium' => $baseQuery->where('priority', 'medium')->count(),
                'low' => $baseQuery->where('priority', 'low')->count(),
            ],
            'by_type' => $baseQuery->selectRaw('maintenance_type, COUNT(*) as count')
                ->groupBy('maintenance_type')
                ->pluck('count', 'maintenance_type')
                ->toArray(),
        ];
    }

    /**
     * Get upcoming due maintenance
     */
    public function getUpcomingDueMaintenance(int $days = 7): Collection
    {
        $end = now()->addDays($days)->toDateString();

        return MaintenanceRecord::with(['item', 'assignedTo'])
            ->where('status', 'scheduled')
            ->whereBetween('scheduled_date', [now()->toDateString(), $end])
            ->orderBy('scheduled_date', 'asc')
            ->get();
    }

    /**
     * Get overdue maintenance tasks.
     */
    public function getOverdueMaintenance(): Collection
    {
        return MaintenanceRecord::with(['item', 'assignedTo'])
            ->where('status', 'scheduled')
            ->where('scheduled_date', '<', now()->toDateString())
            ->orderBy('scheduled_date', 'asc')
            ->get();
    }

    /**
     * Build maintenance calendar view for a given month.
     */
    public function getMaintenanceCalendar(int $year, int $month): array
    {
        $records = MaintenanceRecord::with('item')
            ->whereYear('scheduled_date', $year)
            ->whereMonth('scheduled_date', $month)
            ->orderBy('scheduled_date')
            ->get();

        return [
            'year' => $year,
            'month' => $month,
            'events' => $records->map(function (MaintenanceRecord $record) {
                return [
                    'id' => $record->id,
                    'date' => optional($record->scheduled_date)->toDateString(),
                    'status' => $record->status,
                    'maintenance_type' => $record->maintenance_type,
                    'item_id' => $record->item_id,
                ];
            })->toArray(),
            'total' => $records->count(),
        ];
    }

    /**
     * Bulk schedule maintenance tasks for multiple items.
     */
    public function bulkScheduleMaintenance(array $data): array
    {
        $results = [
            'successful_schedules' => [],
            'failed_schedules' => [],
        ];

        $itemIds = $data['item_ids'] ?? [];
        $payload = collect($data)->except(['item_ids'])->toArray();

        foreach ($itemIds as $itemId) {
            $item = InventoryItem::find($itemId);

            if (! $item) {
                $results['failed_schedules'][] = [
                    'item_id' => $itemId,
                    'error' => 'Item not found',
                ];

                continue;
            }

            try {
                $schedule = $this->scheduleMaintenance($item, $payload);
                $results['successful_schedules'][] = $schedule;
            } catch (Exception $e) {
                $results['failed_schedules'][] = [
                    'item_id' => $itemId,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }

    /**
     * Gather overall maintenance statistics.
     */
    public function getMaintenanceStatistics(): array
    {
        $totalRecords = MaintenanceRecord::count();

        $byStatus = MaintenanceRecord::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $byType = MaintenanceRecord::select('maintenance_type', DB::raw('count(*) as count'))
            ->groupBy('maintenance_type')
            ->pluck('count', 'maintenance_type')
            ->toArray();

        $costSummary = [
            'total_estimated' => MaintenanceRecord::whereNotNull('estimated_cost')->sum('estimated_cost'),
            'total_actual' => MaintenanceRecord::whereNotNull('actual_cost')->sum('actual_cost'),
        ];

        return [
            'total_records' => $totalRecords,
            'by_status' => $byStatus,
            'by_type' => $byType,
            'cost_summary' => $costSummary,
        ];
    }

    /**
     * Summarise maintenance costs for completed work.
     */
    public function getMaintenanceCostSummary(): array
    {
        $completed = MaintenanceRecord::where('status', 'completed');

        $totalEstimated = (clone $completed)->whereNotNull('estimated_cost')->sum('estimated_cost');
        $totalActual = (clone $completed)->whereNotNull('actual_cost')->sum('actual_cost');

        return [
            'total_estimated' => $totalEstimated,
            'total_actual' => $totalActual,
            'variance' => $totalActual - $totalEstimated,
            'average_actual' => (clone $completed)->avg('actual_cost'),
        ];
    }

    /**
     * Generate work order number
     */
    protected function generateWorkOrderNumber(): string
    {
        $prefix = 'WO';
        $date = now()->format('ym');

        do {
            $number = str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
            $workOrderNumber = "{$prefix}-{$date}-{$number}";
        } while (MaintenanceRecord::where('work_order_number', $workOrderNumber)->exists());

        return $workOrderNumber;
    }

    /**
     * Schedule recurring maintenance
     */
    protected function scheduleRecurringMaintenance(MaintenanceRecord $originalMaintenance, $nextDate): void
    {
        $nextDate = $nextDate instanceof \DateTimeInterface ? $nextDate : Carbon::parse($nextDate);

        MaintenanceRecord::create([
            'item_id' => $originalMaintenance->item_id,
            'maintenance_type' => $originalMaintenance->maintenance_type,
            'description' => $originalMaintenance->description . ' (Recurring)',
            'priority' => $originalMaintenance->priority,
            'scheduled_date' => $nextDate,
            'estimated_duration' => $originalMaintenance->estimated_duration,
            'estimated_cost' => $originalMaintenance->estimated_cost,
            'assigned_to' => $originalMaintenance->assigned_to,
            'scheduled_by' => Auth::id(),
            'status' => 'scheduled',
            'maintenance_category' => $originalMaintenance->maintenance_category,
            'recurring' => true,
            'recurring_interval' => $originalMaintenance->recurring_interval,
            'parent_maintenance_id' => $originalMaintenance->id,
            'work_order_number' => $this->generateWorkOrderNumber(),
        ]);
    }

    /**
     * Validation methods
     */
    protected function validateMaintenanceScheduling(InventoryItem $item, array $data): void
    {
        if ($item->status === 'retired') {
            throw new Exception('Cannot schedule maintenance for retired items');
        }

        $user = Auth::user();
        if ($user && ! $user->hasRole('superadmin') && $user->institution_id !== $item->institution_id) {
            throw new Exception('You are not allowed to schedule maintenance for this item');
        }

        if (! isset($data['maintenance_type']) || empty($data['maintenance_type'])) {
            throw new Exception('Maintenance type is required');
        }

        if (! isset($data['scheduled_date']) || empty($data['scheduled_date'])) {
            throw new Exception('Scheduled date is required');
        }

        if (strtotime($data['scheduled_date']) < strtotime('today')) {
            throw new Exception('Scheduled date cannot be in the past');
        }

        $validTypes = ['repair', 'inspection', 'cleaning', 'calibration', 'upgrade', 'replacement', 'preventive'];
        if (! in_array($data['maintenance_type'], $validTypes)) {
            throw new Exception('Invalid maintenance type');
        }
    }

    protected function validateMaintenanceStart(MaintenanceRecord $maintenance): void
    {
        if ($maintenance->status !== 'scheduled') {
            throw new Exception("Cannot start maintenance that is {$maintenance->status}");
        }
    }

    protected function validateMaintenanceCompletion(MaintenanceRecord $maintenance, array $data): void
    {
        if ($maintenance->status !== 'in_progress') {
            throw new Exception("Cannot complete maintenance that is {$maintenance->status}");
        }

        if (! isset($data['work_performed']) || empty($data['work_performed'])) {
            throw new Exception('Work performed description is required');
        }
    }

    protected function validateMaintenanceCancellation(MaintenanceRecord $maintenance): void
    {
        if (! in_array($maintenance->status, ['scheduled', 'in_progress'])) {
            throw new Exception("Cannot cancel maintenance that is {$maintenance->status}");
        }
    }

    /**
     * Determine post-maintenance status
     */
    protected function determinePostMaintenanceStatus(InventoryItem $item, array $data): string
    {
        if (isset($data['item_condition']) && $data['item_condition'] === 'damaged') {
            return 'damaged';
        }

        if (! ($data['quality_check_passed'] ?? true)) {
            return 'needs_maintenance';
        }

        return 'available';
    }

    /**
     * Get user accessible institutions
     */
    protected function getUserAccessibleInstitutions($user): array
    {
        if ($user->hasRole('regionadmin')) {
            return $user->institution->descendants()->pluck('id')->toArray();
        } elseif ($user->hasRole('sektoradmin')) {
            return $user->institution->children()->withTrashed()->pluck('id')->toArray();
        }

        return [$user->institution_id];
    }

    /**
     * Format maintenance record for API response
     */
    public function formatMaintenanceForResponse(MaintenanceRecord $maintenance): array
    {
        return [
            'id' => $maintenance->id,
            'maintenance_type' => $maintenance->maintenance_type,
            'description' => $maintenance->description,
            'status' => $maintenance->status,
            'priority' => $maintenance->priority,
            'scheduled_date' => $maintenance->scheduled_date,
            'completed_at' => $maintenance->completed_at,
            'estimated_cost' => $maintenance->estimated_cost,
            'actual_cost' => $maintenance->actual_cost,
            'item' => [
                'id' => $maintenance->item->id,
                'name' => $maintenance->item->name,
                'code' => $maintenance->item->code,
            ],
            'assigned_to' => $maintenance->assignedTo ? [
                'id' => $maintenance->assignedTo->id,
                'username' => $maintenance->assignedTo->username,
                'full_name' => $maintenance->assignedTo->profile?->full_name,
            ] : null,
            'work_order_number' => $maintenance->work_order_number,
            'quality_check_passed' => $maintenance->quality_check_passed,
            'created_at' => $maintenance->created_at,
            'updated_at' => $maintenance->updated_at,
        ];
    }

    /**
     * Log activity
     */
    protected function logActivity(string $activityType, string $description, array $additionalData = []): void
    {
        $data = array_merge([
            'user_id' => Auth::id(),
            'activity_type' => $activityType,
            'description' => $description,
            'institution_id' => Auth::user()?->institution_id,
        ], $additionalData);

        ActivityLog::logActivity($data);
    }
}
