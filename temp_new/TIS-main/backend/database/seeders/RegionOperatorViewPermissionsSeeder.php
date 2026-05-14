<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RegionOperatorViewPermissionsSeeder extends Seeder
{
    /**
     * RegionOperator-a oxuma icazələri əlavə edir:
     * students.read, institutions.read, classes.read
     */
    public function run(): void
    {
        try {
            $regionOperatorRole = Role::where('name', 'regionoperator')->first();

            if (! $regionOperatorRole) {
                $this->command->error('RegionOperator role not found!');

                return;
            }

            $permissionsToAdd = [
                'students.read',
                'institutions.read',
                'classes.read',
            ];

            $added = [];
            $existing = [];
            $notFound = [];

            foreach ($permissionsToAdd as $permissionName) {
                $permission = Permission::where('name', $permissionName)->first();

                if (! $permission) {
                    $notFound[] = $permissionName;
                    $this->command->warn("Permission not found: {$permissionName}");
                    continue;
                }

                $hasPermission = DB::table('role_has_permissions')
                    ->where('role_id', $regionOperatorRole->id)
                    ->where('permission_id', $permission->id)
                    ->exists();

                if (! $hasPermission) {
                    DB::table('role_has_permissions')->insert([
                        'role_id'       => $regionOperatorRole->id,
                        'permission_id' => $permission->id,
                    ]);
                    $added[] = $permissionName;
                    $this->command->info("Added: {$permissionName}");
                } else {
                    $existing[] = $permissionName;
                    $this->command->line("Already exists: {$permissionName}");
                }
            }

            $total = DB::table('role_has_permissions')
                ->where('role_id', $regionOperatorRole->id)
                ->count();

            $this->command->info('=== RegionOperatorViewPermissionsSeeder Complete ===');
            $this->command->info('Added: ' . count($added) . ' | Already existed: ' . count($existing) . ' | Not found: ' . count($notFound));
            $this->command->info("RegionOperator total permissions: {$total}");
        } catch (\Exception $e) {
            $this->command->error('Error: ' . $e->getMessage());
            Log::error('RegionOperatorViewPermissionsSeeder error', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
