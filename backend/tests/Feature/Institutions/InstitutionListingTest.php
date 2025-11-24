<?php

namespace Tests\Feature\Institutions;

use App\Models\Institution;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class InstitutionListingTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    public function test_superadmin_with_permission_can_list_institutions(): void
    {
        $institutions = Institution::factory()->count(3)->create();

        $user = $this->createUserWithRole('superadmin', ['institutions.read'], [
            'institution_id' => $institutions->first()->id,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/institutions');

        $response->assertOk()
            ->assertJsonPath('total', 3);

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($institutions->first()->id, $ids);
    }

    public function test_user_without_permission_is_forbidden(): void
    {
        $institution = Institution::factory()->create();

        $user = $this->createUserWithRole('müəllim', [], [
            'institution_id' => $institution->id,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/institutions');

        $response->assertStatus(403);
    }
}
