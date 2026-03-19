<?php

namespace App\Services\AI;

use App\Services\AI\AiProviderFactory;
use Illuminate\Support\Facades\Log;

class PromptEnhancementService
{
    public function __construct(
        private DatabaseSchemaService $schemaService
    ) {}

    /**
     * İstifadəçinin sadə promptu əsasında dəqiqləşdirici suallar qaytarır
     *
     * @return array{questions: array<array{id: string, question: string, type: string, options: array}>}
     */
    public function generateClarificationQuestions(string $userPrompt): array
    {
        $condensedSchema = $this->schemaService->getCondensedSchema();

        $systemPrompt = <<<SYSTEM
        Sən ATİS (Azərbaycan Təhsil İdarəetmə Sistemi) verilənlər bazası ekspertisən.

        Verilənlər bazası sxemi:
        {$condensedSchema}

        Sənin vəzifən: İstifadəçinin sadə Azərbaycan dilindəki sualını daha dəqiq SQL sorğusuna çevirmək üçün
        lazımi məlumatları toplamaq.

        QAYDALAR:
        1. Azərbaycan dilində cavab ver
        2. Yalnız sorğunu konkretləşdirəcək 2-4 sual ver
        3. Artıq məlum olan məlumatları soruşma
        4. Sadə seçim sualları qoy (radio, checkbox, ya da qısa mətn)
        5. JSON formatında cavab ver

        JSON FORMATI (YALNIZ JSON, heç bir izah yox):
        {
          "questions": [
            {
              "id": "q1",
              "question": "Sual mətni burada",
              "type": "single",
              "options": ["Seçim 1", "Seçim 2", "Seçim 3"]
            },
            {
              "id": "q2",
              "question": "Başqa sual",
              "type": "multi",
              "options": ["A", "B", "C"]
            },
            {
              "id": "q3",
              "question": "Açıq sual",
              "type": "text",
              "options": []
            }
          ]
        }

        type dəyərləri:
        - "single": tək seçim (radio)
        - "multi": çoxlu seçim (checkbox)
        - "text": sərbəst mətn
        SYSTEM;

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => 'İstifadəçi soruşur: ' . $userPrompt],
        ];

        try {
            $provider = AiProviderFactory::make();
            $response = $provider->chat($messages, ['max_tokens' => 1024]);

            $json = $this->extractJson($response);
            $data = json_decode($json, true);

            if (!isset($data['questions']) || !is_array($data['questions'])) {
                throw new \RuntimeException('AI cavabı gözlənilən formatda deyil');
            }

            return $data;
        } catch (\RuntimeException $e) {
            Log::warning('PromptEnhancement xətası: ' . $e->getMessage());
            // Fallback: standart suallar
            return $this->getFallbackQuestions($userPrompt);
        }
    }

    private function extractJson(string $text): string
    {
        // Markdown code block-u çıxar
        if (preg_match('/```(?:json)?\s*([\s\S]*?)```/i', $text, $matches)) {
            return trim($matches[1]);
        }
        // JSON object tap
        if (preg_match('/\{[\s\S]*\}/s', $text, $matches)) {
            return $matches[0];
        }
        return $text;
    }

    private function getFallbackQuestions(string $prompt): array
    {
        return [
            'questions' => [
                [
                    'id' => 'q1',
                    'question' => 'Hansı tədris ilini nəzərdə tutursunuz?',
                    'type' => 'single',
                    'options' => ['2023-2024', '2024-2025', 'Hamısı'],
                ],
                [
                    'id' => 'q2',
                    'question' => 'Nəticənin hansı sütunlarını görmək istəyirsiniz?',
                    'type' => 'text',
                    'options' => [],
                ],
            ],
        ];
    }
}
