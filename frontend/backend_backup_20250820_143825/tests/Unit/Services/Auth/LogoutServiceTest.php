<?php

namespace Tests\Unit\Services\Auth;

use App\Models\SecurityEvent;
use App\Models\User;
use App\Services\Auth\LogoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LogoutServiceTest extends TestCase
{
    use RefreshDatabase;

    protected $logoutService;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create a fresh user for each test
        $this->user = User::factory()->create();
        $this->logoutService = new LogoutService();
    }

    protected function tearDown(): void
    {
        // Clean up any remaining tokens
        if (isset($this->user)) {
            try {
                $this->user->tokens()->delete();
            } catch (\Exception $e) {
                // Ignore errors during cleanup
            }
        }
        
        // Clear security events
        try {
            SecurityEvent::query()->delete();
        } catch (\Exception $e) {
            // Ignore errors during cleanup
        }
        
        // Clear the user
        if (isset($this->user) && $this->user->exists) {
            try {
                $this->user->delete();
            } catch (\Exception $e) {
                // Ignore errors during cleanup
            }
        }
        
        parent::tearDown();
    }

    /** @test */
    public function it_can_logout_user()
    {
        // Create a token for the test user
        $token = $this->user->createToken('test-token');
        $tokenId = $token->accessToken->id;
        
        // Verify token exists in the database
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $tokenId,
            'tokenable_id' => $this->user->id,
            'tokenable_type' => get_class($this->user),
            'name' => 'test-token'
        ]);
        
        // Manually set the current access token for the user
        $reflection = new \ReflectionClass($this->user);
        $property = $reflection->getProperty('accessToken');
        $property->setAccessible(true);
        $property->setValue($this->user, $token->accessToken);
        
        // Perform logout
        $this->logoutService->logout($this->user);
        
        // Verify token was deleted from the database
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $tokenId,
            'tokenable_id' => $this->user->id
        ]);
        
        // Verify security event was logged
        $this->assertDatabaseHas('security_events', [
            'user_id' => $this->user->id,
            'event_type' => 'logout',
            'severity' => 'info'
        ]);
    }

    /** @test */
    public function it_can_logout_from_all_devices()
    {
        // Create multiple tokens for the user
        $this->user->createToken('test-token-1');
        $this->user->createToken('test-token-2');
        
        // Verify tokens exist
        $this->assertCount(2, $this->user->tokens);
        
        // Perform logout from all devices
        $this->logoutService->logoutFromAllDevices($this->user);
        
        // Verify all tokens were deleted
        $this->assertCount(0, $this->user->fresh()->tokens);
        
        // Verify security event was logged
        $this->assertDatabaseHas('security_events', [
            'user_id' => $this->user->id,
            'event_type' => 'logout_all',
            'severity' => 'info'
        ]);
    }
}
