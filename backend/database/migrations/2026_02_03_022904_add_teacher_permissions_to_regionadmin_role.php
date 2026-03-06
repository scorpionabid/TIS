<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // RegionAdmin roluna teacher permission-larını əlavə et
        $regionAdminRole = Role::where('name', 'regionadmin')->first();
        
        if ($regionAdminRole) {
            $teacherPermissions = [
                'teachers.create',
                'teachers.read',
                'teachers.update',
                'teachers.delete',
                'teachers.write',
                'teachers.manage'
            ];

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
                        DB::table('role_has_permissions')->insert([
                            'role_id' => $regionAdminRole->id,
                            'permission_id' => $permission->id,
                        ]);
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // RegionAdmin rolundan teacher permission-larını sil
        $regionAdminRole = Role::where('name', 'regionadmin')->first();
        
        if ($regionAdminRole) {
            $teacherPermissions = [
                'teachers.create',
                'teachers.read',
                'teachers.update',
                'teachers.delete',
                'teachers.write',
                'teachers.manage'
            ];

            foreach ($teacherPermissions as $permissionName) {
                $permission = Permission::where('name', $permissionName)->first();
                
                if ($permission) {
                    DB::table('role_has_permissions')
                        ->where('role_id', $regionAdminRole->id)
                        ->where('permission_id', $permission->id)
                        ->delete();
                }
            }
        }
    }
};
