<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\InstitutionType;
use App\Models\Department;
use App\Repositories\InstitutionRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Exception;

class InstitutionCrudService extends BaseService
{
    protected $institutionRepository;

    public function __construct(InstitutionRepository $institutionRepository)
    {
        $this->institutionRepository = $institutionRepository;
    }

    /**
     * Get institutions list with filtering and access control
     */
    public function getInstitutions(Request $request, $user)
    {
        $query = Institution::with(['institutionType', 'parent', 'children']);

        // Apply user-based access control
        if ($user && !$user->hasRole('superadmin')) {
            $query = $this->applyUserAccessControl($query, $user);
        }

        // Apply filters
        $query = $this->applyRequestFilters($query, $request);

        // Apply search
        if ($request->filled('search')) {
            $query->searchByName($request->search);
        }

        // Apply sorting
        $sortField = $request->get('sort', 'name');
        $direction = $request->get('direction', 'asc');
        $query->orderBy($sortField, $direction);

        // Paginate results
        $perPage = $request->get('per_page', 15);
        $institutions = $query->paginate($perPage);

        return [
            'institutions' => $institutions,
            'total' => $institutions->total(),
            'current_page' => $institutions->currentPage(),
            'last_page' => $institutions->lastPage(),
            'per_page' => $institutions->perPage()
        ];
    }

    /**
     * Get single institution with details
     */
    public function getInstitution($institution, $user)
    {
        if (!$this->checkInstitutionAccess($user, $institution)) {
            throw new Exception('Bu quruma giriş icazəniz yoxdur', 403);
        }

        return $institution->load([
            'institutionType',
            'parent',
            'children',
            'departments',
            'users',
            'statistics',
            'region',
            'sector'
        ]);
    }

    /**
     * Create new institution
     */
    public function createInstitution(array $data, $user)
    {
        return DB::transaction(function () use ($data, $user) {
            // Validate parent access if parent is specified
            if (isset($data['parent_id'])) {
                $parent = Institution::find($data['parent_id']);
                if ($parent && !$this->checkInstitutionAccess($user, $parent)) {
                    throw new Exception('Valideyn quruma giriş icazəniz yoxdur', 403);
                }
            }

            // Create institution
            $institution = Institution::create($data);

            // Generate UTIS code if not provided
            if (empty($data['utis_code'])) {
                $institution->utis_code = $this->generateUtisCode($institution);
                $institution->save();
            }

            // Create default departments
            $this->createDefaultDepartments($institution);

            // Clear cache (compatible with file cache driver)
            Cache::forget('institutions_list');
            Cache::forget('institutions_hierarchy');
            Cache::forget('institutions_types');

            return $institution->load(['institutionType', 'parent', 'departments']);
        });
    }

    /**
     * Update institution
     */
    public function updateInstitution($institution, array $data, $user)
    {
        if (!$this->checkInstitutionAccess($user, $institution)) {
            throw new Exception('Bu quruma giriş icazəniz yoxdur', 403);
        }

        return DB::transaction(function () use ($institution, $data) {
            // Validate parent change if specified
            if (isset($data['parent_id']) && $data['parent_id'] !== $institution->parent_id) {
                if ($data['parent_id'] === $institution->id) {
                    throw new Exception('Qurum özünə valideyn ola bilməz', 422);
                }

                // Check for circular dependency
                if ($this->wouldCreateCircularDependency($institution->id, $data['parent_id'])) {
                    throw new Exception('Bu dəyişiklik dövrəvi asılılıq yaradacaq', 422);
                }
            }

            // Update institution
            $institution->update($data);

            // Clear cache (compatible with file cache driver)
            Cache::forget('institutions_list');
            Cache::forget('institutions_hierarchy');
            Cache::forget('institutions_types');

            return $institution->load(['institutionType', 'parent', 'children', 'departments']);
        });
    }

    /**
     * Delete institution
     */
    public function deleteInstitution($institution, $user)
    {
        if (!$this->checkInstitutionAccess($user, $institution)) {
            throw new Exception('Bu quruma giriş icazəniz yoxdur', 403);
        }

        return DB::transaction(function () use ($institution) {
            // Check if institution has children
            if ($institution->children()->count() > 0) {
                throw new Exception('Bu qurumun alt qurumları var. Əvvəlcə alt qurumları silin və ya başqa valideynə köçürün.', 422);
            }

            // Check if institution has users
            if ($institution->users()->count() > 0) {
                throw new Exception('Bu qurumda istifadəçilər var. Əvvəlcə istifadəçiləri başqa quruma köçürün.', 422);
            }

            // Soft delete institution
            $institution->delete();

            // Clear cache (compatible with file cache driver)
            Cache::forget('institutions_list');
            Cache::forget('institutions_hierarchy');
            Cache::forget('institutions_types');

            return true;
        });
    }

    /**
     * Apply user-based access control
     */
    private function applyUserAccessControl($query, $user)
    {
        if ($user->hasRole('regionadmin')) {
            $regionInstitution = $user->institution;
            if ($regionInstitution && $regionInstitution->level == 2) {
                $childIds = $regionInstitution->getAllChildrenIds();
                $query->whereIn('id', $childIds);
            }
        } elseif ($user->hasRole('sektoradmin')) {
            $sectorInstitution = $user->institution;
            if ($sectorInstitution && $sectorInstitution->level == 3) {
                $childIds = $sectorInstitution->getAllChildrenIds();
                $query->whereIn('id', $childIds);
            }
        } elseif ($user->hasRole('schooladmin')) {
            $schoolInstitution = $user->institution;
            if ($schoolInstitution) {
                $query->where('id', $schoolInstitution->id);
            }
        }

        return $query;
    }

