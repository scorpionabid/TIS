<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\User;
use App\Services\BaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SectorCrudService extends BaseService
{
    protected string $modelClass = Institution::class;

    /**
     * Get sectors with filtering and statistics
     */
    public function getSectors(Request $request, $user): array
    {
        $query = Institution::with(['parent', 'children', 'users', 'manager'])
            ->where('type', 'sector_education_office')
            ->where('level', 3);

        // Apply role-based filtering
        $this->applySectorAccessControl($query, $user);

        // Apply filters
        if ($request->has('region_id') && is_numeric($request->region_id)) {
            $query->where('parent_id', $request->region_id);
        }

        if ($request->has('is_active') && $request->is_active !== 'all') {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('code', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('description', 'LIKE', "%{$searchTerm}%");
            });
        }

        // Get sectors with pagination
        $sectors = $query->paginate($request->get('per_page', 15));

        // Add statistics for each sector
        $sectors->getCollection()->transform(function ($sector) {
            return $this->transformSectorWithStats($sector);
        });

        // Add summary statistics
        $summary = $this->getSectorsSummary($user, $request);

        return [
            'sectors' => $sectors,
            'summary' => $summary
        ];
    }

    /**
     * Get single sector with complete details
     */
    public function getSector(int $id, $user): array
    {
        $query = Institution::with(['parent', 'children.institutionType', 'users', 'manager'])
            ->where('type', 'sector_education_office')
            ->where('level', 3);

        $this->applySectorAccessControl($query, $user);
        
        $sector = $query->findOrFail($id);
        
        return $this->transformSectorWithCompleteDetails($sector);
    }

    /**
     * Create new sector
     */
    public function createSector(array $data, $user): Institution
    {
        return DB::transaction(function () use ($data, $user) {
            // Validate parent region exists
            $parentRegion = Institution::where('id', $data['parent_id'])
                ->where('type', 'regional_education_office')
                ->where('level', 2)
                ->firstOrFail();

            // Create sector
            $sector = Institution::create([
                'name' => $data['name'],
                'code' => $data['code'],
                'type' => 'sector_education_office',
                'level' => 3,
                'parent_id' => $data['parent_id'],
                'address' => $data['address'] ?? null,
                'phone' => $data['phone'] ?? null,
                'email' => $data['email'] ?? null,
                'description' => $data['description'] ?? null,
                'is_active' => $data['is_active'] ?? true,
                'created_by' => $user->id
            ]);

            // Assign manager if provided
            if (!empty($data['manager_id'])) {
                $this->assignSectorManager($sector, $data['manager_id']);
            }

            return $sector->load(['parent', 'manager']);
        });
    }

    /**
     * Update sector
     */
    public function updateSector(int $id, array $data, $user): Institution
    {
        return DB::transaction(function () use ($id, $data, $user) {
            $query = Institution::where('type', 'sector_education_office')->where('level', 3);
            $this->applySectorAccessControl($query, $user);
            
            $sector = $query->findOrFail($id);

            // Update basic information
            $sector->update([
                'name' => $data['name'] ?? $sector->name,
                'code' => $data['code'] ?? $sector->code,
                'address' => $data['address'] ?? $sector->address,
                'phone' => $data['phone'] ?? $sector->phone,
                'email' => $data['email'] ?? $sector->email,
                'description' => $data['description'] ?? $sector->description,
                'is_active' => $data['is_active'] ?? $sector->is_active,
                'updated_by' => $user->id
            ]);

            // Update manager if provided
            if (isset($data['manager_id'])) {
                $this->assignSectorManager($sector, $data['manager_id']);
            }

            return $sector->fresh(['parent', 'manager']);
        });
    }

    /**
     * Delete sector
     */
    public function deleteSector(int $id, $user): void
    {
        DB::transaction(function () use ($id, $user) {
            $query = Institution::where('type', 'sector_education_office')->where('level', 3);
            $this->applySectorAccessControl($query, $user);
            
            $sector = $query->findOrFail($id);

            // Check if sector has active child institutions
            $childInstitutions = $sector->children()->where('is_active', true)->count();
            if ($childInstitutions > 0) {
                throw new \Exception('Sektor silinə bilməz: Aktiv məktəbləri var');
            }

            // Check for active users
            $activeUsers = $sector->users()->where('is_active', true)->count();
            if ($activeUsers > 0) {
                throw new \Exception('Sektor silinə bilməz: Aktiv istifadəçiləri var');
            }

            $sector->delete();
        });
    }

    /**
     * Toggle sector status
     */
    public function toggleSectorStatus(int $id, $user): Institution
    {
        $query = Institution::where('type', 'sector_education_office')->where('level', 3);
        $this->applySectorAccessControl($query, $user);
        
        $sector = $query->findOrFail($id);
        
        $sector->update([
            'is_active' => !$sector->is_active,
            'updated_by' => $user->id
        ]);

        return $sector->fresh();
    }

    /**
     * Apply sector-based access control
     */
    private function applySectorAccessControl($query, $user): void
    {
        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 2) {
                $query->where('parent_id', $userInstitution->id);
            }
        } elseif ($user->hasRole('sektoradmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 3 && $userInstitution->type === 'sector_education_office') {
                $query->where('id', $userInstitution->id);
            }
        }
        // SuperAdmin sees all sectors (no additional filtering)
    }

    /**
     * Transform sector with basic statistics
     */
    private function transformSectorWithStats(Institution $sector): array
    {
        return [
            'id' => $sector->id,
            'name' => $sector->name,
            'code' => $sector->code,
            'type' => $sector->type,
            'level' => $sector->level,
            'parent_id' => $sector->parent_id,
            'parent_name' => $sector->parent?->name,
            'address' => $sector->address,
            'phone' => $sector->phone,
            'email' => $sector->email,
            'description' => $sector->description,
            'is_active' => $sector->is_active,
            'manager' => $sector->manager ? [
                'id' => $sector->manager->id,
                'name' => $sector->manager->name,
                'email' => $sector->manager->email
            ] : null,
            'statistics' => [
                'total_schools' => $sector->children()->count(),
                'active_schools' => $sector->children()->where('is_active', true)->count(),
                'total_users' => $sector->users()->count(),
                'active_users' => $sector->users()->where('is_active', true)->count()
            ],
            'created_at' => $sector->created_at,
            'updated_at' => $sector->updated_at
        ];
    }

    /**
     * Transform sector with complete details
     */
    private function transformSectorWithCompleteDetails(Institution $sector): array
    {
        $basicData = $this->transformSectorWithStats($sector);
        
        // Add detailed children information
        $basicData['children'] = $sector->children->map(function ($child) {
            return [
                'id' => $child->id,
                'name' => $child->name,
                'code' => $child->code,
                'type' => $child->type,
                'institution_type' => $child->institutionType?->name,
                'is_active' => $child->is_active,
                'student_count' => $child->students()->count(),
                'teacher_count' => $child->users()->whereHas('roles', function($q) {
                    $q->where('name', 'teacher');
                })->count()
            ];
        });

        // Add sector specialization
        $basicData['sector_type'] = $this->getSectorType($sector->name);
        
        return $basicData;
    }

    /**
     * Get sectors summary statistics
     */
    private function getSectorsSummary($user, Request $request): array
    {
        $baseQuery = Institution::where('type', 'sector_education_office')->where('level', 3);
        $this->applySectorAccessControl($baseQuery, $user);

        // Apply same filters as main query
        if ($request->has('region_id') && is_numeric($request->region_id)) {
            $baseQuery->where('parent_id', $request->region_id);
        }

        $total = $baseQuery->count();
        $active = $baseQuery->where('is_active', true)->count();
        $withManagers = $baseQuery->whereHas('users', function($q) {
            $q->whereHas('roles', function($r) {
                $r->where('name', 'sektoradmin');
            });
        })->count();

        return [
            'total_sectors' => $total,
            'active_sectors' => $active,
            'inactive_sectors' => $total - $active,
            'with_managers' => $withManagers,
            'without_managers' => $total - $withManagers,
            'management_coverage' => $total > 0 ? round(($withManagers / $total) * 100, 2) : 0
        ];
    }

    /**
     * Determine sector specialization type
     */
    private function getSectorType(string $sectorName): string
    {
        $name = strtolower($sectorName);
        
        if (strpos($name, 'texniki') !== false || strpos($name, 'peşə') !== false) {
            return 'technical_vocational';
        } elseif (strpos($name, 'incəsənət') !== false || strpos($name, 'musiqi') !== false) {
            return 'arts_music';
        } elseif (strpos($name, 'idman') !== false || strpos($name, 'sport') !== false) {
            return 'sports';
        } elseif (strpos($name, 'xüsusi') !== false) {
            return 'special_education';
        }
        
        return 'general_education';
    }

    /**
     * Assign sector manager
     */
    private function assignSectorManager(Institution $sector, int $managerId): void
    {
        // Remove current manager if exists
        $currentManager = $sector->users()->whereHas('roles', function($q) {
            $q->where('name', 'sektoradmin');
        })->first();

        if ($currentManager) {
            $currentManager->update(['institution_id' => null]);
        }

        // Assign new manager
        $newManager = User::findOrFail($managerId);
        $newManager->update(['institution_id' => $sector->id]);

        // Ensure user has sektoradmin role
        if (!$newManager->hasRole('sektoradmin')) {
            $newManager->assignRole('sektoradmin');
        }
    }
}