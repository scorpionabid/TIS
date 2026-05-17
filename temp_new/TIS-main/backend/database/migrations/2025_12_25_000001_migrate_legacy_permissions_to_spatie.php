<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;

/**
 * STRATEGY A: LEGACY DROP - Migration
 *
 * Migrates all RegionOperator permissions from legacy RO table to Spatie permissions
 * Then drops the legacy region_operator_permissions table
 */
return new class extends Migration
{
    /**
     * Legacy field → Modern permission mapping
     */
    private array $legacyToModernMapping = [
        // Survey permissions
        'can_view_surveys' => 'surveys.read',
        'can_create_surveys' => 'surveys.create',
        'can_edit_surveys' => 'surveys.update',
        'can_delete_surveys' => 'surveys.delete',
        'can_publish_surveys' => 'surveys.publish',

        // Task permissions
        'can_view_tasks' => 'tasks.read',
        'can_create_tasks' => 'tasks.create',
        'can_edit_tasks' => 'tasks.update',
        'can_delete_tasks' => 'tasks.delete',
        'can_assign_tasks' => 'tasks.assign',

        // Document permissions
        'can_view_documents' => 'documents.read',
        'can_upload_documents' => 'documents.create',
        'can_edit_documents' => 'documents.update',
        'can_delete_documents' => 'documents.delete',
        'can_share_documents' => 'documents.share',

        // Folder permissions
        'can_view_folders' => 'folders.read',
        'can_create_folders' => 'folders.create',
        'can_edit_folders' => 'folders.update',
        'can_delete_folders' => 'folders.delete',
        'can_manage_folder_access' => 'folders.manage_access',

        // Link permissions
        'can_view_links' => 'links.read',
        'can_create_links' => 'links.create',
        'can_edit_links' => 'links.update',
        'can_delete_links' => 'links.delete',
        'can_share_links' => 'links.share',
    ];

    /**
     * High-level manage permissions → multiple modern permissions
     */
    private array $managePermissions = [
        'can_manage_surveys' => ['surveys.read', 'surveys.create', 'surveys.update', 'surveys.delete'],
        'can_manage_tasks' => ['tasks.read', 'tasks.create', 'tasks.update', 'tasks.delete'],
        'can_manage_documents' => ['documents.read', 'documents.create', 'documents.update', 'documents.delete'],
        'can_manage_folders' => ['folders.read', 'folders.create', 'folders.update', 'folders.delete'],
        'can_manage_links' => ['links.read', 'links.create', 'links.update', 'links.delete'],
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Log::info('🔄 [MIGRATION] Starting legacy permissions migration to Spatie');

        // Get all users with RO permissions
        $roPermissions = DB::table('region_operator_permissions')->get();

        $totalUsers = $roPermissions->count();
        $migratedUsers = 0;
        $totalPermissionsGranted = 0;

        Log::info("📊 [MIGRATION] Found {$totalUsers} users with legacy permissions");

        foreach ($roPermissions as $roPerm) {
            $user = User::find($roPerm->user_id);

            if (! $user) {
                Log::warning("⚠️ [MIGRATION] User {$roPerm->user_id} not found, skipping");

                continue;
            }

            $permissionsToGrant = [];

            // Process standard mappings
            foreach ($this->legacyToModernMapping as $legacyField => $modernPermission) {
                if (property_exists($roPerm, $legacyField) && $roPerm->$legacyField === true) {
                    $permissionsToGrant[] = $modernPermission;
                }
            }

            // Process manage permissions (expand to multiple)
            foreach ($this->managePermissions as $legacyField => $modernPermissions) {
                if (property_exists($roPerm, $legacyField) && $roPerm->$legacyField === true) {
                    $permissionsToGrant = array_merge($permissionsToGrant, $modernPermissions);
                }
            }

            // Remove duplicates
            $permissionsToGrant = array_unique($permissionsToGrant);

            // Grant permissions
            foreach ($permissionsToGrant as $permissionName) {
                try {
                    // Check if permission exists
                    $permission = Permission::where('name', $permissionName)->first();

                    if (! $permission) {
                        Log::warning("⚠️ [MIGRATION] Permission '{$permissionName}' not found in database, skipping");

                        continue;
                    }

                    // Grant permission if user doesn't have it yet
                    if (! $user->hasPermissionTo($permissionName)) {
                        $user->givePermissionTo($permissionName);
                        $totalPermissionsGranted++;
                    }
                } catch (\Exception $e) {
                    Log::error("❌ [MIGRATION] Failed to grant permission '{$permissionName}' to user {$user->id}: {$e->getMessage()}");
                }
            }

            $migratedUsers++;

            Log::info("✅ [MIGRATION] User {$user->id} ({$user->username}): Granted " . count($permissionsToGrant) . ' permissions');
        }

        Log::info("📊 [MIGRATION] Migration complete: {$migratedUsers}/{$totalUsers} users migrated, {$totalPermissionsGranted} permissions granted");

        // Drop legacy table
        Log::info('🗑️ [MIGRATION] Dropping legacy region_operator_permissions table');
        Schema::dropIfExists('region_operator_permissions');

        Log::info('✅ [MIGRATION] Legacy table dropped successfully');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Log::warning('⚠️ [MIGRATION ROLLBACK] Recreating region_operator_permissions table');

        // Recreate legacy table
        Schema::create('region_operator_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');

            // High-level manage permissions
            $table->boolean('can_manage_surveys')->default(false);
            $table->boolean('can_manage_tasks')->default(false);
            $table->boolean('can_manage_documents')->default(false);
            $table->boolean('can_manage_folders')->default(false);
            $table->boolean('can_manage_links')->default(false);

            // Detailed survey permissions
            $table->boolean('can_view_surveys')->default(false);
            $table->boolean('can_create_surveys')->default(false);
            $table->boolean('can_edit_surveys')->default(false);
            $table->boolean('can_delete_surveys')->default(false);
            $table->boolean('can_publish_surveys')->default(false);

            // Task permissions
            $table->boolean('can_view_tasks')->default(false);
            $table->boolean('can_create_tasks')->default(false);
            $table->boolean('can_edit_tasks')->default(false);
            $table->boolean('can_delete_tasks')->default(false);
            $table->boolean('can_assign_tasks')->default(false);

            // Document permissions
            $table->boolean('can_view_documents')->default(false);
            $table->boolean('can_upload_documents')->default(false);
            $table->boolean('can_edit_documents')->default(false);
            $table->boolean('can_delete_documents')->default(false);
            $table->boolean('can_share_documents')->default(false);

            // Folder permissions
            $table->boolean('can_view_folders')->default(false);
            $table->boolean('can_create_folders')->default(false);
            $table->boolean('can_edit_folders')->default(false);
            $table->boolean('can_delete_folders')->default(false);
            $table->boolean('can_manage_folder_access')->default(false);

            // Link permissions
            $table->boolean('can_view_links')->default(false);
            $table->boolean('can_create_links')->default(false);
            $table->boolean('can_edit_links')->default(false);
            $table->boolean('can_delete_links')->default(false);
            $table->boolean('can_share_links')->default(false);

            $table->timestamps();
        });

        Log::info('✅ [MIGRATION ROLLBACK] Legacy table recreated');
        Log::warning('⚠️ [MIGRATION ROLLBACK] Data NOT restored - restore from backup if needed!');
    }
};
