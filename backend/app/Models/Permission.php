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
        $scope = $this->getScopeAttribute();

        return match ($scope) {
            'global' => 'Global',
            'system' => 'Sistem',
            'regional' => 'Regional',
            'sector' => 'Sektor',
            'institution' => 'Məktəb',
            'classroom' => 'Sinif',
            default => ucfirst($scope),
        };
    }

    /**
     * Get permission scope based on name.
     */
    public function getScopeAttribute(): string
    {
        if (str_contains($this->name, 'system')) {
            return 'system';
        }
        if (str_contains($this->name, 'reports') || str_contains($this->name, 'analytics')) {
            return 'global';
        }
        if (str_contains($this->name, 'institutions') || str_contains($this->name, 'institution-types')) {
            return 'regional';
        }
        if (str_contains($this->name, 'users') && str_contains($this->name, 'manage')) {
            return 'sector';
        }
        if (str_contains($this->name, 'surveys') || str_contains($this->name, 'tasks') || str_contains($this->name, 'documents')) {
            return 'institution';
        }

        return 'classroom';
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
