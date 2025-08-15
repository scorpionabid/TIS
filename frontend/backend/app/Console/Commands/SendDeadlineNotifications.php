<?php

namespace App\Console\Commands;

use App\Models\Task;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendDeadlineNotifications extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'notifications:send-deadline-warnings';

    /**
     * The console command description.
     */
    protected $description = 'Send deadline warning notifications for tasks approaching their deadline';

    protected NotificationService $notificationService;

    /**
     * Create a new command instance.
     */
    public function __construct(NotificationService $notificationService)
    {
        parent::__construct();
        $this->notificationService = $notificationService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Checking for tasks with approaching deadlines...');

        // Get tasks with deadlines approaching in 3 days
        $tasks = Task::deadlineApproaching(3)->get();

        $sentNotifications = 0;

        foreach ($tasks as $task) {
            // Check if we already sent a deadline warning recently
            $existingNotification = \App\Models\Notification::where('related_type', Task::class)
                                                            ->where('related_id', $task->id)
                                                            ->where('type', 'task_deadline')
                                                            ->where('created_at', '>=', now()->subDay())
                                                            ->exists();

            if (!$existingNotification) {
                $this->notificationService->sendTaskDeadlineWarning($task);
                $sentNotifications++;
                $this->line("Sent deadline warning for task: {$task->title}");
            }
        }

        // Process scheduled notifications
        $processedScheduled = $this->notificationService->processScheduledNotifications();

        $this->info("Sent {$sentNotifications} deadline warnings.");
        $this->info("Processed {$processedScheduled} scheduled notifications.");

        return Command::SUCCESS;
    }
}