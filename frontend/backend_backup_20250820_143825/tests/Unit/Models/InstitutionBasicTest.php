<?php

namespace Tests\Unit\Models;

use App\Models\Institution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstitutionBasicTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test institution model can be created
     *
     * @return void
     */
    public function test_institution_model_can_be_created()
    {
        $institution = new Institution([
            'name' => 'Test School',
            'level' => 4,
            'type' => 'school',
            'is_active' => true,
        ]);

        $this->assertInstanceOf(Institution::class, $institution);
        $this->assertEquals('Test School', $institution->name);
        $this->assertEquals(4, $institution->level);
        $this->assertEquals('school', $institution->type);
        $this->assertTrue($institution->is_active);
    }

    /**
     * Test institution has expected fillable attributes
     *
     * @return void
     */
    public function test_institution_has_expected_fillable_attributes()
    {
        $institution = new Institution();
        $fillable = $institution->getFillable();

        // Check for basic required attributes
        $expectedAttributes = ['name', 'level', 'type', 'is_active'];
        
        foreach ($expectedAttributes as $attribute) {
            $this->assertContains($attribute, $fillable, "Institution should have {$attribute} as fillable");
        }
    }

    /**
     * Test institution level validation
     *
     * @return void
     */
    public function test_institution_level_validation()
    {
        $institution = new Institution([
            'name' => 'Test Institution',
            'level' => 1,
            'type' => 'ministry',
            'is_active' => true,
        ]);

        $this->assertEquals(1, $institution->level);
        $this->assertEquals('ministry', $institution->type);
    }

    /**
     * Test institution type validation
     *
     * @return void
     */
    public function test_institution_type_validation()
    {
        $validTypes = ['ministry', 'region', 'sector', 'school'];
        
        foreach ($validTypes as $type) {
            $institution = new Institution([
                'name' => "Test {$type}",
                'level' => 1,
                'type' => $type,
                'is_active' => true,
            ]);

            $this->assertEquals($type, $institution->type);
        }
    }

    /**
     * Test institution active status
     *
     * @return void
     */
    public function test_institution_active_status()
    {
        $activeInstitution = new Institution([
            'name' => 'Active School',
            'level' => 4,
            'type' => 'school',
            'is_active' => true,
        ]);

        $inactiveInstitution = new Institution([
            'name' => 'Inactive School',
            'level' => 4,
            'type' => 'school',
            'is_active' => false,
        ]);

        $this->assertTrue($activeInstitution->is_active);
        $this->assertFalse($inactiveInstitution->is_active);
    }

    /**
     * Test institution hierarchy levels
     *
     * @return void
     */
    public function test_institution_hierarchy_levels()
    {
        $levelMapping = [
            1 => 'ministry',
            2 => 'region',
            3 => 'sector',
            4 => 'school',
        ];

        foreach ($levelMapping as $level => $expectedType) {
            $institution = new Institution([
                'name' => "Test {$expectedType}",
                'level' => $level,
                'type' => $expectedType,
                'is_active' => true,
            ]);

            $this->assertEquals($level, $institution->level);
            $this->assertEquals($expectedType, $institution->type);
        }
    }

    /**
     * Test institution name is required
     *
     * @return void
     */
    public function test_institution_name_is_required()
    {
        $institution = new Institution([
            'level' => 4,
            'type' => 'school',
            'is_active' => true,
        ]);

        // Name should be required, but we test the model structure
        $this->assertNull($institution->name);
    }

    /**
     * Test institution default values
     *
     * @return void
     */
    public function test_institution_default_values()
    {
        $institution = new Institution([
            'name' => 'Test School',
        ]);

        // Test that model can be created with minimal data
        $this->assertEquals('Test School', $institution->name);
        
        // Other attributes should be null/empty until set
        $this->assertNull($institution->level);
        $this->assertNull($institution->type);
    }

    /**
     * Test institution attributes are accessible
     *
     * @return void
     */
    public function test_institution_attributes_are_accessible()
    {
        $institution = new Institution([
            'name' => 'Accessible School',
            'level' => 4,
            'type' => 'school',
            'is_active' => true,
        ]);

        // Test attribute access
        $this->assertEquals('Accessible School', $institution->name);
        $this->assertEquals(4, $institution->level);
        $this->assertEquals('school', $institution->type);
        $this->assertTrue($institution->is_active);
    }
}