<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\Department;
use Illuminate\Http\Request;

class DepartmentService
{
    /**
     * Get departments for institution
     */
    public function getDepartmentsForInstitution(int $institutionId, Request $request)
    {
        $query = Department::where('institution_id', $institutionId)
            ->with([
                'parent',
                'children',
                'users' => function ($q) {
                    $q->where('is_active', true);
                },
            ])
            ->withCount([
                'users',
                'users as active_users_count' => function ($q) {
                    $q->where('is_active', true);
                },
            ]);

        // Apply filters
        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        if ($request->filled('parent_id')) {
            $query->where('parent_department_id', $request->parent_id);
        } elseif ($request->has('parent_id')) {
            $query->whereNull('parent_department_id');
        }

        // Apply sorting
        $sortBy = $request->sort_by ?? 'name';
        $sortDirection = $request->sort_direction ?? 'asc';
        $query->orderBy($sortBy, $sortDirection);

        // Return as hierarchy or paginated list
        if ($request->boolean('hierarchy') && !$request->filled('parent_id')) {
            $departments = $query->whereNull('parent_department_id')->get();
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
        $institution = Institution::where('id', $validatedData['institution_id'])
            ->where('is_active', true)
            ->first();

        if (!$institution) {
            throw new \Exception('Təşkilat tapılmadı və ya aktiv deyil.');
        }

        // Ensure department type is allowed
        if (!empty($validatedData['department_type'])) {
            $allowedTypes = Department::getAllowedTypesForInstitution($institution->type);
            if (!in_array($validatedData['department_type'], $allowedTypes)) {
                throw new \Exception('Departament növü bu təşkilat üçün uyğun deyil.');
            }
        }

        // Ensure parent belongs to same institution
        if (isset($validatedData['parent_department_id'])) {
            $parent = Department::find($validatedData['parent_department_id']);
            if (!$parent || $parent->institution_id !== $validatedData['institution_id']) {
                throw new \Exception('Yanlış ana departament seçilmişdir.');
            }
        }

        return Department::create($validatedData);
    }

    /**
     * Update department
     */
    public function updateDepartment(Department $department, array $validatedData): Department
    {
        // Validate department type against institution type
        if (isset($validatedData['department_type'])) {
            $allowedTypes = Department::getAllowedTypesForInstitution($department->institution->type);
            if (!in_array($validatedData['department_type'], $allowedTypes)) {
                throw new \Exception('Departament növü bu təşkilat üçün uyğun deyil.');
            }
        }

        // Ensure parent belongs to the same institution
        if (array_key_exists('parent_department_id', $validatedData)) {
            if ($validatedData['parent_department_id']) {
                $parent = Department::find($validatedData['parent_department_id']);
                if (!$parent || $parent->institution_id !== $department->institution_id) {
                    throw new \Exception('Yanlış ana departament seçilmişdir.');
                }
            }
        }

        $department->update($validatedData);

        return $department->fresh(['parent', 'children', 'users']);
    }

    /**
     * Delete department
     */
    public function deleteDepartment(Department $department): bool
    {
        // Check if department has active children
        if ($department->children()->whereNull('deleted_at')->where('is_active', true)->exists()) {
            throw new \Exception('Bu departamentin aktiv alt departamentləri var.');
        }

        // Check if department has users
        if ($department->users()->where('is_active', true)->exists()) {
            throw new \Exception('Bu departamentdə aktiv istifadəçilər var.');
        }

        $department->update(['is_active' => false]);

        if (!$department->trashed()) {
            $department->delete();
        }

        return true;
    }

    /**
     * Get department statistics
     */
    public function getDepartmentStatistics(int $institutionId): array
    {
        $baseQuery = Department::where('institution_id', $institutionId);

        return [
            'total_departments' => (clone $baseQuery)->count(),
            'active_departments' => (clone $baseQuery)->where('is_active', true)->count(),
            'hierarchy_breakdown' => [
                'root' => (clone $baseQuery)->whereNull('parent_department_id')->count(),
                'child' => (clone $baseQuery)->whereNotNull('parent_department_id')->count(),
            ],
            'total_users' => \App\Models\User::whereIn('department_id', 
                (clone $baseQuery)->pluck('id'))->count(),
            'active_users' => \App\Models\User::whereIn('department_id', 
                (clone $baseQuery)->pluck('id'))->where('is_active', true)->count(),
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
                'is_active' => $department->is_active,
                'parent_department_id' => $department->parent_department_id,
                'institution_id' => $department->institution_id,
                'children_count' => $department->children->count(),
                'users_count' => $department->users_count ?? 0,
                'active_users_count' => $department->active_users_count ?? 0,
                'children' => $department->children->isNotEmpty() ? 
                    $this->formatDepartmentHierarchy($department->children) : [],
            ];
        })->toArray();
    }

}
