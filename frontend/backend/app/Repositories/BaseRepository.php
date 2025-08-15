<?php

namespace App\Repositories;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;

abstract class BaseRepository
{
    protected Model $model;
    protected array $searchableFields = [];
    protected array $filterableFields = [];
    protected array $defaultRelationships = [];
    protected int $cacheTtl = 3600; // 1 hour
    protected bool $cacheEnabled = true;

    public function __construct(Model $model)
    {
        $this->model = $model;
    }

    /**
     * Get all records
     */
    public function all(array $columns = ['*']): Collection
    {
        return $this->model->select($columns)->get();
    }

    /**
     * Get all records with relationships
     */
    public function allWith(array $relationships, array $columns = ['*']): Collection
    {
        return $this->model->with($relationships)->select($columns)->get();
    }

    /**
     * Find record by ID
     */
    public function find(int $id, array $columns = ['*']): ?Model
    {
        return $this->model->select($columns)->find($id);
    }

    /**
     * Find record by ID with relationships
     */
    public function findWith(int $id, array $relationships, array $columns = ['*']): ?Model
    {
        return $this->model->with($relationships)->select($columns)->find($id);
    }

    /**
     * Find record by ID or fail
     */
    public function findOrFail(int $id, array $columns = ['*']): Model
    {
        return $this->model->select($columns)->findOrFail($id);
    }

    /**
     * Find record by field
     */
    public function findBy(string $field, $value, array $columns = ['*']): ?Model
    {
        return $this->model->select($columns)->where($field, $value)->first();
    }

    /**
     * Find multiple records by field
     */
    public function findAllBy(string $field, $value, array $columns = ['*']): Collection
    {
        return $this->model->select($columns)->where($field, $value)->get();
    }

    /**
     * Find records where field is in array
     */
    public function findWhereIn(string $field, array $values, array $columns = ['*']): Collection
    {
        return $this->model->select($columns)->whereIn($field, $values)->get();
    }

    /**
     * Create new record
     */
    public function create(array $data): Model
    {
        $model = $this->model->create($data);
        $this->clearModelCache();
        return $model;
    }

    /**
     * Update record
     */
    public function update(int $id, array $data): Model
    {
        $model = $this->findOrFail($id);
        $model->update($data);
        $this->clearModelCache();
        return $model->fresh();
    }

    /**
     * Delete record
     */
    public function delete(int $id): bool
    {
        $model = $this->findOrFail($id);
        $result = $model->delete();
        $this->clearModelCache();
        return $result;
    }

    /**
     * Bulk delete
     */
    public function bulkDelete(array $ids): int
    {
        $count = $this->model->whereIn('id', $ids)->delete();
        $this->clearModelCache();
        return $count;
    }

    /**
     * Bulk update
     */
    public function bulkUpdate(array $ids, array $data): int
    {
        $count = $this->model->whereIn('id', $ids)->update($data);
        $this->clearModelCache();
        return $count;
    }

    /**
     * Get paginated records
     */
    public function paginate(int $perPage = 15, array $columns = ['*']): LengthAwarePaginator
    {
        return $this->model->select($columns)->paginate($perPage);
    }

    /**
     * Get paginated records with relationships
     */
    public function paginateWith(array $relationships, int $perPage = 15, array $columns = ['*']): LengthAwarePaginator
    {
        return $this->model->with($relationships)->select($columns)->paginate($perPage);
    }

    /**
     * Search records
     */
    public function search(string $term, int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->buildSearchQuery($term);
        return $query->paginate($perPage);
    }

    /**
     * Search with filters
     */
    public function searchWithFilters(string $term, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->buildSearchQuery($term);
        $this->applyFilters($query, $filters);
        return $query->paginate($perPage);
    }

    /**
     * Get filtered records
     */
    public function filter(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->newQuery();
        $this->applyFilters($query, $filters);
        return $query->paginate($perPage);
    }

    /**
     * Get filtered records with relationships
     */
    public function filterWith(array $filters, array $relationships, int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->with($relationships);
        $this->applyFilters($query, $filters);
        return $query->paginate($perPage);
    }

    /**
     * Count records
     */
    public function count(): int
    {
        return $this->model->count();
    }

    /**
     * Count records with condition
     */
    public function countWhere(string $field, $value): int
    {
        return $this->model->where($field, $value)->count();
    }

    /**
     * Check if record exists
     */
    public function exists(int $id): bool
    {
        return $this->model->where('id', $id)->exists();
    }

    /**
     * Check if record exists by field
     */
    public function existsBy(string $field, $value): bool
    {
        return $this->model->where($field, $value)->exists();
    }

    /**
     * Get first record
     */
    public function first(array $columns = ['*']): ?Model
    {
        return $this->model->select($columns)->first();
    }

    /**
     * Get last record
     */
    public function latest(string $column = 'created_at', array $columns = ['*']): ?Model
    {
        return $this->model->select($columns)->latest($column)->first();
    }

    /**
     * Get oldest record
     */
    public function oldest(string $column = 'created_at', array $columns = ['*']): ?Model
    {
        return $this->model->select($columns)->oldest($column)->first();
    }

