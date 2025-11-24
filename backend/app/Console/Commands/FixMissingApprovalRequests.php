<?php

namespace App\Console\Commands;

use App\Models\SurveyResponse;
use App\Services\SurveyApprovalBridge;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixMissingApprovalRequests extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'approval:fix-missing-requests
                           {--dry-run : Show what would be done without making changes}
                           {--response-id= : Fix specific response ID only}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix submitted survey responses that are missing approval requests';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $specificResponseId = $this->option('response-id');

        $this->info('🔍 Checking for submitted survey responses without approval requests...');

        // Query for submitted responses without approval requests
        $query = SurveyResponse::where('status', 'submitted')
            ->whereDoesntHave('approvalRequest');

        if ($specificResponseId) {
            $query->where('id', $specificResponseId);
        }

        $responsesWithoutApproval = $query->with(['survey', 'institution', 'respondent'])->get();

        $this->info("Found {$responsesWithoutApproval->count()} submitted responses without approval requests");

        if ($responsesWithoutApproval->isEmpty()) {
            $this->info('✅ No missing approval requests found. All good!');

            return 0;
        }

        // Show what we found
        $this->table(
            ['Response ID', 'Survey Title', 'Institution', 'Submitted At', 'Status'],
            $responsesWithoutApproval->map(function ($response) {
                return [
                    $response->id,
                    $response->survey->title ?? 'N/A',
                    $response->institution->name ?? 'N/A',
                    $response->submitted_at ? $response->submitted_at->format('Y-m-d H:i') : 'N/A',
                    $response->status,
                ];
            })->toArray()
        );

        if ($dryRun) {
            $this->warn('🏃 DRY RUN MODE: No changes will be made');

            return 0;
        }

        if (! $this->confirm('Do you want to create approval requests for these responses?')) {
            $this->info('Operation cancelled.');

            return 0;
        }

        $created = 0;
        $failed = 0;
        $approvalBridge = app(SurveyApprovalBridge::class);

        $this->info('🚀 Creating approval requests...');
        $progressBar = $this->output->createProgressBar($responsesWithoutApproval->count());

        foreach ($responsesWithoutApproval as $response) {
            try {
                DB::transaction(function () use ($response, $approvalBridge) {
                    // Use the survey response's respondent as the submitter
                    auth()->setUser($response->respondent);

                    $approvalBridge->initiateSurveyResponseApproval($response, [
                        'description' => "Retrospectively created approval request for response #{$response->id}",
                        'priority' => 'normal',
                        'metadata' => [
                            'auto_created' => true,
                            'created_reason' => 'fix_missing_approval_requests_command',
                            'original_submitted_at' => $response->submitted_at?->toISOString(),
                        ],
                    ]);
                });

                $created++;
                $this->info("\n✅ Created approval request for response #{$response->id}");
            } catch (\Exception $e) {
                $failed++;
                $this->error("\n❌ Failed to create approval request for response #{$response->id}: {$e->getMessage()}");
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        $this->info('📊 Summary:');
        $this->info("  • Created: {$created} approval requests");
        if ($failed > 0) {
            $this->error("  • Failed: {$failed} approval requests");
        }

        // Verify the fix
        $this->info("\n🔍 Verifying fix...");
        $remainingIssues = SurveyResponse::where('status', 'submitted')
            ->whereDoesntHave('approvalRequest')
            ->count();

        if ($remainingIssues === 0) {
            $this->info('✅ All submitted responses now have approval requests!');
        } else {
            $this->warn("⚠️  Still {$remainingIssues} responses without approval requests");
        }

        return 0;
    }
}
