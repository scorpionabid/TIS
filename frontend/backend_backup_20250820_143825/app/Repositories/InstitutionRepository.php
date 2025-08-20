<?php

namespace App\Repositories;

use App\Models\Institution;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class InstitutionRepository extends BaseRepository
{
    protected array $searchableFields = [
        'name',
        'code',
        'address',
        'contact_email',
        'parent.name'
    ];

    protected array $filterableFields = [
        'search',
        'type',
        'level',
        'parent_id',
        'region_code',
        'is_active',
        'established_from',
        'established_to',
        'sort_by',
        'sort_direction'
    ];

    protected array $defaultRelationships = ['parent', 'children', 'departments'];

    public function __construct(Institution $model)
    {
        parent::__construct($model);
    }

    /**
     * Find institution by code
     */
    public function findByCode(string $code): ?Institution
    {
        return $this->findBy('code', $code);
    }

    /**
     * Get root institutions (no parent)
     */
    public function getRoots(bool $includeInactive = false): Collection
    {
        $query = $this->model->whereNull('parent_id');
        
        if (!$includeInactive) {
            $query->where('is_active', true);
        }
        
        return $query->orderBy('name')->get();
    }

    /**
     * Get children of institution
     */
    public function getChildren(int $parentId, bool $includeInactive = false): Collection
    {
        $query = $this->model->where('parent_id', $parentId);
        
        if (!$includeInactive) {
            $query->where('is_active', true);
        }
        
        return $query->orderBy('name')->get();
    }

    /**
     * Get institution hierarchy tree
     */
    public function getHierarchy(bool $includeInactive = false): Collection
    {
        $cacheKey = $this->getCacheKey("hierarchy_{$includeInactive}");
        
        return $this->getCached($cacheKey, function () use ($includeInactive) {
            $relationships = ['children' => function ($query) use ($includeInactive) {
                $query->with(['children.children.children.children']);
                if (!$includeInactive) {
                    $query->where('is_active', true);
                }
                $query->orderBy('name');
            }];

            $query = $this->model->with($relationships)
                                ->whereNull('parent_id')
                                ->orderBy('name');

            if (!$includeInactive) {
                $query->where('is_active', true);
            }

            return $query->get();
        });
    }

    /**
     * Get institutions by type
     */
    public function getByType(string $type, bool $includeInactive = false): Collection
    {
        $query = $this->model->where('type', $type);
        
        if (!$includeInactive) {
            $query->where('is_active', true);
        }
        
        return $query->orderBy('name')->get();
    }

    /**
     * Get institutions by level
     */
    public function getByLevel(int $level, bool $includeInactive = false): Collection
    {
        $query = $this->model->where('level', $level);
        
        if (!$includeInactive) {
            $query->where('is_active', true);
        }
        
        return $query->orderBy('name')->get();
    }

    /**
     * Get institutions by region code
     */
    public function getByRegionCode(string $regionCode, bool $includeInactive = false): Collection
    {
        $query = $this->model->where('region_code', $regionCode);
        
        if (!$includeInactive) {
            $query->where('is_active', true);
        }
        
        return $query->orderBy('name')->get();
    }

    /**
     * Get all descendants of an institution
     */
    public function getDescendants(int $institutionId): Collection
    {
        $descendants = collect();
        $institution = $this->findWith($institutionId, ['children.children.children.children']);
        
        if ($institution) {
            $this->collectDescendants($institution, $descendants);
        }
        
        return $descendants;
    }

    /**
     * Get all ancestors of an institution
     */
    public function getAncestors(int $institutionId): Collection
    {
        $ancestors = collect();
        $institution = $this->findWith($institutionId, ['parent.parent.parent.parent']);
        
        if ($institution && $institution->parent) {
            $this->collectAncestors($institution->parent, $ancestors);
        }
        
        return $ancestors->reverse()->values();
    }

    /**
     * Get institution path (from root to institution)
     */
    public function getPath(int $institutionId): Collection
    {
        $path = collect();
        $institution = $this->findWith($institutionId, ['parent.parent.parent.parent']);
        
        if ($institution) {
            // Get ancestors first
            $ancestors = $this->getAncestors($institutionId);
            $path = $path->merge($ancestors);
            
            // Add the institution itself
            $path->push($institution);
        }
        
        return $path;
    }

    /**
     * Check if institution has children
     */
    public function hasChildren(int $institutionId): bool
    {
        return $this->model->where('parent_id', $institutionId)->exists();
    }

    /**
     * Check if institution has users
     */
    public function hasUsers(int $institutionId): bool
    {
        return $this->model->find($institutionId)?->users()->exists() ?? false;
    }

    /**
     * Check if institution has tasks
     */
    public function hasTasks(int $institutionId): bool
    {
        $institution = $this->model->find($institutionId);
        
        if (!$institution) {
            return false;
        }
        
        return $institution->assignedTasks()->exists() || 
               $institution->createdTasks()->exists();
    }

    /**
     * Get institutions with user counts
     */
    public function getWithUserCounts(): Collection
    {
        return $this->model->withCount('users')->orderBy('name')->get();
    }

    /**
     * Get institutions with department counts
     */
    public function getWithDepartmentCounts(): Collection
    {
        return $this->model->withCount('departments')->orderBy('name')->get();
    }

    /**
     * Get institutions established in date range
     */
    public function getEstablishedBetween(string $startDate, string $endDate): Collection
    {
        return $this->model->whereBetween('established_date', [$startDate, $endDate])
                          ->orderBy('established_date')
                          ->get();
    }

    /**
     * Get recently created institutions
     */
    public function getRecentlyCreated(int $days = 30): Collection
    {
        return $this->model->where('created_at', '>=', now()->subDays($days))
                          ->orderBy('created_at', 'desc')
                          ->get();
    }

    /**
     * Get institution statistics by type
     */
    public function getStatisticsByType(): array
    {
        $cacheKey = $this->getCacheKey('type_statistics');
        
        return $this->getCached($cacheKey, function () {
            return $this->model->selectRaw('
                type,
                COUNT(*) as total_count,
                SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive_count
            ')
            ->groupBy('type')
            ->orderBy('type')
            ->get()
            ->keyBy('type')
            ->toArray();
        });
    }

    /**
     * Get institution statistics by level
     */
    public function getStatisticsByLevel(): array
    {
        $cacheKey = $this->getCacheKey('level_statistics');
        
        return $this->getCached($cacheKey, function () {
            return $this->model->selectRaw('
                level,
                COUNT(*) as total_count,
                SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_count
            ')
            ->groupBy('level')
            ->orderBy('level')
            ->get()
            ->keyBy('level')
            ->toArray();
        });
    }

    /**
     * Get comprehensive institution statistics
     */
    public function getComprehensiveStatistics(): array
    {
        $cacheKey = $this->getCacheKey('comprehensive_statistics');
        
        return $this->getCached($cacheKey, function () {
            $baseStats = $this->getStatistics();
            $typeStats = $this->getStatisticsByType();
            $levelStats = $this->getStatisticsByLevel();
            
            return array_merge($baseStats, [
                'by_type' => $typeStats,
                'by_level' => $levelStats,
                'with_users' => $this->model->has('users')->count(),
                'without_users' => $this->model->doesntHave('users')->count(),
                'with_departments' => $this->model->has('departments')->count(),
                'without_departments' => $this->model->doesntHave('departments')->count(),
                'root_institutions' => $this->model->whereNull('parent_id')->count(),
                'leaf_institutions' => $this->model->doesntHave('children')->count(),
            ]);
        });
    }

    /**
     * Apply custom filters
     */
    protected function applyCustomFilter(\Illuminate\Database\Eloquent\Builder $query, string $key, $value): void
    {
        switch ($key) {
            case 'type':
                $query->where('type', $value);
                break;

            case 'level':
                $query->where('level', $value);
                break;

            case 'parent_id':
                if ($value === null || $value === 'null') {
                    $query->whereNull('parent_id');
                } else {
                    $query->where('parent_id', $value);
                }
                break;

            case 'region_code':
                $query->where('region_code', $value);
                break;

            case 'established_from':
                $query->whereDate('established_date', '>=', $value);
                break;

            case 'established_to':
                $query->whereDate('established_date', '<=', $value);
                break;

            default:
                parent::applyCustomFilter($query, $key, $value);
                break;
        }
    }

    /**
     * Clear hierarchy cache when institution is created/updated/deleted
     */
    protected function clearModelCache(): void
    {
        parent::clearModelCache();
        
        // Clear specific hierarchy cache keys
        $keys = [
            $this->getCacheKey('hierarchy_true'),
            $this->getCacheKey('hierarchy_false'),
        ];
        
        foreach ($keys as $key) {
            cache()->forget($key);
        }
    }

    /**
     * Helper method to recursively collect descendants
     */
    private function collectDescendants(Institution $institution, Collection $descendants): void
    {
        foreach ($institution->children as $child) {
            $descendants->push($child);
            $this->collectDescendants($child, $descendants);
        }
    }

    /**
     * Helper method to recursively collect ancestors
     */
    private function collectAncestors(Institution $institution, Collection $ancestors): void
    {
        $ancestors->push($institution);
        
        if ($institution->parent) {
            $this->collectAncestors($institution->parent, $ancestors);
        }
    }
}