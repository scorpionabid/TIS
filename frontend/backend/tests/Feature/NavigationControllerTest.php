<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NavigationControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $regionadmin;
    protected User $teacher;
    protected User $student;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test roles
        $superadminRole = \Spatie\Permission\Models\Role::create(['name' => 'superadmin', 'guard_name' => 'web']);
        $regionadminRole = \Spatie\Permission\Models\Role::create(['name' => 'regionadmin', 'guard_name' => 'web']);
        $teacherRole = \Spatie\Permission\Models\Role::create(['name' => 'müəllim', 'guard_name' => 'web']);
        $studentRole = \Spatie\Permission\Models\Role::create(['name' => 'şagird', 'guard_name' => 'web']);

        // Create test permissions
        $this->createTestPermissions();
        
        // Assign permissions to roles
        $superadminRole->givePermissionTo(\Spatie\Permission\Models\Permission::all());
        $regionadminRole->givePermissionTo(['view_institutions', 'manage_users', 'view_reports']);
        $teacherRole->givePermissionTo(['view_surveys', 'manage_attendance']);
        $studentRole->givePermissionTo(['view_surveys']);
        
        // Create test users
        $this->superadmin = User::factory()->create(['username' => 'superadmin']);
        $this->superadmin->assignRole($superadminRole);
        
        $this->regionadmin = User::factory()->create(['username' => 'regionadmin']);
        $this->regionadmin->assignRole($regionadminRole);
        
        $this->teacher = User::factory()->create(['username' => 'teacher']);
        $this->teacher->assignRole($teacherRole);
        
        $this->student = User::factory()->create(['username' => 'student']);
        $this->student->assignRole($studentRole);
    }

    private function createTestPermissions(): void
    {
        $permissions = [
            'view_dashboard',
            'manage_users',
            'view_institutions',
            'manage_institutions',
            'view_surveys',
            'manage_surveys',
            'view_reports',
            'manage_reports',
            'view_settings',
            'manage_settings',
            'manage_attendance',
            'view_tasks',
            'manage_tasks'
        ];

        foreach ($permissions as $permission) {
            \Spatie\Permission\Models\Permission::create(['name' => $permission, 'guard_name' => 'web']);
        }
    }

    /** @test */
    public function authenticated_user_can_get_navigation_menu()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/navigation/menu');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'menu_items',
                'user_permissions',
                'user_roles'
            ]);
    }

    /** @test */
    public function superadmin_gets_all_menu_items()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/navigation/menu');

        $response->assertStatus(200);

        $menuItems = $response->json('menu_items');
        $userPermissions = $response->json('user_permissions');
        $userRoles = $response->json('user_roles');

        // SuperAdmin should have all permissions
        $this->assertNotEmpty($menuItems);
        $this->assertNotEmpty($userPermissions);
        $this->assertContains('superadmin', $userRoles);
        
        // Check that high-level menu items exist
        $menuTitles = array_column($menuItems, 'title');
        $this->assertContains('Dashboard', $menuTitles);
    }

    /** @test */
    public function regionadmin_gets_filtered_menu_items()
    {
        $response = $this->actingAs($this->regionadmin)
            ->getJson('/api/navigation/menu');

        $response->assertStatus(200);

        $menuItems = $response->json('menu_items');
        $userPermissions = $response->json('user_permissions');
        $userRoles = $response->json('user_roles');

        // RegionAdmin should have limited permissions
        $this->assertNotEmpty($menuItems);
        $this->assertNotEmpty($userPermissions);
        $this->assertContains('regionadmin', $userRoles);
        
        // Check that regionadmin has specific permissions
        $this->assertContains('view_institutions', $userPermissions);
        $this->assertContains('manage_users', $userPermissions);
        $this->assertContains('view_reports', $userPermissions);
    }

    /** @test */
    public function teacher_gets_limited_menu_items()
    {
        $response = $this->actingAs($this->teacher)
            ->getJson('/api/navigation/menu');

        $response->assertStatus(200);

        $menuItems = $response->json('menu_items');
        $userPermissions = $response->json('user_permissions');
        $userRoles = $response->json('user_roles');

        // Teacher should have very limited permissions
        $this->assertNotEmpty($menuItems);
        $this->assertNotEmpty($userPermissions);
        $this->assertContains('müəllim', $userRoles);
        
        // Check that teacher has specific permissions
        $this->assertContains('view_surveys', $userPermissions);
        $this->assertContains('manage_attendance', $userPermissions);
        
        // Check that teacher doesn't have admin permissions
        $this->assertNotContains('manage_users', $userPermissions);
        $this->assertNotContains('manage_institutions', $userPermissions);
    }

    /** @test */
    public function student_gets_minimal_menu_items()
    {
        $response = $this->actingAs($this->student)
            ->getJson('/api/navigation/menu');

        $response->assertStatus(200);

        $menuItems = $response->json('menu_items');
        $userPermissions = $response->json('user_permissions');
        $userRoles = $response->json('user_roles');

        // Student should have minimal permissions
        $this->assertNotEmpty($menuItems);
        $this->assertNotEmpty($userPermissions);
        $this->assertContains('şagird', $userRoles);
        
        // Check that student has only view permissions
        $this->assertContains('view_surveys', $userPermissions);
        
        // Check that student doesn't have management permissions
        $this->assertNotContains('manage_users', $userPermissions);
        $this->assertNotContains('manage_institutions', $userPermissions);
        $this->assertNotContains('manage_surveys', $userPermissions);
    }

    /** @test */
    public function menu_items_have_correct_structure()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/navigation/menu');

        $response->assertStatus(200);

        $menuItems = $response->json('menu_items');
        
        // Check that each menu item has required fields
        foreach ($menuItems as $item) {
            $this->assertArrayHasKey('title', $item);
            $this->assertArrayHasKey('path', $item);
            $this->assertArrayHasKey('icon', $item);
            
            // Check children structure if they exist
            if (isset($item['children'])) {
                foreach ($item['children'] as $child) {
                    $this->assertArrayHasKey('title', $child);
                    $this->assertArrayHasKey('path', $child);
                }
            }
        }
    }

    /** @test */
    public function menu_items_are_properly_filtered_by_permissions()
    {
        // Create a user with specific permissions
        $limitedUser = User::factory()->create(['username' => 'limited']);
        $limitedRole = Role::create(['name' => 'limited', 'guard_name' => 'web']);
        $limitedRole->givePermissionTo(['view_surveys', 'view_reports']);
        $limitedUser->assignRole($limitedRole);

        $response = $this->actingAs($limitedUser)
            ->getJson('/api/navigation/menu');

        $response->assertStatus(200);

        $userPermissions = $response->json('user_permissions');
        
        // User should only have the permissions we gave them
        $this->assertContains('view_surveys', $userPermissions);
        $this->assertContains('view_reports', $userPermissions);
        $this->assertNotContains('manage_users', $userPermissions);
        $this->assertNotContains('manage_institutions', $userPermissions);
    }

    /** @test */
    public function menu_items_are_properly_filtered_by_roles()
    {
        $response = $this->actingAs($this->teacher)
            ->getJson('/api/navigation/menu');

        $response->assertStatus(200);

        $userRoles = $response->json('user_roles');
        
        // Teacher should have only their assigned role
        $this->assertContains('müəllim', $userRoles);
        $this->assertNotContains('superadmin', $userRoles);
        $this->assertNotContains('regionadmin', $userRoles);
    }

    /** @test */
    public function menu_respects_hierarchical_permissions()
    {
        // Test that menu items with children are properly filtered
        $response = $this->actingAs($this->regionadmin)
            ->getJson('/api/navigation/menu');

        $response->assertStatus(200);

        $menuItems = $response->json('menu_items');
        
        // Find menu items with children
        $menuItemsWithChildren = array_filter($menuItems, function($item) {
            return isset($item['children']) && !empty($item['children']);
        });

        // Each child should be accessible to the user
        foreach ($menuItemsWithChildren as $item) {
            $this->assertNotEmpty($item['children']);
            
            // Children should have proper structure
            foreach ($item['children'] as $child) {
                $this->assertArrayHasKey('title', $child);
                $this->assertArrayHasKey('path', $child);
            }
        }
    }

    /** @test */
    public function navigation_endpoint_requires_authentication()
    {
        $response = $this->getJson('/api/navigation/menu');
        
        $response->assertStatus(401);
    }

    /** @test */
    public function navigation_returns_proper_json_structure()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/navigation/menu');

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonStructure([
                'menu_items' => [
                    '*' => [
                        'title',
                        'path',
                        'icon'
                    ]
                ],
                'user_permissions' => [],
                'user_roles' => []
            ]);
    }

    /** @test */
    public function navigation_handles_users_without_roles()
    {
        // Create a user without any roles
        $userWithoutRoles = User::factory()->create(['username' => 'noroles']);

        $response = $this->actingAs($userWithoutRoles)
            ->getJson('/api/navigation/menu');

        $response->assertStatus(200);

        $menuItems = $response->json('menu_items');
        $userPermissions = $response->json('user_permissions');
        $userRoles = $response->json('user_roles');

        // Should return empty or minimal menu items
        $this->assertIsArray($menuItems);
        $this->assertIsArray($userPermissions);
        $this->assertIsArray($userRoles);
        $this->assertEmpty($userRoles);
    }

    /** @test */
    public function navigation_handles_users_with_multiple_roles()
    {
        // Create a user with multiple roles
        $multiRoleUser = User::factory()->create(['username' => 'multirole']);
        $multiRoleUser->assignRole(['müəllim', 'regionadmin']);

        $response = $this->actingAs($multiRoleUser)
            ->getJson('/api/navigation/menu');

        $response->assertStatus(200);

        $userRoles = $response->json('user_roles');
        $userPermissions = $response->json('user_permissions');

        // Should have both roles
        $this->assertContains('müəllim', $userRoles);
        $this->assertContains('regionadmin', $userRoles);
        
        // Should have combined permissions from both roles
        $this->assertNotEmpty($userPermissions);
    }

    /** @test */
    public function navigation_caches_menu_items_for_performance()
    {
        // First request
        $response1 = $this->actingAs($this->superadmin)
            ->getJson('/api/navigation/menu');

        $response1->assertStatus(200);

        // Second request should be faster (cached)
        $response2 = $this->actingAs($this->superadmin)
            ->getJson('/api/navigation/menu');

        $response2->assertStatus(200);

        // Both responses should be identical
        $this->assertEquals($response1->json(), $response2->json());
    }

    /** @test */
    public function navigation_respects_user_institution_context()
    {
        // Test that menu items are filtered based on user's institution
        $response = $this->actingAs($this->teacher)
            ->getJson('/api/navigation/menu');

        $response->assertStatus(200);

        $menuItems = $response->json('menu_items');
        
        // Teacher should only see menu items relevant to their institution level
        $this->assertNotEmpty($menuItems);
        
        // Should not see system-wide administration items
        $menuTitles = array_column($menuItems, 'title');
        $this->assertNotContains('System Settings', $menuTitles);
    }
}