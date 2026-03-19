<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        $guard = 'sanctum';

        $permissions = [
            'preschool.groups.manage',
            'preschool.attendance.read',
            'preschool.attendance.write',
            'preschool.attendance.reports',
            'preschool.attendance.export',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => $guard]);
        }

        $map = [
            'schooladmin'    => ['preschool.groups.manage', 'preschool.attendance.read', 'preschool.attendance.write'],
            'sektoradmin'    => ['preschool.attendance.read', 'preschool.attendance.reports'],
            'regionoperator' => ['preschool.attendance.read', 'preschool.attendance.reports'],
            'regionadmin'    => ['preschool.attendance.read', 'preschool.attendance.reports', 'preschool.attendance.export'],
            'superadmin'     => $permissions,
        ];

        foreach ($map as $roleName => $perms) {
            $role = Role::where('name', $roleName)->where('guard_name', $guard)->first();
            if ($role) {
                $role->givePermissionTo($perms);
            }
        }

        app()['cache']->forget('spatie.permission.cache');
    }

    public function down(): void
    {
        $guard = 'sanctum';
        $permissions = [
            'preschool.groups.manage',
            'preschool.attendance.read',
            'preschool.attendance.write',
            'preschool.attendance.reports',
            'preschool.attendance.export',
        ];

        foreach ($permissions as $permName) {
            $perm = Permission::where('name', $permName)->where('guard_name', $guard)->first();
            if ($perm) {
                $perm->roles()->detach();
                $perm->delete();
            }
        }

        app()['cache']->forget('spatie.permission.cache');
    }
};
