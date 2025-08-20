<?php

namespace Tests\Unit\Services;

use App\Models\User;
use App\Models\UserDevice;
use App\Models\UserSession;
use App\Models\AccountLockout;
use App\Models\SecurityAlert;
use App\Models\SessionActivity;
use App\Services\EnhancedAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;
use Mockery;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

class EnhancedAuthServiceTest extends TestCase
{
    use RefreshDatabase;
    protected $authService;
    protected $request;
    protected $user;
    protected $device;
    protected $session;
    protected $token;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Initialize the auth service
        $this->authService = new EnhancedAuthService();
        
        // Create a test user
        $this->user = User::factory()->create([
            'username' => 'testuser',
            'email' => 'test@example.com',
            'password' => Hash::make('password123'),
            'is_active' => true,
            'failed_login_attempts' => 0,
        ]);
        
        // Create a test device
        $this->device = UserDevice::factory()->create([
            'user_id' => $this->user->id,
            'device_id' => 'test-device-id',
            'device_name' => 'Test Device',
            'last_login_at' => now(),
        ]);
        
        // Mock RateLimiter
        RateLimiter::shouldReceive('tooManyAttempts')
            ->andReturn(false);
            
        RateLimiter::shouldReceive('hit')
            ->andReturn(1);
            
        RateLimiter::shouldReceive('availableIn')
            ->andReturn(60);
            
