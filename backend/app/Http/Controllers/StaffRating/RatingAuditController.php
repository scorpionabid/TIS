<?php

namespace App\Http\Controllers\StaffRating;

use App\Http\Controllers\Controller;
use App\Models\StaffRatingAuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * RatingAuditController
 *
 * Provides access to rating audit logs
 * Accessible by: SuperAdmin, RegionAdmin (for their region)
 */
class RatingAuditController extends Controller
{
    public function __construct()
    {
        // Permission middleware
    }

    /**
     * Get all audit logs with filtering
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $userRole = $user->getRoleNames()->first();

            $query = StaffRatingAuditLog::with(['staffUser', 'actor', 'rating']);

            // Apply hierarchical filtering
            if ($userRole !== 'superadmin') {
                if ($userRole === 'regionadmin') {
                    // Only logs for staff in same region
                    $staffIds = User::where('institution_id', $user->institution_id)
                        ->orWhereHas('institution', function ($q) use ($user) {
                            $q->where('parent_id', $user->institution_id);
                        })
                        ->pluck('id');
                    $query->whereIn('staff_user_id', $staffIds);
                } else {
                    // Other roles can only see logs related to their own actions
                    $query->where('actor_user_id', $user->id);
                }
            }

            // Apply filters
            if ($request->has('staff_user_id')) {
                $query->where('staff_user_id', $request->staff_user_id);
            }

            if ($request->has('actor_user_id')) {
                $query->where('actor_user_id', $request->actor_user_id);
            }

            if ($request->has('action')) {
                $query->where('action', $request->action);
            }

            if ($request->has('date_from')) {
                $query->where('created_at', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->where('created_at', '<=', $request->date_to);
            }

            // Pagination
            $perPage = $request->input('per_page', 50);
            $logs = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'logs' => $logs->items(),
                'pagination' => [
                    'total' => $logs->total(),
                    'per_page' => $logs->perPage(),
                    'current_page' => $logs->currentPage(),
                    'last_page' => $logs->lastPage(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Audit log-ları yükləməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get specific audit log details
     *
     * @param StaffRatingAuditLog $log
     * @return JsonResponse
     */
    public function show(StaffRatingAuditLog $log): JsonResponse
    {
        try {
            $log->load(['staffUser', 'actor', 'rating']);

            return response()->json([
                'log' => $log,
                'score_change' => $log->getScoreChangeDescription(),
                'is_improvement' => $log->isImprovement(),
                'is_decline' => $log->isDecline(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Audit log detallarını yükləməkdə xəta',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get audit logs for specific staff member
     *
     * @param Request $request
     * @param User $staff
     * @return JsonResponse
     */
    public function forStaff(Request $request, User $staff): JsonResponse
    {
        try {
            $query = StaffRatingAuditLog::where('staff_user_id', $staff->id)
                ->with(['actor', 'rating']);

            // Apply action filter if provided
            if ($request->has('action')) {
                $query->where('action', $request->action);
            }

            $logs = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'staff' => $staff,
                'logs' => $logs,
                'total' => $logs->count(),
                'actions_summary' => [
                    'created' => $logs->where('action', 'created')->count(),
                    'updated' => $logs->where('action', 'updated')->count(),
                    'deleted' => $logs->where('action', 'deleted')->count(),
                    'auto_calculated' => $logs->where('action', 'auto_calculated')->count(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'İstifadəçi audit log-larını yükləməkdə xəta',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get audit logs by specific actor
     *
     * @param Request $request
     * @param User $actor
     * @return JsonResponse
     */
    public function byActor(Request $request, User $actor): JsonResponse
    {
        try {
            $query = StaffRatingAuditLog::where('actor_user_id', $actor->id)
                ->with(['staffUser', 'rating']);

            $logs = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'actor' => $actor,
                'logs' => $logs,
                'total' => $logs->count(),
                'actions_summary' => [
                    'created' => $logs->where('action', 'created')->count(),
                    'updated' => $logs->where('action', 'updated')->count(),
                    'deleted' => $logs->where('action', 'deleted')->count(),
                    'config_changed' => $logs->where('action', 'config_changed')->count(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Actor audit log-larını yükləməkdə xəta',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get recent audit activity
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function recent(Request $request): JsonResponse
    {
        try {
            $days = $request->input('days', 7);
            $limit = $request->input('limit', 100);

            $user = auth()->user();
            $userRole = $user->getRoleNames()->first();

            $query = StaffRatingAuditLog::with(['staffUser', 'actor', 'rating'])
                ->where('created_at', '>=', now()->subDays($days));

            // Apply hierarchical filtering
            if ($userRole !== 'superadmin') {
                if ($userRole === 'regionadmin') {
                    $staffIds = User::where('institution_id', $user->institution_id)
                        ->orWhereHas('institution', function ($q) use ($user) {
                            $q->where('parent_id', $user->institution_id);
                        })
                        ->pluck('id');
                    $query->whereIn('staff_user_id', $staffIds);
                } else {
                    $query->where('actor_user_id', $user->id);
                }
            }

            $logs = $query->orderBy('created_at', 'desc')->limit($limit)->get();

            return response()->json([
                'days' => $days,
                'logs' => $logs,
                'total' => $logs->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Son fəaliyyət log-larını yükləməkdə xəta',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get statistics about audit activity
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function statistics(Request $request): JsonResponse
    {
        try {
            $dateFrom = $request->input('date_from', now()->subMonth()->toDateString());
            $dateTo = $request->input('date_to', now()->toDateString());

            $user = auth()->user();
            $userRole = $user->getRoleNames()->first();

            $query = StaffRatingAuditLog::whereBetween('created_at', [$dateFrom, $dateTo]);

            // Apply hierarchical filtering
            if ($userRole !== 'superadmin') {
                if ($userRole === 'regionadmin') {
                    $staffIds = User::where('institution_id', $user->institution_id)
                        ->orWhereHas('institution', function ($q) use ($user) {
                            $q->where('parent_id', $user->institution_id);
                        })
                        ->pluck('id');
                    $query->whereIn('staff_user_id', $staffIds);
                } else {
                    $query->where('actor_user_id', $user->id);
                }
            }

            $logs = $query->get();

            // Calculate statistics
            $stats = [
                'period' => [
                    'from' => $dateFrom,
                    'to' => $dateTo,
                ],
                'total_actions' => $logs->count(),
                'by_action' => [
                    'created' => $logs->where('action', 'created')->count(),
                    'updated' => $logs->where('action', 'updated')->count(),
                    'deleted' => $logs->where('action', 'deleted')->count(),
                    'auto_calculated' => $logs->where('action', 'auto_calculated')->count(),
                    'config_changed' => $logs->where('action', 'config_changed')->count(),
                ],
                'improvements' => $logs->filter(function ($log) {
                    return $log->isImprovement();
                })->count(),
                'declines' => $logs->filter(function ($log) {
                    return $log->isDecline();
                })->count(),
                'most_active_actors' => $logs->groupBy('actor_user_id')->map(function ($group) {
                    return [
                        'actor' => $group->first()->actor,
                        'actions_count' => $group->count(),
                    ];
                })->sortByDesc('actions_count')->take(10)->values(),
                'most_rated_staff' => $logs->groupBy('staff_user_id')->map(function ($group) {
                    return [
                        'staff' => $group->first()->staffUser,
                        'changes_count' => $group->count(),
                    ];
                })->sortByDesc('changes_count')->take(10)->values(),
            ];

            return response()->json($stats);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Statistika hesablanarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export audit logs
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function export(Request $request): JsonResponse
    {
        try {
            $dateFrom = $request->input('date_from', now()->subMonth()->toDateString());
            $dateTo = $request->input('date_to', now()->toDateString());

            $user = auth()->user();
            $userRole = $user->getRoleNames()->first();

            $query = StaffRatingAuditLog::with(['staffUser', 'actor', 'rating'])
                ->whereBetween('created_at', [$dateFrom, $dateTo]);

            // Apply hierarchical filtering
            if ($userRole !== 'superadmin') {
                if ($userRole === 'regionadmin') {
                    $staffIds = User::where('institution_id', $user->institution_id)
                        ->orWhereHas('institution', function ($q) use ($user) {
                            $q->where('parent_id', $user->institution_id);
                        })
                        ->pluck('id');
                    $query->whereIn('staff_user_id', $staffIds);
                } else {
                    $query->where('actor_user_id', $user->id);
                }
            }

            $logs = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'period' => [
                    'from' => $dateFrom,
                    'to' => $dateTo,
                ],
                'logs' => $logs,
                'total' => $logs->count(),
                'exported_at' => now()->toIso8601String(),
                'exported_by' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $userRole,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Export edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
