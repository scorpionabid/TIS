<?php

namespace App\Console\Commands;

use App\Models\GradeBookSession;
use App\Services\GradeBookCacheService;
use App\Services\GradeBookNotificationService;
use Illuminate\Console\Command;

class GradeBookScheduledTasks extends Command
{
    protected $signature = 'gradebook:scheduled-tasks';

    protected $description = 'Run scheduled tasks for grade book system';

    public function handle(): int
    {
        $this->info('Starting grade book scheduled tasks...');

        // Task 1: Check for approaching deadlines
        $this->checkDeadlineApproaching();

        // Task 2: Warm up cache for active grade books
        $this->warmUpCache();

        // Task 3: Detect suspicious activity
        $this->detectSuspiciousActivity();

        // Task 4: Send summary notifications to teachers
        $this->sendDailySummary();

        $this->info('All scheduled tasks completed.');

        return self::SUCCESS;
    }

    /**
     * Check for grade books with approaching deadlines
     */
    protected function checkDeadlineApproaching(): void
    {
        $this->info('Checking for approaching deadlines...');

        $notificationService = app(GradeBookNotificationService::class);

        // Find grade books that will close in 7, 3, or 1 days
        $thresholds = [7, 3, 1];

        foreach ($thresholds as $days) {
            $gradeBooks = GradeBookSession::where('status', 'active')
                ->whereNotNull('closes_at')
                ->whereDate('closes_at', '=', now()->addDays($days))
                ->get();

            foreach ($gradeBooks as $gradeBook) {
                $notificationService->notifyDeadlineApproaching($gradeBook->id, $days);
                $this->info("Notified teachers for grade book {$gradeBook->id} ({$days} days remaining)");
            }
        }
    }

    /**
     * Warm up cache for active grade books
     */
    protected function warmUpCache(): void
    {
        $this->info('Warming up cache for active grade books...');

        $cacheService = app(GradeBookCacheService::class);

        $gradeBooks = GradeBookSession::where('status', 'active')
            ->get();

        foreach ($gradeBooks as $gradeBook) {
            try {
                $cacheService->warmUpCache($gradeBook->id);
                $this->info("Cache warmed up for grade book {$gradeBook->id}");
            } catch (\Exception $e) {
                $this->error("Failed to warm up cache for grade book {$gradeBook->id}: " . $e->getMessage());
            }
        }
    }

    /**
     * Detect suspicious activity in grade books
     */
    protected function detectSuspiciousActivity(): void
    {
        $this->info('Detecting suspicious activity...');

        $auditService = app(\App\Services\GradeBookAuditService::class);
        $notificationService = app(GradeBookNotificationService::class);

        $gradeBooks = GradeBookSession::where('status', 'active')->get();

        foreach ($gradeBooks as $gradeBook) {
            $suspicious = $auditService->detectSuspiciousActivity($gradeBook->id, 24);

            if ($suspicious['has_suspicious_activity']) {
                $notificationService->notifySuspiciousActivity($gradeBook->id, $suspicious);
                $this->warn("Suspicious activity detected in grade book {$gradeBook->id}");
            }
        }
    }

    /**
     * Send daily summary to teachers
     */
    protected function sendDailySummary(): void
    {
        $this->info('Sending daily summaries...');

        $notificationService = app(GradeBookNotificationService::class);
        $auditService = app(\App\Services\GradeBookAuditService::class);

        $gradeBooks = GradeBookSession::where('status', 'active')
            ->with('teachers.teacher')
            ->get();

        foreach ($gradeBooks as $gradeBook) {
            $activity = $auditService->getRecentActivity($gradeBook->id, 24);

            if ($activity['total_changes'] > 0) {
                $title = "Gündəlik icmal: {$gradeBook->subject->name}";
                $message = sprintf(
                    'Son 24 saatda %d dəyişiklik edildi. %d yeniləmə, %d yeni bal.',
                    $activity['total_changes'],
                    $activity['stats']['update'] ?? 0,
                    $activity['stats']['create'] ?? 0
                );

                $notificationService->sendBulkNotification($gradeBook->id, $title, $message);
                $this->info("Sent daily summary for grade book {$gradeBook->id}");
            }
        }
    }
}
