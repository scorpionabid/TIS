<?php

namespace App\Services;

use App\Models\LinkShare;
use App\Models\LinkAccessLog;
use App\Models\Institution;
use App\Services\BaseService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Exception;

class LinkSharingService extends BaseService
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Get links accessible to user with filtering
     */
    public function getAccessibleLinks(Request $request, $user)
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
     * Create new link share
     */
    public function createLinkShare(array $data, $user)
    {
        return DB::transaction(function () use ($data, $user) {
            // Validate user can create link with specified scope
            if (!$this->canCreateLinkWithScope($user, $data['share_scope'])) {
                throw new Exception('Bu paylaşım sahəsi üçün icazəniz yoxdur', 403);
            }

            // Generate unique link hash
            do {
                $linkHash = Str::random(32);
            } while (LinkShare::where('link_hash', $linkHash)->exists());

            // Prepare link data
            $linkData = [
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'url' => $data['url'],
                'link_type' => $data['link_type'],
                'share_scope' => $data['share_scope'],
                'target_roles' => $data['target_roles'] ?? null,
                'target_institutions' => $data['target_institutions'] ?? null,
                'shared_by' => $user->id,
                'institution_id' => $data['institution_id'] ?? $user->institution_id,
                'link_hash' => $linkHash,
                'is_active' => $data['is_active'] ?? true,
                'is_featured' => $data['is_featured'] ?? false,
                'expires_at' => !empty($data['expires_at']) ? Carbon::parse($data['expires_at']) : null,
                'priority' => $data['priority'] ?? 'normal',
                'tags' => $data['tags'] ?? null,
                'access_restrictions' => $data['access_restrictions'] ?? null,
                'metadata' => $data['metadata'] ?? null
            ];

            Log::info('Creating LinkShare with data:', $linkData);

            $linkShare = LinkShare::create($linkData);

            // Send notifications to target institutions if specified
            if (!empty($data['target_institutions'])) {
                try {
                    $this->sendLinkNotification($linkShare, 'link_shared', $data['target_institutions'], $user);
                } catch (\Exception $e) {
                    Log::error('Failed to send link sharing notification', [
                        'link_id' => $linkShare->id,
                        'target_institutions' => $data['target_institutions'],
                        'error' => $e->getMessage()
                    ]);
                }
            }

            return $linkShare->load(['sharedBy', 'institution']);
        });
    }

    /**
     * Update link share
     */
    public function updateLinkShare($linkShare, array $data, $user)
    {
        // Check if user can modify this link
        if (!$this->canModifyLink($user, $linkShare)) {
            throw new Exception('Bu linki dəyişmək icazəniz yoxdur', 403);
        }

        return DB::transaction(function () use ($linkShare, $data, $user) {
            // Validate scope change if provided
            if (isset($data['share_scope']) && $data['share_scope'] !== $linkShare->share_scope) {
                if (!$this->canCreateLinkWithScope($user, $data['share_scope'])) {
                    throw new Exception('Bu paylaşım sahəsi üçün icazəniz yoxdur', 403);
                }
            }

            // Update link data
            $updateData = array_filter([
                'title' => $data['title'] ?? null,
                'description' => $data['description'] ?? null,
                'url' => $data['url'] ?? null,
                'link_type' => $data['link_type'] ?? null,
                'share_scope' => $data['share_scope'] ?? null,
                'target_roles' => $data['target_roles'] ?? null,
                'target_institutions' => $data['target_institutions'] ?? null,
                'is_active' => $data['is_active'] ?? null,
                'is_featured' => $data['is_featured'] ?? null,
                'expires_at' => isset($data['expires_at']) ? ($data['expires_at'] ? Carbon::parse($data['expires_at']) : null) : null,
                'priority' => $data['priority'] ?? null,
                'tags' => $data['tags'] ?? null,
                'access_restrictions' => $data['access_restrictions'] ?? null,
                'metadata' => $data['metadata'] ?? null
            ], function ($value) {
                return $value !== null;
            });

            $linkShare->update($updateData);

            return $linkShare->fresh(['sharedBy', 'institution']);
        });
    }

    /**
     * Delete link share
     */
    public function deleteLinkShare($linkShare, $user)
    {
        if (!$this->canModifyLink($user, $linkShare)) {
            throw new Exception('Bu linki silmək icazəniz yoxdur', 403);
        }

        return DB::transaction(function () use ($linkShare) {
            // Soft delete the link
            $linkShare->update(['is_active' => false]);
            
            // Or permanently delete if required
            // $linkShare->delete();

            return true;
        });
    }

    /**
     * Access link and log the access
     */
    public function accessLink($linkShare, $request, $user = null)
    {
        // Check if link is active and not expired
        if (!$linkShare->is_active) {
            throw new Exception('Bu link artıq aktiv deyil', 403);
        }

        if ($linkShare->expires_at && Carbon::now()->gt($linkShare->expires_at)) {
            throw new Exception('Bu linkin müddəti bitib', 410);
        }

        // Check access permissions
        if (!$this->canAccessLink($user, $linkShare)) {
            throw new Exception('Bu linkə giriş icazəniz yoxdur', 403);
        }

        // Log the access
        $this->logLinkAccess($linkShare, $request, $user);

        // Increment access count
        $linkShare->increment('access_count');

        return [
            'link' => $linkShare,
            'redirect_url' => $linkShare->link_url,
            'access_logged' => true
        ];
    }

    /**
     * Get link statistics
     */
    public function getLinkStatistics($linkShare, $user)
    {
        if (!$this->canViewLinkStats($user, $linkShare)) {
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

    /**
     * Get sharing options available to user
     */
    public function getSharingOptions($user): array
    {
        $roleName = $user->role->name;
        
        return [
            'available_scopes' => $this->getAvailableScopesForRole($roleName),
            'available_target_roles' => $this->getAvailableTargetRoles($roleName),
            'targetable_institutions' => $this->getUserTargetableInstitutions($user),
            'link_types' => [
                'document' => 'Sənəd',
                'form' => 'Forma',
                'survey' => 'Sorğu',
                'announcement' => 'Elan',
                'resource' => 'Resurs',
                'external' => 'Xarici link'
            ],
            'priorities' => [
                'low' => 'Aşağı',
                'normal' => 'Normal',
                'high' => 'Yüksək'
            ]
        ];
    }

    /**
     * Record link click/access
     */
    public function recordClick($linkShare, Request $request, $user = null)
    {
        return DB::transaction(function () use ($linkShare, $request, $user) {
            // Log the access
            $this->logLinkAccess($linkShare, $request, $user);
            
            // Update link access count and last accessed time
            $linkShare->increment('access_count');
            $linkShare->update(['last_accessed_at' => now()]);

            return [
                'success' => true,
                'total_clicks' => $linkShare->fresh()->access_count,
                'redirect_url' => $linkShare->link_url
            ];
        });
    }

    /**
     * Bulk create links
     */
    public function bulkCreateLinks(array $linksData, $user)
    {
        return DB::transaction(function () use ($linksData, $user) {
            $results = [
                'created' => 0,
                'failed' => 0,
                'errors' => [],
                'links' => []
            ];

            foreach ($linksData as $index => $linkData) {
                try {
                    $link = $this->createLinkShare($linkData, $user);
                    $results['created']++;
                    $results['links'][] = $link;
                } catch (Exception $e) {
                    $results['failed']++;
                    $results['errors'][] = "Link " . ($index + 1) . ": " . $e->getMessage();
                }
            }

            return $results;
        });
    }

    /**
     * Apply filters to query
     */
    protected function applyRequestFilters($query, Request $request)
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
     */
    private function applyRegionalFilter($query, $user): void
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
            $query->whereIn('institution_id', $childIds)
                  ->orWhere('share_scope', 'sectoral')
                  ->orWhere('share_scope', 'regional')
                  ->orWhere('share_scope', 'national');
        } elseif ($user->hasRole(['schooladmin', 'müəllim', 'şagird'])) {
            // School users can see their own links and public ones
            $query->where(function ($q) use ($userInstitution, $user) {
                $q->where('institution_id', $userInstitution->id)
                  ->orWhere('share_scope', 'public')
                  ->orWhere('share_scope', 'national')
                  ->orWhere('shared_by', $user->id);
            });
        }
    }

    /**
     * Check if user can create link with specified scope
     */
    private function canCreateLinkWithScope($user, $scope): bool
    {
        $availableScopes = $this->getAvailableScopesForRole($user->role->name);
        return in_array($scope, array_keys($availableScopes));
    }

    /**
     * Get available scopes for role
     */
    private function getAvailableScopesForRole($roleName): array
    {
        $scopes = [
            'superadmin' => [
                'national' => 'Ümummilli',
                'regional' => 'Regional',
                'sectoral' => 'Sektor',
                'institutional' => 'Qurum',
                'public' => 'Açıq'
            ],
            'regionadmin' => [
                'regional' => 'Regional',
                'sectoral' => 'Sektor', 
                'institutional' => 'Qurum',
                'public' => 'Açıq'
            ],
            'sektoradmin' => [
                'sectoral' => 'Sektor',
                'institutional' => 'Qurum',
                'public' => 'Açıq'
            ],
            'schooladmin' => [
                'institutional' => 'Qurum',
                'public' => 'Açıq'
            ]
        ];

        return $scopes[$roleName] ?? ['public' => 'Açıq'];
    }

    /**
     * Get available target roles for user
     */
    private function getAvailableTargetRoles($roleName): array
    {
        $roles = [
            'superadmin' => ['all', 'regionadmin', 'sektoradmin', 'schooladmin', 'müəllim', 'şagird'],
            'regionadmin' => ['sektoradmin', 'schooladmin', 'müəllim', 'şagird'],
            'sektoradmin' => ['schooladmin', 'müəllim', 'şagird'],
            'schooladmin' => ['müəllim', 'şagird']
        ];

        return $roles[$roleName] ?? [];
    }

    /**
     * Get user's targetable institutions
     */
    private function getUserTargetableInstitutions($user): array
    {
        $userInstitution = $user->institution;
        if (!$userInstitution) {
            return [];
        }

        if ($user->hasRole('superadmin')) {
            return Institution::active()->pluck('name', 'id')->toArray();
        }

        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $childIds = $userInstitution->getAllChildrenIds();
            return Institution::whereIn('id', $childIds)->pluck('name', 'id')->toArray();
        }

        if ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $childIds = $userInstitution->getAllChildrenIds();
            return Institution::whereIn('id', $childIds)->pluck('name', 'id')->toArray();
        }

        // School level users can only target their own institution
        return [$userInstitution->id => $userInstitution->name];
    }

    /**
     * Check if user can modify link
     */
    private function canModifyLink($user, $linkShare): bool
    {
        // Owner can always modify
        if ($linkShare->shared_by === $user->id) {
            return true;
        }

        // SuperAdmin can modify all
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Higher level administrators can modify links from their hierarchy
        $userInstitution = $user->institution;
        if (!$userInstitution) {
            return false;
        }

        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $childIds = $userInstitution->getAllChildrenIds();
            return in_array($linkShare->institution_id, $childIds);
        }

        if ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $childIds = $userInstitution->getAllChildrenIds();
            return in_array($linkShare->institution_id, $childIds);
        }

        return false;
    }

    /**
     * Check if user can access link
     */
    private function canAccessLink($user, $linkShare): bool
    {
        // Public links are accessible to all authenticated users
        if ($linkShare->share_scope === 'public') {
            return true;
        }

        if (!$user) {
            return false;
        }

        // Owner can always access
        if ($linkShare->shared_by === $user->id) {
            return true;
        }

        // SuperAdmin can access all
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Check target roles if specified
        if ($linkShare->target_roles) {
            $targetRoles = is_array($linkShare->target_roles) ? $linkShare->target_roles : json_decode($linkShare->target_roles, true);
            if (!in_array($user->role->name, $targetRoles) && !in_array('all', $targetRoles)) {
                return false;
            }
        }

        // Check institutional hierarchy
        $userInstitution = $user->institution;
        if (!$userInstitution) {
            return false;
        }

        // Check scope-based access
        switch ($linkShare->share_scope) {
            case 'national':
                return true;
            case 'regional':
                $ancestors = $userInstitution->getAncestors();
                $regionInstitution = $ancestors->firstWhere('level', 2) ?? ($userInstitution->level == 2 ? $userInstitution : null);
                return $regionInstitution && ($regionInstitution->id === $linkShare->institution_id || 
                    in_array($linkShare->institution_id, $regionInstitution->getAllChildrenIds()));
            case 'sectoral':
                $ancestors = $userInstitution->getAncestors();
                $sectorInstitution = $ancestors->firstWhere('level', 3) ?? ($userInstitution->level == 3 ? $userInstitution : null);
                return $sectorInstitution && ($sectorInstitution->id === $linkShare->institution_id ||
                    in_array($linkShare->institution_id, $sectorInstitution->getAllChildrenIds()));
            case 'institutional':
                return $userInstitution->id === $linkShare->institution_id;
            default:
                return false;
        }
    }

    /**
     * Check if user can view link statistics
     */
    private function canViewLinkStats($user, $linkShare): bool
    {
        // Owner can view stats
        if ($linkShare->shared_by === $user->id) {
            return true;
        }

        // SuperAdmin can view all stats
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Higher level administrators can view stats from their hierarchy
        return $this->canModifyLink($user, $linkShare);
    }

    /**
     * Log link access
     */
    private function logLinkAccess($linkShare, $request, $user = null): void
    {
        LinkAccessLog::create([
            'link_share_id' => $linkShare->id,
            'user_id' => $user?->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'referer' => $request->header('referer'),
            'accessed_at' => now()
        ]);
    }

    /**
     * Get popular links
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
     */
    public function getGlobalLinkStats(Request $request, $user)
    {
        // Base query respecting user's visibility scope
        $query = LinkShare::query();
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
     * Access link by ID
     */
    public function accessLinkById(int $id, $user, Request $request)
    {
        $linkShare = LinkShare::findOrFail($id);

        // Check if link can be accessed by user
        if (!$linkShare->canBeAccessedBy($user)) {
            throw new Exception('Bu linkə giriş icazəniz yoxdur', 403);
        }

        // Record access
        $linkShare->recordAccess($user, $request->ip(), $request->userAgent());

        return [
            'redirect_url' => $linkShare->url,
            'link' => $linkShare,
            'access_logged' => true
        ];
    }

    /**
     * Send link sharing notification to target institutions
     */
    private function sendLinkNotification(LinkShare $linkShare, string $action, array $targetInstitutions, $user): array
    {
        $templateKey = $action; // 'link_shared'

        // Prepare notification variables
        $variables = [
            'link_title' => $linkShare->title,
            'link_description' => $linkShare->description ?? '',
            'creator_name' => $user->name ?? 'Sistem',
            'link_url' => $linkShare->url,
        ];

        // Prepare recipients with institution-based targeting
        $recipients = [
            'institutions' => $targetInstitutions,
            'target_roles' => $linkShare->target_roles ?? null
        ];

        $options = [
            'related' => $linkShare,
            'priority' => $this->mapLinkPriorityToNotificationPriority($linkShare->priority ?? 'normal'),
        ];

        Log::info('Sending link notification', [
            'template_key' => $templateKey,
            'link_id' => $linkShare->id,
            'target_institutions' => $targetInstitutions,
            'target_roles' => $linkShare->target_roles,
            'variables' => array_keys($variables)
        ]);

        return $this->notificationService->sendFromTemplate($templateKey, $recipients, $variables, $options);
    }

    /**
     * Map link priority to notification priority
     */
    private function mapLinkPriorityToNotificationPriority(string $linkPriority): string
    {
        return match ($linkPriority) {
            'high' => 'high',
            'normal' => 'normal',
            'low' => 'low',
            default => 'normal',
        };
    }

    /**
     * Get resources assigned to user's institution (both links and documents)
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
        $allowedInstitutions = $this->getAllowedInstitutionsForUser($user);

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
                                      $subQuery->orWhereJsonContains('allowed_institutions', $institutionId);
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

    /**
     * Get allowed institutions for user based on their role
     */
    private function getAllowedInstitutionsForUser($user): array
    {
        $userRole = $user->roles?->first()?->name;
        $userInstitutionId = $user->institution_id;

        switch ($userRole) {
            case 'sektoradmin':
                // Sektoradmin can access all institutions in their sector
                return $this->getSectorInstitutions($userInstitutionId);

            case 'schooladmin':
            case 'məktəbadmin':
            case 'muellim':
            case 'teacher':
            default:
                // Other roles only have access to their own institution
                return [$userInstitutionId];
        }
    }

    /**
     * Get all institutions within a sector (including the sector itself)
     */
    private function getSectorInstitutions($sektorId): array
    {
        return \App\Models\Institution::where('parent_id', $sektorId)
            ->pluck('id')
            ->push($sektorId)
            ->toArray();
    }
}