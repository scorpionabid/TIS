<?php

namespace App\Services\LinkSharing\Domains\Query;

use App\Models\LinkShare;
use App\Services\LinkSharing\Domains\Permission\LinkPermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Link Query Builder
 *
 * Handles all query construction, filtering, searching, and pagination
 * for link sharing with hierarchical access control.
 */
class LinkQueryBuilder
{
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
        $query = LinkShare::with(['sharedBy', 'institution'])->active();

        // Apply regional hierarchy filtering
        $this->applyRegionalFilter($query, $user);

        // Apply filters
        $query = $this->applyRequestFilters($query, $request);

        // Apply search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('tags', 'like', "%{$search}%");
            });
        }

        // Apply sorting
        $sortField = $request->get('sort', 'created_at');
        $direction = $request->get('direction', 'desc');

        if ($sortField === 'popularity') {
            $query->orderBy('access_count', $direction);
        } elseif ($sortField === 'priority') {
            $query->orderByRaw('FIELD(priority, "high", "normal", "low")');
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
     * LOGIC PRESERVED FROM ORIGINAL (lines 350-392)
     */
    public function applyRequestFilters($query, Request $request)
    {
        if ($request->filled('link_type')) {
            $query->where('link_type', $request->link_type);
        }

        if ($request->filled('share_scope')) {
            $query->byScope($request->share_scope);
        }

        if ($request->filled('is_featured')) {
            $query->where('is_featured', $request->boolean('is_featured'));
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('shared_by')) {
            $query->where('shared_by', $request->shared_by);
        }

        if ($request->filled('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('tags')) {
            $tags = is_array($request->tags) ? $request->tags : explode(',', $request->tags);
            foreach ($tags as $tag) {
                $query->where('tags', 'like', "%{$tag}%");
            }
        }

        return $query;
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
        if (!$userInstitution) {
            $query->where('shared_by', $user->id); // Only own links if no institution
            return;
        }

        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            // Regional admin can see links from their region
            $childIds = $userInstitution->getAllChildrenIds();
            $query->whereIn('institution_id', $childIds)
                  ->orWhere('share_scope', 'regional')
                  ->orWhere('share_scope', 'national');
        } elseif ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            // Sector admin can see links from their sector
            $childIds = $userInstitution->getAllChildrenIds();
            $query->where(function ($q) use ($childIds) {
                $q->whereIn('institution_id', $childIds)
                  ->orWhere('share_scope', 'sectoral')
                  ->orWhere('share_scope', 'regional')
                  ->orWhere('share_scope', 'national')
                  ->orWhere(function($subQ) use ($childIds) {
                      // Check if any of the sector's institutions are in target_institutions JSON
                      foreach ($childIds as $instId) {
                          $subQ->orWhereJsonContains('target_institutions', (string)$instId);
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
                  ->orWhereJsonContains('target_institutions', (string)$userInstitution->id);
            });
        }
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
            'request_params' => $request->all()
        ]);

        if (!$user->institution_id) {
            \Log::warning('User has no institution assigned', ['user_id' => $user->id]);
            return [];
        }

        \Log::info('🔍 LinkSharingService: User has institution, proceeding', [
            'institution_id' => $user->institution_id
        ]);

        // Get allowed institutions based on user role
        $allowedInstitutions = $this->permissionService->getAllowedInstitutionsForUser($user);

        $assignedResources = [];

        try {
            // Get links assigned to user's allowed institutions
            $linksQuery = LinkShare::with(['sharedBy', 'institution'])
                ->where('status', 'active')
                ->where(function ($query) use ($user, $allowedInstitutions) {
                    $query->where('share_scope', 'public')
                          ->orWhereIn('institution_id', $allowedInstitutions)
                          ->orWhere(function ($subQuery) use ($allowedInstitutions) {
                              foreach ($allowedInstitutions as $institutionId) {
                                  $subQuery->orWhereJsonContains('target_institutions', $institutionId);
                              }
                          });
                });

            \Log::info('🔍 LinkSharingService: Links query built', [
                'user_institution_id' => $user->institution_id,
                'sql' => $linksQuery->toSql(),
                'bindings' => $linksQuery->getBindings()
            ]);

            // Apply filters
            if ($request->filled('type') && $request->type === 'link') {
                // Only links requested
            } elseif ($request->filled('type') && $request->type === 'document') {
                // Skip links if only documents requested
                $linksQuery = $linksQuery->whereRaw('1 = 0');
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $linksQuery->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('url', 'like', "%{$search}%");
                });
            }

            $links = $linksQuery->orderBy('created_at', 'desc')->get();

            \Log::info('🔍 LinkSharingService: Links fetched', [
                'links_count' => $links->count(),
                'links_data' => $links->map(function($link) {
                    return [
                        'id' => $link->id,
                        'title' => $link->title,
                        'institution_id' => $link->institution_id,
                        'share_scope' => $link->share_scope,
                        'target_institutions' => $link->target_institutions,
                        'status' => $link->status
                    ];
                })->toArray()
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
                        'institution' => $link->institution?->name ?? 'N/A'
                    ],
                    'is_new' => $link->created_at?->isAfter(now()->subDays(7)) ?? false,
                    'viewed_at' => null, // TODO: Track user-specific views
                ];
            }

            // Get documents assigned to user's allowed institutions (if not filtering for links only)
            if (!$request->filled('type') || $request->type !== 'link') {
                $documentsQuery = \App\Models\Document::with(['uploader', 'institution'])
                    ->where('status', 'active')
                    ->where(function ($query) use ($user, $allowedInstitutions) {
                        $query->where('is_public', true)
                              ->orWhereIn('institution_id', $allowedInstitutions)
                              ->orWhere(function ($subQuery) use ($allowedInstitutions) {
                                  foreach ($allowedInstitutions as $institutionId) {
                                      $subQuery->orWhereJsonContains('accessible_institutions', (string)$institutionId);
                                  }
                              });
                    });

                if ($request->filled('search')) {
                    $search = $request->search;
                    $documentsQuery->where(function ($q) use ($search) {
                        $q->where('title', 'like', "%{$search}%")
                          ->orWhere('description', 'like', "%{$search}%")
                          ->orWhere('original_filename', 'like', "%{$search}%");
                    });
                }

                $documents = $documentsQuery->orderBy('created_at', 'desc')->get();

                \Log::info('🔍 LinkSharingService: Documents fetched', [
                    'documents_count' => $documents->count(),
                    'documents_data' => $documents->map(function($doc) {
                        return [
                            'id' => $doc->id,
                            'title' => $doc->title,
                            'institution_id' => $doc->institution_id,
                            'is_public' => $doc->is_public,
                            'allowed_institutions' => $doc->allowed_institutions,
                            'status' => $doc->status
                        ];
                    })->toArray()
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
                            'institution' => $document->institution?->name ?? 'N/A'
                        ],
                        'is_new' => $document->created_at?->isAfter(now()->subDays(7)) ?? false,
                        'viewed_at' => null, // TODO: Track user-specific views
                    ];
                }
            }

            \Log::info('✅ LinkSharingService: getAssignedResources successful', [
                'total_resources' => count($assignedResources),
                'links_count' => count(array_filter($assignedResources, fn($r) => $r['type'] === 'link')),
                'documents_count' => count(array_filter($assignedResources, fn($r) => $r['type'] === 'document'))
            ]);

            return $assignedResources;

        } catch (\Exception $e) {
            \Log::error('❌ LinkSharingService: getAssignedResources failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [];
        }
    }
}
