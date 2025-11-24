<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Institution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class InstitutionDepartmentController extends Controller
{
    /**
     * Get departments for specific institution
     */
    public function index(Institution $institution, Request $request): JsonResponse
    {
        try {
            $request->validate([
                'include_inactive' => 'nullable|boolean',
                'include_deleted' => 'nullable|boolean',
                'only_deleted' => 'nullable|boolean',
                'sort_by' => 'nullable|string|in:name,department_type,created_at',
                'sort_direction' => 'nullable|string|in:asc,desc',
            ]);

            $query = $institution->departments()->with(['parent', 'institution']);

            if (! $request->boolean('include_inactive', false)) {
                $query->where('is_active', true);
            }

            if ($request->boolean('only_deleted')) {
                $query->onlyTrashed();
            } elseif ($request->boolean('include_deleted', false)) {
                $query->withTrashed();
            }

            $sortBy = $request->sort_by ?? 'name';
            $sortDirection = $request->sort_direction ?? 'asc';
            $query->orderBy($sortBy, $sortDirection);

            $departments = $query->get();

            return response()->json([
                'success' => true,
                'data' => $departments->map(fn (Department $department) => $this->formatDepartment($department)),
                'institution' => [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'type' => $institution->type,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Şöbələr yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Store department for institution
     */
    public function store(Institution $institution, Request $request): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasRole(['superadmin', 'regionadmin', 'schooladmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'short_name' => 'nullable|string|max:20',
            'department_type' => 'required|string|max:50',
            'parent_department_id' => 'nullable|integer|exists:departments,id',
            'description' => 'nullable|string|max:1000',
            'metadata' => 'nullable|array',
            'capacity' => 'nullable|integer|min:1|max:1000',
            'budget_allocation' => 'nullable|numeric|min:0',
            'functional_scope' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $departmentData = $validator->validated();
            $departmentData['institution_id'] = $institution->id;

            // Ensure parent department belongs to the same institution
            if (! empty($departmentData['parent_department_id'])) {
                $parent = Department::where('id', $departmentData['parent_department_id'])
                    ->where('institution_id', $institution->id)
                    ->first();

                if (! $parent) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Seçilmiş ana şöbə bu təşkilata aid deyil.',
                    ], 422);
                }
            }

            // Validate department type compatibility
            $allowedTypes = Department::getAllowedTypesForInstitution($institution->type);
            if (! in_array($departmentData['department_type'], $allowedTypes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Departament növü bu təşkilat üçün uyğun deyil.',
                    'allowed_types' => $allowedTypes,
                ], 422);
            }

            $department = Department::create($departmentData);
            $department->load(['institution', 'parent']);

            return response()->json([
                'success' => true,
                'message' => 'Şöbə uğurla yaradıldı.',
                'data' => $this->formatDepartment($department),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Şöbə yaradılarkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Display specific department
     */
    public function show(Institution $institution, Department $department): JsonResponse
    {
        try {
            // Ensure department belongs to institution
            if ($department->institution_id !== $institution->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu şöbə seçilmiş təşkilata aid deyil.',
                ], 404);
            }

            $department->load(['institution', 'users' => function ($query) {
                $query->active()->with('roles');
            }]);

            return response()->json([
                'success' => true,
                'data' => $department,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Şöbə məlumatları yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Update department
     */
    public function update(Institution $institution, Department $department, Request $request): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasRole(['superadmin', 'regionadmin', 'schooladmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        // Ensure department belongs to institution
        if ($department->institution_id !== $institution->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu şöbə seçilmiş təşkilata aid deyil.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'short_name' => 'nullable|string|max:20',
            'department_type' => 'nullable|string|max:50',
            'parent_department_id' => 'nullable|integer|exists:departments,id',
            'description' => 'nullable|string|max:1000',
            'metadata' => 'nullable|array',
            'capacity' => 'nullable|integer|min:1|max:1000',
            'budget_allocation' => 'nullable|numeric|min:0',
            'functional_scope' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $updateData = $validator->validated();

            if (! empty($updateData['parent_department_id'])) {
                $parent = Department::where('id', $updateData['parent_department_id'])
                    ->where('institution_id', $institution->id)
                    ->first();

                if (! $parent) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Seçilmiş ana şöbə bu təşkilata aid deyil.',
                    ], 422);
                }
            }

            if (! empty($updateData['department_type'])) {
                $allowedTypes = Department::getAllowedTypesForInstitution($institution->type);
                if (! in_array($updateData['department_type'], $allowedTypes)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Departament növü bu təşkilat üçün uyğun deyil.',
                        'allowed_types' => $allowedTypes,
                    ], 422);
                }
            }

            $department->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Şöbə məlumatları yeniləndi.',
                'data' => $this->formatDepartment($department->fresh(['institution', 'parent'])),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Şöbə yenilənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Remove department
     */
    public function destroy(Institution $institution, Department $department): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasRole(['superadmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        // Ensure department belongs to institution
        if ($department->institution_id !== $institution->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu şöbə seçilmiş təşkilata aid deyil.',
            ], 404);
        }

        try {
            // Check if department has users
            if ($department->users()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu şöbədə istifadəçilər var. Əvvəlcə onları başqa şöbəyə köçürün.',
                ], 400);
            }

            $department->delete();

            return response()->json([
                'success' => true,
                'message' => 'Şöbə silindi.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Şöbə silinərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get department statistics for institution
     */
    public function getStatistics(Institution $institution): JsonResponse
    {
        try {
            $stats = [
                'total_departments' => $institution->departments()->count(),
                'active_departments' => $institution->departments()->where('is_active', true)->count(),
                'by_type' => $institution->departments()
                    ->select('type', DB::raw('count(*) as count'))
                    ->groupBy('type')
                    ->pluck('count', 'type'),
                'with_head' => $institution->departments()->whereNotNull('head_name')->count(),
                'user_distribution' => DB::table('users')
                    ->join('departments', 'users.department_id', '=', 'departments.id')
                    ->where('departments.institution_id', $institution->id)
                    ->select('departments.name as department_name',
                        DB::raw('count(users.id) as user_count'))
                    ->groupBy('departments.id', 'departments.name')
                    ->get()
                    ->pluck('user_count', 'department_name'),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Şöbə statistikaları yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Move users between departments
     */
    public function moveUsers(Institution $institution, Department $department, Request $request): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasRole(['superadmin', 'regionadmin', 'schooladmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        // Ensure department belongs to institution
        if ($department->institution_id !== $institution->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu şöbə seçilmiş təşkilata aid deyil.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'user_ids' => 'required|array',
            'user_ids.*' => 'integer|exists:users,id',
            'target_department_id' => 'required|integer|exists:departments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $targetDepartment = Department::find($request->target_department_id);

            // Ensure target department belongs to same institution
            if ($targetDepartment->institution_id !== $institution->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hədəf şöbə eyni təşkilata aid deyil.',
                ], 400);
            }

            DB::beginTransaction();

            $movedCount = DB::table('users')
                ->whereIn('id', $request->user_ids)
                ->where('department_id', $department->id)
                ->update(['department_id' => $targetDepartment->id]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "{$movedCount} istifadəçi uğurla köçürüldü.",
                'data' => [
                    'moved_count' => $movedCount,
                    'source_department' => $department->name,
                    'target_department' => $targetDepartment->name,
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'İstifadəçi köçürülməsində xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get department types
     */
    public function getTypes(): JsonResponse
    {
        // Use Department model types for consistency
        $types = collect(Department::TYPES)->map(function ($label, $key) {
            return [
                'key' => $key,
                'label' => $label,
                'description' => null,
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $types,
        ]);
    }

    /**
     * Helper to format department responses consistently.
     */
    private function formatDepartment(Department $department): array
    {
        $department->loadMissing(['institution', 'parent']);

        return [
            'id' => $department->id,
            'name' => $department->name,
            'short_name' => $department->short_name,
            'department_type' => $department->department_type,
            'department_type_display' => $department->getTypeDisplayName(),
            'institution_id' => $department->institution_id,
            'parent_department_id' => $department->parent_department_id,
            'description' => $department->description,
            'metadata' => $department->metadata,
            'capacity' => $department->capacity,
            'budget_allocation' => $department->budget_allocation,
            'functional_scope' => $department->functional_scope,
            'is_active' => $department->is_active,
            'institution' => $department->institution ? [
                'id' => $department->institution->id,
                'name' => $department->institution->name,
                'type' => $department->institution->type,
            ] : null,
            'parent' => $department->parent ? [
                'id' => $department->parent->id,
                'name' => $department->parent->name,
                'department_type' => $department->parent->department_type,
            ] : null,
            'created_at' => $department->created_at,
            'updated_at' => $department->updated_at,
            'deleted_at' => $department->deleted_at,
        ];
    }
}
