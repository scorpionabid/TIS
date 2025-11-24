<?php

namespace App\Http\Controllers\RegionOperator;

use App\Http\Controllers\Controller;
use App\Services\RegionOperator\RegionOperatorDashboardService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class RegionOperatorDashboardController extends Controller
{
    public function __construct(
        private readonly RegionOperatorDashboardService $dashboardService
    ) {}

    /**
     * Primary dashboard endpoint (overview + team).
     */
    public function getDashboard(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('regionoperator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $overview = $this->dashboardService->getOverview($user);
            $team = $this->dashboardService->getTeamOverview($user);

            return response()->json([
                'overview' => $overview,
                'team' => $team,
            ]);
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            Log::error('RegionOperator dashboard overview failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Dashboard məlumatları yüklənə bilmədi',
            ], 500);
        }
    }

    /**
     * Dashboard statistic widgets.
     * (Legacy alias maintained for backward compatibility)
     */
    public function getStats(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('regionoperator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $stats = $this->dashboardService->getStats($user);

            return response()->json($stats);
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            Log::error('RegionOperator getStats failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Statistika məlumatları yüklənə bilmədi',
            ], 500);
        }
    }

    /**
     * Backwards compatible alias for older clients.
     */
    public function getDashboardStats(Request $request): JsonResponse
    {
        return $this->getStats($request);
    }

    /**
     * Pending task list for RegionOperator.
     */
    public function getPendingTasks(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('regionoperator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $limit = (int) $request->input('limit', 10);
        $limit = max(1, min($limit, 50));

        try {
            $tasks = $this->dashboardService->getPendingTasks($user, $limit);

            return response()->json($tasks);
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            Log::error('RegionOperator getPendingTasks failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Tapşırıq siyahısı yüklənə bilmədi',
            ], 500);
        }
    }

    /**
     * Legacy alias for older UI that fetched "user tasks".
     */
    public function getUserTasks(Request $request): JsonResponse
    {
        return $this->getPendingTasks($request);
    }

    /**
     * Activity report – daily aggregates (tasks, documents, surveys).
     */
    public function getDailyReports(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('regionoperator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $days = (int) $request->input('days', 7);

        try {
            $report = $this->dashboardService->getDailyReport($user, $days);

            return response()->json($report);
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            Log::error('RegionOperator getDailyReports failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Günlük hesabatlar yüklənə bilmədi',
            ], 500);
        }
    }

    /**
     * Team overview (existing endpoint reused).
     */
    public function getDepartmentTeam(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('regionoperator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $team = $this->dashboardService->getTeamOverview($user);

            return response()->json([
                'team_members' => $team['members'],
                'total_members' => $team['total'],
                'active_members' => $team['active'],
                'department' => [
                    'name' => $team['department']['name'],
                    'type' => $team['department']['type'],
                    'type_label' => $team['department']['type_label'],
                ],
            ]);
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            Log::error('RegionOperator getDepartmentTeam failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Komanda məlumatları yüklənə bilmədi',
            ], 500);
        }
    }
}
