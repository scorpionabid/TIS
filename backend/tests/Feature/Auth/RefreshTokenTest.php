<?php

namespace Tests\Feature\Auth;

use Illuminate\Support\Facades\Hash;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class RefreshTokenTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    public function test_refresh_token_returns_session_payload(): void
    {
        $user = $this->createUserWithRole('superadmin', permissions: [
            'users.read',
        ], attributes: [
            'username' => 'refresh.user',
            'password' => Hash::make('secret123'),
        ]);

        $loginResponse = $this->postJson('/api/login', [
            'login' => 'refresh.user',
            'password' => 'secret123',
            'remember' => true,
        ])->assertOk();

        $token = $loginResponse->json('data.token');
        $this->assertNotEmpty($token, 'Login response did not contain a token');

        $refreshResponse = $this
            ->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/refresh-token', [
                'remember' => true,
                'device_name' => 'phpunit-device',
            ]);

        $refreshResponse->assertOk()
            ->assertJsonPath('code', 'TOKEN_REFRESHED')
            ->assertJsonStructure([
                'message',
                'code',
                'data' => [
                    'token',
                    'session_id',
                    'expires_at',
                    'remember',
                    'user' => [
                        'id',
                        'username',
                        'roles',
                        'permissions',
                    ],
                ],
            ])
            ->assertJsonPath('data.remember', true);
    }
}