    /**
     * Get records with cache
     */
    public function getCached(string $key, callable $callback, int $ttl = null): mixed
    {
        if (!$this->cacheEnabled) {
            return $callback();
        }

        $ttl = $ttl ?? $this->cacheTtl;
        return Cache::remember($key, $ttl, $callback);
    }

    /**
     * Get model statistics
     */
    public function getStatistics(): array
    {
        $cacheKey = $this->getCacheKey('statistics');
        
        return $this->getCached($cacheKey, function () {
            return [
                'total' => $this->count(),
                'active' => $this->countWhere('is_active', true),
                'inactive' => $this->countWhere('is_active', false),
                'created_today' => $this->model->whereDate('created_at', today())->count(),
                'created_this_week' => $this->model->whereBetween('created_at', [
                    now()->startOfWeek(),
                    now()->endOfWeek()
                ])->count(),
                'created_this_month' => $this->model->whereMonth('created_at', now()->month)
                                                  ->whereYear('created_at', now()->year)
                                                  ->count(),
            ];
        });
    }

    /**
     * Build search query
     */
    protected function buildSearchQuery(string $term): Builder
    {
        $query = $this->model->newQuery();

        if (empty($this->searchableFields)) {
            return $query;
        }

        $query->where(function (Builder $q) use ($term) {
            foreach ($this->searchableFields as $field) {
                if (strpos($field, '.') !== false) {
                    // Handle relationship fields
                    [$relation, $relationField] = explode('.', $field, 2);
                    $q->orWhereHas($relation, function (Builder $relationQuery) use ($relationField, $term) {
                        $relationQuery->where($relationField, 'ILIKE', "%{$term}%");
                    });
                } else {
                    $q->orWhere($field, 'ILIKE', "%{$term}%");
                }
            }
        });

        return $query;
    }

    /**
     * Apply filters to query
     */
    protected function applyFilters(Builder $query, array $filters): void
    {
        foreach ($filters as $key => $value) {
            if (!in_array($key, $this->filterableFields) || $value === null || $value === '') {
                continue;
            }

            switch ($key) {
                case 'search':
                    if (!empty($this->searchableFields)) {
                        $searchQuery = $this->buildSearchQuery($value);
                        $query->mergeConstraintsFrom($searchQuery);
                    }
                    break;

                case 'is_active':
                    $query->where('is_active', $value);
                    break;

                case 'created_from':
                    $query->whereDate('created_at', '>=', $value);
                    break;

                case 'created_to':
                    $query->whereDate('created_at', '<=', $value);
                    break;

                case 'updated_from':
                    $query->whereDate('updated_at', '>=', $value);
                    break;

                case 'updated_to':
                    $query->whereDate('updated_at', '<=', $value);
                    break;

                case 'sort_by':
                    $direction = $filters['sort_direction'] ?? 'asc';
                    $query->orderBy($value, $direction);
                    break;

                case 'sort_direction':
                    // Handled in sort_by case
                    break;

                default:
                    $this->applyCustomFilter($query, $key, $value);
                    break;
            }
        }

        // Apply default sorting if no sort specified
        if (!isset($filters['sort_by'])) {
            $query->latest();
        }
    }

    /**
     * Apply custom filters - override in child classes
     */
    protected function applyCustomFilter(Builder $query, string $key, $value): void
    {
        // Default implementation - can be overridden in child classes
        if ($this->model->getConnection()->getSchemaBuilder()->hasColumn($this->model->getTable(), $key)) {
            if (is_array($value)) {
                $query->whereIn($key, $value);
            } else {
                $query->where($key, $value);
            }
        }
    }

    /**
     * Get cache key for model
     */
    protected function getCacheKey(string $suffix = ''): string
    {
        $modelName = strtolower(class_basename($this->model));
        return $suffix ? "{$modelName}_{$suffix}" : $modelName;
    }

    /**
     * Clear model cache
     */
    protected function clearModelCache(): void
    {
        if (!$this->cacheEnabled) {
            return;
        }

        $modelName = strtolower(class_basename($this->model));
        $keys = [
            "{$modelName}_statistics",
            "{$modelName}_all",
            "{$modelName}_active",
            "{$modelName}_hierarchy"
        ];

        foreach ($keys as $key) {
            Cache::forget($key);
        }

        // Clear pattern-based cache keys
        Cache::flush(); // This is aggressive - you might want to implement tag-based caching
    }

    /**
     * Get query builder
     */
    public function query(): Builder
    {
        return $this->model->newQuery();
    }

    /**
     * Get model instance
     */
    public function getModel(): Model
    {
        return $this->model;
    }

    /**
     * Set model instance
     */
    public function setModel(Model $model): self
    {
        $this->model = $model;
        return $this;
    }

    /**
     * Enable/disable caching
     */
    public function setCacheEnabled(bool $enabled): self
    {
        $this->cacheEnabled = $enabled;
        return $this;
    }

    /**
     * Set cache TTL
     */
    public function setCacheTtl(int $ttl): self
    {
        $this->cacheTtl = $ttl;
        return $this;
    }
}