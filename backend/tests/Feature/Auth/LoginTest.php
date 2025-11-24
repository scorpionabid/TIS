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
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Uğurlu giriş')
            ->assertJsonStructure([
                'data' => [
                    'token',
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
            ->assertJsonPath('data.user.roles.0', 'superadmin');
    }

    public function test_invalid_credentials_return_validation_error(): void
    {
        $response = $this->postJson('/api/login', [
            'login' => 'unknown.user',
            'password' => 'not-correct',
        ]);

        $response->assertStatus(422)
            ->assertJsonStructure([
                'message',
                'errors' => ['login'],
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
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'user',
                    'requires_password_change',
                ],
            ]);
    }
}
