<?php

namespace App\Console\Commands;

use App\Models\Notification;
use Illuminate\Console\Command;

class CleanupOldNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notifications:cleanup
                           {--older-than=30 : Delete notifications older than X days}
                           {--dry-run : Show what would be deleted without actually deleting}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up old read notifications to improve database performance';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $days = (int) $this->option('older-than');
        $dryRun = $this->option('dry-run');

        $this->info('🧹 ATİS Notification Cleanup');
        $this->info("Cleaning up read notifications older than {$days} days...");

        if ($dryRun) {
            $this->warn('🔍 DRY RUN MODE - No notifications will be deleted');
        }

        // Get notifications to clean up
        $query = Notification::where('is_read', true)
            ->where('created_at', '<', now()->subDays($days));

        $count = $query->count();

        if ($count === 0) {
            $this->info('✅ No old notifications found to clean up.');

            return 0;
        }

        $this->line("Found {$count} old read notifications");

        // Show some examples
        $examples = $query->take(5)->get(['id', 'type', 'created_at', 'user_id']);
        $this->table(
            ['ID', 'Type', 'Created', 'User'],
            $examples->map(fn ($n) => [$n->id, $n->type, $n->created_at->format('Y-m-d H:i'), $n->user_id])
        );

        if (! $dryRun) {
            if ($this->confirm("Delete {$count} old notifications?", false)) {
                $deleted = $query->delete();
                $this->info("✅ Deleted {$deleted} old notifications");

                // Log the cleanup
                \Log::info('Notification cleanup completed', [
                    'deleted_count' => $deleted,
                    'older_than_days' => $days,
                    'command_user' => 'system',
                ]);
            } else {
                $this->info('❌ Cleanup cancelled');
            }
        } else {
            $this->info("🔍 DRY RUN: Would delete {$count} notifications");
        }

        return 0;
    }
}