    /**
     * Apply filters to query from request
     */
    protected function applyRequestFilters($query, Request $request)
    {
        if ($request->filled('type')) {
            $query->byType($request->type);
        }

        if ($request->filled('level')) {
            $query->byLevel($request->level);
        }

        if ($request->filled('parent_id')) {
            $query->where('parent_id', $request->parent_id);
        }

        if ($request->filled('region_id')) {
            $regionInstitution = Institution::find($request->region_id);
            if ($regionInstitution && $regionInstitution->level == 2) {
                $childIds = $regionInstitution->getAllChildrenIds();
                $query->whereIn('id', $childIds);
            }
        }

        if ($request->filled('sector_id')) {
            $sectorInstitution = Institution::find($request->sector_id);
            if ($sectorInstitution && $sectorInstitution->level == 3) {
                $childIds = $sectorInstitution->getAllChildrenIds();
                $query->whereIn('id', $childIds);
            }
        }

        if ($request->filled('status')) {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } else {
                $query->where('is_active', false);
            }
        }

        return $query;
    }

    /**
     * Check institution access for user
     */
    private function checkInstitutionAccess($user, $institution): bool
    {
        if (!$user || !$institution) {
            return false;
        }

        // SuperAdmin has access to all
        if ($user->hasRole('superadmin')) {
            return true;
        }

        $userInstitution = $user->institution;
        if (!$userInstitution) {
            return false;
        }

        // RegionAdmin can access their region and all children
        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $allowedIds = $userInstitution->getAllChildrenIds();
            return in_array($institution->id, $allowedIds);
        }

        // SektorAdmin can access their sector and all children
        if ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $allowedIds = $userInstitution->getAllChildrenIds();
            return in_array($institution->id, $allowedIds);
        }

        // SchoolAdmin can only access their own school
        if ($user->hasRole('schooladmin')) {
            return $userInstitution->id === $institution->id;
        }

        return false;
    }

    /**
     * Check if changing parent would create circular dependency
     */
    private function wouldCreateCircularDependency($institutionId, $newParentId): bool
    {
        if (!$newParentId) {
            return false;
        }

        // Check if the new parent is actually a descendant of the current institution
        $newParent = Institution::find($newParentId);
        if (!$newParent) {
            return false;
        }

        // Traverse up the parent chain of the new parent
        $current = $newParent;
        while ($current && $current->parent_id) {
            if ($current->parent_id === $institutionId) {
                return true; // Circular dependency detected
            }
            $current = $current->parent;
        }

        return false;
    }

    /**
     * Generate UTIS code for institution
     */
    private function generateUtisCode($institution): string
    {
        $type = $institution->type;
        $level = $institution->level;
        $id = $institution->id;
        
        $prefix = match($type) {
            'ministry' => 'MN',
            'regional_education_department' => 'RG',
            'sector' => 'SC',
            'secondary_school' => 'SS',
            'primary_school' => 'PS',
            'kindergarten' => 'KG',
            'lyceum' => 'LY',
            'gymnasium' => 'GY',
            default => 'IN'
        };
        
        return $prefix . str_pad($level, 1, '0', STR_PAD_LEFT) . str_pad($id, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Create default departments for institution
     */
    private function createDefaultDepartments($institution): void
    {
        $defaultDepartments = [];

        if (in_array($institution->type, ['secondary_school', 'primary_school', 'lyceum', 'gymnasium'])) {
            $defaultDepartments = [
                ['name' => 'İdarə', 'description' => 'İdarə şöbəsi'],
                ['name' => 'Pedaqoji', 'description' => 'Pedaqoji şöbə'],
                ['name' => 'Maliyyə', 'description' => 'Maliyyə şöbəsi'],
                ['name' => 'Təsərrüfat', 'description' => 'Təsərrüfat şöbəsi']
            ];
        } elseif ($institution->type === 'kindergarten') {
            $defaultDepartments = [
                ['name' => 'İdarə', 'description' => 'İdarə şöbəsi'],
                ['name' => 'Tərbiyə', 'description' => 'Tərbiyə şöbəsi'],
                ['name' => 'Tibb', 'description' => 'Tibbi şöbə']
            ];
        } elseif (in_array($institution->type, ['regional_education_department', 'sector'])) {
            $defaultDepartments = [
                ['name' => 'İdarə', 'description' => 'İdarə şöbəsi'],
                ['name' => 'Təhsil', 'description' => 'Təhsil şöbəsi'],
                ['name' => 'Maliyyə', 'description' => 'Maliyyə şöbəsi'],
                ['name' => 'Kadr', 'description' => 'Kadr şöbəsi']
            ];
        }

        foreach ($defaultDepartments as $dept) {
            Department::create([
                'name' => $dept['name'],
                'description' => $dept['description'],
                'institution_id' => $institution->id,
                'is_active' => true
            ]);
        }
    }
}