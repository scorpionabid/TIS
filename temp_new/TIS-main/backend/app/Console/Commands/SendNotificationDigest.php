<?php

namespace App\Console\Commands;

use App\Mail\NotificationDigestMail;
use App\Models\Notification;
use App\Models\User;
use App\Models\UserNotificationPreference;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendNotificationDigest extends Command
{
    protected $signature = 'notifications:send-digest
                            {--period=daily : daily or weekly}
                            {--dry-run      : List recipients without sending}';

    protected $description = 'Bildiriş abunəçilərinə gündəlik/həftəlik xülasə email-i göndər';

    private array $typeToGroup = [
        'task_assigned' => 'tasks',
        'task_updated' => 'tasks',
        'task_deadline' => 'tasks',
        'task_status_update' => 'tasks',
        'task_approval_required' => 'tasks',
        'task_approved' => 'tasks',
        'task_rejected' => 'tasks',
        'task_deadline_approaching' => 'tasks',
        'task_overdue' => 'tasks',
        'survey_published' => 'surveys',
        'survey_assigned' => 'surveys',
        'survey_assignment' => 'surveys',
        'survey_deadline' => 'surveys',
        'survey_deadline_reminder' => 'surveys',
        'survey_approved' => 'surveys',
        'survey_rejected' => 'surveys',
        'survey_created' => 'surveys',
        'approval_completed' => 'surveys',
        'revision_required' => 'surveys',
        'document_shared' => 'documents',
        'document_uploaded' => 'documents',
        'document_updated' => 'documents',
        'link_shared' => 'documents',
        'link_updated' => 'documents',
    ];

    public function handle(): int
    {
        $period = $this->option('period');
        $dryRun = $this->option('dry-run');
        $since = $period === 'weekly' ? now()->subWeek() : now()->subDay();

        if (! in_array($period, ['daily', 'weekly'])) {
            $this->error('--period must be "daily" or "weekly"');

            return self::FAILURE;
        }

        // Users who opted in to digest AND have email enabled
        $prefUserIds = UserNotificationPreference::where('email_daily_digest', true)
            ->where('email_enabled', true)
            ->pluck('user_id');

        if ($prefUserIds->isEmpty()) {
            $this->info('No users opted in to digest emails.');

            return self::SUCCESS;
        }

        $users = User::whereIn('id', $prefUserIds)
            ->whereNotNull('email')
            ->get();

        $sent = 0;

        foreach ($users as $user) {
            $notifications = Notification::where('user_id', $user->id)
                ->where('is_read', false)
                ->where('created_at', '>=', $since)
                ->orderByDesc('created_at')
                ->get(['title', 'message', 'type', 'priority', 'created_at']);

            if ($notifications->isEmpty()) {
                continue;
            }

            // Group by category
            $groups = ['tasks' => [], 'surveys' => [], 'documents' => [], 'system' => []];
            foreach ($notifications as $n) {
                $group = $this->typeToGroup[$n->type] ?? 'system';
                $groups[$group][] = [
                    'title' => $n->title,
                    'message' => $n->message,
                    'priority' => $n->priority,
                    'created_at' => $n->created_at,
                ];
            }
            // Remove empty groups
            $groups = array_filter($groups, fn ($g) => count($g) > 0);

            if ($dryRun) {
                $this->line("  Would send to {$user->email} — {$notifications->count()} notifications");

                continue;
            }

            Mail::to($user->email)->queue(
                new NotificationDigestMail($user, $groups, $notifications->count(), $period)
            );

            $sent++;
        }

        if ($dryRun) {
            $this->info("Dry-run completed. Would have sent to {$users->count()} potential recipients.");
        } else {
            $this->info("Digest emails queued for {$sent} users (period: {$period}).");
        }

        return self::SUCCESS;
    }
}
