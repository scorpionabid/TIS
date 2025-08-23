<?php

namespace App\Http\Controllers\Institution;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\InstitutionType;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class InstitutionCRUDController extends Controller
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
                'region_id' => 'nullable|integer|exists:institutions,id',
                'sector_id' => 'nullable|integer|exists:institutions,id',
                'parent_id' => 'nullable|integer|exists:institutions,id',
                'level' => 'nullable|integer|min:1|max:4',
                'status' => 'nullable|string|in:active,inactive',
                'sort' => 'nullable|string|in:name,created_at,updated_at,type,level',
                'direction' => 'nullable|string|in:asc,desc'
            ]);

            $user = Auth::user();
            $query = Institution::with(['institutionType', 'parent', 'children']);


            // Apply user-based access control
            if ($user && !$user->hasRole('superadmin')) {
                if ($user->hasRole('regionadmin')) {
                    // RegionAdmin manages their own region (level 2) and all institutions under it
                    $regionId = $user->institution_id;
                    $query->where(function ($q) use ($regionId) {
                        $q->where('id', $regionId)                    // Own region
                          ->orWhere('parent_id', $regionId)           // Sectors under this region
                          ->orWhereHas('parent', fn($pq) => $pq->where('parent_id', $regionId)); // Schools under sectors
                    });
                } elseif ($user->hasRole('sektoradmin')) {
                    $sectorId = $user->institution_id;
                    $query->where(function ($q) use ($sectorId) {
                        $q->where('id', $sectorId)
                          ->orWhere('parent_id', $sectorId);
                    });
                } elseif ($user->hasAnyRole(['schooladmin', 'müəllim'])) {
                    $query->where('id', $user->institution_id);
                }
            }

            // Apply filters
            if ($request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                      ->orWhere('code', 'ilike', "%{$search}%")
                      ->orWhere('address', 'ilike', "%{$search}%");
                });
            }

            if ($request->type) {
                $query->whereHas('institutionType', function ($q) use ($request) {
                    $q->where('key', $request->type);
                });
            }

            if ($request->region_id) {
                $query->where(function ($q) use ($request) {
                    $q->where('id', $request->region_id)
                      ->orWhere('parent_id', $request->region_id)
                      ->orWhereHas('parent', fn($pq) => $pq->where('parent_id', $request->region_id));
                });
            }

            if ($request->sector_id) {
                $query->where(function ($q) use ($request) {
                    $q->where('id', $request->sector_id)
                      ->orWhere('parent_id', $request->sector_id);
                });
            }

            if ($request->parent_id) {
                $query->where('parent_id', $request->parent_id);
            }

            if ($request->level) {
                $query->where('level', $request->level);
            }

            if ($request->status) {
                $query->where('is_active', $request->status === 'active');
            }

            // Apply sorting
            $sort = $request->get('sort', 'name');
            $direction = $request->get('direction', 'asc');
            $query->orderBy($sort, $direction);


            // Paginate results
            $perPage = $request->get('per_page', 15);
            $institutions = $query->paginate($perPage);


            // Transform the data
            $institutions->getCollection()->transform(function ($institution) {
                return [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'code' => $institution->code,
                    'type' => $institution->institutionType ? [
                        'id' => $institution->institutionType->id,
                        'name' => $institution->institutionType->label_az,
                        'key' => $institution->institutionType->key,
                        'level' => $institution->institutionType->default_level,
                    ] : null,
                    'level' => $institution->level,
                    'parent' => $institution->parent ? [
                        'id' => $institution->parent->id,
                        'name' => $institution->parent->name,
                        'type' => $institution->parent->institutionType->label_az ?? null,
                    ] : null,
                    'children_count' => $institution->children->count(),
                    'address' => $institution->address,
                    'phone' => $institution->phone,
                    'email' => $institution->email,
                    'is_active' => $institution->is_active,
                    'created_at' => $institution->created_at,
                    'updated_at' => $institution->updated_at,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $institutions,
                'message' => 'İnstitutlar uğurla alındı'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitutlar alınarkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show specific institution
     */
    public function show(Institution $institution): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check access permissions
            if ($user && !$user->hasRole('superadmin')) {
                $hasAccess = $this->checkInstitutionAccess($user, $institution);
                if (!$hasAccess) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu institutun məlumatlarına giriş icazəniz yoxdur'
                    ], 403);
                }
            }

            $institution->load(['institutionType', 'parent', 'children.institutionType', 'departments']);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'code' => $institution->code,
                    'type' => $institution->institutionType,
                    'level' => $institution->level,
                    'parent' => $institution->parent,
                    'children' => $institution->children->map(fn($child) => [
                        'id' => $child->id,
                        'name' => $child->name,
                        'type' => $child->institutionType->label_az ?? null,
                        'is_active' => $child->is_active,
                    ]),
                    'departments' => $institution->departments,
                    'address' => $institution->address,
                    'phone' => $institution->phone,
                    'email' => $institution->email,
                    'website' => $institution->website,
                    'description' => $institution->description,
                    'settings' => $institution->settings ?? [],
                    'is_active' => $institution->is_active,
                    'created_at' => $institution->created_at,
                    'updated_at' => $institution->updated_at,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitut məlumatları alınarkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new institution
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Get valid institution types dynamically for validation
            $validTypes = InstitutionType::active()->pluck('id')->toArray();
            $validTypesString = implode(',', $validTypes);

            $request->validate([
                'name' => 'required|string|max:255',
                'code' => 'required|string|max:20|unique:institutions,code',
                'type_id' => "required|integer|in:{$validTypesString}",
                'parent_id' => 'nullable|integer|exists:institutions,id',
                'address' => 'nullable|string|max:500',
                'phone' => 'nullable|string|max:20',
                'email' => 'nullable|email|max:255',
                'website' => 'nullable|url|max:255',
                'description' => 'nullable|string|max:1000',
                'settings' => 'nullable|array',
                'is_active' => 'boolean'
            ]);

            // Get institution type to determine level
            $institutionType = InstitutionType::findOrFail($request->type_id);
            $level = $institutionType->level;

            // Validate parent relationship based on level
            if ($request->parent_id) {
                $parent = Institution::findOrFail($request->parent_id);
                if ($parent->level >= $level) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Üst institut səviyyəsi düzgün deyil'
                    ], 400);
                }
            } elseif ($level > 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu səviyyə üçün üst institut mütləqdir'
                ], 400);
            }

            $institution = Institution::create([
                'name' => $request->name,
                'code' => $request->code,
                'institution_type_id' => $request->type_id,
                'level' => $level,
                'parent_id' => $request->parent_id,
                'address' => $request->address,
                'phone' => $request->phone,
                'email' => $request->email,
                'website' => $request->website,
                'description' => $request->description,
                'settings' => $request->settings ?? [],
                'is_active' => $request->get('is_active', true),
            ]);

            // Create default departments if this is a school/preschool
            if (in_array($institutionType->key, ['school', 'preschool', 'kindergarten'])) {
                $this->createDefaultDepartments($institution);
            }

            $institution->load(['institutionType', 'parent']);

            return response()->json([
                'success' => true,
                'data' => $institution,
                'message' => 'İnstitut uğurla yaradıldı'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitut yaradılarkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update institution
     */
    public function update(Request $request, Institution $institution): JsonResponse
    {
        try {
            $validTypes = InstitutionType::active()->pluck('id')->toArray();
            $validTypesString = implode(',', $validTypes);

            $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'code' => 'sometimes|required|string|max:20|unique:institutions,code,' . $institution->id,
                'type_id' => "sometimes|required|integer|in:{$validTypesString}",
                'parent_id' => 'nullable|integer|exists:institutions,id',
                'address' => 'nullable|string|max:500',
                'phone' => 'nullable|string|max:20',
                'email' => 'nullable|email|max:255',
                'website' => 'nullable|url|max:255',
                'description' => 'nullable|string|max:1000',
                'settings' => 'nullable|array',
                'is_active' => 'boolean'
            ]);

            // Prevent self-referencing parent
            if ($request->parent_id == $institution->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'İnstitut öz üst institutu ola bilməz'
                ], 400);
            }

            // Update level if type changes
            if ($request->type_id && $request->type_id != $institution->institution_type_id) {
                $institutionType = InstitutionType::findOrFail($request->type_id);
                $institution->level = $institutionType->level;
            }

            $institution->update($request->except(['type_id']) + [
                'institution_type_id' => $request->type_id ?? $institution->institution_type_id,
            ]);

            $institution->load(['type', 'parent']);

            return response()->json([
                'success' => true,
                'data' => $institution,
                'message' => 'İnstitut məlumatları yeniləndi'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitut yenilənərkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Soft delete institution
     */
    public function destroy(Request $request, Institution $institution): JsonResponse
    {
        try {
            // Check if institution has children
            if ($institution->children()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Alt institutları olan institut silinə bilməz'
                ], 400);
            }

            // Check if institution has active users
            $activeUsers = $institution->users()->where('is_active', true)->count();
            if ($activeUsers > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aktiv istifadəçiləri olan institut silinə bilməz'
                ], 400);
            }

            $institution->delete();

            return response()->json([
                'success' => true,
                'message' => 'İnstitut uğurla silindi'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitut silinərkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if user has access to institution
     */
    private function checkInstitutionAccess($user, $institution): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        $userInstitution = $user->institution;
        if (!$userInstitution) {
            return false;
        }

        // Check direct access
        if ($userInstitution->id === $institution->id) {
            return true;
        }

        // Check hierarchical access
        if ($user->hasRole('regionadmin')) {
            $regionId = $userInstitution->level === 2 ? $userInstitution->id : $userInstitution->parent_id;
            return $institution->id === $regionId || 
                   $institution->parent_id === $regionId ||
                   ($institution->parent && $institution->parent->parent_id === $regionId);
        }

        if ($user->hasRole('sektoradmin')) {
            return $institution->parent_id === $userInstitution->id;
        }

        return false;
    }

    /**
     * Create default departments for educational institutions
     */
    private function createDefaultDepartments($institution): void
    {
        $departments = [
            ['name' => 'Akademik Şöbə', 'description' => 'Təhsil və tədris işləri'],
            ['name' => 'İnzibati Şöbə', 'description' => 'İnzibati və idarəetmə işləri'],
            ['name' => 'Maliyyə Şöbəsi', 'description' => 'Maliyyə və mühasibatlıq işləri'],
        ];

        foreach ($departments as $dept) {
            Department::create([
                'institution_id' => $institution->id,
                'name' => $dept['name'],
                'description' => $dept['description'],
                'is_active' => true,
            ]);
        }
    }
}