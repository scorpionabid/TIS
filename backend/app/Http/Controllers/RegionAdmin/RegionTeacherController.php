<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use App\Services\RegionAdmin\RegionTeacherService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class RegionTeacherController extends Controller
{
    protected RegionTeacherService $teacherService;

    public function __construct(RegionTeacherService $teacherService)
    {
        $this->teacherService = $teacherService;
    }

    /**
     * Get all teachers for the region with filtering and statistics
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Authorization check
            if (!$user->can('teachers.read')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Missing teachers.read permission'
                ], 403);
            }

            $region = $user->institution;

            // Verify user's institution is a region (level 2)
            if (!$region || $region->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'İstifadəçi regional admini deyil və ya müəssisə regional ofis deyil'
                ], 400);
            }

            // Validation
            $validated = $request->validate([
                'sector_ids' => 'nullable|array',
                'sector_ids.*' => 'exists:institutions,id',
                'school_ids' => 'nullable|array',
                'school_ids.*' => 'exists:institutions,id',
                'department_id' => 'nullable|exists:departments,id',
                'position_type' => 'nullable|string',
                'employment_status' => 'nullable|string',
                'is_active' => 'nullable|boolean',
                'search' => 'nullable|string|max:255',
                'sort_by' => 'nullable|string|in:name,email,created_at',
                'sort_order' => 'nullable|string|in:asc,desc',
                'per_page' => 'nullable|integer|min:10|max:100',
            ]);

            Log::info('RegionTeacherController - Getting teachers', [
                'region_id' => $region->id,
                'region_name' => $region->name,
                'filters' => $validated,
            ]);

            // Get teachers with filters and statistics
            $result = $this->teacherService->getRegionTeachers($request, $region);

            return response()->json([
                'success' => true,
                'data' => $result['data']->items(),
                'pagination' => [
                    'current_page' => $result['data']->currentPage(),
                    'last_page' => $result['data']->lastPage(),
                    'per_page' => $result['data']->perPage(),
                    'total' => $result['data']->total(),
                    'from' => $result['data']->firstItem(),
                    'to' => $result['data']->lastItem(),
                ],
                'statistics' => $result['statistics'],
            ]);

        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error getting teachers', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Müəllimləri əldə edərkən xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk update teacher status
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkUpdateStatus(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Authorization check
            if (!$user->can('teachers.update')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Missing teachers.update permission'
                ], 403);
            }

            // Validation
            $validated = $request->validate([
                'teacher_ids' => 'required|array|min:1',
                'teacher_ids.*' => 'exists:users,id',
                'is_active' => 'required|boolean',
            ]);

            Log::info('RegionTeacherController - Bulk update status', [
                'teacher_count' => count($validated['teacher_ids']),
                'is_active' => $validated['is_active'],
            ]);

            $updated = $this->teacherService->bulkUpdateStatus(
                $validated['teacher_ids'],
                $validated['is_active']
            );

            return response()->json([
                'success' => true,
                'message' => "{$updated} müəllimin statusu yeniləndi",
                'updated_count' => $updated,
            ]);

        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error bulk updating status', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Statusu yeniləyərkən xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk delete teachers
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Authorization check
            if (!$user->can('teachers.delete')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Missing teachers.delete permission'
                ], 403);
            }

            // Validation
            $validated = $request->validate([
                'teacher_ids' => 'required|array|min:1',
                'teacher_ids.*' => 'exists:users,id',
            ]);

            Log::info('RegionTeacherController - Bulk delete', [
                'teacher_count' => count($validated['teacher_ids']),
            ]);

            $deleted = $this->teacherService->bulkDelete($validated['teacher_ids']);

            return response()->json([
                'success' => true,
                'message' => "{$deleted} müəllim silindi",
                'deleted_count' => $deleted,
            ]);

        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error bulk deleting', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Müəllimləri silərkən xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export teachers to Excel
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function export(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Authorization check
            if (!$user->can('teachers.read')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $region = $user->institution;

            if (!$region || $region->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid region'
                ], 400);
            }

            Log::info('RegionTeacherController - Export teachers', [
                'region_id' => $region->id,
            ]);

            $data = $this->teacherService->exportTeachers($request, $region);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Müəllimlər uğurla export edildi',
            ]);

        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error exporting', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Export zamanı xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get sectors for the region
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getSectors(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $region = $user->institution;

            if (!$region || $region->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid region'
                ], 400);
            }

            $sectors = $this->teacherService->getRegionSectors($region);

            return response()->json([
                'success' => true,
                'data' => $sectors,
            ]);

        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error getting sectors', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Sektorları əldə edərkən xəta baş verdi'
            ], 500);
        }
    }

    /**
     * Get schools for sectors or entire region
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getSchools(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $region = $user->institution;

            if (!$region || $region->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid region'
                ], 400);
            }

            $sectorIds = $request->input('sector_ids');
            if ($sectorIds && is_string($sectorIds)) {
                $sectorIds = explode(',', $sectorIds);
            }

            $schools = $this->teacherService->getRegionSchools($sectorIds, $region);

            return response()->json([
                'success' => true,
                'data' => $schools,
            ]);

        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error getting schools', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Məktəbləri əldə edərkən xəta baş verdi'
            ], 500);
        }
    }
}
