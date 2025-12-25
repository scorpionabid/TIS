<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * REGIONOPERATOR ROUTE ACCESS PERMISSIONS
     *
     * Bu migration RegionOperator roluna yeni səhifələrə giriş üçün lazım olan
     * 2 yeni permission əlavə edir:
     *
     * 1. classes.read - Regional sinif idarəetməsi səhifəsinə giriş
     * 2. subjects.read - Fənn idarəetməsi səhifəsinə giriş
     *
     * NOTE: departments.read və institutions.read artıq mövcuddur
     */
    public function up(): void
    {
        $permissions = [
            [
                'name' => 'classes.read',
                'display_name' => 'Sinifləri gör',
                'description' => 'Regional sinif siyahısını görüntüləmək və idarə etmək',
                'guard_name' => 'sanctum',
                'category' => 'academic',
                'department' => null,
                'resource' => 'classes',
                'action' => 'read',
                'is_active' => true,
            ],
            [
                'name' => 'subjects.read',
                'display_name' => 'Fənləri gör',
                'description' => 'Fənn siyahısını görüntüləmək və idarə etmək',
                'guard_name' => 'sanctum',
                'category' => 'academic',
                'department' => null,
                'resource' => 'subjects',
                'action' => 'read',
                'is_active' => true,
            ],
        ];

        foreach ($permissions as $permissionData) {
            // Check if permission already exists
            $exists = Permission::where('name', $permissionData['name'])
                ->where('guard_name', $permissionData['guard_name'])
                ->exists();

            if (!$exists) {
                Permission::create($permissionData);
                \Log::info("✅ Permission created: {$permissionData['name']}");
            } else {
                \Log::info("⚠️  Permission already exists: {$permissionData['name']}");
            }
        }

        // Clear permission cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        \Log::info('✅ Permission cache cleared');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permissions = ['classes.read', 'subjects.read'];

        Permission::whereIn('name', $permissions)
            ->where('guard_name', 'sanctum')
            ->delete();

        \Log::info('✅ Permissions deleted: ' . implode(', ', $permissions));

        // Clear permission cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        \Log::info('✅ Permission cache cleared');
    }
};
