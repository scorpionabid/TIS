<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Log;

class SqlGenerationService
{
    public function __construct(
        private DatabaseSchemaService $schemaService,
        private SchemaRelevanceFilter $relevanceFilter
    ) {}

    /**
     * Dəqiqləşdirilmiş prompt əsasında PostgreSQL SELECT sorğusu yaradır.
     *
     * Token optimizasiyası:
     *  - SchemaRelevanceFilter: yalnız əlaqəli cədvəllər (60-80% azalma)
     *  - Sample data yalnız seçilmiş cədvəllər üçün (1 sətir)
     *  - max_tokens: 1500 → 800 (SQL adətən 100-400 token)
     *  - Qısaldılmış sistem promptu
     *
     * @param  string                                                                   $userPrompt     Orijinal istifadəçi promptu
     * @param  array                                                                    $clarifications {question_id: answer} formatında cavablar
     * @param  string                                                                   $userRole       İstifadəçi rolu (superadmin | regionadmin)
     * @param  int|null                                                                 $regionId       RegionAdmin üçün region ID
     * @return array{sql: string, explanation: string, suggested_visualization: string}
     *
     * @throws \RuntimeException
     */
    public function generateSql(
        string $userPrompt,
        array $clarifications = [],
        string $userRole = 'superadmin',
        ?int $regionId = null
    ): array {
        $fullSchema = $this->schemaService->getSchema();
        $filteredSchema = $this->relevanceFilter->filter($userPrompt, $fullSchema);
        $schemaText = $this->buildSchemaText($filteredSchema);

        $regionConstraint = '';
        if ($userRole === 'regionadmin' && $regionId) {
            $regionConstraint = "\nMƏHDUDİYYƏT: region_id={$regionId} filtrini bütün sorğulara əlavə et.";
        }

        $clarText = '';
        foreach ($clarifications as $qId => $answer) {
            $clarText .= "\n- {$qId}: {$answer}";
        }

        $systemPrompt = <<<SYSTEM
PostgreSQL 16 eksperti. ATİS (Azərbaycan Təhsil İdarəetmə Sistemi).
Sxem:{$regionConstraint}
{$schemaText}

Qaydalar: SELECT-only, LIMIT 5000, table.column formatı, YALNIZ JSON cavab.
{"sql":"SELECT...LIMIT 5000","explanation":"...","suggested_visualization":"table|bar|pie|line"}
SYSTEM;

        $userMessage = $userPrompt . ($clarText ? "\nDəqiqləşdirmələr:{$clarText}" : '');

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user',   'content' => $userMessage],
        ];

        try {
            $provider = AiProviderFactory::make(useSqlModel: true);
            $response = $provider->chat($messages, [
                'max_tokens' => 800,
                'temperature' => 0.1,
            ]);

            $data = $this->decodeJson($response);

            if (empty($data['sql'])) {
                throw new \RuntimeException('AI SQL cavabı gözlənilən formatda deyil');
            }

            $tokenUsage = $provider->getLastTokenUsage();

            return [
                'sql' => trim($data['sql']),
                'explanation' => $data['explanation'] ?? 'SQL uğurla yaradıldı',
                'suggested_visualization' => $data['suggested_visualization'] ?? 'table',
                'token_usage' => $tokenUsage,
            ];
        } catch (\Exception $e) {
            Log::error('SqlGeneration xətası: ' . $e->getMessage(), [
                'prompt' => $userPrompt,
                'role' => $userRole,
            ]);
            throw new \RuntimeException('SQL yaratma zamanı xəta: ' . $e->getMessage());
        }
    }

    /**
     * Filtrlənmiş sxemadan kompakt mətn qurur.
     * Sample data: yalnız 1 sətir (əvvəlki 3-dən azaldıldı).
     */
    private function buildSchemaText(array $schema): string
    {
        $lines = [];
        foreach ($schema as $table) {
            $cols = implode(', ', array_map(
                fn ($c) => $c['name'] . ':' . $this->shortType($c['type']) . ($c['nullable'] ? '?' : ''),
                $table['columns']
            ));

            $sample = '';
            if (! empty($table['sample_data'][0])) {
                $sample = ' ex:' . json_encode($table['sample_data'][0], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }

            $lines[] = "{$table['table_name']}({$table['row_count']}): {$cols}{$sample}";
        }

        return implode("\n", $lines);
    }

    /**
     * PostgreSQL tipi → qısa etiket (token qənaəti üçün).
     */
    private function shortType(string $type): string
    {
        return match (true) {
            str_contains($type, 'int') => 'int',
            str_contains($type, 'char'),
            str_contains($type, 'text') => 'str',
            str_contains($type, 'bool') => 'bool',
            str_contains($type, 'timestamp') => 'ts',
            str_contains($type, 'date') => 'date',
            str_contains($type, 'numeric'),
            str_contains($type, 'decimal'),
            str_contains($type, 'float'),
            str_contains($type, 'real') => 'num',
            str_contains($type, 'json') => 'json',
            default => $type,
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
}
