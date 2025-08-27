<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create necessary roles and permissions
        $this->createRolesAndPermissions();
    }
    
    protected function createRolesAndPermissions()
    {
        // Create necessary permissions
        $permissions = [
            'users.view',
            'users.create',
            'users.update',
            'users.delete',
            'roles.view',
            'roles.create',
            'roles.update',
            'roles.delete',
            'permissions.view',
            'institutions.view',
            'institutions.create',
            'institutions.update',
            'institutions.delete',
        ];
        
        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission, 'guard_name' => 'web']);
        }
        
        // Create roles
        $adminRole = Role::create(['name' => 'superadmin', 'guard_name' => 'web']);
        $teacherRole = Role::create(['name' => 'müəllim', 'guard_name' => 'web']);
        $schoolAdminRole = Role::create(['name' => 'schooladmin', 'guard_name' => 'web']);
        $regionAdminRole = Role::create(['name' => 'regionadmin', 'guard_name' => 'web']);
        
        // Assign permissions to roles
        $schoolAdminRole->givePermissionTo(['users.view', 'users.create', 'institutions.view']);
        $regionAdminRole->givePermissionTo(['users.view', 'institutions.view', 'institutions.update']);
        
        // Super admin has all permissions
        $adminRole->givePermissionTo(Permission::all());
    }

    public function test_assign_role_to_user()
    {
        $admin = User::factory()->create();
        $admin->assignRole('superadmin');
        Sanctum::actingAs($admin);

        $user = User::factory()->create();
        $role = Role::where('name', 'müəllim')->first();

        // Assign role to user
        $user->assignRole($role);

        $this->assertTrue($user->hasRole('müəllim'));
        $this->assertDatabaseHas('model_has_roles', [
            'model_id' => $user->id,
            'role_id' => $role->id,
            'model_type' => User::class
        ]);
    }

    public function test_user_with_permission_can_access_protected_route()
    {
        // Create user with users.view permission
        $user = User::factory()->create();
        $user->assignRole('schooladmin');

        Sanctum::actingAs($user, ['web']);

        // Test accessing a route that requires users.view permission
        // Since we don't have actual routes set up, we'll test the permission directly
        $this->assertTrue($user->hasPermissionTo('users.view', 'web'));
        $this->assertTrue($user->hasRole('schooladmin', 'web'));
    }

    public function test_user_without_permission_cannot_access_protected_route()
    {
        // Create user without any special permissions
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['web']);

        // User should not have any permissions by default
        $this->assertFalse($user->hasPermissionTo('users.view', 'web'));
        $this->assertFalse($user->hasRole('schooladmin', 'web'));
    }

    public function test_super_admin_has_all_permissions()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('superadmin');
        Sanctum::actingAs($superAdmin, ['web']);

        // Check if superadmin role has been assigned
        $this->assertTrue($superAdmin->hasRole('superadmin', 'web'));
        
        // Super admin should have all permissions
        $this->assertTrue($superAdmin->hasPermissionTo('users.view', 'web'));
        $this->assertTrue($superAdmin->hasPermissionTo('institutions.view', 'web'));
        $this->assertTrue($superAdmin->hasPermissionTo('roles.view', 'web'));
        
        // Check that super admin has all permissions we defined
        $permissions = [
            'users.view', 'users.create', 'users.update', 'users.delete',
            'roles.view', 'roles.create', 'roles.update', 'roles.delete',
            'permissions.view',
            'institutions.view', 'institutions.create', 'institutions.update', 'institutions.delete'
        ];
        
        foreach ($permissions as $permission) {
            $this->assertTrue(
                $superAdmin->hasPermissionTo($permission, 'web'),
                "Super admin should have permission: {$permission}"
            );
        }
    }

    public function test_role_has_correct_permissions()
    {
        // Test that regionadmin role has correct permissions
        $regionadmin = Role::where('name', 'regionadmin')->first();
        
        $this->assertTrue($regionadmin->hasPermissionTo('users.view'));
        $this->assertTrue($regionadmin->hasPermissionTo('institutions.view'));
        $this->assertTrue($regionadmin->hasPermissionTo('institutions.update'));
        
        // Test that teacher role has limited permissions
        $teacher = Role::where('name', 'müəllim')->first();
        $this->assertFalse($teacher->hasPermissionTo('users.delete'));
        
        // Test that school admin has correct permissions
        $schoolAdmin = Role::where('name', 'schooladmin')->first();
        $this->assertTrue($schoolAdmin->hasPermissionTo('users.view'));
        $this->assertTrue($schoolAdmin->hasPermissionTo('users.create'));
        $this->assertTrue($schoolAdmin->hasPermissionTo('institutions.view'));
    }
}
