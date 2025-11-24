<?php

namespace App\Http\Controllers;

use App\Services\SectorAnalyticsService;
use App\Services\SectorCrudService;
use App\Services\SectorManagerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class SectorControllerRefactored extends BaseController
{
    protected $sectorCrudService;

    protected $sectorManagerService;

    protected $sectorAnalyticsService;

    public function __construct(
        SectorCrudService $sectorCrudService,
        SectorManagerService $sectorManagerService,
        SectorAnalyticsService $sectorAnalyticsService
    ) {
        $this->sectorCrudService = $sectorCrudService;
        $this->sectorManagerService = $sectorManagerService;
        $this->sectorAnalyticsService = $sectorAnalyticsService;
    }

    /**
     * Get sectors with filtering and statistics
     */
    public function index(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'region_id' => 'nullable|exists:institutions,id',
                'is_active' => 'nullable|string|in:all,true,false',
                'search' => 'nullable|string|max:255',
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            $user = Auth::user();
            $result = $this->sectorCrudService->getSectors($request, $user);

            return $this->successResponse($result, 'Sektorlar uğurla alındı');
        }, 'sector.index');
    }

    /**
     * Create new sector
     */
    public function store(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => 'required|string|max:20|unique:institutions,code',
                'parent_id' => 'required|exists:institutions,id',
                'address' => 'nullable|string|max:500',
                'phone' => 'nullable|string|max:20',
                'email' => 'nullable|email|max:255',
                'description' => 'nullable|string|max:1000',
                'manager_id' => 'nullable|exists:users,id',
                'is_active' => 'boolean',
            ]);

            $user = Auth::user();
            $sector = $this->sectorCrudService->createSector($validated, $user);

            return $this->successResponse($sector, 'Sektor yaradıldı', 201);
        }, 'sector.store');
    }

    /**
     * Get single sector details
     */
    public function show(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();
            $sector = $this->sectorCrudService->getSector($id, $user);

            return $this->successResponse($sector, 'Sektor məlumatları alındı');
        }, 'sector.show');
    }

    /**
     * Update sector
     */
    public function update(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'code' => [
                    'sometimes',
                    'string',
                    'max:20',
                    Rule::unique('institutions', 'code')->ignore($id),
                ],
                'address' => 'nullable|string|max:500',
                'phone' => 'nullable|string|max:20',
                'email' => 'nullable|email|max:255',
                'description' => 'nullable|string|max:1000',
                'manager_id' => 'nullable|exists:users,id',
                'is_active' => 'boolean',
            ]);

            $user = Auth::user();
            $sector = $this->sectorCrudService->updateSector($id, $validated, $user);

            return $this->successResponse($sector, 'Sektor yeniləndi');
        }, 'sector.update');
    }

    /**
     * Delete sector
     */
    public function destroy(int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();
            $this->sectorCrudService->deleteSector($id, $user);

            return $this->successResponse(null, 'Sektor silindi');
        }, 'sector.destroy');
    }

    /**
     * Toggle sector status
     */
    public function toggleStatus(int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();
            $sector = $this->sectorCrudService->toggleSectorStatus($id, $user);

            return $this->successResponse($sector, 'Sektor statusu dəyişdirildi');
        }, 'sector.toggle_status');
    }

    /**
     * Get comprehensive sector statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
            ]);

            $user = Auth::user();
            $statistics = $this->sectorAnalyticsService->getSectorStatistics($request, $user);

            return $this->successResponse($statistics, 'Sektor statistikaları alındı');
        }, 'sector.statistics');
    }

    /**
     * Get sector performance metrics
     */
    public function getPerformanceMetrics(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();
            $metrics = $this->sectorAnalyticsService->getSectorPerformanceMetrics($id, $user);

            return $this->successResponse($metrics, 'Sektor performans göstəriciləri alındı');
        }, 'sector.performance_metrics');
    }

    /**
     * Compare multiple sectors
     */
    public function compareSectors(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'sector_ids' => 'required|array|min:2|max:10',
                'sector_ids.*' => 'integer|exists:institutions,id',
            ]);

            $user = Auth::user();
            $comparison = $this->sectorAnalyticsService->getSectorComparison($validated['sector_ids'], $user);

            return $this->successResponse($comparison, 'Sektor müqayisəsi alındı');
        }, 'sector.compare');
    }

    /**
     * Get available managers for sector assignment
     */
    public function getAvailableManagers(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'search' => 'nullable|string|max:255',
                'availability' => 'nullable|string|in:all,available,assigned',
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            $user = Auth::user();
            $managers = $this->sectorManagerService->getAvailableManagers($request, $user);

            return $this->successResponse($managers, 'Mövcud menecerlər alındı');
        }, 'sector.available_managers');
    }

    /**
     * Assign manager to sector
     */
    public function assignManager(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $validated = $request->validate([
                'manager_id' => 'required|exists:users,id',
            ]);

            $user = Auth::user();
            $result = $this->sectorManagerService->assignManager($id, $validated['manager_id'], $user);

            return $this->successResponse($result, 'Menecer təyin edildi');
        }, 'sector.assign_manager');
    }

    /**
     * Remove manager from sector
     */
    public function removeManager(int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();
            $result = $this->sectorManagerService->removeManager($id, $user);

            return $this->successResponse($result, 'Menecer çıxarıldı');
        }, 'sector.remove_manager');
    }

    /**
     * Get sector's current manager
     */
    public function getSectorManager(int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();
            $manager = $this->sectorManagerService->getSectorManager($id, $user);

            return $this->successResponse($manager, 'Sektor meneceri alındı');
        }, 'sector.get_manager');
    }

    /**
     * Get manager assignment history
     */
    public function getManagerHistory(int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();
            $history = $this->sectorManagerService->getManagerHistory($id, $user);

            return $this->successResponse($history, 'Menecer tarixçəsi alındı');
        }, 'sector.manager_history');
    }

    /**
     * Bulk assign managers to multiple sectors
     */
    public function bulkAssignManagers(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'assignments' => 'required|array|min:1|max:50',
                'assignments.*.sector_id' => 'required|integer|exists:institutions,id',
                'assignments.*.manager_id' => 'required|integer|exists:users,id',
            ]);

            $user = Auth::user();
            $results = $this->sectorManagerService->bulkAssignManagers($validated['assignments'], $user);

            $message = "Kütləvi menecer təyinatı tamamlandı: {$results['summary']['success']} uğurlu";
            if ($results['summary']['failed'] > 0) {
                $message .= ", {$results['summary']['failed']} uğursuz";
            }

            return $this->successResponse($results, $message);
        }, 'sector.bulk_assign_managers');
    }

    /**
     * Get manager performance metrics
     */
    public function getManagerPerformance(Request $request, int $managerId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($managerId) {
            $user = Auth::user();
            $performance = $this->sectorManagerService->getManagerPerformance($managerId, $user);

            return $this->successResponse($performance, 'Menecer performansı alındı');
        }, 'sector.manager_performance');
    }
}
