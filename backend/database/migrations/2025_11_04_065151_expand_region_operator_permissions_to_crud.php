<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Expands RegionOperator permissions from 5 simple "manage" permissions
     * to 25 granular CRUD-based permissions (5 modules × 5 actions each)
     */
    public function up(): void
    {
        // Step 1: Add new CRUD permission columns
        Schema::table('region_operator_permissions', function (Blueprint $table) {
            // SURVEYS (5 CRUD permissions)
            $table->boolean('can_view_surveys')->default(false);
            $table->boolean('can_create_surveys')->default(false);
            $table->boolean('can_edit_surveys')->default(false);
            $table->boolean('can_delete_surveys')->default(false);
            $table->boolean('can_publish_surveys')->default(false);

            // TASKS (5 CRUD permissions)
            $table->boolean('can_view_tasks')->default(false);
            $table->boolean('can_create_tasks')->default(false);
            $table->boolean('can_edit_tasks')->default(false);
            $table->boolean('can_delete_tasks')->default(false);
            $table->boolean('can_assign_tasks')->default(false);

            // DOCUMENTS (5 CRUD permissions)
            $table->boolean('can_view_documents')->default(false);
            $table->boolean('can_upload_documents')->default(false);
            $table->boolean('can_edit_documents')->default(false);
            $table->boolean('can_delete_documents')->default(false);
            $table->boolean('can_share_documents')->default(false);

            // FOLDERS (5 CRUD permissions)
            $table->boolean('can_view_folders')->default(false);
            $table->boolean('can_create_folders')->default(false);
            $table->boolean('can_edit_folders')->default(false);
            $table->boolean('can_delete_folders')->default(false);
            $table->boolean('can_manage_folder_access')->default(false);

            // LINKS (5 CRUD permissions)
            $table->boolean('can_view_links')->default(false);
            $table->boolean('can_create_links')->default(false);
            $table->boolean('can_edit_links')->default(false);
            $table->boolean('can_delete_links')->default(false);
            $table->boolean('can_share_links')->default(false);
        });

        // Step 2: Migrate existing data from old permissions to new CRUD permissions
        $permissions = \Illuminate\Support\Facades\DB::table('region_operator_permissions')->get();

        foreach ($permissions as $perm) {
            $updates = [];

            // SURVEYS: If can_manage_surveys = true, grant ALL survey permissions
            if (isset($perm->can_manage_surveys) && $perm->can_manage_surveys) {
                $updates['can_view_surveys'] = true;
                $updates['can_create_surveys'] = true;
                $updates['can_edit_surveys'] = true;
                $updates['can_delete_surveys'] = true;
                $updates['can_publish_surveys'] = true;
            }

            // TASKS: If can_manage_tasks = true, grant ALL task permissions
            if (isset($perm->can_manage_tasks) && $perm->can_manage_tasks) {
                $updates['can_view_tasks'] = true;
                $updates['can_create_tasks'] = true;
                $updates['can_edit_tasks'] = true;
                $updates['can_delete_tasks'] = true;
                $updates['can_assign_tasks'] = true;
            }

            // DOCUMENTS: If can_manage_documents = true, grant ALL document permissions
            if (isset($perm->can_manage_documents) && $perm->can_manage_documents) {
                $updates['can_view_documents'] = true;
                $updates['can_upload_documents'] = true;
                $updates['can_edit_documents'] = true;
                $updates['can_delete_documents'] = true;
                $updates['can_share_documents'] = true;
            }

            // FOLDERS: If can_manage_folders = true, grant ALL folder permissions
            if (isset($perm->can_manage_folders) && $perm->can_manage_folders) {
                $updates['can_view_folders'] = true;
                $updates['can_create_folders'] = true;
                $updates['can_edit_folders'] = true;
                $updates['can_delete_folders'] = true;
                $updates['can_manage_folder_access'] = true;
            }

            // LINKS: If can_manage_links = true, grant ALL link permissions
            if (isset($perm->can_manage_links) && $perm->can_manage_links) {
                $updates['can_view_links'] = true;
                $updates['can_create_links'] = true;
                $updates['can_edit_links'] = true;
                $updates['can_delete_links'] = true;
                $updates['can_share_links'] = true;
            }

            // Update the record with new CRUD permissions
            if (!empty($updates)) {
                \Illuminate\Support\Facades\DB::table('region_operator_permissions')
                    ->where('id', $perm->id)
                    ->update($updates);
            }
        }

        // Step 3: OLD columns are kept for backward compatibility
        // They are deprecated but not dropped due to SQLite foreign key constraints
        // Frontend and Backend will only use the new CRUD columns
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop all new CRUD-based permission columns
        Schema::table('region_operator_permissions', function (Blueprint $table) {
            $table->dropColumn([
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
            ]);
        });

        // Old simple columns remain (not dropped in up(), so no need to re-add)
    }
};
