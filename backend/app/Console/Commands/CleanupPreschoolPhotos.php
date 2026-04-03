<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\PreschoolAttendancePhoto;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CleanupPreschoolPhotos extends Command
{
    protected $signature = 'preschool:cleanup-photos
                            {--older-than=30 : Delete photos older than X days}
                            {--dry-run : Show what would be deleted without actually deleting}';

    protected $description = 'Məktəbəqədər davamiyyət şəkillərini (30+ gün) sil';

    public function handle(): int
    {
        $days = (int) $this->option('older-than');
        $dryRun = (bool) $this->option('dry-run');

        $photos = PreschoolAttendancePhoto::olderThan($days)->get();

        if ($photos->isEmpty()) {
            $this->info("Silinəcək şəkil tapılmadı ({$days} gündən köhnə).");

            return Command::SUCCESS;
        }

        $this->info("Tapıldı: {$photos->count()} şəkil ({$days} gündən köhnə)");

        if ($dryRun) {
            $this->warn('DRY-RUN: faktiki silmə edilmir.');
            $photos->each(fn (PreschoolAttendancePhoto $p) => $this->line("  - {$p->file_path} ({$p->photo_date})"));

            return Command::SUCCESS;
        }

        $deleted = 0;
        $errors = 0;

        foreach ($photos as $photo) {
            try {
                Storage::disk('local')->delete($photo->file_path);
                $photo->delete();
                $deleted++;
            } catch (\Exception $e) {
                Log::error('Preschool photo cleanup failed', [
                    'photo_id' => $photo->id,
                    'path' => $photo->file_path,
                    'error' => $e->getMessage(),
                ]);
                $errors++;
            }
        }

        Log::info('Preschool photo cleanup completed', [
            'deleted_count' => $deleted,
            'error_count' => $errors,
            'older_than_days' => $days,
        ]);

        $this->info("Silindi: {$deleted} şəkil" . ($errors > 0 ? ", xəta: {$errors}" : ''));

        return $errors > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
