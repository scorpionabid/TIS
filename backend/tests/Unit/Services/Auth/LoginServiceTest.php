<?php

namespace Tests\Unit\Services\Auth;

use App\Services\Auth\LoginService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class LoginServiceTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    protected LoginService $loginService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedDefaultRolesAndPermissions();
        $this->loginService = app(LoginService::class);
    }

    public function test_successful_login_returns_token_and_user_payload(): void
    {
        $user = $this->createUserWithRole('superadmin', [], [
            'email' => 'service.user@example.com',
        ]);
        $user->forceFill([
            'password' => Hash::make('secret123'),
        ])->save();

        $result = $this->loginService->attemptLogin([
            'login' => 'service.user@example.com',
            'password' => 'secret123',
            'remember' => false,
        ], 'PHPUnit', 'device-123');

        $this->assertArrayHasKey('token', $result);
        $this->assertNotEmpty($result['token']);
        $this->assertArrayHasKey('user', $result);
        $this->assertSame($user->id, $result['user']['id']);
        $this->assertFalse($result['requires_password_change']);
    }

    public function test_invalid_credentials_throw_validation_exception(): void
    {
        try {
            $this->loginService->attemptLogin([
                'login' => 'missing@example.com',
                'password' => 'invalid',
            ]);

            $this->fail('ValidationException was not thrown for invalid credentials.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('login', $exception->errors());
            $this->assertSame(
                'İstifadəçi adı, email və ya şifrə yanlışdır.',
                $exception->errors()['login'][0] ?? null
            );
            $this->assertSame('BAD_CREDENTIALS', $exception->errors()['code'][0] ?? null);
        }
    }

    public function test_inactive_users_cannot_authenticate(): void
    {
        $user = $this->createUserWithRole('superadmin');
        $user->forceFill([
            'is_active' => false,
            'password' => Hash::make('secret123'),
        ])->save();

        try {
            $this->loginService->attemptLogin([
                'login' => $user->username,
                'password' => 'secret123',
            ]);

            $this->fail('ValidationException was not thrown for inactive user.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('login', $exception->errors());
            $this->assertSame(
                'Hesabınız deaktiv edilib. Zəhmət olmasa inzibatçı ilə əlaqə saxlayın.',
                $exception->errors()['login'][0] ?? null
            );
            $this->assertSame('ACCOUNT_INACTIVE', $exception->errors()['code'][0] ?? null);
        }
    }

    public function test_password_rotation_flow_returns_flagged_response(): void
    {
        $user = $this->createUserWithRole('superadmin');
        $user->forceFill([
            'password' => Hash::make('secret123'),
            'password_change_required' => true,
        ])->save();

        $result = $this->loginService->attemptLogin([
            'login' => $user->username,
            'password' => 'secret123',
        ]);

        $this->assertTrue($result['requires_password_change']);
        $this->assertArrayHasKey('token', $result);
        $this->assertArrayHasKey('user', $result);
    }
}
