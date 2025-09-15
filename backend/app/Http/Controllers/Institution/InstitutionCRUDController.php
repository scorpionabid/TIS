<?php

namespace App\Http\Controllers\Institution;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class InstitutionCRUDController extends Controller
{
    /**
     * Display a listing of the institutions.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $query = Institution::query();

        // Apply role-based access control
        $this->applyAccessControl($query, $user);

        // Apply filters if provided
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('level')) {
            $query->where('level', $request->integer('level'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('institution_code', 'like', "%{$search}%")
                  ->orWhere('short_name', 'like', "%{$search}%");
            });
        }

        // Paginate results
        $perPage = $request->input('per_page', 15);
        $institutions = $query->paginate($perPage);

        return response()->json($institutions);
    }

    /**
     * Store a newly created institution in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        // Check permissions
        if (!$user->hasRole('superadmin') && !$user->hasRole('regionadmin')) {
            return response()->json([
                'success' => false,
                'message' => 'User does not have the right permissions.'
            ], 403);
        }
        
        // RegionAdmin can only create institutions under their region
        if ($user->hasRole('regionadmin')) {
            $parentId = $request->input('parent_id');
            $userInstitution = $user->institution;
            
            if (!$userInstitution || $userInstitution->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'RegionAdmin must be associated with a regional institution.'
                ], 403);
            }
            
            // Parent must be either their region or a sector under their region
            if ($parentId && $parentId !== $userInstitution->id) {
                $parentInstitution = Institution::find($parentId);
                if (!$parentInstitution || $parentInstitution->parent_id !== $userInstitution->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'RegionAdmin can only create institutions under their own region.'
                    ], 403);
                }
            }
        }
        
        // Dynamic validation rules - parent_id required for levels > 1
        $level = $request->input('level', 1);
        $parentIdRule = $level > 1 ? 'required|exists:institutions,id' : 'nullable|exists:institutions,id';

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'short_name' => 'nullable|string|max:50',
            'type' => 'required|string|max:50',
            'institution_code' => 'required|string|max:50|unique:institutions',
            'parent_id' => $parentIdRule,
            'level' => 'required|integer|min:1',
            'region_code' => 'required|string|max:50',
            'contact_info' => 'nullable|array',
            'location' => 'nullable|array',
            'metadata' => 'nullable|array',
            'is_active' => 'boolean',
            'established_date' => 'nullable|date',
        ]);

        $institution = Institution::create($validated);

        return response()->json($institution, 201);
    }

    /**
     * Display the specified institution.
     */
    public function show(Institution $institution): JsonResponse
    {
        return response()->json($institution);
    }

