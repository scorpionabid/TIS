<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class TokenLifecycleTest extends TestCase
{
    use RefreshDatabase;
    use SeedsDefaultRolesAndPermissions;

    public function test_authenticated_user_can_logout_and_token_is_revoked(): void
    {
        $user = $this->createUserWithRole();
        $token = $user->createToken('api-device')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout');

        $response->assertOk()
            ->assertJsonPath('message', 'Uğurla çıxış edildi');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_token_refresh_replaces_current_token(): void
    {
        $user = $this->createUserWithRole();
        $token = $user->createToken('api-device')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/refresh-token');

        $response->assertOk()
            ->assertJsonStructure([
                'message',
                'token',
            ])
            ->assertJsonPath('message', 'Token refreshed successfully');

        $newToken = $response->json('token');
        $this->assertNotEmpty($newToken);
        $this->assertNotSame($token, $newToken);

        // Old token should be removed, leaving exactly one active token
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }
}
