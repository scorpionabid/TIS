<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class InstitutionService
{
    /**
     * Get filtered and paginated institutions
     */
    public function getInstitutions(Request $request)
    {
        $query = Institution::with(['parent', 'children', 'departments' => function ($q) {
            $q->where('is_active', true)
              ->withCount(['users', 'users as active_users_count' => function ($subq) {
                  $subq->where('is_active', true);
              }])
              ->with(['children' => function ($childq) {
                  $childq->where('is_active', true)
                         ->withCount(['users', 'users as active_users_count' => function ($subsubq) {
                             $subsubq->where('is_active', true);
                         }]);
              }]);
        }]);

        // Apply filters
        $this->applyFilters($query, $request);
        
        // Apply sorting
        $this->applySorting($query, $request);

        // Return as hierarchy or paginated list
        if ($request->hierarchy && !$request->parent_id) {
            $institutions = $query->roots()->get();
            $this->loadHierarchy($institutions);
            
            return $this->formatHierarchy($institutions);
        } else {
            return $query->paginate($request->per_page ?? 15);
        }
    }

    /**
     * Create new institution
     */
    public function createInstitution(array $validatedData): Institution
    {
        DB::beginTransaction();
        
        try {
            // Set level based on parent
            if (isset($validatedData['parent_id'])) {
                $parent = Institution::find($validatedData['parent_id']);
                $validatedData['level'] = $parent->level + 1;
            } else {
                $validatedData['level'] = 1;
            }

            $institution = Institution::create($validatedData);

            // Create default departments if specified
            if (isset($validatedData['default_departments'])) {
                $this->createDefaultDepartments($institution, $validatedData['default_departments']);
            }

            DB::commit();
            
            return $institution->load(['parent', 'children', 'departments']);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Update institution
     */
    public function updateInstitution(Institution $institution, array $validatedData): Institution
    {
        DB::beginTransaction();
        
        try {
            // Update level if parent changed
            if (isset($validatedData['parent_id']) && $validatedData['parent_id'] !== $institution->parent_id) {
                if ($validatedData['parent_id']) {
                    $parent = Institution::find($validatedData['parent_id']);
                    $validatedData['level'] = $parent->level + 1;
                } else {
                    $validatedData['level'] = 1;
                }
                
                // Update children levels recursively
                $this->updateChildrenLevels($institution, $validatedData['level']);
            }

            $institution->update($validatedData);

            DB::commit();
            
            return $institution->fresh(['parent', 'children', 'departments']);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Delete institution (soft delete)
     */
    public function deleteInstitution(Institution $institution): bool
    {
        // Check if institution has active children
        if ($institution->children()->where('is_active', true)->exists()) {
            throw new \Exception('Bu təşkilatın aktiv alt təşkilatları var. Əvvəlcə onları deaktiv edin.');
        }

        // Check if institution has users
        if ($institution->users()->where('is_active', true)->exists()) {
            throw new \Exception('Bu təşkilatda aktiv istifadəçilər var. Əvvəlcə onları başqa təşkilata köçürün.');
        }

        return $institution->update(['is_active' => false]);
    }

    /**
     * Get institution statistics
     */
    public function getInstitutionStatistics($institutionId = null): array
    {
        $query = Institution::query();
        
        if ($institutionId) {
            $institution = Institution::find($institutionId);
            $childrenIds = $institution->getAllChildrenIds();
            $childrenIds[] = $institutionId;
            $query->whereIn('id', $childrenIds);
        }

        return [
            'total_institutions' => $query->count(),
            'active_institutions' => $query->where('is_active', true)->count(),
            'by_type' => $query->groupBy('type')
                              ->selectRaw('type, count(*) as count')
                              ->pluck('count', 'type'),
            'by_level' => $query->groupBy('level')
                               ->selectRaw('level, count(*) as count')
                               ->pluck('count', 'level'),
            'total_users' => \App\Models\User::whereIn('institution_id', 
                $query->pluck('id'))->count(),
            'active_users' => \App\Models\User::whereIn('institution_id', 
                $query->pluck('id'))->where('is_active', true)->count(),
        ];
    }

    /**
     * Get institution hierarchy tree
     */
    public function getHierarchyTree(): array
    {
        $institutions = Institution::with(['children' => function ($query) {
            $query->where('is_active', true)->orderBy('name');
        }])->roots()->where('is_active', true)->orderBy('name')->get();
        
        $this->loadHierarchy($institutions);
        
        return $this->formatHierarchy($institutions);
    }

    /**
     * Apply filters to query
     */
    private function applyFilters($query, Request $request): void
    {
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
                $query->roots();
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
    }

    /**
     * Apply sorting to query
     */
    private function applySorting($query, Request $request): void
    {
        $sortBy = $request->sort_by ?? 'name';
        $sortDirection = $request->sort_direction ?? 'asc';
        $query->orderBy($sortBy, $sortDirection);
    }

    /**
     * Load hierarchy recursively
     */
    private function loadHierarchy($institutions): void
    {
        foreach ($institutions as $institution) {
            if ($institution->children->isNotEmpty()) {
                $this->loadHierarchy($institution->children);
            }
        }
    }

    /**
     * Format hierarchy for JSON response
     */
    private function formatHierarchy($institutions): array
    {
        return $institutions->map(function ($institution) {
            return [
                'id' => $institution->id,
                'name' => $institution->name,
                'name_en' => $institution->name_en,
                'type' => $institution->type,
                'level' => $institution->level,
                'region_code' => $institution->region_code,
                'is_active' => $institution->is_active,
                'parent_id' => $institution->parent_id,
                'children_count' => $institution->children->count(),
                'users_count' => $institution->users_count ?? 0,
                'departments_count' => $institution->departments->count(),
                'children' => $institution->children->isNotEmpty() ? 
                    $this->formatHierarchy($institution->children) : [],
            ];
        })->toArray();
    }

    /**
     * Create default departments for institution
     */
    private function createDefaultDepartments(Institution $institution, array $departmentNames): void
    {
        foreach ($departmentNames as $departmentName) {
            Department::create([
                'name' => $departmentName,
                'institution_id' => $institution->id,
                'is_active' => true,
            ]);
        }
    }

    /**
     * Update children levels recursively
     */
    private function updateChildrenLevels(Institution $institution, int $newParentLevel): void
    {
        $children = $institution->children;
        
        foreach ($children as $child) {
            $child->update(['level' => $newParentLevel + 1]);
            $this->updateChildrenLevels($child, $newParentLevel + 1);
        }
    }
}