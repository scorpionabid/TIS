<?php

namespace Tests\Feature\Auth;

use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class LoginRateLimitTest extends TestCase
{
    protected function tearDown(): void
    {
        RateLimiter::clear('login_ip:127.0.0.1');
        RateLimiter::clear('login_user:test.user');
        parent::tearDown();
    }

    public function test_user_rate_limit_blocks_after_threshold(): void
    {
        // Pre-fill user-based rate limit (5 attempts allowed)
        for ($i = 0; $i < 5; $i++) {
            RateLimiter::hit('login_user:test.user', 900);
        }

        $response = $this->postJson('/api/login', [
            'login' => 'test.user',
            'password' => 'any-password',
        ]);

        $response->assertStatus(429)
            ->assertJsonPath('errors.code.0', 'RATE_LIMITED')
            ->assertJsonPath('errors.type.0', 'user_blocked')
            ->assertJsonStructure([
                'message',
                'errors' => ['login', 'code', 'retry_after', 'type'],
            ]);
    }

    public function test_ip_rate_limit_blocks_after_threshold(): void
    {
        // Pre-fill IP-based rate limit (10 attempts allowed)
        for ($i = 0; $i < 10; $i++) {
            RateLimiter::hit('login_ip:127.0.0.1', 900);
        }

        $response = $this->postJson('/api/login', [
            'login' => 'some.user',
            'password' => 'any-password',
        ]);

        $response->assertStatus(429)
            ->assertJsonPath('errors.code.0', 'RATE_LIMITED')
            ->assertJsonPath('errors.type.0', 'ip_blocked')
            ->assertJsonStructure([
                'message',
                'errors' => ['login', 'code', 'retry_after', 'type'],
            ]);
    }
}
