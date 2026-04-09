<?php

namespace App\Console\Commands;

use App\Models\Institution;
use App\Models\Student;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportStudentsCsv extends Command
{
    protected $signature = 'students:import-csv
                            {file : CSV faylının tam yolu}
                            {--chunk=500 : Hər dəfə oxunan sətir sayı}
                            {--dry-run : DB-yə yazmadan test et}';

    protected $description = 'CSV faylından şagirdləri UTIS koduna görə import et (upsert)';

    private array $schoolMap = [];
    private array $failed    = [];

    private int $created = 0;
    private int $updated = 0;
    private int $skipped = 0;

    private mixed $uploadedFp = null;

    public function handle(): int
    {
        ini_set('memory_limit', '512M');

        $filePath  = $this->argument('file');
        $chunkSize = (int) $this->option('chunk');
        $dryRun    = $this->option('dry-run');
        $dir       = dirname($filePath);

        if (! file_exists($filePath)) {
            $this->error("Fayl tapılmadı: {$filePath}");
            return 1;
        }

        if ($dryRun) {
            $this->warn('[DRY-RUN] DB-yə heç nə yazılmayacaq.');
        }

        $this->info('Məktəb UTIS xəritəsi yüklənir...');
        $this->loadSchoolMap();
        $this->info(count($this->schoolMap) . ' məktəb cache-ə yükləndi.');

        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            $this->error("Fayl açıla bilmədi: {$filePath}");
            return 1;
        }

        // Headers
        $firstLine = fgets($handle);
        $firstLine = ltrim($firstLine, "\xEF\xBB\xBF");
        $headers   = str_getcsv(trim($firstLine));

        // uploaded CSV artıq yazılmır — yalnız xətalılar saxlanır
        $this->uploadedFp = null;

        $totalRows = 0;
        $chunk     = [];

        while (($line = fgets($handle)) !== false) {
            $trimmed = trim($line);
            if ($trimmed === '') continue;
            $row = str_getcsv($trimmed);
            if (count($row) < 4) continue;

            $data = array_combine($headers, array_pad($row, count($headers), ''));
            $chunk[] = $data;
            $totalRows++;

            if (count($chunk) >= $chunkSize) {
                $this->processChunk($chunk, $dryRun, $headers);
                $chunk = [];

                if ($totalRows % 10000 === 0) {
                    $mem = round(memory_get_usage(true) / 1024 / 1024, 1);
                    $this->info("  {$totalRows} sətir | +{$this->created} yeni | ~{$this->updated} yeniləndi | {$this->skipped} xəta | RAM: {$mem}MB");
                }
            }
        }

        if (! empty($chunk)) {
            $this->processChunk($chunk, $dryRun, $headers);
        }

        fclose($handle);

        // failed CSV
        $failedPath = $dir . '/failed_students.csv';
        $failedHeaders = array_merge($headers, ['xeta_sebeb']);
        $fp = fopen($failedPath, 'w');
        fprintf($fp, chr(0xEF) . chr(0xBB) . chr(0xBF));
        fputcsv($fp, $failedHeaders);
        foreach ($this->failed as $row) {
            $line = [];
            foreach ($failedHeaders as $h) {
                $line[] = $row[$h] ?? '';
            }
            fputcsv($fp, $line);
        }
        fclose($fp);

        $this->newLine();
        $this->info('════════════════════════════════════');
        $this->info("  Cəmi sətir  : {$totalRows}");
        $this->info("  Yaradıldı   : {$this->created}");
        $this->info("  Yeniləndi   : {$this->updated}");
        $this->info("  Keçildi/Xəta: {$this->skipped}");
        $this->info('════════════════════════════════════');
        $this->info("Xətalı CSV : {$failedPath} (" . count($this->failed) . ' sətir)');

        return 0;
    }

    private function loadSchoolMap(): void
    {
        $this->schoolMap = Institution::where('level', 4)
            ->whereNotNull('utis_code')
            ->pluck('id', 'utis_code')
            ->toArray();
    }

    private function processChunk(array $chunk, bool $dryRun, array $headers): void
    {
        $toInsert = [];
        $toUpdate = [];

        // Chunk-dakı bütün utis_code-ları bir sorğu ilə yoxla
        $utisCodesInChunk = array_filter(array_column($chunk, 'utis_code'));
        $existingMap = Student::whereIn('utis_code', $utisCodesInChunk)
            ->pluck('id', 'utis_code')
            ->toArray();

        foreach ($chunk as $row) {
            $result = $this->prepareRow($row);
            if ($result === null) continue; // recordFail already called

            [$utisCode, $payload] = $result;

            if ($dryRun) {
                $this->created++;
                // uğurlu sətir — saxlanmır
                continue;
            }

            if (isset($existingMap[$utisCode])) {
                $toUpdate[] = ['id' => $existingMap[$utisCode], 'utis_code' => $utisCode] + $payload;
            } else {
                $toInsert[] = array_merge($payload, [
                    'utis_code'      => $utisCode,
                    'student_number' => $utisCode,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }

            // uğurlu sətir — saxlanmır
        }

        if ($dryRun) return;

        // Bulk insert
        if (! empty($toInsert)) {
            try {
                DB::table('students')->insertOrIgnore($toInsert);
                $this->created += count($toInsert);
            } catch (\Throwable $e) {
                // Fallback: fərdi insert
                foreach ($toInsert as $rec) {
                    try {
                        DB::table('students')->insertOrIgnore($rec);
                        $this->created++;
                    } catch (\Throwable) {
                        $this->skipped++;
                    }
                }
            }
        }

        // Bulk update (fərdi, çünki hər biri fərqlidir)
        if (! empty($toUpdate)) {
            foreach ($toUpdate as $rec) {
                try {
                    $id = $rec['id'];
                    unset($rec['id'], $rec['utis_code']);
                    $rec['updated_at'] = now();
                    DB::table('students')->where('id', $id)->update($rec);
                    $this->updated++;
                } catch (\Throwable) {
                    $this->skipped++;
                }
            }
        }
    }

    /**
     * Sətiri yoxla və payload hazırla. Xəta varsa null qaytarır.
     */
    private function prepareRow(array $row): ?array
    {
        $utisCode       = trim($row['utis_code']        ?? '');
        $firstName      = trim($row['first_name']       ?? '');
        $lastName       = trim($row['last_name']        ?? '');
        $schoolUtisCode = trim($row['school_utis_code'] ?? '');
        $gradeLevel     = trim($row['grade_level']      ?? '');
        $className      = trim($row['class_name']       ?? '');

        $missing = [];
        if ($utisCode       === '') $missing[] = 'utis_code';
        if ($firstName      === '') $missing[] = 'first_name';
        if ($lastName       === '') $missing[] = 'last_name';
        if ($schoolUtisCode === '') $missing[] = 'school_utis_code';
        if ($gradeLevel     === '') $missing[] = 'grade_level';
        if ($className      === '') $missing[] = 'class_name';

        if (! empty($missing)) {
            $this->recordFail($row, 'Vacib sahə(lər) boşdur: ' . implode(', ', $missing));
            return null;
        }

        if (! isset($this->schoolMap[$schoolUtisCode])) {
            $this->recordFail($row, "Məktəb tapılmadı (UTIS: {$schoolUtisCode})");
            return null;
        }

        $rawGender = trim($row['gender'] ?? '');
        $gender = match (mb_strtolower($rawGender)) {
            'kişi', 'male', 'k', 'm'    => 'male',
            'qadın', 'female', 'q', 'f' => 'female',
            default                      => null,
        };

        $rawDate   = trim($row['birth_date'] ?? '');
        $birthDate = $rawDate !== '' ? $this->parseDate($rawDate) : null;

        $payload = [
            'first_name'     => $firstName,
            'last_name'      => $lastName,
            'institution_id' => $this->schoolMap[$schoolUtisCode],
            'grade_level'    => $gradeLevel,
            'class_name'     => mb_strtoupper($className),
            'gender'         => $gender,
            'birth_date'     => $birthDate,
            'parent_name'    => trim($row['parent_name']  ?? '') ?: null,
            'parent_phone'   => trim($row['parent_phone'] ?? '') ?: null,
            'is_active'      => true,
        ];

        return [$utisCode, $payload];
    }

    private function parseDate(string $value): ?string
    {
        if (preg_match('#^(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})$#', $value, $m)) {
            return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
        }
        if (preg_match('#^\d{4}-\d{2}-\d{2}$#', $value)) {
            return $value;
        }
        return null;
    }

    private function recordFail(array $row, string $reason): void
    {
        $this->failed[]  = array_merge($row, ['xeta_sebeb' => $reason]);
        $this->skipped++;
    }

    private function rowToLine(array $row, array $headers): array
    {
        $line = [];
        foreach ($headers as $h) {
            $line[] = $row[$h] ?? '';
        }
        return $line;
    }
}
