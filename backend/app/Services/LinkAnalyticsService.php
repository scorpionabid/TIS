<?php

namespace App\Services;

use App\Models\LinkShare;
use App\Models\LinkShareAccess;
use App\Services\BaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LinkAnalyticsService extends BaseService
{
    /**
     * Get comprehensive link sharing analytics
     */
    public function getLinkAnalytics(Request $request, $user): array
    {
        $dateFrom = $request->get('date_from', Carbon::now()->subMonth()->format('Y-m-d'));
        $dateTo = $request->get('date_to', Carbon::now()->format('Y-m-d'));

        $baseQuery = LinkShare::whereBetween('created_at', [$dateFrom, $dateTo]);
        
        // Apply user-based access control
        $this->applyUserAccessControl($baseQuery, $user);

        return [
            'overview' => $this->getOverviewStats($baseQuery),
            'access_analytics' => $this->getAccessAnalytics($baseQuery),
            'popularity_metrics' => $this->getPopularityMetrics($baseQuery),
            'security_metrics' => $this->getSecurityMetrics($baseQuery),
            'performance_trends' => $this->getPerformanceTrends($dateFrom, $dateTo, $user),
            'user_behavior' => $this->getUserBehaviorAnalytics($baseQuery),
            'document_insights' => $this->getDocumentInsights($baseQuery),
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo
            ]
        ];
    }

    /**
     * Get link access statistics
     */
    public function getLinkAccessStats(Request $request, $user): array
    {
        $linkId = $request->get('link_id');
        $dateFrom = $request->get('date_from', Carbon::now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->get('date_to', Carbon::now()->format('Y-m-d'));

        $query = LinkShareAccess::whereBetween('accessed_at', [$dateFrom, $dateTo]);

        if ($linkId) {
            $query->where('link_share_id', $linkId);
        } else {
            // Filter by user's accessible links
            $accessibleLinkIds = $this->getAccessibleLinkIds($user);
            $query->whereIn('link_share_id', $accessibleLinkIds);
        }

        return [
            'total_accesses' => $query->count(),
            'unique_visitors' => $query->distinct('ip_address')->count(),
            'access_by_date' => $this->getAccessByDate($query),
            'access_by_hour' => $this->getAccessByHour($query),
            'geographic_data' => $this->getGeographicData($query),
            'device_analytics' => $this->getDeviceAnalytics($query),
            'referrer_analytics' => $this->getReferrerAnalytics($query)
        ];
    }

    /**
     * Get top performing links
     */
    public function getTopLinks(Request $request, $user): array
    {
        $limit = $request->get('limit', 10);
        $orderBy = $request->get('order_by', 'access_count');
        $period = $request->get('period', '30'); // days

        $query = LinkShare::with(['document', 'creator', 'institution'])
            ->where('created_at', '>=', Carbon::now()->subDays($period));

        $this->applyUserAccessControl($query, $user);

        // Add access count
        $query->withCount(['accesses as access_count' => function ($q) use ($period) {
            $q->where('accessed_at', '>=', Carbon::now()->subDays($period));
        }]);

        // Add unique visitors count
        $query->withCount(['accesses as unique_visitors' => function ($q) use ($period) {
            $q->where('accessed_at', '>=', Carbon::now()->subDays($period))
              ->distinct('ip_address');
        }]);

        switch ($orderBy) {
            case 'unique_visitors':
                $query->orderByDesc('unique_visitors');
                break;
            case 'created_at':
                $query->orderByDesc('created_at');
                break;
            default:
                $query->orderByDesc('access_count');
        }

        $links = $query->limit($limit)->get();

        return [
            'top_links' => $links->map(function ($link) {
                return [
                    'id' => $link->id,
                    'document_name' => $link->document->name ?? 'N/A',
                    'creator_name' => $link->creator->name ?? 'N/A',
                    'institution_name' => $link->institution->name ?? 'N/A',
                    'access_count' => $link->access_count ?? 0,
                    'unique_visitors' => $link->unique_visitors ?? 0,
                    'is_password_protected' => !empty($link->password),
                    'expires_at' => $link->expires_at,
                    'created_at' => $link->created_at,
                    'status' => $this->getLinkStatus($link)
                ];
            }),
            'period_days' => $period,
            'total_found' => $links->count()
        ];
    }

    /**
     * Get link sharing trends
     */
    public function getSharingTrends(Request $request, $user): array
    {
        $period = $request->get('period', 30);
        $groupBy = $request->get('group_by', 'day'); // day, week, month

        $query = LinkShare::where('created_at', '>=', Carbon::now()->subDays($period));
        $this->applyUserAccessControl($query, $user);

        $dateFormat = match($groupBy) {
            'week' => '%Y-%u',
            'month' => '%Y-%m',
            default => '%Y-%m-%d'
        };

        $trends = $query->selectRaw("
            DATE_FORMAT(created_at, '{$dateFormat}') as period,
            COUNT(*) as links_created,
            COUNT(CASE WHEN password IS NOT NULL THEN 1 END) as password_protected,
            COUNT(CASE WHEN expires_at IS NOT NULL THEN 1 END) as with_expiration
        ")
        ->groupBy('period')
        ->orderBy('period')
        ->get();

        // Get access trends for the same period
        $accessQuery = LinkShareAccess::where('accessed_at', '>=', Carbon::now()->subDays($period));
        
        // Filter by accessible links
        $accessibleLinkIds = $this->getAccessibleLinkIds($user);
        $accessQuery->whereIn('link_share_id', $accessibleLinkIds);

        $accessTrends = $accessQuery->selectRaw("
            DATE_FORMAT(accessed_at, '{$dateFormat}') as period,
            COUNT(*) as total_accesses,
            COUNT(DISTINCT ip_address) as unique_visitors
        ")
        ->groupBy('period')
        ->orderBy('period')
        ->get();

        return [
            'sharing_trends' => $trends,
            'access_trends' => $accessTrends,
            'period_days' => $period,
            'group_by' => $groupBy
        ];
    }

    /**
     * Get security analytics
     */
    public function getSecurityAnalytics(Request $request, $user): array
    {
        $period = $request->get('period', 30);
        
        $query = LinkShare::where('created_at', '>=', Carbon::now()->subDays($period));
        $this->applyUserAccessControl($query, $user);

        $total = $query->count();
        $passwordProtected = $query->whereNotNull('password')->count();
        $withExpiration = $query->whereNotNull('expires_at')->count();
        $expired = $query->where('expires_at', '<', now())->count();

        // Get failed access attempts
        $accessibleLinkIds = $this->getAccessibleLinkIds($user);
        $failedAttempts = LinkShareAccess::whereIn('link_share_id', $accessibleLinkIds)
            ->where('accessed_at', '>=', Carbon::now()->subDays($period))
            ->where('was_successful', false)
            ->count();

        $totalAttempts = LinkShareAccess::whereIn('link_share_id', $accessibleLinkIds)
            ->where('accessed_at', '>=', Carbon::now()->subDays($period))
            ->count();

        return [
            'overview' => [
                'total_links' => $total,
                'password_protected' => $passwordProtected,
                'password_protection_rate' => $total > 0 ? round(($passwordProtected / $total) * 100, 2) : 0,
                'with_expiration' => $withExpiration,
                'expiration_usage_rate' => $total > 0 ? round(($withExpiration / $total) * 100, 2) : 0,
                'expired_links' => $expired
            ],
            'access_security' => [
                'total_access_attempts' => $totalAttempts,
                'failed_attempts' => $failedAttempts,
                'success_rate' => $totalAttempts > 0 ? round((($totalAttempts - $failedAttempts) / $totalAttempts) * 100, 2) : 0
            ],
            'recommendations' => $this->getSecurityRecommendations($passwordProtected, $withExpiration, $total)
        ];
    }

    /**
     * Get overview statistics
     */
    private function getOverviewStats($baseQuery): array
    {
        $total = $baseQuery->count();
        $active = $baseQuery->where(function ($q) {
            $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
        })->count();
        
        $expired = $baseQuery->where('expires_at', '<', now())->count();
        $passwordProtected = $baseQuery->whereNotNull('password')->count();

        return [
            'total_links' => $total,
            'active_links' => $active,
            'expired_links' => $expired,
            'password_protected' => $passwordProtected,
            'protection_rate' => $total > 0 ? round(($passwordProtected / $total) * 100, 2) : 0
        ];
    }

    /**
     * Get access analytics
     */
    private function getAccessAnalytics($baseQuery): array
    {
        $linkIds = $baseQuery->pluck('id');
        
        $totalAccesses = LinkShareAccess::whereIn('link_share_id', $linkIds)->count();
        $uniqueVisitors = LinkShareAccess::whereIn('link_share_id', $linkIds)
            ->distinct('ip_address')->count();
        
        return [
            'total_accesses' => $totalAccesses,
            'unique_visitors' => $uniqueVisitors,
            'average_accesses_per_link' => $linkIds->count() > 0 ? round($totalAccesses / $linkIds->count(), 2) : 0
        ];
    }

    /**
     * Get popularity metrics
     */
    private function getPopularityMetrics($baseQuery): array
    {
        return $baseQuery->withCount('accesses')
            ->orderByDesc('accesses_count')
            ->limit(5)
            ->get(['id', 'document_id', 'accesses_count'])
            ->map(function ($link) {
                return [
                    'link_id' => $link->id,
                    'access_count' => $link->accesses_count
                ];
            })->toArray();
    }

    /**
     * Get security metrics
     */
    private function getSecurityMetrics($baseQuery): array
    {
        $linkIds = $baseQuery->pluck('id');
        
        $failedAttempts = LinkShareAccess::whereIn('link_share_id', $linkIds)
            ->where('was_successful', false)
            ->count();

        return [
            'failed_access_attempts' => $failedAttempts,
            'suspicious_activity_detected' => $failedAttempts > 10
        ];
    }

    /**
     * Get performance trends
     */
    private function getPerformanceTrends($dateFrom, $dateTo, $user): array
    {
        $query = LinkShare::whereBetween('created_at', [$dateFrom, $dateTo]);
        $this->applyUserAccessControl($query, $user);

        return $query->selectRaw('
            DATE(created_at) as date,
            COUNT(*) as links_created
        ')
        ->groupBy('date')
        ->orderBy('date')
        ->get()
        ->toArray();
    }

    /**
     * Get user behavior analytics
     */
    private function getUserBehaviorAnalytics($baseQuery): array
    {
        $linkIds = $baseQuery->pluck('id');
        
        return [
            'peak_hours' => LinkShareAccess::whereIn('link_share_id', $linkIds)
                ->selectRaw('HOUR(accessed_at) as hour, COUNT(*) as access_count')
                ->groupBy('hour')
                ->orderByDesc('access_count')
                ->limit(3)
                ->pluck('access_count', 'hour')
                ->toArray()
        ];
    }

    /**
     * Get document insights
     */
    private function getDocumentInsights($baseQuery): array
    {
        return $baseQuery->join('documents', 'link_shares.document_id', '=', 'documents.id')
            ->selectRaw('
                documents.file_type,
                COUNT(*) as share_count
            ')
            ->groupBy('documents.file_type')
            ->orderByDesc('share_count')
            ->limit(5)
            ->pluck('share_count', 'file_type')
            ->toArray();
    }

    /**
     * Apply user-based access control
     */
    private function applyUserAccessControl($query, $user): void
    {
        if ($user->hasRole('superadmin')) {
            return; // SuperAdmin can see all
        }

        $userInstitution = $user->institution;
        
        if ($user->hasRole('regionadmin') && $userInstitution && $userInstitution->level == 2) {
            $childIds = $userInstitution->getAllChildrenIds();
            $query->whereIn('institution_id', $childIds);
        } elseif ($user->hasRole('sektoradmin') && $userInstitution && $userInstitution->level == 3) {
            $childIds = $userInstitution->getAllChildrenIds();
            $query->whereIn('institution_id', $childIds);
        } elseif ($user->hasRole('schooladmin')) {
            $query->where('institution_id', $userInstitution->id ?? 0);
        } else {
            $query->where('created_by', $user->id);
        }
    }

    /**
     * Get accessible link IDs for user
     */
    private function getAccessibleLinkIds($user): array
    {
        $query = LinkShare::query();
        $this->applyUserAccessControl($query, $user);
        return $query->pluck('id')->toArray();
    }

    /**
     * Get link status
     */
    private function getLinkStatus($link): string
    {
        if ($link->expires_at && $link->expires_at < now()) {
            return 'expired';
        }
        
        return 'active';
    }

    /**
     * Get access by date
     */
    private function getAccessByDate($query): array
    {
        return $query->selectRaw('DATE(accessed_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('count', 'date')
            ->toArray();
    }

    /**
     * Get access by hour
     */
    private function getAccessByHour($query): array
    {
        return $query->selectRaw('HOUR(accessed_at) as hour, COUNT(*) as count')
            ->groupBy('hour')
            ->orderBy('hour')
            ->pluck('count', 'hour')
            ->toArray();
    }

    /**
     * Get geographic data
     */
    private function getGeographicData($query): array
    {
        return $query->whereNotNull('country')
            ->selectRaw('country, COUNT(*) as count')
            ->groupBy('country')
            ->orderByDesc('count')
            ->limit(10)
            ->pluck('count', 'country')
            ->toArray();
    }

    /**
     * Get device analytics
     */
    private function getDeviceAnalytics($query): array
    {
        return $query->whereNotNull('user_agent')
            ->selectRaw('
                CASE 
                    WHEN user_agent LIKE "%Mobile%" THEN "Mobile"
                    WHEN user_agent LIKE "%Tablet%" THEN "Tablet"
                    ELSE "Desktop"
                END as device_type,
                COUNT(*) as count
            ')
            ->groupBy('device_type')
            ->pluck('count', 'device_type')
            ->toArray();
    }

    /**
     * Get referrer analytics
     */
    private function getReferrerAnalytics($query): array
    {
        return $query->whereNotNull('referrer')
            ->selectRaw('referrer, COUNT(*) as count')
            ->groupBy('referrer')
            ->orderByDesc('count')
            ->limit(10)
            ->pluck('count', 'referrer')
            ->toArray();
    }

    /**
     * Get security recommendations
     */
    private function getSecurityRecommendations($passwordProtected, $withExpiration, $total): array
    {
        $recommendations = [];

        if ($total > 0) {
            $protectionRate = ($passwordProtected / $total) * 100;
            $expirationRate = ($withExpiration / $total) * 100;

            if ($protectionRate < 50) {
                $recommendations[] = 'Consider using password protection for more sensitive documents';
            }

            if ($expirationRate < 30) {
                $recommendations[] = 'Set expiration dates for temporary document access';
            }

            if ($protectionRate < 25) {
                $recommendations[] = 'Review security policies for document sharing';
            }
        }

        return $recommendations;
    }
}