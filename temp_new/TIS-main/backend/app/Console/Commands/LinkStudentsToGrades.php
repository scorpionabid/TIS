<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class LinkStudentsToGrades extends Command
{
    protected $signature = 'students:link-to-grades
                            {--dry-run : DB-yə yazmadan nəticəni göstər}
                            {--institution= : Yalnız bu institution_id üçün icra et}
                            {--chunk=1000 : Hər dəfə yenilənən sətir sayı}';

    protected $description = 'class_name/grade_level məlumatına görə şagirdləri grades cədvəlinə bağla, sonra sinif saylarını yenilə';

    // Azərbaycanca hərfləri normallaşdıran SQL ifadəsi (PostgreSQL LOWER() ə/Ə, ç/Ç-ni dəstəkləmir)
    private const NORM_SQL = "LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        %s,
        'Ə', 'e'), 'ə', 'e'), 'Ç', 'c'), 'ç', 'c'),
        'Ğ', 'g'), 'ğ', 'g'), 'Ş', 's'), 'ş', 's'))";

    public function handle(): int
    {
        $dryRun      = $this->option('dry-run');
        $institution = $this->option('institution') ? (int) $this->option('institution') : null;
        $chunk       = (int) $this->option('chunk');

        if ($dryRun) {
            $this->warn('[DRY-RUN] Heç bir dəyişiklik yazılmayacaq.');
        }

        $instFilter = $institution ? "AND s.institution_id = {$institution}" : '';

        $normGrade   = sprintf(self::NORM_SQL, 'g.name');
        $normStudent = sprintf(self::NORM_SQL, 's.class_name');

        // ── 1. Uyğunlaşdırıla bilən şagirdləri say ─────────────────────────
        $preview = DB::selectOne("
            SELECT COUNT(DISTINCT s.id) AS cnt
            FROM students s
            JOIN grades g
                ON  g.institution_id    = s.institution_id
                AND g.class_level::text = s.grade_level::text
                AND {$normGrade}        = {$normStudent}
                AND g.is_active         = true
            WHERE s.grade_id IS NULL
              AND s.is_active  = true
              AND s.class_name <> ''
              AND s.grade_level IS NOT NULL
              {$instFilter}
        ");

        $total = (int) ($preview->cnt ?? 0);
        $this->info("Uyğunlaşdırıla bilən şagird sayı: {$total}");

        if ($total === 0) {
            $this->info('Bağlanacaq şagird yoxdur. Tamamlandı.');
            return 0;
        }

        if ($dryRun) {
            $this->showPreview($instFilter, $normGrade, $normStudent);
            return 0;
        }

        // ── 2. grade_id-ni batch-lərlə yenilə ─────────────────────────────
        $this->info("Şagirdlər bağlanır (chunk={$chunk})...");
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $linked = 0;

        do {
            $rows = DB::select("
                SELECT s.id AS student_id, g.id AS grade_id
                FROM students s
                JOIN grades g
                    ON  g.institution_id    = s.institution_id
                    AND g.class_level::text = s.grade_level::text
                    AND {$normGrade}        = {$normStudent}
                    AND g.is_active         = true
                WHERE s.grade_id IS NULL
                  AND s.is_active  = true
                  AND s.class_name <> ''
                  AND s.grade_level IS NOT NULL
                  {$instFilter}
                LIMIT {$chunk}
            ");

            if (empty($rows)) break;

            $byGrade = [];
            foreach ($rows as $row) {
                $byGrade[$row->grade_id][] = $row->student_id;
            }

            DB::transaction(function () use ($byGrade) {
                foreach ($byGrade as $gradeId => $studentIds) {
                    $placeholders = implode(',', $studentIds);
                    DB::statement("
                        UPDATE students
                        SET grade_id = {$gradeId}, updated_at = NOW()
                        WHERE id IN ({$placeholders})
                    ");
                }
            });

            $count  = count($rows);
            $linked += $count;
            $bar->advance($count);

        } while ($count === $chunk);

        $bar->finish();
        $this->newLine();
        $this->info("Bağlanan şagird: {$linked}");

        // ── 3. Sinif say sütunlarını yenilə ───────────────────────────────
        $this->info('Sinif sayları yenilənir...');

        $gradeInstFilter = $institution ? "AND institution_id = {$institution}" : '';

        // Update counts for grades that have linked students
        DB::statement("
            UPDATE grades g
            SET
                student_count        = sub.total,
                male_student_count   = sub.male_cnt,
                female_student_count = sub.female_cnt,
                updated_at           = NOW()
            FROM (
                SELECT
                    grade_id,
                    COUNT(*)                                   AS total,
                    COUNT(*) FILTER (WHERE gender = 'male')   AS male_cnt,
                    COUNT(*) FILTER (WHERE gender = 'female') AS female_cnt
                FROM students
                WHERE is_active = true
                  AND grade_id  IS NOT NULL
                GROUP BY grade_id
            ) sub
            WHERE g.id = sub.grade_id
            {$gradeInstFilter}
        ");

        // Only zero grades that have NO students at that institution+grade_level at all
        // (do not zero grades where students exist but couldn't be matched by class_name)
        DB::statement("
            UPDATE grades g
            SET student_count = 0, male_student_count = 0, female_student_count = 0, updated_at = NOW()
            WHERE g.id NOT IN (
                SELECT DISTINCT grade_id FROM students WHERE is_active = true AND grade_id IS NOT NULL
            )
            AND NOT EXISTS (
                SELECT 1 FROM students s
                WHERE s.institution_id  = g.institution_id
                  AND s.grade_level::text = g.class_level::text
                  AND s.is_active       = true
            )
            {$gradeInstFilter}
        ");

        $this->info('Sinif sayları yeniləndi.');

        // ── 4. Nəticə xülasəsi ──────────────────────────────────────────
        $summary = DB::selectOne("
            SELECT
                COUNT(*) FILTER (WHERE grade_id IS NOT NULL) AS linked,
                COUNT(*) FILTER (WHERE grade_id IS NULL)     AS unlinked
            FROM students
            WHERE is_active = true
        ");

        $this->table(
            ['Bağlanmış şagird', 'Bağlanmamış şagird'],
            [[(int)$summary->linked, (int)$summary->unlinked]]
        );

        $this->info('Tamamlandı!');
        return 0;
    }

    private function showPreview(string $instFilter, string $normGrade, string $normStudent): void
    {
        $rows = DB::select("
            SELECT
                i.name  AS institution,
                g.class_level,
                g.name  AS grade_name,
                COUNT(s.id) AS student_count
            FROM students s
            JOIN grades g
                ON  g.institution_id    = s.institution_id
                AND g.class_level::text = s.grade_level::text
                AND {$normGrade}        = {$normStudent}
                AND g.is_active         = true
            JOIN institutions i ON i.id = s.institution_id
            WHERE s.grade_id IS NULL
              AND s.is_active  = true
              AND s.class_name <> ''
              AND s.grade_level IS NOT NULL
              {$instFilter}
            GROUP BY i.name, g.class_level, g.name
            ORDER BY i.name, g.class_level, g.name
            LIMIT 30
        ");

        $this->table(
            ['Məktəb', 'Sinif səviyyəsi', 'Sinif', 'Şagird sayı'],
            array_map(fn($r) => [$r->institution, $r->class_level, $r->grade_name, $r->student_count], $rows)
        );
    }
}
