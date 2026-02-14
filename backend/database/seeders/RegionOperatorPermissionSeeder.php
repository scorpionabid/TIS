<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RegionOperatorPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        try {
            // RegionOperator rolunu tap (ID: 3 - 124 permissions olan)
            $regionOperatorRole = Role::where('name', 'regionoperator')->where('id', 3)->first();
            
            if (!$regionOperatorRole) {
                $this->command->error('RegionOperator role not found!');
                return;
            }

            // RegionOperator-a əlavə ediləcək səlahiyyətlər (users.create və users.update istisna olmaqla)
            $permissionsToAdd = [
                // Approval System (4)
                'approvals.bulk_approve',
                'approvals.bulk_reject',
                'approvals.delegate',
                'approvals.reject',
                
                // Assessment Management (2)
                'assessment-types.create',
                'assessments.export',
                
                // Teacher Performance (4)
                'create teacher_performance',
                'edit teacher_performance',
                'manage teacher_performance',
                'view teacher_performance',
                
                // Events Management (4)
                'events.manage',
                'events.register',
                'events.reject',
                'events.update',
                
                // Links Management (6)
                'links.analytics',
                'links.bulk',
                'links.create',
                'links.delete',
                'links.read',
                'links.share',
                
                // Academic Management (4)
                'attendance.read',
                'subjects.delete',
                'subjects.read',
                'subjects.update',
                
                // School Attendance (3)
                'school_attendance.export',
                'school_attendance.read',
                'school_attendance.write',
                
                // Schedule Management (1)
                'schedules.update',
                
                // Institution Types (1)
                'institution-types.read',
                
                // Inventory Management (1)
                'inventory.update',
                
                // Psychology Management (2)
                'psychology.manage',
                'psychology.read',
                
                // Reports Management (3)
                'reports.create',
                'reports.export',
                'reports.read',
                
                // Rooms Management (1)
                'rooms.manage',
                
                // Tasks Management (1)
                'tasks.approve',
                
                // Teachers Management (4)
                'teachers.delete',
                'teachers.manage',
                'teachers.read',
                'teachers.update'
            ];

            $addedPermissions = [];
            $existingPermissions = [];
            $notFoundPermissions = [];

            foreach ($permissionsToAdd as $permissionName) {
                $permission = Permission::where('name', $permissionName)->first();
                
                if ($permission) {
                    // Permissionın artıq var olub olmadığını yoxla
                    $hasPermission = DB::table('role_has_permissions')
                        ->where('role_id', $regionOperatorRole->id)
                        ->where('permission_id', $permission->id)
                        ->exists();

                    if (!$hasPermission) {
                        // Yeni səlahiyyət əlavə et
                        DB::table('role_has_permissions')->insert([
                            'role_id' => $regionOperatorRole->id,
                            'permission_id' => $permission->id,
                        ]);
                        $addedPermissions[] = $permissionName;
                        $this->command->info("Added permission: {$permissionName}");
                    } else {
                        $existingPermissions[] = $permissionName;
                    }
                } else {
                    $notFoundPermissions[] = $permissionName;
                    $this->command->warn("Permission not found: {$permissionName}");
                }
            }

            // Nəticə hesabatı
            $this->command->info('=== RegionOperator Permission Update Complete ===');
            $this->command->info("Added permissions: " . count($addedPermissions));
            $this->command->info("Already existed: " . count($existingPermissions));
            $this->command->warn("Not found: " . count($notFoundPermissions));

            // Hazırki səlahiyyət sayını göstər
            $currentPermissionCount = DB::table('role_has_permissions')
                ->where('role_id', $regionOperatorRole->id)
                ->count();
            
            $this->command->info("RegionOperator (ID: 3) now has {$currentPermissionCount} permissions");

            // RegionAdmin ilə müqayisə
            $regionAdminRole = Role::where('name', 'regionadmin')->first();
            if ($regionAdminRole) {
                $regionAdminCount = DB::table('role_has_permissions')
                    ->where('role_id', $regionAdminRole->id)
                    ->count();
                
                $this->command->info("RegionAdmin has {$regionAdminCount} permissions");
                $this->command->info("Difference: " . ($regionAdminCount - $currentPermissionCount) . " permissions");
            }

            if (!empty($notFoundPermissions)) {
                $this->command->warn('Permissions not found in database:');
                foreach ($notFoundPermissions as $permission) {
                    $this->command->warn("  - {$permission}");
                }
            }

        } catch (\Exception $e) {
            $this->command->error('Error updating RegionOperator permissions: ' . $e->getMessage());
            Log::error('RegionOperatorPermissionSeeder error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
}
