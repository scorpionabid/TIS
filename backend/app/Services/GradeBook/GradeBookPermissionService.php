<?php

namespace App\Services\GradeBook;

use App\Helpers\DataIsolationHelper;
use App\Models\GradeBookSession;
use App\Models\Institution;
use Illuminate\Support\Facades\Auth;

class GradeBookPermissionService
{
    private function deriveSectorId($institution): ?int
    {
        if (! $institution) {
            return null;
        }
        $level = (int) ($institution->level ?? 0);
        if ($level === 3) {
            return (int) $institution->id;
        }
        if ($level === 4 && $institution->parent_id) {
            return (int) $institution->parent_id;
        }

        return null;
    }

    private function deriveRegionId($institution): ?int
    {
        if (! $institution) {
            return null;
        }
        $level = (int) ($institution->level ?? 0);
        if ($level === 2) {
            return (int) $institution->id;
        }
        if ($institution->parent_id) {
            $parent = Institution::find($institution->parent_id);
            if ($parent && (int) $parent->level === 2) {
                return (int) $parent->id;
            }
            if ($parent && $parent->parent_id) {
                $grand = Institution::find($parent->parent_id);
                if ($grand && (int) $grand->level === 2) {
                    return (int) $grand->id;
                }
            }
        }

        return null;
    }

    private function isRegionInstitution($institution): bool
    {
        return $institution && (int) ($institution->level ?? 0) === 2;
    }

    private function isSectorInstitution($institution): bool
    {
        return $institution && (int) ($institution->level ?? 0) === 3;
    }

    /**
     * Check if user can modify this grade book
     */
    public function canModify(GradeBookSession $gradeBook): bool
    {
        $user = Auth::user();

        if (! $user) {
            return false;
        }

        // Super admin can modify all
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Check if grade book is closed/archived
        if (in_array($gradeBook->status, ['closed', 'archived'])) {
            return false;
        }

        // School admin can modify their institution's grade books
        if ($user->hasRole('schooladmin') && $user->institution_id === $gradeBook->institution_id) {
            return true;
        }

        // Assigned teachers can modify
        if ($gradeBook->assignedTeachers()->where('teacher_id', $user->id)->exists()) {
            return true;
        }

        // Region/sector admins can modify within their hierarchy
        if ($user->hasRole('sektoradmin')) {
            $sectorId = $this->deriveSectorId($user->institution);
            if (! $sectorId) {
                return false;
            }

            if (! $gradeBook->relationLoaded('institution')) {
                $gradeBook->load('institution');
            }
            $inst = $gradeBook->institution;
            if (! $inst) {
                return false;
            }

            return (int) $gradeBook->institution_id === $sectorId
                || (int) $inst->parent_id === $sectorId;
        }

        if ($user->hasRole('regionadmin')) {
            $regionId = $this->deriveRegionId($user->institution);
            if (! $regionId) {
                return false;
            }

            if (! $gradeBook->relationLoaded('institution')) {
                $gradeBook->load('institution');
            }
            $inst = $gradeBook->institution;
            if (! $inst) {
                return false;
            }

            if ((int) $inst->parent_id === $regionId) {
                return true;
            }
            if ($inst->parent_id) {
                $parent = Institution::find($inst->parent_id);
                if ($parent && (int) $parent->parent_id === $regionId) {
                    return true;
                }
            }

            return false;
        }

        return false;
    }

    /**
     * Check if user can view this grade book
     */
    public function canView(GradeBookSession $gradeBook): bool
    {
        $user = Auth::user();

        if (! $user) {
            return false;
        }

        // Super admin can view all
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Load institution relationships if not already loaded
        if (! $gradeBook->relationLoaded('institution')) {
            $gradeBook->load('institution');
        }
        if (! $user->relationLoaded('institution')) {
            $user->load('institution');
        }

        // School admin can view their institution
        if ($user->hasRole('schooladmin') && $user->institution_id === $gradeBook->institution_id) {
            return true;
        }

        // Assigned teachers can view
        if ($gradeBook->assignedTeachers()->where('teacher_id', $user->id)->exists()) {
            return true;
        }

        $userInstitution = $user->institution;
        $gradeBookInstitution = $gradeBook->institution;

        // Sector admins can view schools in their sector (robust to imperfect role/institution attachment)
        if ($user->hasRole('sektoradmin')) {
            $sectorId = $this->deriveSectorId($userInstitution);

            // Also get allowed institution IDs from DataIsolationHelper as fallback
            $allowedIds = DataIsolationHelper::getAllowedInstitutionIds($user);

            // Check 1: Direct institution match using derived sector ID
            if ($sectorId) {
                if ((int) $gradeBook->institution_id === $sectorId) {
                    return true;
                }
                if ($gradeBookInstitution && (int) $gradeBookInstitution->parent_id === $sectorId) {
                    return true;
                }
            }

            // Check 2: Fallback to DataIsolationHelper allowed IDs
            if (! empty($allowedIds)) {
                if (in_array((int) $gradeBook->institution_id, $allowedIds, true)) {
                    return true;
                }
            }

            return false;
        }

        // Region admins can view schools in their region (direct or via sector)
        if ($user->hasRole('regionadmin')) {
            $regionId = $this->deriveRegionId($userInstitution);
            if (! $regionId) {
                return false;
            }
            if (! $gradeBookInstitution) {
                return false;
            }

            if ((int) $gradeBookInstitution->parent_id === $regionId) {
                return true;
            }
            if ($gradeBookInstitution->parent_id) {
                $parent = Institution::find($gradeBookInstitution->parent_id);
                if ($parent && (int) $parent->parent_id === $regionId) {
                    return true;
                }
            }

            return false;
        }

        // Students can view their own grade book
        if ($user->hasRole('student')) {
            return $gradeBook->grade->enrollments()
                ->where('student_id', $user->student_id)
                ->where('enrollment_status', 'active')
                ->exists();
        }

        return false;
    }

    /**
     * Check if user can access hierarchy level
     */
    public function canAccessHierarchy($user, string $level, ?int $regionId, ?int $sectorId, ?int $institutionId): bool
    {
        if (! $user) {
            return false;
        }

        $role = $user->getRoleNames()->first();
        $institution = $user->institution;

        if ($role === 'superadmin') {
            return true;
        }

        if ($level === 'region') {
            if ($role === 'regionadmin') {
                return $institution && $institution->id == ($regionId ?? $institution->id);
            }

            return false;
        }

        if ($level === 'sector') {
            if ($role === 'regionadmin' && $sectorId) {
                $sector = \App\Models\Institution::where('id', $sectorId)
                    ->where('type', 'sector_education_office')
                    ->first();

                return $sector && $institution && $sector->parent_id === $institution->id;
            }
            if ($role === 'sektoradmin') {
                return $institution && $institution->id == ($sectorId ?? $institution->id);
            }

            return false;
        }

        if ($level === 'institution') {
            if (! $institutionId) {
                return false;
            }

            $targetInstitution = \App\Models\Institution::find($institutionId);
            if (! $targetInstitution) {
                return false;
            }

            if ($role === 'regionadmin') {
                return $institution && $targetInstitution->parent_id === $institution->id;
            }
            if ($role === 'sektoradmin') {
                return $institution && $targetInstitution->parent_id === $institution->id;
            }

            return $role === 'schooladmin' && $user->institution_id === $institutionId;
        }

        return false;
    }
}
