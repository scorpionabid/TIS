<?php

namespace App\Console\Commands;

use App\Models\RatingConfiguration;
use App\Models\StaffRating;
use App\Models\StaffRatingAuditLog;
use App\Models\User;
use App\Services\StaffRating\AutomaticRatingCalculator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CalculateStaffRatings extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'staff-rating:calculate
                            {--period= : Period to calculate (default: current month)}
                            {--staff-id= : Calculate for specific staff member}
                            {--role= : Calculate for specific role}
                            {--force : Recalculate existing ratings}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Calculate automatic staff ratings based on performance metrics';

    protected AutomaticRatingCalculator $calculator;

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->calculator = app(AutomaticRatingCalculator::class);

        $startTime = now();
        $this->info("📊 Staff Rating Calculation Started: {$startTime->format('Y-m-d H:i:s')}");
        $this->newLine();

        // Get period
        $period = $this->option('period') ?? AutomaticRatingCalculator::getCurrentPeriod();

        if (!AutomaticRatingCalculator::isValidPeriod($period)) {
            $this->error("❌ Invalid period format: {$period}");
            $this->error("   Valid formats: 2024-12, 2024-Q4, 2024");
            return Command::FAILURE;
        }

        $this->info("📅 Period: {$period}");
        $this->newLine();

        // Get staff users to calculate
        $staffQuery = User::role(['schooladmin', 'sektoradmin', 'regionoperator'])
            ->where('is_active', true);

        if ($this->option('staff-id')) {
            $staffQuery->where('id', $this->option('staff-id'));
        }

        if ($this->option('role')) {
            $staffQuery->role($this->option('role'));
        }

        $staffMembers = $staffQuery->get();
        $totalStaff = $staffMembers->count();

        $this->info("👥 Found {$totalStaff} staff members to process");
        $this->newLine();

        if ($totalStaff === 0) {
            $this->warn('⚠️  No staff members found matching criteria');
            return Command::SUCCESS;
        }

        // Progress bar
        $progressBar = $this->output->createProgressBar($totalStaff);
        $progressBar->setFormat(' %current%/%max% [%bar%] %percent:3s%% - %message%');
        $progressBar->setMessage('Initializing...');
        $progressBar->start();

        $stats = [
            'success' => 0,
            'skipped' => 0,
            'failed' => 0,
            'updated' => 0,
            'created' => 0,
        ];

        foreach ($staffMembers as $staff) {
            $progressBar->setMessage("Processing: {$staff->name}");

            try {
                DB::beginTransaction();

                // Check if rating already exists
                $existingRating = StaffRating::where('staff_user_id', $staff->id)
                    ->where('period', $period)
                    ->where('rating_type', 'automatic')
                    ->where('category', 'overall')
                    ->where('is_latest', true)
                    ->first();

                // Skip if exists and not forcing
                if ($existingRating && !$this->option('force')) {
                    $stats['skipped']++;
                    $progressBar->advance();
                    DB::rollBack();
                    continue;
                }

                // Calculate rating
                $breakdown = $this->calculator->calculateOverallRating($staff, $period);

                // Mark old ratings as not latest
                StaffRating::where('staff_user_id', $staff->id)
                    ->where('period', $period)
                    ->where('rating_type', 'automatic')
                    ->update(['is_latest' => false]);

                // Create new rating
                $rating = StaffRating::create([
                    'staff_user_id' => $staff->id,
                    'staff_role' => $staff->getRoleNames()->first(),
                    'institution_id' => $staff->institution_id,
                    'rater_user_id' => null, // System
                    'rater_role' => 'system',
                    'rating_type' => 'automatic',
                    'category' => 'overall',
                    'score' => $breakdown['final_score'],
                    'period' => $period,
                    'notes' => 'Automatically calculated by system',
                    'auto_calculated_data' => $breakdown,
                    'is_latest' => true,
                ]);

                // Also create component-specific ratings
                $components = [
                    'task_performance' => $breakdown['task_performance']['component_score'],
                    'survey_performance' => $breakdown['survey_performance']['component_score'],
                    'document_activity' => $breakdown['document_activity']['component_score'],
                    'link_management' => $breakdown['link_management']['component_score'],
                ];

                foreach ($components as $category => $score) {
                    StaffRating::updateOrCreate(
                        [
                            'staff_user_id' => $staff->id,
                            'period' => $period,
                            'rating_type' => 'automatic',
                            'category' => $category,
                        ],
                        [
                            'staff_role' => $staff->getRoleNames()->first(),
                            'institution_id' => $staff->institution_id,
                            'rater_user_id' => null,
                            'rater_role' => 'system',
                            'score' => $score,
                            'notes' => "Automatically calculated: {$period}",
                            'auto_calculated_data' => $breakdown[$category],
                            'is_latest' => true,
                        ]
                    );
                }

                // Log the calculation
                StaffRatingAuditLog::logAutoCalculated($rating, $breakdown);

                if ($existingRating) {
                    $stats['updated']++;
                } else {
                    $stats['created']++;
                }

                $stats['success']++;

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                $stats['failed']++;

                Log::error("Failed to calculate rating for staff {$staff->id}", [
                    'staff_id' => $staff->id,
                    'staff_name' => $staff->name,
                    'period' => $period,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);

                // Continue to next staff member
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        // Display results
        $this->info('✅ Calculation Complete!');
        $this->newLine();
        $this->table(
            ['Metric', 'Count'],
            [
                ['Total Processed', $totalStaff],
                ['✅ Success', $stats['success']],
                ['➕ Created', $stats['created']],
                ['🔄 Updated', $stats['updated']],
                ['⏭️  Skipped', $stats['skipped']],
                ['❌ Failed', $stats['failed']],
            ]
        );

        $endTime = now();
        $duration = $startTime->diffInSeconds($endTime);

        $this->newLine();
        $this->info("⏱️  Duration: {$duration} seconds");
        $this->info("🕐 Completed: {$endTime->format('Y-m-d H:i:s')}");

        if ($stats['failed'] > 0) {
            $this->newLine();
            $this->warn("⚠️  {$stats['failed']} staff members failed. Check logs for details.");
            return Command::FAILURE;
        }

        return Command::SUCCESS;
    }
}