    /**
     * Update the specified institution in storage.
     */
    public function update(Request $request, Institution $institution): JsonResponse
    {
        $user = Auth::user();
        
        // Check permissions
        if (!$user->hasRole('superadmin') && !$user->hasRole('regionadmin')) {
            return response()->json([
                'success' => false,
                'message' => 'User does not have the right permissions.'
            ], 403);
        }
        
        // RegionAdmin can only update institutions within their hierarchy
        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            
            if (!$userInstitution || $userInstitution->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'RegionAdmin must be associated with a regional institution.'
                ], 403);
            }
            
            // Check if institution is within their hierarchy
            $canUpdate = $institution->id === $userInstitution->id || // Their own region
                        $institution->parent_id === $userInstitution->id || // Direct child (sector)
                        ($institution->parent && $institution->parent->parent_id === $userInstitution->id); // Grandchild (school under sector)
                        
            if (!$canUpdate) {
                return response()->json([
                    'success' => false,
                    'message' => 'RegionAdmin can only update institutions within their region.'
                ], 403);
            }
        }
        
        // Dynamic validation rules - parent_id required for levels > 1
        $level = $request->input('level', $institution->level);
        $parentIdRule = $level > 1 ? 'required|exists:institutions,id' : 'nullable|exists:institutions,id';

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'short_name' => 'nullable|string|max:50',
            'type' => 'sometimes|required|string|max:50',
            'institution_code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('institutions')->ignore($institution->id)
            ],
            'parent_id' => $parentIdRule,
            'level' => 'sometimes|required|integer|min:1',
            'region_code' => 'sometimes|required|string|max:50',
            'contact_info' => 'nullable|array',
            'location' => 'nullable|array',
            'metadata' => 'nullable|array',
            'is_active' => 'sometimes|boolean',
            'established_date' => 'nullable|date',
        ]);

        $institution->update($validated);

        return response()->json($institution);
    }

    /**
     * Get delete impact summary for institution
     */
    public function getDeleteImpact(Institution $institution): JsonResponse
    {
        $user = Auth::user();

        // Check permissions
        if (!$user->hasRole('superadmin') && !$user->hasRole('regionadmin') && !$user->hasRole('sektoradmin')) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.'
            ], 403);
        }

        try {
            $impactSummary = $institution->getDeleteImpactSummary();

            return response()->json([
                'success' => true,
                'data' => $impactSummary
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Məlumat toplanarkən xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified institution from storage.
     */
    public function destroy(Request $request, Institution $institution): JsonResponse
    {
        $user = Auth::user();
        
        // Check permissions - align with frontend UI permissions
        if (!$user->hasRole('superadmin') && !$user->hasRole('regionadmin') && !$user->hasRole('sektoradmin')) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.'
            ], 403);
        }
        
        // RegionAdmin can only delete institutions within their hierarchy (level 3 and 4)
        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            
            if (!$userInstitution || $userInstitution->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'RegionAdmin regional müəssisə ilə əlaqələndirilməlidir.'
                ], 403);
            }
            
            // Check if institution is within their hierarchy
            $canDelete = $institution->parent_id === $userInstitution->id || // Direct child (sector)
                        ($institution->parent && $institution->parent->parent_id === $userInstitution->id); // Grandchild (school under sector)
                        
            if (!$canDelete || $institution->level < 3) {
                return response()->json([
                    'success' => false,
                    'message' => 'RegionAdmin yalnız öz regionu altındakı müəssisələri silə bilər.'
                ], 403);
            }
        }
        
        // SektorAdmin can only delete level 4 institutions (schools) under their sector
        if ($user->hasRole('sektoradmin')) {
            $userInstitution = $user->institution;
            
            if (!$userInstitution || $userInstitution->level !== 3) {
                return response()->json([
                    'success' => false,
                    'message' => 'SektorAdmin sektor müəssisəsi ilə əlaqələndirilməlidir.'
                ], 403);
            }
            
            // Can only delete level 4 institutions directly under their sector
            if ($institution->parent_id !== $userInstitution->id || $institution->level !== 4) {
                return response()->json([
                    'success' => false,
                    'message' => 'SektorAdmin yalnız öz sektoru altındakı məktəbləri silə bilər.'
                ], 403);
            }
        }
        
        // Get delete type from request parameter (soft or hard)
        $deleteType = $request->input('type', 'soft');
        
        // Validate delete type
        if (!in_array($deleteType, ['soft', 'hard'])) {
            return response()->json([
                'success' => false,
                'message' => 'Yanlış silmə növü. "soft" və ya "hard" olmalıdır.'
            ], 422);
        }
        
        // Check if institution has children and users (different handling for soft vs hard delete)
        $hasChildren = $institution->children()->exists();
        $hasUsers = $institution->users()->exists();

        if ($deleteType === 'soft') {
            // For soft delete, prevent if has children or users
            if ($hasChildren) {
                return response()->json([
                    'success' => false,
                    'message' => 'Alt müəssisələri olan müəssisə arxivə köçürülə bilməz. Əvvəlcə alt müəssisələri köçürün.'
                ], 422);
            }

            if ($hasUsers) {
                return response()->json([
                    'success' => false,
                    'message' => 'İstifadəçiləri olan müəssisə arxivə köçürülə bilməz. Əvvəlcə istifadəçiləri köçürün.'
                ], 422);
            }
        }

        // For hard delete, we allow recursive deletion of children and users
        // The model will handle the complex deletion process

        try {
            if ($deleteType === 'soft') {
                // Soft delete - just marks as deleted
                $institution->delete();
                $message = 'Müəssisə arxivə köçürüldü və lazım olduqda bərpa edilə bilər.';

                return response()->json([
                    'success' => true,
                    'message' => $message,
                    'delete_type' => $deleteType
                ], 200);
            } else {
                // Hard delete - comprehensive cleanup using the model method
                $deletedData = $institution->hardDeleteWithRelationships();

                // Build detailed success message
                $details = [];
                $childrenCount = 0;

                if (isset($deletedData['children_deleted'])) {
                    $childrenCount = count($deletedData['children_deleted']);
                    $details[] = "{$childrenCount} alt müəssisə";
                }

                if (isset($deletedData['users_deleted'])) {
                    $details[] = "{$deletedData['users_deleted']} istifadəçi";
                }

                if (isset($deletedData['students'])) {
                    $details[] = "{$deletedData['students']} şagird";
                }

                if (isset($deletedData['survey_responses'])) {
                    $details[] = "{$deletedData['survey_responses']} sorğu cavabı";
                }
                if (isset($deletedData['statistics'])) {
                    $details[] = "{$deletedData['statistics']} statistika";
                }
                if (isset($deletedData['departments'])) {
                    $details[] = "{$deletedData['departments']} şöbə";
                }
                if (isset($deletedData['rooms'])) {
                    $details[] = "{$deletedData['rooms']} otaq";
                }
                if (isset($deletedData['grades'])) {
                    $details[] = "{$deletedData['grades']} sinif";
                }

                $detailMessage = !empty($details) ? ' Silindi: ' . implode(', ', $details) . '.' : '';
                $recursiveMessage = $childrenCount > 0 ? ' (Recursive silmə - alt müəssisələr də daxil olmaqla)' : '';
                $message = 'Müəssisə və bütün əlaqəli məlumatlar həmişəlik silindi.' . $recursiveMessage . $detailMessage;

                return response()->json([
                    'success' => true,
                    'message' => $message,
                    'delete_type' => $deleteType,
                    'deleted_data' => $deletedData
                ], 200);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Müəssisə silinərkən xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Apply role-based access control to institution queries
     */
    private function applyAccessControl($query, $user): void
    {
        if ($user->hasRole('regionadmin')) {
            // RegionAdmin can see their own region and child institutions
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 2) {
                $query->where(function ($q) use ($userInstitution) {
                    // Their own regional institution
                    $q->where('id', $userInstitution->id)
                      // Or their child institutions (sectors and schools)
                      ->orWhere('parent_id', $userInstitution->id)
                      // Or grandchild institutions (schools under sectors)
                      ->orWhereIn('parent_id', function ($subQuery) use ($userInstitution) {
                          $subQuery->select('id')
                                   ->from('institutions')
                                   ->where('parent_id', $userInstitution->id);
                      });
                });
            }
        } elseif ($user->hasRole('sektoradmin')) {
            // SectorAdmin can see their own sector and child schools
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 3) {
                $query->where(function ($q) use ($userInstitution) {
                    $q->where('id', $userInstitution->id)
                      ->orWhere('parent_id', $userInstitution->id);
                });
            }
        } elseif ($user->hasRole('schooladmin')) {
            // SchoolAdmin can only see their own school
            $userInstitution = $user->institution;
            if ($userInstitution) {
                $query->where('id', $userInstitution->id);
            }
        }
        // SuperAdmin sees all institutions (no additional filtering)
    }
}
