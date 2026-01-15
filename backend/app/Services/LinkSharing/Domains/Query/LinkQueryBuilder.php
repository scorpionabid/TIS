<?php

namespace App\Services\LinkSharing\Domains\Query;

use App\Models\Institution;
use App\Models\LinkShare;
use App\Services\LinkSharing\Domains\Permission\LinkPermissionService;
use Illuminate\Database\Query\Grammars\Grammar;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Link Query Builder
 *
 * Handles all query construction, filtering, searching, and pagination
 * for link sharing with hierarchical access control.
 */
class LinkQueryBuilder
{
    protected ?string $databaseDriver = null;

    protected ?Grammar $queryGrammar = null;

    protected array $linkShareColumnCache = [];

    public function __construct(
        protected LinkPermissionService $permissionService
    ) {}

    /**
     * Get accessible links with filtering and pagination
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 30-65)
     */
    public function getAccessibleLinks(Request $request, $user): LengthAwarePaginator
    {
        $query = LinkShare::with(['sharedBy', 'institution']);

        // Apply active() scope only when no explicit status filter is provided
        // This allows fetching disabled/expired links when statuses[] is passed
        if (!$request->filled('statuses') && !$request->filled('status')) {
            $query->active();
        }

        // Apply regional hierarchy filtering
        $shouldApplyRegionalFilter = ! ($request->input('scope') === 'global' && $this->permissionService->canViewAllLinks($user));

        if ($shouldApplyRegionalFilter) {
            $this->applyRegionalFilter($query, $user);
        }

        // Apply filters
        $query = $this->applyRequestFilters($query, $request);

        // Apply search
        if ($request->filled('search')) {
            $searchColumns = ['title', 'description'];
            if ($this->linkShareColumnExists('tags')) {
                $searchColumns[] = 'tags';
            }

            $this->applyCaseInsensitiveSearch($query, $searchColumns, $request->search);
        }

        // Apply sorting
        $sortField = $request->get('sort_by', $request->get('sort', 'created_at'));
        $direction = $request->get('sort_direction', $request->get('direction', 'desc'));

        if ($sortField === 'popularity') {
            $query->orderBy('access_count', $direction);
        } elseif ($sortField === 'priority') {
            $this->orderByPriority($query, $direction);
        } else {
            $query->orderBy($sortField, $direction);
        }

        // Paginate results
        $perPage = $request->get('per_page', 15);

        return $query->paginate($perPage);
    }

