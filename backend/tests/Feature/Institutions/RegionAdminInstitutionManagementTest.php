<?php

namespace Tests\Feature\Institutions;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RegionAdminInstitutionManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate([
            'name' => 'regionadmin',
            'guard_name' => 'sanctum',
        ]);
    }

    public function test_region_admin_can_update_institution_via_alias_route(): void
    {
        ['user' => $user, 'school' => $school] = $this->createRegionHierarchy();

        $response = $this->actingAs($user, 'sanctum')->putJson(
            "/api/regionadmin/region-institutions/{$school->id}",
            [
                'name' => 'Test Postgres School',
                'short_name' => 'TPS',
            ]
        );

        $response->assertOk()
            ->assertJsonPath('message', 'Institution updated successfully')
            ->assertJsonPath('institution.name', 'Test Postgres School');

        $this->assertDatabaseHas('institutions', [
            'id' => $school->id,
            'name' => 'Test Postgres School',
            'short_name' => 'TPS',
        ]);
    }

    public function test_region_admin_can_delete_institution_via_alias_route(): void
    {
        ['user' => $user, 'school' => $school] = $this->createRegionHierarchy();

        $response = $this->actingAs($user, 'sanctum')->deleteJson(
            "/api/regionadmin/region-institutions/{$school->id}"
        );

        $response->assertOk()
            ->assertJsonPath('message', 'Institution deleted successfully');

        $this->assertSoftDeleted('institutions', [
            'id' => $school->id,
        ]);
    }

    /**
     * @return array{user: \App\Models\User, school: \App\Models\Institution}
     */
    private function createRegionHierarchy(): array
    {
        $region = Institution::factory()->regional()->create();
        $sector = Institution::factory()->sector()->create([
            'parent_id' => $region->id,
        ]);
        $school = Institution::factory()->school()->create([
            'parent_id' => $sector->id,
        ]);

        $user = User::factory()->create([
            'institution_id' => $region->id,
        ]);
        $user->assignRole('regionadmin');

        return [
            'user' => $user,
            'school' => $school,
        ];
    }
}
