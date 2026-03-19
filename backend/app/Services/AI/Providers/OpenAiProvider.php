<?php

namespace App\Services\AI\Providers;

use App\Services\AI\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Http;

class OpenAiProvider implements AiProviderInterface
{
    private const BASE_URL = 'https://api.openai.com/v1';

    public function __construct(
        private string $apiKey,
        private string $model = 'gpt-4o-mini'
    ) {}

    /**
     * OpenAI Chat Completions API-a sorğu göndər.
     * options['model'] verilsə, constructor model-ini override edir.
     */
    public function chat(array $messages, array $options = []): string
    {
        $payload = array_merge([
            'model'       => $this->model,
            'messages'    => $messages,
            'temperature' => 0.3,
            'max_tokens'  => 2048,
        ], $options);

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Content-Type'  => 'application/json',
        ])
            ->timeout(30)
            ->post(self::BASE_URL . '/chat/completions', $payload);

        if ($response->failed()) {
            $error = $response->json('error.message', 'OpenAI API xətası');
            throw new \RuntimeException('OpenAI: ' . $error);
        }

        return $response->json('choices.0.message.content', '');
    }

    /**
     * API key-i yoxlamaq üçün /models endpoint-inə sorğu göndər.
     */
    public function testConnection(): array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
            ])
                ->timeout(10)
                ->get(self::BASE_URL . '/models');

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'OpenAI bağlantısı uğurludur',
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
        return 'openai';
    }
}
