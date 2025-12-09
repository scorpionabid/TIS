<?php

namespace App\Services\LinkSharing\Domains\Statistics;

use App\Models\LinkAccessLog;
use App\Services\LinkSharing\Domains\Permission\LinkPermissionService;
use Exception;
use Illuminate\Support\Facades\DB;

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
        if (! $this->permissionService->canViewLinkStats($user, $linkShare)) {
            throw new Exception('Bu link statistikalarını görmək icazəniz yoxdur', 403);
        }

        $timestampColumn = $this->getAccessTimestampColumn();

        $stats = [
            'total_access' => $linkShare->access_count,
            'unique_users' => LinkAccessLog::where('link_share_id', $linkShare->id)
                ->distinct('user_id')
                ->count('user_id'),
            'access_today' => LinkAccessLog::where('link_share_id', $linkShare->id)
                ->whereDate($timestampColumn, today())
                ->count(),
            'access_this_week' => LinkAccessLog::where('link_share_id', $linkShare->id)
                ->whereBetween($timestampColumn, [now()->startOfWeek(), now()->endOfWeek()])
                ->count(),
            'access_this_month' => LinkAccessLog::where('link_share_id', $linkShare->id)
                ->whereMonth($timestampColumn, now()->month)
                ->count(),
        ];

        // Get access by day for the last 30 days
        $dateExpression = $this->getDateExpression($timestampColumn);

        $dailyAccess = LinkAccessLog::where('link_share_id', $linkShare->id)
            ->where($timestampColumn, '>=', now()->subDays(30))
            ->selectRaw("{$dateExpression} as date, COUNT(*) as count")
            ->groupBy(DB::raw($dateExpression))
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
            'access_by_role' => $accessByRole,
        ];
    }

    private function getDateExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "DATE({$column})",
            'pgsql' => "DATE_TRUNC('day', {$column})::date",
            default => "DATE({$column})",
        };
    }

    private function getAccessTimestampColumn(): string
    {
        static $columnName;

        if ($columnName) {
            return $columnName;
        }

        $model = new LinkAccessLog;
        $connectionName = $model->getConnectionName() ?: config('database.default');
        $schemaBuilder = DB::connection($connectionName)->getSchemaBuilder();

        $columnName = $schemaBuilder->hasColumn($model->getTable(), 'accessed_at')
            ? 'accessed_at'
            : 'created_at';

        return $columnName;
    }
}
