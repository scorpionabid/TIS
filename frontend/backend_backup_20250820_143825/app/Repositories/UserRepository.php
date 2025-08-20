<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class UserRepository extends BaseRepository
{
    protected array $searchableFields = [
        'username',
        'email',
        'profile.first_name',
        'profile.last_name',
        'institution.name'
    ];

    protected array $filterableFields = [
        'search',
        'role_id',
        'institution_id',
        'department_id',
        'is_active',
        'email_verified_at',
        'created_from',
        'created_to',
        'last_login_from',
        'last_login_to',
        'sort_by',
        'sort_direction'
    ];

    protected array $defaultRelationships = ['role', 'institution', 'profile'];

    public function __construct(User $model)
    {
        parent::__construct($model);
    }

    /**
     * Find user by username
     */
    public function findByUsername(string $username): ?User
    {
        return $this->findBy('username', $username);
    }

    /**
     * Find user by email
     */
    public function findByEmail(string $email): ?User
    {
        return $this->findBy('email', $email);
    }

    /**
     * Get users by role
     */
    public function getByRole(string $roleName, array $filters = []): Collection
    {
        $query = $this->model->whereHas('role', function ($q) use ($roleName) {
            $q->where('name', $roleName);
        });

        $this->applyFilters($query, $filters);

        return $query->get();
    }

    /**
     * Get users by role paginated
     */
    public function getByRolePaginated(string $roleName, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->with($this->defaultRelationships)
                            ->whereHas('role', function ($q) use ($roleName) {
                                $q->where('name', $roleName);
                            });

        $this->applyFilters($query, $filters);

        return $query->paginate($perPage);
    }

    /**
     * Get users by institution
     */
    public function getByInstitution(int $institutionId, array $filters = []): Collection
    {
        $query = $this->model->where('institution_id', $institutionId);
        $this->applyFilters($query, $filters);
        return $query->get();
    }

    /**
     * Get users by multiple institutions
     */
    public function getByInstitutions(array $institutionIds, array $filters = []): Collection
    {
        $query = $this->model->whereIn('institution_id', $institutionIds);
        $this->applyFilters($query, $filters);
        return $query->get();
    }

    /**
     * Get active users
     */
    public function getActive(array $filters = []): Collection
    {
        $query = $this->model->where('is_active', true);
        $this->applyFilters($query, $filters);
        return $query->get();
    }

    /**
     * Get inactive users
     */
    public function getInactive(array $filters = []): Collection
    {
        $query = $this->model->where('is_active', false);
        $this->applyFilters($query, $filters);
        return $query->get();
    }

    /**
     * Get users with unverified email
     */
    public function getUnverifiedEmail(): Collection
    {
        return $this->model->whereNull('email_verified_at')->get();
    }

    /**
     * Get users who logged in recently
     */
    public function getRecentlyLoggedIn(int $days = 7): Collection
    {
        return $this->model->where('last_login_at', '>=', now()->subDays($days))->get();
    }

    /**
     * Get users who haven't logged in for a while
     */
    public function getInactiveLogins(int $days = 30): Collection
    {
        return $this->model->where('last_login_at', '<=', now()->subDays($days))
                          ->orWhereNull('last_login_at')
                          ->get();
    }

    /**
     * Get locked users
     */
    public function getLockedUsers(): Collection
    {
        return $this->model->whereNotNull('locked_until')
                          ->where('locked_until', '>', now())
                          ->get();
    }

    /**
     * Get users with failed login attempts
     */
    public function getUsersWithFailedAttempts(int $minAttempts = 3): Collection
    {
        return $this->model->where('failed_login_attempts', '>=', $minAttempts)->get();
    }

    /**
     * Get user statistics by role
     */
    public function getStatisticsByRole(): array
    {
        $cacheKey = $this->getCacheKey('role_statistics');
        
        return $this->getCached($cacheKey, function () {
            return $this->model->selectRaw('
                roles.name as role_name,
                roles.display_name as role_display_name,
                COUNT(*) as total_count,
                SUM(CASE WHEN users.is_active = true THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN users.is_active = false THEN 1 ELSE 0 END) as inactive_count,
                SUM(CASE WHEN users.last_login_at >= ? THEN 1 ELSE 0 END) as recently_active_count
            ', [now()->subDays(7)])
            ->join('roles', 'users.role_id', '=', 'roles.id')
            ->groupBy('roles.id', 'roles.name', 'roles.display_name')
            ->orderBy('roles.level')
            ->get()
            ->toArray();
        });
    }

    /**
     * Get user statistics by institution
     */
    public function getStatisticsByInstitution(): array
    {
        $cacheKey = $this->getCacheKey('institution_statistics');
        
        return $this->getCached($cacheKey, function () {
            return $this->model->selectRaw('
                institutions.name as institution_name,
                institutions.type as institution_type,
                COUNT(*) as total_count,
                SUM(CASE WHEN users.is_active = true THEN 1 ELSE 0 END) as active_count
            ')
            ->join('institutions', 'users.institution_id', '=', 'institutions.id')
            ->groupBy('institutions.id', 'institutions.name', 'institutions.type')
            ->orderBy('institutions.name')
            ->get()
            ->toArray();
        });
    }

    /**
     * Get user activity statistics
     */
    public function getActivityStatistics(): array
    {
        $cacheKey = $this->getCacheKey('activity_statistics');
        
        return $this->getCached($cacheKey, function () {
            return [
                'total_users' => $this->count(),
                'active_users' => $this->countWhere('is_active', true),
                'inactive_users' => $this->countWhere('is_active', false),
                'verified_emails' => $this->model->whereNotNull('email_verified_at')->count(),
                'unverified_emails' => $this->model->whereNull('email_verified_at')->count(),
                'locked_users' => $this->model->whereNotNull('locked_until')
                                                ->where('locked_until', '>', now())
                                                ->count(),
                'users_with_failed_attempts' => $this->model->where('failed_login_attempts', '>', 0)->count(),
                'recently_logged_in' => $this->model->where('last_login_at', '>=', now()->subDays(7))->count(),
                'never_logged_in' => $this->model->whereNull('last_login_at')->count(),
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
     * Search users with advanced options
     */
    public function advancedSearch(array $criteria, int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->with($this->defaultRelationships);

        // Text search
        if (!empty($criteria['search'])) {
            $searchQuery = $this->buildSearchQuery($criteria['search']);
            $query->mergeConstraintsFrom($searchQuery);
        }

        // Role filter
        if (!empty($criteria['roles'])) {
            $query->whereHas('role', function ($q) use ($criteria) {
                $q->whereIn('name', (array) $criteria['roles']);
            });
        }

        // Institution filter
        if (!empty($criteria['institutions'])) {
            $query->whereIn('institution_id', (array) $criteria['institutions']);
        }

        // Department filter
        if (!empty($criteria['departments'])) {
            $query->whereIn('department_id', (array) $criteria['departments']);
        }

        // Status filter
        if (isset($criteria['is_active'])) {
            $query->where('is_active', $criteria['is_active']);
        }

        // Email verification filter
        if (isset($criteria['email_verified'])) {
            if ($criteria['email_verified']) {
                $query->whereNotNull('email_verified_at');
            } else {
                $query->whereNull('email_verified_at');
            }
        }

        // Date range filters
        if (!empty($criteria['created_from'])) {
            $query->whereDate('created_at', '>=', $criteria['created_from']);
        }
        if (!empty($criteria['created_to'])) {
            $query->whereDate('created_at', '<=', $criteria['created_to']);
        }

        // Last login filters
        if (!empty($criteria['last_login_from'])) {
            $query->whereDate('last_login_at', '>=', $criteria['last_login_from']);
        }
        if (!empty($criteria['last_login_to'])) {
            $query->whereDate('last_login_at', '<=', $criteria['last_login_to']);
        }

        // Sorting
        if (!empty($criteria['sort_by'])) {
            $direction = $criteria['sort_direction'] ?? 'asc';
            $query->orderBy($criteria['sort_by'], $direction);
        } else {
            $query->latest();
        }

        return $query->paginate($perPage);
    }

    /**
     * Apply custom filters
     */
    protected function applyCustomFilter(\Illuminate\Database\Eloquent\Builder $query, string $key, $value): void
    {
        switch ($key) {
            case 'role_id':
                $query->where('role_id', $value);
                break;

            case 'institution_id':
                $query->where('institution_id', $value);
                break;

            case 'department_id':
                $query->where('department_id', $value);
                break;

            case 'email_verified_at':
                if ($value) {
                    $query->whereNotNull('email_verified_at');
                } else {
                    $query->whereNull('email_verified_at');
                }
                break;

            case 'last_login_from':
                $query->whereDate('last_login_at', '>=', $value);
                break;

            case 'last_login_to':
                $query->whereDate('last_login_at', '<=', $value);
                break;

            default:
                parent::applyCustomFilter($query, $key, $value);
                break;
        }
    }
}