<?php

namespace App\Http\Controllers;

use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class InstitutionHierarchyController extends Controller
{
    /**
     * Get full institution hierarchy
     */
    public function getHierarchy(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'include_inactive' => 'nullable|boolean',
                'max_depth' => 'nullable|integer|min:1|max:10',
                'expand_all' => 'nullable|boolean',
            ]);

            $query = Institution::with(['children' => function ($q) use ($request) {
                if (!$request->boolean('include_inactive', false)) {
                    $q->where('is_active', true);
                }
            }]);

            if (!$request->boolean('include_inactive', false)) {
                $query->where('is_active', true);
            }

            $institutions = $query->roots()->get();
            
            $hierarchyData = $this->buildHierarchyTree($institutions, [
                'max_depth' => $request->get('max_depth', 5),
                'expand_all' => $request->boolean('expand_all', false),
                'include_inactive' => $request->boolean('include_inactive', false),
            ]);

            return response()->json([
                'success' => true,
                'data' => $hierarchyData,
                'hierarchy_stats' => $this->getHierarchyStatistics($institutions),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Hierarchy yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get institution tree structure for specific parent
     */
    public function getSubTree(Institution $institution, Request $request): JsonResponse
    {
        try {
            $request->validate([
                'include_inactive' => 'nullable|boolean',
                'depth' => 'nullable|integer|min:1|max:5',
            ]);

            $depth = $request->get('depth', 2);
            $includeInactive = $request->boolean('include_inactive', false);

            $institution->load($this->buildNestedRelations('children', $depth, $includeInactive));

            $subtree = $this->formatInstitutionNode($institution, [
                'include_inactive' => $includeInactive,
                'expand_all' => true,
            ]);

            return response()->json([
                'success' => true,
                'data' => $subtree,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Alt hierarchy yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get institution path (breadcrumb)
     */
    public function getPath(Institution $institution): JsonResponse
    {
        try {
            $path = [];
            $current = $institution;

            // Build path from current to root
            while ($current) {
                $path[] = [
                    'id' => $current->id,
                    'name' => $current->name,
                    'type' => $current->type,
                    'level' => $current->level,
                ];
                $current = $current->parent;
            }

            // Reverse to get root to current order
            $path = array_reverse($path);

            return response()->json([
                'success' => true,
                'data' => $path,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Institution path yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Move institution in hierarchy
     */
    public function moveInstitution(Request $request, Institution $institution): JsonResponse
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
                'new_parent_id' => 'nullable|integer|exists:institutions,id|different:' . $institution->id,
                'new_position' => 'nullable|integer|min:0',
            ]);

            $newParentId = $request->get('new_parent_id');
            
            // Validate hierarchy rules
            if ($newParentId) {
                $newParent = Institution::find($newParentId);
                
                // Check if new parent is not a descendant of current institution
                if ($this->isDescendant($institution, $newParent)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Təşkilatı öz alt təşkilatına köçürə bilməzsiniz.',
                    ], 400);
                }

                // Check level constraints
                $newLevel = $newParent->level + 1;
                if ($newLevel > 5) { // Maximum 5 levels
                    return response()->json([
                        'success' => false,
                        'message' => 'Maksimum hierarchy səviyyəsi 5-dir.',
                    ], 400);
                }

                $institution->parent_id = $newParentId;
                $institution->level = $newLevel;
            } else {
                // Moving to root level
                $institution->parent_id = null;
                $institution->level = 1;
            }

            $institution->save();

            // Update children levels recursively
            $this->updateChildrenLevels($institution);

            return response()->json([
                'success' => true,
                'message' => 'Təşkilat uğurla köçürüldü.',
                'data' => $institution->fresh(['parent', 'children']),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Təşkilat köçürülməsində xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get institutions by level
     */
    public function getByLevel(Request $request, int $level): JsonResponse
    {
        try {
            $request->validate([
                'include_inactive' => 'nullable|boolean',
                'parent_type' => 'nullable|string|in:ministry,region,sektor,school',
                'region_code' => 'nullable|string|max:10',
            ]);

            $query = Institution::where('level', $level);

            if (!$request->boolean('include_inactive', false)) {
                $query->where('is_active', true);
            }

            if ($request->parent_type) {
                $query->whereHas('parent', function ($q) use ($request) {
                    $q->where('type', $request->parent_type);
                });
            }

            if ($request->region_code) {
                $query->where('region_code', $request->region_code);
            }

            $institutions = $query->with(['parent', 'children' => function ($q) use ($request) {
                if (!$request->boolean('include_inactive', false)) {
                    $q->where('is_active', true);
                }
            }])->orderBy('name')->get();

            return response()->json([
                'success' => true,
                'data' => $institutions,
                'level_info' => [
                    'level' => $level,
                    'count' => $institutions->count(),
                    'types' => $institutions->pluck('type')->unique()->values(),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Səviyyə üzrə təşkilatlar yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Validate hierarchy structure
     */
    public function validateHierarchy(): JsonResponse
    {
        try {
            $issues = [];

            // Check for orphaned institutions
            $orphaned = Institution::whereNotNull('parent_id')
                                  ->whereDoesntHave('parent')
                                  ->get();
            
            if ($orphaned->count() > 0) {
                $issues[] = [
                    'type' => 'orphaned_institutions',
                    'count' => $orphaned->count(),
                    'institutions' => $orphaned->pluck('name', 'id'),
                ];
            }

            // Check for level inconsistencies
            $levelInconsistencies = Institution::whereHas('parent', function ($q) {
                $q->whereRaw('institutions.level != parent.level + 1');
            })->get();

            if ($levelInconsistencies->count() > 0) {
                $issues[] = [
                    'type' => 'level_inconsistencies',
                    'count' => $levelInconsistencies->count(),
                    'institutions' => $levelInconsistencies->pluck('name', 'id'),
                ];
            }

            // Check for circular references
            $circularRefs = $this->detectCircularReferences();
            if (!empty($circularRefs)) {
                $issues[] = [
                    'type' => 'circular_references',
                    'count' => count($circularRefs),
                    'chains' => $circularRefs,
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'is_valid' => empty($issues),
                    'issues' => $issues,
                    'total_issues' => count($issues),
                    'checked_at' => now()->toISOString(),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Hierarchy validasiyasında xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Build hierarchy tree structure
     */
    private function buildHierarchyTree($institutions, $options = []): array
    {
        $tree = [];
        
        foreach ($institutions as $institution) {
            $tree[] = $this->formatInstitutionNode($institution, $options, 1);
        }

        return $tree;
    }

    /**
     * Format institution node for hierarchy display
     */
    private function formatInstitutionNode($institution, $options = [], $currentDepth = 1): array
    {
        $maxDepth = $options['max_depth'] ?? 5;
        $expandAll = $options['expand_all'] ?? false;
        $includeInactive = $options['include_inactive'] ?? false;

        $node = [
            'id' => $institution->id,
            'name' => $institution->name,
            'type' => $institution->type,
            'level' => $institution->level,
            'is_active' => $institution->is_active,
            'has_children' => $institution->children->count() > 0,
            'children_count' => $institution->children->count(),
            'children' => [],
            'metadata' => [
                'region_code' => $institution->region_code,
                'director_name' => $institution->director_name,
                'student_capacity' => $institution->student_capacity,
                'staff_count' => $institution->staff_count,
            ],
        ];

        // Load children if within depth limit and conditions are met
        if ($currentDepth < $maxDepth && $institution->children && 
            ($expandAll || $currentDepth <= 2)) {
            
            $children = $includeInactive ? 
                       $institution->children : 
                       $institution->children->where('is_active', true);

            foreach ($children as $child) {
                $node['children'][] = $this->formatInstitutionNode($child, $options, $currentDepth + 1);
            }
        }

        return $node;
    }

    /**
     * Build nested relations string for eager loading
     */
    private function buildNestedRelations($relation, $depth, $includeInactive = false): array
    {
        $relations = [];
        $currentRelation = $relation;

        for ($i = 1; $i <= $depth; $i++) {
            $relations[] = $currentRelation . ($includeInactive ? '' : ' as active_children');
            $currentRelation .= '.children';
        }

        return $relations;
    }

    /**
     * Check if institution is descendant of another
     */
    private function isDescendant(Institution $ancestor, Institution $descendant): bool
    {
        $current = $descendant->parent;
        
        while ($current) {
            if ($current->id === $ancestor->id) {
                return true;
            }
            $current = $current->parent;
        }

        return false;
    }

    /**
     * Update children levels recursively
     */
    private function updateChildrenLevels(Institution $institution): void
    {
        foreach ($institution->children as $child) {
            $child->level = $institution->level + 1;
            $child->save();
            
            $this->updateChildrenLevels($child);
        }
    }

    /**
     * Detect circular references in hierarchy
     */
    private function detectCircularReferences(): array
    {
        $visited = [];
        $stack = [];
        $circles = [];

        $institutions = Institution::all();

        foreach ($institutions as $institution) {
            if (!in_array($institution->id, $visited)) {
                $circle = $this->dfsCircularCheck($institution, $visited, $stack, []);
                if ($circle) {
                    $circles[] = $circle;
                }
            }
        }

        return $circles;
    }

    /**
     * DFS helper for circular reference detection
     */
    private function dfsCircularCheck($institution, &$visited, &$stack, $path): ?array
    {
        $visited[] = $institution->id;
        $stack[] = $institution->id;
        $path[] = $institution->name;

        if ($institution->parent_id && !in_array($institution->parent_id, $visited)) {
            $parent = Institution::find($institution->parent_id);
            if ($parent) {
                return $this->dfsCircularCheck($parent, $visited, $stack, $path);
            }
        } elseif ($institution->parent_id && in_array($institution->parent_id, $stack)) {
            // Found circle
            return $path;
        }

        array_pop($stack);
        return null;
    }

    /**
     * Get hierarchy statistics
     */
    private function getHierarchyStatistics($institutions): array
    {
        $totalInstitutions = Institution::count();
        $activeInstitutions = Institution::where('is_active', true)->count();
        
        return [
            'total_institutions' => $totalInstitutions,
            'active_institutions' => $activeInstitutions,
            'root_institutions' => $institutions->count(),
            'max_depth' => Institution::max('level'),
            'by_level' => Institution::select('level', \DB::raw('count(*) as count'))
                                    ->groupBy('level')
                                    ->pluck('count', 'level'),
            'by_type' => Institution::select('type', \DB::raw('count(*) as count'))
                                   ->groupBy('type')
                                   ->pluck('count', 'type'),
        ];
    }
}