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

    public function test_permission_metadata_response_structure(): void
    {
        $region = Institution::factory()->regional()->create();

        $user = User::factory()->create([
            'institution_id' => $region->id,
        ]);
        $user->assignRole('regionadmin');

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/regionadmin/users/permissions/meta');

        $response->assertOk();
        $response->assertJsonPath('success', true);

        $response->assertJsonStructure([
            'success',
            'data' => [
                'modules' => [
                    [
                        'key',
                        'label',
                        'permissions' => [
                            [
                                'key',
                                'label',
                                'shareable',
                            ],
                        ],
                    ],
                ],
                'templates' => [
                    [
                        'key',
                        'permissions',
                    ],
                ],
                'granted_permissions',
                'role_matrix',
            ],
        ]);
    }

    public function test_templates_and_shareable_flags_are_present()
    {
        $region = Institution::factory()->regional()->create();

        $user = User::factory()->create([
            'institution_id' => $region->id,
        ]);
        $user->assignRole('regionadmin');

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/regionadmin/users/permissions/meta');
        $response->assertOk();

        $data = $response->json('data');
        $this->assertNotEmpty($data['modules']);

        $firstPermission = $data['modules'][0]['permissions'][0];
        $this->assertArrayHasKey('shareable', $firstPermission);
        $this->assertFalse($firstPermission['shareable'], 'Shareable should be false when admin has no matching perms');

        $this->assertNotEmpty($data['templates'], 'Templates should be present even if no permissions are currently granted');
        $template = $data['templates'][0];
        $this->assertArrayHasKey('key', $template);
        $this->assertArrayHasKey('permissions', $template);
        $this->assertArrayHasKey('total_permissions', $template);
        $this->assertArrayHasKey('available_permissions', $template);
        $this->assertArrayHasKey('coverage_percent', $template);
    }
}
