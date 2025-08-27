<?php

namespace App\Services;

use App\Models\Schedule;
use App\Models\Institution;
use App\Services\BaseService;
use Illuminate\Database\Eloquent\Builder;

class SchedulePermissionService extends BaseService
{
    /**
     * Apply authority-based filtering to schedule queries
     */
    public function applyAuthorityFilter(Builder $query, $user): Builder
    {
        if ($user->hasRole('superadmin')) {
            // SuperAdmin can see all schedules
            return $query;
        }

        if ($user->hasRole('regionadmin')) {
            // RegionAdmin can see schedules from their region
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level == 2) {
                $childInstitutionIds = $userInstitution->getAllChildrenIds();
                return $query->whereIn('institution_id', $childInstitutionIds);
            }
        }

        if ($user->hasRole('sektoradmin')) {
            // SektorAdmin can see schedules from their sector
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level == 3) {
                $childInstitutionIds = $userInstitution->getAllChildrenIds();
                return $query->whereIn('institution_id', $childInstitutionIds);
            }
        }

        if ($user->hasRole('schooladmin') || $user->hasRole('teacher')) {
            // SchoolAdmin and Teachers can only see schedules from their school
            $userInstitution = $user->institution;
            if ($userInstitution) {
                return $query->where('institution_id', $userInstitution->id);
            }
        }

        // Default: no access
        return $query->whereRaw('1 = 0');
    }

    /**
     * Check if user can create schedules
     */
    public function canCreateSchedule($user): bool
    {
        return $user->hasAnyRole(['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin']);
    }

    /**
     * Check if user can view a specific schedule
     */
    public function canViewSchedule(Schedule $schedule, $user): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level == 2) {
                $childInstitutionIds = $userInstitution->getAllChildrenIds();
                return in_array($schedule->institution_id, $childInstitutionIds);
            }
        }

        if ($user->hasRole('sektoradmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level == 3) {
                $childInstitutionIds = $userInstitution->getAllChildrenIds();
                return in_array($schedule->institution_id, $childInstitutionIds);
            }
        }

        if ($user->hasAnyRole(['schooladmin', 'teacher'])) {
            $userInstitution = $user->institution;
            return $userInstitution && $schedule->institution_id == $userInstitution->id;
        }

        return false;
    }

    /**
     * Check if user can edit a specific schedule
     */
    public function canEditSchedule(Schedule $schedule, $user): bool
    {
        // Only allow editing if schedule is not approved and user has proper permissions
        if ($schedule->status === 'approved') {
            return false;
        }

        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level == 2) {
                $childInstitutionIds = $userInstitution->getAllChildrenIds();
                return in_array($schedule->institution_id, $childInstitutionIds);
            }
        }

        if ($user->hasRole('sektoradmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level == 3) {
                $childInstitutionIds = $userInstitution->getAllChildrenIds();
                return in_array($schedule->institution_id, $childInstitutionIds);
            }
        }

        if ($user->hasRole('schooladmin')) {
            $userInstitution = $user->institution;
            return $userInstitution && $schedule->institution_id == $userInstitution->id;
        }

        return false;
    }

    /**
     * Check if user can delete a specific schedule
     */
    public function canDeleteSchedule(Schedule $schedule, $user): bool
    {
        // Cannot delete approved schedules
        if ($schedule->status === 'approved') {
            return false;
        }

        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level == 2) {
                $childInstitutionIds = $userInstitution->getAllChildrenIds();
                return in_array($schedule->institution_id, $childInstitutionIds);
            }
        }

        if ($user->hasRole('sektoradmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level == 3) {
                $childInstitutionIds = $userInstitution->getAllChildrenIds();
                return in_array($schedule->institution_id, $childInstitutionIds);
            }
        }

        if ($user->hasRole('schooladmin')) {
            $userInstitution = $user->institution;
            return $userInstitution && $schedule->institution_id == $userInstitution->id;
        }

        return false;
    }

    /**
     * Check if user can generate schedules
     */
    public function canGenerateSchedule($user, ?int $institutionId = null): bool
    {
        if (!$user->hasAnyRole(['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'])) {
            return false;
        }

        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($institutionId) {
            $institution = Institution::find($institutionId);
            if (!$institution) {
                return false;
            }

            if ($user->hasRole('regionadmin')) {
                $userInstitution = $user->institution;
                if ($userInstitution && $userInstitution->level == 2) {
                    $childInstitutionIds = $userInstitution->getAllChildrenIds();
                    return in_array($institutionId, $childInstitutionIds);
                }
            }

            if ($user->hasRole('sektoradmin')) {
                $userInstitution = $user->institution;
                if ($userInstitution && $userInstitution->level == 3) {
                    $childInstitutionIds = $userInstitution->getAllChildrenIds();
                    return in_array($institutionId, $childInstitutionIds);
                }
            }

            if ($user->hasRole('schooladmin')) {
                $userInstitution = $user->institution;
                return $userInstitution && $institutionId == $userInstitution->id;
            }
        }

        return true; // Allow if no specific institution check needed
    }

    /**
     * Check if user can approve schedules
     */
    public function canApproveSchedule(Schedule $schedule, $user): bool
    {
        // Cannot approve already approved schedules
        if ($schedule->status === 'approved') {
            return false;
        }

        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level == 2) {
                $childInstitutionIds = $userInstitution->getAllChildrenIds();
                return in_array($schedule->institution_id, $childInstitutionIds);
            }
        }

        if ($user->hasRole('sektoradmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level == 3) {
                $childInstitutionIds = $userInstitution->getAllChildrenIds();
                return in_array($schedule->institution_id, $childInstitutionIds);
            }
        }

        // SchoolAdmins cannot approve their own schedules (needs higher authority)
        return false;
    }

    /**
     * Check if user can validate schedules
     */
    public function canValidateSchedule($user, ?int $institutionId = null): bool
    {
        return $this->canGenerateSchedule($user, $institutionId);
    }

    /**
     * Check if user can export schedules
     */
    public function canExportSchedule($user, ?int $institutionId = null): bool
    {
        if (!$user->hasAnyRole(['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'teacher'])) {
            return false;
        }

        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($institutionId) {
            $institution = Institution::find($institutionId);
            if (!$institution) {
                return false;
            }

            if ($user->hasRole('regionadmin')) {
                $userInstitution = $user->institution;
                if ($userInstitution && $userInstitution->level == 2) {
                    $childInstitutionIds = $userInstitution->getAllChildrenIds();
                    return in_array($institutionId, $childInstitutionIds);
                }
            }

            if ($user->hasRole('sektoradmin')) {
                $userInstitution = $user->institution;
                if ($userInstitution && $userInstitution->level == 3) {
                    $childInstitutionIds = $userInstitution->getAllChildrenIds();
                    return in_array($institutionId, $childInstitutionIds);
                }
            }

            if ($user->hasAnyRole(['schooladmin', 'teacher'])) {
                $userInstitution = $user->institution;
                return $userInstitution && $institutionId == $userInstitution->id;
            }
        }

        return true; // Allow if no specific institution check needed
    }

    /**
     * Get institutions accessible by user for schedule operations
     */
    public function getAccessibleInstitutions($user): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::where('level', '>=', 4)->pluck('id')->toArray();
        }

        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level == 2) {
                return $userInstitution->getAllChildrenIds();
            }
        }

        if ($user->hasRole('sektoradmin')) {
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level == 3) {
                return $userInstitution->getAllChildrenIds();
            }
        }

        if ($user->hasAnyRole(['schooladmin', 'teacher'])) {
            $userInstitution = $user->institution;
            return $userInstitution ? [$userInstitution->id] : [];
        }

        return [];
    }

    /**
     * Check if user can access schedule by institution
     */
    public function canAccessInstitution($user, int $institutionId): bool
    {
        $accessibleInstitutions = $this->getAccessibleInstitutions($user);
        return in_array($institutionId, $accessibleInstitutions);
    }

    /**
     * Get permission context for user
     */
    public function getPermissionContext($user): array
    {
        return [
            'can_create' => $this->canCreateSchedule($user),
            'can_generate' => $this->canGenerateSchedule($user),
            'can_export' => $this->canExportSchedule($user),
            'accessible_institutions' => $this->getAccessibleInstitutions($user),
            'user_role' => $user->roles->pluck('name')->toArray(),
            'user_institution' => $user->institution ? [
                'id' => $user->institution->id,
                'name' => $user->institution->name,
                'level' => $user->institution->level
            ] : null
        ];
    }

    /**
     * Validate schedule access permissions
     */
    public function validateScheduleAccess(Schedule $schedule, $user, string $action = 'view'): bool
    {
        switch ($action) {
            case 'view':
                return $this->canViewSchedule($schedule, $user);
            case 'edit':
            case 'update':
                return $this->canEditSchedule($schedule, $user);
            case 'delete':
                return $this->canDeleteSchedule($schedule, $user);
            case 'approve':
                return $this->canApproveSchedule($schedule, $user);
            default:
                return $this->canViewSchedule($schedule, $user);
        }
    }

    /**
     * Check if user can perform bulk operations
     */
    public function canPerformBulkOperations($user): bool
    {
        return $user->hasAnyRole(['superadmin', 'regionadmin', 'sektoradmin']);
    }
}