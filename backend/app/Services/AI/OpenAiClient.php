<?php

namespace App\Services\AI;

/**
 * @deprecated v2.0 — Bu sinif artıq istifadə edilmir.
 *
 * Əvəzinə AiProviderFactory::make() istifadə edin:
 *
 *   $provider = AiProviderFactory::make();
 *   $response = $provider->chat($messages, $options);
 *
 * Multi-LLM provider sistemi:
 * - App\Services\AI\AiProviderFactory
 * - App\Services\AI\Contracts\AiProviderInterface
 * - App\Services\AI\Providers\OpenAiProvider
 * - App\Services\AI\Providers\AnthropicProvider
 * - App\Services\AI\Providers\GeminiProvider
 *
 * Bu fayl yalnız köhnə referanslar üçün saxlanılıb.
 * Yeni kodda istifadə ETMƏYİN.
 */
class OpenAiClient
{
    /**
     * @deprecated AiProviderFactory::make()->chat() istifadə edin
     * @throws \RuntimeException Həmişə xəta atır
     */
    public function chat(array $messages, array $options = []): string
    {
        throw new \RuntimeException(
            'OpenAiClient deprecated-dir. AiProviderFactory::make()->chat() istifadə edin.'
        );
    }

    /**
     * @deprecated AiSettingsService::testConnection() istifadə edin
     */
    public function isConfigured(): bool
    {
        return AiProviderFactory::isConfigured();
    }
}
