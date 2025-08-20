<?php

namespace Tests\Unit\Services\Auth;

use App\Models\User;
use App\Models\UserDevice;
use App\Services\Auth\DeviceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeviceServiceTest extends TestCase
{
    use RefreshDatabase;

    protected $deviceService;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->deviceService = new DeviceService();
        $this->user = User::factory()->create();
        
        // Create test devices
        UserDevice::factory()->create([
            'user_id' => $this->user->id,
            'device_id' => 'device-1',
            'device_name' => 'Test Device 1',
            'is_trusted' => true
        ]);
        
        UserDevice::factory()->create([
            'user_id' => $this->user->id,
            'device_id' => 'device-2',
            'device_name' => 'Test Device 2',
            'is_trusted' => false
        ]);
    }

    /** @test */
    public function it_can_get_user_devices()
    {
        $devices = $this->deviceService->getUserDevices($this->user);
        
        $this->assertCount(2, $devices);
        $this->assertEquals('Test Device 1', $devices[0]->device_name);
        $this->assertEquals('device-2', $devices[1]->device_id);
    }

    /** @test */
    public function it_can_get_specific_device()
    {
        $device = $this->deviceService->getDevice($this->user, 'device-1');
        
        $this->assertNotNull($device);
        $this->assertEquals('Test Device 1', $device->device_name);
        $this->assertTrue($device->is_trusted);
    }

    /** @test */
    public function it_can_revoke_a_device()
    {
        $result = $this->deviceService->revokeDevice($this->user, 'device-1');
        
        $this->assertTrue($result);
        $this->assertDatabaseMissing('user_devices', [
            'user_id' => $this->user->id,
            'device_id' => 'device-1'
        ]);
    }

    /** @test */
    public function it_can_revoke_other_devices()
    {
        // Create a fresh user for this test to avoid conflicts
        $user = User::factory()->create();
        
        // Create test devices
        $device1 = UserDevice::factory()->create([
            'user_id' => $user->id,
            'device_id' => 'test-device-1',
            'device_name' => 'Test Device 1'
        ]);
        
        $device2 = UserDevice::factory()->create([
            'user_id' => $user->id,
            'device_id' => 'test-device-2',
            'device_name' => 'Test Device 2'
        ]);

        // Create tokens for the devices
        $user->createToken('Test Device 1');
        $user->createToken('Test Device 2');

        // Verify we have 2 devices initially
        $this->assertCount(2, $this->deviceService->getUserDevices($user));

        // Revoke other devices
        $count = $this->deviceService->revokeOtherDevices($user, 'test-device-1');
        
        // Should have revoked 1 device
        $this->assertEquals(1, $count);
        
        // Verify only device-1 remains
        $this->assertDatabaseHas('user_devices', [
            'user_id' => $user->id,
            'device_id' => 'test-device-1'
        ]);
        
        $this->assertDatabaseMissing('user_devices', [
            'user_id' => $user->id,
            'device_id' => 'test-device-2'
        ]);

        // Refresh user tokens
        $user->load('tokens');
        
        // Verify tokens for device-2 were also revoked
        $this->assertCount(1, $user->tokens);
        $this->assertEquals('Test Device 1', $user->tokens->first()->name);
        
        // Cleanup
        $user->tokens()->delete();
        $user->devices()->delete();
        $user->delete();
    }

    /** @test */
    public function it_can_update_trust_status()
    {
        $result = $this->deviceService->updateTrustStatus($this->user, 'device-2', true);
        
        $this->assertTrue($result);
        $this->assertDatabaseHas('user_devices', [
            'user_id' => $this->user->id,
            'device_id' => 'device-2',
            'is_trusted' => true
        ]);
    }

    /** @test */
    public function it_can_cleanup_old_devices()
    {
        // Create an old device
        UserDevice::factory()->create([
            'user_id' => $this->user->id,
            'device_id' => 'old-device',
            'last_login_at' => now()->subMonths(4), // 4 months old
            'created_at' => now()->subMonths(4)
        ]);
        
        $count = $this->deviceService->cleanupOldDevices(90); // 90 days
        
        $this->assertEquals(1, $count);
        $this->assertDatabaseMissing('user_devices', [
            'device_id' => 'old-device'
        ]);
        
        // Verify other devices still exist
        $this->assertDatabaseHas('user_devices', [
            'device_id' => 'device-1'
        ]);
    }
}
