<?php

namespace App\Services;

use App\Models\RegionOperatorPermission;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Centralized helper to manage RegionOperator CRUD-based permissions.
 */
class RegionOperatorPermissionService
{
    private const VALIDATION_ERROR_MESSAGE = 'RegionOperator üçün ən azı bir səlahiyyət seçilməlidir.';

    /**
     * Complete list of CRUD permission fields supported by RegionOperator.
     */
    public const CRUD_FIELDS = [
        // Surveys
        'can_view_surveys',
        'can_create_surveys',
        'can_edit_surveys',
        'can_delete_surveys',
        'can_publish_surveys',
        // Tasks
        'can_view_tasks',
        'can_create_tasks',
        'can_edit_tasks',
        'can_delete_tasks',
        'can_assign_tasks',
        // Documents
        'can_view_documents',
        'can_upload_documents',
        'can_edit_documents',
        'can_delete_documents',
        'can_share_documents',
        // Folders
        'can_view_folders',
        'can_create_folders',
        'can_edit_folders',
        'can_delete_folders',
        'can_manage_folder_access',
        // Links
        'can_view_links',
        'can_create_links',
        'can_edit_links',
        'can_delete_links',
        'can_share_links',
    ];

    /**
     * Legacy coarse permissions -> CRUD field mapping (kept for backward compatibility).
     */
    public const LEGACY_FIELD_MAP = [
        'can_manage_surveys' => [
            'can_view_surveys',
            'can_create_surveys',
            'can_edit_surveys',
            'can_delete_surveys',
            'can_publish_surveys',
        ],
        'can_manage_tasks' => [
            'can_view_tasks',
            'can_create_tasks',
            'can_edit_tasks',
            'can_delete_tasks',
            'can_assign_tasks',
        ],
        'can_manage_documents' => [
            'can_view_documents',
            'can_upload_documents',
            'can_edit_documents',
            'can_delete_documents',
            'can_share_documents',
        ],
        'can_manage_folders' => [
            'can_view_folders',
            'can_create_folders',
            'can_edit_folders',
            'can_delete_folders',
            'can_manage_folder_access',
        ],
        'can_manage_links' => [
            'can_view_links',
            'can_create_links',
            'can_edit_links',
            'can_delete_links',
            'can_share_links',
        ],
    ];

    /**
     * Extract CRUD permissions from raw request/DTO payload (supports nested + legacy keys).
     */
    public function extractPermissions(array $payload): array
    {
        $permissions = [];
        $nested = (array) ($payload['region_operator_permissions'] ?? []);

        foreach (self::CRUD_FIELDS as $field) {
            if (array_key_exists($field, $nested)) {
                $permissions[$field] = $this->toBool($nested[$field]);

                continue;
            }

            if (array_key_exists($field, $payload)) {
                $permissions[$field] = $this->toBool($payload[$field]);
            }
        }

        foreach (self::LEGACY_FIELD_MAP as $legacyField => $targets) {
            $value = $nested[$legacyField] ?? $payload[$legacyField] ?? null;
            if ($this->toBool($value)) {
                foreach ($targets as $targetField) {
                    $permissions[$targetField] = true;
                }
            }
        }

        return $this->filterPermissions($permissions);
    }

    /**
     * Persist normalized permissions for the given user.
     */
    public function syncPermissions(User $user, array $permissions): void
    {
        $normalized = $this->normalize($permissions);

        RegionOperatorPermission::updateOrCreate(
            ['user_id' => $user->id],
            $normalized
        );

        $enabledCount = $this->countEnabled($normalized);

        Log::info('RegionOperator permissions synced', [
            'user_id' => $user->id,
            'username' => $user->username,
            'permissions' => $normalized,
            'enabled_count' => $enabledCount,
        ]);

        if ($enabledCount === 0) {
            Log::channel('audit')->warning('RegionOperator permissions synced with zero privileges', [
                'user_id' => $user->id,
                'username' => $user->username,
            ]);
        }
    }

    /**
     * Remove permission profile for user (used when role changes).
     */
    public function deletePermissions(User $user): void
    {
        RegionOperatorPermission::where('user_id', $user->id)->delete();

        Log::info('RegionOperator permissions removed', [
            'user_id' => $user->id,
            'username' => $user->username,
        ]);
    }

    /**
     * Ensure payload contains at least one permission when required.
     */
    public function assertValidPayload(array $payload, bool $requirePayload = false): void
    {
        $hasCrudPayload = $this->hasCrudPayload($payload);

        if ($requirePayload && ! $hasCrudPayload) {
            $this->logValidationFailure('missing_payload');
            throw ValidationException::withMessages([
                'region_operator_permissions' => [self::VALIDATION_ERROR_MESSAGE],
            ]);
        }

        if ($hasCrudPayload && ! $this->hasAnyEnabledPermissions($payload)) {
            $this->logValidationFailure('empty_permissions');
            throw ValidationException::withMessages([
                'region_operator_permissions' => [self::VALIDATION_ERROR_MESSAGE],
            ]);
        }
    }

    /**
     * Check if payload contains any enabled permission.
     */
    public function hasAnyEnabledPermissions(array $payload): bool
    {
        $permissions = $this->extractPermissions($payload);

        foreach ($permissions as $value) {
            if ($value === true) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine if payload contains any CRUD-related keys.
     */
    public function hasCrudPayload(array $payload): bool
    {
        $nested = (array) ($payload['region_operator_permissions'] ?? []);

        foreach (self::CRUD_FIELDS as $field) {
            if (array_key_exists($field, $nested) || array_key_exists($field, $payload)) {
                return true;
            }
        }

        foreach (array_keys(self::LEGACY_FIELD_MAP) as $legacyField) {
            if (array_key_exists($legacyField, $nested) || array_key_exists($legacyField, $payload)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Ensure the relation is stored only for RegionOperator users.
     */
    public function shouldHandle(User $user): bool
    {
        return $user->hasRole('regionoperator');
    }

    private function normalize(array $permissions): array
    {
        $base = array_fill_keys(self::CRUD_FIELDS, false);

        foreach ($permissions as $field => $value) {
            if (array_key_exists($field, $base)) {
                $base[$field] = $this->toBool($value);
            }
        }

        return $base;
    }

    private function countEnabled(array $permissions): int
    {
        $count = 0;
        foreach ($permissions as $value) {
            if ($value) {
                $count++;
            }
        }

        return $count;
    }

    private function logValidationFailure(string $reason): void
    {
        Log::channel('audit')->warning('RegionOperator permission payload blocked', [
            'reason' => $reason,
        ]);
    }

    private function filterPermissions(array $permissions): array
    {
        return array_intersect_key($permissions, array_flip(self::CRUD_FIELDS));
    }

    private function toBool($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_string($value)) {
            $lower = strtolower($value);
            if ($lower === 'true' || $lower === '1') {
                return true;
            }
            if ($lower === 'false' || $lower === '0' || $lower === '') {
                return false;
            }
        }

        if (is_numeric($value)) {
            return (bool) $value;
        }

        return (bool) $value;
    }
}
