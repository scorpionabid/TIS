<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SuperAdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SeederSanityTest extends TestCase
{
    use RefreshDatabase;

    public function test_core_seeders_create_roles_permissions_and_superadmin(): void
    {
        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            SuperAdminSeeder::class,
        ]);

        $this->assertGreaterThan(0, Role::count(), 'Roles should be created by seeders');
        $this->assertDatabaseHas('roles', ['name' => 'superadmin', 'guard_name' => 'sanctum']);
        $this->assertDatabaseHas('roles', ['name' => 'regionadmin', 'guard_name' => 'sanctum']);

        $superadmin = User::where('username', 'superadmin')->first();
        $this->assertNotNull($superadmin, 'Superadmin user should exist after seeding');
        $this->assertTrue($superadmin->is_active);
        $this->assertTrue($superadmin->hasRole('superadmin'));
        $this->assertGreaterThan(0, $superadmin->getAllPermissions()->count(), 'Superadmin should receive permissions');
    }
}
