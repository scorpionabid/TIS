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

// ============================================
// STAFF RATING SYSTEM SCHEDULING
// ============================================

// Daily automatic staff rating calculation
// Runs every day at 01:00 (low-traffic time)
Schedule::command('staff-rating:calculate')
    ->daily()
    ->at('01:00')
    ->description('Calculate automatic staff ratings (daily)')
    ->onSuccess(function () {
        \Log::info('Daily staff rating calculation completed successfully', [
            'timestamp' => now()->toIso8601String(),
            'period' => \App\Services\StaffRating\AutomaticRatingCalculator::getCurrentPeriod(),
        ]);
    })
    ->onFailure(function () {
        \Log::error('Daily staff rating calculation failed', [
            'timestamp' => now()->toIso8601String(),
        ]);
    });

// Monthly full recalculation (force mode)
// Runs on the 1st day of each month at 02:00
Schedule::command('staff-rating:calculate --force')
    ->monthlyOn(1, '02:00')
    ->description('Full recalculation of staff ratings (monthly)')
    ->onSuccess(function () {
        \Log::info('Monthly staff rating recalculation completed', [
            'timestamp' => now()->toIso8601String(),
            'mode' => 'force',
        ]);
    });

// Quarterly cleanup (optional)
// Marks old ratings (older than 12 months) as archived
Schedule::call(function () {
    $archiveDate = now()->subMonths(12);
    $archivedCount = \App\Models\StaffRating::where('created_at', '<', $archiveDate)
        ->where('is_latest', false)
        ->update(['is_latest' => false]);

    if ($archivedCount > 0) {
        \Log::info('Quarterly staff rating cleanup completed', [
            'archived_count' => $archivedCount,
            'archive_date' => $archiveDate->toDateString(),
        ]);
    }
})->quarterly()->description('Cleanup old staff ratings (quarterly)');
