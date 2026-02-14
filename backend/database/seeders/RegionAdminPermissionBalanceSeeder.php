<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RegionAdminPermissionBalanceSeeder extends Seeder
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

            // RegionOperator-da olan, RegionAdmin-da olmayan səlahiyyətlər
            $permissionsToAdd = [
                // System Management (5)
                'system.config',
                'approvals.template_manage',
                'approvals.workflow_manage',
                'approvals.delete',
                'approvals.reports',
                
                // Advanced Assessment (7)
                'assessment-types.assign',
                'assessment-types.bulk',
                'assessments.entries.bulk',
                'assessments.entries.read',
                'assessments.manage',
                'assessments.students.read',
                'assessments.students.write',
                
                // Advanced Academic (7)
                'attendance.create',
                'classes.analytics',
                'classes.attendance',
                'classes.bulk',
                'classes.grades',
                'classes.schedule',
                
                // Teacher Performance (1)
                'delete teacher_performance',
                
                // Advanced Events (2)
                'events.approve_bulk',
                'events.delete',
                
                // Psychology (4)
                'psychology.export',
                'psychology.interventions',
                'psychology.progress',
                'psychology.referrals',
                
                // Rating System (7)
                'rating-configs.read',
                'ratings.calculate',
                'ratings.delete',
                'ratings.manage',
                'ratings.read',
                'ratings.update',
                'ratings.write',
                
                // Teaching Loads (5)
                'teaching_loads.analytics',
                'teaching_loads.create',
                'teaching_loads.delete',
                'teaching_loads.update',
                'teaching_loads.write',
                
                // Other (1)
                'rooms.delete'
            ];

            $addedPermissions = [];
            $existingPermissions = [];
            $notFoundPermissions = [];

            foreach ($permissionsToAdd as $permissionName) {
                $permission = Permission::where('name', $permissionName)->first();
                
                if ($permission) {
                    // Permissionın artıq var olub olmadığını yoxla
                    $hasPermission = DB::table('role_has_permissions')
                        ->where('role_id', $regionAdminRole->id)
                        ->where('permission_id', $permission->id)
                        ->exists();

                    if (!$hasPermission) {
                        // Yeni səlahiyyət əlavə et
                        DB::table('role_has_permissions')->insert([
                            'role_id' => $regionAdminRole->id,
                            'permission_id' => $permission->id,
                        ]);
                        $addedPermissions[] = $permissionName;
                        $this->command->info("Added permission to RegionAdmin: {$permissionName}");
                    } else {
                        $existingPermissions[] = $permissionName;
                    }
                } else {
                    $notFoundPermissions[] = $permissionName;
                    $this->command->warn("Permission not found: {$permissionName}");
                }
            }

            // Nəticə hesabatı
            $this->command->info('=== RegionAdmin Permission Balance Complete ===');
            $this->command->info("Added permissions: " . count($addedPermissions));
            $this->command->info("Already existed: " . count($existingPermissions));
            $this->command->warn("Not found: " . count($notFoundPermissions));

            // Hazırki səlahiyyət sayını göstər
            $regionAdminCount = DB::table('role_has_permissions')
                ->where('role_id', $regionAdminRole->id)
                ->count();
            
            $this->command->info("RegionAdmin now has {$regionAdminCount} permissions");

            // RegionOperator ilə müqayisə
            $regionOperatorRole = Role::where('name', 'regionoperator')->where('id', 3)->first();
            if ($regionOperatorRole) {
                $regionOperatorCount = DB::table('role_has_permissions')
                    ->where('role_id', $regionOperatorRole->id)
                    ->count();
                
                $this->command->info("RegionOperator has {$regionOperatorCount} permissions");
                $this->command->info("Difference: " . abs($regionAdminCount - $regionOperatorCount) . " permissions");
                
                // Yalnız user.create və users.update fərqi qalmalıdır
                if (abs($regionAdminCount - $regionOperatorCount) === 2) {
                    $this->command->info('✅ SUCCESS: RegionAdmin and RegionOperator now have almost identical permissions!');
                    $this->command->info('Only difference: users.create and users.update (RegionAdmin exclusive)');
                }
            }

        } catch (\Exception $e) {
            $this->command->error('Error balancing RegionAdmin permissions: ' . $e->getMessage());
            Log::error('RegionAdminPermissionBalanceSeeder error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
}
