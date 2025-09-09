<?php

namespace App\Services;

use App\Models\{{ModelName}};
use App\Services\BaseService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * {{ModelName}}Service - ATİS {{ModelName}} business logic
 * Institution hierarchy və role-based filtering ilə
 */
class {{ModelName}}Service extends BaseService
{
    public function __construct({{ModelName}} $model)
    {
        parent::__construct($model);
    }

    /**
     * User-ın icazələrinə görə {{ModelName}} siyahısını al
     */
    public function getFilteredList(array $filters = []): LengthAwarePaginator
    {
        $query = $this->model->newQuery();

        // Institution hierarchy filtering
        $user = auth()->user();
        if ($user->hasRole(['RegionAdmin', 'RegionOperator'])) {
            $query->whereHas('institution.region', function ($q) use ($user) {
                $q->where('id', $user->institution->region_id);
            });
        } elseif ($user->hasRole(['SektorAdmin', 'SchoolAdmin', 'Teacher'])) {
            $query->where('institution_id', $user->institution_id);
        }

        // Apply filters
        if (isset($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'LIKE', '%' . $filters['search'] . '%')
                  ->orWhere('description', 'LIKE', '%' . $filters['search'] . '%');
            });
        }

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['institution_id'])) {
            $query->where('institution_id', $filters['institution_id']);
        }

        if (isset($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to']);
        }

        return $query->with(['institution', 'createdBy'])
                    ->latest()
                    ->paginate($filters['per_page'] ?? 15);
    }

    /**
     * {{ModelName}} yarat (institution assignment ilə)
     */
    public function createWithInstitution(array $data): {{ModelName}}
    {
        // Avtomatik institution assignment
        if (!isset($data['institution_id'])) {
            $data['institution_id'] = auth()->user()->institution_id;
        }

        // Created by user
        $data['created_by'] = auth()->id();

        // Validation for unique fields
        if (isset($data['code'])) {
            $exists = $this->model->where('code', $data['code'])
                                 ->where('institution_id', $data['institution_id'])
                                 ->exists();
            if ($exists) {
                throw new \Exception('Bu kod artıq istifadə edilib');
            }
        }

        return $this->model->create($data);
    }

    /**
     * {{ModelName}} yenilə (authorization check ilə)
     */
    public function updateWithAuth(int $id, array $data): {{ModelName}}
    {
        ${{modelName}} = $this->findOrFail($id);
        
        // Check if user can edit this item
        $user = auth()->user();
        if (!$user->hasRole('SuperAdmin')) {
            if ($user->hasRole(['RegionAdmin', 'RegionOperator'])) {
                if (${{modelName}}->institution->region_id !== $user->institution->region_id) {
                    throw new \Exception('Bu elementi dəyişmək icazəniz yoxdur');
                }
            } elseif (${{modelName}}->institution_id !== $user->institution_id) {
                throw new \Exception('Bu elementi dəyişmək icazəniz yoxdur');
            }
        }

        $data['updated_by'] = auth()->id();
        ${{modelName}}->update($data);
        
        return ${{modelName}}->fresh();
    }

    /**
     * Bulk status dəyişikliyi
     */
    public function bulkStatusChange(array $ids, string $status): int
    {
        $query = $this->model->whereIn('id', $ids);
        
        // Institution hierarchy check
        $user = auth()->user();
        if (!$user->hasRole('SuperAdmin')) {
            if ($user->hasRole(['RegionAdmin', 'RegionOperator'])) {
                $query->whereHas('institution.region', function ($q) use ($user) {
                    $q->where('id', $user->institution->region_id);
                });
            } else {
                $query->where('institution_id', $user->institution_id);
            }
        }

        return $query->update([
            'status' => $status,
            'updated_by' => auth()->id(),
            'updated_at' => now()
        ]);
    }

    /**
     * Statistics for dashboard
     */
    public function getDashboardStats(): array
    {
        $query = $this->model->newQuery();
        
        // Institution filtering
        $user = auth()->user();
        if (!$user->hasRole('SuperAdmin')) {
            if ($user->hasRole(['RegionAdmin', 'RegionOperator'])) {
                $query->whereHas('institution.region', function ($q) use ($user) {
                    $q->where('id', $user->institution->region_id);
                });
            } else {
                $query->where('institution_id', $user->institution_id);
            }
        }

        $total = $query->count();
        $active = $query->where('status', 'active')->count();
        $thisMonth = $query->whereMonth('created_at', now()->month)->count();
        $lastMonth = $query->whereMonth('created_at', now()->subMonth()->month)->count();

        $growthRate = $lastMonth > 0 ? round((($thisMonth - $lastMonth) / $lastMonth) * 100, 1) : 0;

        return [
            'total' => $total,
            'active' => $active,
            'inactive' => $total - $active,
            'this_month' => $thisMonth,
            'last_month' => $lastMonth,
            'growth_rate' => $growthRate,
        ];
    }

    /**
     * Export data for Excel/CSV
     */
    public function exportData(array $filters = []): Collection
    {
        $query = $this->model->newQuery();
        
        // Apply same filters as getFilteredList
        $user = auth()->user();
        if ($user->hasRole(['RegionAdmin', 'RegionOperator'])) {
            $query->whereHas('institution.region', function ($q) use ($user) {
                $q->where('id', $user->institution->region_id);
            });
        } elseif ($user->hasRole(['SektorAdmin', 'SchoolAdmin', 'Teacher'])) {
            $query->where('institution_id', $user->institution_id);
        }

        if (isset($filters['search'])) {
            $query->where('name', 'LIKE', '%' . $filters['search'] . '%');
        }

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->with(['institution', 'createdBy'])
                    ->orderBy('created_at', 'desc')
                    ->get();
    }

    /**
     * Archive old records
     */
    public function archiveOldRecords(int $monthsOld = 12): int
    {
        return $this->model->where('status', 'inactive')
                          ->where('updated_at', '<', now()->subMonths($monthsOld))
                          ->update(['status' => 'archived']);
    }
}