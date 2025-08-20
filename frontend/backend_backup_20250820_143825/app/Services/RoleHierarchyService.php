<?php

namespace App\Services;

use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class RoleHierarchyService
{
    /**
     * Role hierarchy levels (1=highest authority, 10=lowest)
     */
    const HIERARCHY_LEVELS = [
        1 => 'System Administrator',
        2 => 'System Operator', 
        3 => 'Regional Administrator',
        4 => 'Regional Operator',
        5 => 'Sector Administrator',
        6 => 'Sector Operator',
        7 => 'Institution Administrator',
        8 => 'Institution Deputy',
        9 => 'Staff Supervisor',
        10 => 'Staff Member'
    ];

    /**
     * Permission scopes by level
     */
    const PERMISSION_SCOPES = [
        1 => ['global', 'system', 'regional', 'sector', 'institution', 'classroom'],
        2 => ['system', 'regional', 'sector', 'institution', 'classroom'],
        3 => ['regional', 'sector', 'institution', 'classroom'],
        4 => ['regional', 'sector', 'institution', 'classroom'],
        5 => ['sector', 'institution', 'classroom'],
        6 => ['sector', 'institution', 'classroom'],
        7 => ['institution', 'classroom'],
        8 => ['institution', 'classroom'],
        9 => ['classroom'],
        10 => ['classroom']
    ];

    /**
     * Check if user can create a role at the specified level
     */
    public function canUserCreateRole(User $user, int $targetLevel): bool
    {
        if (!$user) return false;

        // Get user's highest authority level (lowest number = highest authority)
        $userLevel = $this->getUserMaxAuthorityLevel($user);
        
        if ($userLevel === null) return false;

        // Get user's role creation limit
        $canCreateBelowLevel = $this->getUserRoleCreationLimit($user);
        
        if ($canCreateBelowLevel === null) return false;

        // User can only create roles at levels equal to or below their limit
        return $targetLevel >= $canCreateBelowLevel;
    }

    /**
     * Get user's maximum authority level
     */
    public function getUserMaxAuthorityLevel(User $user): ?int
    {
        if (!$user) return null;

        $userRoles = $user->roles()->with(['permissions'])->get();
        
        if ($userRoles->isEmpty()) return null;

        // Return the highest authority level (lowest number)
        return $userRoles->min('level') ?? 10;
    }

    /**
     * Get user's role creation limit
     */
    public function getUserRoleCreationLimit(User $user): ?int
    {
        if (!$user) return null;

        $userRoles = $user->roles()->get();
        
        $limits = $userRoles->whereNotNull('can_create_roles_below_level')
                           ->pluck('can_create_roles_below_level');
        
        // Return the most permissive limit (highest number)
        return $limits->max();
    }

    /**
     * Get allowed permissions for a role level
     */
    public function getPermissionScopeForLevel(int $level): array
    {
        $allowedScopes = self::PERMISSION_SCOPES[$level] ?? ['classroom'];
        
        // Get all permissions grouped by scope
        $permissions = Cache::remember("permissions_by_scope", 3600, function () {
            return Permission::all()->groupBy(function ($permission) {
                // Determine scope based on permission name
                if (str_contains($permission->name, 'system')) return 'system';
                if (str_contains($permission->name, 'reports') || str_contains($permission->name, 'analytics')) return 'global';
                if (str_contains($permission->name, 'institutions')) return 'regional';
                if (str_contains($permission->name, 'users') && str_contains($permission->name, 'manage')) return 'sector';
                if (str_contains($permission->name, 'surveys')) return 'institution';
                return 'classroom';
            });
        });

        $allowedPermissions = [];
        foreach ($allowedScopes as $scope) {
            if (isset($permissions[$scope])) {
                $allowedPermissions = array_merge($allowedPermissions, 
                    $permissions[$scope]->pluck('name')->toArray()
                );
            }
        }

        return $allowedPermissions;
    }

    /**
     * Validate role creation request
     */
    public function validateRoleCreation(User $creator, array $roleData): array
    {
        $errors = [];

        // 1. Check if user can create roles at this level
        $targetLevel = $roleData['level'] ?? 10;
        if (!$this->canUserCreateRole($creator, $targetLevel)) {
            $errors[] = "Bu səviyyədə rol yarada bilməzsiniz. Maksimum səviyyə: " . 
                       $this->getUserRoleCreationLimit($creator);
        }

        // 2. Validate role name uniqueness
        if (isset($roleData['name']) && Role::where('name', $roleData['name'])->exists()) {
            $errors[] = "Bu adda rol artıq mövcuddur.";
        }

        // 3. Validate permission scope
        if (isset($roleData['permissions'])) {
            $allowedPermissions = $this->getPermissionScopeForLevel($targetLevel);
            $requestedPermissions = $roleData['permissions'];
            $invalidPermissions = array_diff($requestedPermissions, $allowedPermissions);
            
            if (!empty($invalidPermissions)) {
                $errors[] = "Bu səviyyə üçün uyğun olmayan icazələr: " . 
                           implode(', ', $invalidPermissions);
            }
        }

        // 4. Validate role name format
        if (isset($roleData['name'])) {
            if (!preg_match('/^[a-z0-9_]+$/', $roleData['name'])) {
                $errors[] = "Rol adı yalnız kiçik hərflər, rəqəmlər və alt xətt içərə bilər.";
            }
        }

        return $errors;
    }

    /**
     * Create role with hierarchy validation
     */
    public function createRole(User $creator, array $roleData): Role
    {
        // Validate first
        $errors = $this->validateRoleCreation($creator, $roleData);
        if (!empty($errors)) {
            throw new \InvalidArgumentException(implode(' ', $errors));
        }

        DB::beginTransaction();
        try {
            // Calculate hierarchy scope
            $hierarchyScope = $this->calculateHierarchyScope($roleData['level']);
            
            // Create role
            $role = Role::create([
                'name' => $roleData['name'],
                'display_name' => $roleData['display_name'],
                'description' => $roleData['description'] ?? null,
                'level' => $roleData['level'],
                'role_category' => 'custom',
                'created_by_user_id' => $creator->id,
                'hierarchy_scope' => $hierarchyScope,
                'can_create_roles_below_level' => $this->calculateCreationLevel($roleData['level']),
                'max_institutions_scope' => $this->calculateInstitutionScope($roleData['level']),
                'guard_name' => 'web'
            ]);

            // Assign permissions
            if (isset($roleData['permissions'])) {
                $role->syncPermissions($roleData['permissions']);
            }

            DB::commit();
            
            // Clear permission cache
            Cache::forget("permissions_by_scope");
            
            return $role;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Calculate hierarchy scope for role level
     */
    private function calculateHierarchyScope(int $level): array
    {
        $scopes = self::PERMISSION_SCOPES[$level] ?? ['classroom'];
        
        return [
            'allowed_scopes' => $scopes,
            'level_name' => self::HIERARCHY_LEVELS[$level] ?? 'Custom Role',
            'can_manage_users' => $level <= 7,
            'can_view_reports' => $level <= 8,
            'can_manage_content' => $level <= 9
        ];
    }

    /**
     * Calculate what level of roles this role can create
     */
    private function calculateCreationLevel(int $level): ?int
    {
        // Only levels 1-7 can create other roles
        if ($level > 7) return null;
        
        // Can create roles 2 levels below themselves
        return min(10, $level + 2);
    }

    /**
     * Calculate institution scope limit
     */
    private function calculateInstitutionScope(int $level): ?int
    {
        $scopeLimits = [
            1 => null,    // Unlimited
            2 => null,    // Unlimited  
            3 => 100,     // Regional: up to 100 institutions
            4 => 50,      // Regional operator: up to 50
            5 => 20,      // Sector: up to 20
            6 => 10,      // Sector operator: up to 10
            7 => 1,       // Institution: 1 institution
            8 => 1,       // Deputy: 1 institution
            9 => 1,       // Staff supervisor: 1 institution
            10 => 1       // Staff: 1 institution
        ];

        return $scopeLimits[$level] ?? 1;
    }

    /**
     * Get role hierarchy visualization
     */
    public function getHierarchyVisualization(User $user): array
    {
        $userLevel = $this->getUserMaxAuthorityLevel($user);
        $createLimit = $this->getUserRoleCreationLimit($user);
        
        $visualization = [];
        
        foreach (self::HIERARCHY_LEVELS as $level => $name) {
            $visualization[] = [
                'level' => $level,
                'name' => $name,
                'user_can_access' => $userLevel ? $level >= $userLevel : false,
                'user_can_create' => $createLimit ? $level >= $createLimit : false,
                'permissions_count' => count($this->getPermissionScopeForLevel($level)),
                'scope' => self::PERMISSION_SCOPES[$level] ?? []
            ];
        }

        return $visualization;
    }

    /**
     * Get roles that user can manage
     */
    public function getUserManageableRoles(User $user): Collection
    {
        $userLevel = $this->getUserMaxAuthorityLevel($user);
        $createLimit = $this->getUserRoleCreationLimit($user);
        
        if (!$userLevel || !$createLimit) {
            return collect();
        }

        return Role::where(function (Builder $query) use ($userLevel, $createLimit, $user) {
            // Can manage roles at their level or below
            $query->where('level', '>=', $userLevel);
            
            // Can manage custom roles they created
            $query->orWhere('created_by_user_id', $user->id);
            
            // Cannot manage system roles above their level
            $query->where(function (Builder $subQuery) use ($userLevel) {
                $subQuery->where('role_category', 'custom')
                        ->orWhere('level', '>=', $userLevel);
            });
        })->get();
    }

    /**
     * Check if role can be deleted
     */
    public function canDeleteRole(User $user, Role $role): bool
    {
        // Cannot delete system roles
        if ($role->role_category === 'system') {
            return false;
        }

        // Can delete if user created it
        if ($role->created_by_user_id === $user->id) {
            return true;
        }

        // Can delete if user has higher authority
        $userLevel = $this->getUserMaxAuthorityLevel($user);
        return $userLevel && $userLevel < $role->level;
    }

    /**
     * Get system statistics
     */
    public function getSystemStats(): array
    {
        $stats = Cache::remember('role_hierarchy_stats', 1800, function () {
            return [
                'total_roles' => Role::count(),
                'system_roles' => Role::where('role_category', 'system')->count(),
                'custom_roles' => Role::where('role_category', 'custom')->count(),
                'roles_by_level' => Role::select('level', DB::raw('count(*) as count'))
                                      ->groupBy('level')
                                      ->orderBy('level')
                                      ->pluck('count', 'level')
                                      ->toArray(),
                'recent_custom_roles' => Role::where('role_category', 'custom')
                                           ->where('created_at', '>', now()->subDays(30))
                                           ->count()
            ];
        });

        return $stats;
    }
}