<?php

namespace App\Services\Attendance;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Applies role-based institution filtering to a query builder.
 *
 * Used by SchoolAttendance* services that work with school-level data.
 * The $column parameter accommodates models that use different FK names
 * (e.g. 'school_id' on SchoolAttendance vs 'institution_id' on ClassBulkAttendance).
 */
class SchoolAttendanceScopeFilter
{
    private const SCHOOL_TYPES = [
        'secondary_school',
        'lyceum',
        'gymnasium',
        'vocational_school',
    ];

    /**
     * Narrow $query to rows the $user is allowed to see.
     *
     * @param Builder|\Illuminate\Database\Query\Builder $query
     */
    public function apply(mixed $query, User $user, string $column = 'school_id'): void
    {
        $role = $user->roles->first()?->name;

        switch ($role) {
            case 'superadmin':
                // No restriction — sees everything.
                break;

            case 'regionadmin':
                $query->whereIn($column, $this->regionSchoolIds($user));
                break;

            case 'sektoradmin':
                $query->whereIn($column, $this->sectorSchoolIds($user));
                break;

            case 'schooladmin':
            case 'məktəbadmin':
            case 'müəllim':
                $query->where($column, $user->institution_id);
                break;

            default:
                // Unknown role → force empty result set.
                $query->where($column, -1);
                break;
        }
    }

    /**
     * Collect all school IDs visible to a region admin.
     */
    private function regionSchoolIds(User $user): \Illuminate\Support\Collection
    {
        $regionInstitutions = Institution::where(function ($q) use ($user) {
            $q->where('id', $user->institution_id)
                ->orWhere('parent_id', $user->institution_id);
        })->pluck('id');

        $schoolInstitutions = Institution::whereIn('parent_id', $regionInstitutions)
            ->whereIn('type', self::SCHOOL_TYPES)
            ->pluck('id');

        return $regionInstitutions->merge($schoolInstitutions)
            ->filter(fn ($id) => Institution::where('id', $id)
                ->whereIn('type', self::SCHOOL_TYPES)
                ->exists());
    }

    /**
     * Collect all school IDs visible to a sector admin.
     */
    private function sectorSchoolIds(User $user): \Illuminate\Support\Collection
    {
        return Institution::where('parent_id', $user->institution_id)
            ->whereIn('type', self::SCHOOL_TYPES)
            ->pluck('id');
    }
}
