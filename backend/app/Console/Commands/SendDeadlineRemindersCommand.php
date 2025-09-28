<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Jobs\SendDeadlineReminders;
use Illuminate\Support\Facades\Log;

class SendDeadlineRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'deadline:send-reminders
                           {--force : Force send reminders even if recently sent}
                           {--dry-run : Show what would be sent without actually sending}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send deadline reminder notifications for surveys and tasks';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔔 Starting deadline reminder process...');

        try {
            if ($this->option('dry-run')) {
                $this->warn('🧪 DRY RUN MODE: No notifications will be sent');
                // In dry-run mode, we would analyze what would be sent
                $this->analyzeUpcomingDeadlines();
            } else {
                // Dispatch the job to handle deadline reminders
                SendDeadlineReminders::dispatch();

                $this->info('✅ Deadline reminder job dispatched successfully');
                $this->info('📊 Check the logs for detailed information about sent reminders');
            }

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('❌ Failed to process deadline reminders: ' . $e->getMessage());
            Log::error('Deadline reminders command failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return Command::FAILURE;
        }
    }

    /**
     * Analyze upcoming deadlines without sending notifications
     */
    protected function analyzeUpcomingDeadlines(): void
    {
        $this->info('🔍 Analyzing upcoming deadlines...');

        // Survey deadlines
        $this->analyzeSurveyDeadlines();

        // Task deadlines
        $this->analyzeTaskDeadlines();
    }

    /**
     * Analyze survey deadlines
     */
    protected function analyzeSurveyDeadlines(): void
    {
        $now = \Carbon\Carbon::now();

        $this->line('');
        $this->info('📋 Survey Deadlines:');
        $this->line('==================');

        $deadlineThresholds = [
            ['days' => 3, 'label' => '3 days'],
            ['days' => 1, 'label' => '1 day'],
            ['days' => 0, 'label' => 'today']
        ];

        foreach ($deadlineThresholds as $threshold) {
            $targetDate = $now->clone()->addDays($threshold['days']);

            $surveys = \App\Models\Survey::where('status', 'published')
                ->whereDate('end_date', $targetDate->toDateString())
                ->where('end_date', '>', $now)
                ->get();

            $this->line("• Surveys ending in {$threshold['label']}: " . $surveys->count());

            foreach ($surveys as $survey) {
                $this->line("  - {$survey->title} (ID: {$survey->id})");
            }
        }

        // Overdue surveys
        $overdueSurveys = \App\Models\Survey::where('status', 'published')
            ->where('end_date', '<', $now)
            ->get();

        $this->line("• Overdue surveys: " . $overdueSurveys->count());
        foreach ($overdueSurveys as $survey) {
            $daysPast = $now->diffInDays($survey->end_date);
            $this->line("  - {$survey->title} (overdue by {$daysPast} days)");
        }
    }

    /**
     * Analyze task deadlines
     */
    protected function analyzeTaskDeadlines(): void
    {
        $now = \Carbon\Carbon::now();

        $this->line('');
        $this->info('📝 Task Deadlines:');
        $this->line('================');

        $deadlineThresholds = [
            ['days' => 3, 'label' => '3 days'],
            ['days' => 1, 'label' => '1 day'],
            ['days' => 0, 'label' => 'today']
        ];

        foreach ($deadlineThresholds as $threshold) {
            $targetDate = $now->clone()->addDays($threshold['days']);

            $tasks = \App\Models\Task::whereIn('status', ['pending', 'in_progress'])
                ->whereDate('due_date', $targetDate->toDateString())
                ->where('due_date', '>', $now)
                ->get();

            $this->line("• Tasks due in {$threshold['label']}: " . $tasks->count());

            foreach ($tasks as $task) {
                $this->line("  - {$task->title} (ID: {$task->id}, Priority: {$task->priority})");
            }
        }

        // Overdue tasks
        $overdueTasks = \App\Models\Task::whereIn('status', ['pending', 'in_progress'])
            ->where('due_date', '<', $now)
            ->get();

        $this->line("• Overdue tasks: " . $overdueTasks->count());
        foreach ($overdueTasks as $task) {
            $daysPast = $now->diffInDays($task->due_date);
            $this->line("  - {$task->title} (overdue by {$daysPast} days, Priority: {$task->priority})");
        }
    }
}
