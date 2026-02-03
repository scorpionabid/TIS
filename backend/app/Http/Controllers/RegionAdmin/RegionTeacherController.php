<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Exports\TeacherImportErrorsExport;
use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\User;
use App\Services\RegionAdmin\RegionTeacherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

class RegionTeacherController extends Controller
{
    protected RegionTeacherService $teacherService;

    public function __construct(RegionTeacherService $teacherService)
    {
        $this->teacherService = $teacherService;
    }

    /**
     * Get all teachers for the region with filtering and statistics
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            if (! $this->userHasTeacherReadAccess($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim məlumatlarını oxumaq səlahiyyətiniz yoxdur',
                ], 403);
            }

            $region = $user->institution;

            // SuperAdmin can view any region - get first available region
            if ($user->hasRole('superadmin')) {
                if (! $region) {
                    // Get first region (level 2)
                    $region = Institution::where('level', 2)->first();
                }

                if (! $region) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Sistemdə heç bir region tapılmadı',
                    ], 404);
                }
            } else {
                // Regular RegionAdmin - must have level 2 institution
                if (! $region || $region->level !== 2) {
                    return response()->json([
                        'success' => false,
                        'message' => 'İstifadəçi regional admini deyil və ya müəssisə regional ofis deyil',
                    ], 400);
                }
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
                'message' => 'Müəllimləri əldə edərkən xəta baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk update teacher status
     */
    public function bulkUpdateStatus(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Authorization check
            if (! $user->can('teachers.update')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Missing teachers.update permission',
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
                'message' => 'Statusu yeniləyərkən xəta baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk delete teachers
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Authorization check
            if (! $user->can('teachers.delete')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Missing teachers.delete permission',
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
                'message' => 'Müəllimləri silərkən xəta baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export teachers to Excel
     */
    public function export(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Authorization check
            if (! $this->userHasTeacherReadAccess($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 403);
            }

            $region = $user->institution;

            // SuperAdmin can export from any region - get first available region
            if ($user->hasRole('superadmin')) {
                if (! $region) {
                    $region = Institution::where('level', 2)->first();
                }

                if (! $region) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Sistemdə heç bir region tapılmadı',
                    ], 404);
                }
            } else {
                // Regular RegionAdmin - must have level 2 institution
                if (! $region || $region->level !== 2) {
                    return response()->json([
                        'success' => false,
                        'message' => 'İstifadəçi regional admini deyil və ya müəssisə regional ofis deyil',
                    ], 400);
                }
            }

            Log::info('RegionTeacherController - Export teachers', [
                'user_role' => $user->hasRole('superadmin') ? 'superadmin' : 'regionadmin',
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
                'message' => 'Export zamanı xəta baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get sectors for the region
     */
    public function getSectors(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $region = $user->institution;

            // SuperAdmin can view sectors from any region - get first available region
            if ($user->hasRole('superadmin')) {
                if (! $region) {
                    $region = Institution::where('level', 2)->first();
                }

                if (! $region) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Sistemdə heç bir region tapılmadı',
                    ], 404);
                }
            } else {
                // Regular RegionAdmin - must have level 2 institution
                if (! $region || $region->level !== 2) {
                    return response()->json([
                        'success' => false,
                        'message' => 'İstifadəçi regional admini deyil və ya müəssisə regional ofis deyil',
                    ], 400);
                }
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
                'message' => 'Sektorları əldə edərkən xəta baş verdi',
            ], 500);
        }
    }

    /**
     * Get schools for sectors or entire region
     */
    public function getSchools(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $region = $user->institution;

            // SuperAdmin can view schools from any region - get first available region
            if ($user->hasRole('superadmin')) {
                if (! $region) {
                    $region = Institution::where('level', 2)->first();
                }

                if (! $region) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Sistemdə heç bir region tapılmadı',
                    ], 404);
                }
            } else {
                // Regular RegionAdmin - must have level 2 institution
                if (! $region || $region->level !== 2) {
                    return response()->json([
                        'success' => false,
                        'message' => 'İstifadəçi regional admini deyil və ya müəssisə regional ofis deyil',
                    ], 400);
                }
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
                'message' => 'Məktəbləri əldə edərkən xəta baş verdi',
            ], 500);
        }
    }

    /**
     * Show single teacher details
     */
    public function show(int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            // Authorization check
            if (! $this->userHasTeacherReadAccess($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Missing teachers.read permission',
                ], 403);
            }

            $region = $user->institution;

            // SuperAdmin can view teachers from any region - get first available region
            if ($user->hasRole('superadmin')) {
                if (! $region) {
                    $region = Institution::where('level', 2)->first();
                }

                if (! $region) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Sistemdə heç bir region tapılmadı',
                    ], 404);
                }
            } else {
                // Regular RegionAdmin - must have level 2 institution
                if (! $region || $region->level !== 2) {
                    return response()->json([
                        'success' => false,
                        'message' => 'İstifadəçi regional admini deyil və ya müəssisə regional ofis deyil',
                    ], 400);
                }
            }

            // Get teacher with full details
            $teacher = $this->teacherService->getTeacherDetails($id, $region);

            if (! $teacher) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim tapılmadı və ya sizin regionunuzda deyil',
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
                'message' => 'Müəllim məlumatlarını əldə edərkən xəta baş verdi',
            ], 500);
        }
    }

    /**
     * Create new teacher
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            // Force reload user with permissions
            if ($user) {
                $user->load('roles', 'permissions');
                $user->forgetCachedPermissions();
            }
            
            // Detailed debugging
            Log::info('🔍 RegionTeacherController::store - AUTH DEBUG', [
                'user_id' => $user?->id,
                'user_email' => $user?->email,
                'user_roles' => $user?->roles->pluck('name')->toArray() ?? [],
                'can_teachers_create' => $user?->can('teachers.create'),
                'all_permissions' => $user?->getAllPermissions()->where('name', 'like', 'teachers.%')->pluck('name')->toArray() ?? [],
                'auth_check' => Auth::check(),
                'request_headers' => $request->headers->all(),
                'request_ip' => $request->ip(),
                'request_user_agent' => $request->userAgent(),
            ]);

            // Authorization check
            if (! $user->can('teachers.create')) {
                Log::warning('🚫 RegionTeacherController::store - PERMISSION DENIED', [
                    'user_id' => $user?->id,
                    'user_email' => $user?->email,
                    'user_roles' => $user?->roles->pluck('name')->toArray() ?? [],
                    'required_permission' => 'teachers.create',
                    'user_permissions' => $user?->getAllPermissions()->where('name', 'like', 'teachers.%')->pluck('name')->toArray() ?? [],
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Missing teachers.create permission',
                    'debug_info' => [
                        'user_id' => $user?->id,
                        'user_email' => $user?->email,
                        'user_roles' => $user?->roles->pluck('name')->toArray() ?? [],
                        'can_teachers_create' => $user?->can('teachers.create'),
                    ],
                ], 403);
            }

            $region = $user->institution;

            // SuperAdmin can create teachers in any region - get first available region
            if ($user->hasRole('superadmin')) {
                if (! $region) {
                    $region = Institution::where('level', 2)->first();
                }

                if (! $region) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Sistemdə heç bir region tapılmadı',
                    ], 404);
                }
            } else {
                // Regular RegionAdmin - must have level 2 institution
                if (! $region || $region->level !== 2) {
                    return response()->json([
                        'success' => false,
                        'message' => 'İstifadəçi regional admini deyil və ya müəssisə regional ofis deyil',
                    ], 400);
                }
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
                'message' => 'Müəllim yaradılarkən xəta baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update teacher
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            // Authorization check
            if (! $user->can('teachers.update')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Missing teachers.update permission',
                ], 403);
            }

            $region = $user->institution;

            // SuperAdmin can update teachers in any region - get first available region
            if ($user->hasRole('superadmin')) {
                if (! $region) {
                    $region = Institution::where('level', 2)->first();
                }

                if (! $region) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Sistemdə heç bir region tapılmadı',
                    ], 404);
                }
            } else {
                // Regular RegionAdmin - must have level 2 institution
                if (! $region || $region->level !== 2) {
                    return response()->json([
                        'success' => false,
                        'message' => 'İstifadəçi regional admini deyil və ya müəssisə regional ofis deyil',
                    ], 400);
                }
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

            if (! $teacher) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim tapılmadı və ya sizin regionunuzda deyil',
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
                'message' => 'Müəllim yenilənərkən xəta baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Soft delete teacher
     */
    public function softDelete(int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            // Authorization check
            if (! $user->can('teachers.delete')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Missing teachers.delete permission',
                ], 403);
            }

            $region = $user->institution;

            // SuperAdmin can delete teachers from any region - get first available region
            if ($user->hasRole('superadmin')) {
                if (! $region) {
                    $region = Institution::where('level', 2)->first();
                }

                if (! $region) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Sistemdə heç bir region tapılmadı',
                    ], 404);
                }
            } else {
                // Regular RegionAdmin - must have level 2 institution
                if (! $region || $region->level !== 2) {
                    return response()->json([
                        'success' => false,
                        'message' => 'İstifadəçi regional admini deyil və ya müəssisə regional ofis deyil',
                    ], 400);
                }
            }

            Log::info('RegionTeacherController - Soft deleting teacher', [
                'user_role' => $user->hasRole('superadmin') ? 'superadmin' : 'regionadmin',
                'teacher_id' => $id,
            ]);

            $deleted = $this->teacherService->softDeleteTeacher($id, $region);

            if (! $deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim tapılmadı və ya sizin regionunuzda deyil',
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
                'message' => 'Müəllim silinərkən xəta baş verdi',
            ], 500);
        }
    }

    /**
     * Hard delete teacher
     */
    public function hardDelete(int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            // Authorization check
            if (! $user->can('teachers.delete')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Missing teachers.delete permission',
                ], 403);
            }

            $region = $user->institution;

            // SuperAdmin can hard delete teachers from any region - get first available region
            if ($user->hasRole('superadmin')) {
                if (! $region) {
                    $region = Institution::where('level', 2)->first();
                }

                if (! $region) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Sistemdə heç bir region tapılmadı',
                    ], 404);
                }
            } else {
                // Regular RegionAdmin - must have level 2 institution
                if (! $region || $region->level !== 2) {
                    return response()->json([
                        'success' => false,
                        'message' => 'İstifadəçi regional admini deyil və ya müəssisə regional ofis deyil',
                    ], 400);
                }
            }

            Log::info('RegionTeacherController - Hard deleting teacher', [
                'user_role' => $user->hasRole('superadmin') ? 'superadmin' : 'regionadmin',
                'teacher_id' => $id,
            ]);

            $deleted = $this->teacherService->hardDeleteTeacher($id, $region);

            if (! $deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim tapılmadı və ya sizin regionunuzda deyil',
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
                'message' => 'Müəllim silinərkən xəta baş verdi',
            ], 500);
        }
    }

    /**
     * PRE-VALIDATE Excel file before import (NEW)
     * Returns detailed validation report without importing
     */
    public function validateImport(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Authorization check
            $allRoles = \DB::table('model_has_roles')
                ->where('model_type', 'App\\Models\\User')
                ->where('model_id', $user->id)
                ->pluck('role_id');

            $hasPermission = \DB::table('role_has_permissions')
                ->whereIn('role_id', $allRoles)
                ->whereIn('permission_id', function ($query) {
                    $query->select('id')
                        ->from('permissions')
                        ->where('name', 'teachers.create');
                })
                ->exists();

            if (! $hasPermission) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim yaratmaq səlahiyyətiniz yoxdur',
                ], 403);
            }

            $region = $user->institution;

            // SuperAdmin can validate for any region
            if ($user->hasRole('superadmin')) {
                if (! $region) {
                    $region = Institution::where('level', 2)->first();
                }

                if (! $region) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Sistemdə heç bir region tapılmadı',
                    ], 404);
                }
            } else {
                // Regular RegionAdmin - must have level 2 institution
                if (! $region || $region->level !== 2) {
                    return response()->json([
                        'success' => false,
                        'message' => 'İstifadəçi regional admini deyil və ya müəssisə regional ofis deyil',
                    ], 400);
                }
            }

            // Validation
            $validated = $request->validate([
                'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240', // 10MB max
            ]);

            Log::info('🔍 RegionTeacherController - Validating import file', [
                'user_role' => $user->hasRole('superadmin') ? 'superadmin' : 'regionadmin',
                'region_id' => $region->id,
                'file_name' => $request->file('file')->getClientOriginalName(),
                'file_size' => $request->file('file')->getSize(),
            ]);

            // Use pre-validation service
            $preValidationService = app(\App\Services\RegionAdmin\RegionTeacherPreValidationService::class);
            $validationResult = $preValidationService->validateFile(
                $request->file('file'),
                $region
            );

            return response()->json($validationResult);
        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error validating import file', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Validasiya zamanı xəta baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Import teachers from CSV/Excel
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
                ->whereIn('permission_id', function ($query) {
                    $query->select('id')
                        ->from('permissions')
                        ->where('name', 'teachers.create');
                })
                ->exists();

            if (! $hasPermission) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim yaratmaq səlahiyyətiniz yoxdur',
                ], 403);
            }

            $region = $user->institution;

            // SuperAdmin can import to any region - get first available region
            if ($user->hasRole('superadmin')) {
                if (! $region) {
                    // Get first region (level 2)
                    $region = Institution::where('level', 2)->first();
                }

                if (! $region) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Sistemdə heç bir region tapılmadı',
                    ], 404);
                }
            } else {
                // Regular RegionAdmin - must have level 2 institution
                if (! $region || $region->level !== 2) {
                    return response()->json([
                        'success' => false,
                        'message' => 'İstifadəçi regional admini deyil və ya müəssisə regional ofis deyil',
                    ], 400);
                }
            }

            // Validation
            $validated = $request->validate([
                'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240', // 10MB max
                'skip_duplicates' => 'nullable|boolean',
                'update_existing' => 'nullable|boolean',
                'strategy' => 'nullable|string|in:strict,skip_errors', // NEW
                'valid_rows_only' => 'nullable|boolean', // NEW: Import only pre-validated rows
            ]);

            $strategy = $request->input('strategy', 'strict');

            Log::info('RegionTeacherController - Importing teachers', [
                'user_role' => $user->hasRole('superadmin') ? 'superadmin' : 'regionadmin',
                'region_id' => $region->id,
                'file_name' => $request->file('file')->getClientOriginalName(),
                'file_size' => $request->file('file')->getSize(),
                'skip_duplicates' => $request->boolean('skip_duplicates'),
                'update_existing' => $request->boolean('update_existing'),
                'strategy' => $strategy,
            ]);

            // STRATEGY: SKIP_ERRORS (NEW)
            // Only import valid rows, skip invalid ones
            if ($strategy === 'skip_errors' || $request->boolean('valid_rows_only')) {
                // Pre-validate first
                $preValidationService = app(\App\Services\RegionAdmin\RegionTeacherPreValidationService::class);
                $validationResult = $preValidationService->validateFile(
                    $request->file('file'),
                    $region
                );

                if (! $validationResult['success']) {
                    return response()->json($validationResult, 400);
                }

                // Import only valid rows
                if (empty($validationResult['valid_rows'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Heç bir düzgün sətir tapılmadı',
                        'summary' => $validationResult['summary'],
                        'errors' => $validationResult['errors'],
                    ], 400);
                }

                // Use import service with valid rows only
                $result = $this->teacherService->importValidRows(
                    $validationResult['valid_rows'],
                    $region
                );

                return response()->json([
                    'success' => true,
                    'imported' => $result['success_count'],
                    'skipped' => count($validationResult['invalid_rows']),
                    'total_rows' => $validationResult['summary']['total_rows'],
                    'errors' => $validationResult['errors'],
                    'warnings' => $validationResult['warnings'],
                    'details' => $result['details'],
                    'error_groups' => $validationResult['error_groups'],
                    'suggestions' => $validationResult['suggestions'],
                    'message' => "{$result['success_count']} muellim ugurla import edildi, " . count($validationResult['invalid_rows']) . ' xetali setir oturuldu',
                ]);
            }

            // STRATEGY: STRICT (DEFAULT)
            // Stop on first error
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
                'message' => $result['success_count'] . ' muellim import edildi, ' . $result['error_count'] . ' xeta',
            ]);
        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error importing teachers', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'İmport zamanı xəta baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export validation errors to Excel (NEW)
     * Takes validation result from session and exports to Excel
     *
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function exportValidationErrors(Request $request)
    {
        try {
            $user = Auth::user();

            if (! $this->userHasTeacherReadAccess($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim məlumatlarını oxumaq səlahiyyətiniz yoxdur',
                ], 403);
            }

            // Get validation data from request
            $invalidRows = $request->input('invalid_rows', []);
            $errors = $request->input('errors', []);
            $summary = $request->input('summary', []);

            if (empty($invalidRows) && empty($errors)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Heç bir xəta tapılmadı',
                ], 400);
            }

            Log::info('RegionTeacherController - Exporting validation errors', [
                'invalid_rows_count' => count($invalidRows),
                'errors_count' => count($errors),
            ]);

            $filename = 'teacher_import_errors_' . date('Y-m-d_His') . '.xlsx';

            return Excel::download(
                new TeacherImportErrorsExport($invalidRows, $errors, $summary),
                $filename
            );
        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error exporting validation errors', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error export zamanı xəta baş verdi: ' . $e->getMessage(),
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

            if (! $this->userHasTeacherReadAccess($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəllim məlumatlarını oxumaq səlahiyyətiniz yoxdur',
                ], 403);
            }

            $region = $user->institution;

            // SuperAdmin can use any region - get first available region for template
            if ($user->hasRole('superadmin')) {
                if (! $region) {
                    // Get first region (level 2) for template generation
                    $region = Institution::where('level', 2)->first();
                }

                if (! $region) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Sistemdə heç bir region tapılmadı',
                    ], 404);
                }

                Log::info('RegionTeacherController - SuperAdmin downloading template', [
                    'user_id' => $user->id,
                    'region_id' => $region->id,
                    'region_name' => $region->name,
                ]);
            } else {
                // Regular RegionAdmin - must have level 2 institution
                if (! $region || $region->level !== 2) {
                    return response()->json([
                        'success' => false,
                        'message' => 'İstifadəçi regional admini deyil və ya müəssisə regional ofis deyil',
                    ], 400);
                }

                Log::info('RegionTeacherController - RegionAdmin downloading template', [
                    'region_id' => $region->id,
                    'region_name' => $region->name,
                ]);
            }

            return $this->teacherService->generateImportTemplate($region);
        } catch (\Exception $e) {
            Log::error('RegionTeacherController - Error downloading template', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Şablon yüklənərkən xəta baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Determine if the authenticated user can read teacher data.
     */
    private function userHasTeacherReadAccess(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        // RegionAdmins and SuperAdmins always have visibility into their region data
        if ($user->hasAnyRole(['superadmin', 'regionadmin'])) {
            return true;
        }

        // Fallback to DB-level permission check to support both web and sanctum guards
        $roleIds = \DB::table('model_has_roles')
            ->where('model_type', User::class)
            ->where('model_id', $user->id)
            ->pluck('role_id');

        if ($roleIds->isEmpty()) {
            return false;
        }

        return \DB::table('role_has_permissions')
            ->whereIn('role_id', $roleIds)
            ->whereIn('permission_id', function ($query) {
                $query->select('id')
                    ->from('permissions')
                    ->where('name', 'teachers.read');
            })
            ->exists();
    }
}
