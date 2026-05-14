<?php

namespace App\Services\LinkSharing\Domains\Configuration;

use App\Services\LinkSharing\Domains\Permission\LinkPermissionService;

/**
 * Link Configuration Service
 *
 * Provides configuration options, metadata, and mapping functions
 * for link sharing features.
 */
class LinkConfigurationService
{
    public function __construct(
        protected LinkPermissionService $permissionService
    ) {}

    /**
     * Get sharing options available to user
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 274-296)
     */
    public function getSharingOptions($user): array
    {
        $roleName = $user->role->name;

        return [
            'available_scopes' => $this->permissionService->getAvailableScopesForRole($roleName),
            'available_target_roles' => $this->permissionService->getAvailableTargetRoles($roleName),
            'targetable_institutions' => $this->permissionService->getUserTargetableInstitutions($user),
            'link_types' => [
                'document' => 'Sənəd',
                'form' => 'Forma',
                'survey' => 'Sorğu',
                'announcement' => 'Elan',
                'resource' => 'Resurs',
                'external' => 'Xarici link',
            ],
            'priorities' => [
                'low' => 'Aşağı',
                'normal' => 'Normal',
                'high' => 'Yüksək',
            ],
        ];
    }

    /**
     * Map link priority to notification priority
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 770-778)
     */
    public function mapLinkPriorityToNotificationPriority(string $linkPriority): string
    {
        return match ($linkPriority) {
            'high' => 'high',
            'normal' => 'normal',
            'low' => 'low',
            default => 'normal',
        };
    }

    /**
     * Get link types definition
     */
    public function getLinkTypes(): array
    {
        return [
            'document' => 'Sənəd',
            'form' => 'Forma',
            'survey' => 'Sorğu',
            'announcement' => 'Elan',
            'resource' => 'Resurs',
            'external' => 'Xarici link',
        ];
    }

    /**
     * Get priority levels definition
     */
    public function getPriorityLevels(): array
    {
        return [
            'low' => 'Aşağı',
            'normal' => 'Normal',
            'high' => 'Yüksək',
        ];
    }
}
