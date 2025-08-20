<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Illuminate\Support\Facades\Log;

class InstitutionCreationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    /**
     * Test complete institution creation workflow with detailed logging
     */
    public function test_complete_institution_creation_workflow()
    {
        Log::info('=== Starting Institution Creation Test ===');
        
        // Create superadmin user
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        $superadmin->givePermissionTo('institutions.create');
        
        Log::info('Created superadmin user', [
            'user_id' => $superadmin->id,
            'username' => $superadmin->username,
            'roles' => $superadmin->getRoleNames(),
            'permissions' => $superadmin->getAllPermissions()->pluck('name')
        ]);

        Sanctum::actingAs($superadmin);

        // Test 1: Create Ministry (Level 1)
        Log::info('--- Test 1: Creating Ministry ---');
        $ministryData = [
            'name' => 'Azərbaycan Respublikası Təhsil Nazirliyi',
            'short_name' => 'TN',
            'type' => 'ministry',
            'level' => 1,
            'region_code' => 'AZ-BA',
            'is_active' => true,
            'established_date' => '1991-10-18'
        ];

        Log::info('Ministry creation data:', $ministryData);

        $response = $this->postJson('/api/institutions', $ministryData);
        
        Log::info('Ministry creation response:', [
            'status' => $response->getStatusCode(),
            'headers' => $response->headers->all(),
            'content' => $response->getContent()
        ]);

        $response->assertStatus(201);
        $ministry = Institution::where('name', $ministryData['name'])->first();
        
        $this->assertNotNull($ministry);
        $this->assertEquals('ministry', $ministry->type);
        $this->assertEquals(1, $ministry->level);
        $this->assertNull($ministry->parent_id);

        Log::info('Ministry created successfully', [
            'ministry_id' => $ministry->id,
            'institution_code' => $ministry->institution_code,
            'hierarchy_path' => $ministry->hierarchy_path
        ]);

        // Test 2: Create Regional Office (Level 2)
        Log::info('--- Test 2: Creating Regional Office ---');
        $regionData = [
            'name' => 'Bakı Şəhər Təhsil İdarəsi',
            'short_name' => 'BTİ',
            'type' => 'region',
            'level' => 2,
            'parent_id' => $ministry->id,
            'region_code' => 'AZ-BA',
            'is_active' => true,
            'established_date' => '1995-01-15'
        ];

        Log::info('Regional office creation data:', $regionData);

        $response = $this->postJson('/api/institutions', $regionData);
        
        Log::info('Regional office creation response:', [
            'status' => $response->getStatusCode(),
            'content' => $response->getContent()
        ]);

        $response->assertStatus(201);
        $region = Institution::where('name', $regionData['name'])->first();
        
        $this->assertNotNull($region);
        $this->assertEquals('region', $region->type);
        $this->assertEquals(2, $region->level);
        $this->assertEquals($ministry->id, $region->parent_id);

        Log::info('Regional office created successfully', [
            'region_id' => $region->id,
            'parent_id' => $region->parent_id,
            'hierarchy_path' => $region->hierarchy_path
        ]);

        // Test 3: Create Sector (Level 3)
        Log::info('--- Test 3: Creating Sector ---');
        $sectorData = [
            'name' => 'Ümumi Təhsil Sektoru',
            'short_name' => 'ÜTS',
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $region->id,
            'region_code' => 'AZ-BA',
            'is_active' => true,
            'established_date' => '2000-09-01'
        ];

        Log::info('Sector creation data:', $sectorData);

        $response = $this->postJson('/api/institutions', $sectorData);
        
        Log::info('Sector creation response:', [
            'status' => $response->getStatusCode(),
            'content' => $response->getContent()
        ]);

        $response->assertStatus(201);
        $sector = Institution::where('name', $sectorData['name'])->first();
        
        $this->assertNotNull($sector);
        $this->assertEquals('sektor', $sector->type);
        $this->assertEquals(3, $sector->level);
        $this->assertEquals($region->id, $sector->parent_id);

        Log::info('Sector created successfully', [
            'sector_id' => $sector->id,
            'parent_id' => $sector->parent_id,
            'hierarchy_path' => $sector->hierarchy_path
        ]);

        // Test 4: Create School (Level 4)
        Log::info('--- Test 4: Creating School ---');
        $schoolData = [
            'name' => '153 nömrəli tam orta məktəb',
            'short_name' => '153 Məktəb',
            'type' => 'school',
            'level' => 4,
            'parent_id' => $sector->id,
            'region_code' => 'AZ-BA',
            'is_active' => true,
            'established_date' => '1965-09-01'
        ];

        Log::info('School creation data:', $schoolData);

        $response = $this->postJson('/api/institutions', $schoolData);
        
        Log::info('School creation response:', [
            'status' => $response->getStatusCode(),
            'content' => $response->getContent()
        ]);

        $response->assertStatus(201);
        $school = Institution::where('name', $schoolData['name'])->first();
        
        $this->assertNotNull($school);
        $this->assertEquals('school', $school->type);
        $this->assertEquals(4, $school->level);
        $this->assertEquals($sector->id, $school->parent_id);

        Log::info('School created successfully', [
            'school_id' => $school->id,
            'parent_id' => $school->parent_id,
            'hierarchy_path' => $school->hierarchy_path
        ]);

        // Test 5: Test Hierarchy Endpoint
        Log::info('--- Test 5: Testing Hierarchy Endpoint ---');
        
        $hierarchyResponse = $this->getJson('/api/institutions?hierarchy=1&is_active=1');
        
        Log::info('Hierarchy endpoint response:', [
            'status' => $hierarchyResponse->getStatusCode(),
            'content' => $hierarchyResponse->getContent()
        ]);

        $hierarchyResponse->assertStatus(200);
        $hierarchyData = $hierarchyResponse->json();
        
        $this->assertArrayHasKey('institutions', $hierarchyData);
        $this->assertCount(1, $hierarchyData['institutions']); // Should have 1 root (ministry)
        
        $rootInstitution = $hierarchyData['institutions'][0];
        $this->assertEquals($ministry->id, $rootInstitution['id']);
        $this->assertEquals('ministry', $rootInstitution['type']);
        $this->assertArrayHasKey('departments', $rootInstitution);
        $this->assertArrayHasKey('children', $rootInstitution);

        Log::info('Hierarchy structure validated', [
            'root_institution_id' => $rootInstitution['id'],
            'has_departments' => count($rootInstitution['departments']),
            'has_children' => count($rootInstitution['children'])
        ]);

        // Test 6: Validate Complete Hierarchy Chain
        Log::info('--- Test 6: Validating Complete Hierarchy Chain ---');
        
        $this->assertEquals($ministry->id, $rootInstitution['id']);
        
        if (count($rootInstitution['children']) > 0) {
            $regionInHierarchy = $rootInstitution['children'][0];
            $this->assertEquals($region->id, $regionInHierarchy['id']);
            
            if (count($regionInHierarchy['children']) > 0) {
                $sectorInHierarchy = $regionInHierarchy['children'][0];
                $this->assertEquals($sector->id, $sectorInHierarchy['id']);
                
                if (count($sectorInHierarchy['children']) > 0) {
                    $schoolInHierarchy = $sectorInHierarchy['children'][0];
                    $this->assertEquals($school->id, $schoolInHierarchy['id']);
                }
            }
        }

        Log::info('Complete hierarchy chain validated successfully');
        Log::info('=== Institution Creation Test Completed Successfully ===');
    }

    /**
     * Test department creation with institution
     */
    public function test_institution_with_departments_creation()
    {
        Log::info('=== Starting Institution with Departments Test ===');
        
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        $superadmin->givePermissionTo(['institutions.create', 'institutions.read']);
        
        Sanctum::actingAs($superadmin);

        // First create a ministry as parent
        $ministryData = [
            'name' => 'Test Ministry',
            'short_name' => 'TM',
            'type' => 'ministry',
            'level' => 1,
            'is_active' => true
        ];

        $ministryResponse = $this->postJson('/api/institutions', $ministryData);
        $ministryResponse->assertStatus(201);
        $ministry = Institution::where('name', $ministryData['name'])->first();

        // Create a regional office
        $regionData = [
            'name' => 'Test Regional Office',
            'short_name' => 'TRO',
            'type' => 'region',
            'level' => 2,
            'parent_id' => $ministry->id,
            'is_active' => true
        ];

        $response = $this->postJson('/api/institutions', $regionData);
        $response->assertStatus(201);
        
        $region = Institution::where('name', $regionData['name'])->first();
        
        Log::info('Regional office created for department test', [
            'region_id' => $region->id,
            'name' => $region->name
        ]);

        // Create departments for this institution
        $departmentData = [
            'name' => 'Maliyyə Şöbəsi',
            'short_name' => 'MS',
            'department_type' => 'maliyyə',
            'institution_id' => $region->id,
            'is_active' => true
        ];

        $deptResponse = $this->postJson('/api/departments', $departmentData);
        
        Log::info('Department creation response:', [
            'status' => $deptResponse->getStatusCode(),
            'content' => $deptResponse->getContent()
        ]);

        $deptResponse->assertStatus(201);

        // Test hierarchy with departments
        $hierarchyResponse = $this->getJson('/api/institutions?hierarchy=1&is_active=1');
        $hierarchyResponse->assertStatus(200);
        
        $hierarchyData = $hierarchyResponse->json();
        
        Log::info('Hierarchy with departments response:', [
            'institution_count' => count($hierarchyData['institutions']),
            'first_institution_departments' => isset($hierarchyData['institutions'][0]['departments']) ? count($hierarchyData['institutions'][0]['departments']) : 0
        ]);

        Log::info('=== Institution with Departments Test Completed ===');
    }

    /**
     * Test institution creation validation
     */
    public function test_institution_creation_validation()
    {
        Log::info('=== Starting Institution Creation Validation Test ===');
        
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        $superadmin->givePermissionTo('institutions.create');
        
        Sanctum::actingAs($superadmin);

        // Test invalid data
        $invalidData = [
            'name' => '', // Empty name
            'type' => 'invalid_type',
            'level' => 10 // Invalid level
        ];

        Log::info('Testing validation with invalid data:', $invalidData);

        $response = $this->postJson('/api/institutions', $invalidData);
        
        Log::info('Validation response:', [
            'status' => $response->getStatusCode(),
            'content' => $response->getContent()
        ]);

        $response->assertStatus(422); // Validation error
        $response->assertJsonValidationErrors(['name', 'type', 'level']);

        Log::info('Validation test completed - errors caught as expected');
        Log::info('=== Institution Creation Validation Test Completed ===');
    }
}