<?php

namespace App\Console\Commands;

use App\Models\DataApprovalRequest;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class FlagOverdueApprovals extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'approvals:flag-overdue {--limit=250 : Maximum number of records to update in one run}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Mark approval requests whose deadline has passed as overdue';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $limit = (int) $this->option('limit');
        $processed = 0;

        $this->info('🔍 Checking for overdue approval requests...');

        DataApprovalRequest::whereIn('current_status', ['pending', 'in_progress'])
            ->where('deadline', '<', now())
            ->where(function ($query) {
                $query->where('is_overdue', false)
                    ->orWhereNull('is_overdue');
            })
            ->orderBy('deadline')
            ->chunkById(100, function ($requests) use (&$processed, $limit) {
                foreach ($requests as $approval) {
                    if ($processed >= $limit) {
                        return false; // Break chunk loop
                    }

                    $approval->is_overdue = true;
                    $approval->overdue_flagged_at = now();
                    $approval->save();

                    $processed++;
                    Log::info('Approval request marked as overdue', [
                        'approval_request_id' => $approval->id,
                        'deadline' => $approval->deadline,
                    ]);
                }
            });

        $this->info("✅ Flagged {$processed} approval request(s) as overdue.");

        return Command::SUCCESS;
    }
}
