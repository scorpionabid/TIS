<?php

namespace App\Services\AI\Providers;

use App\Services\AI\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiProvider implements AiProviderInterface
{
    private const BASE_URL   = 'https://generativelanguage.googleapis.com/v1beta';
    private const MAX_RETRY  = 2;
    private const RETRY_WAIT = [0, 1, 3];

    /** @var array{prompt_tokens: int, completion_tokens: int, total_tokens: int} */
    private array $lastTokenUsage = ['prompt_tokens' => 0, 'completion_tokens' => 0, 'total_tokens' => 0];

    public function __construct(
        private string $apiKey,
        private string $model = 'gemini-1.5-flash'
    ) {}

    /**
     * Google Gemini generateContent API-a sorğu göndər.
     *
     * Format fərqləri:
     * - "system" rolu → 'system_instruction' sahəsi
     * - "assistant" rolu → 'model' kimi göndərilir
     * - API key URL parametri kimi (header deyil)
     * - Retry: 503 + 5xx + şəbəkə xətaları
     */
    public function chat(array $messages, array $options = []): string
    {
        $model             = $options['model'] ?? $this->model;
        $contents          = [];
        $systemInstruction = null;

        foreach ($messages as $msg) {
            if ($msg['role'] === 'system') {
                $systemInstruction = ['parts' => [['text' => $msg['content']]]];
            } elseif ($msg['role'] === 'user') {
                $contents[] = ['role' => 'user',  'parts' => [['text' => $msg['content']]]];
            } elseif ($msg['role'] === 'assistant') {
                $contents[] = ['role' => 'model', 'parts' => [['text' => $msg['content']]]];
            }
        }

        $payload = [
            'contents'         => $contents,
            'generationConfig' => [
                'maxOutputTokens' => $options['max_tokens'] ?? 2048,
                'temperature'     => $options['temperature'] ?? 0.3,
            ],
        ];

        if ($systemInstruction) {
            $payload['system_instruction'] = $systemInstruction;
        }

        $url       = self::BASE_URL . "/models/{$model}:generateContent?key={$this->apiKey}";
        $attempt   = 0;
        $lastError = null;

        while ($attempt <= self::MAX_RETRY) {
            if ($attempt > 0) {
                sleep(self::RETRY_WAIT[$attempt] ?? 3);
                Log::info("Gemini retry #{$attempt}", ['model' => $model]);
            }

            try {
                $response = Http::timeout(30)->post($url, $payload);

                if ($response->successful()) {
                    $meta = $response->json('usageMetadata', []);
                    $prompt     = $meta['promptTokenCount'] ?? 0;
                    $completion = $meta['candidatesTokenCount'] ?? 0;

                    $this->lastTokenUsage = [
                        'prompt_tokens'     => $prompt,
                        'completion_tokens' => $completion,
                        'total_tokens'      => $meta['totalTokenCount'] ?? ($prompt + $completion),
                    ];

                    return $response->json('candidates.0.content.parts.0.text', '');
                }

                $statusCode = $response->status();
                $errorMsg   = $response->json('error.message', 'Gemini API xətası');

                if ($statusCode === 503 || $statusCode >= 500) {
                    $lastError = "Gemini {$statusCode}: {$errorMsg}";
                    $attempt++;
                    continue;
                }

                throw new \RuntimeException("Gemini {$statusCode}: {$errorMsg}");

            } catch (\Illuminate\Http\Client\ConnectionException $e) {
                $lastError = 'Şəbəkə xətası: ' . $e->getMessage();
                $attempt++;
            }
        }

        throw new \RuntimeException($lastError ?? 'Gemini API-da bilinməyən xəta');
    }

    public function getLastTokenUsage(): array
    {
        return $this->lastTokenUsage;
    }

    public function testConnection(): array
    {
        try {
            $url      = self::BASE_URL . "/models?key={$this->apiKey}";
            $response = Http::timeout(10)->get($url);

            return $response->successful()
                ? ['success' => true,  'message' => 'Google Gemini bağlantısı uğurludur',        'model' => $this->model]
                : ['success' => false, 'message' => 'API key yanlışdır: ' . $response->json('error.message', ''), 'model' => ''];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'Bağlantı xətası: ' . $e->getMessage(), 'model' => ''];
        }
    }

    public function getProviderName(): string
    {
        return 'gemini';
    }
}
