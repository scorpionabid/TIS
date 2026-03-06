<?php

namespace App\Console\Commands;

use App\Mail\TaskDeadlineReminder;
use App\Models\Task;
use App\Models\User;
use App\Models\UserNotificationPreference;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendTaskDeadlineReminders extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'tasks:send-deadline-reminders
                            {--days=3 : Days before deadline to send reminder}
                            {--dry-run : Run without actually sending emails}';

    /**
     * The console command description.
     */
    protected $description = 'Send email reminders for tasks with approaching deadlines';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $reminderDays = (int) $this->option('days');
        $isDryRun = $this->option('dry-run');

        $this->info("Checking tasks with deadlines in the next {$reminderDays} days...");

        if ($isDryRun) {
            $this->warn('DRY RUN MODE - No emails will be sent');
        }

        // Get tasks that are approaching deadline
        $now = now();
        $deadlineDate = now()->addDays($reminderDays)->endOfDay();

        $tasks = Task::query()
            ->whereNotNull('deadline')
            ->where('deadline', '<=', $deadlineDate)
            ->where('deadline', '>=', $now)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->with(['creator', 'assignee', 'assignments.assignedUser'])
            ->get();

        $this->info("Found {$tasks->count()} tasks with approaching deadlines");

        $sentCount = 0;
        $errorCount = 0;

        foreach ($tasks as $task) {
            $daysRemaining = (int) $now->diffInDays($task->deadline, false);

            // Skip if we've already sent a reminder today (check can be implemented via cache or DB flag)
            // For now, we'll send reminders for specific day thresholds

            // Only send reminders at specific intervals: 3 days, 1 day, same day
            if (! in_array($daysRemaining, [0, 1, 3])) {
                continue;
            }

            $recipients = $this->getTaskRecipients($task);

            foreach ($recipients as $user) {
                if (! $user->email) {
                    $this->warn("User {$user->name} (ID: {$user->id}) has no email address");

                    continue;
                }

                // Check user notification preferences
                $preferences = UserNotificationPreference::getForUser($user->id);

                // Skip if user disabled deadline reminders or email notifications
                if (! $preferences->wantsDeadlineReminder()) {
                    $this->line("  -> Skipping {$user->email} (reminders disabled)");

                    continue;
                }

                // Skip if it's quiet hours for the user
                if ($preferences->isQuietHours()) {
                    $this->line("  -> Skipping {$user->email} (quiet hours)");

                    continue;
                }

                try {
                    if (! $isDryRun) {
                        Mail::to($user->email)->queue(
                            new TaskDeadlineReminder($task, $user, $daysRemaining)
                        );
                    }

                    $this->line("  -> Reminder queued for: {$user->email} ({$daysRemaining} days remaining)");
                    $sentCount++;
                } catch (\Exception $e) {
                    $this->error("  -> Failed to send to {$user->email}: {$e->getMessage()}");
                    Log::error('Task deadline reminder failed', [
                        'task_id' => $task->id,
                        'user_id' => $user->id,
                        'error' => $e->getMessage(),
                    ]);
                    $errorCount++;
                }
            }
        }

        $this->newLine();
        $this->info('Summary:');
        $this->info("  - Reminders sent/queued: {$sentCount}");
        $this->info("  - Errors: {$errorCount}");

        if ($isDryRun) {
            $this->warn('This was a dry run. No emails were actually sent.');
        }

        return self::SUCCESS;
    }

    /**
     * Get all users who should receive reminders for a task
     */
    private function getTaskRecipients(Task $task): array
    {
        $users = collect();

        // Add direct assignee
        if ($task->assignee) {
            $users->push($task->assignee);
        }

        // Add assigned users from task_assignments
        if ($task->assignments) {
            foreach ($task->assignments as $assignment) {
                if ($assignment->assignedUser && $assignment->assignment_status !== 'completed') {
                    $users->push($assignment->assignedUser);
                }
            }
        }

        // Add creator if they want to be notified (optional)
        // if ($task->creator && $task->creator->notify_on_deadline) {
        //     $users->push($task->creator);
        // }

        // Remove duplicates by user ID
        return $users->unique('id')->values()->all();
    }
}
