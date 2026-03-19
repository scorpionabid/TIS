<?php

namespace App\Services\AI;

use App\Services\AI\AiProviderFactory;
use Illuminate\Support\Facades\Log;

class PromptEnhancementService
{
    public function __construct(
        private DatabaseSchemaService $schemaService,
        private SchemaRelevanceFilter $relevanceFilter
    ) {}

    /**
     * İstifadəçinin sadə promptu əsasında dəqiqləşdirici suallar qaytarır.
     *
     * Token optimizasiyası:
     *  - SchemaRelevanceFilter: yalnız əlaqəli cədvəllər göndərilir (60-80% azalma)
     *  - max_tokens: 1024 → 512 (suallar qısa olur)
     *  - Qısaldılmış sistem promptu (duplikat qaydalar silindi)
     *
     * @return array{questions: array<array{id: string, question: string, type: string, options: array}>}
     */
    public function generateClarificationQuestions(string $userPrompt): array
    {
        $fullSchema      = $this->schemaService->getSchema();
        $filteredSchema  = $this->relevanceFilter->filter($userPrompt, $fullSchema);
        $condensedSchema = $this->buildCondensedSchema($filteredSchema);

        $systemPrompt = <<<SYSTEM
ATİS DB eksperti. Sxem (yalnız əlaqəli cədvəllər):
{$condensedSchema}

Azərbaycan dilində 2-4 konkretləşdirici sual ver. YALNIZ JSON:
{"questions":[{"id":"q1","question":"...","type":"single","options":["A","B"]},{"id":"q2","question":"...","type":"text","options":[]}]}
type: single=radio, multi=checkbox, text=açıq mətn
SYSTEM;

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user',   'content' => $userPrompt],
        ];

        try {
            $provider = AiProviderFactory::make();
            $response = $provider->chat($messages, ['max_tokens' => 512]);

            $data = $this->decodeJson($response);

            if (empty($data['questions']) || !is_array($data['questions'])) {
                throw new \RuntimeException('Gözlənilməz AI cavab formatı');
            }

            return $data;
        } catch (\Exception $e) {
            Log::warning('PromptEnhancement xətası: ' . $e->getMessage());
            return $this->getFallbackQuestions();
        }
    }

    /**
     * Filtrlənmiş cədvəllərdən kondensə sxema mətni qurur.
     * Sample data daxil edilmir — token qənaəti.
     */
    private function buildCondensedSchema(array $schema): string
    {
        return implode("\n", array_map(
            fn ($t) => $t['table_name'] . '(' . $t['row_count'] . '): '
                . implode(', ', array_map(
                    fn ($c) => $c['name'] . ':' . $this->shortType($c['type']),
                    $t['columns']
                )),
            $schema
        ));
    }

    /**
     * PostgreSQL tipi → qısa etiket (token qənaəti üçün).
     */
    private function shortType(string $type): string
    {
        return match (true) {
            str_contains($type, 'int')       => 'int',
            str_contains($type, 'char'),
            str_contains($type, 'text')      => 'str',
            str_contains($type, 'bool')      => 'bool',
            str_contains($type, 'timestamp') => 'ts',
            str_contains($type, 'date')      => 'date',
            str_contains($type, 'numeric'),
            str_contains($type, 'decimal'),
            str_contains($type, 'float'),
            str_contains($type, 'real')      => 'num',
            str_contains($type, 'json')      => 'json',
            default                          => $type,
        };
    }

    private function decodeJson(string $text): array
    {
        if (preg_match('/```(?:json)?\s*([\s\S]*?)```/i', $text, $m)) {
            $text = trim($m[1]);
        } elseif (preg_match('/(\{[\s\S]*\})/s', $text, $m)) {
            $text = $m[1];
        }
        return json_decode($text, true) ?? [];
    }

    private function getFallbackQuestions(): array
    {
        return [
            'questions' => [
                [
                    'id'       => 'q1',
                    'question' => 'Hansı tədris ilini nəzərdə tutursunuz?',
                    'type'     => 'single',
                    'options'  => ['2023-2024', '2024-2025', 'Hamısı'],
                ],
                [
                    'id'       => 'q2',
                    'question' => 'Hansı müəssisəyə aid məlumat lazımdır?',
                    'type'     => 'text',
                    'options'  => [],
                ],
            ],
        ];
    }
}
