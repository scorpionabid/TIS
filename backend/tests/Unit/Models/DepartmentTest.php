<?php

namespace Tests\Unit\Models;

use App\Models\Department;
use App\Models\Institution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DepartmentTest extends ModelTestCase
{
    use RefreshDatabase;

    /**
     * The model class being tested
     *
     * @var string
     */
    protected $modelClass = Department::class;

    /**
     * The attributes that should be tested for required fields
     *
     * @var array
     */
    protected $requiredAttributes = [
        'name',
        'department_type',
        'institution_id',
    ];

    /**
     * The attributes that should be tested for fillable fields
     *
     * @var array
     */
    protected $fillableAttributes = [
        'name',
        'short_name',
        'department_type',
        'institution_id',
        'parent_department_id',
        'description',
        'metadata',
        'capacity',
        'budget_allocation',
        'functional_scope',
        'is_active',
    ];

    /**
     * The attributes that should be tested for hidden fields
     *
     * @var array
     */
    protected $hiddenAttributes = [];

    /**
     * The attributes that should be tested for casts
     *
     * @var array
     */
    protected $casts = [
        'id' => 'int',
        'is_active' => 'boolean',
        'metadata' => 'array',
        'budget_allocation' => 'decimal:2',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\InstitutionHierarchySeeder::class);
    }

    /**
     * Test department creation with minimum required fields
     *
     * @return void
     */
    public function test_department_creation_with_minimum_required_fields()
    {
        $institution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $department = Department::create([
            'name' => 'Test Department',
            'department_type' => 'maliyyə',
            'institution_id' => $institution->id,
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('departments', [
            'name' => 'Test Department',
            'department_type' => 'maliyyə',
            'institution_id' => $institution->id,
            'is_active' => true,
        ]);
    }

    /**
     * Test department parent-child relationship
     *
     * @return void
     */
    public function test_department_parent_child_relationship()
    {
        $institution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $parent = Department::factory()->create([
            'name' => 'Parent Department',
            'department_type' => 'maliyyə',
            'institution_id' => $institution->id,
        ]);

        $child = Department::factory()->create([
            'name' => 'Child Department',
            'department_type' => 'general',
            'institution_id' => $institution->id,
            'parent_department_id' => $parent->id,
        ]);

        // Test parent relationship
        $this->assertInstanceOf(Department::class, $child->parent);
        $this->assertEquals($parent->id, $child->parent->id);

        // Test children relationship
        $this->assertTrue($parent->children->contains($child));
        $this->assertEquals($child->id, $parent->children->first()->id);
    }

    /**
     * Test department institution relationship
     *
     * @return void
     */
    public function test_department_institution_relationship()
    {
        $institution = Institution::factory()->create([
            'type' => 'school',
            'level' => 4
        ]);

        $department = Department::factory()->create([
            'name' => 'Test Department',
            'department_type' => 'müəllim',
            'institution_id' => $institution->id,
        ]);

        $this->assertInstanceOf(Institution::class, $department->institution);
        $this->assertEquals($institution->id, $department->institution->id);
    }

    /**
     * Test department type validation for institution
     *
     * @return void
     */
    public function test_department_type_validation_for_institution()
    {
        $regionalInstitution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $schoolInstitution = Institution::factory()->create([
            'type' => 'school',
            'level' => 4
        ]);

        // Test valid types for regional institution
        $validTypes = Department::getAllowedTypesForInstitution('region');
        $this->assertContains('maliyyə', $validTypes);
        $this->assertContains('inzibati', $validTypes);
        $this->assertContains('təsərrüfat', $validTypes);

        // Test valid types for school institution
        $schoolTypes = Department::getAllowedTypesForInstitution('school');
        $this->assertContains('müavin', $schoolTypes);
        $this->assertContains('ubr', $schoolTypes);
        $this->assertContains('müəllim', $schoolTypes);
        $this->assertContains('psixoloq', $schoolTypes);
    }

    /**
     * Test department type display name
     *
     * @return void
     */
    public function test_department_type_display_name()
    {
        $department = Department::factory()->create([
            'department_type' => 'maliyyə'
        ]);

        $this->assertEquals('Maliyyə Şöbəsi', $department->getTypeDisplayName());
    }

    /**
     * Test department scopes
     *
     * @return void
     */
    public function test_department_scopes()
    {
        $institution = Institution::factory()->create();

        $activeDept = Department::factory()->create([
            'institution_id' => $institution->id,
            'is_active' => true,
            'department_type' => 'maliyyə'
        ]);

        $inactiveDept = Department::factory()->create([
            'institution_id' => $institution->id,
            'is_active' => false,
            'department_type' => 'inzibati'
        ]);

        // Test active scope
        $activeDepartments = Department::active()->get();
        $this->assertTrue($activeDepartments->contains($activeDept));
        $this->assertFalse($activeDepartments->contains($inactiveDept));

        // Test byInstitution scope
        $institutionDepartments = Department::byInstitution($institution->id)->get();
        $this->assertTrue($institutionDepartments->contains($activeDept));
        $this->assertTrue($institutionDepartments->contains($inactiveDept));

        // Test byType scope
        $financeDepartments = Department::byType('maliyyə')->get();
        $this->assertTrue($financeDepartments->contains($activeDept));
        $this->assertFalse($financeDepartments->contains($inactiveDept));

        // Test roots scope
        $rootDepartments = Department::roots()->get();
        $this->assertTrue($rootDepartments->contains($activeDept));
        $this->assertTrue($rootDepartments->contains($inactiveDept));
    }

    /**
     * Test department search by name scope
     *
     * @return void
     */
    public function test_search_by_name_scope()
    {
        $dept1 = Department::factory()->create([
            'name' => 'Maliyyə Şöbəsi',
            'short_name' => 'Maliyyə'
        ]);

        $dept2 = Department::factory()->create([
            'name' => 'İnzibati Şöbəsi',
            'short_name' => 'İnzibati'
        ]);

        // Test search by full name
        $results = Department::searchByName('Maliyyə')->get();
        $this->assertTrue($results->contains($dept1));
        $this->assertFalse($results->contains($dept2));

        // Test search by short name
        $results = Department::searchByName('İnzibati')->get();
        $this->assertTrue($results->contains($dept2));
        $this->assertFalse($results->contains($dept1));

        // Test case insensitive search
        $results = Department::searchByName('maliyyə')->get();
        $this->assertTrue($results->contains($dept1));
    }

    /**
     * Test array and decimal casts
     *
     * @return void
     */
    public function test_array_and_decimal_casts()
    {
        $department = Department::create([
            'name' => 'Test Department',
            'department_type' => 'maliyyə',
            'institution_id' => Institution::factory()->create()->id,
            'metadata' => ['key' => 'value', 'setting' => true],
            'budget_allocation' => 15000.50,
            'is_active' => true,
        ]);

        $this->assertIsArray($department->metadata);
        $this->assertEquals('value', $department->metadata['key']);
        $this->assertTrue($department->metadata['setting']);
        
        $this->assertIsString($department->budget_allocation);
        $this->assertEquals('15000.50', $department->budget_allocation);
        
        $this->assertIsBool($department->is_active);
        $this->assertTrue($department->is_active);
    }

    /**
     * Test department validation for institution type
     *
     * @return void
     */
    public function test_is_valid_for_institution()
    {
        $regionalInstitution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $schoolInstitution = Institution::factory()->create([
            'type' => 'school',
            'level' => 4
        ]);

        // Valid department for regional institution
        $regionalDept = Department::factory()->create([
            'department_type' => 'maliyyə',
            'institution_id' => $regionalInstitution->id,
        ]);

        $this->assertTrue($regionalDept->isValidForInstitution());

        // Invalid department type for school institution
        $invalidDept = Department::factory()->create([
            'department_type' => 'müəllim', // School type
            'institution_id' => $regionalInstitution->id, // But regional institution
        ]);

        // This would be invalid, but our factory might create it anyway
        // In real application, this would be prevented by validation
        $this->assertFalse($invalidDept->isValidForInstitution());
    }

    /**
     * Test department constants
     *
     * @return void
     */
    public function test_department_constants()
    {
        // Test TYPES constant
        $this->assertArrayHasKey('maliyyə', Department::TYPES);
        $this->assertArrayHasKey('inzibati', Department::TYPES);
        $this->assertArrayHasKey('təsərrüfat', Department::TYPES);
        $this->assertArrayHasKey('müavin', Department::TYPES);
        $this->assertArrayHasKey('ubr', Department::TYPES);
        $this->assertArrayHasKey('psixoloq', Department::TYPES);
        $this->assertArrayHasKey('müəllim', Department::TYPES);

        // Test TYPE_GROUPS constant
        $this->assertArrayHasKey('regional', Department::TYPE_GROUPS);
        $this->assertArrayHasKey('sector', Department::TYPE_GROUPS);
        $this->assertArrayHasKey('school', Department::TYPE_GROUPS);
        $this->assertArrayHasKey('general', Department::TYPE_GROUPS);

        // Test regional types
        $regionalTypes = Department::TYPE_GROUPS['regional'];
        $this->assertContains('maliyyə', $regionalTypes);
        $this->assertContains('inzibati', $regionalTypes);
        $this->assertContains('təsərrüfat', $regionalTypes);

        // Test school types
        $schoolTypes = Department::TYPE_GROUPS['school'];
        $this->assertContains('müavin', $schoolTypes);
        $this->assertContains('ubr', $schoolTypes);
        $this->assertContains('müəllim', $schoolTypes);
        $this->assertContains('psixoloq', $schoolTypes);
    }
}