<?php

namespace App\Services;

use App\Models\TaskComment;
use App\Models\User;
use App\Notifications\UserMentionedNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class MentionService
{
    /**
     * Pattern to match @mentions in text
     * Matches: @username or @[Full Name]
     */
    protected string $mentionPattern = '/@(\[([^\]]+)\]|(\w+))/';

    /**
     * Extract usernames from text content
     */
    public function extractMentions(string $content): array
    {
        preg_match_all($this->mentionPattern, $content, $matches, PREG_SET_ORDER);

        $usernames = [];
        foreach ($matches as $match) {
            // Check if it's @[Full Name] format or @username format
            $username = $match[2] ?? $match[3] ?? null;
            if ($username) {
                $usernames[] = $username;
            }
        }

        return array_unique($usernames);
    }

    /**
     * Find users by their names or usernames
     */
    public function findMentionedUsers(array $mentions): Collection
    {
        if (empty($mentions)) {
            return collect();
        }

        return User::query()
            ->where(function ($query) use ($mentions) {
                foreach ($mentions as $mention) {
                    $query->orWhere('name', 'like', "%{$mention}%")
                        ->orWhere('username', $mention)
                        ->orWhere('email', 'like', "{$mention}%");
                }
            })
            ->where('is_active', true)
            ->get();
    }

    /**
     * Process mentions in a task comment and send notifications
     */
    public function processCommentMentions(TaskComment $comment): void
    {
        $mentions = $this->extractMentions($comment->comment ?? '');

        if (empty($mentions)) {
            return;
        }

        $users = $this->findMentionedUsers($mentions);

        // Filter out the comment author
        $users = $users->filter(fn ($user) => $user->id !== $comment->user_id);

        if ($users->isEmpty()) {
            return;
        }

        // Send notifications
        foreach ($users as $user) {
            try {
                $user->notify(new UserMentionedNotification($comment));

                Log::info('Mention notification sent', [
                    'comment_id' => $comment->id,
                    'task_id' => $comment->task_id,
                    'mentioned_user_id' => $user->id,
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to send mention notification', [
                    'comment_id' => $comment->id,
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Format content with mention links (for display)
     */
    public function formatMentionsForDisplay(string $content): string
    {
        // Convert @[Full Name] to clickable link
        $content = preg_replace_callback(
            '/@\[([^\]]+)\]/',
            fn ($matches) => '<span class="mention" data-user="' . htmlspecialchars($matches[1]) . '">@' . htmlspecialchars($matches[1]) . '</span>',
            $content
        );

        // Convert @username to clickable link
        $content = preg_replace_callback(
            '/@(\w+)/',
            fn ($matches) => '<span class="mention" data-user="' . htmlspecialchars($matches[1]) . '">@' . htmlspecialchars($matches[1]) . '</span>',
            $content
        );

        return $content;
    }

    /**
     * Get users that can be mentioned in a task context
     */
    public function getMentionableUsers(int $taskId, ?int $institutionId = null): Collection
    {
        $query = User::query()
            ->where('is_active', true)
            ->select(['id', 'name', 'username', 'email']);

        // If institution is provided, filter by institution
        if ($institutionId) {
            $query->where('institution_id', $institutionId);
        }

        return $query->orderBy('name')->limit(50)->get();
    }
}
