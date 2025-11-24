<?php

namespace App\Http\Traits;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

trait HasAuthorization
{
    /**
     * Check if current user has required role(s)
     */
    protected function requireRole(string|array $roles): JsonResponse|bool
    {
        $user = Auth::user();

        if (! $user->hasRole($roles)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyatı yerinə yetirmək səlahiyyətiniz yoxdur.',
            ], 403);
        }

        return true;
    }

    /**
     * Check if current user has required permission(s)
     */
    protected function requirePermission(string|array $permissions): JsonResponse|bool
    {
        $user = Auth::user();

        if (! $user->hasPermissionTo($permissions)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyatı yerinə yetirmək səlahiyyətiniz yoxdur.',
            ], 403);
        }

        return true;
    }

    /**
     * Check if user can access specific institution
     */
    protected function canAccessInstitution(int $institutionId, ?User $user = null): bool
    {
        $user = $user ?? Auth::user();

        // SuperAdmin can access all institutions
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // RegionAdmin can access institutions in their region
        if ($user->hasRole('regionadmin')) {
            $userInstitutions = $this->getUserInstitutionScope($user);

            return in_array($institutionId, $userInstitutions);
        }

        // SektorAdmin can access institutions in their sector
        if ($user->hasRole('sektoradmin')) {
            $userInstitutions = $this->getUserInstitutionScope($user);

            return in_array($institutionId, $userInstitutions);
        }

        // SchoolAdmin and others can only access their own institution
        return $user->institution_id === $institutionId;
    }

    /**
     * Get user's accessible institution IDs based on role
     */
    protected function getUserInstitutionScope(?User $user = null): array
    {
        $user = $user ?? Auth::user();

        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }

        if (! $user->institution_id) {
            return [];
        }

        $institution = Institution::find($user->institution_id);
        if (! $institution) {
            return [];
        }

        if ($user->hasRole(['regionadmin', 'regionoperator'])) {
            // Get all institutions in the region (including sectors and schools)
            return $institution->getAllDescendantIds();
        }

        if ($user->hasRole(['sektoradmin', 'sektoroperator'])) {
            // Get all schools in the sector
            return $institution->getAllDescendantIds();
        }

        // Default: only user's own institution
        return [$user->institution_id];
    }

    /**
     * Filter query by user's institution scope
     */
    protected function scopeByUserInstitutions($query, string $institutionColumn = 'institution_id', ?User $user = null)
    {
        $user = $user ?? Auth::user();

        // SuperAdmin can see all
        if ($user->hasRole('superadmin')) {
            return $query;
        }

        $accessibleInstitutions = $this->getUserInstitutionScope($user);

        return $query->whereIn($institutionColumn, $accessibleInstitutions);
    }

    /**
     * Check if user owns resource
     */
    protected function isResourceOwner($resource, string $ownerField = 'user_id', ?User $user = null): bool
    {
        $user = $user ?? Auth::user();

        return $resource->{$ownerField} === $user->id;
    }

    /**
     * Check if user can manage another user
     */
    protected function canManageUser(User $targetUser, ?User $currentUser = null): bool
    {
        $currentUser = $currentUser ?? Auth::user();

        // SuperAdmin can manage all users
        if ($currentUser->hasRole('superadmin')) {
            return true;
        }

        // Users cannot manage users with higher or equal roles
        if (! $this->hasHigherRole($currentUser, $targetUser)) {
            return false;
        }

        // Check institution hierarchy
        return $this->canAccessInstitution($targetUser->institution_id, $currentUser);
    }

    /**
     * Check if first user has higher role than second user
     */
    protected function hasHigherRole(User $user1, User $user2): bool
    {
        $roleHierarchy = [
            'superadmin' => 10,
            'regionadmin' => 8,
            'regionoperator' => 7,
            'sektoradmin' => 6,
            'sektoroperator' => 5,
            'schooladmin' => 4,
            'müəllim' => 3,
            'psixoloq' => 2,
            'muavin' => 1,
        ];

        $user1Role = $user1->roles->first()?->name;
        $user2Role = $user2->roles->first()?->name;

        $user1Level = $roleHierarchy[$user1Role] ?? 0;
        $user2Level = $roleHierarchy[$user2Role] ?? 0;

        return $user1Level > $user2Level;
    }

    /**
     * Authorize or fail with JSON response
     */
    protected function authorizeOrFail(bool $condition, string $message = 'Səlahiyyətiniz yoxdur.'): JsonResponse|bool
    {
        if (! $condition) {
            return response()->json([
                'success' => false,
                'message' => $message,
            ], 403);
        }

        return true;
    }

    /**
     * Check multiple authorization conditions
     */
    protected function authorizeMultiple(array $conditions): JsonResponse|bool
    {
        foreach ($conditions as $condition => $message) {
            if (! $condition) {
                return response()->json([
                    'success' => false,
                    'message' => $message,
                ], 403);
            }
        }

        return true;
    }

    /**
     * Get authorization error response
     */
    protected function unauthorizedResponse(string $message = 'Səlahiyyətiniz yoxdur.'): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], 403);
    }

    /**
     * Check if user can perform CRUD operations on resource type
     */
    protected function canPerformCrud(string $resourceType, string $operation, ?User $user = null): bool
    {
        $user = $user ?? Auth::user();

        $permission = "{$operation}_{$resourceType}";

        return $user->hasPermissionTo($permission);
    }
}
