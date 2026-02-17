<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RegionAdminPermissionMetadataTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure the regionadmin role exists for middleware
        Role::firstOrCreate([
            'name' => 'regionadmin',
            'guard_name' => 'sanctum',
        ]);
    }

    public function test_region_admin_cannot_access_permission_metadata(): void
    {
        $region = Institution::factory()->regional()->create();

        $user = User::factory()->create([
            'institution_id' => $region->id,
        ]);
        $user->assignRole('regionadmin');

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/regionadmin/users/permissions/meta');

        $response->assertForbidden();
    }
}
