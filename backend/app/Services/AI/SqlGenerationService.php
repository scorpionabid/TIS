<?php

namespace App\Services\AI;

use App\Services\AI\AiProviderFactory;
use Illuminate\Support\Facades\Log;

class SqlGenerationService
{
    public function __construct(
        private DatabaseSchemaService $schemaService
    ) {}

    /**
     * Dəqiqləşdirilmiş prompt əsasında SQL yaradır
     *
     * @param string $userPrompt Orijinal istifadəçi promptu
     * @param array $clarifications {question_id: answer} formatında cavablar
     * @param string $userRole İstifadəçi rolu
     * @param int|null $regionId RegionAdmin üçün region ID
     *
     * @return array{sql: string, explanation: string, suggested_visualization: string}
     */
    public function generateSql(
        string $userPrompt,
        array $clarifications = [],
        string $userRole = 'superadmin',
        ?int $regionId = null
    ): array {
        $fullSchema = $this->schemaService->getSchema();
        $schemaForPrompt = $this->buildSchemaForPrompt($fullSchema);

        $clarificationText = '';
        if (!empty($clarifications)) {
            $clarificationText = "\nDəqiqləşdirmələr:\n";
            foreach ($clarifications as $qId => $answer) {
                $clarificationText .= "- {$qId}: {$answer}\n";
            }
        }

        $regionConstraint = '';
        if ($userRole === 'regionadmin' && $regionId) {
            $regionConstraint = "\n\n⚠️ KRİTİK MƏHDUDIYYƏT: Bu istifadəçi regionadmin-dir. " .
                "Bütün sorğulara region_id = {$regionId} filtri əlavə et. " .
                "Bu olmadan sorğu qaytarma.";
        }

        $systemPrompt = <<<SYSTEM
        Sən PostgreSQL 16 verilənlər bazası ekspertisən. ATİS - Azərbaycan Təhsil İdarəetmə Sistemidir.

        VERİLƏNLƏR BAZASI SXEMİ:
        {$schemaForPrompt}

        QAYDALAR:
        1. YALNIZ SELECT sorğusu yaz - INSERT, UPDATE, DELETE, DROP qadağandır
        2. LIMIT 5000 əlavə et (LIMIT artıq yoxdursa)
        3. JOIN-ları optimallaşdır - yalnız lazımi JOIN-ları istifadə et
        4. Sütun adlarını cədvəl adı ilə birlikdə yaz (table.column formatı)
        5. Azərbaycan kontekstinə uyğun filter et{$regionConstraint}
        6. JSON formatında cavab ver - başqa heç nə yazma

        JSON FORMATI (YALNIZ JSON):
        {
          "sql": "SELECT ... FROM ... WHERE ... LIMIT 5000",
          "explanation": "Bu sorğu ... məlumatları göstərir",
          "suggested_visualization": "table"
        }

        suggested_visualization dəyərləri: table, bar, pie, line
        - table: ümumi cədvəl məlumatı
        - bar: müqayisəli məlumat (say, faiz)
        - pie: nisbət/paylanma
        - line: zamanla dəyişən məlumat
        SYSTEM;

        $userMessage = "İstifadəçi soruşur: {$userPrompt}{$clarificationText}";

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userMessage],
        ];

        try {
            $provider = AiProviderFactory::make(useSqlModel: true);
            $response = $provider->chat($messages, [
                'max_tokens'  => 1500,
                'temperature' => 0.1,
            ]);

            $json = $this->extractJson($response);
            $data = json_decode($json, true);

            if (!isset($data['sql'])) {
                throw new \RuntimeException('AI SQL cavabı gözlənilən formatda deyil');
            }

            return [
                'sql' => trim($data['sql']),
                'explanation' => $data['explanation'] ?? 'SQL uğurla yaradıldı',
                'suggested_visualization' => $data['suggested_visualization'] ?? 'table',
            ];
        } catch (\Exception $e) {
            Log::error('SqlGeneration xətası: ' . $e->getMessage(), [
                'prompt' => $userPrompt,
                'role' => $userRole,
            ]);
            throw new \RuntimeException('SQL yaratma zamanı xəta: ' . $e->getMessage());
        }
    }

    private function buildSchemaForPrompt(array $schema): string
    {
        $lines = [];
        foreach ($schema as $table) {
            $colDefs = array_map(
                fn ($c) => $c['name'] . '(' . $c['type'] . ($c['nullable'] ? ',nullable' : '') . ')',
                $table['columns']
            );

            $sampleStr = '';
            if (!empty($table['sample_data'])) {
                $firstRow = $table['sample_data'][0];
                $sampleStr = ' -- nümunə: ' . json_encode($firstRow, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }

            $lines[] = "CƏDVƏL {$table['table_name']} ({$table['row_count']} sətir): "
                . implode(', ', $colDefs) . $sampleStr;
        }
        return implode("\n", $lines);
    }

    private function extractJson(string $text): string
    {
        if (preg_match('/```(?:json)?\s*([\s\S]*?)```/i', $text, $matches)) {
            return trim($matches[1]);
        }
        if (preg_match('/\{[\s\S]*\}/s', $text, $matches)) {
            return $matches[0];
        }
        return $text;
    }
}
