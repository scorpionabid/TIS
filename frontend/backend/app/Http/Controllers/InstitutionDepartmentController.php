<?php

namespace App\Http\Controllers;

use App\Models\Institution;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

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
                'sort_by' => 'nullable|string|in:name,type,created_at',
                'sort_direction' => 'nullable|string|in:asc,desc'
            ]);

            $query = $institution->departments();

            if (!$request->boolean('include_inactive', false)) {
                $query->where('is_active', true);
            }

            $sortBy = $request->sort_by ?? 'name';
            $sortDirection = $request->sort_direction ?? 'asc';
            $query->orderBy($sortBy, $sortDirection);

            $departments = $query->get();

            return response()->json([
                'success' => true,
                'data' => $departments,
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
        
        if (!$user->hasRole(['superadmin', 'regionadmin', 'schooladmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'nullable|string|max:100',
            'head_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'description' => 'nullable|string|max:1000',
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

            $department = Department::create($departmentData);

            return response()->json([
                'success' => true,
                'message' => 'Şöbə uğurla yaradıldı.',
                'data' => $department->load('institution'),
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
        
        if (!$user->hasRole(['superadmin', 'regionadmin', 'schooladmin'])) {
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
            'type' => 'nullable|string|max:100',
            'head_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'description' => 'nullable|string|max:1000',
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
            $department->update($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Şöbə məlumatları yeniləndi.',
                'data' => $department->fresh(['institution']),
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
        
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
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
        
        if (!$user->hasRole(['superadmin', 'regionadmin', 'schooladmin'])) {
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
                'description' => null
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $types,
        ]);
    }
}