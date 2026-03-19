<?php

namespace Tests\Feature\AI;

use App\Models\AiLlmSetting;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class AiSettingsTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    public function test_superadmin_can_get_ai_settings(): void
    {
        $user = $this->createUserWithRole('superadmin');

        $response = $this->actingAs($user)
            ->getJson('/api/ai-analysis/settings');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'is_configured',
                    'available_providers',
                ],
            ]);
    }

    public function test_regionadmin_can_get_ai_settings(): void
    {
        $user = $this->createUserWithRole('regionadmin');

        $response = $this->actingAs($user)
            ->getJson('/api/ai-analysis/settings');

        $response->assertStatus(200);
    }

    public function test_schooladmin_cannot_get_ai_settings(): void
    {
        $user = $this->createUserWithRole('schooladmin');

        $response = $this->actingAs($user)
            ->getJson('/api/ai-analysis/settings');

        // schooladmin-in ai_analysis.view permission-u yoxdur
        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_get_ai_settings(): void
    {
        $response = $this->getJson('/api/ai-analysis/settings');
        $response->assertStatus(401);
    }

    public function test_only_superadmin_can_save_ai_settings(): void
    {
        // regionadmin-in ai_analysis.view permission-u var amma controller içindəki
        // hasRole('superadmin') yoxlaması 403 qaytarır.
        $regionAdmin = $this->createUserWithRole('regionadmin');

        $response = $this->actingAs($regionAdmin)
            ->postJson('/api/ai-analysis/settings', [
                'provider' => 'openai',
                'api_key'  => 'sk-test-key-1234567890',
            ]);

        $response->assertStatus(403);
    }

    public function test_schooladmin_cannot_save_ai_settings(): void
    {
        $user = $this->createUserWithRole('schooladmin');

        $response = $this->actingAs($user)
            ->postJson('/api/ai-analysis/settings', [
                'provider' => 'openai',
                'api_key'  => 'sk-test-key-1234567890',
            ]);

        // schooladmin-in ai_analysis.view permission-u yoxdur — middleware 403 qaytarır
        $response->assertStatus(403);
    }

    public function test_superadmin_can_save_ai_settings(): void
    {
        $user = $this->createUserWithRole('superadmin');

        $response = $this->actingAs($user)
            ->postJson('/api/ai-analysis/settings', [
                'provider' => 'openai',
                'api_key'  => 'sk-test-key-1234567890',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('ai_llm_settings', [
            'provider'  => 'openai',
            'is_active' => true,
        ]);
    }

    public function test_invalid_provider_is_rejected(): void
    {
        $user = $this->createUserWithRole('superadmin');

        $response = $this->actingAs($user)
            ->postJson('/api/ai-analysis/settings', [
                'provider' => 'invalid_provider',
                'api_key'  => 'sk-test-key-1234567890',
            ]);

        $response->assertStatus(422);
    }

    public function test_empty_api_key_is_rejected(): void
    {
        $user = $this->createUserWithRole('superadmin');

        $response = $this->actingAs($user)
            ->postJson('/api/ai-analysis/settings', [
                'provider' => 'openai',
                'api_key'  => '',
            ]);

        $response->assertStatus(422);
    }

    public function test_api_key_is_encrypted_in_database(): void
    {
        $user = $this->createUserWithRole('superadmin');
        $plainApiKey = 'sk-test-key-1234567890';

        $this->actingAs($user)
            ->postJson('/api/ai-analysis/settings', [
                'provider' => 'openai',
                'api_key'  => $plainApiKey,
            ]);

        // DB-dəki raw dəyər Laravel-in encrypt() funksiyası ilə şifrəliydir —
        // plain text ilə eyni olmamalıdır.
        $setting = AiLlmSetting::where('provider', 'openai')->latest()->first();
        $this->assertNotNull($setting);

        $rawKey = $setting->getRawOriginal('api_key');
        $this->assertNotEquals($plainApiKey, $rawKey);

        // Getter decrypt edib orijinal dəyəri qaytarmalıdır.
        $this->assertEquals($plainApiKey, $setting->api_key);
    }

    public function test_saving_new_provider_deactivates_old_one(): void
    {
        $user = $this->createUserWithRole('superadmin');

        // Birinci provider — openai
        $this->actingAs($user)
            ->postJson('/api/ai-analysis/settings', [
                'provider' => 'openai',
                'api_key'  => 'sk-test-1234567890',
            ]);

        // İkinci provider — anthropic
        $this->actingAs($user)
            ->postJson('/api/ai-analysis/settings', [
                'provider' => 'anthropic',
                'api_key'  => 'sk-ant-test-1234567890',
            ]);

        // Yalnız 1 aktiv qeyd olmalıdır
        $activeCount = AiLlmSetting::where('is_active', true)->count();
        $this->assertEquals(1, $activeCount);

        // Aktiv olan sonuncu seçilmiş provider olmalıdır
        $active = AiLlmSetting::where('is_active', true)->first();
        $this->assertEquals('anthropic', $active->provider);
    }

    public function test_save_response_does_not_expose_raw_api_key(): void
    {
        $user = $this->createUserWithRole('superadmin');

        $response = $this->actingAs($user)
            ->postJson('/api/ai-analysis/settings', [
                'provider' => 'gemini',
                'api_key'  => 'AIza-test-key-1234567890',
            ]);

        $response->assertStatus(200);

        // Response-da api_key sahəsi olmamalıdır (model $hidden ilə qorunub)
        $responseData = $response->json('data');
        $this->assertArrayNotHasKey('api_key', $responseData ?? []);
    }

    public function test_save_with_custom_model_persists_model_name(): void
    {
        $user = $this->createUserWithRole('superadmin');

        $this->actingAs($user)
            ->postJson('/api/ai-analysis/settings', [
                'provider' => 'openai',
                'api_key'  => 'sk-test-key-1234567890',
                'model'    => 'gpt-4-turbo',
            ]);

        $setting = AiLlmSetting::where('provider', 'openai')->latest()->first();
        $this->assertNotNull($setting);
        $this->assertEquals('gpt-4-turbo', $setting->model);
    }
}
