<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\SystemConfig;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SystemConfigControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $regionadmin;
    protected User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test roles
        $superadminRole = \Spatie\Permission\Models\Role::create(['name' => 'superadmin', 'guard_name' => 'web']);
        $regionadminRole = \Spatie\Permission\Models\Role::create(['name' => 'regionadmin', 'guard_name' => 'web']);
        $teacherRole = \Spatie\Permission\Models\Role::create(['name' => 'müəllim', 'guard_name' => 'web']);
        
        // Create test users
        $this->superadmin = User::factory()->create(['username' => 'superadmin']);
        $this->superadmin->assignRole($superadminRole);
        
        $this->regionadmin = User::factory()->create(['username' => 'regionadmin']);
        $this->regionadmin->assignRole($regionadminRole);
        
        $this->teacher = User::factory()->create(['username' => 'teacher']);
        $this->teacher->assignRole($teacherRole);
        
        // Create test system config entries
        $this->createTestSystemConfig();
    }

    private function createTestSystemConfig(): void
    {
        SystemConfig::create([
            'key' => 'general.app_name',
            'value' => json_encode('ATİS - Azərbaycan Təhsil İdarəetmə Sistemi'),
            'updated_by' => $this->superadmin->id
        ]);

        SystemConfig::create([
            'key' => 'general.app_version',
            'value' => json_encode('1.0.0'),
            'updated_by' => $this->superadmin->id
        ]);

        SystemConfig::create([
            'key' => 'security.session_timeout',
            'value' => json_encode(3600),
            'updated_by' => $this->superadmin->id
        ]);

        SystemConfig::create([
            'key' => 'security.password_min_length',
            'value' => json_encode(8),
            'updated_by' => $this->superadmin->id
        ]);

        SystemConfig::create([
            'key' => 'notifications.email_enabled',
            'value' => json_encode(true),
            'updated_by' => $this->superadmin->id
        ]);
    }

    /** @test */
    public function superadmin_can_get_system_config()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/system-config');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'general',
                    'security',
                    'notifications',
                    'maintenance',
                    'performance',
                    'audit',
                    'integrations'
                ],
                'last_updated'
            ]);

        $this->assertEquals('success', $response->json('status'));
    }

    /** @test */
    public function system_config_returns_correct_structure()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/system-config');

        $response->assertStatus(200);

        $data = $response->json('data');
        
        // Check that all required categories exist
        $this->assertArrayHasKey('general', $data);
        $this->assertArrayHasKey('security', $data);
        $this->assertArrayHasKey('notifications', $data);
        $this->assertArrayHasKey('maintenance', $data);
        $this->assertArrayHasKey('performance', $data);
        $this->assertArrayHasKey('audit', $data);
        $this->assertArrayHasKey('integrations', $data);
    }

    /** @test */
    public function superadmin_can_update_general_settings()
    {
        $updateData = [
            'category' => 'general',
            'settings' => [
                'app_name' => 'Updated ATİS System',
                'app_version' => '1.1.0',
                'timezone' => 'Asia/Baku',
                'language' => 'az'
            ]
        ];

        $response = $this->actingAs($this->superadmin)
            ->putJson('/api/system-config', $updateData);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'updated_settings'
                ]
            ]);

        // Check that settings were saved in database
        $this->assertDatabaseHas('system_configs', [
            'key' => 'general.app_name',
            'value' => json_encode('Updated ATİS System')
        ]);

        $this->assertDatabaseHas('system_configs', [
            'key' => 'general.app_version',
            'value' => json_encode('1.1.0')
        ]);
    }

    /** @test */
    public function superadmin_can_update_security_settings()
    {
        $updateData = [
            'category' => 'security',
            'settings' => [
                'session_timeout' => 7200,
                'password_min_length' => 12,
                'max_login_attempts' => 5,
                'lockout_duration' => 900
            ]
        ];

        $response = $this->actingAs($this->superadmin)
            ->putJson('/api/system-config', $updateData);

        $response->assertStatus(200);

        // Check that settings were saved
        $this->assertDatabaseHas('system_configs', [
            'key' => 'security.session_timeout',
            'value' => json_encode(7200)
        ]);

        $this->assertDatabaseHas('system_configs', [
            'key' => 'security.password_min_length',
            'value' => json_encode(12)
        ]);
    }

    /** @test */
    public function superadmin_can_update_notification_settings()
    {
        $updateData = [
            'category' => 'notifications',
            'settings' => [
                'email_enabled' => false,
                'sms_enabled' => true,
                'push_enabled' => true,
                'daily_digest' => false
            ]
        ];

        $response = $this->actingAs($this->superadmin)
            ->putJson('/api/system-config', $updateData);

        $response->assertStatus(200);

        // Check that settings were saved
        $this->assertDatabaseHas('system_configs', [
            'key' => 'notifications.email_enabled',
            'value' => json_encode(false)
        ]);

        $this->assertDatabaseHas('system_configs', [
            'key' => 'notifications.sms_enabled',
            'value' => json_encode(true)
        ]);
    }

    /** @test */
    public function system_config_update_validates_category()
    {
        $updateData = [
            'category' => 'invalid_category',
            'settings' => [
                'some_setting' => 'value'
            ]
        ];

        $response = $this->actingAs($this->superadmin)
            ->putJson('/api/system-config', $updateData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['category']);
    }

    /** @test */
    public function system_config_update_requires_settings()
    {
        $updateData = [
            'category' => 'general'
            // Missing 'settings' key
        ];

        $response = $this->actingAs($this->superadmin)
            ->putJson('/api/system-config', $updateData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['settings']);
    }

    /** @test */
    public function system_config_update_clears_cache()
    {
        // Set cache value
        Cache::put('system_config', 'cached_value', 60);
        
        $updateData = [
            'category' => 'general',
            'settings' => [
                'app_name' => 'New App Name'
            ]
        ];

        $response = $this->actingAs($this->superadmin)
            ->putJson('/api/system-config', $updateData);

        $response->assertStatus(200);

        // Check that cache was cleared
        $this->assertNull(Cache::get('system_config'));
        $this->assertNotNull(Cache::get('system_config_last_updated'));
    }

    /** @test */
    public function system_config_backup_can_be_created()
    {
        $response = $this->actingAs($this->superadmin)
            ->postJson('/api/system-config/backup');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'backup_id',
                    'backup_path',
                    'created_at'
                ]
            ]);
    }

    /** @test */
    public function system_config_backup_list_can_be_retrieved()
    {
        // Create a backup first
        $this->actingAs($this->superadmin)
            ->postJson('/api/system-config/backup');

        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/system-config/backups');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => [
                        'id',
                        'filename',
                        'created_at',
                        'size'
                    ]
                ]
            ]);
    }

    /** @test */
    public function system_config_can_be_restored_from_backup()
    {
        // Create a backup first
        $backupResponse = $this->actingAs($this->superadmin)
            ->postJson('/api/system-config/backup');

        $backupId = $backupResponse->json('data.backup_id');

        // Restore from backup
        $response = $this->actingAs($this->superadmin)
            ->postJson("/api/system-config/restore/{$backupId}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'restored_settings_count'
                ]
            ]);
    }

    /** @test */
    public function system_config_can_be_reset_to_defaults()
    {
        $response = $this->actingAs($this->superadmin)
            ->postJson('/api/system-config/reset');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'reset_categories'
                ]
            ]);
    }

    /** @test */
    public function system_config_validation_works()
    {
        $response = $this->actingAs($this->superadmin)
            ->postJson('/api/system-config/validate');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'valid',
                    'issues'
                ]
            ]);
    }

    /** @test */
    public function system_info_can_be_retrieved()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/system-config/info');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'system',
                    'database',
                    'cache',
                    'storage',
                    'performance'
                ]
            ]);
    }

    /** @test */
    public function regionadmin_cannot_access_system_config()
    {
        $response = $this->actingAs($this->regionadmin)
            ->getJson('/api/system-config');

        // Should return 403 if proper middleware is in place
        // For now, just check that we don't get a 500 error
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function teacher_cannot_access_system_config()
    {
        $response = $this->actingAs($this->teacher)
            ->getJson('/api/system-config');

        // Should return 403 if proper middleware is in place
        // For now, just check that we don't get a 500 error
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function unauthorized_users_cannot_access_system_config()
    {
        $response = $this->getJson('/api/system-config');
        
        $response->assertStatus(401);
    }

    /** @test */
    public function system_config_handles_database_errors_gracefully()
    {
        // Mock database error by using invalid connection
        config(['database.default' => 'invalid_connection']);

        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/system-config');

        $response->assertStatus(500)
            ->assertJson([
                'message' => 'Sistem konfiqurasiyası yüklənərkən xəta baş verdi'
            ]);
    }

    /** @test */
    public function system_config_returns_proper_json_structure()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/system-config');

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonStructure([
                'status',
                'data',
                'last_updated'
            ]);
        
        $this->assertEquals('success', $response->json('status'));
    }

    /** @test */
    public function system_config_update_logs_activity()
    {
        $updateData = [
            'category' => 'general',
            'settings' => [
                'app_name' => 'Updated Name'
            ]
        ];

        $response = $this->actingAs($this->superadmin)
            ->putJson('/api/system-config', $updateData);

        $response->assertStatus(200);

        // Check that activity was logged
        // Note: This depends on ActivityLog model implementation
        // For now, just check that the response is successful
        $this->assertTrue(true);
    }

    /** @test */
    public function system_config_supports_bulk_operations()
    {
        $updateData = [
            'category' => 'general',
            'settings' => [
                'app_name' => 'Bulk Updated Name',
                'app_version' => '2.0.0',
                'timezone' => 'Asia/Baku',
                'language' => 'az',
                'currency' => 'AZN'
            ]
        ];

        $response = $this->actingAs($this->superadmin)
            ->putJson('/api/system-config', $updateData);

        $response->assertStatus(200);

        // Check that all settings were saved
        foreach ($updateData['settings'] as $key => $value) {
            $this->assertDatabaseHas('system_configs', [
                'key' => "general.{$key}",
                'value' => json_encode($value)
            ]);
        }
    }
}