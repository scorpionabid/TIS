<?php

namespace App\Http\Controllers;

use App\Models\Institution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class InstitutionHierarchyController extends BaseController
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

            $query = Institution::with([
                'children' => function ($q) use ($request) {
                    if (! $request->boolean('include_inactive', false)) {
                        $q->where('is_active', true);
                    }
                },
                'departments',
            ]);

            if (! $request->boolean('include_inactive', false)) {
                $query->where('is_active', true);
            }

            // Apply role-based filtering like other controllers
            $user = Auth::user();
            if ($user && ! $user->hasRole('superadmin')) {
                if ($user->hasRole('regionadmin')) {
                    // RegionAdmin can only see their region and institutions under it
                    $regionId = $user->institution_id;

                    // Get the region and all its descendants
                    $query->where(function ($q) use ($regionId) {
                        $q->where('id', $regionId) // Include the region itself
                            ->orWhere('parent_id', $regionId) // Include sectors under this region
                            ->orWhereIn('parent_id', function ($subQuery) use ($regionId) {
                                // Include institutions under sectors of this region
                                $subQuery->select('id')
                                    ->from('institutions')
                                    ->where('parent_id', $regionId);
                            })
                            ->orWhereIn('parent_id', function ($subQuery) use ($regionId) {
                                // Include preschools under sectors of this region
                                $subQuery->select('id')
                                    ->from('institutions')
                                    ->whereIn('parent_id', function ($innerQuery) use ($regionId) {
                                        $innerQuery->select('id')
                                            ->from('institutions')
                                            ->where('parent_id', $regionId);
                                    });
                            });
                    });
                } elseif ($user->hasRole('sektoradmin')) {
                    // SektorAdmin can only see their sector and institutions under it
                    $sectorId = $user->institution_id;
                    $query->where(function ($q) use ($sectorId) {
                        $q->where('id', $sectorId)
                            ->orWhere('parent_id', $sectorId)
                            ->orWhereIn('parent_id', function ($subQuery) use ($sectorId) {
                                $subQuery->select('id')
                                    ->from('institutions')
                                    ->where('parent_id', $sectorId);
                            });
                    });
                } elseif ($user->hasRole('schooladmin')) {
                    // SchoolAdmin can only see their own institution
                    $institutionId = $user->institution_id;
                    $query->where('id', $institutionId);
                }
            }

            // For role-based access, get institutions at the appropriate root level
            if ($user && ! $user->hasRole('superadmin')) {
                if ($user->hasRole('regionadmin')) {
                    // For RegionAdmin, their region is the root
                    $institutions = $query->where('id', $user->institution_id)->get();
                } elseif ($user->hasRole('sektoradmin')) {
                    // For SektorAdmin, their sector is the root
                    $institutions = $query->where('id', $user->institution_id)->get();
                } elseif ($user->hasRole('schooladmin')) {
                    // For SchoolAdmin, their school is the root
                    $institutions = $query->where('id', $user->institution_id)->get();
                } else {
                    $institutions = $query->roots()->get();
                }
            } else {
                // SuperAdmin sees actual root institutions
                $institutions = $query->roots()->get();
            }

            // Debug: Log filtered institutions for regionadmin
            if ($user && $user->hasRole('regionadmin')) {
                \Log::info('RegionAdmin Hierarchy Query Result:', [
                    'user_id' => $user->id,
                    'region_id' => $user->institution_id,
                    'institutions_count' => $institutions->count(),
                    'institution_ids' => $institutions->pluck('id')->toArray(),
                    'institution_names' => $institutions->pluck('name')->toArray(),
                ]);
            }

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

            // Build nested relationship loading based on depth
            $relations = ['departments'];
            if ($depth >= 1) {
                $relations[] = 'children';
            }
            if ($depth >= 2) {
                $relations[] = 'children.children';
            }
            if ($depth >= 3) {
                $relations[] = 'children.children.children';
            }
            if ($depth >= 4) {
                $relations[] = 'children.children.children.children';
            }
            if ($depth >= 5) {
                $relations[] = 'children.children.children.children.children';
            }

            $institution->load($relations);

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

        if (! $user->hasRole(['superadmin', 'regionadmin'])) {
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

            if (! $request->boolean('include_inactive', false)) {
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
                if (! $request->boolean('include_inactive', false)) {
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
            if (! empty($circularRefs)) {
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

        // Load departments for this institution
        $institution->load('departments');

        // Count total children (institutions + departments)
        $totalChildren = $institution->children->count() + $institution->departments->count();

        $node = [
            'id' => $institution->id,
            'name' => $institution->name,
            'type' => $institution->type,
            'level' => $institution->level,
            'is_active' => $institution->is_active,
            'has_children' => $totalChildren > 0,
            'children_count' => $totalChildren,
            'children' => [],
            'description' => $institution->description,
            'address' => $institution->address,
            'phone' => $institution->phone,
            'email' => $institution->email,
            'capacity' => $institution->capacity,
            'established_date' => $institution->established_date,
            'metadata' => [
                'region_code' => $institution->region_code,
                'director_name' => $institution->director_name,
                'student_capacity' => $institution->student_capacity,
                'staff_count' => $institution->staff_count,
            ],
        ];

        // Load children if within depth limit and conditions are met
        if ($currentDepth < $maxDepth && ($expandAll || $currentDepth <= 3)) {
            // Add institution children
            $children = $includeInactive ?
                       $institution->children :
                       $institution->children->where('is_active', true);

            foreach ($children as $child) {
                $node['children'][] = $this->formatInstitutionNode($child, $options, $currentDepth + 1);
            }

            // Add departments as children (level 5)
            if ($currentDepth < $maxDepth) {
                foreach ($institution->departments as $department) {
                    $node['children'][] = [
                        'id' => 'dept_' . $department->id, // Prefix to distinguish from institutions
                        'name' => $department->name,
                        'type' => 'department',
                        'level' => $institution->level + 1,
                        'is_active' => true,
                        'has_children' => false,
                        'children_count' => 0,
                        'children' => [],
                        'description' => $department->description,
                        'metadata' => [
                            'department_type' => $department->type,
                            'institution_id' => $department->institution_id,
                            'head_name' => $department->head_name ?? null,
                            'staff_count' => $department->staff_count ?? 0,
                        ],
                    ];
                }
            }
        }

        return $node;
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
            if (! in_array($institution->id, $visited)) {
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

        if ($institution->parent_id && ! in_array($institution->parent_id, $visited)) {
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
        // Apply the same role-based filtering for statistics as used in main query
        $user = Auth::user();
        $baseQuery = Institution::query();

        if ($user && ! $user->hasRole('superadmin')) {
            if ($user->hasRole('regionadmin')) {
                $regionId = $user->institution_id;
                $baseQuery->where(function ($q) use ($regionId) {
                    $q->where('id', $regionId)
                        ->orWhere('parent_id', $regionId)
                        ->orWhereIn('parent_id', function ($subQuery) use ($regionId) {
                            $subQuery->select('id')
                                ->from('institutions')
                                ->where('parent_id', $regionId);
                        })
                        ->orWhereIn('parent_id', function ($subQuery) use ($regionId) {
                            $subQuery->select('id')
                                ->from('institutions')
                                ->whereIn('parent_id', function ($innerQuery) use ($regionId) {
                                    $innerQuery->select('id')
                                        ->from('institutions')
                                        ->where('parent_id', $regionId);
                                });
                        });
                });
            } elseif ($user->hasRole('sektoradmin')) {
                $sectorId = $user->institution_id;
                $baseQuery->where(function ($q) use ($sectorId) {
                    $q->where('id', $sectorId)
                        ->orWhere('parent_id', $sectorId)
                        ->orWhereIn('parent_id', function ($subQuery) use ($sectorId) {
                            $subQuery->select('id')
                                ->from('institutions')
                                ->where('parent_id', $sectorId);
                        });
                });
            } elseif ($user->hasRole('schooladmin')) {
                $institutionId = $user->institution_id;
                $baseQuery->where('id', $institutionId);
            }
        }

        $totalInstitutions = $baseQuery->count();
        $activeInstitutions = (clone $baseQuery)->where('is_active', true)->count();
        $maxDepth = (clone $baseQuery)->max('level') ?? 0;

        $byLevel = (clone $baseQuery)->select('level', \DB::raw('count(*) as count'))
            ->groupBy('level')
            ->pluck('count', 'level');

        $byType = (clone $baseQuery)->select('type', \DB::raw('count(*) as count'))
            ->groupBy('type')
            ->pluck('count', 'type');

        return [
            'total_institutions' => $totalInstitutions,
            'active_institutions' => $activeInstitutions,
            'root_institutions' => $institutions->count(),
            'max_depth' => $maxDepth,
            'by_level' => $byLevel,
            'by_type' => $byType,
        ];
    }
}
