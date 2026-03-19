<?php

namespace App\Services\AI;

use App\Models\AiLlmSetting;
use Illuminate\Support\Facades\Log;

class AiSettingsService
{
    /**
     * Provider-i yenilə: əvvəlkiləri deaktiv et, yeni aktiv qeyd yarat.
     *
     * @param string      $provider  openai | anthropic | gemini
     * @param string      $apiKey    Şifrəsiz API key (model encrypt edir)
     * @param string|null $model     Null olduqda provider default modeli istifadə edilir
     * @param int         $updatedBy Dəyişikliyi edən istifadəçinin ID-si
     */
    public function saveProvider(
        string $provider,
        string $apiKey,
        ?string $model,
        int $updatedBy
    ): AiLlmSetting {
        // Əvvəlki bütün qeydləri deaktiv et
        AiLlmSetting::query()->update(['is_active' => false]);

        // Yeni aktiv qeyd yarat (api_key setter encrypt edir)
        $setting = AiLlmSetting::create([
            'provider'   => $provider,
            'api_key'    => $apiKey,
            'model'      => $model,
            'is_active'  => true,
            'updated_by' => $updatedBy,
        ]);

        // Factory cache-ini sıfırla ki, növbəti çağırış yeni qeydi yükləsin
        AiProviderFactory::clearCache();

        Log::info("AI provider dəyişdirildi: {$provider}", [
            'updated_by' => $updatedBy,
            'model'      => $model ?? 'default',
        ]);

        return $setting;
    }

    /**
     * Aktiv provider ayarlarını qaytarır (api_key olmadan — təhlükəsizlik).
     *
     * @return array<string, mixed>|null
     */
    public function getCurrentSettings(): ?array
    {
        $setting = AiLlmSetting::where('is_active', true)->latest()->first();

        if (!$setting) {
            return null;
        }

        return [
            'provider'        => $setting->provider,
            'model'           => $setting->model,
            'effective_model' => $setting->getEffectiveModel(),
            'sql_model'       => $setting->getSqlModel(),
            'is_active'       => $setting->is_active,
            'updated_at'      => $setting->updated_at,
            // API key mövcudluğunu boolean olaraq bildiririk (key özünü deyil)
            'has_api_key'     => !empty($setting->getRawOriginal('api_key')),
        ];
    }

    /**
     * Aktiv provider-in bağlantısını test et.
     *
     * @return array{success: bool, message: string, model: string}
     */
    public function testConnection(): array
    {
        try {
            $provider = AiProviderFactory::make();

            return $provider->testConnection();
        } catch (\RuntimeException $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'model'   => '',
            ];
        }
    }

    /**
     * UI üçün dəstəklənən providerların siyahısı.
     *
     * @return array<int, array{id: string, name: string, description: string, models: array<string>, docs_url: string}>
     */
    public function getAvailableProviders(): array
    {
        return AiProviderFactory::availableProviders();
    }
}
