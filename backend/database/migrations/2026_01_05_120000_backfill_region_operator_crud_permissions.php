<?php

use App\Services\RegionOperatorPermissionService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const LEGACY_MAPPING = [
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

    public function up(): void
    {
        if (! Schema::hasTable('region_operator_permissions')) {
            return;
        }

        DB::table('region_operator_permissions')
            ->orderBy('id')
            ->chunk(200, function ($rows) {
                foreach ($rows as $row) {
                    $updates = [];

                    foreach (self::LEGACY_MAPPING as $legacyField => $targets) {
                        $legacyValue = $row->{$legacyField} ?? null;
                        if ($legacyValue === null) {
                            continue;
                        }

                        foreach ($targets as $targetField) {
                            $currentValue = $row->{$targetField} ?? null;
                            if ($legacyValue && ! $currentValue) {
                                $updates[$targetField] = true;
                            } elseif (! $legacyValue && $currentValue === null) {
                                $updates[$targetField] = false;
                            }
                        }
                    }

                    foreach ($this->getCrudFields() as $field) {
                        if (! array_key_exists($field, $updates) && ($row->{$field} === null)) {
                            $updates[$field] = false;
                        }
                    }

                    if (! empty($updates)) {
                        DB::table('region_operator_permissions')
                            ->where('id', $row->id)
                            ->update($updates);
                    }
                }
            });
    }

    public function down(): void
    {
        if (! Schema::hasTable('region_operator_permissions')) {
            return;
        }

        DB::table('region_operator_permissions')->update(
            array_fill_keys($this->getCrudFields(), null)
        );
    }

    private function getCrudFields(): array
    {
        $fields = RegionOperatorPermissionService::getCrudFields();

        if (! empty($fields)) {
            return $fields;
        }

        $fallback = [];
        foreach (self::LEGACY_MAPPING as $targets) {
            foreach ($targets as $field) {
                if (! in_array($field, $fallback, true)) {
                    $fallback[] = $field;
                }
            }
        }

        return $fallback;
    }
};
