<?php

namespace App\Services\AI;

/**
 * İstifadəçinin promptu əsasında ən əlaqəli DB cədvəllərini filtrlər.
 *
 * Məqsəd: Bütün 100+ cədvəl əvəzinə yalnız sorğuya aid 5-15 cədvəli
 * AI-a göndərərək token istifadəsini 60-80% azaltmaq.
 *
 * Strategiya (3 mərhələ):
 *   1. Birbaşa uyğunluq — prompt-da cədvəl/sütun adı birbaşa var
 *   2. Semantik uyğunluq — sinonim/domain açar sözlər üst-üstə düşür
 *   3. Əlaqəli cədvəllər — uyğun cədvəlin FK qonşuları əlavə olunur
 *   + Core cədvəllər həmişə daxil edilir
 */
class SchemaRelevanceFilter
{
    /**
     * Maksimal qaytarılan cədvəl sayı (token limitini qorumaq üçün)
     */
    private const MAX_TABLES = 20;

    /**
     * Həmişə daxil edilən əsas cədvəllər (kontekst üçün vacib)
     */
    private const CORE_TABLES = [
        'users',
        'institutions',
        'schools',
    ];

    /**
     * Domain-spesifik açar söz → cədvəl eşləşdirmə lüğəti.
     * Key: axtarılan açar söz (Azərbaycan + İngilis)
     * Value: prioritet cədvəl adları siyahısı
     */
    private const KEYWORD_TABLE_MAP = [
        // Davamiyyət
        'davamiyyət'     => ['class_attendance', 'school_attendance', 'student_daily_attendance'],
        'attendance'     => ['class_attendance', 'school_attendance', 'student_daily_attendance'],
        'gəlməyib'       => ['class_attendance', 'school_attendance'],
        'iştirak'        => ['class_attendance', 'school_attendance'],
        'qayıb'          => ['class_attendance', 'school_attendance'],
        'absent'         => ['class_attendance', 'school_attendance'],

        // Şagird
        'şagird'         => ['students', 'student_enrollments', 'student_profiles'],
        'tələbə'         => ['students', 'student_enrollments'],
        'student'        => ['students', 'student_enrollments', 'student_profiles'],
        'uşaq'           => ['students'],
        'övlad'          => ['students'],

        // Müəllim
        'müəllim'        => ['teachers', 'teacher_subjects', 'teacher_workloads'],
        'teacher'        => ['teachers', 'teacher_subjects', 'teacher_workloads'],
        'pedaqoq'        => ['teachers'],
        'mütəxəssis'     => ['teachers'],

        // Sinif
        'sinif'          => ['classes', 'class_enrollments', 'class_attendance'],
        'class'          => ['classes', 'class_enrollments'],
        'qrup'           => ['classes', 'groups'],
        'group'          => ['classes', 'groups'],

        // Qiymət
        'qiymət'         => ['grades', 'grade_entries', 'student_grades'],
        'qiymətləndir'   => ['grades', 'grade_entries'],
        'bal'            => ['grades', 'grade_entries', 'survey_responses'],
        'grade'          => ['grades', 'grade_entries', 'student_grades'],
        'mark'           => ['grades', 'grade_entries'],
        'imtahan'        => ['exams', 'exam_results', 'grades'],
        'exam'           => ['exams', 'exam_results'],
        'test'           => ['exams', 'exam_results'],

        // Məktəb
        'məktəb'         => ['schools', 'school_stats', 'school_attendance'],
        'school'         => ['schools', 'school_stats'],
        'lisey'          => ['schools'],
        'gimnaziya'      => ['schools'],
        'kollec'         => ['schools'],

        // Müəssisə / Region
        'müəssisə'       => ['institutions'],
        'institution'    => ['institutions'],
        'region'         => ['institutions', 'regions'],
        'rayon'          => ['institutions'],
        'sektor'         => ['institutions'],
        'nazirlik'       => ['institutions'],

        // Fənn / Dərs
        'fənn'           => ['subjects', 'teacher_subjects', 'class_schedules'],
        'subject'        => ['subjects', 'teacher_subjects'],
        'dərs'           => ['subjects', 'class_schedules', 'lessons'],
        'cədvəl'         => ['class_schedules', 'schedules'],
        'schedule'       => ['class_schedules', 'schedules'],
        'dərslik'        => ['textbooks', 'subjects'],

        // Məzun / Qeydiyyat
        'qeydiyyat'      => ['student_enrollments', 'registrations'],
        'enrollment'     => ['student_enrollments'],
        'məzun'          => ['graduates', 'student_enrollments'],
        'graduate'       => ['graduates'],
        'buraxılış'      => ['graduates'],

        // İstifadəçi / Hesab
        'istifadəçi'     => ['users', 'user_profiles'],
        'user'           => ['users', 'user_profiles'],
        'hesab'          => ['users'],
        'account'        => ['users'],
        'giriş'          => ['users', 'login_logs'],
        'login'          => ['users', 'login_logs'],
        'parol'          => ['users'],
        'password'       => ['users'],

        // Rol / İcazə
        'rol'            => ['roles', 'model_has_roles'],
        'role'           => ['roles', 'model_has_roles'],
        'icazə'          => ['permissions', 'model_has_permissions'],
        'permission'     => ['permissions', 'model_has_permissions'],
        'inzibatçı'      => ['users', 'roles'],
        'admin'          => ['users', 'roles'],

        // Hesabat / Statistika
        'hesabat'        => ['reports', 'school_stats', 'survey_responses'],
        'report'         => ['reports', 'school_stats'],
        'statistika'     => ['school_stats', 'reports', 'survey_responses'],
        'statistic'      => ['school_stats', 'reports'],
        'analiz'         => ['reports', 'school_stats', 'survey_responses'],
        'analysis'       => ['reports', 'school_stats'],
        'say'            => ['school_stats', 'class_attendance'],
        'count'          => ['school_stats'],
        'faiz'           => ['school_stats', 'grades'],
        'percent'        => ['school_stats', 'grades'],
        'nisbət'         => ['school_stats', 'grades'],

        // Anket / Sorğu
        'anket'          => ['surveys', 'survey_questions', 'survey_responses'],
        'survey'         => ['surveys', 'survey_questions', 'survey_responses'],
        'sorğu'          => ['surveys', 'survey_questions', 'survey_responses'],
        'rəy'            => ['surveys', 'survey_responses'],

        // İş yükü / Cədvəl
        'iş yükü'        => ['teacher_workloads', 'teacher_subjects'],
        'workload'       => ['teacher_workloads'],
        'norma'          => ['teacher_workloads'],
        'saat'           => ['teacher_workloads', 'class_schedules'],
        'hour'           => ['teacher_workloads', 'class_schedules'],

        // Tədris ili / Tarix
        'tədris ili'     => ['academic_years', 'classes', 'student_enrollments'],
        'academic year'  => ['academic_years'],
        'yarımil'        => ['academic_years', 'semesters'],
        'semester'       => ['semesters', 'academic_years'],
        'rüb'            => ['quarters', 'academic_years'],
        'quarter'        => ['quarters'],
        'tarix'          => ['class_attendance', 'grades'],
        'date'           => ['class_attendance', 'grades'],
        'gün'            => ['class_attendance', 'school_attendance'],
        'ay'             => ['class_attendance', 'school_attendance'],
        'həftə'          => ['class_attendance', 'school_attendance'],
        'il'             => ['academic_years', 'school_stats'],

        // Sənəd
        'sənəd'          => ['documents', 'document_types'],
        'document'       => ['documents'],
        'fayl'           => ['documents', 'files'],
        'file'           => ['documents', 'files'],
        'yükləmə'        => ['documents', 'files'],

        // Əlaqə / Valideyn
        'valideyn'       => ['parents', 'student_profiles'],
        'parent'         => ['parents'],
        'ailə'           => ['parents', 'student_profiles'],
        'family'         => ['parents'],
        'əlaqə'          => ['contacts', 'parents'],
        'contact'        => ['contacts'],

        // Müraciət / Şikayət
        'müraciət'       => ['complaints', 'notifications'],
        'şikayət'        => ['complaints'],
        'complaint'      => ['complaints'],
        'bildiriş'       => ['notifications'],
        'notification'   => ['notifications'],

        // Reytinq
        'reytinq'        => ['ratings', 'school_stats'],
        'rating'         => ['ratings', 'school_stats'],
        'sıralama'       => ['ratings', 'school_stats'],
        'rank'           => ['ratings', 'school_stats'],
    ];

