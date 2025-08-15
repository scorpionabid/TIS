<?php

namespace App\Http\Controllers;

use App\Models\Institution;
use App\Models\InstitutionType;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class InstitutionController extends Controller
{
    /**
     * Get institutions list with filtering
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // Get valid institution types dynamically
            $validTypes = InstitutionType::active()->pluck('key')->toArray();
            $validTypesString = implode(',', $validTypes);
            
            $request->validate([
                'per_page' => 'nullable|integer|min:1|max:100',
                'search' => 'nullable|string|max:255',
                'type' => "nullable|string|in:{$validTypesString}",
                'level' => 'nullable|integer|between:1,5',
                'parent_id' => 'nullable|integer|exists:institutions,id',
                'region_code' => 'nullable|string|max:10',
                'is_active' => 'nullable|boolean',
                'sort_by' => 'nullable|string|in:name,type,level,created_at,established_date',
                'sort_direction' => 'nullable|string|in:asc,desc'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Institution index validation failed', [
                'request_data' => $request->all(),
                'validation_errors' => $e->errors()
            ]);
            throw $e;
        }

        // Generate cache key based on request parameters
        $cacheKey = 'institutions_' . md5(serialize($request->all()));
        
        // Check cache for non-search requests (search results shouldn't be cached)
        if (!$request->search && !$request->has('no_cache')) {
            $cachedResult = Cache::get($cacheKey);
            if ($cachedResult) {
                return response()->json($cachedResult);
            }
        }

        $query = Institution::with(['parent', 'children.parent']);

        // Apply regional filtering based on user role
        $currentUser = $request->user();
        $this->applyRegionalFiltering($query, $currentUser);

        // Apply filters
        if ($request->search) {
            $query->searchByName($request->search);
        }

        if ($request->type) {
            $query->byType($request->type);
        }

        if ($request->level) {
            $query->byLevel($request->level);
        }

        if ($request->has('parent_id')) {
            if ($request->parent_id) {
                $query->where('parent_id', $request->parent_id);
            } else {
                $query->roots(); // Get root institutions
            }
        }

        if ($request->region_code) {
            $query->byRegionCode($request->region_code);
        }

        if ($request->has('is_active')) {
            if ($request->is_active) {
                $query->active();
            } else {
                $query->where('is_active', false);
            }
        }

        // Apply sorting
        $sortBy = $request->sort_by ?? 'name';
        $sortDirection = $request->sort_direction ?? 'asc';
        $query->orderBy($sortBy, $sortDirection);

        $institutions = $query->paginate($request->per_page ?? 15);

        $response = [
            'success' => true,
            'data' => [
                'data' => $institutions->items(),
                'current_page' => $institutions->currentPage(),
                'last_page' => $institutions->lastPage(),
                'per_page' => $institutions->perPage(),
                'total' => $institutions->total(),
                'from' => $institutions->firstItem(),
                'to' => $institutions->lastItem(),
            ]
        ];

        // Cache result for 5 minutes (300 seconds) for non-search requests
        if (!$request->search && !$request->has('no_cache')) {
            Cache::put($cacheKey, $response, 300);
        }

        return response()->json($response);
    }

    /**
     * Display the specified institution
     */
    public function show(Institution $institution): JsonResponse
    {
        $institution->load([
            'parent', 
            'children' => function ($query) {
                $query->active()->with(['children' => function ($subQuery) {
                    $subQuery->active();
                }]);
            },
            'departments' => function ($query) {
                $query->active();
            }
        ]);

        return response()->json([
            'success' => true,
            'data' => $institution,
            'institution' => $institution, // Add this for compatibility
        ]);
    }

    /**
     * Store a newly created institution
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole(['superadmin', 'regionadmin', 'sektoradmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        // Check regional permissions for parent_id
        if ($request->parent_id && !$this->canAccessInstitution($user, $request->parent_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu parent müəssisəyə giriş icazəniz yoxdur.',
            ], 403);
        }

        // Get valid institution types dynamically for create
        $validTypes = InstitutionType::active()->pluck('key')->toArray();
        $validTypesString = implode(',', $validTypes);
        
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => "required|string|in:{$validTypesString}",
            'level' => 'required|integer|between:1,5',
            'parent_id' => 'nullable|integer|exists:institutions,id',
            'region_code' => 'nullable|string|max:10',
            'address' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'director_name' => 'nullable|string|max:255',
            'established_date' => 'nullable|date',
            'student_capacity' => 'nullable|integer|min:0',
            'staff_count' => 'nullable|integer|min:0',
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
            
            // Auto-generate region_code from parent if not provided
            if (empty($data['region_code']) && !empty($data['parent_id'])) {
                $parent = Institution::find($data['parent_id']);
                if ($parent) {
                    $data['region_code'] = $this->getRegionCodeFromParent($parent);
                }
            }
            
            // If still no region_code, default to 'AZ'
            if (empty($data['region_code'])) {
                $data['region_code'] = 'AZ';
            }
            
            $institution = Institution::create($data);

            // Clear institutions cache to ensure new institutions appear in parent dropdowns
            Cache::flush();

            return response()->json([
                'success' => true,
                'message' => 'Təşkilat uğurla yaradıldı.',
                'data' => $institution->load(['parent', 'children']),
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Təşkilat yaradılarkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Update the specified institution
     */
    public function update(Request $request, Institution $institution): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole(['superadmin', 'regionadmin', 'sektoradmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        // Check if user can access this institution
        if (!$this->canAccessInstitution($user, $institution->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu müəssisəni redaktə etmək icazəniz yoxdur.',
            ], 403);
        }

        // Get valid institution types dynamically for update
        $validTypes = InstitutionType::active()->pluck('key')->toArray();
        $validTypesString = implode(',', $validTypes);
        
        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'type' => "string|in:{$validTypesString}",
            'level' => 'integer|between:1,5',
            'parent_id' => 'nullable|integer|exists:institutions,id',
            'region_code' => 'nullable|string|max:10',
            'address' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'director_name' => 'nullable|string|max:255',
            'established_date' => 'nullable|date',
            'student_capacity' => 'nullable|integer|min:0',
            'staff_count' => 'nullable|integer|min:0',
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
            
            // Auto-generate region_code from parent if parent_id is being updated
            if (isset($data['parent_id']) && $data['parent_id'] && 
                (!isset($data['region_code']) || empty($data['region_code']))) {
                $parent = Institution::find($data['parent_id']);
                if ($parent) {
                    $data['region_code'] = $this->getRegionCodeFromParent($parent);
                }
            }
            
            $institution->update($data);

            // Clear institutions cache to ensure updated institutions appear correctly
            Cache::flush();

            return response()->json([
                'success' => true,
                'message' => 'Təşkilat məlumatları yeniləndi.',
                'data' => $institution->fresh(['parent', 'children']),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Təşkilat yenilənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Remove the specified institution
     */
    public function destroy(Request $request, Institution $institution): JsonResponse
    {
        $user = Auth::user();
        $deleteType = $request->query('type', 'soft');
        
        // Authorization based on delete type
        if ($deleteType === 'hard' && !$user->hasRole(['superadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Təşkilatı tam silmək üçün icazəniz yoxdur.',
            ], 403);
        } elseif ($deleteType === 'soft' && !$user->hasRole(['superadmin', 'regionadmin', 'sektoradmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        // Check if user can access this institution
        if (!$this->canAccessInstitution($user, $institution->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu müəssisəni silmək icazəniz yoxdur.',
            ], 403);
        }

        try {
            DB::beginTransaction();

            if ($deleteType === 'hard') {
                // Hard delete - permanent removal
                // Check if institution has any children (active or inactive)
                if ($institution->children()->count() > 0) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu təşkilatın alt təşkilatları var. Təşkilatı tam silmək üçün əvvəlcə onları silin.',
                    ], 400);
                }

                // Check if institution has any users (active or inactive)
                if ($institution->users()->count() > 0) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu təşkilata aid istifadəçilər var. Təşkilatı tam silmək üçün əvvəlcə onları başqa təşkilata köçürün.',
                    ], 400);
                }

                $institutionName = $institution->name;
                $institution->forceDelete();
                $message = "Təşkilat '{$institutionName}' tam olaraq silindi.";
            } else {
                // Soft delete - deactivate institution
                // Check if institution has active children
                $activeChildren = $institution->children()->where('is_active', true)->count();
                if ($activeChildren > 0) {
                    return response()->json([
                        'success' => false,
                        'message' => "Bu təşkilatın {$activeChildren} aktiv alt təşkilatı var. Əvvəlcə onları deaktiv edin.",
                    ], 400);
                }

                // Check if institution has active users
                $activeUsers = $institution->users()->where('is_active', true)->count();
                if ($activeUsers > 0) {
                    return response()->json([
                        'success' => false,
                        'message' => "Bu təşkilata aid {$activeUsers} aktiv istifadəçi var. Əvvəlcə onları deaktiv edin və ya başqa təşkilata köçürün.",
                    ], 400);
                }

                $institution->update([
                    'is_active' => false,
                    'deleted_at' => now()
                ]);
                $institution->delete(); // Soft delete
                $message = "Təşkilat '{$institution->name}' deaktiv edildi.";
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $message,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Təşkilat silinərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get institution types
     */
    public function getTypes(): JsonResponse
    {
        $types = [
            'ministry' => 'Nazirlik',
            'region' => 'Regional İdarə',
            'sektor' => 'Sektor Şöbəsi',
            'school' => 'Məktəb',
            'vocational' => 'Peşə Məktəbi',
            'university' => 'Universitet',
        ];

        return response()->json([
            'success' => true,
            'data' => $types,
        ]);
    }

    /**
     * Get institution statistics
     */
    public function getStatistics(): JsonResponse
    {
        try {
            $stats = [
                'total_institutions' => Institution::count(),
                'active_institutions' => Institution::active()->count(),
                'by_type' => Institution::select('type', DB::raw('count(*) as count'))
                                       ->groupBy('type')
                                       ->pluck('count', 'type'),
                'by_level' => Institution::select('level', DB::raw('count(*) as count'))
                                        ->groupBy('level')
                                        ->pluck('count', 'level'),
                'hierarchy_depth' => Institution::max('level'),
                'recently_created' => Institution::where('created_at', '>=', now()->subDays(30))->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Statistikalar yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get trashed institutions
     */
    public function trashed(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        try {
            $query = Institution::onlyTrashed()->with(['parent']);

            // Apply filters
            if ($request->search) {
                $query->searchByName($request->search);
            }

            if ($request->type) {
                $query->where('type', $request->type);
            }

            if ($request->level) {
                $query->where('level', $request->level);
            }

            // Apply sorting
            $sortBy = $request->sort_by ?? 'deleted_at';
            $sortDirection = $request->sort_direction ?? 'desc';
            $query->orderBy($sortBy, $sortDirection);

            $institutions = $query->paginate($request->per_page ?? 15);

            return response()->json([
                'success' => true,
                'institutions' => $institutions->items(),
                'meta' => [
                    'current_page' => $institutions->currentPage(),
                    'last_page' => $institutions->lastPage(),
                    'per_page' => $institutions->perPage(),
                    'total' => $institutions->total(),
                    'from' => $institutions->firstItem(),
                    'to' => $institutions->lastItem(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Silinmiş təşkilatlar yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Restore a trashed institution
     */
    public function restore($id): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        try {
            $institution = Institution::withTrashed()->findOrFail($id);

            // Check if parent exists and is not trashed
            if ($institution->parent_id && !Institution::find($institution->parent_id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Üst təşkilat silinib və ya mövcud deyil. Əvvəlcə üst təşkilatı bərpa edin.',
                ], 400);
            }

            $institution->restore();

            return response()->json([
                'success' => true,
                'message' => 'Təşkilat uğurla bərpa edildi.',
                'data' => $institution->load(['parent', 'children']),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Təşkilat bərpa edilərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Permanently delete an institution
     */
    public function forceDelete($id): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole('superadmin')) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat yalnız superadmin tərəfindən icra edilə bilər.',
            ], 403);
        }

        try {
            $institution = Institution::withTrashed()->findOrFail($id);

            // Check if institution has children (even trashed ones)
            if ($institution->children()->withTrashed()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu təşkilatın alt təşkilatları var. Əvvəlcə onları tamamilə silin.',
                ], 400);
            }

            $institutionName = $institution->name;
            $institution->forceDelete();

            return response()->json([
                'success' => true,
                'message' => "Təşkilat '{$institutionName}' tamamilə silindi.",
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Təşkilat silinərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Bulk activate institutions
     */
    public function bulkActivate(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        try {
            $request->validate([
                'institution_ids' => 'required|array|min:1|max:50',
                'institution_ids.*' => 'integer|exists:institutions,id',
            ]);

            $updatedCount = Institution::whereIn('id', $request->institution_ids)
                ->update(['is_active' => true]);

            return response()->json([
                'success' => true,
                'message' => "{$updatedCount} təşkilat aktivləşdirildi.",
                'updated_count' => $updatedCount,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Kütləvi aktivləşdirmə xətası baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Bulk deactivate institutions
     */
    public function bulkDeactivate(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        try {
            $request->validate([
                'institution_ids' => 'required|array|min:1|max:50',
                'institution_ids.*' => 'integer|exists:institutions,id',
            ]);

            $updatedCount = Institution::whereIn('id', $request->institution_ids)
                ->update(['is_active' => false]);

            return response()->json([
                'success' => true,
                'message' => "{$updatedCount} təşkilat deaktivləşdirildi.",
                'updated_count' => $updatedCount,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Kütləvi deaktivləşdirmə xətası baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Bulk delete institutions
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        try {
            $request->validate([
                'institution_ids' => 'required|array|min:1|max:50',
                'institution_ids.*' => 'integer|exists:institutions,id',
            ]);

            $deletedCount = 0;
            $errors = [];

            foreach ($request->institution_ids as $institutionId) {
                try {
                    $institution = Institution::findOrFail($institutionId);
                    
                    // Check if institution has children
                    if ($institution->children()->count() > 0) {
                        $errors[] = "'{$institution->name}' təşkilatının alt təşkilatları var.";
                        continue;
                    }

                    $institution->delete();
                    $deletedCount++;
                } catch (\Exception $e) {
                    $errors[] = "Təşkilat ID {$institutionId}: {$e->getMessage()}";
                }
            }

            $message = "{$deletedCount} təşkilat silindi.";
            if (!empty($errors)) {
                $message .= " Xətalar: " . implode(', ', $errors);
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'deleted_count' => $deletedCount,
                'errors' => $errors,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Kütləvi silmə xətası baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Bulk restore institutions
     */
    public function bulkRestore(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        try {
            $request->validate([
                'institution_ids' => 'required|array|min:1|max:50',
                'institution_ids.*' => 'integer',
            ]);

            $restoredCount = 0;
            $errors = [];

            foreach ($request->institution_ids as $institutionId) {
                try {
                    $institution = Institution::withTrashed()->findOrFail($institutionId);
                    
                    // Check if parent exists and is not trashed
                    if ($institution->parent_id && !Institution::find($institution->parent_id)) {
                        $errors[] = "'{$institution->name}' təşkilatının üst təşkilatı mövcud deyil.";
                        continue;
                    }

                    $institution->restore();
                    $restoredCount++;
                } catch (\Exception $e) {
                    $errors[] = "Təşkilat ID {$institutionId}: {$e->getMessage()}";
                }
            }

            $message = "{$restoredCount} təşkilat bərpa edildi.";
            if (!empty($errors)) {
                $message .= " Xətalar: " . implode(', ', $errors);
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'restored_count' => $restoredCount,
                'errors' => $errors,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Kütləvi bərpa xətası baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Bulk export institutions
     */
    public function bulkExport(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        try {
            $request->validate([
                'institution_ids' => 'nullable|array|max:1000',
                'institution_ids.*' => 'integer|exists:institutions,id',
                'format' => 'required|string|in:csv,json,xlsx',
                'include_deleted' => 'boolean',
            ]);

            $query = Institution::with(['parent', 'children']);

            if ($request->institution_ids) {
                $query->whereIn('id', $request->institution_ids);
            }

            if ($request->include_deleted) {
                $query->withTrashed();
            }

            $institutions = $query->get();

            $data = $institutions->map(function ($institution) {
                return [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'short_name' => $institution->short_name,
                    'type' => $institution->type,
                    'level' => $institution->level,
                    'parent_name' => $institution->parent?->name,
                    'region_code' => $institution->region_code,
                    'institution_code' => $institution->institution_code,
                    'is_active' => $institution->is_active ? 'Aktiv' : 'Deaktiv',
                    'children_count' => $institution->children->count(),
                    'established_date' => $institution->established_date?->format('Y-m-d'),
                    'created_at' => $institution->created_at->format('Y-m-d H:i:s'),
                    'deleted_at' => $institution->deleted_at?->format('Y-m-d H:i:s'),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $data,
                'format' => $request->format,
                'total' => $data->count(),
                'message' => "{$data->count()} təşkilat eksport edildi.",
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Eksport xətası baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get institutions hierarchy
     */
    public function hierarchy(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'include_inactive' => 'nullable|boolean',
                'include_departments' => 'nullable|boolean',
            ]);

            // Build base query for root institutions
            $query = Institution::with([
                'children' => function ($query) use ($request) {
                    $query->with(['children.children.children.children']); // Deep nesting for hierarchy
                    if (!$request->include_inactive) {
                        $query->active();
                    }
                    $query->orderBy('level')->orderBy('name');
                },
            ])->roots(); // Only root institutions (parent_id is null)

            // Include/exclude inactive institutions
            if (!$request->include_inactive) {
                $query->active();
            }

            // Include departments if requested
            if ($request->include_departments) {
                $query->with(['departments' => function ($query) {
                    $query->where('is_active', true)
                          ->orderBy('name');
                }]);
            }

            $query->orderBy('level')->orderBy('name');
            
            $institutions = $query->get();

            // Transform to proper hierarchy format
            $hierarchyData = $institutions->map(function ($institution) {
                return $this->transformToHierarchy($institution);
            });

            return response()->json([
                'success' => true,
                'institutions' => $hierarchyData,
                'total' => $this->countAllInstitutions($hierarchyData),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İerarxiya yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Transform institution to hierarchy format recursively
     */
    private function transformToHierarchy($institution)
    {
        return [
            'id' => $institution->id,
            'name' => $institution->name,
            'short_name' => $institution->short_name,
            'type' => $institution->type,
            'level' => $institution->level,
            'is_active' => $institution->is_active,
            'region_code' => $institution->region_code,
            'institution_code' => $institution->institution_code,
            'established_date' => $institution->established_date,
            'children' => $institution->children->map(function ($child) {
                return $this->transformToHierarchy($child);
            })->toArray(),
            'departments' => $institution->departments && isset($institution->departments) ? $institution->departments->map(function ($dept) {
                return [
                    'id' => $dept->id,
                    'name' => $dept->name,
                    'short_name' => $dept->short_name ?? null,
                    'department_type' => $dept->type ?? 'general',
                    'is_active' => $dept->is_active ?? true,
                    'users_count' => method_exists($dept, 'users') ? $dept->users()->count() : 0,
                    'active_users_count' => method_exists($dept, 'users') ? $dept->users()->where('is_active', true)->count() : 0,
                ];
            })->toArray() : [],
        ];
    }

    /**
     * Count total institutions in hierarchy
     */
    private function countAllInstitutions($hierarchyData): int
    {
        $count = 0;
        foreach ($hierarchyData as $institution) {
            $count++; // Count current institution
            if (!empty($institution['children'])) {
                $count += $this->countAllInstitutions($institution['children']);
            }
        }
        return $count;
    }

    /**
     * Get region code from parent institution
     */
    private function getRegionCodeFromParent(Institution $parent): string
    {
        // If parent has region_code, use it
        if ($parent->region_code) {
            return $parent->region_code;
        }
        
        // If parent is regional type, determine from name
        if ($parent->type === 'region') {
            $name = strtolower($parent->name);
            if (str_contains($name, 'bakı')) return 'BAK';
            if (str_contains($name, 'gəncə')) return 'GAN';
            if (str_contains($name, 'lənkəran')) return 'LAN';
            if (str_contains($name, 'sumqayıt')) return 'SUM';
            if (str_contains($name, 'şirvan')) return 'SIR';
            if (str_contains($name, 'mingəçevir')) return 'MIN';
            if (str_contains($name, 'naxçıvan')) return 'NAX';
            if (str_contains($name, 'şəmkir')) return 'SMX';
            if (str_contains($name, 'göygöl')) return 'GYG';
        }
        
        // Default to Azerbaijan if can't determine
        return 'AZ';
    }

    /**
     * Apply regional filtering based on current user's role and institution
     */
    private function applyRegionalFiltering($query, $currentUser): void
    {
        // Get user's role name from Spatie roles
        $userRole = $currentUser->roles->first()?->name;
        
        switch ($userRole) {
            case 'superadmin':
                // SuperAdmin can see all institutions
                break;
                
            case 'regionadmin':
                // RegionAdmin can only see institutions in their region and sub-institutions
                $this->applyRegionAdminInstitutionFiltering($query, $currentUser);
                break;
                
            case 'regionoperator':
                // RegionOperator can see institutions in their region (same as RegionAdmin but limited create permissions)
                $this->applyRegionAdminInstitutionFiltering($query, $currentUser);
                break;
                
            case 'sektoradmin':
                // SektorAdmin can only see their sector and schools under it
                $this->applySektorAdminInstitutionFiltering($query, $currentUser);
                break;
                
            case 'məktəbadmin':
                // MəktəbAdmin can only see their own school
                $query->where('id', $currentUser->institution_id);
                break;
                
            case 'müəllim':
                // Teachers can only see their own school
                $query->where('id', $currentUser->institution_id);
                break;
                
            default:
                // Unknown role - restrict to only their own institution if they have one
                if ($currentUser->institution_id) {
                    $query->where('id', $currentUser->institution_id);
                } else {
                    $query->where('id', -1); // Force empty result
                }
                break;
        }
    }

    /**
     * Apply RegionAdmin filtering - can see institutions in their region and all sub-institutions
     */
    private function applyRegionAdminInstitutionFiltering($query, $currentUser): void
    {
        $userRegionId = $currentUser->institution_id;
        
        // Get all institutions under this region (sectors and schools)
        $regionInstitutions = Institution::where(function($q) use ($userRegionId) {
            $q->where('id', $userRegionId) // The region itself
              ->orWhere('parent_id', $userRegionId); // Sectors in this region
        })->pluck('id');

        // Get schools under sectors
        $schoolInstitutions = Institution::whereIn('parent_id', $regionInstitutions)->pluck('id');

        // Combine all institution IDs
        $allInstitutionIds = $regionInstitutions->merge($schoolInstitutions);

        // Filter institutions to only show those in this hierarchy
        $query->whereIn('id', $allInstitutionIds);
    }

    /**
     * Apply SektorAdmin filtering - can see their sector and schools under it
     */
    private function applySektorAdminInstitutionFiltering($query, $currentUser): void
    {
        $userSektorId = $currentUser->institution_id;
        
        // Get all schools under this sector
        $sektorSchools = Institution::where('parent_id', $userSektorId)->pluck('id');
        
        // Include the sector itself
        $allInstitutionIds = $sektorSchools->push($userSektorId);

        // Filter institutions to only show those in this hierarchy
        $query->whereIn('id', $allInstitutionIds);
    }

    /**
     * Check if current user can access a specific institution
     */
    private function canAccessInstitution($user, $institutionId): bool
    {
        $userRole = $user->roles->first()?->name;
        
        switch ($userRole) {
            case 'superadmin':
                return true; // SuperAdmin can access all institutions
                
            case 'regionadmin':
            case 'regionoperator':
                // Check if institution is in their region
                $userRegionId = $user->institution_id;
                $regionInstitutions = Institution::where(function($q) use ($userRegionId) {
                    $q->where('id', $userRegionId)
                      ->orWhere('parent_id', $userRegionId);
                })->pluck('id');
                
                $schoolInstitutions = Institution::whereIn('parent_id', $regionInstitutions)->pluck('id');
                $allInstitutionIds = $regionInstitutions->merge($schoolInstitutions);
                
                return $allInstitutionIds->contains($institutionId);
                
            case 'sektoradmin':
                // Check if institution is their sector or under their sector
                $userSektorId = $user->institution_id;
                if ($institutionId == $userSektorId) {
                    return true;
                }
                
                $sektorSchools = Institution::where('parent_id', $userSektorId)->pluck('id');
                return $sektorSchools->contains($institutionId);
                
            case 'məktəbadmin':
            case 'müəllim':
                // Can only access their own institution
                return $institutionId == $user->institution_id;
                
            default:
                return false;
        }
    }
}