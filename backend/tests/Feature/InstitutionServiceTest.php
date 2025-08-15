<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\Department;
use App\Services\InstitutionService;
use App\Services\DepartmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Spatie\Permission\Models\Role;

class InstitutionServiceTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $institutionService;
    protected $departmentService;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->institutionService = app(InstitutionService::class);
        $this->departmentService = app(DepartmentService::class);
        
        // Create roles
        Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        Role::create(['name' => 'regionadmin', 'guard_name' => 'sanctum']);
        
        $this->user = User::factory()->create();
        $this->user->assignRole('superadmin');
        
        $this->actingAs($this->user, 'sanctum');
    }

    /** @test */
    public function it_can_create_root_institution()
    {
        $institutionData = [
            'name' => 'Test Ministry',
            'name_en' => 'Test Ministry EN',
            'type' => 'ministry',
            'is_active' => true,
            'default_departments' => ['HR', 'Finance', 'IT']
        ];

        $institution = $this->institutionService->createInstitution($institutionData);

        $this->assertInstanceOf(Institution::class, $institution);
        $this->assertEquals('Test Ministry', $institution->name);
        $this->assertEquals(1, $institution->level);
        $this->assertNull($institution->parent_id);
        $this->assertEquals(3, $institution->departments->count());
    }

    /** @test */
    public function it_can_create_child_institution()
    {
        $parentInstitution = Institution::factory()->create([
            'name' => 'Parent Institution',
            'level' => 1,
            'type' => 'ministry'
        ]);

        $childData = [
            'name' => 'Child Institution',
            'name_en' => 'Child Institution EN',
            'type' => 'region',
            'parent_id' => $parentInstitution->id,
            'is_active' => true
        ];

        $childInstitution = $this->institutionService->createInstitution($childData);

        $this->assertEquals('Child Institution', $childInstitution->name);
        $this->assertEquals(2, $childInstitution->level);
        $this->assertEquals($parentInstitution->id, $childInstitution->parent_id);
    }

    /** @test */
    public function it_updates_child_levels_when_parent_changes()
    {
        // Create hierarchy: ministry -> region -> school
        $ministry = Institution::factory()->create(['level' => 1, 'type' => 'ministry']);
        $region = Institution::factory()->create(['level' => 2, 'parent_id' => $ministry->id, 'type' => 'region']);
        $school = Institution::factory()->create(['level' => 3, 'parent_id' => $region->id, 'type' => 'school']);

        // Create new parent
        $newMinistry = Institution::factory()->create(['level' => 1, 'type' => 'ministry']);

        // Move region to new ministry
        $this->institutionService->updateInstitution($region, [
            'parent_id' => $newMinistry->id
        ]);

        $region->refresh();
        $school->refresh();

        $this->assertEquals(2, $region->level);
        $this->assertEquals(3, $school->level);
        $this->assertEquals($newMinistry->id, $region->parent_id);
    }

    /** @test */
    public function it_can_get_institution_hierarchy()
    {
        // Create test hierarchy
        $ministry = Institution::factory()->create([
            'name' => 'Ministry',
            'level' => 1,
            'type' => 'ministry',
            'is_active' => true
        ]);

        $region1 = Institution::factory()->create([
            'name' => 'Region 1',
            'level' => 2,
            'parent_id' => $ministry->id,
            'type' => 'region',
            'is_active' => true
        ]);

        $region2 = Institution::factory()->create([
            'name' => 'Region 2',
            'level' => 2,
            'parent_id' => $ministry->id,
            'type' => 'region',
            'is_active' => true
        ]);

        $school = Institution::factory()->create([
            'name' => 'School 1',
            'level' => 3,
            'parent_id' => $region1->id,
            'type' => 'school',
            'is_active' => true
        ]);

        $hierarchy = $this->institutionService->getHierarchyTree();

        $this->assertCount(1, $hierarchy);
        $this->assertEquals('Ministry', $hierarchy[0]['name']);
        $this->assertCount(2, $hierarchy[0]['children']);
        
        $region1Data = collect($hierarchy[0]['children'])->firstWhere('name', 'Region 1');
        $this->assertCount(1, $region1Data['children']);
        $this->assertEquals('School 1', $region1Data['children'][0]['name']);
    }

    /** @test */
    public function it_can_filter_institutions()
    {
        // Create test institutions
        Institution::factory()->count(3)->create(['type' => 'school', 'is_active' => true]);
        Institution::factory()->count(2)->create(['type' => 'region', 'is_active' => true]);
        Institution::factory()->create(['type' => 'school', 'is_active' => false]);

        $request = new \Illuminate\Http\Request([
            'type' => 'school',
            'is_active' => true,
            'per_page' => 10
        ]);

        $result = $this->institutionService->getInstitutions($request);

        $this->assertEquals(3, $result->total());
        foreach ($result->items() as $institution) {
            $this->assertEquals('school', $institution->type);
            $this->assertTrue($institution->is_active);
        }
    }

    /** @test */
    public function it_prevents_deleting_institution_with_active_children()
    {
        $parent = Institution::factory()->create(['is_active' => true]);
        $child = Institution::factory()->create([
            'parent_id' => $parent->id,
            'is_active' => true
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Bu təşkilatın aktiv alt təşkilatları var.');

        $this->institutionService->deleteInstitution($parent);
    }

    /** @test */
    public function it_prevents_deleting_institution_with_active_users()
    {
        $institution = Institution::factory()->create(['is_active' => true]);
        $user = User::factory()->create([
            'institution_id' => $institution->id,
            'is_active' => true
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Bu təşkilatda aktiv istifadəçilər var.');

        $this->institutionService->deleteInstitution($institution);
    }

    /** @test */
    public function it_can_get_institution_statistics()
    {
        // Create test data
        Institution::factory()->count(5)->create(['type' => 'school', 'is_active' => true]);
        Institution::factory()->count(3)->create(['type' => 'region', 'is_active' => true]);
        Institution::factory()->count(2)->create(['type' => 'school', 'is_active' => false]);

        $stats = $this->institutionService->getInstitutionStatistics();

        $this->assertEquals(10, $stats['total_institutions']);
        $this->assertEquals(8, $stats['active_institutions']);
        $this->assertEquals(7, $stats['by_type']['school']);
        $this->assertEquals(3, $stats['by_type']['region']);
    }

    /** @test */
    public function it_can_create_department()
    {
        $institution = Institution::factory()->create();

        $departmentData = [
            'name' => 'Test Department',
            'description' => 'Test Description',
            'institution_id' => $institution->id,
            'is_active' => true
        ];

        $department = $this->departmentService->createDepartment($departmentData);

        $this->assertInstanceOf(Department::class, $department);
        $this->assertEquals('Test Department', $department->name);
        $this->assertEquals($institution->id, $department->institution_id);
        $this->assertEquals(1, $department->level);
    }

    /** @test */
    public function it_can_create_sub_department()
    {
        $institution = Institution::factory()->create();
        $parentDepartment = Department::factory()->create([
            'institution_id' => $institution->id,
            'level' => 1
        ]);

        $subDepartmentData = [
            'name' => 'Sub Department',
            'institution_id' => $institution->id,
            'parent_id' => $parentDepartment->id,
            'is_active' => true
        ];

        $subDepartment = $this->departmentService->createDepartment($subDepartmentData);

        $this->assertEquals('Sub Department', $subDepartment->name);
        $this->assertEquals($parentDepartment->id, $subDepartment->parent_id);
        $this->assertEquals(2, $subDepartment->level);
    }

    /** @test */
    public function it_prevents_wrong_parent_department_assignment()
    {
        $institution1 = Institution::factory()->create();
        $institution2 = Institution::factory()->create();
        
        $parentDepartment = Department::factory()->create([
            'institution_id' => $institution1->id
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Yanlış ana departament seçilmişdir.');

        $this->departmentService->createDepartment([
            'name' => 'Wrong Department',
            'institution_id' => $institution2->id,
            'parent_id' => $parentDepartment->id,
            'is_active' => true
        ]);
    }

    /** @test */
    public function it_can_get_departments_hierarchy()
    {
        $institution = Institution::factory()->create();
        
        $parentDepartment = Department::factory()->create([
            'name' => 'Parent Department',
            'institution_id' => $institution->id,
            'level' => 1,
            'is_active' => true
        ]);

        $childDepartment = Department::factory()->create([
            'name' => 'Child Department',
            'institution_id' => $institution->id,
            'parent_id' => $parentDepartment->id,
            'level' => 2,
            'is_active' => true
        ]);

        $request = new \Illuminate\Http\Request([
            'hierarchy' => true
        ]);

        $hierarchy = $this->departmentService->getDepartmentsForInstitution(
            $institution->id,
            $request
        );

        $this->assertCount(1, $hierarchy);
        $this->assertEquals('Parent Department', $hierarchy[0]['name']);
        $this->assertCount(1, $hierarchy[0]['children']);
        $this->assertEquals('Child Department', $hierarchy[0]['children'][0]['name']);
    }

    /** @test */
    public function it_can_get_department_statistics()
    {
        $institution = Institution::factory()->create();
        
        Department::factory()->count(5)->create([
            'institution_id' => $institution->id,
            'is_active' => true
        ]);
        
        Department::factory()->count(2)->create([
            'institution_id' => $institution->id,
            'is_active' => false
        ]);

        $stats = $this->departmentService->getDepartmentStatistics($institution->id);

        $this->assertEquals(7, $stats['total_departments']);
        $this->assertEquals(5, $stats['active_departments']);
    }

    /** @test */
    public function it_prevents_deleting_department_with_active_children()
    {
        $institution = Institution::factory()->create();
        $parent = Department::factory()->create([
            'institution_id' => $institution->id,
            'is_active' => true
        ]);
        $child = Department::factory()->create([
            'institution_id' => $institution->id,
            'parent_id' => $parent->id,
            'is_active' => true
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Bu departamentin aktiv alt departamentləri var.');

        $this->departmentService->deleteDepartment($parent);
    }

    /** @test */
    public function it_can_update_department_hierarchy()
    {
        $institution = Institution::factory()->create();
        
        $dept1 = Department::factory()->create([
            'institution_id' => $institution->id,
            'level' => 1
        ]);
        
        $dept2 = Department::factory()->create([
            'institution_id' => $institution->id,
            'parent_id' => $dept1->id,
            'level' => 2
        ]);
        
        $dept3 = Department::factory()->create([
            'institution_id' => $institution->id,
            'parent_id' => $dept2->id,
            'level' => 3
        ]);

        // Move dept2 to root level
        $this->departmentService->updateDepartment($dept2, [
            'parent_id' => null
        ]);

        $dept2->refresh();
        $dept3->refresh();

        $this->assertEquals(1, $dept2->level);
        $this->assertEquals(2, $dept3->level);
        $this->assertNull($dept2->parent_id);
    }
}