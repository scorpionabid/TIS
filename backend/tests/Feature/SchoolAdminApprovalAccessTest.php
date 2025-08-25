<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Institution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;

class SchoolAdminApprovalAccessTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Seed basic roles and permissions
        $this->artisan('db:seed', ['--class' => 'PermissionSeeder']);
        $this->artisan('db:seed', ['--class' => 'RoleSeeder']);
        $this->artisan('db:seed', ['--class' => 'InstitutionTypeSeeder']);
        $this->artisan('db:seed', ['--class' => 'InstitutionHierarchySeeder']);
    }

    /** @test */
    public function schooladmin_cannot_access_approvals_page()
    {
        // Create a school and schooladmin user
        $school = Institution::factory()->create([
            'name' => 'Test School',
            'type' => 'school',
            'level' => 4
        ]);

        $schoolAdminRole = Role::where('name', 'schooladmin')->first();
        $schoolAdmin = User::factory()->create([
            'name' => 'School Admin User',
            'email' => 'schooladmin@test.com',
            'institution_id' => $school->id
        ]);
        $schoolAdmin->assignRole($schoolAdminRole);

        // Authenticate as schooladmin
        Sanctum::actingAs($schoolAdmin);

        // Attempt to access approvals page
        $response = $this->getJson('/api/approvals');

        // Should be forbidden (403) or not found (404)
        $this->assertTrue(
            $response->status() === 403 || $response->status() === 404,
            "SchoolAdmin should not have access to approvals. Got status: " . $response->status()
        );
    }

    /** @test */
    public function schooladmin_cannot_create_approval()
    {
        // Create a school and schooladmin user
        $school = Institution::factory()->create([
            'name' => 'Test School',
            'type' => 'school', 
            'level' => 4
        ]);

        $schoolAdminRole = Role::where('name', 'schooladmin')->first();
        $schoolAdmin = User::factory()->create([
            'name' => 'School Admin User',
            'email' => 'schooladmin@test.com',
            'institution_id' => $school->id
        ]);
        $schoolAdmin->assignRole($schoolAdminRole);

        // Authenticate as schooladmin
        Sanctum::actingAs($schoolAdmin);

        // Attempt to create approval
        $approvalData = [
            'title' => 'Test Approval',
            'description' => 'Test approval description',
            'type' => 'survey',
            'target_audience' => 'teachers'
        ];

        $response = $this->postJson('/api/approvals', $approvalData);

        // Should be forbidden
        $this->assertTrue(
            $response->status() === 403 || $response->status() === 404,
            "SchoolAdmin should not be able to create approvals. Got status: " . $response->status()
        );
    }

    /** @test */
    public function schooladmin_does_not_have_approval_permissions()
    {
        // Create a schooladmin user
        $school = Institution::factory()->create([
            'name' => 'Test School',
            'type' => 'school',
            'level' => 4
        ]);

        $schoolAdminRole = Role::where('name', 'schooladmin')->first();
        $schoolAdmin = User::factory()->create([
            'name' => 'School Admin User', 
            'email' => 'schooladmin@test.com',
            'institution_id' => $school->id
        ]);
        $schoolAdmin->assignRole($schoolAdminRole);

        // Check that schooladmin does not have approval permissions
        $this->assertFalse(
            $schoolAdmin->can('approvals.read'),
            'SchoolAdmin should not have approvals.read permission'
        );

        $this->assertFalse(
            $schoolAdmin->can('approvals.create'),
            'SchoolAdmin should not have approvals.create permission'
        );

        $this->assertFalse(
            $schoolAdmin->can('approvals.update'),
            'SchoolAdmin should not have approvals.update permission'
        );

        $this->assertFalse(
            $schoolAdmin->can('approvals.delete'),
            'SchoolAdmin should not have approvals.delete permission'
        );
    }

    /** @test */
    public function regionadmin_has_approval_access()
    {
        // Create a region and regionadmin user (positive test for comparison)
        $region = Institution::factory()->create([
            'name' => 'Test Region',
            'type' => 'region',
            'level' => 2
        ]);

        $regionAdminRole = Role::where('name', 'regionadmin')->first();
        $regionAdmin = User::factory()->create([
            'name' => 'Region Admin User',
            'email' => 'regionadmin@test.com', 
            'institution_id' => $region->id
        ]);
        $regionAdmin->assignRole($regionAdminRole);

        // Authenticate as regionadmin
        Sanctum::actingAs($regionAdmin);

        // Should have approval permissions
        $this->assertTrue(
            $regionAdmin->can('approvals.read'),
            'RegionAdmin should have approvals.read permission'
        );

        $this->assertTrue(
            $regionAdmin->can('approvals.create'), 
            'RegionAdmin should have approvals.create permission'
        );
    }

    /** @test */
    public function sektoradmin_has_approval_access()
    {
        // Create a sector and sektoradmin user (positive test for comparison)
        $sector = Institution::factory()->create([
            'name' => 'Test Sector',
            'type' => 'sector',
            'level' => 3
        ]);

        $sektorAdminRole = Role::where('name', 'sektoradmin')->first();
        $sektorAdmin = User::factory()->create([
            'name' => 'Sektor Admin User',
            'email' => 'sektoradmin@test.com',
            'institution_id' => $sector->id
        ]);
        $sektorAdmin->assignRole($sektorAdminRole);

        // Should have approval permissions
        $this->assertTrue(
            $sektorAdmin->can('approvals.read'),
            'SektorAdmin should have approvals.read permission'
        );

        $this->assertTrue(
            $sektorAdmin->can('approvals.create'),
            'SektorAdmin should have approvals.create permission'
        );
    }

    /** @test */
    public function schooladmin_cannot_access_approval_routes_directly()
    {
        // Create a schooladmin user
        $school = Institution::factory()->create([
            'name' => 'Test School',
            'type' => 'school',
            'level' => 4
        ]);

        $schoolAdminRole = Role::where('name', 'schooladmin')->first();
        $schoolAdmin = User::factory()->create([
            'name' => 'School Admin User',
            'email' => 'schooladmin@test.com',
            'institution_id' => $school->id
        ]);
        $schoolAdmin->assignRole($schoolAdminRole);

        // Authenticate as schooladmin
        Sanctum::actingAs($schoolAdmin);

        // Test various approval-related endpoints
        $endpoints = [
            '/api/approvals',
            '/api/approvals/pending',
            '/api/approvals/approved', 
            '/api/approvals/rejected',
        ];

        foreach ($endpoints as $endpoint) {
            $response = $this->getJson($endpoint);
            
            $this->assertTrue(
                $response->status() === 403 || $response->status() === 404,
                "SchoolAdmin should not access {$endpoint}. Got status: " . $response->status()
            );
        }
    }

    /** @test */
    public function schooladmin_menu_does_not_contain_approval_items()
    {
        // Create a schooladmin user
        $school = Institution::factory()->create([
            'name' => 'Test School',
            'type' => 'school',
            'level' => 4
        ]);

        $schoolAdminRole = Role::where('name', 'schooladmin')->first();
        $schoolAdmin = User::factory()->create([
            'name' => 'School Admin User',
            'email' => 'schooladmin@test.com',
            'institution_id' => $school->id
        ]);
        $schoolAdmin->assignRole($schoolAdminRole);

        // Authenticate as schooladmin
        Sanctum::actingAs($schoolAdmin);

        // Get user menu/navigation data
        $response = $this->getJson('/api/me');
        
        $this->assertEquals(200, $response->status());
        
        $userData = $response->json();
        $userRole = $userData['roles'][0] ?? $userData['role'] ?? null;
        
        $this->assertEquals('schooladmin', $userRole, 'User should have schooladmin role');
        
        // Verify permissions array does not contain approval permissions
        $permissions = $userData['permissions'] ?? [];
        
        $this->assertNotContains('approvals.read', $permissions, 'SchoolAdmin permissions should not contain approvals.read');
        $this->assertNotContains('approvals.create', $permissions, 'SchoolAdmin permissions should not contain approvals.create');
        $this->assertNotContains('approvals.update', $permissions, 'SchoolAdmin permissions should not contain approvals.update');
        $this->assertNotContains('approvals.delete', $permissions, 'SchoolAdmin permissions should not contain approvals.delete');
    }
}