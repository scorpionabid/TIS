<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentAccessLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentActivityService extends BaseService
{
    protected DocumentPermissionService $permissionService;

    public function __construct(DocumentPermissionService $permissionService)
    {
        $this->permissionService = $permissionService;
    }

    /**
     * Get document tracking activity with filters
     */
    public function getTrackingActivity(Request $request, $user): array
    {
        $filters = $request->only(['action', 'date_from', 'date_to', 'institution_id', 'user_id', 'document_id']);

        $query = DocumentAccessLog::query()
            ->with([
                'document:id,title,original_filename',
                'user:id,first_name,last_name',
                'institution:id,name',
            ])
            ->orderByDesc('created_at');

        // Apply filters
        $this->applyActivityFilters($query, $filters);

        // Apply role-based access control
        $this->applyActivityAccessControl($query, $user);

        $perPage = $request->get('per_page', 20);
        $activities = $query->paginate($perPage);

        return [
            'activities' => $activities,
            'statistics' => $this->getActivityStatistics($query->clone(), $user),
            'filters_applied' => array_filter($filters),
        ];
    }

    /**
     * Get specific document access history
     */
    public function getDocumentHistory(Document $document, Request $request, $user): array
    {
        // Check access permissions
        if (! $this->permissionService->canUserAccessDocument($user, $document)) {
            throw new \Exception('Bu sənədə giriş icazəniz yoxdur.');
        }

        $query = DocumentAccessLog::where('document_id', $document->id)
            ->with(['user:id,first_name,last_name', 'institution:id,name'])
            ->orderByDesc('created_at');

        $perPage = $request->get('per_page', 20);
        $history = $query->paginate($perPage);

        return [
            'document' => $document,
            'history' => $history,
            'summary' => $this->getDocumentActivitySummary($document),
        ];
    }

    /**
     * Log document activity
     */
    public function logActivity(Document $document, $user, string $action, ?Request $request = null): void
    {
        try {
            $activityData = [
                'document_id' => $document->id,
                'user_id' => $user->id,
                'access_type' => $action,
                'ip_address' => $request ? $request->ip() : null,
                'user_agent' => $request ? $request->userAgent() : null,
                'access_metadata' => $this->prepareActivityMetadata($document, $user, $action, $request),
            ];

            DocumentAccessLog::create($activityData);
        } catch (\Exception $e) {
            // Log error but don't fail the operation
            \Log::warning('Failed to log document activity: ' . $e->getMessage());
        }

        // Update document statistics (with try-catch as well)
        try {
            $this->updateDocumentStatistics($document, $action);
        } catch (\Exception $e) {
            \Log::warning('Failed to update document statistics: ' . $e->getMessage());
        }
    }

    /**
     * Get activity statistics for dashboard
     */
    public function getActivityStatistics($query, $user): array
    {
        $baseQuery = $query instanceof \Illuminate\Database\Query\Builder ? $query : $query->getQuery();

        return [
            'total_activities' => $baseQuery->count(),
            'recent_activities' => $baseQuery->where('created_at', '>=', now()->subHours(24))->count(),
            'by_action' => $this->getActivityByAction($baseQuery),
            'by_date' => $this->getActivityByDate($baseQuery),
            'top_documents' => $this->getTopAccessedDocuments($baseQuery),
            'top_users' => $this->getTopActiveUsers($baseQuery),
        ];
    }

    /**
     * Get document activity summary
     */
    public function getDocumentActivitySummary(Document $document): array
    {
        $stats = DocumentAccessLog::where('document_id', $document->id)
            ->selectRaw('
                access_type,
                COUNT(*) as count,
                COUNT(DISTINCT user_id) as unique_users,
                MAX(created_at) as last_access
            ')
            ->groupBy('access_type')
            ->get()
            ->keyBy('access_type');

        $totalAccess = DocumentAccessLog::where('document_id', $document->id)->count();
        $uniqueUsers = DocumentAccessLog::where('document_id', $document->id)
            ->whereNotNull('user_id')
            ->distinct('user_id')
            ->count('user_id');

        return [
            'total_access' => $totalAccess,
            'unique_users' => $uniqueUsers,
            'actions' => [
                'views' => $stats->get('view')?->count ?? 0,
                'downloads' => $stats->get('download')?->count ?? 0,
                'shares' => $stats->get('share')?->count ?? 0,
            ],
            'last_activity' => DocumentAccessLog::where('document_id', $document->id)
                ->latest('created_at')
                ->value('created_at'),
            'most_active_users' => $this->getMostActiveUsersForDocument($document->id),
        ];
    }

    /**
     * Get activity trends for analytics
     */
    public function getActivityTrends(array $filters, $user): array
    {
        $query = DocumentAccessLog::query();

        // Apply filters
        $this->applyActivityFilters($query, $filters);

        // Apply access control
        $this->applyActivityAccessControl($query, $user);

        $period = $filters['period'] ?? 'week';

        return [
            'daily_trends' => $this->getDailyActivityTrends($query->clone(), $period),
            'action_trends' => $this->getActionTrends($query->clone(), $period),
            'user_engagement' => $this->getUserEngagementTrends($query->clone(), $period),
            'peak_hours' => $this->getPeakActivityHours($query->clone()),
        ];
    }

    /**
     * Get document popularity ranking
     */
    public function getDocumentPopularity(array $filters, $user): array
    {
        $query = DocumentAccessLog::query()
            ->select([
                'document_id',
                DB::raw('COUNT(*) as total_access'),
                DB::raw('COUNT(DISTINCT user_id) as unique_users'),
                DB::raw("COUNT(CASE WHEN access_type = 'download' THEN 1 END) as downloads"),
                DB::raw('MAX(created_at) as last_access'),
            ])
            ->with('document:id,title,original_filename,file_size,created_at')
            ->groupBy('document_id')
            ->orderBy('total_access', 'desc');

        // Apply filters
        $this->applyActivityFilters($query, $filters);

        // Apply access control
        $this->applyActivityAccessControl($query, $user);

        $limit = $filters['limit'] ?? 50;
        $popularDocuments = $query->limit($limit)->get();

        return [
            'popular_documents' => $popularDocuments,
            'statistics' => [
                'total_documents_accessed' => $popularDocuments->count(),
                'total_access_count' => $popularDocuments->sum('total_access'),
                'average_access_per_document' => $popularDocuments->avg('total_access'),
            ],
        ];
    }

    /**
     * Export activity data
     */
    public function exportActivityData(array $filters, $user, string $format = 'csv'): string
    {
        $query = DocumentAccessLog::query()
            ->with([
                'document:id,title,original_filename',
                'user:id,first_name,last_name,email',
                'institution:id,name',
            ])
            ->orderByDesc('created_at');

        // Apply filters
        $this->applyActivityFilters($query, $filters);

        // Apply access control
        $this->applyActivityAccessControl($query, $user);

        $activities = $query->get();

        switch ($format) {
            case 'csv':
                return $this->exportToCsv($activities);
            case 'json':
                return $this->exportToJson($activities);
            default:
                throw new \InvalidArgumentException('Dəstəklənməyən format: ' . $format);
        }
    }

    /**
     * Apply activity filters to query
     */
    private function applyActivityFilters($query, array $filters): void
    {
        if (! empty($filters['action'])) {
            $query->where('access_type', $filters['action']);
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        if (! empty($filters['institution_id'])) {
            $query->whereHas('document', function ($docQuery) use ($filters) {
                $docQuery->where('institution_id', $filters['institution_id']);
            });
        }

        if (! empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        if (! empty($filters['document_id'])) {
            $query->where('document_id', $filters['document_id']);
        }
    }

    /**
     * Apply role-based access control to activity queries
     */
    private function applyActivityAccessControl($query, $user): void
    {
        if ($user->hasRole('superadmin')) {
            return; // SuperAdmin sees all activities
        }

        $userRole = $user->roles->first()?->name;
        $userInstitutionId = $user->institution_id;

        switch ($userRole) {
            case 'regionadmin':
            case 'regionoperator':
                // Regional admins can see activities in their region
                $institutionIds = $this->permissionService->getUserAccessibleInstitutions($user);
                $query->whereHas('document', function ($docQuery) use ($institutionIds) {
                    $docQuery->whereIn('institution_id', $institutionIds);
                });
                break;

            case 'sektoradmin':
                // Sector admins can see activities in their sector
                $institutionIds = $this->permissionService->getUserAccessibleInstitutions($user);
                $query->whereHas('document', function ($docQuery) use ($institutionIds) {
                    $docQuery->whereIn('institution_id', $institutionIds);
                });
                break;

            case 'schooladmin':
            case 'məktəbadmin':
                // School admins can only see activities in their institution
                $query->whereHas('document', function ($docQuery) use ($userInstitutionId) {
                    $docQuery->where('institution_id', $userInstitutionId);
                });
                break;

            default:
                // Regular users can only see their own activities
                $query->where('user_id', $user->id);
                break;
        }
    }

    /**
     * Get activity breakdown by action type
     */
    private function getActivityByAction($query): array
    {
        return $query->clone()
            ->select('access_type', DB::raw('COUNT(*) as count'))
            ->groupBy('access_type')
            ->pluck('count', 'access_type')
            ->toArray();
    }

    /**
     * Get activity breakdown by date
     */
    private function getActivityByDate($query, int $days = 7): array
    {
        $dateExpression = $this->getDateExpression();

        return $query->clone()
            ->select(DB::raw("{$dateExpression} as date"), DB::raw('COUNT(*) as count'))
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy(DB::raw($dateExpression))
            ->orderBy('date')
            ->pluck('count', 'date')
            ->toArray();
    }

    /**
     * Get top accessed documents
     */
    private function getTopAccessedDocuments($query, int $limit = 5): array
    {
        return $query->clone()
            ->select('document_id', DB::raw('COUNT(*) as access_count'))
            ->with('document:id,title')
            ->groupBy('document_id')
            ->orderBy('access_count', 'desc')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    /**
     * Get top active users
     */
    private function getTopActiveUsers($query, int $limit = 5): array
    {
        return $query->clone()
            ->select('user_id', DB::raw('COUNT(*) as activity_count'))
            ->with('user:id,first_name,last_name')
            ->groupBy('user_id')
            ->orderBy('activity_count', 'desc')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    /**
     * Get most active users for specific document
     */
    private function getMostActiveUsersForDocument(int $documentId, int $limit = 5): array
    {
        return DocumentAccessLog::where('document_id', $documentId)
            ->select('user_id', DB::raw('COUNT(*) as access_count'))
            ->with('user:id,first_name,last_name')
            ->groupBy('user_id')
            ->orderBy('access_count', 'desc')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    /**
     * Prepare activity metadata
     */
    private function prepareActivityMetadata(Document $document, $user, string $action, ?Request $request = null): array
    {
        $metadata = [
            'document_title' => $document->title,
            'document_size' => $document->file_size,
            'user_role' => $user->roles->first()?->name,
            'action_timestamp' => now()->toISOString(),
        ];

        if ($request) {
            $metadata['request_method'] = $request->method();
            $metadata['referer'] = $request->header('referer');
        }

        return $metadata;
    }

    /**
     * Update document statistics
     */
    private function updateDocumentStatistics(Document $document, string $action): void
    {
        switch ($action) {
            case 'view':
                $document->increment('view_count');
                break;
            case 'download':
                // Skip download count increment - column doesn't exist in current schema
                break;
            case 'share':
                $document->increment('share_count');
                break;
        }

        $document->update(['last_accessed_at' => now()]);
    }

    /**
     * Get daily activity trends
     */
    private function getDailyActivityTrends($query, string $period): array
    {
        $days = $this->getPeriodDays($period);
        $dateExpression = $this->getDateExpression();

        return $query
            ->select(DB::raw("{$dateExpression} as date"), DB::raw('COUNT(*) as count'))
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy(DB::raw($dateExpression))
            ->orderBy('date')
            ->get()
            ->toArray();
    }

    /**
     * Get action trends
     */
    private function getActionTrends($query, string $period): array
    {
        $days = $this->getPeriodDays($period);
        $dateExpression = $this->getDateExpression();

        return $query
            ->select('access_type', DB::raw("{$dateExpression} as date"), DB::raw('COUNT(*) as count'))
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy('access_type', DB::raw($dateExpression))
            ->orderBy('date')
            ->get()
            ->groupBy('access_type')
            ->toArray();
    }

    /**
     * Get user engagement trends
     */
    private function getUserEngagementTrends($query, string $period): array
    {
        $days = $this->getPeriodDays($period);
        $dateExpression = $this->getDateExpression();

        return $query
            ->select(
                DB::raw("{$dateExpression} as date"),
                DB::raw('COUNT(DISTINCT user_id) as unique_users'),
                DB::raw('COUNT(*) as total_activities')
            )
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy(DB::raw($dateExpression))
            ->orderBy('date')
            ->get()
            ->toArray();
    }

    /**
     * Get peak activity hours
     */
    private function getPeakActivityHours($query): array
    {
        $hourExpression = $this->getHourExpression();

        return $query
            ->select(DB::raw("{$hourExpression} as hour"), DB::raw('COUNT(*) as count'))
            ->groupBy(DB::raw($hourExpression))
            ->orderBy('hour')
            ->get()
            ->toArray();
    }

    /**
     * Get period days for trends
     */
    private function getPeriodDays(string $period): int
    {
        switch ($period) {
            case 'week':
                return 7;
            case 'month':
                return 30;
            case 'quarter':
                return 90;
            case 'year':
                return 365;
            default:
                return 7;
        }
    }

    /**
     * Normalized date expression for grouping.
     */
    private function getDateExpression(string $column = 'created_at'): string
    {
        return match ($this->getDatabaseDriver()) {
            'pgsql' => "DATE_TRUNC('day', {$column})::date",
            'sqlite' => "DATE({$column})",
            default => "DATE({$column})",
        };
    }

    /**
     * Normalized hour expression for grouping.
     */
    private function getHourExpression(string $column = 'created_at'): string
    {
        return match ($this->getDatabaseDriver()) {
            'pgsql' => "DATE_PART('hour', {$column})",
            'sqlite' => "CAST(STRFTIME('%H', {$column}) AS INTEGER)",
            default => "HOUR({$column})",
        };
    }

    private function getDatabaseDriver(): string
    {
        static $driver;

        if (! $driver) {
            $driver = DB::connection()->getDriverName();
        }

        return $driver;
    }

    /**
     * Export activities to CSV
     */
    private function exportToCsv($activities): string
    {
        $csv = "Date,Time,Action,Document,User,Institution,IP Address\n";

        foreach ($activities as $activity) {
            $csv .= implode(',', [
                $activity->created_at->format('Y-m-d'),
                $activity->created_at->format('H:i:s'),
                $activity->access_type,
                '"' . ($activity->document->title ?? '') . '"',
                '"' . ($activity->user->first_name ?? '') . ' ' . ($activity->user->last_name ?? '') . '"',
                '"' . ($activity->institution->name ?? '') . '"',
                $activity->ip_address ?? '',
            ]) . "\n";
        }

        return $csv;
    }

    /**
     * Export activities to JSON
     */
    private function exportToJson($activities): string
    {
        $exportData = $activities->map(function ($activity) {
            return [
                'date' => $activity->created_at->format('Y-m-d'),
                'time' => $activity->created_at->format('H:i:s'),
                'action' => $activity->access_type,
                'document' => $activity->document->title ?? '',
                'user' => ($activity->user->first_name ?? '') . ' ' . ($activity->user->last_name ?? ''),
                'institution' => $activity->institution->name ?? '',
                'ip_address' => $activity->ip_address ?? '',
            ];
        });

        return json_encode([
            'exported_at' => now()->toISOString(),
            'total_records' => $exportData->count(),
            'data' => $exportData,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
}
