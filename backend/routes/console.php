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
