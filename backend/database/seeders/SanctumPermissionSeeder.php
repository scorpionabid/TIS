<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class SanctumPermissionSeeder extends Seeder
{
    /**
     * Sync all permissions and roles to sanctum guard
     */
    public function run(): void
    {
        echo "=== Creating permissions for sanctum guard ===\n";

        // Get all permissions from web guard
        $webPerms = Permission::where('guard_name', 'web')->get();

        $createdCount = 0;
        foreach ($webPerms as $webPerm) {
            // Check if permission exists for sanctum guard
            $sanctumPerm = Permission::where('name', $webPerm->name)
                ->where('guard_name', 'sanctum')
                ->first();

            if (!$sanctumPerm) {
                Permission::create([
                    'name' => $webPerm->name,
                    'guard_name' => 'sanctum',
                ]);
                echo "✅ Created: {$webPerm->name} for sanctum guard\n";
                $createdCount++;
            }
        }

        echo "\nTotal created: $createdCount\n\n";

        echo "=== Creating roles for sanctum guard and assigning permissions ===\n";

        // Get all web guard roles
        $webRoles = Role::where('guard_name', 'web')->get();

        foreach ($webRoles as $webRole) {
            // Create or get sanctum role
            $sanctumRole = Role::firstOrCreate([
                'name' => $webRole->name,
                'guard_name' => 'sanctum',
            ]);

            // Get role's web permissions
            $webPermNames = $webRole->permissions->pluck('name')->toArray();

            // Assign corresponding sanctum permissions
            $assignedCount = 0;
            foreach ($webPermNames as $permName) {
                $sanctumPerm = Permission::where('name', $permName)
                    ->where('guard_name', 'sanctum')
                    ->first();

                if ($sanctumPerm) {
                    try {
                        $sanctumRole->givePermissionTo($sanctumPerm);
                        $assignedCount++;
                    } catch (\Exception $e) {
                        // Already has permission
                    }
                }
            }

            echo "✅ Role: {$sanctumRole->name} - Assigned {$assignedCount} sanctum permissions\n";
        }

        // Clear cache
        app()['cache']->forget('spatie.permission.cache');
        \Artisan::call('permission:cache-reset');

        echo "\nCache cleared\n";
        echo "✅ Sanctum permissions synced successfully!\n";
    }
}
