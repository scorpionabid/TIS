<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * List audit logs with filtering and pagination.
     * superadmin sees all logs; RegionAdmin sees logs for their institution hierarchy.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = min((int) $request->get('per_page', 25), 100);
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');

        $query = AuditLog::with(['user:id,first_name,last_name,username,email', 'institution:id,name'])
            ->orderBy($sortBy, $sortDirection);

        // Institution hierarchy data isolation
        if (! $user->hasRole('superadmin')) {
            $query->where('institution_id', $user->institution_id);
        }

        // Filters
        if ($request->filled('event')) {
            $query->where('event', $request->event);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('auditable_type')) {
            $query->where('auditable_type', $request->auditable_type);
        }

        if ($request->filled('institution_id') && $user->hasRole('superadmin')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('event', 'like', "%{$search}%")
                    ->orWhere('url', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%")
                    ->orWhere('auditable_type', 'like', "%{$search}%");
            });
        }

        $logs = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    /**
     * Activity logs — user actions (login, create, update, delete).
     */
    public function activities(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = min((int) $request->get('per_page', 25), 100);

        $query = ActivityLog::with(['user:id,first_name,last_name,username'])
            ->orderBy('created_at', 'desc');

        if (! $user->hasRole('superadmin')) {
            $query->where('institution_id', $user->institution_id);
        }

        if ($request->filled('activity_type')) {
            $query->where('activity_type', $request->activity_type);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    /**
     * Summary statistics for the dashboard cards.
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();

        $auditBase = AuditLog::query();
        $activityBase = ActivityLog::query();

        if (! $user->hasRole('superadmin')) {
            $auditBase->where('institution_id', $user->institution_id);
            $activityBase->where('institution_id', $user->institution_id);
        }

        $todayAudit = (clone $auditBase)->whereDate('created_at', today())->count();
        $weekAudit = (clone $auditBase)->where('created_at', '>=', now()->subWeek())->count();
        $monthAudit = (clone $auditBase)->where('created_at', '>=', now()->subMonth())->count();

        $activeUsers = (clone $activityBase)
            ->where('created_at', '>=', now()->subHours(24))
            ->distinct('user_id')
            ->count('user_id');

        $securityEvents = (clone $auditBase)
            ->security()
            ->where('created_at', '>=', now()->subWeek())
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'today' => $todayAudit,
                'this_week' => $weekAudit,
                'this_month' => $monthAudit,
                'active_users_24h' => $activeUsers,
                'security_events_week' => $securityEvents,
            ],
        ]);
    }

    /**
     * Distinct event types for filter dropdown.
     */
    public function eventTypes(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = AuditLog::select('event')->distinct();

        if (! $user->hasRole('superadmin')) {
            $query->where('institution_id', $user->institution_id);
        }

        $events = $query->orderBy('event')->pluck('event');

        return response()->json(['success' => true, 'data' => $events]);
    }

    /**
     * Distinct auditable types for filter dropdown.
     */
    public function auditableTypes(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = AuditLog::select('auditable_type')->distinct();

        if (! $user->hasRole('superadmin')) {
            $query->where('institution_id', $user->institution_id);
        }

        $types = $query->whereNotNull('auditable_type')
            ->orderBy('auditable_type')
            ->pluck('auditable_type')
            ->map(function ($type) {
                return $type; // Raw value, frontend will handle formatting
            });

        return response()->json(['success' => true, 'data' => $types]);
    }
}