        // Add expectation for clear() method which is called on successful login
        RateLimiter::shouldReceive('clear')
            ->andReturn(true);
    }
    
    protected function tearDown(): void
    {
        parent::tearDown();
        Mockery::close();
    }
    
    /** @test */
    public function it_authenticates_user_with_correct_credentials()
    {
        // Create a test user with a known password and unique username/email
        $password = 'password123';
        $uniqueId = uniqid();
        $username = 'testuser_' . $uniqueId;
        $email = 'test_' . $uniqueId . '@example.com';
        
        $user = User::factory()->create([
            'username' => $username,
            'email' => $email,
            'password' => Hash::make($password),
            'is_active' => true,
        ]);
        
        // Create a test device
        $device = UserDevice::factory()->create([
            'user_id' => $user->id,
            'is_trusted' => true,
            'is_active' => true,
        ]);
        
        // Mock the request with all required headers
        $request = Mockery::mock(Request::class);
        $request->shouldReceive('ip')->andReturn('127.0.0.1');
        $request->shouldReceive('header')->with('User-Agent')->andReturn('Test User Agent');
        $request->shouldReceive('header')->with('X-Device-ID')->andReturn('test-device-id');
        $request->shouldReceive('header')->with('X-Screen-Resolution')->andReturn('1920x1080');
        $request->shouldReceive('header')->with('X-Timezone')->andReturn('UTC');
        $request->shouldReceive('header')->with('Accept-Language')->andReturn('en-US,en;q=0.9');
        $request->shouldReceive('header')->with('Accept-Encoding')->andReturn('gzip, deflate, br');
        $request->shouldReceive('header')->with('X-Device-Name')->andReturn('Test Device');
        $request->shouldReceive('header')->with('X-Device-Model')->andReturn('Test Model');
        $request->shouldReceive('header')->with('X-OS-Version')->andReturn('Test OS');
        $request->shouldReceive('header')->with('X-App-Version')->andReturn('1.0.0');
        $request->shouldReceive('header')->with('X-Device-Token')->andReturn('test-device-token');
        
        // Mock the UserDevice model to return our test device
        $this->mock(UserDevice::class, function ($mock) use ($device) {
            $mock->shouldReceive('firstOrCreate')
                ->andReturn($device);
        });
        
        // Mock the PersonalAccessToken
        $token = new class {
            public $plainTextToken = 'test-token';
            public $accessToken;
            
            public function __construct() {
                $this->accessToken = (object)['token' => 'hashed-token'];
            }
        };
        
        $this->mock(PersonalAccessToken::class, function ($mock) use ($token) {
            $mock->shouldReceive('createToken')
                ->andReturn($token);
        });
        
        // Mock the UserSession creation
        $this->mock(UserSession::class, function ($mock) use ($user, $device) {
            $mock->shouldReceive('create')
                ->andReturn(new UserSession([
                    'id' => 1,
                    'user_id' => $user->id,
                    'device_id' => $device->id,
                    'session_token' => 'hashed-token',
                    'ip_address' => '127.0.0.1',
                    'user_agent' => 'Test User Agent',
                    'last_activity' => now(),
                    'expires_at' => now()->addHours(2),
                ]));
        });
        
        // Execute the login
        $result = $this->authService->login($request, [
            'login' => $username, // Use the dynamically generated username
            'password' => $password,
        ]);
        
        // Assertions
        $this->assertArrayHasKey('user', $result);
        $this->assertArrayHasKey('token', $result);
        $this->assertArrayHasKey('session', $result);
        $this->assertArrayHasKey('device', $result);
        
        // Verify the token is in the expected format (e.g., "1|abc123...")
        $this->assertIsString($result['token']);
        $this->assertMatchesRegularExpression('/^\d+\|[a-zA-Z0-9]+$/', $result['token']);
    }
    
    /** @test */
    public function it_rejects_invalid_credentials()
    {
        // Create a test user with unique username/email
        $uniqueId = uniqid();
        $username = 'testuser_' . $uniqueId;
        $email = 'test_' . $uniqueId . '@example.com';
        
        $user = User::factory()->create([
            'username' => $username,
            'email' => $email,
            'password' => Hash::make('correct-password'),
            'is_active' => true,
        ]);
        
        // Mock the request with all required headers
        $request = Mockery::mock(Request::class);
        $request->shouldReceive('ip')->andReturn('127.0.0.1');
        $request->shouldReceive('header')->with('User-Agent')->andReturn('Test User Agent');
        $request->shouldReceive('header')->with('X-Device-ID')->andReturn('test-device-id');
        $request->shouldReceive('header')->with('X-Screen-Resolution')->andReturn('1920x1080');
        $request->shouldReceive('header')->with('X-Timezone')->andReturn('UTC');
        $request->shouldReceive('header')->with('Accept-Language')->andReturn('en-US,en;q=0.9');
        $request->shouldReceive('header')->with('Accept-Encoding')->andReturn('gzip, deflate, br');
        $request->shouldReceive('header')->with('X-Device-Name')->andReturn('Test Device');
        $request->shouldReceive('header')->with('X-Device-Model')->andReturn('Test Model');
        $request->shouldReceive('header')->with('X-OS-Version')->andReturn('Test OS');
        $request->shouldReceive('header')->with('X-App-Version')->andReturn('1.0.0');
        $request->shouldReceive('header')->with('X-Device-Token')->andReturn('test-device-token');
        
        // Expect exception for invalid credentials
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('İstifadəçi adı və ya parol yanlışdır.');
        
        // Execute the login with wrong credentials
        $this->authService->login($request, [
            'login' => 'nonexistentuser',
            'password' => 'wrongpassword',
        ]);
    }
    
    /** @test */
    public function it_handles_inactive_user()
    {
        // Create an inactive user with unique username/email
        $uniqueId = uniqid();
        $username = 'inactiveuser_' . $uniqueId;
        $email = 'inactive_' . $uniqueId . '@example.com';
        
        $inactiveUser = User::factory()->create([
            'username' => $username,
            'email' => $email,
            'password' => Hash::make('password123'),
            'is_active' => false,
        ]);
        
        // Mock the request with all required headers
        $request = Mockery::mock(Request::class);
        $request->shouldReceive('ip')->andReturn('127.0.0.1');
        $request->shouldReceive('header')->with('User-Agent')->andReturn('Test User Agent');
        $request->shouldReceive('header')->with('X-Device-ID')->andReturn('test-device-id');
        $request->shouldReceive('header')->with('X-Screen-Resolution')->andReturn('1920x1080');
        $request->shouldReceive('header')->with('X-Timezone')->andReturn('UTC');
        $request->shouldReceive('header')->with('Accept-Language')->andReturn('en-US,en;q=0.9');
        $request->shouldReceive('header')->with('Accept-Encoding')->andReturn('gzip, deflate, br');
        $request->shouldReceive('header')->with('X-Device-Name')->andReturn('Test Device');
        $request->shouldReceive('header')->with('X-Device-Model')->andReturn('Test Model');
        $request->shouldReceive('header')->with('X-OS-Version')->andReturn('Test OS');
        $request->shouldReceive('header')->with('X-App-Version')->andReturn('1.0.0');
        $request->shouldReceive('header')->with('X-Device-Token')->andReturn('test-device-token');
        
        // Expect exception for inactive user
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Hesab deaktivdir. İdarə ilə əlaqə saxlayın.');
        
        // Execute the login
        $this->authService->login($request, [
            'login' => $username, // Use the dynamically generated username
            'password' => 'password123',
        ]);
    }
}
