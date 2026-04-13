<?php

namespace App\Http\Controllers\LinkShare\Concerns;

use App\Models\LinkShare;
use Illuminate\Support\Facades\Log;

trait HandlesLinkShareHelpers
{
    /**
     * Send link share notification to target users
     */
    protected function sendLinkShareNotification($linkShare, array $shareData, $user, string $action = 'shared'): void
    {
        try {
            $targetUserIds = [];

            $targetInstitutions = $shareData['target_institutions'] ?? $linkShare['target_institutions'] ?? [];
            if (is_string($targetInstitutions)) {
                $decoded = json_decode($targetInstitutions, true);
                $targetInstitutions = is_array($decoded) ? $decoded : [];
            }

            if (! empty($targetInstitutions)) {
                $targetRoles = $shareData['target_roles']
                    ?? $linkShare['target_roles']
                    ?? config('notification_roles.resource_notification_roles', [
                        'sektoradmin', 'schooladmin', 'məktəbadmin', 'müəllim', 'teacher',
                    ]);

                $targetUserIds = \App\Services\InstitutionNotificationHelper::expandInstitutionsToUsers(
                    $targetInstitutions,
                    $targetRoles
                );
            }

            $directUsers = $shareData['target_users'] ?? $linkShare['target_users'] ?? [];
            if (! empty($directUsers)) {
                $targetUserIds = array_merge($targetUserIds, $directUsers);
            }

            $targetUserIds = array_values(array_unique(array_filter($targetUserIds)));

            if (! empty($targetUserIds)) {
                $notificationData = [
                    'creator_name' => $user->name,
                    'creator_institution' => $user->institution?->name ?? 'N/A',
                    'link_title' => $linkShare['title'] ?? 'Yeni Bağlantı',
                    'link_url' => $linkShare['url'] ?? '',
                    'link_type' => $shareData['link_type'] ?? $linkShare['link_type'] ?? 'external',
                    'description' => $shareData['description'] ?? $linkShare['description'] ?? '',
                    'share_scope' => $shareData['share_scope'] ?? $linkShare['share_scope'] ?? 'institutional',
                    'expires_at' => optional($linkShare->expires_at)->format('d.m.Y H:i'),
                    'action_url' => "/links/{$linkShare['id']}",
                ];

                $this->notificationService->sendLinkNotification(
                    $linkShare,
                    $action,
                    $targetUserIds,
                    $notificationData
                );
            }
        } catch (\Exception $e) {
            Log::error('Failed to send link sharing notification', [
                'link_id' => $linkShare['id'] ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Check if link belongs to user's region (for regionadmin permission)
     */
    protected function isLinkInUserRegion(LinkShare $linkShare, $user): bool
    {
        if (! $user->institution || $user->institution->level != 2) {
            return false;
        }

        $userRegionIds = $user->institution->getAllChildrenIds() ?? [];
        $userRegionIds[] = $user->institution->id;

        return in_array($linkShare->institution_id, $userRegionIds);
    }

    /**
     * Apply regional filtering based on user role
     */
    protected function applyUserRegionalFilter($query, $user): void
    {
        if ($user->hasRole('superadmin')) {
            return;
        }

        $userInstitution = $user->institution;
        if (! $userInstitution) {
            $query->where('shared_by', $user->id);

            return;
        }

        if ($user->hasRole('regionadmin') || $user->hasRole('regionoperator')) {
            $childIds = $userInstitution->getAllChildrenIds() ?? [];
            $scopeIds = array_values(array_unique(array_merge([$userInstitution->id], $childIds)));
            $query->whereIn('institution_id', $scopeIds);
        } elseif ($user->hasRole('sektoradmin')) {
            $childIds = $userInstitution->getAllChildrenIds() ?? [];
            $scopeIds = array_values(array_unique(array_merge([$userInstitution->id], $childIds)));
            $query->whereIn('institution_id', $scopeIds);
        }
    }
}
