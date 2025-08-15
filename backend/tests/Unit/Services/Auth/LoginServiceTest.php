<?php

namespace Tests\Unit\Services\Auth;

use App\Models\User;
use App\Services\Auth\LoginService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class LoginServiceTest extends TestCase
{
    use RefreshDatabase;

    protected $loginService;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->loginService = new LoginService();
        
        // Create a test user
        $this->user = User::factory()->create([
            'username' => 'testuser',
            'email' => 'test@example.com',
            'password' => Hash::make('password123'),
            'is_active' => true,
            'password_change_required' => false
        ]);
    }

    /** @test */
    public function it_can_authenticate_user_with_username()
    {
        $result = $this->loginService->attemptLogin([
            'login' => 'testuser',
            'password' => 'password123',
            'remember' => false
        ]);

        $this->assertArrayHasKey('token', $result);
        $this->assertArrayHasKey('user', $result);
        $this->assertFalse($result['requires_password_change']);
    }

    /** @test */
    public function it_can_authenticate_user_with_email()
    {
        $result = $this->loginService->attemptLogin([
            'login' => 'test@example.com',
            'password' => 'password123',
            'remember' => false
        ]);

        $this->assertArrayHasKey('token', $result);
        $this->assertArrayHasKey('user', $result);
    }

    /** @test */
    public function it_requires_password_change_when_needed()
    {
        // Create a fresh user for this test
        $user = User::factory()->create([
            'username' => 'passwordchangetest',
            'email' => 'passwordchange@example.com',
            'password' => Hash::make('password123'),
            'is_active' => true,
            'password_change_required' => true
        ]);

        // Mock the Password facade to return our test token
        $token = 'test-reset-token';
        $mockPasswordBroker = \Mockery::mock('overload:Illuminate\Auth\Passwords\PasswordBroker');
        $mockPasswordBroker->shouldReceive('createToken')
            ->once()
            ->with($user)
            ->andReturn($token);

        // Bind the mock to the service container
        $this->app->instance('auth.password', $mockPasswordBroker);

        // Create a new instance of LoginService
        $loginService = new LoginService();

        $result = $loginService->attemptLogin([
            'login' => 'passwordchangetest',
            'password' => 'password123',
            'remember' => false
        ]);

        // Verify the response indicates password change is required
        $this->assertTrue($result['requires_password_change']);
        $this->assertIsString($result['token']);
        
        // Cleanup
        $user->delete();
    }

    /** @test */
    public function it_rejects_invalid_credentials()
    {
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        
        $this->loginService->attemptLogin([
            'login' => 'testuser',
            'password' => 'wrongpassword',
            'remember' => false
        ]);
    }

    /** @test */
    public function it_rejects_inactive_accounts()
    {
        $this->user->update(['is_active' => false]);
        
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        
        $this->loginService->attemptLogin([
            'login' => 'testuser',
            'password' => 'password123',
            'remember' => false
        ]);
    }
}
