<?php

namespace App\Services\AI\Providers;

use App\Services\AI\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Http;

class GeminiProvider implements AiProviderInterface
{
    private const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

    public function __construct(
        private string $apiKey,
        private string $model = 'gemini-1.5-flash'
    ) {}

    /**
     * Google Gemini generateContent API-a sorğu göndər.
     *
     * Gemini formatı fərqlidir:
     * - "system" rolu ayrı 'system_instruction' sahəsindədir
     * - "assistant" rolu 'model' kimi göndərilir
     * - API key URL parametri kimi göndərilir (header deyil)
     */
    public function chat(array $messages, array $options = []): string
    {
        $model = $options['model'] ?? $this->model;

        // Gemini formatına çevir
        $contents = [];
        $systemInstruction = null;

        foreach ($messages as $msg) {
            if ($msg['role'] === 'system') {
                $systemInstruction = ['parts' => [['text' => $msg['content']]]];
            } elseif ($msg['role'] === 'user') {
                $contents[] = ['role' => 'user', 'parts' => [['text' => $msg['content']]]];
            } elseif ($msg['role'] === 'assistant') {
                // Gemini-də "assistant" → "model"
                $contents[] = ['role' => 'model', 'parts' => [['text' => $msg['content']]]];
            }
        }

        $payload = [
            'contents'         => $contents,
            'generationConfig' => [
                'maxOutputTokens' => $options['max_tokens'] ?? 2048,
                'temperature'     => 0.3,
            ],
        ];

        if ($systemInstruction) {
            $payload['system_instruction'] = $systemInstruction;
        }

        $url = self::BASE_URL . "/models/{$model}:generateContent?key={$this->apiKey}";

        $response = Http::timeout(30)->post($url, $payload);

        if ($response->failed()) {
            $error = $response->json('error.message', 'Gemini API xətası');
            throw new \RuntimeException('Gemini: ' . $error);
        }

        return $response->json('candidates.0.content.parts.0.text', '');
    }

    /**
     * Models siyahısına sorğu göndərərək API key-i yoxla.
     */
    public function testConnection(): array
    {
        try {
            $url = self::BASE_URL . "/models?key={$this->apiKey}";
            $response = Http::timeout(10)->get($url);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Google Gemini bağlantısı uğurludur',
                    'model'   => $this->model,
                ];
            }

            return [
                'success' => false,
                'message' => 'API key yanlışdır: ' . $response->json('error.message', ''),
                'model'   => '',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Bağlantı xətası: ' . $e->getMessage(),
                'model'   => '',
            ];
        }
    }

    public function getProviderName(): string
    {
        return 'gemini';
    }
}