    /**
     * Apply filters to query
     *
     * ENHANCED: Added creator filter, status filter, and improved existing filters
     */
    public function applyRequestFilters($query, Request $request)
    {
        // Link type filter (external, video, form, document)
        if ($request->filled('link_type')) {
            $query->where('link_type', $request->link_type);
        }

        // Share scope filter (public, regional, sectoral, institutional, specific_users)
        if ($request->filled('share_scope')) {
            $query->byScope($request->share_scope);
        }

        // Featured filter
        if ($request->filled('is_featured')) {
            $query->where('is_featured', $request->boolean('is_featured'));
        }

        // Priority filter (if exists)
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        // Creator filter (shared_by user ID)
        if ($request->filled('shared_by') || $request->filled('creator_id')) {
            $creatorId = $request->filled('shared_by') ? $request->shared_by : $request->creator_id;
            $query->where('shared_by', $creatorId);
        }

        // "My Links" filter - show only current user's created links
        if ($request->boolean('my_links')) {
            $query->where('shared_by', auth()->id());
        }

        // Institution filter (supports single or multiple selections)
        $institutionFilterIds = [];

        if ($request->has('institution_ids')) {
            $selectedInstitutionIds = (array) $request->input('institution_ids', []);
            foreach ($selectedInstitutionIds as $institutionId) {
                $id = (int) $institutionId;
                if ($id > 0) {
                    $institutionFilterIds = array_merge(
                        $institutionFilterIds,
                        $this->resolveInstitutionHierarchyIds($id)
                    );
                }
            }
        } elseif ($request->filled('institution_id')) {
            $institutionFilterIds = $this->resolveInstitutionHierarchyIds((int) $request->institution_id);
        }

        if ($request->filled('target_institution_id')) {
            $targetHierarchy = $this->resolveInstitutionHierarchyIds((int) $request->target_institution_id);
            $institutionFilterIds = array_merge($institutionFilterIds, $targetHierarchy);
        }

        if (! empty($institutionFilterIds)) {
            $institutionFilterIds = array_values(array_unique(array_filter(
                array_map('intval', $institutionFilterIds),
                static function ($value) {
                    return $value > 0;
                }
            )));

            $query->where(function ($q) use ($institutionFilterIds) {
                $q->whereIn('institution_id', $institutionFilterIds)
                    ->orWhere(function ($targetQuery) use ($institutionFilterIds) {
                        foreach ($institutionFilterIds as $index => $institutionId) {
                            if ($index === 0) {
                                $targetQuery->whereJsonContains('target_institutions', (int) $institutionId)
                                    ->orWhereJsonContains('target_institutions', (string) $institutionId);
                            } else {
                                $targetQuery->orWhereJsonContains('target_institutions', (int) $institutionId)
                                    ->orWhereJsonContains('target_institutions', (string) $institutionId);
                            }
                        }
                    });
            });
        }

        if ($request->filled('requires_login')) {
            $query->where('requires_login', $request->boolean('requires_login'));
        }

        if ($request->filled('target_user_id')) {
            $targetUserId = (int) $request->target_user_id;
            $query->where(function ($targetUserQuery) use ($targetUserId) {
                $targetUserQuery->whereJsonContains('target_users', $targetUserId)
                    ->orWhereJsonContains('target_users', (string) $targetUserId);
            });
        }

        // Status filter (active, expired, disabled)
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Multiple statuses filter (e.g., statuses[]=active&statuses[]=disabled)
        if ($request->filled('statuses')) {
            $statuses = (array) $request->input('statuses', []);
            $validStatuses = array_filter($statuses, static fn($s) => in_array($s, ['active', 'expired', 'disabled'], true));
            if (!empty($validStatuses)) {
                $query->whereIn('status', $validStatuses);
            }
        }

        // Date range filters
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Tags filter (if exists)
        if ($request->filled('tags') && $this->linkShareColumnExists('tags')) {
            $tags = is_array($request->tags) ? $request->tags : explode(',', $request->tags);
            foreach ($tags as $tag) {
                $this->applyCaseInsensitiveLike($query, 'tags', $tag);
            }
        }

        return $query;
    }

    /**
     * Resolve institution filter to include descendants for sectors/regions
     */
    protected function resolveInstitutionHierarchyIds(int $institutionId): array
    {
        static $cache = [];

        if (isset($cache[$institutionId])) {
            return $cache[$institutionId];
        }

        $institution = Institution::withTrashed()->find($institutionId);
        if (! $institution) {
            return $cache[$institutionId] = [$institutionId];
        }

        $ids = $institution->getAllChildrenIds();
        if (empty($ids)) {
            $ids = [$institutionId];
        }

        // Ensure numeric + unique values
        $ids = array_values(array_unique(array_map('intval', $ids)));
        if (! in_array($institutionId, $ids, true)) {
            array_unshift($ids, $institutionId);
        }

        return $cache[$institutionId] = $ids;
    }

