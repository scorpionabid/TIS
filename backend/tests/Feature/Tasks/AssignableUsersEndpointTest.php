<?php

namespace Tests\Feature\Tasks;

use App\Models\Institution;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class AssignableUsersEndpointTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    protected function createInstitutionHierarchy(): array
    {
        $region = Institution::factory()->regional()->create();
        $sector = Institution::factory()->sector()->create(['parent_id' => $region->id]);
        $school = Institution::factory()->school()->create(['parent_id' => $sector->id]);

        return [$region, $sector, $school];
    }

    public function test_region_admin_can_list_assignable_users_with_meta_and_links(): void
    {
        [$region, $sector, $school] = $this->createInstitutionHierarchy();

        $regionAdmin = $this->createUserWithRole('regionadmin', [
            'tasks.read',
            'tasks.create',
        ], [
            'institution_id' => $region->id,
            'first_name' => 'Lalə',
            'last_name' => 'Quliyeva',
            'email' => 'lale.quliyeva@example.com',
        ]);

        $this->createUserWithRole('regionoperator', [], [
            'institution_id' => $region->id,
            'first_name' => 'Aysel',
            'last_name' => 'Hüseynova',
            'email' => 'aysel.huseynova@example.com',
        ]);

        $this->createUserWithRole('sektoradmin', [], [
            'institution_id' => $sector->id,
            'first_name' => 'Rauf',
            'last_name' => 'Məmmədli',
            'email' => 'rauf.mammedli@example.com',
        ]);

        $this->createUserWithRole('schooladmin', [], [
            'institution_id' => $school->id,
            'first_name' => 'Kamran',
            'last_name' => 'Nəsibov',
            'email' => 'kamran.nasibov@example.com',
        ]);

        $response = $this->actingAs($regionAdmin, 'sanctum')
            ->getJson('/api/tasks/assignable-users?per_page=2');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data',
                'meta' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                    'filters' => [
                        'role',
                        'institution_id',
                        'search',
                        'origin_scope',
                    ],
                ],
                'links' => [
                    'first',
                    'last',
                    'prev',
                    'next',
                ],
            ]);

        $this->assertSame(2, $response->json('meta.per_page'));
        $this->assertGreaterThanOrEqual(4, $response->json('meta.total'));
        $this->assertArrayHasKey('name', $response->json('data.0'));
        $this->assertNotNull($response->json('links.next'));
    }

    public function test_search_and_role_filters_limit_results(): void
    {
        [$region] = $this->createInstitutionHierarchy();

        $regionAdmin = $this->createUserWithRole('regionadmin', [
            'tasks.read',
            'tasks.create',
        ], [
            'institution_id' => $region->id,
        ]);

        $this->createUserWithRole('regionoperator', [], [
            'institution_id' => $region->id,
            'first_name' => 'Nadira',
            'last_name' => 'Qədirova',
            'email' => 'nadira.qadirova@example.com',
        ]);

        $this->createUserWithRole('regionoperator', [], [
            'institution_id' => $region->id,
            'first_name' => 'Elvin',
            'last_name' => 'Səlimov',
        ]);

        $response = $this->actingAs($regionAdmin, 'sanctum')
            ->getJson('/api/tasks/assignable-users?search=Nadira&role=regionoperator');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', 'nadira.qadirova@example.com');

        $this->assertEquals('regionoperator', $response->json('meta.filters.role'));
        $this->assertEquals('Nadira', $response->json('meta.filters.search'));
    }

    public function test_institution_filter_outside_scope_returns_forbidden(): void
    {
        [$region] = $this->createInstitutionHierarchy();
        $otherRegion = Institution::factory()->regional()->create();

        $regionAdmin = $this->createUserWithRole('regionadmin', [
            'tasks.read',
            'tasks.create',
        ], [
            'institution_id' => $region->id,
        ]);

        $response = $this->actingAs($regionAdmin, 'sanctum')
            ->getJson('/api/tasks/assignable-users?institution_id=' . $otherRegion->id);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Bu müəssisədən istifadəçi seçmək icazəniz yoxdur.');
    }
}