    /**
     * Verilmiş prompt üçün ən əlaqəli cədvəlləri filtrlər.
     *
     * @param string $prompt   İstifadəçi promptu
     * @param array  $schema   DatabaseSchemaService::getSchema() nəticəsi
     * @return array           Filtrlənmiş schema (eyni format)
     */
    public function filter(string $prompt, array $schema): array
    {
        $lowerPrompt = mb_strtolower($prompt, 'UTF-8');
        $tableNames  = array_column($schema, 'table_name');

        // Skor: table_name => relevance score
        $scores = array_fill_keys($tableNames, 0);

        // --- Mərhələ 1: Birbaşa uyğunluq ---
        // Prompt-da cədvəl adı (tam və ya qismən) var
        foreach ($tableNames as $tableName) {
            $normalizedName = str_replace('_', ' ', $tableName);
            if (
                str_contains($lowerPrompt, $tableName) ||
                str_contains($lowerPrompt, $normalizedName)
            ) {
                $scores[$tableName] += 10;
            }
        }

        // --- Mərhələ 2: Semantik açar söz uyğunluğu ---
        foreach (self::KEYWORD_TABLE_MAP as $keyword => $tables) {
            if (str_contains($lowerPrompt, $keyword)) {
                foreach ($tables as $i => $tableName) {
                    if (isset($scores[$tableName])) {
                        // İlk eşləşmə daha yüksək skor alır
                        $scores[$tableName] += (5 - $i);
                    }
                }
            }
        }

        // --- Mərhələ 3: Sütun adı uyğunluğu ---
        // Prompt-da sütun adı varsa, həmin cədvəl bonus alır
        foreach ($schema as $table) {
            foreach ($table['columns'] as $col) {
                $colName = str_replace('_', ' ', $col['name']);
                if (
                    str_contains($lowerPrompt, $col['name']) ||
                    str_contains($lowerPrompt, $colName)
                ) {
                    $scores[$table['table_name']] += 3;
                }
            }
        }

        // --- Core cədvəlləri həmişə daxil et ---
        foreach (self::CORE_TABLES as $coreTable) {
            if (isset($scores[$coreTable])) {
                $scores[$coreTable] = max($scores[$coreTable], 1);
            }
        }

        // --- Skora görə sırala, maksimum limit tətbiq et ---
        arsort($scores);
        $selectedNames = array_keys(array_filter($scores, fn ($s) => $s > 0));

        // Heç uyğunluq tapılmadısa, core + ən çox sətirli ilk 10 cədvəl
        if (empty($selectedNames)) {
            $selectedNames = array_slice($tableNames, 0, 10);
        }

        // MAX_TABLES həddinə kəs
        $selectedNames = array_slice($selectedNames, 0, self::MAX_TABLES);
        $selectedSet   = array_flip($selectedNames);

        // --- Faza 4: FK qonşularını da əlavə et (varsa) ---
        $selectedNames = $this->addFkNeighbors($selectedNames, $schema, $selectedSet);

        // Orijinal schema sırasını qoru, yalnız seçilmişləri qaytır
        return array_values(
            array_filter($schema, fn ($t) => in_array($t['table_name'], $selectedNames, true))
        );
    }

