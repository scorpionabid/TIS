<?php

namespace Tests\Feature\LinkShare;

use App\Models\Department;
use App\Models\Institution;
use App\Models\LinkShare;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LinkShareDatabaseControllerTest extends TestCase
{
    use RefreshDatabase;

    private $superadmin;
    private $regionadmin;
    private $region;
    private $sector;
    private $department;

    protected function setUp(): void
    {
        parent::setUp();

        // Create Permissions
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        \Spatie\Permission\Models\Permission::create(['name' => 'links.read', 'guard_name' => 'sanctum']);
        \Spatie\Permission\Models\Permission::create(['name' => 'links.create', 'guard_name' => 'sanctum']);

        // Create Roles and assign permissions
        $superRole = Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        $superRole->givePermissionTo(['links.read', 'links.create']);

        $regionRole = Role::create(['name' => 'regionadmin', 'guard_name' => 'sanctum']);
        $regionRole->givePermissionTo(['links.read', 'links.create']);

        Role::create(['name' => 'sektoradmin', 'guard_name' => 'sanctum']);

        // Setup Hierarchy
        $this->region = Institution::factory()->create(['level' => 2, 'name' => 'Baku Region', 'type' => 'region']);
        $this->sector = Institution::factory()->create(['level' => 3, 'parent_id' => $this->region->id, 'name' => 'Sabail Sector', 'type' => 'sektor']);
        
        $this->department = Department::factory()->create([
            'institution_id' => $this->region->id,
            'name' => 'Finans Departamenti',
            'is_active' => true
        ]);

        $this->superadmin = User::factory()->create(['institution_id' => $this->region->id]);
        $this->superadmin->assignRole('superadmin');

        $this->regionadmin = User::factory()->create(['institution_id' => $this->region->id]);
        $this->regionadmin->assignRole('regionadmin');
    }

    public function test_get_department_types_returns_correct_list_for_superadmin()
    {
        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->getJson('/api/link-database/department-types');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_get_links_by_department_type_filters_correctly()
    {
        // 1. Create an active link for this department
        LinkShare::factory()->create([
            'title' => 'Təlimat 1',
            'status' => 'active',
            'target_departments' => [$this->department->id],
            'shared_by' => $this->superadmin->id,
            'institution_id' => $this->region->id,
            'share_scope' => 'regional'
        ]);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->getJson("/api/link-database/by-department/{$this->department->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.title', 'Təlimat 1');
    }

    public function test_create_link_for_department_requires_validation()
    {
        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->postJson("/api/link-database/department/{$this->department->id}", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'url', 'link_type']);
    }

    public function test_create_link_for_department_success()
    {
        $payload = [
            'title' => 'Yeni Test Link',
            'url' => 'https://example.com',
            'description' => 'Test təsviri',
            'link_type' => 'external',
            'is_featured' => true,
            'target_departments' => [$this->department->id],
            'institution_id' => $this->region->id
        ];

        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->postJson("/api/link-database/department/{$this->department->id}", $payload);

        if ($response->status() === 500) {
            dump($response->json());
        }

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Yeni Test Link');
    }

    public function test_get_sectors_for_link_database_filters_by_region()
    {
        // Create another region and sector
        $otherRegion = Institution::factory()->create(['level' => 2, 'type' => 'region']);
        $otherSector = Institution::factory()->create(['level' => 3, 'parent_id' => $otherRegion->id, 'type' => 'sektor']);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->getJson('/api/link-database/sectors');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $this->sector->id);
    }

    public function test_get_links_by_sector_respects_visibility_rules()
    {
        // Link shared with specific sector
        LinkShare::factory()->create([
            'title' => 'Sektor Linki',
            'status' => 'active',
            'target_institutions' => [$this->sector->id],
            'target_roles' => ['regionadmin'],
            'institution_id' => $this->region->id,
            'share_scope' => 'sectoral'
        ]);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->getJson("/api/link-database/by-sector/{$this->sector->id}");

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('data.total'));
        $this->assertEquals('Sektor Linki', $response->json('data.data.0.title'));
    }


}
