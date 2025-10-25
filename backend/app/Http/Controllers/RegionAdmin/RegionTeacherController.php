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

            // Authorization check - DB-based (supports both web and sanctum guards)
            $allRoles = \DB::table('model_has_roles')
                ->where('model_type', 'App\\Models\\User')
                ->where('model_id', $user->id)
                ->pluck('role_id');

            $hasPermission = \DB::table('role_has_permissions')
                ->whereIn('role_id', $allRoles)
                ->whereIn('permission_id', function($query) {
                    $query->select('id')
                        ->from('permissions')
                        ->where('name', 'teachers.read');
                })
                ->exists();

            if (!$hasPermission) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim məlumatlarını oxumaq səlahiyyətiniz yoxdur'
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

    /**
     * Show single teacher details
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
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
            if (!$region || $region->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid region'
                ], 400);
            }

            // Get teacher with full details
            $teacher = $this->teacherService->getTeacherDetails($id, $region);

            if (!$teacher) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim tapılmadı və ya sizin regionunuzda deyil'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $teacher,
            ]);

        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error getting teacher details', [
                'teacher_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Müəllim məlumatlarını əldə edərkən xəta baş verdi'
            ], 500);
        }
    }

    /**
     * Create new teacher
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Authorization check
            if (!$user->can('teachers.create')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Missing teachers.create permission'
                ], 403);
            }

            $region = $user->institution;
            if (!$region || $region->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid region'
                ], 400);
            }

            // Validation
            $validated = $request->validate([
                'email' => 'required|email|unique:users,email',
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'institution_id' => 'required|exists:institutions,id',
                'position_type' => 'nullable|string|max:255',
                'employment_status' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:20',
                'password' => 'nullable|string|min:6',
            ]);

            Log::info('RegionTeacherController - Creating teacher', [
                'email' => $validated['email'],
                'institution_id' => $validated['institution_id'],
            ]);

            // Create teacher
            $teacher = $this->teacherService->createTeacher($validated, $region);

            return response()->json([
                'success' => true,
                'data' => $teacher,
                'message' => 'Müəllim uğurla yaradıldı',
            ], 201);

        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error creating teacher', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Müəllim yaradılarkən xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update teacher
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
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

            $region = $user->institution;
            if (!$region || $region->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid region'
                ], 400);
            }

            // Validation
            $validated = $request->validate([
                'email' => 'sometimes|email|unique:users,email,' . $id,
                'first_name' => 'sometimes|string|max:255',
                'last_name' => 'sometimes|string|max:255',
                'institution_id' => 'sometimes|exists:institutions,id',
                'position_type' => 'nullable|string|max:255',
                'employment_status' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:20',
                'is_active' => 'sometimes|boolean',
            ]);

            Log::info('RegionTeacherController - Updating teacher', [
                'teacher_id' => $id,
                'fields' => array_keys($validated),
            ]);

            // Update teacher
            $teacher = $this->teacherService->updateTeacher($id, $validated, $region);

            if (!$teacher) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim tapılmadı və ya sizin regionunuzda deyil'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $teacher,
                'message' => 'Müəllim uğurla yeniləndi',
            ]);

        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error updating teacher', [
                'teacher_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Müəllim yenilənərkən xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Soft delete teacher
     *
     * @param int $id
     * @return JsonResponse
     */
    public function softDelete(int $id): JsonResponse
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

            $region = $user->institution;
            if (!$region || $region->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid region'
                ], 400);
            }

            Log::info('RegionTeacherController - Soft deleting teacher', [
                'teacher_id' => $id,
            ]);

            $deleted = $this->teacherService->softDeleteTeacher($id, $region);

            if (!$deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim tapılmadı və ya sizin regionunuzda deyil'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Müəllim deaktiv edildi',
            ]);

        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error soft deleting teacher', [
                'teacher_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Müəllim silinərkən xəta baş verdi'
            ], 500);
        }
    }

    /**
     * Hard delete teacher
     *
     * @param int $id
     * @return JsonResponse
     */
    public function hardDelete(int $id): JsonResponse
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

            $region = $user->institution;
            if (!$region || $region->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid region'
                ], 400);
            }

            Log::info('RegionTeacherController - Hard deleting teacher', [
                'teacher_id' => $id,
            ]);

            $deleted = $this->teacherService->hardDeleteTeacher($id, $region);

            if (!$deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim tapılmadı və ya sizin regionunuzda deyil'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Müəllim tam silindi',
            ]);

        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error hard deleting teacher', [
                'teacher_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Müəllim silinərkən xəta baş verdi'
            ], 500);
        }
    }

    /**
     * Import teachers from CSV/Excel
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function import(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Authorization check - check permissions via role (supports both web and sanctum guards)
            $allRoles = \DB::table('model_has_roles')
                ->where('model_type', 'App\\Models\\User')
                ->where('model_id', $user->id)
                ->pluck('role_id');

            $hasPermission = \DB::table('role_has_permissions')
                ->whereIn('role_id', $allRoles)
                ->whereIn('permission_id', function($query) {
                    $query->select('id')
                        ->from('permissions')
                        ->where('name', 'teachers.create');
                })
                ->exists();

            if (!$hasPermission) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim yaratmaq səlahiyyətiniz yoxdur'
                ], 403);
            }

            $region = $user->institution;
            if (!$region || $region->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid region'
                ], 400);
            }

            // Validation
            $validated = $request->validate([
                'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240', // 10MB max
                'skip_duplicates' => 'nullable|boolean',
                'update_existing' => 'nullable|boolean',
            ]);

            Log::info('RegionTeacherController - Importing teachers', [
                'file_name' => $request->file('file')->getClientOriginalName(),
                'file_size' => $request->file('file')->getSize(),
                'skip_duplicates' => $request->boolean('skip_duplicates'),
                'update_existing' => $request->boolean('update_existing'),
            ]);

            $result = $this->teacherService->importTeachers(
                $request->file('file'),
                $region,
                $request->boolean('skip_duplicates'),
                $request->boolean('update_existing')
            );

            return response()->json([
                'success' => true,
                'imported' => $result['success_count'],
                'errors' => $result['error_count'],
                'details' => $result['details'],
                'message' => "{$result['success_count']} müəllim import edildi, {$result['error_count']} xəta",
            ]);

        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error importing teachers', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'İmport zamanı xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download Excel import template
     *
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function downloadImportTemplate()
    {
        try {
            $user = Auth::user();

            // Authorization check - same as import
            $allRoles = \DB::table('model_has_roles')
                ->where('model_type', 'App\\Models\\User')
                ->where('model_id', $user->id)
                ->pluck('role_id');

            $hasPermission = \DB::table('role_has_permissions')
                ->whereIn('role_id', $allRoles)
                ->whereIn('permission_id', function($query) {
                    $query->select('id')
                        ->from('permissions')
                        ->where('name', 'teachers.read'); // Template download requires read permission
                })
                ->exists();

            if (!$hasPermission) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim məlumatlarını oxumaq səlahiyyətiniz yoxdur'
                ], 403);
            }

            $region = $user->institution;

            if (!$region || $region->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid region'
                ], 400);
            }

            Log::info('RegionTeacherController - Downloading Excel import template', [
                'region_id' => $region->id,
                'region_name' => $region->name,
            ]);

            return $this->teacherService->generateImportTemplate($region);

        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error downloading template', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Şablon yüklənərkən xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }
}
