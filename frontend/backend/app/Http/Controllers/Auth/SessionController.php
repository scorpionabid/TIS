<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\SessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    protected $sessionService;

    public function __construct(SessionService $sessionService)
    {
        $this->sessionService = $sessionService;
    }

    /**
     * Get active sessions for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $sessions = $this->sessionService->getActiveSessions($request->user());
        
        return response()->json([
            'sessions' => $sessions
        ]);
    }

    /**
     * Revoke a specific session.
     */
    public function revoke(Request $request, string $sessionId): JsonResponse
    {
        $revoked = $this->sessionService->revokeSession($request->user(), $sessionId);
        
        if (!$revoked) {
            return response()->json([
                'message' => 'Sessiya tapılmadı'
            ], 404);
        }
        
        return response()->json([
            'message' => 'Sessiya uğurla ləğv edildi'
        ]);
    }

    /**
     * Revoke all other sessions.
     */
    public function revokeOthers(Request $request): JsonResponse
    {
        $count = $request->user()->tokens()
            ->where('id', '!=', $request->user()->currentAccessToken()->id)
            ->delete();

        return response()->json([
            'message' => 'Other sessions revoked successfully',
            'revoked_count' => $count
        ]);
    }

    /**
     * Revoke all sessions (including current).
     */
    public function revokeAll(Request $request): JsonResponse
    {
        $count = $request->user()->tokens()->delete();

        return response()->json([
            'message' => 'All sessions revoked successfully',
            'revoked_count' => $count
        ]);
    }

    /**
     * Get session statistics.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $stats = [
            'total_sessions' => $user->tokens()->count(),
            'active_sessions' => $user->tokens()->where('last_used_at', '>', now()->subMinutes(30))->count(),
            'current_session_id' => $user->currentAccessToken()->id,
            'last_activity' => $user->currentAccessToken()->last_used_at,
        ];

        return response()->json([
            'stats' => $stats
        ]);
    }
}