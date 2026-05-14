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

// Attendance Reminders
// Hər iş günü saat 10:00-da davamiyyəti qeyd edilməmiş məktəbləri xəbərdar et
Schedule::command('attendance:send-reminders')
    ->weekdays()
    ->dailyAt('10:00')
    ->description('Davamiyyəti qeyd edilməmiş məktəblərin adminlərinə xatırlatma göndər')
    ->onSuccess(function () {
        \Log::info('Attendance reminders sent successfully');
    })
    ->onFailure(function () {
        \Log::error('Attendance reminders failed');
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

// ─── DB Maintenance Schedules ───────────────────────────────────────────

// Token təmizləmə: 7 gündən köhnə expired tokenları sil
Schedule::command('sanctum:prune-expired --hours=168')
    ->daily()
    ->at('01:00')
    ->description('Prune expired Sanctum tokens older than 7 days')
    ->onSuccess(function () {
        \Log::info('Sanctum token pruning completed');
    });

// Session GC: expired session-ları təmizlə
Schedule::command('session:gc')
    ->hourly()
    ->description('Garbage collect expired sessions')
    ->onSuccess(function () {
        \Log::info('Session garbage collection completed');
    });

// Activity/Security logs təmizləmə: həftəlik
Schedule::command('logs:cleanup')
    ->weekly()
    ->sundays()
    ->at('04:00')
    ->description('Weekly cleanup: activity logs, security events, audit logs')
    ->onSuccess(function () {
        \Log::info('Weekly log cleanup completed');
    })
    ->onFailure(function () {
        \Log::error('Weekly log cleanup failed');
    });

// Mesaj təmizliyi: oxunmuş (1 gün) + oxunmamış (5 gün) + orphan mesajlar
Schedule::command('messages:cleanup')
    ->dailyAt('02:00')
    ->description('Müddəti keçmiş mesajları təmizlə')
    ->onSuccess(function () {
        \Log::info('Message cleanup completed successfully');
    })
    ->onFailure(function () {
        \Log::error('Message cleanup failed');
    });

// Məktəbəqədər şəkillər: 30 gündən köhnəlləri sil
Schedule::command('preschool:cleanup-photos --older-than=30')
    ->daily()
    ->at('03:30')
    ->description('Məktəbəqədər şəkillər: 30 gündən köhnəlləri sil')
    ->onSuccess(function () {
        \Log::info('Preschool photo cleanup completed successfully');
    })
    ->onFailure(function () {
        \Log::error('Preschool photo cleanup failed');
    });

// Notification Digest: Gündəlik xülasə — saat 09:00-da
Schedule::command('notifications:send-digest --period=daily')
    ->dailyAt('09:00')
    ->description('Gündəlik bildiriş xülasəsini göndər')
    ->onSuccess(function () {
        \Log::info('Daily notification digest sent successfully');
    })
    ->onFailure(function () {
        \Log::error('Daily notification digest failed');
    });

// Notification Digest: Həftəlik xülasə — Bazar ertəsi saat 09:00-da
Schedule::command('notifications:send-digest --period=weekly')
    ->weeklyOn(1, '09:00')
    ->description('Həftəlik bildiriş xülasəsini göndər')
    ->onSuccess(function () {
        \Log::info('Weekly notification digest sent successfully');
    })
    ->onFailure(function () {
        \Log::error('Weekly notification digest failed');
    });

// Telescope prune: 48 saatdan köhnə log sətirləri sil
Schedule::command('telescope:prune --hours=48')
    ->daily()
    ->at('04:30')
    ->description('Telescope logs: 48 saatdan köhnə qeydləri sil')
    ->onSuccess(function () {
        \Log::info('Telescope pruning completed successfully');
    })
    ->onFailure(function () {
        \Log::error('Telescope pruning failed');
    });

// Survey Auto-Archive
// Daily check for surveys whose deadlines passed
Schedule::command('surveys:auto-archive')
    ->dailyAt('00:30')
    ->description('Automatically archive surveys whose deadlines passed')
    ->onSuccess(function () {
        \Log::info('Survey auto-archive completed successfully');
    })
    ->onFailure(function () {
        \Log::error('Survey auto-archive failed');
    });
