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
                           {--older-than=30 : Delete READ notifications older than X days}
                           {--unread-older-than=90 : Delete UNREAD notifications older than X days}
                           {--dry-run : Show what would be deleted without actually deleting}
                           {--force : Skip confirmation prompt (used by scheduler)}';

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
        $readDays   = (int) $this->option('older-than');
        $unreadDays = (int) $this->option('unread-older-than');
        $dryRun     = $this->option('dry-run');
        $force      = $this->option('force') || ! $this->input->isInteractive();

        $this->info('🧹 ATİS Notification Cleanup');
        if ($dryRun) {
            $this->warn('🔍 DRY RUN MODE - No notifications will be deleted');
        }

        $totalDeleted = 0;

        // --- 1. Read notifications older than --older-than days ---
        $readQuery = Notification::where('is_read', true)
            ->where('created_at', '<', now()->subDays($readDays));
        $readCount = $readQuery->count();

        if ($readCount > 0) {
            $this->line("Found {$readCount} READ notifications older than {$readDays} days");
            $examples = (clone $readQuery)->take(5)->get(['id', 'type', 'created_at', 'user_id']);
            $this->table(
                ['ID', 'Type', 'Created', 'User'],
                $examples->map(fn ($n) => [$n->id, $n->type, $n->created_at->format('Y-m-d H:i'), $n->user_id])
            );

            if (! $dryRun) {
                if ($force || $this->confirm("Delete {$readCount} read notifications?", false)) {
                    $deleted = $readQuery->delete();
                    $totalDeleted += $deleted;
                    $this->info("✅ Deleted {$deleted} read notifications");
                }
            } else {
                $this->info("🔍 DRY RUN: Would delete {$readCount} read notifications");
            }
        } else {
            $this->info("✅ No read notifications older than {$readDays} days");
        }

        // --- 2. Unread notifications older than --unread-older-than days ---
        $unreadQuery = Notification::where('is_read', false)
            ->where('created_at', '<', now()->subDays($unreadDays));
        $unreadCount = $unreadQuery->count();

        if ($unreadCount > 0) {
            $this->line("Found {$unreadCount} UNREAD notifications older than {$unreadDays} days");
            $examples = (clone $unreadQuery)->take(5)->get(['id', 'type', 'created_at', 'user_id']);
            $this->table(
                ['ID', 'Type', 'Created', 'User'],
                $examples->map(fn ($n) => [$n->id, $n->type, $n->created_at->format('Y-m-d H:i'), $n->user_id])
            );

            if (! $dryRun) {
                if ($force || $this->confirm("Delete {$unreadCount} old unread notifications?", false)) {
                    $deleted = $unreadQuery->delete();
                    $totalDeleted += $deleted;
                    $this->info("✅ Deleted {$deleted} old unread notifications");
                }
            } else {
                $this->info("🔍 DRY RUN: Would delete {$unreadCount} old unread notifications");
            }
        } else {
            $this->info("✅ No unread notifications older than {$unreadDays} days");
        }

        if ($totalDeleted > 0) {
            \Log::info('Notification cleanup completed', [
                'deleted_count'  => $totalDeleted,
                'read_days'      => $readDays,
                'unread_days'    => $unreadDays,
                'command_user'   => 'system',
            ]);
        }

        $this->info("🏁 Cleanup done. Total deleted: {$totalDeleted}");

        return 0;
    }
}