    /**
     * Get links grouped by specified field
     * NEW METHOD for Phase 2 filtering
     */
    public function getGroupedLinks(Request $request, $user, string $groupBy = 'link_type')
    {
        $query = LinkShare::with(['sharedBy', 'institution'])->active();

        // Apply regional hierarchy filtering
        $this->applyRegionalFilter($query, $user);

        // Apply filters
        $query = $this->applyRequestFilters($query, $request);

        // Apply search
        if ($request->filled('search')) {
            $searchColumns = ['title', 'description'];
            if ($this->linkShareColumnExists('tags')) {
                $searchColumns[] = 'tags';
            }

            $this->applyCaseInsensitiveSearch($query, $searchColumns, $request->search);
        }

        // Get all results
        $links = $query->get();

        // Group by specified field
        $grouped = $links->groupBy(function ($link) use ($groupBy) {
            switch ($groupBy) {
                case 'link_type':
                    return $link->link_type;
                case 'share_scope':
                    return $link->share_scope;
                case 'institution':
                    return $link->institution ? $link->institution->name : 'No Institution';
                case 'creator':
                    return $link->sharedBy ? $link->sharedBy->full_name : 'Unknown';
                case 'status':
                    return $link->status;
                case 'date':
                    // Group by date periods
                    $createdAt = $link->created_at;
                    if ($createdAt->isToday()) {
                        return 'Today';
                    } elseif ($createdAt->isYesterday()) {
                        return 'Yesterday';
                    } elseif ($createdAt->isCurrentWeek()) {
                        return 'This Week';
                    } elseif ($createdAt->isCurrentMonth()) {
                        return 'This Month';
                    }

                    return 'Older';

                default:
                    return 'Other';
            }
        });

        // Convert to array with counts
        $result = [];
        foreach ($grouped as $groupName => $groupLinks) {
            $result[] = [
                'group' => $groupName,
                'count' => $groupLinks->count(),
                'links' => $groupLinks->values(),
            ];
        }

        return $result;
    }

    /**
     * Apply regional hierarchy filtering
     *
     * CRITICAL LOGIC PRESERVED FROM ORIGINAL (lines 397-440, 44 lines)
     *
     * This method implements hierarchical data isolation across 4 role types:
     * - superadmin: See all links
     * - regionadmin: See links from their region hierarchy
     * - sektoradmin: See links from their sector hierarchy
     * - schooladmin/teachers/students: See their own + public links
     */
    public function applyRegionalFilter($query, $user): void
    {
        if ($user->hasRole('superadmin')) {
            return; // SuperAdmin can see all
        }

        $userInstitution = $user->institution;
        if (! $userInstitution) {
            $query->where('shared_by', $user->id); // Only own links if no institution

            return;
        }

        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            // Regional admin can see links from their region, including their own institution's
            $childIds = $userInstitution->getAllChildrenIds() ?? [];
            $scopeIds = array_values(array_unique(array_merge([$userInstitution->id], $childIds)));

            $query->where(function ($q) use ($scopeIds, $user) {
                $q->whereIn('institution_id', $scopeIds)
                    ->orWhereIn('share_scope', ['public', 'regional', 'national'])
                    ->orWhere('shared_by', $user->id)
                    ->orWhere(function ($subQ) use ($scopeIds) {
                        foreach ($scopeIds as $instId) {
                            $subQ->orWhereJsonContains('target_institutions', (int) $instId)
                                ->orWhereJsonContains('target_institutions', (string) $instId);
                        }
                    });
            });
        } elseif ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            // Sector admin can only see links explicitly targeted to their sector hierarchy
            $childIds = $userInstitution->getAllChildrenIds() ?? [];
            $scopeIds = array_values(array_unique(array_merge([$userInstitution->id], $childIds)));

