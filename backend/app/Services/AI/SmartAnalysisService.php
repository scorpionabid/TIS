<?php

namespace App\Services\AI;

use App\Services\AI\AiProviderFactory;
use Illuminate\Support\Facades\Log;

/**
 * Tək AI call ilə "dəqiqləşdir VƏ ya SQL yarat" qərarını verir.
 *
 * Strategiya:
 *  - AI-dan tək sorğuda qərar verilir:
 *      a) Prompt aydındırsa → birbaşa SQL qaytarılır (1 API call, 0 friction)
 *      b) Prompt qeyri-müəyyəndirsə → dəqiqləşdirici suallar qaytarılır (kullanıcı cavabladıqdan sonra SqlGenerationService işə düşür)
 *  - Token qənaəti: əlavə enhance-prompt call aradan qalxır (ümumi 50% azalma)
 */
class SmartAnalysisService
{
    public function __construct(
        private DatabaseSchemaService $schemaService,
        private SchemaRelevanceFilter $relevanceFilter
    ) {}

    /**
     * Promptu analiz edir:
     *  - Aydın prompt → {mode: "sql", sql, explanation, suggested_visualization}
     *  - Qeyri-müəyyən prompt → {mode: "clarify", questions: [...]}
     *
     * @param string   $userPrompt
     * @param string   $userRole
     * @param int|null $regionId
     *
     * @return array{mode: "sql"|"clarify", sql?: string, explanation?: string,
     *               suggested_visualization?: string, questions?: array}
     * @throws \RuntimeException
     */
    public function analyze(
        string $userPrompt,
        string $userRole = 'superadmin',
        ?int $regionId = null
    ): array {
        $fullSchema     = $this->schemaService->getSchema();
        $filteredSchema = $this->relevanceFilter->filter($userPrompt, $fullSchema);
        $schemaText     = $this->buildSchemaText($filteredSchema);

        $regionConstraint = '';
        if ($userRole === 'regionadmin' && $regionId) {
            $regionConstraint = "\nMƏHDUDİYYƏT: region_id={$regionId} bütün sorğulara əlavə et.";
        }

        $systemPrompt = <<<SYSTEM
PostgreSQL 16 eksperti. ATİS (Azərbaycan Təhsil İdarəetmə Sistemi).{$regionConstraint}
Sxem:
{$schemaText}

Qaydalar:
- SELECT-only, LIMIT 5000, table.column formatı
- Prompt aydındırsa → sql_result, aydın deyilsə → clarify
- YALNIZ JSON cavab

AYDIQ PROMPT (birbaşa SQL):
{"mode":"sql","sql":"SELECT...LIMIT 5000","explanation":"...","suggested_visualization":"table|bar|pie|line"}

QEYRİ-MÜƏYYƏİN PROMPT (dəqiqləşdirici suallar):
{"mode":"clarify","questions":[{"id":"q1","question":"...","type":"single","options":["A","B"]},{"id":"q2","question":"...","type":"text","options":[]}]}
type: single=radio, multi=checkbox, text=açıq
SYSTEM;

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user',   'content' => $userPrompt],
        ];

        try {
            // SQL generasiya modeli istifadə et — həm SQL həm qərar dəqiqliyi üçün
            $provider = AiProviderFactory::make(useSqlModel: true);
            $response = $provider->chat($messages, [
                'max_tokens'  => 900,
                'temperature' => 0.1,
            ]);

            $data = $this->decodeJson($response);

            return $this->validateAndNormalize($data);

        } catch (\Exception $e) {
            Log::error('SmartAnalysis xətası: ' . $e->getMessage(), [
                'prompt' => $userPrompt,
                'role'   => $userRole,
            ]);
            throw new \RuntimeException('Analiz zamanı xəta: ' . $e->getMessage());
        }
    }

    /**
     * AI cavabını normalize edir — gözlənilməz formatlara qarşı müdafiə.
     */
    private function validateAndNormalize(array $data): array
    {
        $mode = $data['mode'] ?? null;

        if ($mode === 'sql' && !empty($data['sql'])) {
            return [
                'mode'                    => 'sql',
                'sql'                     => trim($data['sql']),
                'explanation'             => $data['explanation'] ?? 'SQL uğurla yaradıldı',
                'suggested_visualization' => $data['suggested_visualization'] ?? 'table',
            ];
        }

        if ($mode === 'clarify' && !empty($data['questions'])) {
            return [
                'mode'      => 'clarify',
                'questions' => $data['questions'],
            ];
        }

        // Fallback: mode yoxdursa amma sql varsa
        if (!empty($data['sql'])) {
            return [
                'mode'                    => 'sql',
                'sql'                     => trim($data['sql']),
                'explanation'             => $data['explanation'] ?? 'SQL uğurla yaradıldı',
                'suggested_visualization' => $data['suggested_visualization'] ?? 'table',
            ];
        }

        // Fallback: mode yoxdursa amma questions varsa
        if (!empty($data['questions'])) {
            return [
                'mode'      => 'clarify',
                'questions' => $data['questions'],
            ];
        }

        throw new \RuntimeException('AI cavabı nə SQL, nə də clarify formatındadır');
    }

    /**
     * Filtrlənmiş sxemadan kompakt mətn qurur (sample data: 1 sətir).
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
            if (!empty($table['sample_data'][0])) {
                $sample = ' ex:' . json_encode($table['sample_data'][0], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }

            $lines[] = "{$table['table_name']}({$table['row_count']}): {$cols}{$sample}";
        }
        return implode("\n", $lines);
    }

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
}
