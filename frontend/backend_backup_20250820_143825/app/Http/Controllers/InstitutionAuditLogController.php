<?php

namespace App\Http\Controllers;

use App\Models\InstitutionAuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class InstitutionAuditLogController extends Controller
{
    /**
     * Get audit logs for all institutions
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        try {
            $request->validate([
                'per_page' => 'nullable|integer|min:1|max:100',
                'institution_id' => 'nullable|integer|exists:institutions,id',
                'user_id' => 'nullable|integer|exists:users,id',
                'action' => 'nullable|string|in:created,updated,deleted,restored,force_deleted',
                'from_date' => 'nullable|date',
                'to_date' => 'nullable|date|after_or_equal:from_date',
                'search' => 'nullable|string|max:255',
            ]);

            $query = InstitutionAuditLog::with(['institution', 'user'])
                ->orderBy('created_at', 'desc');

            // Apply filters
            if ($request->institution_id) {
                $query->where('institution_id', $request->institution_id);
            }

            if ($request->user_id) {
                $query->where('user_id', $request->user_id);
            }

            if ($request->action) {
                $query->where('action', $request->action);
            }

            if ($request->from_date) {
                $query->whereDate('created_at', '>=', $request->from_date);
            }

            if ($request->to_date) {
                $query->whereDate('created_at', '<=', $request->to_date);
            }

            if ($request->search) {
                $query->where(function($q) use ($request) {
                    $q->whereHas('institution', function($subQ) use ($request) {
                        $subQ->where('name', 'ILIKE', "%{$request->search}%");
                    })->orWhere('description', 'ILIKE', "%{$request->search}%");
                });
            }

            $logs = $query->paginate($request->per_page ?? 20);

            return response()->json([
                'success' => true,
                'logs' => $logs->items(),
                'meta' => [
                    'current_page' => $logs->currentPage(),
                    'last_page' => $logs->lastPage(),
                    'per_page' => $logs->perPage(),
                    'total' => $logs->total(),
                    'from' => $logs->firstItem(),
                    'to' => $logs->lastItem(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Audit log-lar yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get audit logs for a specific institution
     */
    public function show(int $institutionId, Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        try {
            $request->validate([
                'per_page' => 'nullable|integer|min:1|max:100',
                'action' => 'nullable|string|in:created,updated,deleted,restored,force_deleted',
                'from_date' => 'nullable|date',
                'to_date' => 'nullable|date|after_or_equal:from_date',
            ]);

            $query = InstitutionAuditLog::with(['user'])
                ->where('institution_id', $institutionId)
                ->orderBy('created_at', 'desc');

            // Apply filters
            if ($request->action) {
                $query->where('action', $request->action);
            }

            if ($request->from_date) {
                $query->whereDate('created_at', '>=', $request->from_date);
            }

            if ($request->to_date) {
                $query->whereDate('created_at', '<=', $request->to_date);
            }

            $logs = $query->paginate($request->per_page ?? 20);

            return response()->json([
                'success' => true,
                'logs' => $logs->items(),
                'meta' => [
                    'current_page' => $logs->currentPage(),
                    'last_page' => $logs->lastPage(),
                    'per_page' => $logs->perPage(),
                    'total' => $logs->total(),
                    'from' => $logs->firstItem(),
                    'to' => $logs->lastItem(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Audit log-lar yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get audit log statistics
     */
    public function statistics(): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        try {
            $stats = [
                'total_logs' => InstitutionAuditLog::count(),
                'recent_logs' => InstitutionAuditLog::recent(7)->count(),
                'by_action' => InstitutionAuditLog::selectRaw('action, COUNT(*) as count')
                    ->groupBy('action')
                    ->pluck('count', 'action'),
                'by_user' => InstitutionAuditLog::with('user')
                    ->selectRaw('user_id, COUNT(*) as count')
                    ->groupBy('user_id')
                    ->orderBy('count', 'desc')
                    ->limit(10)
                    ->get()
                    ->mapWithKeys(function($log) {
                        return [$log->user->name ?? 'Unknown' => $log->count];
                    }),
                'recent_activity' => InstitutionAuditLog::with(['institution', 'user'])
                    ->recent(7)
                    ->limit(10)
                    ->get()
                    ->map(function($log) {
                        return [
                            'id' => $log->id,
                            'action' => $log->action_display,
                            'institution' => $log->institution->name ?? 'Unknown',
                            'user' => $log->user->name ?? 'Unknown',
                            'description' => $log->description,
                            'created_at' => $log->created_at->format('Y-m-d H:i:s'),
                        ];
                    }),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Audit log statistikları yüklənərkən xəta baş verdi.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }
}
