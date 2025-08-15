<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class Department extends Model
{
    use HasFactory;

    /**
     * Department types based on PRD requirements
     */
    const TYPES = [
        // Regional Administration Departments
        'maliyyə' => 'Maliyyə Şöbəsi',
        'inzibati' => 'İnzibati Şöbəsi', 
        'təsərrüfat' => 'Təsərrüfat Şöbəsi',
        
        // School-level Departments
        'müavin' => 'Müavin Şöbəsi',
        'ubr' => 'UBR Şöbəsi',
        'psixoloq' => 'Psixoloji Dəstək Şöbəsi',
        'müəllim' => 'Fənn Müəllimləri Şöbəsi',
        
        // General/Other
        'general' => 'Ümumi Şöbə',
        'other' => 'Digər'
    ];

    /**
     * Department type groups by institution level
     */
    const TYPE_GROUPS = [
        'regional' => ['maliyyə', 'inzibati', 'təsərrüfat', 'general', 'other'],
        'sector' => ['maliyyə', 'inzibati', 'təsərrüfat', 'general', 'other'],
        'school' => ['müavin', 'ubr', 'təsərrüfat', 'psixoloq', 'müəllim', 'general', 'other'],
        'general' => ['general', 'other']
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'name',
        'short_name',
        'department_type',
        'institution_id',
        'parent_department_id',
        'description',
        'metadata',
        'capacity',
        'budget_allocation',
        'functional_scope',
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
            'metadata' => 'array',
            'budget_allocation' => 'decimal:2',
        ];
    }

    /**
     * Get the institution that owns this department.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the parent department.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'parent_department_id');
    }

    /**
     * Get the child departments.
     */
    public function children(): HasMany
    {
        return $this->hasMany(Department::class, 'parent_department_id');
    }

    /**
     * Get all descendant departments recursively.
     */
    public function descendants(): HasMany
    {
        return $this->children()->with('descendants');
    }

    /**
     * Get the survey responses from this department.
     */
    public function surveyResponses(): HasMany
    {
        return $this->hasMany(SurveyResponse::class);
    }

    /**
     * Scope to get active departments.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get departments by institution.
     */
    public function scopeByInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    /**
     * Scope to get root departments (no parent).
     */
    public function scopeRoots($query)
    {
        return $query->whereNull('parent_department_id');
    }

    /**
     * Scope to search by name.
     */
    public function scopeSearchByName($query, string $search)
    {
        return $query->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('short_name', 'LIKE', "%{$search}%");
    }

    /**
     * Scope to filter by department type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('department_type', $type);
    }

    /**
     * Get department type display name.
     */
    public function getTypeDisplayName(): string
    {
        return self::TYPES[$this->department_type] ?? $this->department_type;
    }

    /**
     * Get allowed department types for institution level.
     */
    public static function getAllowedTypesForInstitution(string $institutionType): array
    {
        $typeMapping = [
            'region' => self::TYPE_GROUPS['regional'],
            'sektor' => self::TYPE_GROUPS['sector'], 
            'school' => self::TYPE_GROUPS['school'],
            'vocational' => self::TYPE_GROUPS['school'],
            'university' => self::TYPE_GROUPS['school']
        ];

        return $typeMapping[$institutionType] ?? self::TYPE_GROUPS['general'];
    }

    /**
     * Check if department type is valid for institution.
     */
    public function isValidForInstitution(): bool
    {
        if (!$this->institution) {
            return false;
        }

        $allowedTypes = self::getAllowedTypesForInstitution($this->institution->type);
        return in_array($this->department_type, $allowedTypes);
    }

    /**
     * Get users assigned to this department.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Scope: Departments accessible by user with regional filtering
     */
    public function scopeAccessibleBy(Builder $query, User $user): Builder
    {
        $userRole = $user->roles->first()?->name;
        
        return $query->where(function ($q) use ($user, $userRole) {
            // SuperAdmin can see all departments
            if ($userRole === 'superadmin') {
                return; // No restrictions
            }
            
            // Apply regional filtering based on user role
            $this->applyRegionalDepartmentFiltering($q, $user, $userRole);
        });
    }

    /**
     * Apply regional filtering for departments based on user role
     */
    private function applyRegionalDepartmentFiltering($query, User $user, $userRole)
    {
        $userInstitutionId = $user->institution_id;
        
        switch ($userRole) {
            case 'regionadmin':
            case 'regionoperator':
                // Regional admins can see departments in their region and sub-institutions
                $this->applyRegionAdminDepartmentFiltering($query, $user, $userInstitutionId);
                break;
                
            case 'sektoradmin':
                // Sector admins can see departments in their sector and schools
                $this->applySektorAdminDepartmentFiltering($query, $user, $userInstitutionId);
                break;
                
            case 'məktəbadmin':
            case 'müəllim':
                // School-level users can only see departments in their institution
                $this->applySchoolDepartmentFiltering($query, $user, $userInstitutionId);
                break;
                
            default:
                // Unknown role - very restricted access
                $query->where('institution_id', $userInstitutionId);
                break;
        }
    }

    /**
     * Apply RegionAdmin department filtering
     */
    private function applyRegionAdminDepartmentFiltering($query, User $user, $userRegionId)
    {
        // Get all institutions in the region
        $regionInstitutions = Institution::where(function($q) use ($userRegionId) {
            $q->where('id', $userRegionId) // The region itself
              ->orWhere('parent_id', $userRegionId); // Sectors
        })->pluck('id');

        $schoolInstitutions = Institution::whereIn('parent_id', $regionInstitutions)->pluck('id');
        $allRegionalInstitutions = $regionInstitutions->merge($schoolInstitutions);

        $query->whereIn('institution_id', $allRegionalInstitutions);
    }

    /**
     * Apply SektorAdmin department filtering
     */
    private function applySektorAdminDepartmentFiltering($query, User $user, $userSektorId)
    {
        $sektorSchools = Institution::where('parent_id', $userSektorId)->pluck('id');
        $allSektorInstitutions = $sektorSchools->push($userSektorId);

        $query->whereIn('institution_id', $allSektorInstitutions);
    }

    /**
     * Apply School-level department filtering
     */
    private function applySchoolDepartmentFiltering($query, User $user, $userInstitutionId)
    {
        $query->where('institution_id', $userInstitutionId);
    }
}