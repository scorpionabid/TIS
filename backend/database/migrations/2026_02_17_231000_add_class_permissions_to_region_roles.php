<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $adminPermissions = [
            'classes.read',
            'classes.create',
            'classes.update',
            'classes.delete',
            'classes.manage',
            'classes.assign',
            'classes.export'
        ];

        $operatorPermissions = [
            'classes.read',
            'classes.update',
            'classes.manage'
        ];

        // Ensure permissions exist
        foreach (array_unique(array_merge($adminPermissions, $operatorPermissions)) as $pName) {
            Permission::firstOrCreate(['name' => $pName, 'guard_name' => 'sanctum']);
        }

        // Assign to regionadmin
        $regionAdmin = Role::where('name', 'regionadmin')->where('guard_name', 'sanctum')->first();
        if ($regionAdmin) {
            foreach ($adminPermissions as $pName) {
                $permission = Permission::where('name', $pName)->where('guard_name', 'sanctum')->first();
                if ($permission) {
                    $regionAdmin->givePermissionTo($permission);
                }
            }
        }

        // Assign to regionoperator
        $regionOperator = Role::where('name', 'regionoperator')->where('guard_name', 'sanctum')->first();
        if ($regionOperator) {
            foreach ($operatorPermissions as $pName) {
                $permission = Permission::where('name', $pName)->where('guard_name', 'sanctum')->first();
                if ($permission) {
                    $regionOperator->givePermissionTo($permission);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Optional: remove permissions if needed, but usually safe to keep
    }
};
