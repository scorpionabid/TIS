<?php

namespace App\Traits;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

trait ResolvesRegionalContext
{
    /**
     * Resolve the primary institution (Region) for the authenticated user.
     * Supports both RegionAdmin (level 2) and SuperAdmin (global).
     *
     * @throws \Exception
     */
    protected function resolvePrimaryInstitution(): ?Institution
    {
        $user = Auth::user();

        if (! $user) {
            throw new \Exception('İstifadəçi tapılmadı');
        }

        $region = $user->institution;

        // SuperAdmin can act on behalf of any region - default to first region
        if ($user->hasRole('superadmin')) {
            if (! $region) {
                $region = Institution::where('level', 2)->first();
            }

            if (! $region) {
                throw new \Exception('Sistemdə heç bir region tapılmadı');
            }

            return $region;
        }

        // RegionAdmin must have a level 2 institution
        if (! $region || $region->level !== 2) {
            throw new \Exception('İstifadəçi regional admini deyil və ya müəssisə regional ofis deyil');
        }

        return $region;
    }

    /**
     * Check if user has specific teacher-related permission.
     * Supports multi-guard environments.
     */
    protected function hasTeacherPermission(string $permission): bool
    {
        $user = Auth::user();

        if (! $user) {
            return false;
        }

        // RegionAdmins and SuperAdmins usually have broad access
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Standard Spatie permission check
        if ($user->can($permission)) {
            return true;
        }

        // Manual fallback for complex guard scenarios (as seen in original controller)
        $roleIds = \DB::table('model_has_roles')
            ->where('model_type', User::class)
            ->where('model_id', $user->id)
            ->pluck('role_id');

        if ($roleIds->isEmpty()) {
            return false;
        }

        return \DB::table('role_has_permissions')
            ->whereIn('role_id', $roleIds)
            ->whereIn('permission_id', function ($query) use ($permission) {
                $query->select('id')
                    ->from('permissions')
                    ->where('name', $permission);
            })
            ->exists();
    }
}
