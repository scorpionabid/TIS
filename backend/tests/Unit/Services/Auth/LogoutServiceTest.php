<?php

namespace Tests\Unit\Services\Auth;

use App\Models\SecurityEvent;
use App\Services\Auth\LogoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class LogoutServiceTest extends TestCase
{
    use RefreshDatabase;
    use SeedsDefaultRolesAndPermissions;

    protected LogoutService $logoutService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->logoutService = app(LogoutService::class);
    }

    public function test_logout_revokes_current_token_and_logs_event(): void
    {
        $user = $this->createUserWithRole();

        $token = $user->createToken('test-device');
        $user->withAccessToken($user->tokens()->first());
        $this->assertDatabaseCount('personal_access_tokens', 1);

        $this->prepareRequestContext();

        $this->logoutService->logout($user);

        $this->assertDatabaseCount('personal_access_tokens', 0);

        $event = SecurityEvent::first();
        $this->assertNotNull($event);
        $this->assertSame('logout', $event->event_type);
        $this->assertSame($user->id, $event->user_id);
    }

    public function test_logout_from_all_devices_revokes_all_tokens_and_logs_event(): void
    {
        $user = $this->createUserWithRole();

        // Create multiple tokens for the user
        $user->createToken('test-device-1');
        $user->createToken('test-device-2');
        $user->withAccessToken($user->tokens()->first());
        $this->assertDatabaseCount('personal_access_tokens', 2);

        $this->prepareRequestContext();

        $this->logoutService->logoutFromAllDevices($user);

        $this->assertDatabaseCount('personal_access_tokens', 0);

        $event = SecurityEvent::latest()->first();
        $this->assertSame('logout_all', $event->event_type);
    }

    /**
     * Ensure request helper returns a request with basic context.
     */
    protected function prepareRequestContext(): void
    {
        $request = request();
        $request->server->set('REMOTE_ADDR', '127.0.0.1');
        $request->headers->set('User-Agent', 'PHPUnit');
    }
}
