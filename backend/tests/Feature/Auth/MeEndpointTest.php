<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class MeEndpointTest extends TestCase
{
    use RefreshDatabase;
    use SeedsDefaultRolesAndPermissions;

    public function test_authenticated_user_receives_profile_payload(): void
    {
        $user = $this->createUserWithRole('superadmin', ['users.read']);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/me');

        $response->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.roles.0', 'superadmin')
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'username',
                    'roles',
                    'permissions',
                    'preferences',
                ],
            ]);
    }

    public function test_guest_request_is_rejected(): void
    {
        $response = $this->getJson('/api/me');

        $response->assertUnauthorized();
    }
}
