<?php

namespace App\Services\AI\Providers;

use App\Services\AI\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Http;

class AnthropicProvider implements AiProviderInterface
{
    private const BASE_URL = 'https://api.anthropic.com/v1';
    private const API_VERSION = '2023-06-01';

    public function __construct(
        private string $apiKey,
        private string $model = 'claude-3-5-haiku-20241022'
    ) {}

    /**
     * Anthropic Messages API-a sorğu göndər.
     *
     * Anthropic formatı OpenAI-dan fərqlidir:
     * - "system" rolu ayrı 'system' sahəsindədir
     * - Yalnız 'user' və 'assistant' rolları messages array-ındadır
     */
    public function chat(array $messages, array $options = []): string
    {
        // System mesajını ayır, qalanları messages array-ına yığ
        $systemContent = '';
        $filteredMessages = [];

        foreach ($messages as $msg) {
            if ($msg['role'] === 'system') {
                $systemContent = $msg['content'];
            } else {
                $filteredMessages[] = $msg;
            }
        }

        $payload = [
            'model'      => $options['model'] ?? $this->model,
            'max_tokens' => $options['max_tokens'] ?? 2048,
            'messages'   => $filteredMessages,
        ];

        if (!empty($systemContent)) {
            $payload['system'] = $systemContent;
        }

        $response = Http::withHeaders([
            'x-api-key'         => $this->apiKey,
            'anthropic-version' => self::API_VERSION,
            'Content-Type'      => 'application/json',
        ])
            ->timeout(30)
            ->post(self::BASE_URL . '/messages', $payload);

        if ($response->failed()) {
            $error = $response->json('error.message', 'Anthropic API xətası');
            throw new \RuntimeException('Anthropic: ' . $error);
        }

        return $response->json('content.0.text', '');
    }

    /**
     * Real API çağrışı ilə bağlantını test et (Anthropic-in ayrı test endpoint-i yoxdur).
     */
    public function testConnection(): array
    {
        try {
            $testMessages = [['role' => 'user', 'content' => 'Say "OK"']];
            $this->chat($testMessages, ['max_tokens' => 10]);

            return [
                'success' => true,
                'message' => 'Anthropic Claude bağlantısı uğurludur',
                'model'   => $this->model,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'model'   => '',
            ];
        }
    }

    public function getProviderName(): string
    {
        return 'anthropic';
    }
}
