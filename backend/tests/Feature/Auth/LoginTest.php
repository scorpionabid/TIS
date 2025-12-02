<?php

namespace Tests\Feature\Auth;

use Illuminate\Support\Facades\Hash;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    public function test_user_can_authenticate_with_valid_credentials(): void
    {
        $user = $this->createUserWithRole('superadmin', permissions: [
            'users.read',
        ], attributes: [
            'username' => 'demo.user',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/login', [
            'login' => 'demo.user',
            'password' => 'secret123',
            'remember' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('code', 'LOGIN_SUCCESS')
            ->assertJsonPath('message', 'Uğurlu giriş')
            ->assertJsonStructure([
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
                    'requires_password_change',
                ],
            ])
            ->assertJsonPath('data.user.username', 'demo.user')
            ->assertJsonPath('data.user.roles.0', 'superadmin')
            ->assertJsonPath('data.remember', true);

        $this->assertNotEmpty($response->json('data.session_id'));
        $this->assertNotEmpty($response->json('data.expires_at'));
    }

    public function test_invalid_credentials_return_validation_error(): void
    {
        $response = $this->postJson('/api/login', [
            'login' => 'unknown.user',
            'password' => 'not-correct',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('code', 'BAD_CREDENTIALS')
            ->assertJsonStructure([
                'message',
                'code',
                'errors' => ['login', 'code'],
            ]);
    }

    public function test_user_marked_for_password_rotation_gets_flagged_response(): void
    {
        $user = $this->createUserWithRole('superadmin', permissions: [], attributes: [
            'username' => 'flagged.user',
            'password' => Hash::make('password123'),
        ]);

        $user->forceFill([
            'password_change_required' => true,
        ])->save();

        $response = $this->postJson('/api/login', [
            'login' => 'flagged.user',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.requires_password_change', true)
            ->assertJsonPath('data.code', 'PASSWORD_RESET_REQUIRED')
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'user',
                    'requires_password_change',
                    'code',
                ],
            ]);
    }

    public function test_inactive_user_cannot_login(): void
    {
        $user = $this->createUserWithRole('superadmin', permissions: [], attributes: [
            'username' => 'inactive.user',
            'password' => Hash::make('password123'),
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/login', [
            'login' => $user->username,
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('code', 'ACCOUNT_INACTIVE')
            ->assertJsonStructure([
                'message',
                'code',
                'errors' => ['login', 'code'],
            ]);
    }

    public function test_login_defaults_to_not_remembering_when_flag_missing(): void
    {
        $user = $this->createUserWithRole('superadmin', permissions: [], attributes: [
            'username' => 'standard.user',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/login', [
            'login' => $user->username,
            'password' => 'secret123',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.remember', false)
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'session_id',
                    'expires_at',
                    'remember',
                ],
            ]);
    }
}
