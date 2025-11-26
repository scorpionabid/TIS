<?php

namespace App\Services;

/**
 * Maps between RegionOperatorPermission (custom table) and Spatie Laravel-Permission
 *
 * This service maintains bidirectional mapping between:
 * - region_operator_permissions table (25 CRUD fields)
 * - Spatie permissions table (global Laravel permissions)
 *
 * Purpose: Allow RegionOperator granular permissions to work with route middleware
 */
class RegionOperatorPermissionMappingService
{
    /**
     * Map RegionOperator custom permissions to Spatie permission names
     *
     * @var array<string, string>
     */
    public const RO_TO_SPATIE_MAP = [
        // Surveys (5)
        'can_view_surveys' => 'surveys.read',
        'can_create_surveys' => 'surveys.create',
        'can_edit_surveys' => 'surveys.update',
        'can_delete_surveys' => 'surveys.delete',
        'can_publish_surveys' => 'surveys.publish',

        // Tasks (5)
        'can_view_tasks' => 'tasks.read',
        'can_create_tasks' => 'tasks.create',
        'can_edit_tasks' => 'tasks.update',
        'can_delete_tasks' => 'tasks.delete',
        'can_assign_tasks' => 'tasks.assign',

        // Documents (5)
        'can_view_documents' => 'documents.read',
        'can_upload_documents' => 'documents.create',
        'can_edit_documents' => 'documents.update',
        'can_delete_documents' => 'documents.delete',
        'can_share_documents' => 'documents.share',

        // Folders (5)
        'can_view_folders' => 'documents.read', // Folders use documents permission
        'can_create_folders' => 'documents.create',
        'can_edit_folders' => 'documents.update',
        'can_delete_folders' => 'documents.delete',
        'can_manage_folder_access' => 'documents.share',

        // Links (5)
        'can_view_links' => 'links.read',
        'can_create_links' => 'links.create',
        'can_edit_links' => 'links.update',
        'can_delete_links' => 'links.delete',
        'can_share_links' => 'links.share',
    ];

    /**
     * Reverse map: Spatie permission to RegionOperator permission
     *
     * @var array<string, array<string>>
     */
    public const SPATIE_TO_RO_MAP = [
        'surveys.read' => ['can_view_surveys'],
        'surveys.create' => ['can_create_surveys'],
        'surveys.update' => ['can_edit_surveys'],
        'surveys.delete' => ['can_delete_surveys'],
        'surveys.publish' => ['can_publish_surveys'],

        'tasks.read' => ['can_view_tasks'],
        'tasks.create' => ['can_create_tasks'],
        'tasks.update' => ['can_edit_tasks'],
        'tasks.delete' => ['can_delete_tasks'],
        'tasks.assign' => ['can_assign_tasks'],

        'documents.read' => ['can_view_documents', 'can_view_folders'],
        'documents.create' => ['can_upload_documents', 'can_create_folders'],
        'documents.update' => ['can_edit_documents', 'can_edit_folders'],
        'documents.delete' => ['can_delete_documents', 'can_delete_folders'],
        'documents.share' => ['can_share_documents', 'can_manage_folder_access'],

        'links.read' => ['can_view_links'],
        'links.create' => ['can_create_links'],
        'links.update' => ['can_edit_links'],
        'links.delete' => ['can_delete_links'],
        'links.share' => ['can_share_links'],
    ];

    /**
     * Convert RegionOperator permissions array to Spatie permission names
     *
     * @param  array $roPermissions ['can_create_surveys' => true, ...]
     * @return array ['surveys.create', 'surveys.update', ...]
     */
    public function toSpatiePermissions(array $roPermissions): array
    {
        $spatiePermissions = [];

        foreach ($roPermissions as $roPermission => $enabled) {
            if ($enabled === true && isset(self::RO_TO_SPATIE_MAP[$roPermission])) {
                $spatieName = self::RO_TO_SPATIE_MAP[$roPermission];
                $spatiePermissions[$spatieName] = true; // Use as set to avoid duplicates
            }
        }

        return array_keys($spatiePermissions);
    }

    /**
     * Check if a Spatie permission maps to any RegionOperator permission
     *
     * @return array Array of RO permission field names
     */
    public function toRegionOperatorPermissions(string $spatiePermission): array
    {
        return self::SPATIE_TO_RO_MAP[$spatiePermission] ?? [];
    }

    /**
     * Get all Spatie permissions that RegionOperator can potentially have
     */
    public function getAllMappedSpatiePermissions(): array
    {
        return array_unique(array_values(self::RO_TO_SPATIE_MAP));
    }

    /**
     * Validate that all RO permissions have Spatie mappings
     *
     * @return array Missing mappings
     */
    public function validateMappings(): array
    {
        $allRoPermissions = RegionOperatorPermissionService::getCrudFields();
        $missing = [];

        foreach ($allRoPermissions as $roPermission) {
            if (! isset(self::RO_TO_SPATIE_MAP[$roPermission])) {
                $missing[] = $roPermission;
            }
        }

        return $missing;
    }
}
