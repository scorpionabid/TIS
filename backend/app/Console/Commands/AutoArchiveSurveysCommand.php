<?php

namespace App\Console\Commands;

use App\Models\Survey;
use App\Models\SurveyDeadlineLog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class AutoArchiveSurveysCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'surveys:auto-archive {--dry-run : Show which surveys would be archived without modifying data}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically archive surveys whose deadlines passed and that have collected responses';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $processed = 0;

        $this->info('🔍 Scanning for surveys eligible for auto-archive...');

        Survey::query()
            ->where('auto_archive', true)
            ->whereNull('archived_at')
            ->whereNotNull('end_date')
            ->where('end_date', '<', now())
            ->orderBy('end_date')
            ->chunkById(50, function ($surveys) use (&$processed, $dryRun) {
                foreach ($surveys as $survey) {
                    if (! $survey->shouldAutoArchive()) {
                        continue;
                    }

                    if ($dryRun) {
                        $processed++;
                        $this->line("➡️  Would auto-archive survey [{$survey->id}] {$survey->title}");

                        continue;
                    }

                    if ($survey->autoArchive()) {
                        $processed++;
                        $this->line("✅ Auto-archived survey [{$survey->id}] {$survey->title}");
                        $this->logAutoArchiveEvent($survey);
                    }
                }
            });

        if ($dryRun) {
            $this->info("DRY RUN COMPLETE: {$processed} survey(s) eligible for auto-archive.");

            return Command::SUCCESS;
        }

        $this->info("Auto-archive complete. {$processed} survey(s) processed.");

        return Command::SUCCESS;
    }

    private function logAutoArchiveEvent(Survey $survey): void
    {
        try {
            SurveyDeadlineLog::create([
                'survey_id' => $survey->id,
                'event_type' => 'auto_archived',
                'notification_type' => null,
                'days_reference' => null,
                'recipient_count' => 0,
                'metadata' => [
                    'archived_at' => now()->toISOString(),
                    'auto_archive_reason' => $survey->archive_reason,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to log auto archive event', [
                'survey_id' => $survey->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
