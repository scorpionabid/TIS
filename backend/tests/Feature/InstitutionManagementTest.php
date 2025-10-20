<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class InstitutionManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            \Database\Seeders\RoleSeeder::class,
            \Database\Seeders\PermissionSeeder::class,
        ]);

        $this->superadmin = User::factory()->create(['is_active' => true]);
        $this->superadmin->assignRole('superadmin');
        $this->superadmin->givePermissionTo(
            Permission::where('guard_name', 'web')->pluck('name')->all()
        );

        Sanctum::actingAs($this->superadmin);
    }

    public function test_hierarchy_endpoint_returns_nested_structure(): void
    {
        $ministry = Institution::factory()->create([
            'type' => 'ministry',
            'level' => 1,
            'parent_id' => null,
            'institution_code' => 'MIN' . Str::upper(Str::random(4)),
            'region_code' => 'AZ-00',
        ]);

        $region = Institution::factory()->create([
            'type' => 'region',
            'level' => 2,
            'parent_id' => $ministry->id,
            'institution_code' => 'REG' . Str::upper(Str::random(4)),
            'region_code' => 'AZ-BA',
        ]);

        $sector = Institution::factory()->create([
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $region->id,
        ]);

        Institution::factory()->create([
            'type' => 'school',
            'level' => 4,
            'parent_id' => $sector->id,
        ]);

        $response = $this->getJson('/api/hierarchy');
        $response->assertOk()->assertJson(['success' => true]);

        $root = collect($response->json('data'))->firstWhere('id', $ministry->id);
        $this->assertNotNull($root);
        $this->assertCount(1, $root['children']);

        $regionNode = $root['children'][0];
        $this->assertEquals($region->id, $regionNode['id']);
        $this->assertCount(1, $regionNode['children']);

        $sectorNode = $regionNode['children'][0];
        $this->assertEquals($sector->id, $sectorNode['id']);
        $this->assertCount(1, $sectorNode['children']);
    }

    public function test_regionadmin_is_limited_to_their_region_hierarchy(): void
    {
        $root = Institution::factory()->create([
            'type' => 'ministry',
            'level' => 1,
            'parent_id' => null,
        ]);

        $regionA = Institution::factory()->create([
            'type' => 'region',
            'level' => 2,
            'parent_id' => $root->id,
        ]);

        $regionB = Institution::factory()->create([
            'type' => 'region',
            'level' => 2,
            'parent_id' => $root->id,
        ]);

        $sectorA = Institution::factory()->create([
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $regionA->id,
        ]);

        $sectorB = Institution::factory()->create([
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $regionB->id,
        ]);

        $regionAdmin = User::factory()->create([
            'institution_id' => $regionA->id,
            'is_active' => true,
        ]);

        $regionAdmin->assignRole('regionadmin');
        $regionAdmin->givePermissionTo(['institutions.read', 'institutions.write']);

        Sanctum::actingAs($regionAdmin);

        $this->getJson("/api/institutions/{$regionA->id}")->assertOk();
        $this->getJson("/api/institutions/{$sectorA->id}")->assertOk();

        $this->getJson("/api/institutions/{$regionB->id}")->assertOk();
        $this->getJson("/api/institutions/{$sectorB->id}")->assertOk();

        $schoolPayload = [
            'name' => 'Region A məktəb',
            'type' => 'school',
            'level' => 4,
            'parent_id' => $sectorA->id,
            'institution_code' => 'SCH' . Str::upper(Str::random(5)),
            'region_code' => 'AZ-RA',
            'is_active' => true,
        ];

        $this->postJson('/api/institutions', $schoolPayload)->assertCreated();

        $this->postJson('/api/institutions', array_merge($schoolPayload, [
            'name' => 'Region B məktəb',
            'parent_id' => $sectorB->id,
            'institution_code' => 'SCH' . Str::upper(Str::random(5)),
        ]))->assertStatus(403);
    }

    public function test_statistics_endpoint_returns_summary_totals(): void
    {
        $ministry = Institution::factory()->create([
            'type' => 'ministry',
            'level' => 1,
        ]);

        Institution::factory()->count(2)->create([
            'type' => 'region',
            'level' => 2,
            'parent_id' => $ministry->id,
        ]);

        $response = $this->getJson('/api/institutions/statistics');
        $response->assertOk()->assertJson([
            'success' => true,
        ]);

        $data = $response->json('data');
        $this->assertArrayHasKey('total', $data);
        $this->assertGreaterThanOrEqual(3, $data['total']);
        $this->assertArrayHasKey('by_level', $data);
    }

    public function test_delete_endpoint_requires_confirmation_fields(): void
    {
        $institution = Institution::factory()->create();

        $response = $this->deleteJson("/api/institutions/{$institution->id}", [
            'type' => 'hard',
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Doğrulama xətası',
            ]);
    }
}
