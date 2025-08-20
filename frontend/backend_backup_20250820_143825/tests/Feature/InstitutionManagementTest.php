<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use App\Models\Department;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InstitutionManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    /**
     * Test institution hierarchy creation and validation
     */
    public function test_institution_hierarchy_creation_and_validation()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        Sanctum::actingAs($superadmin);

        // Create ministry (level 1)
        $ministry = Institution::factory()->create([
            'name' => 'Təhsil Nazirliyi',
            'type' => 'ministry',
            'level' => 1,
            'parent_id' => null
        ]);

        // Create regional institution (level 2)
        $regionalData = [
            'name' => 'Bakı Şəhər Təhsil İdarəsi',
            'type' => 'region',
            'level' => 2,
            'parent_id' => $ministry->id,
            'region_code' => 'BAKU',
            'is_active' => true
        ];

        $response = $this->postJson('/api/institutions', $regionalData);
        $response->assertStatus(201);

        $regional = Institution::where('name', 'Bakı Şəhər Təhsil İdarəsi')->first();

        // Create sector institution (level 3)
        $sectorData = [
            'name' => 'Yasamal Rayon Təhsil Sektoru',
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $regional->id,
            'is_active' => true
        ];

        $response = $this->postJson('/api/institutions', $sectorData);
        $response->assertStatus(201);

        $sector = Institution::where('name', 'Yasamal Rayon Təhsil Sektoru')->first();

        // Create school (level 4)
        $schoolData = [
            'name' => '1 nömrəli məktəb',
            'type' => 'school',
            'level' => 4,
            'parent_id' => $sector->id,
            'is_active' => true
        ];

        $response = $this->postJson('/api/institutions', $schoolData);
        $response->assertStatus(201);

        // Test hierarchy relationships
        $school = Institution::where('name', '1 nömrəli məktəb')->first();
        $this->assertEquals($sector->id, $school->parent_id);
        $this->assertEquals($regional->id, $sector->parent_id);
        $this->assertEquals($ministry->id, $regional->parent_id);

        // Test getAllChildrenIds method
        $allChildrenIds = $regional->getAllChildrenIds();
        $this->assertContains($regional->id, $allChildrenIds);
        $this->assertContains($sector->id, $allChildrenIds);
        $this->assertContains($school->id, $allChildrenIds);
    }

    /**
     * Test institution hierarchy listing with proper nesting
     */
    public function test_institution_hierarchy_listing()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        Sanctum::actingAs($superadmin);

        // Create a more complex hierarchy
        $ministry = Institution::factory()->create([
            'type' => 'ministry',
            'level' => 1,
            'parent_id' => null
        ]);

        $region1 = Institution::factory()->create([
            'type' => 'region',
            'level' => 2,
            'parent_id' => $ministry->id
        ]);

        $region2 = Institution::factory()->create([
            'type' => 'region',
            'level' => 2,
            'parent_id' => $ministry->id
        ]);

        $sector1 = Institution::factory()->create([
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $region1->id
        ]);

        $sector2 = Institution::factory()->create([
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $region1->id
        ]);

        $school1 = Institution::factory()->create([
            'type' => 'school',
            'level' => 4,
            'parent_id' => $sector1->id
        ]);

        $school2 = Institution::factory()->create([
            'type' => 'school',
            'level' => 4,
            'parent_id' => $sector1->id
        ]);

        // Test hierarchy endpoint
        $response = $this->getJson('/api/institutions?hierarchy=1');
        $response->assertStatus(200);

        $data = $response->json();
        $this->assertIsArray($data);

        // Should have ministry at root level
        $ministryData = collect($data)->firstWhere('id', $ministry->id);
        $this->assertNotNull($ministryData);
        $this->assertEquals('ministry', $ministryData['type']);

        // Test filtering by level
        $response = $this->getJson('/api/institutions?level=2');
        $response->assertStatus(200);

        $levelData = $response->json();
        $this->assertCount(2, $levelData['data']); // Should have 2 regions

        // Test filtering by parent
        $response = $this->getJson("/api/institutions?parent_id={$region1->id}");
        $response->assertStatus(200);

        $parentData = $response->json();
        $this->assertCount(2, $parentData['data']); // Should have 2 sectors
    }

    /**
     * Test regionadmin access control for institutions
     */
    public function test_regionadmin_access_control()
    {
        $region1 = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $region2 = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $sector1 = Institution::factory()->create([
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $region1->id
        ]);

        $sector2 = Institution::factory()->create([
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $region2->id
        ]);

        $regionadmin = User::factory()->create([
            'institution_id' => $region1->id
        ]);
        $regionadmin->assignRole('regionadmin');

        Sanctum::actingAs($regionadmin);

        // Should be able to view own institution
        $response = $this->getJson("/api/institutions/{$region1->id}");
        $response->assertStatus(200);

        // Should be able to view child institutions
        $response = $this->getJson("/api/institutions/{$sector1->id}");
        $response->assertStatus(200);

        // Should NOT be able to view other region's institutions
        $response = $this->getJson("/api/institutions/{$region2->id}");
        $response->assertStatus(403);

        // Should NOT be able to view other region's sectors
        $response = $this->getJson("/api/institutions/{$sector2->id}");
        $response->assertStatus(403);

        // Should be able to create child institutions
        $schoolData = [
            'name' => 'Test School',
            'type' => 'school',
            'level' => 4,
            'parent_id' => $sector1->id,
            'is_active' => true
        ];

        $response = $this->postJson('/api/institutions', $schoolData);
        $response->assertStatus(201);

        // Should NOT be able to create institutions in other regions
        $invalidSchoolData = [
            'name' => 'Invalid School',
            'type' => 'school',
            'level' => 4,
            'parent_id' => $sector2->id,
            'is_active' => true
        ];

        $response = $this->postJson('/api/institutions', $invalidSchoolData);
        $response->assertStatus(403);
    }

    /**
     * Test institution with departments relationship
     */
    public function test_institution_with_departments()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');

        $institution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $dept1 = Department::factory()->create([
            'name' => 'Maliyyə Şöbəsi',
            'department_type' => 'maliyyə',
            'institution_id' => $institution->id,
            'is_active' => true
        ]);

        $dept2 = Department::factory()->create([
            'name' => 'İnzibati Şöbəsi',
            'department_type' => 'inzibati',
            'institution_id' => $institution->id,
            'is_active' => true
        ]);

        Sanctum::actingAs($superadmin);

        // Test institution with departments
        $response = $this->getJson("/api/institutions/{$institution->id}?include=departments");
        $response->assertStatus(200)
            ->assertJsonCount(2, 'departments')
            ->assertJsonFragment([
                'name' => 'Maliyyə Şöbəsi',
                'department_type' => 'maliyyə'
            ])
            ->assertJsonFragment([
                'name' => 'İnzibati Şöbəsi',
                'department_type' => 'inzibati'
            ]);

        // Test departments relationship
        $this->assertCount(2, $institution->departments);
        $this->assertTrue($institution->departments->contains('id', $dept1->id));
        $this->assertTrue($institution->departments->contains('id', $dept2->id));
    }

    /**
     * Test institution statistics and metrics
     */
    public function test_institution_statistics()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');

        $region = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $sector1 = Institution::factory()->create([
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $region->id
        ]);

        $sector2 = Institution::factory()->create([
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $region->id
        ]);

        $school1 = Institution::factory()->create([
            'type' => 'school',
            'level' => 4,
            'parent_id' => $sector1->id
        ]);

        $school2 = Institution::factory()->create([
            'type' => 'school',
            'level' => 4,
            'parent_id' => $sector1->id
        ]);

        $school3 = Institution::factory()->create([
            'type' => 'school',
            'level' => 4,
            'parent_id' => $sector2->id
        ]);

        // Create some departments
        Department::factory()->create([
            'institution_id' => $region->id,
            'department_type' => 'maliyyə',
            'is_active' => true
        ]);

        Department::factory()->create([
            'institution_id' => $region->id,
            'department_type' => 'inzibati',
            'is_active' => true
        ]);

        Department::factory()->create([
            'institution_id' => $school1->id,
            'department_type' => 'müəllim',
            'is_active' => true
        ]);

        Sanctum::actingAs($superadmin);

        // Test statistics endpoint
        $response = $this->getJson('/api/institutions/statistics');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_institutions',
                'by_type' => [
                    'ministry',
                    'region',
                    'sektor',
                    'school'
                ],
                'by_level',
                'active_institutions',
                'total_departments'
            ]);

        $stats = $response->json();
        $this->assertEquals(6, $stats['total_institutions']); // 1 region + 2 sectors + 3 schools
        $this->assertEquals(1, $stats['by_type']['region']);
        $this->assertEquals(2, $stats['by_type']['sektor']);
        $this->assertEquals(3, $stats['by_type']['school']);
        $this->assertEquals(3, $stats['total_departments']);
    }

    /**
     * Test institution deletion with cascade validation
     */
    public function test_institution_deletion_with_cascade_validation()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');

        $region = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $sector = Institution::factory()->create([
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $region->id
        ]);

        $school = Institution::factory()->create([
            'type' => 'school',
            'level' => 4,
            'parent_id' => $sector->id
        ]);

        // Create department
        $department = Department::factory()->create([
            'institution_id' => $region->id,
            'department_type' => 'maliyyə'
        ]);

        Sanctum::actingAs($superadmin);

        // Should not be able to delete institution with children
        $response = $this->deleteJson("/api/institutions/{$region->id}");
        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Cannot delete institution with child institutions'
            ]);

        // Should not be able to delete institution with departments
        $response = $this->deleteJson("/api/institutions/{$school->id}");
        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Cannot delete institution with departments'
            ]);

        // Delete department first
        $this->deleteJson("/api/departments/{$department->id}");

        // Delete from bottom up
        $response = $this->deleteJson("/api/institutions/{$school->id}");
        $response->assertStatus(200);

        $response = $this->deleteJson("/api/institutions/{$sector->id}");
        $response->assertStatus(200);

        $response = $this->deleteJson("/api/institutions/{$region->id}");
        $response->assertStatus(200);

        // Verify deletions
        $this->assertDatabaseMissing('institutions', ['id' => $school->id]);
        $this->assertDatabaseMissing('institutions', ['id' => $sector->id]);
        $this->assertDatabaseMissing('institutions', ['id' => $region->id]);
    }

    /**
     * Test institution status toggle
     */
    public function test_institution_status_toggle()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');

        $institution = Institution::factory()->create([
            'is_active' => true
        ]);

        Sanctum::actingAs($superadmin);

        // Toggle to inactive
        $response = $this->patchJson("/api/institutions/{$institution->id}/toggle-status");
        $response->assertStatus(200)
            ->assertJsonFragment([
                'is_active' => false
            ]);

        $this->assertDatabaseHas('institutions', [
            'id' => $institution->id,
            'is_active' => false
        ]);

        // Toggle back to active
        $response = $this->patchJson("/api/institutions/{$institution->id}/toggle-status");
        $response->assertStatus(200)
            ->assertJsonFragment([
                'is_active' => true
            ]);

        $this->assertDatabaseHas('institutions', [
            'id' => $institution->id,
            'is_active' => true
        ]);
    }

    /**
     * Test institution search functionality
     */
    public function test_institution_search()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');

        $institution1 = Institution::factory()->create([
            'name' => 'Bakı Şəhər Təhsil İdarəsi',
            'type' => 'region',
            'institution_code' => 'BAKU001'
        ]);

        $institution2 = Institution::factory()->create([
            'name' => 'Gəncə Şəhər Təhsil İdarəsi',
            'type' => 'region',
            'institution_code' => 'GANJE001'
        ]);

        $institution3 = Institution::factory()->create([
            'name' => 'Yasamal Rayon Təhsil Sektoru',
            'type' => 'sektor',
            'institution_code' => 'YASAMAL001'
        ]);

        Sanctum::actingAs($superadmin);

        // Search by name
        $response = $this->getJson('/api/institutions?search=Bakı');
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['name' => 'Bakı Şəhər Təhsil İdarəsi']);

        // Search by code
        $response = $this->getJson('/api/institutions?search=GANJE');
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['institution_code' => 'GANJE001']);

        // Search by type
        $response = $this->getJson('/api/institutions?type=region');
        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');

        // Combined search
        $response = $this->getJson('/api/institutions?search=Təhsil&type=region');
        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }
}