    /**
     * Seçilmiş cədvəllərin FK ilə bağlı qonşularını əlavə edir.
     * Məs: attendance seçilibsə → students, classes da daxil et.
     */
    private function addFkNeighbors(array $selected, array $schema, array $selectedSet): array
    {
        // FK uyğunluqları: sütun adı suffixindən cədvəl adını çıxar
        $fkTableMap = array_combine(
            array_column($schema, 'table_name'),
            $schema
        );

        $additions = [];
        foreach ($selected as $tableName) {
            if (!isset($fkTableMap[$tableName])) {
                continue;
            }
            foreach ($fkTableMap[$tableName]['columns'] as $col) {
                // _id ilə bitən sütunlar FK-dır (məs: student_id → students)
                if (str_ends_with($col['name'], '_id') && $col['name'] !== 'id') {
                    $guessedTable = rtrim(substr($col['name'], 0, -3), '_') . 's';
                    if (isset($fkTableMap[$guessedTable]) && !isset($selectedSet[$guessedTable])) {
                        $additions[$guessedTable] = true;
                    }
                }
            }
        }

        $allSelected = array_merge($selected, array_keys($additions));
        return array_slice($allSelected, 0, self::MAX_TABLES);
    }

    /**
     * Filtrlənmiş cədvəllərin sayını qaytarır (debug üçün).
     *
     * @return array{total: int, filtered: int, reduction_pct: int}
     */
    public function getFilterStats(string $prompt, array $schema): array
    {
        $filtered = $this->filter($prompt, $schema);
        $total    = count($schema);
        $kept     = count($filtered);

        return [
            'total'         => $total,
            'filtered'      => $kept,
            'reduction_pct' => $total > 0 ? (int) round((1 - $kept / $total) * 100) : 0,
        ];
    }
}
