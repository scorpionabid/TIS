<?php

namespace App\Services;

use App\Models\Grade;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class ClassPermissionService extends BaseService
{
    /**
     * Apply regional data access filtering to class query
     */
    public function applyRegionalFiltering(Builder $query, User $user): void
    {
        if ($user->hasRole('superadmin')) {
            return; // SuperAdmin can see all classes
        }

        if ($user->hasRole('regionadmin')) {
            // RegionAdmin can see classes in their regional institutions
            $query->whereHas('institution', function ($q) use ($user) {
                $q->where('parent_id', $user->institution_id)
                  ->orWhere('id', $user->institution_id);
            });
        } elseif ($user->hasRole('sektoradmin')) {
            // SektorAdmin can see classes in their sector schools
            $query->whereHas('institution', function ($q) use ($user) {
                $q->where('parent_id', $user->institution_id)
                  ->orWhere('id', $user->institution_id);
            });
        } elseif ($user->hasRole(['məktəbadmin', 'müəllim', 'müavin'])) {
            // School staff can only see classes in their school
            $query->where('institution_id', $user->institution_id);
        }
    }

    /**
     * Check if user can access specific class data
     */
    public function canAccessClass(User $user, Grade $class): bool
    {
        // SuperAdmin can access all classes
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // RegionAdmin can access classes in their region
        if ($user->hasRole('regionadmin')) {
            return $class->institution && 
                   ($class->institution->parent_id === $user->institution_id || 
                    $class->institution_id === $user->institution_id);
        }

        // SektorAdmin can access classes in their sector
        if ($user->hasRole('sektoradmin')) {
            return $class->institution && 
                   ($class->institution->parent_id === $user->institution_id || 
                    $class->institution_id === $user->institution_id);
        }

        // School staff can access classes in their school
        if ($user->hasRole(['məktəbadmin', 'müəllim', 'müavin'])) {
            return $class->institution_id === $user->institution_id;
        }

        return false;
    }

    /**
     * Check if user can create classes
     */
    public function canCreateClass(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin']);
    }

    /**
     * Check if user can modify class
     */
    public function canModifyClass(User $user, Grade $class): bool
    {
        if (!$this->canAccessClass($user, $class)) {
            return false;
        }

        // Teachers and assistants can only view, not modify
        if ($user->hasRole(['müəllim', 'müavin'])) {
            return false;
        }

        return true;
    }

    /**
     * Check if user can delete/deactivate class
     */
    public function canDeleteClass(User $user, Grade $class): bool
    {
        if (!$this->canAccessClass($user, $class)) {
            return false;
        }

        // Only admins can delete classes
        return $user->hasAnyRole(['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin']);
    }

    /**
     * Check if user can assign homeroom teacher to class
     */
    public function canAssignTeacher(User $user, Grade $class): bool
    {
        if (!$this->canAccessClass($user, $class)) {
            return false;
        }

        // Only admins can assign teachers
        return $user->hasAnyRole(['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin']);
    }

    /**
     * Get accessible institutions for user (for class creation)
     */
    public function getAccessibleInstitutions(User $user): array
    {
        if ($user->hasRole('superadmin')) {
            // SuperAdmin can create classes in any institution
            return \App\Models\Institution::where('is_active', true)
                ->select('id', 'name', 'code', 'type')
                ->orderBy('name')
                ->get()
                ->toArray();
        }

        if ($user->hasRole('regionadmin')) {
            // RegionAdmin can create classes in their regional institutions
            return \App\Models\Institution::where(function ($q) use ($user) {
                $q->where('parent_id', $user->institution_id)
                  ->orWhere('id', $user->institution_id);
            })
                ->where('is_active', true)
                ->select('id', 'name', 'code', 'type')
                ->orderBy('name')
                ->get()
                ->toArray();
        }

        if ($user->hasRole('sektoradmin')) {
            // SektorAdmin can create classes in their sector schools
            return \App\Models\Institution::where(function ($q) use ($user) {
                $q->where('parent_id', $user->institution_id)
                  ->orWhere('id', $user->institution_id);
            })
                ->where('is_active', true)
                ->select('id', 'name', 'code', 'type')
                ->orderBy('name')
                ->get()
                ->toArray();
        }

        if ($user->hasRole(['məktəbadmin'])) {
            // School admin can create classes only in their school
            return \App\Models\Institution::where('id', $user->institution_id)
                ->where('is_active', true)
                ->select('id', 'name', 'code', 'type')
                ->get()
                ->toArray();
        }

        return [];
    }

    /**
     * Get accessible teachers for user (for homeroom teacher assignment)
     */
    public function getAccessibleTeachers(User $user): array
    {
        if ($user->hasRole('superadmin')) {
            // SuperAdmin can assign any teacher
            return User::whereHas('roles', function ($q) {
                $q->whereIn('name', ['müəllim', 'müavin']);
            })
                ->where('is_active', true)
                ->with('profile')
                ->select('id', 'username', 'email')
                ->orderBy('username')
                ->get()
                ->map(function ($teacher) {
                    return [
                        'id' => $teacher->id,
                        'username' => $teacher->username,
                        'email' => $teacher->email,
                        'full_name' => $teacher->profile 
                            ? "{$teacher->profile->first_name} {$teacher->profile->last_name}"
                            : $teacher->username,
                    ];
                })
                ->toArray();
        }

        if ($user->hasRole(['regionadmin', 'sektoradmin'])) {
            // Regional/Sector admin can assign teachers in their institutions
            return User::whereHas('roles', function ($q) {
                $q->whereIn('name', ['müəllim', 'müavin']);
            })
                ->whereHas('institution', function ($q) use ($user) {
                    $q->where('parent_id', $user->institution_id)
                      ->orWhere('id', $user->institution_id);
                })
                ->where('is_active', true)
                ->with('profile')
                ->select('id', 'username', 'email')
                ->orderBy('username')
                ->get()
                ->map(function ($teacher) {
                    return [
                        'id' => $teacher->id,
                        'username' => $teacher->username,
                        'email' => $teacher->email,
                        'full_name' => $teacher->profile 
                            ? "{$teacher->profile->first_name} {$teacher->profile->last_name}"
                            : $teacher->username,
                    ];
                })
                ->toArray();
        }

        if ($user->hasRole(['məktəbadmin'])) {
            // School admin can assign teachers in their school
            return User::whereHas('roles', function ($q) {
                $q->whereIn('name', ['müəllim', 'müavin']);
            })
                ->where('institution_id', $user->institution_id)
                ->where('is_active', true)
                ->with('profile')
                ->select('id', 'username', 'email')
                ->orderBy('username')
                ->get()
                ->map(function ($teacher) {
                    return [
                        'id' => $teacher->id,
                        'username' => $teacher->username,
                        'email' => $teacher->email,
                        'full_name' => $teacher->profile 
                            ? "{$teacher->profile->first_name} {$teacher->profile->last_name}"
                            : $teacher->username,
                    ];
                })
                ->toArray();
        }

        return [];
    }

    /**
     * Get user's permission context for classes
     */
    public function getPermissionContext(User $user): array
    {
        return [
            'can_create_classes' => $this->canCreateClass($user),
            'can_view_all_classes' => $user->hasRole('superadmin'),
            'can_manage_regional_classes' => $user->hasRole(['regionadmin', 'sektoradmin']),
            'can_manage_school_classes' => $user->hasRole(['məktəbadmin']),
            'is_teacher_only' => $user->hasRole(['müəllim', 'müavin']),
            'accessible_institutions' => $this->getAccessibleInstitutions($user),
            'accessible_teachers' => $this->getAccessibleTeachers($user),
        ];
    }
}