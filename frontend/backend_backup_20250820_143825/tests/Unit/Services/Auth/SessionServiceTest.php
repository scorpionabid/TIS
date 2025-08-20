<?php

namespace Tests\Unit\Services\Auth;

use App\Models\SecurityEvent;
use App\Models\User;
use App\Models\UserDevice;
use App\Services\Auth\SessionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SessionServiceTest extends TestCase
{
    use RefreshDatabase;

    protected $sessionService;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->sessionService = new SessionService();
        $this->user = User::factory()->create();
        
        // Create test devices
        UserDevice::factory()->create([
            'user_id' => $this->user->id,
            'device_id' => 'device-1',
            'device_name' => 'Test Device 1',
            'last_login_at' => now()->subDays(1)
        ]);
        
        UserDevice::factory()->create([
            'user_id' => $this->user->id,
            'device_id' => 'device-2',
            'device_name' => 'Test Device 2',
            'last_login_at' => now()
        ]);
    }

    /** @test */
    public function it_can_get_active_sessions()
    {
        // Create tokens for the user
        $token1 = $this->user->createToken('Test Device 1');
        $token2 = $this->user->createToken('Test Device 2');
        
        $sessions = $this->sessionService->getActiveSessions($this->user);
        
        $this->assertCount(2, $sessions);
        $this->assertEquals('Test Device 1', $sessions[0]['name']);
        $this->assertEquals('Test Device 2', $sessions[1]['name']);
        $this->assertNotNull($sessions[0]['device']);
    }

    /** @test */
    public function it_can_revoke_a_session()
    {
        // Create a token for the user
        $token = $this->user->createToken('Test Device')->accessToken;
        
        $result = $this->sessionService->revokeSession($this->user, $token->id);
        
        $this->assertTrue($result);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $token->id,
            'tokenable_id' => $this->user->id
        ]);
        
        // Verify security event was logged
        $this->assertDatabaseHas('security_events', [
            'user_id' => $this->user->id,
            'event_type' => 'session_revoked'
        ]);
    }

    /** @test */
    public function it_can_revoke_other_sessions()
    {
        // Create multiple tokens for the user
        $currentToken = $this->user->createToken('Current Device');
        $this->user->createToken('Other Device 1');
        $this->user->createToken('Other Device 2');
        
        $count = $this->sessionService->revokeOtherSessions(
            $this->user, 
            $currentToken->accessToken->id
        );
        
        $this->assertEquals(2, $count);
        $this->assertCount(1, $this->user->tokens);
        
        // Verify security events were logged
        $this->assertDatabaseHas('security_events', [
            'user_id' => $this->user->id,
            'event_type' => 'session_revoked_all'
        ]);
    }
}
