<?php

namespace App\Policies;

use App\Models\Grade;
use App\Models\User;
use App\Services\InstitutionAccessService;
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
        $accessibleInstitutions = InstitutionAccessService::getAccessibleInstitutions($user);

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
        $accessibleInstitutions = InstitutionAccessService::getAccessibleInstitutions($user);

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
        $accessibleInstitutions = InstitutionAccessService::getAccessibleInstitutions($user);

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

}
