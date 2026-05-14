<?php

namespace App\Console\Commands;

use App\Models\ReportTableResponse;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Köhnə "bütöv response submit" ilə göndərilmiş cavabları düzəldir.
 *
 * Problem: submit() metodu əvvəllər row_statuses-i yeniləmirdi.
 * Nəticə: status='submitted' olan cavabların row_statuses-i boş qalırdı.
 * Bu isə admin approval queue-da həmin sətirlərin görünməməsinə səbəb olurdu.
 *
 * Bu command həmin cavabları tapıb hər sətrin row_statuses-ini 'submitted' edir.
 *
 * İstifadə:
 *   php artisan report-tables:backfill-row-statuses           (dry-run, yalnız say göstərir)
 *   php artisan report-tables:backfill-row-statuses --run     (real update edir)
 *   php artisan report-tables:backfill-row-statuses --table=5 (yalnız bir cədvəl üçün)
 */
class BackfillRowStatuses extends Command
{
    protected $signature = 'report-tables:backfill-row-statuses
                            {--run : Faktiki dəyişiklik et (default: dry-run)}
                            {--table= : Yalnız bu cədvəl ID-si üçün et}';

    protected $description = 'Submitted response-larda boş row_statuses-ləri düzəldir (approval queue bug fix)';

    public function handle(): int
    {
        $isDryRun = ! $this->option('run');
        $tableId = $this->option('table');

        if ($isDryRun) {
            $this->warn('DRY-RUN rejimi. Faktiki dəyişiklik olmayacaq. --run flag ilə çalışdırın.');
        } else {
            $this->info('REAL UPDATE rejimi. Dəyişikliklər DB-ə yazılacaq.');
        }

        // status='submitted' olan lakin row_statuses boş/null olan cavabları tap
        $query = ReportTableResponse::where('status', 'submitted')
            ->where(function ($q) {
                $q->whereNull('row_statuses')
                    ->orWhereRaw("row_statuses::text = '[]'")
                    ->orWhereRaw("row_statuses::text = '{}'");
            })
            ->whereNotNull('rows')
            ->whereRaw("rows::text != '[]'")
            ->with(['reportTable:id,title', 'respondent:id,username']);

        if ($tableId) {
            $query->where('report_table_id', (int) $tableId);
        }

        $responses = $query->get();

        if ($responses->isEmpty()) {
            $this->info('Düzəltməyə ehtiyac olan cavab tapılmadı.');

            return self::SUCCESS;
        }

        $this->info("Tapıldı: {$responses->count()} cavab");
        $this->newLine();

        $totalRows = 0;
        $totalFixed = 0;

        foreach ($responses as $response) {
            $rows = $response->rows ?? [];
            $rowCount = count($rows);

            $this->line(sprintf(
                '  Response #%d | Cədvəl: %s | İstifadəçi: %s | Sətir sayı: %d | Tarix: %s',
                $response->id,
                $response->reportTable?->title ?? 'N/A',
                $response->respondent?->username ?? 'N/A',
                $rowCount,
                $response->submitted_at?->format('Y-m-d H:i') ?? 'N/A'
            ));

            $totalRows += $rowCount;

            if (! $isDryRun && $rowCount > 0) {
                DB::transaction(function () use ($response, $rows) {
                    $statuses = [];
                    foreach ($rows as $idx => $row) {
                        $statuses[$idx] = [
                            'status' => 'submitted',
                            'submitted_by' => $response->respondent_id,
                            'submitted_at' => $response->submitted_at?->toISOString() ?? now()->toISOString(),
                        ];
                    }
                    $response->update(['row_statuses' => $statuses]);
                });
                $totalFixed++;
            } elseif (! $isDryRun && $rowCount === 0) {
                $this->warn("  → Response #{$response->id} sətri boşdur, keçildi.");
            }
        }

        $this->newLine();

        if ($isDryRun) {
            $this->warn("DRY-RUN: {$responses->count()} cavab, {$totalRows} sətir düzəldiləcəkdi.");
            $this->warn('Faktiki düzəliş üçün: php artisan report-tables:backfill-row-statuses --run');
        } else {
            $this->info("Tamamlandı: {$totalFixed} cavab düzəldildi, {$totalRows} sətir işarələndi.");
        }

        return self::SUCCESS;
    }
}
