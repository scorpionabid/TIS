<?php

namespace Tests\Unit\Models;

use App\Models\Institution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstitutionTest extends ModelTestCase
{
    use RefreshDatabase;

    /**
     * The model class being tested
     *
     * @var string
     */
    protected $modelClass = Institution::class;

    /**
     * The attributes that should be tested for required fields
     *
     * @var array
     */
    protected $requiredAttributes = [
        'name',
        'type',
        'level',
    ];

    /**
     * The attributes that should be tested for fillable fields
     *
     * @var array
     */
    protected $fillableAttributes = [
        'name',
        'short_name',
        'type',
        'parent_id',
        'level',
        'region_code',
        'institution_code',
        'contact_info',
        'location',
        'metadata',
        'is_active',
        'established_date',
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
        'level' => 'integer',
        'contact_info' => 'array',
        'location' => 'array',
        'metadata' => 'array',
        'is_active' => 'boolean',
        'established_date' => 'date',
    ];

    /**
     * Test institution creation with minimum required fields
     *
     * @return void
     */
    public function test_institution_creation_with_minimum_required_fields()
    {
        $institution = Institution::create([
            'name' => 'Test Institution',
            'type' => 'school',
            'level' => 4,
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('institutions', [
            'name' => 'Test Institution',
            'type' => 'school',
            'level' => 4,
            'is_active' => true,
        ]);
    }

    /**
     * Test institution parent-child relationship
     *
     * @return void
     */
    public function test_institution_parent_child_relationship()
    {
        $parent = Institution::factory()->create([
            'name' => 'Parent Institution',
            'type' => 'region',
            'level' => 2,
        ]);

        $child = Institution::factory()->create([
            'name' => 'Child Institution',
            'type' => 'school',
            'level' => 4,
            'parent_id' => $parent->id,
        ]);

        // Test parent relationship
        $this->assertInstanceOf(Institution::class, $child->parent);
        $this->assertEquals($parent->id, $child->parent->id);

        // Test children relationship
        $this->assertTrue($parent->children->contains($child));
        $this->assertEquals($child->id, $parent->children->first()->id);
    }

    /**
     * Test get all children IDs method
     *
     * @return void
     */
    public function test_get_all_children_ids()
    {
        $parent = Institution::factory()->create([
            'name' => 'Parent Institution',
            'type' => 'region',
            'level' => 2,
        ]);

        $child1 = Institution::factory()->create([
            'name' => 'Child 1',
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $parent->id,
        ]);

        $child2 = Institution::factory()->create([
            'name' => 'Child 2',
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $parent->id,
        ]);

        $grandchild = Institution::factory()->create([
            'name' => 'Grandchild',
            'type' => 'school',
            'level' => 4,
            'parent_id' => $child1->id,
        ]);

        $allChildrenIds = $parent->getAllChildrenIds();

        // The method includes the parent ID in the result, so we expect 4 items
        $this->assertContains($parent->id, $allChildrenIds);
        $this->assertContains($child1->id, $allChildrenIds);
        $this->assertContains($child2->id, $allChildrenIds);
        $this->assertContains($grandchild->id, $allChildrenIds);
        $this->assertCount(4, $allChildrenIds);
    }

    /**
     * Test descendants relationship
     *
     * @return void
     */
    public function test_descendants_relationship()
    {
        $parent = Institution::factory()->create([
            'name' => 'Parent Institution',
            'type' => 'region',
            'level' => 2,
        ]);

        $child = Institution::factory()->create([
            'name' => 'Child Institution',
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $parent->id,
        ]);

        $grandchild = Institution::factory()->create([
            'name' => 'Grandchild Institution',
            'type' => 'school',
            'level' => 4,
            'parent_id' => $child->id,
        ]);

        $parent->load('descendants');

        $this->assertTrue($parent->relationLoaded('descendants'));
        $this->assertCount(1, $parent->descendants);
        $this->assertTrue($parent->descendants->contains('id', $child->id));

        // Check if the relationship is recursive
        $this->assertTrue($parent->descendants->first()->relationLoaded('descendants'));
        $this->assertTrue($parent->descendants->first()->descendants->contains('id', $grandchild->id));
    }

    /**
     * Test array and date casts
     *
     * @return void
     */
    public function test_array_and_date_casts()
    {
        $institution = Institution::create([
            'name' => 'Test Institution',
            'type' => 'school',
            'level' => 4,
            'contact_info' => ['phone' => '1234567890', 'email' => 'test@example.com'],
            'location' => ['lat' => 40.4093, 'lng' => 49.8671],
            'metadata' => ['key' => 'value'],
            'established_date' => '2020-01-01',
            'is_active' => true,
        ]);

        $this->assertIsArray($institution->contact_info);
        $this->assertEquals('1234567890', $institution->contact_info['phone']);
        $this->assertIsArray($institution->location);
        $this->assertEquals(40.4093, $institution->location['lat']);
        $this->assertIsArray($institution->metadata);
        $this->assertEquals('value', $institution->metadata['key']);
        $this->assertInstanceOf('\Carbon\Carbon', $institution->established_date);
        $this->assertEquals('2020-01-01', $institution->established_date->format('Y-m-d'));
    }

    /**
     * Test default values
     *
     * @return void
     */
    public function test_default_values()
    {
        $institution = new Institution([
            'name' => 'Test Institution',
            'type' => 'school',
            'level' => 4,
        ]);

        // The model doesn't have a default value for is_active in the database
        // It needs to be explicitly set to true when creating a new record
        $this->assertNull($institution->is_active);
        $this->assertNull($institution->parent_id);
        $this->assertNull($institution->short_name);
        $this->assertNull($institution->region_code);
        $this->assertNull($institution->institution_code);
    }
}
