<?php

namespace App\Policies;

use App\Models\Grade;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class GradePolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any grades.
     */
    public function viewAny(User $user): bool
    {
        // All authenticated users can view grades (filtered by their access level)
        return true;
    }

    /**
     * Determine whether the user can view the grade.
     */
    public function view(User $user, Grade $grade): bool
    {
        // Superadmin can view all grades
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Check if user has access to the grade's institution
        $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);

        return in_array($grade->institution_id, $accessibleInstitutions);
    }

    /**
     * Determine whether the user can create grades.
     */
    public function create(User $user): bool
    {
        return $user->hasAnyRole([
            'superadmin',
            'regionadmin',
            'sektoradmin',
            'schooladmin'
        ]);
    }

    /**
     * Determine whether the user can update the grade.
     */
    public function update(User $user, Grade $grade): bool
    {
        // Superadmin can update all grades
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Check if user has required role
        if (!$user->hasAnyRole(['regionadmin', 'sektoradmin', 'schooladmin'])) {
            return false;
        }

        // Check if user has access to the grade's institution
        $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);

        return in_array($grade->institution_id, $accessibleInstitutions);
    }

    /**
     * Determine whether the user can delete the grade.
     */
    public function delete(User $user, Grade $grade): bool
    {
        // Superadmin can delete all grades
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Check if user has required role
        if (!$user->hasAnyRole(['regionadmin', 'sektoradmin', 'schooladmin'])) {
            return false;
        }

        // Check if user has access to the grade's institution
        $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);

        return in_array($grade->institution_id, $accessibleInstitutions);
    }

    /**
     * Determine whether the user can duplicate the grade.
     */
    public function duplicate(User $user, Grade $grade): bool
    {
        // Same permissions as update
        return $this->update($user, $grade);
    }

    /**
     * Determine whether the user can manage students in the grade.
     */
    public function manageStudents(User $user, Grade $grade): bool
    {
        // Same permissions as update
        return $this->update($user, $grade);
    }

    /**
     * Determine whether the user can manage subjects in the grade.
     */
    public function manageSubjects(User $user, Grade $grade): bool
    {
        // Same permissions as update
        return $this->update($user, $grade);
    }

    /**
     * Get institutions accessible by the user based on their role.
     */
    private function getUserAccessibleInstitutions(User $user): array
    {
        $userInstitutionId = $user->institution_id;

        switch ($user->role) {
            case 'superadmin':
                // Superadmin can access all institutions
                return \App\Models\Institution::pluck('id')->toArray();

            case 'regionadmin':
                // RegionAdmin can access their region and all schools/sektors under it
                $userInstitution = $user->institution;
                if (!$userInstitution) {
                    return [];
                }

                // Get all institutions in the same region (level 3 and 4)
                return \App\Models\Institution::where(function ($query) use ($userInstitutionId, $userInstitution) {
                    $query->where('id', $userInstitutionId)
                          ->orWhere('parent_id', $userInstitutionId)
                          ->orWhere('region_id', $userInstitution->id);
                })->pluck('id')->toArray();

            case 'sektoradmin':
                // SektorAdmin can access their sektor and all schools under it
                return \App\Models\Institution::where(function ($query) use ($userInstitutionId) {
                    $query->where('id', $userInstitutionId)
                          ->orWhere('parent_id', $userInstitutionId);
                })->pluck('id')->toArray();

            case 'schooladmin':
            case 'müavin':
            case 'müəllim':
                // School-level users can only access their own institution
                return [$userInstitutionId];

            default:
                return [];
        }
    }
}
