<?php

namespace App\Http\Controllers\Institution;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\InstitutionType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class InstitutionHierarchyController extends Controller
{
    /**
     * Get institution hierarchy
     */
    public function hierarchy(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'format' => 'nullable|string|in:tree,flat,nested',
                'max_depth' => 'nullable|integer|min:1|max:5',
                'include_inactive' => 'nullable|boolean',
                'type_filter' => 'nullable|string',
                'region_id' => 'nullable|integer|exists:institutions,id',
            ]);

            $user = Auth::user();
            $format = $request->get('format', 'tree');
            $maxDepth = $request->get('max_depth', 5);
            $includeInactive = $request->get('include_inactive', false);

            // Create cache key
            $cacheKey = 'institution_hierarchy_' . md5(serialize([
                'user_id' => $user?->id,
                'user_roles' => $user?->roles->pluck('name')->toArray(),
                'format' => $format,
                'max_depth' => $maxDepth,
                'include_inactive' => $includeInactive,
                'type_filter' => $request->type_filter,
                'region_id' => $request->region_id,
            ]));

            // Try to get from cache
            $hierarchy = Cache::remember($cacheKey, 300, function () use ($user, $format, $maxDepth, $includeInactive, $request) {
                return $this->buildHierarchy($user, $format, $maxDepth, $includeInactive, $request);
            });

            // Get statistics
            $stats = $this->getHierarchyStatistics();

            return response()->json([
                'success' => true,
                'data' => $hierarchy,
                'format' => $format,
                'hierarchy_stats' => $stats,
                'message' => 'Hierarkiya alındı'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Hierarkiya alınarkən səhv: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get institution children
     */
    public function children(Request $request, Institution $institution): JsonResponse
    {
        try {
            $request->validate([
                'include_inactive' => 'nullable|boolean',
                'recursive' => 'nullable|boolean',
                'max_depth' => 'nullable|integer|min:1|max:3',
            ]);

            $user = Auth::user();
            
            // Check access
            if (!$this->checkHierarchyAccess($user, $institution)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu hierarkiyaya giriş icazəniz yoxdur'
                ], 403);
            }

            $includeInactive = $request->get('include_inactive', false);
            $recursive = $request->get('recursive', false);
            $maxDepth = $request->get('max_depth', 2);

            $children = $this->getInstitutionChildren($institution, $includeInactive, $recursive, $maxDepth);

            return response()->json([
                'success' => true,
                'data' => [
                    'parent' => [
                        'id' => $institution->id,
                        'name' => $institution->name,
                        'type' => $institution->institutionType?->label_az,
                        'level' => $institution->level,
                    ],
                    'children' => $children,
                    'total_children' => $this->countChildren($children),
                ],
                'message' => 'Alt institutlar alındı'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Alt institutlar alınarkən səhv: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get institution path (breadcrumb)
     */
    public function path(Institution $institution): JsonResponse
    {
        try {
            $user = Auth::user();
            
            // Check access
            if (!$this->checkHierarchyAccess($user, $institution)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu hierarkiyaya giriş icazəniz yoxdur'
                ], 403);
            }

            $path = $this->buildInstitutionPath($institution);

            return response()->json([
                'success' => true,
                'data' => $path,
                'message' => 'İnstitut yolu alındı'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İnstitut yolu alınarkən səhv: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Build hierarchy based on user permissions and parameters
     */
    private function buildHierarchy($user, $format, $maxDepth, $includeInactive, $request): array
    {
        $query = Institution::with(['institutionType', 'parent']);

        if (!$includeInactive) {
            $query->where('is_active', true);
        }

        // Apply type filter
        if ($request->type_filter) {
            $query->whereHas('institutionType', function ($q) use ($request) {
                $q->where('key', $request->type_filter);
            });
        }

        // Apply user-based access control
        if ($user && !$user->hasRole('superadmin')) {
            $query = $this->applyUserAccessControl($query, $user, $request);
        }

        $institutions = $query->orderBy('level')->orderBy('name')->get();

        return match($format) {
            'tree' => $this->buildTreeStructure($institutions, $maxDepth),
            'flat' => $this->buildFlatStructure($institutions),
            'nested' => $this->buildNestedStructure($institutions, $maxDepth),
            default => $this->buildTreeStructure($institutions, $maxDepth),
        };
    }

    /**
     * Apply user-based access control to query
     */
    private function applyUserAccessControl($query, $user, $request)
    {
        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            $regionId = $userInstitution->level === 2 ? $userInstitution->id : $userInstitution->parent_id;
            
            if ($request->region_id) {
                // If specific region requested, check if user has access to it
                if ($request->region_id != $regionId) {
                    // Return empty query if user doesn't have access to requested region
                    return $query->where('id', -1);
                }
            }
            
            $query->where(function ($q) use ($regionId) {
                $q->where('id', $regionId)
                  ->orWhere('parent_id', $regionId)
                  ->orWhereHas('parent', fn($pq) => $pq->where('parent_id', $regionId));
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

        return $query;
    }

    /**
     * Build tree structure
     */
    private function buildTreeStructure($institutions, $maxDepth): array
    {
        $institutionsArray = $institutions->keyBy('id')->toArray();
        $tree = [];

        foreach ($institutions as $institution) {
            if (!$institution->parent_id || $institution->level === 1) {
                // This is a root institution
                $tree[] = $this->buildTreeNode($institution, $institutionsArray, $maxDepth, 1);
            }
        }

        return $tree;
    }

    /**
     * Build single tree node recursively
     */
    private function buildTreeNode($institution, $institutionsArray, $maxDepth, $currentDepth): array
    {
        $node = [
            'id' => $institution->id,
            'name' => $institution->name,
            'code' => $institution->code,
            'type' => $institution->institutionType ? [
                'id' => $institution->institutionType->id,
                'name' => $institution->institutionType->label_az,
                'key' => $institution->institutionType->key,
            ] : null,
            'level' => $institution->level,
            'is_active' => $institution->is_active,
            'children' => [],
            'children_count' => 0,
            'metadata' => [
                'region_code' => $institution->region_code ?? null,
                'director_name' => $institution->director_name ?? null,
                'student_capacity' => $institution->student_capacity ?? null,
                'staff_count' => $institution->staff_count ?? null,
            ],
        ];

        if ($currentDepth < $maxDepth) {
            $children = collect($institutionsArray)->filter(function ($inst) use ($institution) {
                return $inst['parent_id'] === $institution->id;
            });

            $node['children_count'] = $children->count();

            foreach ($children as $child) {
                $childInstitution = Institution::find($child['id']);
                $childInstitution->institutionType = $childInstitution->institutionType; // Load relationship
                
                $node['children'][] = $this->buildTreeNode(
                    $childInstitution, 
                    $institutionsArray, 
                    $maxDepth, 
                    $currentDepth + 1
                );
            }
        } else {
            // Count children even if not including them
            $node['children_count'] = collect($institutionsArray)->filter(function ($inst) use ($institution) {
                return $inst['parent_id'] === $institution->id;
            })->count();
        }

        return $node;
    }

    /**
     * Build flat structure
     */
    private function buildFlatStructure($institutions): array
    {
        return $institutions->map(function ($institution) {
            return [
                'id' => $institution->id,
                'name' => $institution->name,
                'code' => $institution->code,
                'type' => $institution->institutionType?->label_az,
                'type_key' => $institution->institutionType?->key,
                'level' => $institution->level,
                'parent_id' => $institution->parent_id,
                'parent_name' => $institution->parent?->name,
                'is_active' => $institution->is_active,
                'path' => $this->buildInstitutionPath($institution),
            ];
        })->toArray();
    }

    /**
     * Build nested structure (for dropdowns)
     */
    private function buildNestedStructure($institutions, $maxDepth): array
    {
        $nested = [];
        $institutionsByLevel = $institutions->groupBy('level');

        for ($level = 1; $level <= min($maxDepth, 4); $level++) {
            if (!$institutionsByLevel->has($level)) continue;

            foreach ($institutionsByLevel[$level] as $institution) {
                $nested[] = [
                    'id' => $institution->id,
                    'name' => str_repeat('— ', $level - 1) . $institution->name,
                    'level' => $level,
                    'type' => $institution->institutionType?->label_az,
                    'parent_id' => $institution->parent_id,
                    'is_active' => $institution->is_active,
                ];
            }
        }

        return $nested;
    }

    /**
     * Get institution children recursively
     */
    private function getInstitutionChildren($institution, $includeInactive, $recursive, $maxDepth, $currentDepth = 1): array
    {
        $query = $institution->children()->with(['institutionType']);

        if (!$includeInactive) {
            $query->where('is_active', true);
        }

        $children = $query->orderBy('name')->get();

        return $children->map(function ($child) use ($includeInactive, $recursive, $maxDepth, $currentDepth) {
            $childData = [
                'id' => $child->id,
                'name' => $child->name,
                'code' => $child->code,
                'type' => $child->institutionType ? [
                    'id' => $child->institutionType->id,
                    'name' => $child->institutionType->label_az,
                    'key' => $child->institutionType->key,
                ] : null,
                'level' => $child->level,
                'is_active' => $child->is_active,
                'children' => [],
                'metadata' => [
                    'region_code' => $child->region_code ?? null,
                    'director_name' => $child->director_name ?? null,
                    'student_capacity' => $child->student_capacity ?? null,
                    'staff_count' => $child->staff_count ?? null,
                ],
            ];

            if ($recursive && $currentDepth < $maxDepth) {
                $childData['children'] = $this->getInstitutionChildren(
                    $child, 
                    $includeInactive, 
                    $recursive, 
                    $maxDepth, 
                    $currentDepth + 1
                );
            }

            return $childData;
        })->toArray();
    }

    /**
     * Build institution path for breadcrumbs
     */
    private function buildInstitutionPath($institution): array
    {
        $path = [];
        $current = $institution;

        while ($current) {
            array_unshift($path, [
                'id' => $current->id,
                'name' => $current->name,
                'type' => $current->institutionType?->label_az,
                'level' => $current->level,
            ]);
            
            $current = $current->parent;
        }

        return $path;
    }

    /**
     * Count total children recursively
     */
    private function countChildren($children): int
    {
        $count = count($children);
        
        foreach ($children as $child) {
            if (isset($child['children']) && is_array($child['children'])) {
                $count += $this->countChildren($child['children']);
            }
        }

        return $count;
    }

    /**
     * Check if user has access to view hierarchy
     */
    private function checkHierarchyAccess($user, $institution): bool
    {
        if (!$user) {
            return false;
        }

        // Check for superadmin role (case insensitive)
        if ($user->hasRole('superadmin') || $user->hasRole('superadmin')) {
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
            return $institution->id === $userInstitution->id || 
                   $institution->parent_id === $userInstitution->id;
        }

        return false;
    }

    /**
     * Get hierarchy statistics
     */
    private function getHierarchyStatistics(): array
    {
        $totalInstitutions = Institution::count();
        $activeInstitutions = Institution::where('is_active', true)->count();
        
        return [
            'total_institutions' => $totalInstitutions,
            'active_institutions' => $activeInstitutions,
            'root_institutions' => Institution::whereNull('parent_id')->count(),
            'max_depth' => Institution::max('level'),
            'by_level' => Institution::select('level', \DB::raw('count(*) as count'))
                                    ->groupBy('level')
                                    ->pluck('count', 'level'),
            'by_type' => Institution::with('institutionType')
                                   ->get()
                                   ->groupBy('institutionType.key')
                                   ->map(function ($group) {
                                       return $group->count();
                                   }),
        ];
    }
}