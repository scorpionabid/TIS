<?php

namespace App\Services\AI;

use App\Models\AiLlmSetting;
use App\Services\AI\Contracts\AiProviderInterface;
use App\Services\AI\Providers\AnthropicProvider;
use App\Services\AI\Providers\GeminiProvider;
use App\Services\AI\Providers\OpenAiProvider;
use Illuminate\Support\Facades\Cache;

class AiProviderFactory
{
    private const CACHE_KEY = 'ai_llm_active_setting';
    private const CACHE_TTL = 300; // 5 dəqiqə

    /**
     * DB-dən aktiv provider-i yükləyib qaytarır.
     *
     * @param bool $useSqlModel SQL generasiya üçün güclü model istifadə et
     * @throws \RuntimeException Provider konfiqurasiya edilməyibsə
     */
    public static function make(bool $useSqlModel = false): AiProviderInterface
    {
        /** @var AiLlmSetting|null $setting */
        $setting = Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return AiLlmSetting::where('is_active', true)->latest()->first();
        });

        if (!$setting) {
            throw new \RuntimeException(
                'AI provider konfiqurasiya edilməyib. ' .
                'Superadmin panelindən AI İdarəetmə səhifəsinə keçib API key əlavə edin.'
            );
        }

        $model = $useSqlModel ? $setting->getSqlModel() : $setting->getEffectiveModel();

        // api_key getter-i avtomatik decrypt edir
        $apiKey = $setting->api_key;

        return match ($setting->provider) {
            'openai'    => new OpenAiProvider($apiKey, $model),
            'anthropic' => new AnthropicProvider($apiKey, $model),
            'gemini'    => new GeminiProvider($apiKey, $model),
            default     => throw new \RuntimeException("Naməlum provider: {$setting->provider}"),
        };
    }

    /**
     * Aktiv AI provider konfiqurasiya edilib mi?
     */
    public static function isConfigured(): bool
    {
        return AiLlmSetting::where('is_active', true)->exists();
    }

    /**
     * Settings dəyişdikdə cache-i sıfırla.
     * AiSettingsService.saveProvider() çağırır.
     */
    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Dəstəklənən providerların tam siyahısı (UI üçün).
     *
     * @return array<int, array{id: string, name: string, description: string, models: array<string>, docs_url: string}>
     */
    public static function availableProviders(): array
    {
        return [
            [
                'id'          => 'openai',
                'name'        => 'OpenAI (GPT)',
                'description' => 'GPT-4o, GPT-4o-mini və O1 seriyası',
                'models'      => ['gpt-4o-mini', 'gpt-4o', 'o1-preview', 'o1-mini', 'gpt-4-turbo'],
                'docs_url'    => 'https://platform.openai.com/api-keys',
            ],
            [
                'id'          => 'anthropic',
                'name'        => 'Anthropic (Claude)',
                'description' => 'Claude 3.5 Sonnet v2 və Haiku modelleri',
                'models'      => [
                    'claude-3-5-sonnet-20241022',
                    'claude-3-5-haiku-20241022',
                    'claude-3-opus-20240229',
                ],
                'docs_url'    => 'https://console.anthropic.com/',
            ],
            [
                'id'          => 'gemini',
                'name'        => 'Google (Gemini)',
                'description' => 'Gemini 2.0 Flash, 1.5 Pro və Flash',
                'models'      => [
                    'gemini-2.0-flash', 
                    'gemini-2.0-flash-lite-preview-02-05',
                    'gemini-1.5-pro', 
                    'gemini-1.5-flash'
                ],
                'docs_url'    => 'https://aistudio.google.com/apikey',
            ],
        ];
    }
}
