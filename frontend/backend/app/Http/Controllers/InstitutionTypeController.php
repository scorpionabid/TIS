<?php

namespace App\Http\Controllers;

use App\Models\InstitutionType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class InstitutionTypeController extends Controller
{
    /**
     * Display a listing of institution types.
     */
    public function index(Request $request): JsonResponse
    {
        \Log::info('InstitutionTypeController::index called', [
            'params' => $request->all(),
            'user_id' => Auth::id()
        ]);
        
        try {
            $request->validate([
                'include_inactive' => 'nullable|in:true,false,1,0',
                'level' => 'nullable|integer|between:1,4',
                'is_system' => 'nullable|in:true,false,1,0',
            ]);

            $query = InstitutionType::orderBy('default_level')->orderBy('label_az');

            // Convert string parameters to boolean
            $includeInactive = in_array($request->include_inactive, ['true', '1', 1, true]);
            $isSystem = in_array($request->is_system, ['true', '1', 1, true]);

            // Filter by active status
            if (!$includeInactive) {
                $query->active();
            }

            // Filter by level
            if ($request->level) {
                $query->byLevel($request->level);
            }

            // Filter by system/user-created
            if ($request->has('is_system')) {
                if ($isSystem) {
                    $query->system();
                } else {
                    $query->userCreated();
                }
            }

            $institutionTypes = $query->get();
            
            \Log::info('InstitutionTypeController::index success', [
                'count' => $institutionTypes->count(),
                'types' => $institutionTypes->pluck('key')->toArray()
            ]);

            return response()->json([
                'success' => true,
                'institution_types' => $institutionTypes,
                'total' => $institutionTypes->count(),
            ]);

        } catch (\Exception $e) {
            \Log::error('InstitutionTypeController::index error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Müəssisə növləri yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Store a newly created institution type.
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole('superadmin')) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat yalnız SuperAdmin tərəfindən icra edilə bilər.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'key' => 'required|string|max:50|unique:institution_types,key',
            'label' => 'required|string|max:100',
            'label_az' => 'required|string|max:100',
            'label_en' => 'required|string|max:100',
            'default_level' => 'nullable|integer|between:1,4',
            'allowed_parent_types' => 'nullable|array',
            'allowed_parent_types.*' => 'string|exists:institution_types,key',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
            'description' => 'nullable|string|max:1000',
            'metadata' => 'nullable|array',
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
            $data = $validator->validated();
            $data['is_system'] = false; // User-created types are never system types

            $institutionType = InstitutionType::create($data);

            return response()->json([
                'success' => true,
                'message' => 'Müəssisə növü uğurla yaradıldı.',
                'data' => $institutionType,
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Müəssisə növü yaradılarkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Display the specified institution type.
     */
    public function show(InstitutionType $institutionType): JsonResponse
    {
        try {
            $institutionType->load(['institutions']);

            return response()->json([
                'success' => true,
                'data' => $institutionType,
                'institutions_count' => $institutionType->institutions->count(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Müəssisə növü yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Update the specified institution type.
     */
    public function update(Request $request, InstitutionType $institutionType): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole('superadmin')) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat yalnız SuperAdmin tərəfindən icra edilə bilər.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'key' => 'string|max:50|unique:institution_types,key,' . $institutionType->id,
            'label' => 'string|max:100',
            'label_az' => 'string|max:100',
            'label_en' => 'string|max:100',
            'default_level' => 'nullable|integer|between:1,4',
            'allowed_parent_types' => 'nullable|array',
            'allowed_parent_types.*' => 'string|exists:institution_types,key',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
            'description' => 'nullable|string|max:1000',
            'metadata' => 'nullable|array',
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
            $data = $validator->validated();
            
            // Prevent changes to system type status
            if (isset($data['is_system']) && $institutionType->is_system) {
                unset($data['is_system']);
            }

            $institutionType->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Müəssisə növü yeniləndi.',
                'data' => $institutionType->fresh(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Müəssisə növü yenilənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Remove the specified institution type.
     */
    public function destroy(InstitutionType $institutionType): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole('superadmin')) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat yalnız SuperAdmin tərəfindən icra edilə bilər.',
            ], 403);
        }

        try {
            if (!$institutionType->canBeDeleted()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu müəssisə növü silinə bilməz. Sistem növləri və ya aktiv müəssisələri olan növlər silinə bilməz.',
                ], 400);
            }

            $typeName = $institutionType->getDisplayLabel();
            $institutionType->delete();

            return response()->json([
                'success' => true,
                'message' => "Müəssisə növü '{$typeName}' silindi.",
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Müəssisə növü silinərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get available parent types for a given institution type
     */
    public function getParentTypes(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'type_key' => 'required|string|exists:institution_types,key',
            ]);

            $institutionType = InstitutionType::where('key', $request->type_key)->first();
            
            if (!$institutionType) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəssisə növü tapılmadı.',
                ], 404);
            }

            $parentTypes = $institutionType->getAvailableParentTypes();

            return response()->json([
                'success' => true,
                'parent_types' => $parentTypes,
                'total' => $parentTypes->count(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ana növlər yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get hierarchy structure of institution types
     */
    public function getHierarchy(): JsonResponse
    {
        try {
            $types = InstitutionType::active()
                ->orderBy('default_level')
                ->orderBy('label_az')
                ->get()
                ->groupBy('default_level');

            $hierarchy = [];
            foreach ($types as $level => $levelTypes) {
                $hierarchy[] = [
                    'level' => $level,
                    'types' => $levelTypes->map(function ($type) {
                        return [
                            'key' => $type->key,
                            'label' => $type->getDisplayLabel(),
                            'icon' => $type->icon,
                            'color' => $type->color,
                            'allowed_parent_types' => $type->allowed_parent_types,
                            'institutions_count' => $type->institutions()->count(),
                        ];
                    })->toArray()
                ];
            }

            return response()->json([
                'success' => true,
                'hierarchy' => $hierarchy,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İyerarxiya yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }
}