<?php

namespace App\Services\LinkSharing\Domains\Statistics;

use App\Models\LinkShare;
use App\Models\LinkAccessLog;
use App\Services\LinkSharing\Domains\Permission\LinkPermissionService;
use Exception;

/**
 * Link Statistics Service
 *
 * Provides statistical analysis and metrics for link sharing.
 */
class LinkStatisticsService
{
    public function __construct(
        protected LinkPermissionService $permissionService
    ) {}

    /**
     * Get link statistics
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 224-269)
     */
    public function getLinkStatistics($linkShare, $user)
    {
        if (!$this->permissionService->canViewLinkStats($user, $linkShare)) {
            throw new Exception('Bu link statistikalarını görmək icazəniz yoxdur', 403);
        }

        $stats = [
            'total_access' => $linkShare->access_count,
            'unique_users' => LinkAccessLog::where('link_share_id', $linkShare->id)
                ->distinct('user_id')
                ->count('user_id'),
            'access_today' => LinkAccessLog::where('link_share_id', $linkShare->id)
                ->whereDate('accessed_at', today())
                ->count(),
            'access_this_week' => LinkAccessLog::where('link_share_id', $linkShare->id)
                ->whereBetween('accessed_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->count(),
            'access_this_month' => LinkAccessLog::where('link_share_id', $linkShare->id)
                ->whereMonth('accessed_at', now()->month)
                ->count()
        ];

        // Get access by day for the last 30 days
        $dailyAccess = LinkAccessLog::where('link_share_id', $linkShare->id)
            ->where('accessed_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(accessed_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('count', 'date')
            ->toArray();

        // Get access by role
        $accessByRole = LinkAccessLog::where('link_share_id', $linkShare->id)
            ->join('users', 'link_access_logs.user_id', '=', 'users.id')
            ->join('roles', 'users.role_id', '=', 'roles.id')
            ->selectRaw('roles.name as role, COUNT(*) as count')
            ->groupBy('roles.name')
            ->pluck('count', 'role')
            ->toArray();

        return [
            'overview' => $stats,
            'daily_access' => $dailyAccess,
            'access_by_role' => $accessByRole
        ];
    }
}
