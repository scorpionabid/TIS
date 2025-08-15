<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

abstract class BaseService
{
    protected string $modelClass;
    protected array $searchableFields = [];
    protected array $filterableFields = [];
    protected array $relationships = [];

    /**
     * Get model instance
     */
    protected function getModel(): Model
    {
        return app($this->modelClass);
    }

    /**
     * Get query builder with relationships
     */
    protected function getQuery(): Builder
    {
        return $this->getModel()
                   ->newQuery()
                   ->with($this->relationships);
    }

    /**
     * Get all records with optional filters
     */
    public function getAll(array $filters = [], array $relationships = []): \Illuminate\Database\Eloquent\Collection
    {
        $query = $this->getQuery();
        
        if (!empty($relationships)) {
            $query->with($relationships);
        }

        $this->applyFilters($query, $filters);
        
        return $query->get();
    }

    /**
     * Get paginated records
     */
    public function getPaginated(array $filters = [], int $perPage = 15, array $relationships = [])
    {
        $query = $this->getQuery();
        
        if (!empty($relationships)) {
            $query->with($relationships);
        }

        $this->applyFilters($query, $filters);
        
        return $query->paginate($perPage);
    }

    /**
     * Find record by ID
     */
    public function findById(int $id, array $relationships = []): ?Model
    {
        $query = $this->getQuery();
        
        if (!empty($relationships)) {
            $query->with($relationships);
        }

        return $query->find($id);
    }

    /**
     * Find record by ID or fail
     */
    public function findByIdOrFail(int $id, array $relationships = []): Model
    {
        $query = $this->getQuery();
        
        if (!empty($relationships)) {
            $query->with($relationships);
        }

        return $query->findOrFail($id);
    }

    /**
     * Create new record
     */
    public function create(array $data): Model
    {
        DB::beginTransaction();
        
        try {
            $model = $this->getModel()->create($data);
            
            $this->afterCreate($model, $data);
            
            DB::commit();
            
            return $model->fresh($this->relationships);
        } catch (Exception $e) {
            DB::rollback();
            
            Log::error('Error creating ' . class_basename($this->modelClass), [
                'data' => $data,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }

    /**
     * Update existing record
     */
    public function update(int $id, array $data): Model
    {
        DB::beginTransaction();
        
        try {
            $model = $this->findByIdOrFail($id);
            $originalData = $model->toArray();
            
            $model->update($data);
            
            $this->afterUpdate($model, $data, $originalData);
            
            DB::commit();
            
            return $model->fresh($this->relationships);
        } catch (Exception $e) {
            DB::rollback();
            
            Log::error('Error updating ' . class_basename($this->modelClass), [
                'id' => $id,
                'data' => $data,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }

    /**
     * Delete record
     */
    public function delete(int $id): bool
    {
        DB::beginTransaction();
        
        try {
            $model = $this->findByIdOrFail($id);
            $modelData = $model->toArray();
            
            $this->beforeDelete($model);
            
            $result = $model->delete();
            
            $this->afterDelete($modelData);
            
            DB::commit();
            
            return $result;
        } catch (Exception $e) {
            DB::rollback();
            
            Log::error('Error deleting ' . class_basename($this->modelClass), [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }

    /**
     * Bulk operations
     */
    public function bulkUpdate(array $ids, array $data): int
    {
        DB::beginTransaction();
        
        try {
            $count = $this->getModel()
                         ->whereIn('id', $ids)
                         ->update($data);
            
            $this->afterBulkUpdate($ids, $data);
            
            DB::commit();
            
            return $count;
        } catch (Exception $e) {
            DB::rollback();
            
            Log::error('Error bulk updating ' . class_basename($this->modelClass), [
                'ids' => $ids,
                'data' => $data,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }

    /**
     * Bulk delete
     */
    public function bulkDelete(array $ids): int
    {
        DB::beginTransaction();
        
        try {
            $models = $this->getModel()->whereIn('id', $ids)->get();
            
            foreach ($models as $model) {
                $this->beforeDelete($model);
            }
            
            $count = $this->getModel()->whereIn('id', $ids)->delete();
            
            $this->afterBulkDelete($ids);
            
            DB::commit();
            
            return $count;
        } catch (Exception $e) {
            DB::rollback();
            
            Log::error('Error bulk deleting ' . class_basename($this->modelClass), [
                'ids' => $ids,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }

    /**
     * Search records
     */
    public function search(string $term, array $filters = [], int $perPage = 15)
    {
        $query = $this->getQuery();
        
        if (!empty($this->searchableFields)) {
            $query->where(function ($q) use ($term) {
                foreach ($this->searchableFields as $field) {
                    if (strpos($field, '.') !== false) {
                        // Handle relationship fields
                        [$relation, $relationField] = explode('.', $field, 2);
                        $q->orWhereHas($relation, function ($rq) use ($relationField, $term) {
                            $rq->where($relationField, 'ILIKE', "%{$term}%");
                        });
                    } else {
                        $q->orWhere($field, 'ILIKE', "%{$term}%");
                    }
                }
            });
        }
        
        $this->applyFilters($query, $filters);
        
        return $query->paginate($perPage);
    }

    /**
     * Get statistics
     */
    public function getStatistics(): array
    {
        $model = $this->getModel();
        
        return [
            'total_count' => $model->count(),
            'active_count' => $model->where('is_active', true)->count(),
            'inactive_count' => $model->where('is_active', false)->count(),
            'created_today' => $model->whereDate('created_at', today())->count(),
            'created_this_week' => $model->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            'created_this_month' => $model->whereMonth('created_at', now()->month)->count(),
        ];
    }

    /**
     * Apply filters to query
     */
    protected function applyFilters(Builder $query, array $filters): void
    {
        foreach ($filters as $key => $value) {
            if (!in_array($key, $this->filterableFields) || $value === null) {
                continue;
            }

            switch ($key) {
                case 'search':
                    if (!empty($this->searchableFields)) {
                        $query->where(function ($q) use ($value) {
                            foreach ($this->searchableFields as $field) {
                                if (strpos($field, '.') !== false) {
                                    [$relation, $relationField] = explode('.', $field, 2);
                                    $q->orWhereHas($relation, function ($rq) use ($relationField, $value) {
                                        $rq->where($relationField, 'ILIKE', "%{$value}%");
                                    });
                                } else {
                                    $q->orWhere($field, 'ILIKE', "%{$value}%");
                                }
                            }
                        });
                    }
                    break;

                case 'sort_by':
                    $direction = $filters['sort_direction'] ?? 'asc';
                    $query->orderBy($value, $direction);
                    break;

                case 'sort_direction':
                    // Handled in sort_by case
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

                default:
                    // Handle custom filters in child classes
                    $this->applyCustomFilter($query, $key, $value);
                    break;
            }
        }
    }

    /**
     * Apply custom filters - to be overridden in child classes
     */
    protected function applyCustomFilter(Builder $query, string $key, $value): void
    {
        // Default implementation - override in child classes
    }

    /**
     * Hook methods - to be overridden in child classes
     */
    protected function afterCreate(Model $model, array $data): void
    {
        // Override in child classes if needed
    }

    protected function afterUpdate(Model $model, array $data, array $originalData): void
    {
        // Override in child classes if needed
    }

    protected function beforeDelete(Model $model): void
    {
        // Override in child classes if needed
    }

    protected function afterDelete(array $modelData): void
    {
        // Override in child classes if needed
    }

    protected function afterBulkUpdate(array $ids, array $data): void
    {
        // Override in child classes if needed
    }

    protected function afterBulkDelete(array $ids): void
    {
        // Override in child classes if needed
    }
}