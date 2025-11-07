<?php

namespace App\Services\Survey\Domains\Query;

use App\Models\Survey;
use App\Models\Institution;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;

/**
 * Survey Query Builder Service
 *
 * Handles all survey query building, filtering, sorting, and pagination.
 * Includes hierarchical access control and visibility filtering.
 */
class SurveyQueryBuilder
{
    /**
     * Get paginated surveys list with filtering
     *
     * @param array $params
     * @return LengthAwarePaginator
     */
    public function getPaginatedList(array $params): LengthAwarePaginator
    {
        $query = Survey::with(['creator.profile'])->withCount(['questions']);

        // Apply filters
        $this->applyFilters($query, $params);

        // Apply hierarchical filtering
        $this->applySurveyVisibilityFiltering($query, auth()->user());

        // Apply search
        if (!empty($params['search'])) {
            $query->searchByTitle($params['search']);
        }

        // Apply sorting
        $this->applySorting($query, $params);

        return $query->paginate($params['per_page'] ?? 15);
    }

    /**
     * Apply filters to query
     *
     * @param Builder $query
     * @param array $params
     * @return void
     */
    public function applyFilters($query, array $params): void
    {
        if (!empty($params['status'])) {
            $query->byStatus($params['status']);
        }

        if (!empty($params['survey_type'])) {
            $query->byType($params['survey_type']);
        }

        if (!empty($params['creator_id'])) {
            $query->createdBy($params['creator_id']);
        }

        if (!empty($params['institution_id'])) {
            $query->forInstitution($params['institution_id']);
        }

        if (!empty($params['start_date'])) {
            $query->where('start_date', '>=', $params['start_date']);
        }

        if (!empty($params['end_date'])) {
            $query->where('end_date', '<=', $params['end_date']);
        }

        // Filter for surveys user can respond to
        if (!empty($params['my_surveys'])) {
            $userInstitutionId = Auth::user()->institution_id;
            if ($userInstitutionId) {
                $query->forInstitution($userInstitutionId);
            }
        }

        // Date range filters
        if (!empty($params['created_from'])) {
            $query->whereDate('created_at', '>=', $params['created_from']);
        }
        if (!empty($params['created_to'])) {
            $query->whereDate('created_at', '<=', $params['created_to']);
        }
    }

    /**
     * Apply sorting to query
     *
     * @param Builder $query
     * @param array $params
     * @return void
     */
    public function applySorting($query, array $params): void
    {
        $sortBy = $params['sort_by'] ?? 'created_at';
        $sortDirection = $params['sort_direction'] ?? 'desc';

        $allowedSorts = ['title', 'status', 'created_at', 'published_at', 'start_date', 'end_date'];

        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDirection);
        } else {
            $query->orderBy('created_at', 'desc');
        }
    }

    /**
     * Get hierarchical institution IDs for user
     *
     * Returns array of institution IDs user has access to based on role.
     *
     * @param mixed $user
     * @return array
     */
    public function getHierarchicalInstitutionIds($user): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }

        if ($user->hasRole('regionadmin')) {
            $userRegionId = $user->institution_id;
            return Institution::where(function($query) use ($userRegionId) {
                $query->where('id', $userRegionId)
                      ->orWhere('parent_id', $userRegionId)
                      ->orWhereHas('parent', function($q) use ($userRegionId) {
                          $q->where('parent_id', $userRegionId);
                      });
            })->pluck('id')->toArray();
        }

        if ($user->hasRole('sektoradmin')) {
            $userSectorId = $user->institution_id;
            return Institution::where(function($query) use ($userSectorId) {
                $query->where('id', $userSectorId)
                      ->orWhere('parent_id', $userSectorId);
            })->pluck('id')->toArray();
        }

        // SchoolAdmin and other roles see only their own institution
        return [$user->institution_id];
    }

    /**
     * Apply hierarchical access control to survey query
     *
     * @param Builder $query
     * @param mixed $user
     * @return void
     */
    public function applyHierarchicalFiltering($query, $user): void
    {
        if ($user->hasRole('superadmin')) {
            return; // SuperAdmin sees all
        }

        $allowedInstitutionIds = $this->getHierarchicalInstitutionIds($user);

        $query->whereHas('creator', function($q) use ($allowedInstitutionIds) {
            $q->whereIn('institution_id', $allowedInstitutionIds);
        });
    }

    /**
     * Apply survey visibility filtering
     *
     * Users see surveys they created OR surveys targeted to them.
     *
     * @param Builder $query
     * @param mixed $user
     * @return void
     */
    public function applySurveyVisibilityFiltering($query, $user): void
    {
        if ($user->hasRole('superadmin')) {
            return; // SuperAdmin sees all
        }

        $userInstitutionId = $user->institution_id;
        $allowedInstitutionIds = $this->getHierarchicalInstitutionIds($user);

        $query->where(function($q) use ($allowedInstitutionIds, $userInstitutionId) {
            // See surveys created by users from allowed institutions (hierarchy)
            $q->whereHas('creator', function($creatorQuery) use ($allowedInstitutionIds) {
                $creatorQuery->whereIn('institution_id', $allowedInstitutionIds);
            })
            // OR see surveys targeted to this user's institution or hierarchy
            ->orWhere(function($targetQuery) use ($userInstitutionId, $allowedInstitutionIds) {
                $targetQuery->where(function($q1) use ($userInstitutionId) {
                    // Surveys targeted to user's own institution
                    $q1->whereJsonContains('target_institutions', $userInstitutionId);
                })->orWhere(function($q2) use ($allowedInstitutionIds) {
                    // Surveys targeted to any institution in user's hierarchy
                    foreach ($allowedInstitutionIds as $instId) {
                        $q2->orWhereJsonContains('target_institutions', $instId);
                    }
                });
            });
        });
    }
}
