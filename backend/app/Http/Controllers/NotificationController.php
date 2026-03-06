<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Get user's notifications with pagination
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
            'type' => 'nullable|string|in:task_assigned,task_updated,task_deadline,survey_published,survey_assigned,survey_deadline,survey_approved,survey_rejected,system_alert,maintenance,security_alert',
            'channel' => 'nullable|string|in:in_app,email,sms,push',
            'priority' => 'nullable|string|in:low,normal,high,critical',
            'is_read' => 'nullable|boolean',
            'sort_by' => 'nullable|string|in:created_at,priority,type',
            'sort_direction' => 'nullable|string|in:asc,desc',
        ]);

        $user = Auth::user();
        $query = Notification::forUser($user->id)->with(['related']);

        // Apply filters
        if ($request->type) {
            $query->byType($request->type);
        }

        if ($request->channel) {
            $query->byChannel($request->channel);
        }

        if ($request->priority) {
            $query->byPriority($request->priority);
        }

        if ($request->has('is_read')) {
            if ($request->is_read) {
                $query->read();
            } else {
                $query->unread();
            }
        }

        // Sorting
        $sortBy = $request->sort_by ?? 'created_at';
        $sortDirection = $request->sort_direction ?? 'desc';
        $query->orderBy($sortBy, $sortDirection);

        $perPage = $request->per_page ?? 20;
        $notifications = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $notifications->items(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'from' => $notifications->firstItem(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'to' => $notifications->lastItem(),
                'total' => $notifications->total(),
            ],
        ]);
    }

    /**
     * Get unread notifications count
     */
    public function unreadCount(): JsonResponse
    {
        $user = Auth::user();
        $count = $this->notificationService->getUnreadCount($user->id);

        return response()->json([
            'success' => true,
            'data' => ['count' => $count],
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $success = $this->notificationService->markAsRead($id, $user->id);

        if ($success) {
            return response()->json([
                'success' => true,
                'message' => 'Bildiriş oxunmuş kimi işarələndi.',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Bildiriş tapılmadı və ya sizə aid deyil.',
        ], 404);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(): JsonResponse
    {
        $user = Auth::user();
        $count = $this->notificationService->markAllAsRead($user->id);

        return response()->json([
            'success' => true,
            'message' => "{$count} bildiriş oxunmuş kimi işarələndi.",
            'data' => ['marked_count' => $count],
        ]);
    }

    /**
     * Get notification details
     */
    public function show(int $id): JsonResponse
    {
        $user = Auth::user();

        $notification = Notification::where('id', $id)
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhereJsonContains('target_users', $user->id);
            })
            ->with(['related', 'user'])
            ->first();

        if (! $notification) {
            return response()->json([
                'success' => false,
                'message' => 'Bildiriş tapılmadı.',
            ], 404);
        }

        // Mark as read if not already
        if (! $notification->is_read) {
            $notification->markAsRead();
        }

        return response()->json([
            'success' => true,
            'data' => $notification,
        ]);
    }

    /**
     * Delete notification
     */
    public function destroy(int $id): JsonResponse
    {
        $user = Auth::user();

        $notification = Notification::where('id', $id)
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhereJsonContains('target_users', $user->id);
            })
            ->first();

        if (! $notification) {
            return response()->json([
                'success' => false,
                'message' => 'Bildiriş tapılmadı.',
            ], 404);
        }

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Bildiriş silindi.',
        ]);
    }

    /**
     * Get notification statistics
     */
    public function statistics(): JsonResponse
    {
        $user = Auth::user();

        // Base query for this user's notifications (reuse to avoid repeated scope calls)
        $baseQuery = fn () => Notification::forUser($user->id);

        $total   = $baseQuery()->count();
        $unread  = $baseQuery()->unread()->count();
        $newToday  = $baseQuery()->whereDate('created_at', today())->count();
        $thisWeek  = $baseQuery()->where('created_at', '>=', now()->startOfWeek())->count();

        // Group by type and priority using DB aggregation (single query each)
        $byType = $baseQuery()
            ->selectRaw('type, count(*) as count')
            ->groupBy('type')
            ->pluck('count', 'type')
            ->map(fn ($count, $type) => ['type' => $type, 'count' => $count])
            ->values();

        $byPriority = $baseQuery()
            ->selectRaw('priority, count(*) as count')
            ->whereNotNull('priority')
            ->groupBy('priority')
            ->pluck('count', 'priority')
            ->map(fn ($count, $priority) => ['priority' => $priority, 'count' => $count])
            ->values();

        // Recent activity: last 7 days per day
        $recentActivity = $baseQuery()
            ->selectRaw("DATE(created_at) as date, count(*) as count")
            ->where('created_at', '>=', now()->subDays(7))
            ->groupByRaw("DATE(created_at)")
            ->orderByRaw("DATE(created_at)")
            ->get()
            ->map(fn ($row) => ['date' => $row->date, 'count' => $row->count]);

        return response()->json([
            'success' => true,
            'data'    => [
                // Frontend-compatible field names
                'total_notifications' => $total,
                'unread_notifications' => $unread,
                'new_today'           => $newToday,
                'this_week'           => $thisWeek,
                'by_type'             => $byType,
                'by_priority'         => $byPriority,
                'recent_activity'     => $recentActivity,
                // Legacy fields (backward compat)
                'total'  => $total,
                'unread' => $unread,
            ],
        ]);
    }

    /**
     * Send test notification (for admins)
     */
    public function sendTest(Request $request): JsonResponse
    {
        $user = Auth::user();

        // Only superadmin can send test notifications
        if (! $user->hasRole('superadmin')) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün səlahiyyətiniz yoxdur.',
            ], 403);
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'required|string|in:system_alert,maintenance',
            'priority' => 'required|string|in:low,normal,high,critical',
            'channel' => 'required|string|in:in_app,email,sms',
            'target_users' => 'nullable|array',
            'target_users.*' => 'integer|exists:users,id',
        ]);

        $targetUsers = $request->target_users ?? [$user->id];

        $notifications = $this->notificationService->sendFromTemplate(
            'system_alert',
            ['users' => $targetUsers],
            [
                'title' => $request->title,
                'message' => $request->message,
                'sender_name' => $user->name,
            ],
            [
                'priority' => $request->priority,
                'channels' => [$request->channel],
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Test bildirişi göndərildi.',
            'data' => ['sent_count' => count($notifications)],
        ]);
    }

    /**
     * Resend failed notification
     */
    public function resend(int $id): JsonResponse
    {
        $user = Auth::user();

        // Only superadmin can resend notifications
        if (! $user->hasRole('superadmin')) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün səlahiyyətiniz yoxdur.',
            ], 403);
        }

        $notification = Notification::find($id);

        if (! $notification) {
            return response()->json([
                'success' => false,
                'message' => 'Bildiriş tapılmadı.',
            ], 404);
        }

        // Reset notification status
        $notification->update([
            'is_sent' => false,
            'sent_at' => null,
            'email_status' => null,
            'sms_status' => null,
            'delivery_error' => null,
        ]);

        // Attempt to deliver again
        $success = $this->notificationService->deliver($notification);

        return response()->json([
            'success' => $success,
            'message' => $success ? 'Bildiriş yenidən göndərildi.' : 'Bildiriş göndərilməsində xəta baş verdi.',
        ]);
    }
}
