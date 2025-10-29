<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class GuardMigrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Clear permission cache
        app()['cache']->forget('spatie.permission.cache');
    }

    /** @test */
    public function it_can_create_roles_with_sanctum_guard()
    {
        $role = Role::create([
            'name' => 'test-role',
            'guard_name' => 'sanctum',
        ]);

        $this->assertDatabaseHas('roles', [
            'name' => 'test-role',
            'guard_name' => 'sanctum',
        ]);

        $this->assertEquals('sanctum', $role->guard_name);
    }

    /** @test */
    public function it_can_create_permissions_with_sanctum_guard()
    {
        $permission = Permission::create([
            'name' => 'test-permission',
            'guard_name' => 'sanctum',
        ]);

        $this->assertDatabaseHas('permissions', [
            'name' => 'test-permission',
            'guard_name' => 'sanctum',
        ]);

        $this->assertEquals('sanctum', $permission->guard_name);
    }

    /** @test */
    public function user_can_be_assigned_sanctum_guard_role()
    {
        $user = User::factory()->create();
        $role = Role::create([
            'name' => 'sanctum-role',
            'guard_name' => 'sanctum',
        ]);

        $user->assignRole($role);

        $this->assertTrue($user->hasRole('sanctum-role'));
        $this->assertDatabaseHas('model_has_roles', [
            'model_id' => $user->id,
            'role_id' => $role->id,
            'model_type' => User::class,
        ]);
    }

    /** @test */
    public function user_can_be_given_sanctum_guard_permission()
    {
        $user = User::factory()->create();
        $permission = Permission::create([
            'name' => 'test.permission',
            'guard_name' => 'sanctum',
        ]);

        $user->givePermissionTo($permission);

        $this->assertTrue($user->hasPermissionTo('test.permission'));
    }

    /** @test */
    public function role_can_have_sanctum_guard_permissions()
    {
        $role = Role::create([
            'name' => 'test-role',
            'guard_name' => 'sanctum',
        ]);

        $permission = Permission::create([
            'name' => 'test.permission',
            'guard_name' => 'sanctum',
        ]);

        $role->givePermissionTo($permission);

        $this->assertTrue($role->hasPermissionTo('test.permission'));
    }

    /** @test */
    public function user_with_role_inherits_permissions()
    {
        $user = User::factory()->create();

        $role = Role::create([
            'name' => 'editor',
            'guard_name' => 'sanctum',
        ]);

        $permission = Permission::create([
            'name' => 'edit.posts',
            'guard_name' => 'sanctum',
        ]);

        $role->givePermissionTo($permission);
        $user->assignRole($role);

        $this->assertTrue($user->hasRole('editor'));
        $this->assertTrue($user->hasPermissionTo('edit.posts'));
    }

    /** @test */
    public function sanctum_authentication_works_with_permissions()
    {
        $user = User::factory()->create();
        $role = Role::create([
            'name' => 'admin',
            'guard_name' => 'sanctum',
        ]);

        $permission = Permission::create([
            'name' => 'admin.access',
            'guard_name' => 'sanctum',
        ]);

        $role->givePermissionTo($permission);
        $user->assignRole($role);

        Sanctum::actingAs($user);

        $this->assertTrue(auth('sanctum')->check());
        $this->assertEquals($user->id, auth('sanctum')->id());
        $this->assertTrue(auth('sanctum')->user()->hasPermissionTo('admin.access'));
    }

    /** @test */
    public function user_uses_sanctum_guard_for_roles()
    {
        $user = User::factory()->create();
        $role = Role::create([
            'name' => 'test-role',
            'guard_name' => 'sanctum',
        ]);

        // This will only work if User model uses sanctum guard
        $user->assignRole($role);

        $this->assertTrue($user->hasRole('test-role'));
    }
}
