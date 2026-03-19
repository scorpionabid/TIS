<?php

namespace App\Services\AI\Providers;

use App\Services\AI\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AnthropicProvider implements AiProviderInterface
{
    private const BASE_URL    = 'https://api.anthropic.com/v1';
    private const API_VERSION = '2023-06-01';
    private const MAX_RETRY   = 2;
    private const RETRY_WAIT  = [0, 1, 3];

    /** @var array{prompt_tokens: int, completion_tokens: int, total_tokens: int} */
    private array $lastTokenUsage = ['prompt_tokens' => 0, 'completion_tokens' => 0, 'total_tokens' => 0];

    public function __construct(
        private string $apiKey,
        private string $model = 'claude-3-5-haiku-20241022'
    ) {}

    /**
     * Anthropic Messages API-a sorğu göndər.
     *
     * Format fərqləri:
     * - "system" rolu ayrı 'system' sahəsindədir
     * - Yalnız 'user' və 'assistant' messages array-ındadır
     * - Retry: 529 Overloaded + 5xx + şəbəkə xətaları
     *
     * Prompt Caching:
     * - System prompt > 1024 token olarsa Anthropic-in prompt caching-i aktiv olur
     * - Eyni system prompt-la 5 dəq ərzində gələn sorğular cached olur (90% qənaət)
     */
    public function chat(array $messages, array $options = []): string
    {
        $systemContent    = '';
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
            // Prompt Caching: cache_control ephemeral → 5 dəqiqə cache
            $payload['system'] = [
                [
                    'type' => 'text',
                    'text' => $systemContent,
                    'cache_control' => ['type' => 'ephemeral'],
                ],
            ];
        }

        $attempt   = 0;
        $lastError = null;

        while ($attempt <= self::MAX_RETRY) {
            if ($attempt > 0) {
                sleep(self::RETRY_WAIT[$attempt] ?? 3);
                Log::info("Anthropic retry #{$attempt}", ['model' => $this->model]);
            }

            try {
                $response = Http::withHeaders([
                    'x-api-key'                  => $this->apiKey,
                    'anthropic-version'           => self::API_VERSION,
                    'anthropic-beta'              => 'prompt-caching-2024-07-31',
                    'Content-Type'               => 'application/json',
                ])
                    ->timeout(30)
                    ->post(self::BASE_URL . '/messages', $payload);

                if ($response->successful()) {
                    $usage = $response->json('usage', []);
                    $inputTokens  = ($usage['input_tokens'] ?? 0);
                    $outputTokens = ($usage['output_tokens'] ?? 0);

                    $this->lastTokenUsage = [
                        'prompt_tokens'     => $inputTokens,
                        'completion_tokens' => $outputTokens,
                        'total_tokens'      => $inputTokens + $outputTokens,
                    ];

                    return $response->json('content.0.text', '');
                }

                $statusCode = $response->status();
                $errorMsg   = $response->json('error.message', 'Anthropic API xətası');

                // 529 = Overloaded, 5xx = server xəta → retry
                if ($statusCode === 529 || $statusCode >= 500) {
                    $lastError = "Anthropic {$statusCode}: {$errorMsg}";
                    $attempt++;
                    continue;
                }

                throw new \RuntimeException("Anthropic {$statusCode}: {$errorMsg}");

            } catch (\Illuminate\Http\Client\ConnectionException $e) {
                $lastError = 'Şəbəkə xətası: ' . $e->getMessage();
                $attempt++;
            }
        }

        throw new \RuntimeException($lastError ?? 'Anthropic API-da bilinməyən xəta');
    }

    public function getLastTokenUsage(): array
    {
        return $this->lastTokenUsage;
    }

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
