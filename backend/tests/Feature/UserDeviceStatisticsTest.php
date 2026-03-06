<?php

namespace Tests\Feature;

use App\Models\UserDevice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class UserDeviceStatisticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_calculates_total_login_time_without_mysql_functions(): void
    {
        $device = UserDevice::factory()->create(['registered_at' => now()->subDays(2)]);
        $user = $device->user;

        $device->sessions()->create([
            'user_id' => $user->id,
            'session_token' => Str::random(40),
            'session_id' => (string) Str::uuid(),
            'session_name' => 'Browser',
            'session_type' => 'web',
            'session_data' => [],
            'started_at' => now()->subHours(5),
            'last_activity_at' => now()->subHours(3),
            'expires_at' => now()->addHours(1),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Feature Test',
            'session_fingerprint' => Str::random(16),
            'security_context' => [],
            'status' => 'terminated',
            'terminated_at' => now()->subHours(3),
        ]);

        $device->sessions()->create([
            'user_id' => $user->id,
            'session_token' => Str::random(40),
            'session_id' => (string) Str::uuid(),
            'session_name' => 'Browser',
            'session_type' => 'web',
            'session_data' => [],
            'started_at' => now()->subHours(1)->subMinutes(30),
            'last_activity_at' => now()->subHour(),
            'expires_at' => now()->addHours(2),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Feature Test',
            'session_fingerprint' => Str::random(16),
            'security_context' => [],
            'status' => 'terminated',
            'terminated_at' => now()->subHour(),
        ]);

        $stats = $device->fresh()->getStatistics();

        $this->assertSame(150, $stats['total_login_time']); // 120 + 30 minutes
        $this->assertSame(2, $stats['total_sessions']);
    }
}
