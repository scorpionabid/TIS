<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DepartmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    /**
     * Test superadmin can create department
     */
    public function test_superadmin_can_create_department()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        
        $institution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2,
            'is_active' => true
        ]);

        Sanctum::actingAs($superadmin);

        $departmentData = [
            'name' => 'Test Maliyyə Şöbəsi',
            'short_name' => 'Maliyyə',
            'department_type' => 'maliyyə',
            'institution_id' => $institution->id,
            'description' => 'Regional finance department',
            'functional_scope' => 'Budget management and financial oversight',
            'capacity' => 25,
            'budget_allocation' => 150000.00,
            'is_active' => true
        ];

        $response = $this->postJson('/api/departments', $departmentData);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'name' => 'Test Maliyyə Şöbəsi',
                'department_type' => 'maliyyə',
                'institution_id' => $institution->id
            ]);

        $this->assertDatabaseHas('departments', [
            'name' => 'Test Maliyyə Şöbəsi',
            'department_type' => 'maliyyə',
            'institution_id' => $institution->id,
            'capacity' => 25
        ]);
    }

    /**
     * Test department creation with invalid type for institution
     */
    public function test_department_creation_with_invalid_type_for_institution()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        
        $schoolInstitution = Institution::factory()->create([
            'type' => 'school',
            'level' => 4,
            'is_active' => true
        ]);

        Sanctum::actingAs($superadmin);

        $departmentData = [
            'name' => 'Invalid Department',
            'department_type' => 'maliyyə', // Regional type for school institution
            'institution_id' => $schoolInstitution->id,
            'is_active' => true
        ];

        $response = $this->postJson('/api/departments', $departmentData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['department_type']);
    }

    /**
     * Test regionadmin can create department for their institution
     */
    public function test_regionadmin_can_create_department_for_their_institution()
    {
        $institution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2,
            'is_active' => true
        ]);

        $regionadmin = User::factory()->create([
            'institution_id' => $institution->id
        ]);
        $regionadmin->assignRole('regionadmin');

        Sanctum::actingAs($regionadmin);

        $departmentData = [
            'name' => 'İnzibati Şöbəsi',
            'department_type' => 'inzibati',
            'institution_id' => $institution->id,
            'is_active' => true
        ];

        $response = $this->postJson('/api/departments', $departmentData);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'name' => 'İnzibati Şöbəsi',
                'department_type' => 'inzibati'
            ]);
    }

    /**
     * Test regionadmin cannot create department for other institution
     */
    public function test_regionadmin_cannot_create_department_for_other_institution()
    {
        $userInstitution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $otherInstitution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $regionadmin = User::factory()->create([
            'institution_id' => $userInstitution->id
        ]);
        $regionadmin->assignRole('regionadmin');

        Sanctum::actingAs($regionadmin);

        $departmentData = [
            'name' => 'Unauthorized Department',
            'department_type' => 'maliyyə',
            'institution_id' => $otherInstitution->id,
            'is_active' => true
        ];

        $response = $this->postJson('/api/departments', $departmentData);

        $response->assertStatus(403);
    }

    /**
     * Test regular user cannot create department
     */
    public function test_regular_user_cannot_create_department()
    {
        $user = User::factory()->create();
        $user->assignRole('müəllim');

        $institution = Institution::factory()->create();

        Sanctum::actingAs($user);

        $departmentData = [
            'name' => 'Unauthorized Department',
            'department_type' => 'general',
            'institution_id' => $institution->id,
            'is_active' => true
        ];

        $response = $this->postJson('/api/departments', $departmentData);

        $response->assertStatus(403);
    }

    /**
     * Test department listing with filters
     */
    public function test_department_listing_with_filters()
    {
        $institution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        $superadmin->givePermissionTo('institutions.read');

        $activeDept = Department::create([
            'name' => 'Active Maliyyə',
            'department_type' => 'maliyyə',
            'institution_id' => $institution->id,
            'is_active' => true
        ]);

        $inactiveDept = Department::create([
            'name' => 'Inactive İnzibati',
            'department_type' => 'inzibati',
            'institution_id' => $institution->id,
            'is_active' => false
        ]);

        Sanctum::actingAs($superadmin);

        // Test listing all departments
        $response = $this->getJson('/api/departments');
        $response->assertStatus(200);

        // Test filtering by institution
        $response = $this->getJson("/api/departments?institution_id={$institution->id}");
        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');

        // Test filtering by active status
        $response = $this->getJson("/api/departments?is_active=1&institution_id={$institution->id}");
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');

        // Test filtering by type
        $response = $this->getJson("/api/departments?department_type=maliyyə&institution_id={$institution->id}");
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');

        // Test search by name
        $response = $this->getJson("/api/departments?search=maliyyə&institution_id={$institution->id}");
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    /**
     * Test department update
     */
    public function test_department_update()
    {
        $institution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');

        $department = Department::factory()->create([
            'name' => 'Original Name',
            'department_type' => 'maliyyə',
            'institution_id' => $institution->id,
            'capacity' => 20,
            'budget_allocation' => 100000.00
        ]);

        Sanctum::actingAs($superadmin);

        $updateData = [
            'name' => 'Updated Department Name',
            'capacity' => 30,
            'budget_allocation' => 150000.00,
            'description' => 'Updated description'
        ];

        $response = $this->putJson("/api/departments/{$department->id}", $updateData);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'name' => 'Updated Department Name',
                'capacity' => 30
            ]);

        $this->assertDatabaseHas('departments', [
            'id' => $department->id,
            'name' => 'Updated Department Name',
            'capacity' => 30
        ]);
    }

    /**
     * Test department deletion
     */
    public function test_department_deletion()
    {
        $institution = Institution::factory()->create();
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        // Create the missing permission for testing
        $permission = \Spatie\Permission\Models\Permission::firstOrCreate([
            'name' => 'institutions.delete',
            'guard_name' => 'api'
        ]);
        $superadmin->givePermissionTo($permission);

        $department = Department::factory()->create([
            'institution_id' => $institution->id
        ]);

        Sanctum::actingAs($superadmin);

        $response = $this->deleteJson("/api/departments/{$department->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('departments', [
            'id' => $department->id
        ]);
    }

    /**
     * Test department show
     */
    public function test_department_show()
    {
        $institution = Institution::factory()->create();
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');

        $department = Department::factory()->create([
            'name' => 'Test Department',
            'department_type' => 'maliyyə',
            'institution_id' => $institution->id,
            'description' => 'Test description',
            'capacity' => 25
        ]);

        Sanctum::actingAs($superadmin);

        $response = $this->getJson("/api/departments/{$department->id}");

        $response->assertStatus(200)
            ->assertJsonFragment([
                'id' => $department->id,
                'name' => 'Test Department',
                'department_type' => 'maliyyə',
                'capacity' => 25
            ])
            ->assertJsonStructure([
                'id',
                'name',
                'short_name',
                'department_type',
                'institution_id',
                'description',
                'capacity',
                'budget_allocation',
                'is_active',
                'created_at',
                'updated_at',
                'institution' => [
                    'id',
                    'name',
                    'type'
                ]
            ]);
    }

    /**
     * Test get department types for institution
     */
    public function test_get_department_types_for_institution()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');

        $regionalInstitution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $schoolInstitution = Institution::factory()->create([
            'type' => 'school',
            'level' => 4
        ]);

        Sanctum::actingAs($superadmin);

        // Test regional institution types
        $response = $this->getJson("/api/departments/types/institution?institution_id={$regionalInstitution->id}");
        $response->assertStatus(200);
        
        $data = $response->json();
        $types = $data['types'];
        $this->assertContains('maliyyə', array_keys($types));
        $this->assertContains('inzibati', array_keys($types));
        $this->assertContains('təsərrüfat', array_keys($types));

        // Test school institution types
        $response = $this->getJson("/api/departments/types/institution?institution_id={$schoolInstitution->id}");
        $response->assertStatus(200);
        
        $data = $response->json();
        $types = $data['types'];
        $this->assertContains('müavin', array_keys($types));
        $this->assertContains('ubr', array_keys($types));
        $this->assertContains('müəllim', array_keys($types));
        $this->assertContains('psixoloq', array_keys($types));
    }

    /**
     * Test department creation with parent department
     */
    public function test_department_creation_with_parent_department()
    {
        $institution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');

        $parentDept = Department::factory()->create([
            'name' => 'Parent Department',
            'department_type' => 'maliyyə',
            'institution_id' => $institution->id
        ]);

        Sanctum::actingAs($superadmin);

        $departmentData = [
            'name' => 'Child Department',
            'department_type' => 'general',
            'institution_id' => $institution->id,
            'parent_department_id' => $parentDept->id,
            'is_active' => true
        ];

        $response = $this->postJson('/api/departments', $departmentData);

        $response->assertStatus(201)
            ->assertJsonPath('department.name', 'Child Department')
            ->assertJsonPath('department.parent.id', $parentDept->id);

        $this->assertDatabaseHas('departments', [
            'name' => 'Child Department',
            'parent_department_id' => $parentDept->id,
            'institution_id' => $institution->id
        ]);
    }

    /**
     * Test department validation errors
     */
    public function test_department_validation_errors()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');

        Sanctum::actingAs($superadmin);

        // Test missing required fields
        $response = $this->postJson('/api/departments', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'department_type', 'institution_id']);

        // Test invalid department type
        $institution = Institution::factory()->create();
        $response = $this->postJson('/api/departments', [
            'name' => 'Test Department',
            'department_type' => 'invalid_type',
            'institution_id' => $institution->id
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['department_type']);

        // Test invalid institution_id
        $response = $this->postJson('/api/departments', [
            'name' => 'Test Department',
            'department_type' => 'general',
            'institution_id' => 99999
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['institution_id']);
    }

    /**
     * Test department metadata handling
     */
    public function test_department_metadata_handling()
    {
        $institution = Institution::factory()->create();
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');

        Sanctum::actingAs($superadmin);

        $departmentData = [
            'name' => 'Test Department',
            'department_type' => 'general',
            'institution_id' => $institution->id,
            'metadata' => [
                'responsibilities' => ['Budget planning', 'Resource allocation'],
                'contact_person' => 'John Doe',
                'office_location' => 'Building A, Floor 2',
                'working_hours' => '09:00-18:00'
            ],
            'is_active' => true
        ];

        $response = $this->postJson('/api/departments', $departmentData);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'metadata' => [
                    'responsibilities' => ['Budget planning', 'Resource allocation'],
                    'contact_person' => 'John Doe',
                    'office_location' => 'Building A, Floor 2',
                    'working_hours' => '09:00-18:00'
                ]
            ]);

        $this->assertDatabaseHas('departments', [
            'name' => 'Test Department'
        ]);

        // Verify metadata is stored as JSON and can be retrieved
        $department = Department::where('name', 'Test Department')->first();
        $this->assertIsArray($department->metadata);
        $this->assertEquals('John Doe', $department->metadata['contact_person']);
        $this->assertContains('Budget planning', $department->metadata['responsibilities']);
    }
}