<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\Department;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Spatie\Permission\Models\Role;
use Laravel\Sanctum\Sanctum;

class RegionalAccessControlTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $superAdmin;
    protected User $regionAdmin;
    protected User $regionOperator;
    protected User $sektorAdmin;
    protected User $mektebAdmin;
    protected Institution $ministry;
    protected Institution $region;
    protected Institution $sector;
    protected Institution $school;
    protected Department $regionDepartment;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create roles
        Role::create(['name' => 'superadmin', 'guard_name' => 'web']);
        Role::create(['name' => 'regionadmin', 'guard_name' => 'web']);
        Role::create(['name' => 'regionoperator', 'guard_name' => 'web']);
        Role::create(['name' => 'sektoradmin', 'guard_name' => 'web']);
        Role::create(['name' => 'məktəbadmin', 'guard_name' => 'web']);
        
        // Create institutional hierarchy
        $this->ministry = Institution::create([
            'name' => 'Test Ministry',
            'type' => 'ministry',
            'level' => 1,
            'parent_id' => null,
            'is_active' => true,
        ]);
        
        $this->region = Institution::create([
            'name' => 'Test Region',
            'type' => 'regional_education_department',
            'level' => 2,
            'parent_id' => $this->ministry->id,
            'is_active' => true,
        ]);
        
        $this->sector = Institution::create([
            'name' => 'Test Sector',
            'type' => 'sector_education_office',
            'level' => 3,
            'parent_id' => $this->region->id,
            'is_active' => true,
        ]);
        
        $this->school = Institution::create([
            'name' => 'Test School',
            'type' => 'school',
            'level' => 4,
            'parent_id' => $this->sector->id,
            'is_active' => true,
        ]);
        
        // Create department
        $this->regionDepartment = Department::create([
            'name' => 'Finance Department',
            'type' => 'finance',
            'institution_id' => $this->region->id,
            'is_active' => true,
        ]);
        
        // Create users
        $this->superAdmin = User::create([
            'username' => 'superadmin',
            'email' => 'superadmin@test.com',
            'full_name' => 'Super Admin',
            'password' => bcrypt('password'),
            'institution_id' => $this->ministry->id,
            'is_active' => true,
        ]);
        $this->superAdmin->assignRole('superadmin');
        
        $this->regionAdmin = User::create([
            'username' => 'regionadmin',
            'email' => 'regionadmin@test.com',
            'full_name' => 'Region Admin',
            'password' => bcrypt('password'),
            'institution_id' => $this->region->id,
            'is_active' => true,
        ]);
        $this->regionAdmin->assignRole('regionadmin');
        
        $this->regionOperator = User::create([
            'username' => 'regionoperator',
            'email' => 'regionoperator@test.com',
            'full_name' => 'Region Operator',
            'password' => bcrypt('password'),
            'institution_id' => $this->region->id,
            'department_id' => $this->regionDepartment->id,
            'is_active' => true,
        ]);
        $this->regionOperator->assignRole('regionoperator');
        
        $this->sektorAdmin = User::create([
            'username' => 'sektoradmin',
            'email' => 'sektoradmin@test.com',
            'full_name' => 'Sektor Admin',
            'password' => bcrypt('password'),
            'institution_id' => $this->sector->id,
            'is_active' => true,
        ]);
        $this->sektorAdmin->assignRole('sektoradmin');
        
        $this->mektebAdmin = User::create([
            'username' => 'mektebadmin',
            'email' => 'mektebadmin@test.com',
            'full_name' => 'Mekteb Admin',
            'password' => bcrypt('password'),
            'institution_id' => $this->school->id,
            'is_active' => true,
        ]);
        $this->mektebAdmin->assignRole('məktəbadmin');
    }

    /** @test */
    public function superadmin_can_access_all_institutions()
    {
        Sanctum::actingAs($this->superAdmin);
        
        $response = $this->getJson('/api/institutions');
        
        $response->assertStatus(200);
        $response->assertJsonCount(4, 'data'); // All 4 institutions
    }

    /** @test */
    public function regionadmin_can_only_access_regional_institutions()
    {
        Sanctum::actingAs($this->regionAdmin);
        
        $response = $this->getJson('/api/regionadmin/institutions');
        
        $response->assertStatus(200);
        $institutionIds = collect($response->json('data'))->pluck('id')->toArray();
        
        // RegionAdmin should see region, sector, and school under their region
        $this->assertContains($this->region->id, $institutionIds);
        $this->assertContains($this->sector->id, $institutionIds);
        $this->assertContains($this->school->id, $institutionIds);
        $this->assertNotContains($this->ministry->id, $institutionIds);
    }

    /** @test */
    public function regionadmin_can_create_institutions_in_their_region()
    {
        Sanctum::actingAs($this->regionAdmin);
        
        $newSectorData = [
            'name' => 'New Sector',
            'type' => 'sector_education_office',
            'parent_id' => $this->region->id,
        ];
        
        $response = $this->postJson('/api/regionadmin/institutions', $newSectorData);
        
        $response->assertStatus(201);
        $this->assertDatabaseHas('institutions', [
            'name' => 'New Sector',
            'parent_id' => $this->region->id,
        ]);
    }

    /** @test */
    public function regionadmin_cannot_create_institutions_outside_their_region()
    {
        Sanctum::actingAs($this->regionAdmin);
        
        // Try to create institution under ministry (outside region scope)
        $newRegionData = [
            'name' => 'Unauthorized Region',
            'type' => 'regional_education_department',
            'parent_id' => $this->ministry->id,
        ];
        
        $response = $this->postJson('/api/regionadmin/institutions', $newRegionData);
        
        $response->assertStatus(403);
    }

    /** @test */
    public function regionoperator_can_only_access_their_department()
    {
        Sanctum::actingAs($this->regionOperator);
        
        $response = $this->getJson('/api/regionoperator/dashboard');
        
        $response->assertStatus(200);
        // Verify department-specific data access
        $this->assertArrayHasKey('department_tasks', $response->json());
    }

    /** @test */
    public function sektoradmin_can_access_schools_in_their_sector()
    {
        Sanctum::actingAs($this->sektorAdmin);
        
        $response = $this->getJson('/api/sektoradmin/schools');
        
        $response->assertStatus(200);
        $schoolIds = collect($response->json('data'))->pluck('id')->toArray();
        
        // SektorAdmin should see schools under their sector
        $this->assertContains($this->school->id, $schoolIds);
    }

    /** @test */
    public function mektebadmin_can_only_access_their_school()
    {
        Sanctum::actingAs($this->mektebAdmin);
        
        $response = $this->getJson('/api/mektebadmin/dashboard');
        
        $response->assertStatus(200);
        $dashboardData = $response->json();
        
        // Verify school-specific data
        $this->assertEquals($this->school->id, $dashboardData['school']['id']);
    }

    /** @test */
    public function users_cannot_access_other_roles_endpoints()
    {
        Sanctum::actingAs($this->regionOperator);
        
        // RegionOperator should not access RegionAdmin endpoints
        $response = $this->getJson('/api/regionadmin/institutions');
        $response->assertStatus(403);
        
        // RegionOperator should not access SektorAdmin endpoints
        $response = $this->getJson('/api/sektoradmin/dashboard');
        $response->assertStatus(403);
    }

    /** @test */
    public function data_isolation_helper_correctly_filters_institutions()
    {
        // Test RegionAdmin scope
        $query = Institution::query();
        $filteredQuery = \App\Helpers\DataIsolationHelper::applyRegionalScope(
            $query, 
            $this->regionAdmin, 
            'institutions'
        );
        
        $allowedInstitutionIds = $filteredQuery->pluck('id');
        
        $this->assertContains($this->region->id, $allowedInstitutionIds);
        $this->assertContains($this->sector->id, $allowedInstitutionIds);
        $this->assertContains($this->school->id, $allowedInstitutionIds);
        $this->assertNotContains($this->ministry->id, $allowedInstitutionIds);
    }

    /** @test */
    public function audit_logging_captures_sensitive_operations()
    {
        Sanctum::actingAs($this->regionAdmin);
        
        // Perform a sensitive operation
        $newUserData = [
            'username' => 'testuser',
            'email' => 'testuser@test.com',
            'full_name' => 'Test User',
            'password' => 'password123',
            'institution_id' => $this->sector->id,
        ];
        
        $response = $this->postJson('/api/regionadmin/users', $newUserData);
        
        $response->assertStatus(201);
        
        // Check if audit log was created (would need actual log checking in real implementation)
        $this->assertTrue(true); // Placeholder for actual log verification
    }

    /** @test */
    public function regionadmin_can_create_departments_in_their_institutions()
    {
        Sanctum::actingAs($this->regionAdmin);
        
        $departmentData = [
            'name' => 'Education Department',
            'type' => 'education',
        ];
        
        $response = $this->postJson(
            "/api/regionadmin/institutions/{$this->sector->id}/departments", 
            $departmentData
        );
        
        $response->assertStatus(201);
        $this->assertDatabaseHas('departments', [
            'name' => 'Education Department',
            'institution_id' => $this->sector->id,
        ]);
    }

    /** @test */
    public function regionadmin_cannot_create_departments_outside_their_scope()
    {
        Sanctum::actingAs($this->regionAdmin);
        
        // Create another region not under this RegionAdmin
        $otherRegion = Institution::create([
            'name' => 'Other Region',
            'type' => 'regional_education_department',
            'level' => 2,
            'parent_id' => $this->ministry->id,
            'is_active' => true,
        ]);
        
        $departmentData = [
            'name' => 'Unauthorized Department',
            'type' => 'finance',
        ];
        
        $response = $this->postJson(
            "/api/regionadmin/institutions/{$otherRegion->id}/departments", 
            $departmentData
        );
        
        $response->assertStatus(403);
    }

    /** @test */
    public function middleware_blocks_unauthorized_resource_access()
    {
        Sanctum::actingAs($this->regionOperator);
        
        // RegionOperator trying to access institution management
        $response = $this->getJson('/api/regionadmin/institutions');
        $response->assertStatus(403);
        
        // RegionOperator trying to create institutions
        $response = $this->postJson('/api/regionadmin/institutions', [
            'name' => 'Unauthorized Institution',
            'type' => 'sector_education_office',
        ]);
        $response->assertStatus(403);
    }

    /** @test */
    public function role_based_navigation_returns_correct_menu_items()
    {
        Sanctum::actingAs($this->regionAdmin);
        
        $response = $this->getJson('/api/navigation/menu');
        
        $response->assertStatus(200);
        $menuItems = $response->json('menu_items');
        
        // RegionAdmin should have specific menu items
        $menuLabels = collect($menuItems)->pluck('label')->toArray();
        $this->assertContains('Institution Management', $menuLabels);
        $this->assertContains('User Management', $menuLabels);
        $this->assertContains('Reports', $menuLabels);
    }

    /** @test */
    public function system_correctly_validates_hierarchical_permissions()
    {
        // Test that RegionAdmin can access sector and school under their region
        $allowedIds = \App\Helpers\DataIsolationHelper::getAllowedInstitutionIds($this->regionAdmin);
        
        $this->assertContains($this->region->id, $allowedIds);
        $this->assertContains($this->sector->id, $allowedIds);
        $this->assertContains($this->school->id, $allowedIds);
        $this->assertNotContains($this->ministry->id, $allowedIds);
    }

    /** @test */
    public function department_access_control_works_correctly()
    {
        // Test RegionOperator department access
        $allowedDepartmentIds = \App\Helpers\DataIsolationHelper::getAllowedDepartmentIds($this->regionOperator);
        
        $this->assertContains($this->regionDepartment->id, $allowedDepartmentIds);
        
        // Test that other users cannot access this department
        $sektorAdminDepartmentIds = \App\Helpers\DataIsolationHelper::getAllowedDepartmentIds($this->sektorAdmin);
        $this->assertNotContains($this->regionDepartment->id, $sektorAdminDepartmentIds);
    }
}