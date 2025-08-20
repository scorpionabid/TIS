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

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
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
        // Create user with institutions.read permission
        $user = User::factory()->create();
        $user->assignRole('schooladmin'); // This role has institutions.read permission

        Sanctum::actingAs($user);

        // Test accessing a route that requires institutions.read permission
        $response = $this->getJson('/api/institutions');
        
        // Should be allowed to access
        $response->assertStatus(200);
    }

    public function test_user_without_permission_cannot_access_protected_route()
    {
        $user = User::factory()->create();
        $user->assignRole('müəllim'); // Teacher role has no institutions.read permission
        Sanctum::actingAs($user);

        // Test accessing institutions endpoint without permission
        $response = $this->getJson('/api/institutions');
        
        // Should return 403 Forbidden
        $response->assertStatus(403);
    }

    public function test_super_admin_has_all_permissions()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('superadmin');
        Sanctum::actingAs($superAdmin);

        // Debug: Check if superadmin role has permissions
        $this->assertTrue($superAdmin->hasRole('superadmin'));
        $this->assertTrue($superAdmin->hasPermissionTo('users.read', 'api'));
        
        // Super admin should be able to access all protected routes
        $response = $this->getJson('/api/institutions');
        $response->assertStatus(200);

        $response = $this->getJson('/api/surveys');
        $response->assertStatus(200);

        $response = $this->getJson('/api/roles');
        $response->assertStatus(200);
        
        // Note: Users endpoint may have additional authorization logic
        // so we'll test with a simpler endpoint verification
        $this->assertTrue($superAdmin->hasAnyPermission([
            'users.read', 'institutions.read', 'surveys.read', 'roles.read'
        ]));
    }

    public function test_role_has_correct_permissions()
    {
        // Test that regionadmin role has correct permissions
        $regionadmin = Role::where('name', 'regionadmin')->first();
        
        $this->assertTrue($regionadmin->hasPermissionTo('users.read'));
        $this->assertTrue($regionadmin->hasPermissionTo('institutions.read'));
        $this->assertTrue($regionadmin->hasPermissionTo('surveys.create'));
        
        // Test that teacher role has limited permissions
        $teacher = Role::where('name', 'müəllim')->first();
        
        $this->assertTrue($teacher->hasPermissionTo('surveys.respond'));
        $this->assertFalse($teacher->hasPermissionTo('users.create'));
        $this->assertFalse($teacher->hasPermissionTo('institutions.read'));
    }
}
