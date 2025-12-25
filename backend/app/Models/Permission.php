<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permission extends Model
{
    use HasFactory;

    /**
     * The model's default values for attributes.
     *
     * @var array
     */
    protected $attributes = [
        'is_active' => true,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'name',
        'display_name',
        'description',
        'guard_name',
        'category',
        'department',
        'resource',
        'action',
        'scope',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Boot the model and auto-populate category, resource, action.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($permission) {
            // Auto-populate category, resource, action if not set
            if (! $permission->category || ! $permission->resource || ! $permission->action) {
                $parsed = self::parsePermissionName($permission->name);

                if (! $permission->category) {
                    $permission->category = $parsed['category'];
                }
                if (! $permission->resource) {
                    $permission->resource = $parsed['resource'];
                }
                if (! $permission->action) {
                    $permission->action = $parsed['action'];
                }
            }
        });

        static::updating(function ($permission) {
            // Auto-populate on update if changed
            if ($permission->isDirty('name') && (! $permission->category || ! $permission->resource || ! $permission->action)) {
                $parsed = self::parsePermissionName($permission->name);

                if (! $permission->category) {
                    $permission->category = $parsed['category'];
                }
                if (! $permission->resource) {
                    $permission->resource = $parsed['resource'];
                }
                if (! $permission->action) {
                    $permission->action = $parsed['action'];
                }
            }
        });
    }

    /**
     * The roles that belong to this permission.
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'permission_role');
    }

    /**
     * Scope to get active permissions.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get permissions by category.
     */
    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope to get permissions by department.
     */
    public function scopeByDepartment($query, string $department)
    {
        return $query->where('department', $department);
    }

    /**
     * Scope to get permissions by resource.
     */
    public function scopeByResource($query, string $resource)
    {
        return $query->where('resource', $resource);
    }

    /**
     * Scope to get permissions by action.
     */
    public function scopeByAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Get the number of roles affected by this permission.
     */
    public function getAffectedRolesCount(): int
    {
        return \Illuminate\Support\Facades\DB::table('permission_role')
            ->where('permission_id', $this->id)
            ->count();
    }

    /**
     * Get the number of users affected by this permission.
     */
    public function getAffectedUsersCount(): int
    {
        // Direct permission assignments
        $directUsers = \Illuminate\Support\Facades\DB::table('model_has_permissions')
            ->where('permission_id', $this->id)
            ->count();

        // Users through roles
        $roleUserIds = \Illuminate\Support\Facades\DB::table('permission_role')
            ->join('model_has_roles', 'permission_role.role_id', '=', 'model_has_roles.role_id')
            ->where('permission_role.permission_id', $this->id)
            ->distinct('model_has_roles.model_id')
            ->pluck('model_has_roles.model_id');

        return $directUsers + $roleUserIds->count();
    }

    /**
     * Get category label (translated).
     */
    public function getCategoryLabel(): string
    {
        if (! $this->category) {
            return 'Digər';
        }

        return match ($this->category) {
            'users' => 'İstifadəçi İdarəetməsi',
            'institutions' => 'Müəssisə İdarəetməsi',
            'surveys' => 'Sorğular',
            'roles' => 'Rol İdarəetməsi',
            'academic' => 'Akademik',
            'documents' => 'Sənədlər',
            'tasks' => 'Tapşırıqlar',
            'assessments' => 'Qiymətləndirmələr',
            'students' => 'Şagirdlər',
            'classes' => 'Siniflər',
            'subjects' => 'Fənlər',
            'approvals' => 'Təsdiqləmələr',
            'rooms' => 'Otaqlar',
            'events' => 'Tədbirlər',
            'psychology' => 'Psixologiya',
            'inventory' => 'İnventar',
            'teachers' => 'Müəllimlər',
            'departments' => 'Departamentlər',
            'system' => 'Sistem',
            'reports' => 'Hesabatlar',
            default => ucfirst($this->category),
        };
    }

    /**
     * Get scope label (translated).
     */
    public function getScopeLabel(): string
    {
        return match ($this->scope) {
            'global' => 'Global',
            'system' => 'Sistem',
            'regional' => 'Regional',
            'sector' => 'Sektor',
            'institution' => 'Məktəb',
            'classroom' => 'Sinif',
            default => 'Məktəb', // Default fallback
        };
    }

    /**
     * Scope query to filter by scope.
     */
    public function scopeByScope($query, string $scope)
    {
        return $query->where('scope', $scope);
    }

    /**
     * Check if permission is global scope (SuperAdmin only).
     */
    public function isGlobalScope(): bool
    {
        return $this->scope === 'global';
    }

    /**
     * Check if permission is system scope.
     */
    public function isSystemScope(): bool
    {
        return $this->scope === 'system';
    }

    /**
     * Check if permission is regional scope.
     */
    public function isRegionalScope(): bool
    {
        return $this->scope === 'regional';
    }

    /**
     * Check if permission is allowed for a given role level.
     *
     * @param int $roleLevel Role hierarchy level (1-10)
     * @return bool
     */
    public function isAllowedForLevel(int $roleLevel): bool
    {
        $scopeLevelMap = [
            'global' => 1,      // Only SuperAdmin (Level 1)
            'system' => 2,      // SuperAdmin + RegionAdmin (Level 1-2)
            'regional' => 4,    // Up to SektorAdmin (Level 1-4)
            'sector' => 6,      // Up to school staff (Level 1-6)
            'institution' => 8, // Up to SchoolAdmin (Level 1-8)
            'classroom' => 10,  // All roles (Level 1-10)
        ];

        $maxAllowedLevel = $scopeLevelMap[$this->scope] ?? 10;

        return $roleLevel <= $maxAllowedLevel;
    }

    /**
     * Get minimum role level required for this permission.
     */
    public function getMinimumRoleLevel(): int
    {
        return match ($this->scope) {
            'global' => 1,
            'system' => 1,
            'regional' => 1,
            'sector' => 1,
            'institution' => 1,
            'classroom' => 1,
            default => 1,
        };
    }

    /**
     * Get maximum role level allowed for this permission.
     */
    public function getMaximumRoleLevel(): int
    {
        return match ($this->scope) {
            'global' => 1,      // Only level 1
            'system' => 2,      // Up to level 2
            'regional' => 4,    // Up to level 4
            'sector' => 6,      // Up to level 6
            'institution' => 8, // Up to level 8
            'classroom' => 10,  // All levels
            default => 10,
        };
    }

    /**
     * Check if permission is used by any role or user.
     */
    public function isUsed(): bool
    {
        $rolesCount = \Illuminate\Support\Facades\DB::table('permission_role')
            ->where('permission_id', $this->id)
            ->count();

        $usersCount = \Illuminate\Support\Facades\DB::table('model_has_permissions')
            ->where('permission_id', $this->id)
            ->count();

        return $rolesCount > 0 || $usersCount > 0;
    }

    /**
     * Parse permission name to extract resource, action, and category.
     */
    private static function parsePermissionName(string $permissionName): array
    {
        $result = [
            'resource' => null,
            'action' => null,
            'category' => null,
        ];

        // Handle space-separated format (e.g., "create teacher_performance")
        if (str_contains($permissionName, ' ')) {
            $parts = explode(' ', $permissionName, 2);
            $result['action'] = $parts[0];
            $result['resource'] = $parts[1] ?? null;
            $result['category'] = self::getCategoryFromResource($parts[1] ?? '');

            return $result;
        }

        // Handle dot-separated format (e.g., "users.create")
        if (str_contains($permissionName, '.')) {
            $parts = explode('.', $permissionName, 2);
            $result['resource'] = $parts[0];
            $result['action'] = $parts[1] ?? null;
            $result['category'] = self::getCategoryFromResource($parts[0]);

            return $result;
        }

        // Single word permission
        $result['resource'] = $permissionName;
        $result['category'] = self::getCategoryFromResource($permissionName);

        return $result;
    }

    /**
     * Determine category from resource name.
     */
    private static function getCategoryFromResource(string $resource): string
    {
        $categoryMap = [
            'users' => 'users',
            'institutions' => 'institutions',
            'surveys' => 'surveys',
            'survey_responses' => 'surveys',
            'roles' => 'roles',
            'departments' => 'departments',
            'assessments' => 'assessments',
            'assessment-types' => 'assessments',
            'students' => 'students',
            'classes' => 'classes',
            'subjects' => 'subjects',
            'approvals' => 'approvals',
            'rooms' => 'rooms',
            'events' => 'events',
            'psychology' => 'psychology',
            'inventory' => 'inventory',
            'teachers' => 'teachers',
            'teacher_performance' => 'teachers',
            'teaching_loads' => 'teachers',
            'teaching-loads' => 'teachers',
            'tasks' => 'tasks',
            'documents' => 'documents',
            'links' => 'documents',
            'reports' => 'reports',
            'analytics' => 'reports',
            'institution-types' => 'institutions',
            'preschools' => 'institutions',
            'attendance' => 'academic',
            'grades' => 'academic',
            'schedules' => 'academic',
            'system' => 'system',
        ];

        return $categoryMap[$resource] ?? 'other';
    }
}
