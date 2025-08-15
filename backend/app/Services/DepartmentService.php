<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DepartmentService
{
    /**
     * Get departments for institution
     */
    public function getDepartmentsForInstitution(int $institutionId, Request $request)
    {
        $query = Department::where('institution_id', $institutionId)
                          ->with(['parent', 'children', 'users' => function ($q) {
                              $q->where('is_active', true);
                          }])
                          ->withCount(['users', 'users as active_users_count' => function ($q) {
                              $q->where('is_active', true);
                          }]);

        // Apply filters
        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        if ($request->has('parent_id')) {
            if ($request->parent_id) {
                $query->where('parent_id', $request->parent_id);
            } else {
                $query->whereNull('parent_id');
            }
        }

        // Apply sorting
        $sortBy = $request->sort_by ?? 'name';
        $sortDirection = $request->sort_direction ?? 'asc';
        $query->orderBy($sortBy, $sortDirection);

        // Return as hierarchy or paginated list
        if ($request->hierarchy && !$request->parent_id) {
            $departments = $query->whereNull('parent_id')->get();
            $this->loadDepartmentHierarchy($departments);
            
            return $this->formatDepartmentHierarchy($departments);
        } else {
            return $query->paginate($request->per_page ?? 15);
        }
    }

    /**
     * Create new department
     */
    public function createDepartment(array $validatedData): Department
    {
        // Verify institution exists
        if (!Institution::where('id', $validatedData['institution_id'])->where('is_active', true)->exists()) {
            throw new \Exception('Təşkilat tapılmadı və ya aktiv deyil.');
        }

        // Set level based on parent
        if (isset($validatedData['parent_id'])) {
            $parent = Department::find($validatedData['parent_id']);
            if (!$parent || $parent->institution_id !== $validatedData['institution_id']) {
                throw new \Exception('Yanlış ana departament seçilmişdir.');
            }
            $validatedData['level'] = $parent->level + 1;
        } else {
            $validatedData['level'] = 1;
        }

        return Department::create($validatedData);
    }

    /**
     * Update department
     */
    public function updateDepartment(Department $department, array $validatedData): Department
    {
        DB::beginTransaction();
        
        try {
            // Update level if parent changed
            if (isset($validatedData['parent_id']) && $validatedData['parent_id'] !== $department->parent_id) {
                if ($validatedData['parent_id']) {
                    $parent = Department::find($validatedData['parent_id']);
                    if (!$parent || $parent->institution_id !== $department->institution_id) {
                        throw new \Exception('Yanlış ana departament seçilmişdir.');
                    }
                    $validatedData['level'] = $parent->level + 1;
                } else {
                    $validatedData['level'] = 1;
                }
                
                // Update children levels recursively
                $this->updateDepartmentChildrenLevels($department, $validatedData['level']);
            }

            $department->update($validatedData);

            DB::commit();
            
            return $department->fresh(['parent', 'children', 'users']);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Delete department
     */
    public function deleteDepartment(Department $department): bool
    {
        // Check if department has active children
        if ($department->children()->where('is_active', true)->exists()) {
            throw new \Exception('Bu departamentin aktiv alt departamentləri var.');
        }

        // Check if department has users
        if ($department->users()->where('is_active', true)->exists()) {
            throw new \Exception('Bu departamentdə aktiv istifadəçilər var.');
        }

        return $department->update(['is_active' => false]);
    }

    /**
     * Get department statistics
     */
    public function getDepartmentStatistics(int $institutionId): array
    {
        $query = Department::where('institution_id', $institutionId);

        return [
            'total_departments' => $query->count(),
            'active_departments' => $query->where('is_active', true)->count(),
            'by_level' => $query->groupBy('level')
                               ->selectRaw('level, count(*) as count')
                               ->pluck('count', 'level'),
            'total_users' => \App\Models\User::whereIn('department_id', 
                $query->pluck('id'))->count(),
            'active_users' => \App\Models\User::whereIn('department_id', 
                $query->pluck('id'))->where('is_active', true)->count(),
        ];
    }

    /**
     * Load department hierarchy recursively
     */
    private function loadDepartmentHierarchy($departments): void
    {
        foreach ($departments as $department) {
            if ($department->children->isNotEmpty()) {
                $this->loadDepartmentHierarchy($department->children);
            }
        }
    }

    /**
     * Format department hierarchy for JSON response
     */
    private function formatDepartmentHierarchy($departments): array
    {
        return $departments->map(function ($department) {
            return [
                'id' => $department->id,
                'name' => $department->name,
                'description' => $department->description,
                'level' => $department->level,
                'is_active' => $department->is_active,
                'parent_id' => $department->parent_id,
                'institution_id' => $department->institution_id,
                'children_count' => $department->children->count(),
                'users_count' => $department->users_count ?? 0,
                'active_users_count' => $department->active_users_count ?? 0,
                'children' => $department->children->isNotEmpty() ? 
                    $this->formatDepartmentHierarchy($department->children) : [],
            ];
        })->toArray();
    }

    /**
     * Update department children levels recursively
     */
    private function updateDepartmentChildrenLevels(Department $department, int $newParentLevel): void
    {
        $children = $department->children;
        
        foreach ($children as $child) {
            $child->update(['level' => $newParentLevel + 1]);
            $this->updateDepartmentChildrenLevels($child, $newParentLevel + 1);
        }
    }
}