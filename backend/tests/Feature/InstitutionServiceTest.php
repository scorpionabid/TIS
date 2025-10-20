<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use App\Services\InstitutionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class InstitutionServiceTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected InstitutionService $service;
    protected User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            \Database\Seeders\RoleSeeder::class,
            \Database\Seeders\PermissionSeeder::class,
        ]);

        $this->service = app(InstitutionService::class);

        $this->superadmin = User::factory()->create();
        $this->superadmin->assignRole('superadmin');
        $this->superadmin->givePermissionTo(
            Permission::where('guard_name', 'web')->pluck('name')->all()
        );

        $this->actingAs($this->superadmin, 'web');
    }

    public function test_can_create_root_institution(): void
    {
        $institution = $this->service->createInstitution([
            'name' => 'Test Ministry',
            'type' => 'ministry',
            'is_active' => true,
            'region_code' => 'AZ-00',
            'default_departments' => ['HR', 'Finance'],
        ]);

        $this->assertInstanceOf(Institution::class, $institution);
        $this->assertEquals(1, $institution->level);
        $this->assertNull($institution->parent_id);
        $this->assertEquals(2, $institution->departments->count());
    }

    public function test_can_create_child_institution(): void
    {
        $parent = Institution::factory()->create([
            'type' => 'ministry',
            'level' => 1,
        ]);

        $child = $this->service->createInstitution([
            'name' => 'Regional Office',
            'type' => 'region',
            'parent_id' => $parent->id,
            'is_active' => true,
            'region_code' => 'AZ-01',
        ]);

        $this->assertEquals(2, $child->level);
        $this->assertEquals($parent->id, $child->parent_id);
    }

    public function test_updates_child_levels_when_parent_changes(): void
    {
        $root = Institution::factory()->create(['type' => 'ministry', 'level' => 1]);
        $region = Institution::factory()->create(['type' => 'region', 'level' => 2, 'parent_id' => $root->id]);
        $school = Institution::factory()->create(['type' => 'school', 'level' => 3, 'parent_id' => $region->id]);

        $newRoot = Institution::factory()->create(['type' => 'ministry', 'level' => 1]);

        $this->service->updateInstitution($region, ['parent_id' => $newRoot->id]);

        $region->refresh();
        $school->refresh();

        $this->assertEquals($newRoot->id, $region->parent_id);
        $this->assertEquals(2, $region->level);
        $this->assertEquals(3, $school->level);
    }

    public function test_get_hierarchy_tree_returns_nested_structure(): void
    {
        $root = Institution::factory()->create(['type' => 'ministry', 'level' => 1, 'name' => 'Root Ministry']);
        $region = Institution::factory()->create(['type' => 'region', 'level' => 2, 'parent_id' => $root->id, 'name' => 'Region A']);
        Institution::factory()->create(['type' => 'school', 'level' => 3, 'parent_id' => $region->id, 'name' => 'School 1']);

        $tree = $this->service->getHierarchyTree();

        $this->assertCount(1, $tree);
        $this->assertEquals('Root Ministry', $tree[0]['name']);
        $this->assertCount(1, $tree[0]['children']);
        $this->assertEquals('Region A', $tree[0]['children'][0]['name']);
    }

    public function test_get_institutions_applies_filters(): void
    {
        Institution::factory()->count(2)->create(['type' => 'school', 'is_active' => true]);
        Institution::factory()->create(['type' => 'region', 'is_active' => true]);

        $request = new Request([
            'type' => 'school',
            'is_active' => true,
            'per_page' => 10,
        ]);

        $result = $this->service->getInstitutions($request);

        $this->assertEquals(2, $result->total());
        $this->assertTrue(collect($result->items())->every(fn ($item) => $item->type === 'school'));
    }

    public function test_prevents_deleting_institution_with_active_children(): void
    {
        $parent = Institution::factory()->create(['is_active' => true]);
        Institution::factory()->create(['parent_id' => $parent->id, 'is_active' => true]);

        $this->expectException(\Exception::class);
        $this->service->deleteInstitution($parent);
    }

    public function test_prevents_deleting_institution_with_active_users(): void
    {
        $institution = Institution::factory()->create(['is_active' => true]);
        User::factory()->create(['institution_id' => $institution->id, 'is_active' => true]);

        $this->expectException(\Exception::class);
        $this->service->deleteInstitution($institution);
    }

    public function test_can_get_institution_statistics(): void
    {
        Institution::factory()->count(3)->create(['type' => 'school', 'is_active' => true]);
        Institution::factory()->count(2)->create(['type' => 'region', 'is_active' => true]);
        Institution::factory()->create(['type' => 'school', 'is_active' => false]);

        $stats = $this->service->getInstitutionStatistics();

        $this->assertEquals(6, $stats['total_institutions']);
        $this->assertEquals(5, $stats['active_institutions']);
        $this->assertEquals(4, $stats['by_type']['school']);
        $this->assertEquals(2, $stats['by_type']['region']);
    }
}

