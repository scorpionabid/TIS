<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RegionAdminTeacherPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        try {
            // RegionAdmin rolunu tap
            $regionAdminRole = Role::where('name', 'regionadmin')->first();
            
            if (!$regionAdminRole) {
                $this->command->error('RegionAdmin role not found!');
                return;
            }

            // RegionAdmin-a veriləcək teacher permission-ları
            $teacherPermissions = [
                'teachers.create',
                'teachers.read',
                'teachers.update',
                'teachers.delete',
                'teachers.write',
                'teachers.manage'
            ];

            $addedPermissions = [];
            $existingPermissions = [];

            foreach ($teacherPermissions as $permissionName) {
                $permission = Permission::where('name', $permissionName)->first();
                
                if ($permission) {
                    // Permissionın artıq var olub olmadığını yoxla
                    $hasPermission = DB::table('role_has_permissions')
                        ->where('role_id', $regionAdminRole->id)
                        ->where('permission_id', $permission->id)
                        ->exists();

                    if (!$hasPermission) {
                        // Permissionı rola əlavə et
                        $regionAdminRole->givePermissionTo($permission);
                        $addedPermissions[] = $permissionName;
                        
                        $this->command->info("✅ Added permission: {$permissionName} to RegionAdmin role");
                    } else {
                        $existingPermissions[] = $permissionName;
                        $this->command->line("ℹ️  Permission already exists: {$permissionName}");
                    }
                } else {
                    $this->command->error("❌ Permission not found: {$permissionName}");
                }
            }

            // Cache təmizlə
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

            // Nəticəni göstər
            $this->command->line('');
            $this->command->info('🎯 RegionAdmin Teacher Permissions Seeder completed!');
            $this->command->line("📊 Added: " . count($addedPermissions) . " permissions");
            $this->command->line("📋 Already existed: " . count($existingPermissions) . " permissions");
            
            if (!empty($addedPermissions)) {
                $this->command->line('✨ New permissions added: ' . implode(', ', $addedPermissions));
            }

            // Log yaz
            Log::info('RegionAdminTeacherPermissionsSeeder executed', [
                'added_permissions' => $addedPermissions,
                'existing_permissions' => $existingPermissions,
                'total_processed' => count($teacherPermissions)
            ]);

        } catch (\Exception $e) {
            $this->command->error('❌ Error in RegionAdminTeacherPermissionsSeeder: ' . $e->getMessage());
            Log::error('RegionAdminTeacherPermissionsSeeder failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
}
