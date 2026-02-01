<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ATİS Notification Cleanup Scheduling
// Daily cleanup for read notifications older than 7 days
Schedule::command('notifications:cleanup --older-than=7')
    ->daily()
    ->at('02:00')
    ->description('Clean up read notifications older than 7 days')
    ->onSuccess(function () {
        \Log::info('Daily notification cleanup completed successfully');
    })
    ->onFailure(function () {
        \Log::error('Daily notification cleanup failed');
    });

// Weekly cleanup for older notifications
Schedule::command('notifications:cleanup --older-than=30')
    ->weekly()
    ->sundays()
    ->at('03:00')
    ->description('Weekly cleanup: remove notifications older than 30 days')
    ->onSuccess(function () {
        \Log::info('Weekly notification cleanup completed successfully');
    });

// Task Deadline Reminders
// Send reminders at 8:00 AM for tasks approaching deadline
Schedule::command('tasks:send-deadline-reminders --days=3')
    ->dailyAt('08:00')
    ->description('Send deadline reminders for tasks due in 3 days')
    ->onSuccess(function () {
        \Log::info('Task deadline reminders sent successfully');
    })
    ->onFailure(function () {
        \Log::error('Task deadline reminders failed');
    });

// Send urgent reminders at 2:00 PM for same-day deadlines
Schedule::command('tasks:send-deadline-reminders --days=0')
    ->dailyAt('14:00')
    ->description('Send urgent reminders for tasks due today')
    ->onSuccess(function () {
        \Log::info('Urgent task deadline reminders sent successfully');
    });

// Optional: Monthly cleanup log notifications
Schedule::call(function () {
    $totalNotifications = \App\Models\Notification::count();
    $unreadNotifications = \App\Models\Notification::where('is_read', false)->count();
    $oldNotifications = \App\Models\Notification::where('created_at', '<', now()->subDays(30))->count();

    \Log::info('Monthly notification system report', [
        'total_notifications' => $totalNotifications,
        'unread_notifications' => $unreadNotifications,
        'old_notifications_30_days' => $oldNotifications,
        'database_table_size' => 'notifications',
    ]);
})->monthly()->description('Generate monthly notification system report');
