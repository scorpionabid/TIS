<?php

namespace App\Services\AI\Contracts;

interface AiProviderInterface
{
    /**
     * Chat completion sorğusu göndər.
     *
     * @param  array<int, array{role: string, content: string}> $messages
     *                                                                    Mesaj siyahısı: [['role' => 'system'|'user'|'assistant', 'content' => '...']]
     * @param  array<string, mixed>                             $options
     *                                                                    Əlavə seçimlər: ['max_tokens' => int, 'temperature' => float, 'model' => string]
     * @return string                                           AI-nin cavab mətni
     *
     * @throws \RuntimeException API xətası baş verdikdə
     */
    public function chat(array $messages, array $options = []): string;

    /**
     * Son chat() çağırışının token istifadəsini qaytarır.
     * chat() çağırıldıqdan sonra istifadə edilməlidir.
     *
     * @return array{prompt_tokens: int, completion_tokens: int, total_tokens: int}
     */
    public function getLastTokenUsage(): array;

    /**
     * API key-in düzgün olduğunu yoxla.
     *
     * @return array{success: bool, message: string, model: string}
     */
    public function testConnection(): array;

    /**
     * Provider identifikatorunu qaytarır.
     * Dəyərlər: 'openai' | 'anthropic' | 'gemini'
     */
    public function getProviderName(): string;
}
