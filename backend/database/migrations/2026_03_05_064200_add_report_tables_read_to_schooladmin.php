<?php

use Illuminate\Database\Migrations\Migration;
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

        // report_tables.read permissionunu tap və ya yarat
        $permission = Permission::firstOrCreate([
            'name'       => 'report_tables.read',
            'guard_name' => 'sanctum',
        ]);

        // SchoolAdmin roluna permission ver
        $role = Role::where('name', 'schooladmin')
            ->where('guard_name', 'sanctum')
            ->first();

        if ($role && !$role->hasPermissionTo('report_tables.read', 'sanctum')) {
            $role->givePermissionTo($permission);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Permission rollback etmək riskli ola bilər (digər rollar istifadə edə bilər)
        // Ona görə burada yalnız cache təmizləyirik
    }
};
