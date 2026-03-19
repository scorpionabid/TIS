<?php

namespace App\Services\AI\Providers;

use App\Services\AI\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAiProvider implements AiProviderInterface
{
    private const BASE_URL   = 'https://api.openai.com/v1';
    private const MAX_RETRY  = 2;
    private const RETRY_WAIT = [0, 1, 3]; // saniyə (0-indexed)

    /** @var array{prompt_tokens: int, completion_tokens: int, total_tokens: int} */
    private array $lastTokenUsage = ['prompt_tokens' => 0, 'completion_tokens' => 0, 'total_tokens' => 0];

    public function __construct(
        private string $apiKey,
        private string $model = 'gpt-4o-mini'
    ) {}

    /**
     * OpenAI Chat Completions API-a sorğu göndər.
     * Şəbəkə xətaları üçün maksimum 2 retry (exponential backoff).
     */
    public function chat(array $messages, array $options = []): string
    {
        $payload = array_merge([
            'model'       => $this->model,
            'messages'    => $messages,
            'temperature' => 0.3,
            'max_tokens'  => 2048,
        ], $options);

        $attempt  = 0;
        $lastError = null;

        while ($attempt <= self::MAX_RETRY) {
            if ($attempt > 0) {
                sleep(self::RETRY_WAIT[$attempt] ?? 3);
                Log::info("OpenAI retry #{$attempt}", ['model' => $this->model]);
            }

            try {
                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Content-Type'  => 'application/json',
                ])
                    ->timeout(30)
                    ->post(self::BASE_URL . '/chat/completions', $payload);

                if ($response->successful()) {
                    // Token istifadəsini saxla
                    $usage = $response->json('usage', []);
                    $this->lastTokenUsage = [
                        'prompt_tokens'     => $usage['prompt_tokens'] ?? 0,
                        'completion_tokens' => $usage['completion_tokens'] ?? 0,
                        'total_tokens'      => $usage['total_tokens'] ?? 0,
                    ];

                    return $response->json('choices.0.message.content', '');
                }

                // 429 Rate Limit → retry, 4xx auth xəta → dərhal çıx
                $statusCode = $response->status();
                $errorMsg   = $response->json('error.message', 'OpenAI API xətası');

                if ($statusCode === 429 || $statusCode >= 500) {
                    $lastError = "OpenAI {$statusCode}: {$errorMsg}";
                    $attempt++;
                    continue;
                }

                throw new \RuntimeException("OpenAI {$statusCode}: {$errorMsg}");

            } catch (\Illuminate\Http\Client\ConnectionException $e) {
                $lastError = 'Şəbəkə xətası: ' . $e->getMessage();
                $attempt++;
            }
        }

        throw new \RuntimeException($lastError ?? 'OpenAI API-da bilinməyən xəta');
    }

    public function getLastTokenUsage(): array
    {
        return $this->lastTokenUsage;
    }

    public function testConnection(): array
    {
        try {
            $response = Http::withHeaders(['Authorization' => 'Bearer ' . $this->apiKey])
                ->timeout(10)
                ->get(self::BASE_URL . '/models');

            return $response->successful()
                ? ['success' => true,  'message' => 'OpenAI bağlantısı uğurludur',            'model' => $this->model]
                : ['success' => false, 'message' => 'API key yanlışdır: ' . $response->json('error.message', ''), 'model' => ''];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'Bağlantı xətası: ' . $e->getMessage(), 'model' => ''];
        }
    }

    public function getProviderName(): string
    {
        return 'openai';
    }
}
