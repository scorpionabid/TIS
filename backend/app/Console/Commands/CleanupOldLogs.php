<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CleanupOldLogs extends Command
{
    protected $signature = 'logs:cleanup
                           {--dry-run : Show what would be deleted without actually deleting}';

    protected $description = 'Clean up old activity logs, security events, and audit logs to control database size';

    /**
     * Retention periods per table (days).
     */
    protected array $tables = [
        'activity_logs'        => 90,
        'security_events'      => 90,
        'link_access_logs'     => 60,
        'document_access_logs' => 60,
        'survey_audit_logs'    => 180,
    ];

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        $this->info('ATiS Log Cleanup');

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No records will be deleted');
        }

        $totalDeleted = 0;
        $results = [];

        foreach ($this->tables as $table => $retentionDays) {
            // Check if table exists
            if (! $this->tableExists($table)) {
                $results[] = [$table, $retentionDays, 'N/A', 'Table does not exist'];
                continue;
            }

            $count = DB::table($table)
                ->where('created_at', '<', now()->subDays($retentionDays))
                ->count();

            if ($dryRun) {
                $results[] = [$table, $retentionDays, $count, 'DRY RUN'];
            } else {
                $deleted = DB::table($table)
                    ->where('created_at', '<', now()->subDays($retentionDays))
                    ->delete();

                $totalDeleted += $deleted;
                $results[] = [$table, $retentionDays, $deleted, 'Deleted'];
            }
        }

        $this->table(
            ['Table', 'Retention (days)', 'Records', 'Status'],
            $results
        );

        if (! $dryRun && $totalDeleted > 0) {
            $this->info("Total deleted: {$totalDeleted} records");

            Log::info('Log cleanup completed', [
                'total_deleted' => $totalDeleted,
                'tables' => $this->tables,
            ]);
        } elseif (! $dryRun) {
            $this->info('No old records found to clean up.');
        }

        return 0;
    }

    protected function tableExists(string $table): bool
    {
        try {
            DB::table($table)->limit(1)->exists();

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