            $query->where(function ($q) use ($scopeIds) {
                $q->whereIn('institution_id', $scopeIds)
                    ->orWhere(function ($subQ) use ($scopeIds) {
                        foreach ($scopeIds as $instId) {
                            $subQ->orWhereJsonContains('target_institutions', (int) $instId)
                                ->orWhereJsonContains('target_institutions', (string) $instId);
                        }
                    });
            });
        } elseif ($user->hasRole(['schooladmin', 'müəllim', 'şagird'])) {
            // School users can see their own links and public ones
            $query->where(function ($q) use ($userInstitution, $user) {
                $q->where('institution_id', $userInstitution->id)
                    ->orWhere('share_scope', 'public')
                    ->orWhere('share_scope', 'national')
                    ->orWhere('shared_by', $user->id)
                    ->orWhereJsonContains('target_institutions', (string) $userInstitution->id)
                    ->orWhereJsonContains('target_users', $user->id); // NEW: User-based targeting
            });
        }

        // ENHANCEMENT: Add user-based targeting check for ALL roles (not just school users)
        // This ensures that if a link is specifically targeted to a user, they can see it
        $query->orWhere(function ($userTargetQuery) use ($user) {
            $userTargetQuery->where('share_scope', 'specific_users')
                ->whereJsonContains('target_users', $user->id);
        });
    }

    /**
     * Get popular links
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 657-665)
     */
    public function getPopularLinks(Request $request, $user)
    {
        $query = LinkShare::query()->active();
        $this->applyRegionalFilter($query, $user);

        return $query->orderBy('click_count', 'desc')
            ->limit($request->input('limit', 5))
            ->get();
    }

    /**
     * Get featured links
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 670-678)
     */
    public function getFeaturedLinks(Request $request, $user)
    {
        $query = LinkShare::query()->active()->where('is_featured', true);
        $this->applyRegionalFilter($query, $user);

        return $query->orderBy('created_at', 'desc')
            ->limit($request->input('limit', 5))
            ->get();
    }

    /**
     * Get global link statistics
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 683-706)
     */
    public function getGlobalLinkStats(Request $request, $user)
    {
        // Base query respecting user's visibility scope AND only active links
        $query = LinkShare::where('status', 'active');
        $this->applyRegionalFilter($query, $user);

        // Total links
        $totalLinks = (clone $query)->count();

        // Featured links
        $featuredLinks = (clone $query)->where('is_featured', true)->count();

        // Links by type
        $byType = (clone $query)
            ->select('link_type', DB::raw('count(*) as count'))
            ->groupBy('link_type')
            ->pluck('count', 'link_type');

        return [
            'total_links' => $totalLinks,
            'featured_links' => $featuredLinks,
            'by_type' => $byType,
        ];
    }

    /**
     * Get resources assigned to user's institution (both links and documents)
     *
     * COMPLEX LOGIC PRESERVED FROM ORIGINAL (lines 783-968, 186 lines!)
     *
     * This is the most complex query method, combining both links and documents
     * with extensive filtering, logging, and permission checks.
     */
    public function getAssignedResources($request, $user): array
    {
        \Log::info('🔍 LinkSharingService: getAssignedResources called', [
            'user_id' => $user->id,
            'user_role' => $user->roles?->first()?->name,
            'institution_id' => $user->institution_id,
            'request_params' => $request->all(),
        ]);

        if (! $user->institution_id) {
            \Log::warning('User has no institution assigned', ['user_id' => $user->id]);

            return [];
        }

        \Log::info('🔍 LinkSharingService: User has institution, proceeding', [
            'institution_id' => $user->institution_id,
        ]);

        // Get allowed institutions based on user role
        $allowedInstitutions = $this->permissionService->getAllowedInstitutionsForUser($user);

        $assignedResources = [];

        try {
            // Get links assigned to user's allowed institutions OR specifically targeted to this user
            $linksQuery = LinkShare::with(['sharedBy', 'institution'])
                ->where('status', 'active')
                ->where(function ($query) use ($user, $allowedInstitutions) {
                    $query->whereIn('share_scope', ['public', 'regional', 'sectoral', 'institutional'])
                        ->where(function ($scopeQuery) use ($allowedInstitutions) {
                            $scopeQuery->where('share_scope', 'public')
                                ->orWhereIn('institution_id', $allowedInstitutions)
                                ->orWhere(function ($subQuery) use ($allowedInstitutions) {
                                    foreach ($allowedInstitutions as $institutionId) {
                                        $subQuery->orWhereJsonContains('target_institutions', $institutionId);
                                    }
                                });
                        })
                        ->orWhere(function ($userTargetQuery) use ($user) {
                            $userTargetQuery->where('share_scope', 'specific_users')
                                ->whereJsonContains('target_users', $user->id);
                        });
                });

            \Log::info('🔍 LinkSharingService: Links query built', [
                'user_institution_id' => $user->institution_id,
                'sql' => $linksQuery->toSql(),
                'bindings' => $linksQuery->getBindings(),
            ]);

            // Apply filters
            if ($request->filled('type') && $request->type === 'link') {
                // Only links requested
            } elseif ($request->filled('type') && $request->type === 'document') {
                // Skip links if only documents requested
                $linksQuery = $linksQuery->whereRaw('1 = 0');
            }

            if ($request->filled('search')) {
                $this->applyCaseInsensitiveSearch($linksQuery, ['title', 'description', 'url'], $request->search);
            }

            $links = $linksQuery->orderBy('created_at', 'desc')->get();

            \Log::info('🔍 LinkSharingService: Links fetched', [
                'links_count' => $links->count(),
                'links_data' => $links->map(function ($link) {
                    return [
                        'id' => $link->id,
                        'title' => $link->title,
                        'institution_id' => $link->institution_id,
                        'share_scope' => $link->share_scope,
                        'target_institutions' => $link->target_institutions,
                        'status' => $link->status,
                    ];
                })->toArray(),
            ]);

            foreach ($links as $link) {
                $assignedResources[] = [
                    'id' => $link->id,
                    'type' => 'link',
                    'title' => $link->title,
                    'description' => $link->description,
                    'url' => $link->url,
                    'link_type' => $link->link_type,
                    'is_downloadable' => false,
                    'is_viewable_online' => true,
                    'click_count' => $link->click_count ?? 0,
                    'download_count' => 0,
                    'file_size' => null,
                    'mime_type' => null,
                    'original_filename' => null,
                    'created_at' => $link->created_at?->toISOString(),
                    'assigned_at' => $link->created_at?->toISOString(),
                    'assigned_by' => [
                        'name' => $link->sharedBy?->name ?? 'N/A',
                        'institution' => $link->institution?->name ?? 'N/A',
                    ],
                    'is_new' => $link->created_at?->isAfter(now()->subDays(7)) ?? false,
                    'viewed_at' => null, // TODO: Track user-specific views
                ];
            }

            // Get documents assigned to user's allowed institutions (if not filtering for links only)
            if (! $request->filled('type') || $request->type !== 'link') {
                $documentsQuery = \App\Models\Document::with(['uploader', 'institution'])
                    ->where('status', 'active')
                    ->where(function ($query) use ($allowedInstitutions) {
                        $query->where('is_public', true)
                            ->orWhereIn('institution_id', $allowedInstitutions)
                            ->orWhere(function ($subQuery) use ($allowedInstitutions) {
                                foreach ($allowedInstitutions as $institutionId) {
                                    $subQuery->orWhereJsonContains('accessible_institutions', (string) $institutionId);
                                }
                            });
                    });

                if ($request->filled('search')) {
                    $this->applyCaseInsensitiveSearch(
                        $documentsQuery,
                        ['title', 'description', 'original_filename'],
                        $request->search
                    );
                }

                $documents = $documentsQuery->orderBy('created_at', 'desc')->get();

                \Log::info('🔍 LinkSharingService: Documents fetched', [
                    'documents_count' => $documents->count(),
                    'documents_data' => $documents->map(function ($doc) {
                        return [
                            'id' => $doc->id,
                            'title' => $doc->title,
                            'institution_id' => $doc->institution_id,
                            'is_public' => $doc->is_public,
                            'allowed_institutions' => $doc->allowed_institutions,
                            'status' => $doc->status,
                        ];
                    })->toArray(),
                ]);

                foreach ($documents as $document) {
                    $assignedResources[] = [
                        'id' => $document->id,
                        'type' => 'document',
                        'title' => $document->title,
                        'description' => $document->description,
                        'url' => null,
                        'link_type' => null,
                        'is_downloadable' => $document->is_downloadable ?? true,
                        'is_viewable_online' => $document->is_viewable_online ?? false,
                        'click_count' => 0,
                        'download_count' => 0, // TODO: Get from DocumentDownload model
                        'file_size' => $document->file_size,
                        'mime_type' => $document->mime_type,
                        'original_filename' => $document->original_filename,
                        'created_at' => $document->created_at?->toISOString(),
                        'assigned_at' => $document->created_at?->toISOString(),
                        'assigned_by' => [
                            'name' => $document->uploader?->name ?? 'N/A',
                            'institution' => $document->institution?->name ?? 'N/A',
                        ],
                        'is_new' => $document->created_at?->isAfter(now()->subDays(7)) ?? false,
                        'viewed_at' => null, // TODO: Track user-specific views
                    ];
                }
            }

            \Log::info('✅ LinkSharingService: getAssignedResources successful', [
                'total_resources' => count($assignedResources),
                'links_count' => count(array_filter($assignedResources, fn ($r) => $r['type'] === 'link')),
                'documents_count' => count(array_filter($assignedResources, fn ($r) => $r['type'] === 'document')),
            ]);

            return $assignedResources;
        } catch (\Exception $e) {
            \Log::error('❌ LinkSharingService: getAssignedResources failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [];
        }
    }

    private function applyCaseInsensitiveSearch($query, array $columns, string $term): void
    {
        $term = trim($term);
        if ($term === '') {
            return;
        }

        $query->where(function ($searchQuery) use ($columns, $term) {
            foreach ($columns as $index => $column) {
                $boolean = $index === 0 ? 'and' : 'or';
                $this->applyCaseInsensitiveLike($searchQuery, $column, $term, $boolean);
            }
        });
    }

    private function applyCaseInsensitiveLike($query, string $column, string $term, string $boolean = 'and'): void
    {
        $term = trim($term);

        if ($term === '') {
            return;
        }

        if ($this->getDatabaseDriver() === 'pgsql') {
            $query->where($column, 'ILIKE', '%' . $term . '%', $boolean);

            return;
        }

        $wrapped = $this->getQueryGrammar()->wrap($column);
        $query->whereRaw("LOWER({$wrapped}) LIKE ?", ['%' . mb_strtolower($term) . '%'], $boolean);
    }

    private function getDatabaseDriver(): string
    {
        if ($this->databaseDriver === null) {
            $this->databaseDriver = DB::connection()->getDriverName();
        }

        return $this->databaseDriver;
    }

    private function getQueryGrammar(): Grammar
    {
        if ($this->queryGrammar === null) {
            $this->queryGrammar = DB::connection()->getQueryGrammar();
        }

        return $this->queryGrammar;
    }

    private function linkShareColumnExists(string $column): bool
    {
        if (! array_key_exists($column, $this->linkShareColumnCache)) {
            $this->linkShareColumnCache[$column] = Schema::hasColumn('link_shares', $column);
        }

        return $this->linkShareColumnCache[$column];
    }

    /**
     * Cross-database priority ordering helper (replaces MySQL FIELD()).
     */
    private function orderByPriority($query, string $direction): void
    {
        $direction = strtolower($direction) === 'asc' ? 'asc' : 'desc';

        $caseExpression = 'CASE priority '
            . "WHEN 'high' THEN 1 "
            . "WHEN 'normal' THEN 2 "
            . "WHEN 'low' THEN 3 "
            . 'ELSE 4 END';

        $query->orderByRaw("{$caseExpression} {$direction}");
    }
}
