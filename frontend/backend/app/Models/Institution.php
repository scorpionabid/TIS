<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Institution extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'name',
        'short_name',
        'type',
        'parent_id',
        'level',
        'region_code',
        'institution_code',
        'contact_info',
        'location',
        'metadata',
        'is_active',
        'established_date',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'contact_info' => 'array',
            'location' => 'array',
            'metadata' => 'array',
            'is_active' => 'boolean',
            'established_date' => 'date',
        ];
    }

    /**
     * Get all children institution IDs (for task management)
     */
    public function getAllChildrenIds(): array
    {
        $childrenIds = [];
        
        // Include current institution
        $childrenIds[] = $this->id;
        
        // Get direct children
        $directChildren = $this->children()->pluck('id')->toArray();
        $childrenIds = array_merge($childrenIds, $directChildren);
        
        // Recursively get children of children
        foreach ($directChildren as $childId) {
            $child = Institution::find($childId);
            if ($child) {
                $grandChildren = $child->getAllChildrenIds();
                $childrenIds = array_merge($childrenIds, $grandChildren);
            }
        }
        
        return array_unique($childrenIds);
    }

    /**
     * Get the parent institution.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Institution::class, 'parent_id');
    }

    /**
     * Get the child institutions.
     */
    public function children(): HasMany
    {
        return $this->hasMany(Institution::class, 'parent_id');
    }

    /**
     * Get all descendant institutions recursively.
     */
    public function descendants(): HasMany
    {
        return $this->children()->with('descendants');
    }

    /**
     * Get the users belonging to this institution.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get the departments of this institution.
     */
    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    /**
     * Get the institution type relationship.
     */
    public function institutionType(): BelongsTo
    {
        return $this->belongsTo(InstitutionType::class, 'type', 'key');
    }

    /**
     * Get the rooms of this institution.
     */
    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }

    /**
     * Get the grades of this institution.
     */
    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    /**
     * Get the survey responses from this institution.
     */
    public function surveyResponses(): HasMany
    {
        return $this->hasMany(SurveyResponse::class);
    }

    /**
     * Get the region if this is a region-type institution.
     */
    public function region(): HasOne
    {
        return $this->hasOne(Region::class);
    }

    /**
     * Get the sector if this is a sector-type institution.
     */
    public function sector(): HasOne
    {
        return $this->hasOne(Sector::class);
    }

    /**
     * Get the statistics for this institution.
     */
    public function statistics(): HasMany
    {
        return $this->hasMany(Statistic::class);
    }

    /**
     * Get the indicator values for this institution.
     */
    public function indicatorValues(): HasMany
    {
        return $this->hasMany(IndicatorValue::class);
    }

    /**
     * Get the audit logs for this institution.
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(InstitutionAuditLog::class);
    }

    /**
     * Check if this institution is a parent of another institution.
     */
    public function isParentOf(Institution $institution): bool
    {
        return $institution->parent_id === $this->id;
    }

    /**
     * Check if this institution is a child of another institution.
     */
    public function isChildOf(Institution $institution): bool
    {
        return $this->parent_id === $institution->id;
    }

    /**
     * Get all ancestors of this institution.
     */
    public function getAncestors(): \Illuminate\Support\Collection
    {
        $ancestors = collect();
        $current = $this->parent;
        
        while ($current) {
            $ancestors->push($current);
            $current = $current->parent;
        }
        
        return $ancestors;
    }

    /**
     * Get the hierarchy path as string.
     */
    public function getHierarchyPathAttribute(): string
    {
        $ancestors = $this->getAncestors()->reverse();
        $path = $ancestors->pluck('name')->toArray();
        $path[] = $this->name;
        
        return implode(' > ', $path);
    }

    /**
     * Scope to get active institutions.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get institutions by type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to get institutions by level.
     */
    public function scopeByLevel($query, int $level)
    {
        return $query->where('level', $level);
    }

    /**
     * Scope to get institutions by region code.
     */
    public function scopeByRegionCode($query, string $regionCode)
    {
        return $query->where('region_code', $regionCode);
    }

    /**
     * Scope to get root institutions (no parent).
     */
    public function scopeRoots($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Scope to search by name.
     */
    public function scopeSearchByName($query, string $search)
    {
        $driver = config('database.default');
        $connection = config("database.connections.{$driver}.driver");
        
        if ($connection === 'sqlite') {
            // SQLite case-insensitive search using LIKE with UPPER/LOWER functions
            return $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('short_name', 'LIKE', "%{$search}%");
            });
        } else {
            // PostgreSQL/MySQL supports ILIKE for case-insensitive search
            return $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('short_name', 'ILIKE', "%{$search}%");
            });
        }
    }

    /**
     * Get valid parent types for this institution based on its type
     */
    public function getValidParentTypes(): array
    {
        return $this->institutionType?->allowed_parent_types ?? [];
    }

    /**
     * Check if this institution can have the given parent type
     */
    public function canHaveParentType(string $parentTypeKey): bool
    {
        return in_array($parentTypeKey, $this->getValidParentTypes());
    }

    /**
     * Get the display type label
     */
    public function getTypeLabel(): string
    {
        return $this->institutionType?->getDisplayLabel() ?? $this->type;
    }
}