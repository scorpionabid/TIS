<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permission = Permission::firstOrCreate([
            'name'       => 'report_table_responses.review',
            'guard_name' => 'sanctum',
        ]);

        foreach (['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin'] as $roleName) {
            $role = Role::where('name', $roleName)->where('guard_name', 'sanctum')->first();
            if ($role && !$role->hasPermissionTo('report_table_responses.review', 'sanctum')) {
                $role->givePermissionTo($permission);
            }
        }
    }

    public function down(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permission = Permission::where('name', 'report_table_responses.review')
            ->where('guard_name', 'sanctum')
            ->first();

        if ($permission) {
            $permission->delete();
        }
    }
};
