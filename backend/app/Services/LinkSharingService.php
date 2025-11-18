<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\LinkShare;
use App\Models\LinkAccessLog;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Services\BaseService;
use App\Services\LinkSharing\Domains\Permission\LinkPermissionService;
use App\Services\LinkSharing\Domains\Query\LinkQueryBuilder;
use App\Services\LinkSharing\Domains\Crud\LinkCrudManager;
use App\Services\LinkSharing\Domains\Access\LinkAccessManager;
use App\Services\LinkSharing\Domains\Statistics\LinkStatisticsService;
use App\Services\LinkSharing\Domains\Configuration\LinkConfigurationService;
use Illuminate\Http\Request;

/**
 * Link Sharing Service (Refactored - Sprint 4)
 *
 * Central orchestrator for link sharing operations, now delegating to domain services.
 *
 * ARCHITECTURE:
 * - LinkPermissionService: Authorization and access control (9 methods)
 * - LinkQueryBuilder: Filtering, search, pagination, hierarchical access (7 methods)
 * - LinkCrudManager: Create, update, delete operations (4 methods)
 * - LinkAccessManager: Link access and click tracking (4 methods)
 * - LinkStatisticsService: Analytics and metrics (2 methods)
 * - LinkConfigurationService: Options and metadata (4 methods)
 * - LinkNotificationService: Event notifications (2 methods)
 *
 * REFACTORED: Original 1,000 lines → ~200 lines orchestrator + 7 domain services
 */
class LinkSharingService extends BaseService
{
    /**
     * Constructor with dependency injection
     */
    public function __construct(
        protected LinkPermissionService $permissionService,
        protected LinkQueryBuilder $queryBuilder,
        protected LinkCrudManager $crudManager,
        protected LinkAccessManager $accessManager,
        protected LinkStatisticsService $statisticsService,
        protected LinkConfigurationService $configService
    ) {}

    /**
     * Get accessible links with filtering
     */
    public function getAccessibleLinks(Request $request, $user)
    {
        return $this->queryBuilder->getAccessibleLinks($request, $user);
    }

    /**
     * Create new link share
     */
    public function createLinkShare(array $data, $user)
    {
        return $this->crudManager->createLinkShare($data, $user);
    }

    /**
     * Update link share
     */
    public function updateLinkShare($linkShare, array $data, $user)
    {
        return $this->crudManager->updateLinkShare($linkShare, $data, $user);
    }

    /**
     * Delete link share
     */
    public function deleteLinkShare($linkShare, $user)
    {
        return $this->crudManager->deleteLinkShare($linkShare, $user);
    }

    /**
     * Access link and log the access
     */
    public function accessLink($linkShare, $request, $user = null)
    {
        return $this->accessManager->accessLink($linkShare, $request, $user);
    }

    /**
     * Get link statistics
     */
    public function getLinkStatistics($linkShare, $user)
    {
        return $this->statisticsService->getLinkStatistics($linkShare, $user);
    }

    /**
     * Get sharing options available to user
     */
    public function getSharingOptions($user): array
    {
        return $this->configService->getSharingOptions($user);
    }

    /**
     * Record link click/access
     */
    public function recordClick($linkShare, Request $request, $user = null)
    {
        return $this->accessManager->recordClick($linkShare, $request, $user);
    }

    /**
     * Bulk create links
     */
    public function bulkCreateLinks(array $linksData, $user)
    {
        return $this->crudManager->bulkCreateLinks($linksData, $user);
    }

    /**
     * Get popular links
     */
    public function getPopularLinks(Request $request, $user)
    {
        return $this->queryBuilder->getPopularLinks($request, $user);
    }

    /**
     * Get featured links
     */
    public function getFeaturedLinks(Request $request, $user)
    {
        return $this->queryBuilder->getFeaturedLinks($request, $user);
    }

    /**
     * Get global link statistics
     */
    public function getGlobalLinkStats(Request $request, $user)
    {
        return $this->queryBuilder->getGlobalLinkStats($request, $user);
    }

    /**
     * Access link by ID
     */
    public function accessLinkById(int $id, $user, Request $request)
    {
        return $this->accessManager->accessLinkById($id, $user, $request);
    }

    /**
     * Get resources assigned to user's institution (both links and documents)
     */
    public function getAssignedResources($request, $user): array
    {
        return $this->queryBuilder->getAssignedResources($request, $user);
    }

    /**
     * Build sector → school overview for a link's sharing targets
     */
    public function getLinkSharingOverview(LinkShare $linkShare): array
    {
        $targets = $linkShare->target_institutions;

        if (is_string($targets)) {
            $decoded = json_decode($targets, true);
            $targets = is_array($decoded) ? $decoded : [];
        }

        if (!is_array($targets)) {
            $targets = [];
        }

        $targetIds = array_values(array_unique(array_filter(array_map('intval', $targets))));

        $overview = [
            'link_id' => $linkShare->id,
            'link_title' => $linkShare->title,
            'share_scope' => $linkShare->share_scope,
            'target_counts' => [
                'regions' => 0,
                'sectors' => 0,
                'schools' => 0,
                'users' => 0,
            ],
            'total_sectors' => 0,
            'total_schools' => 0,
            'target_users' => [],
            'sectors' => [],
        ];

        if (empty($targetIds)) {
            return $overview;
        }

        $targetInstitutions = Institution::whereIn('id', $targetIds)
            ->with(['parent:id,name,level,parent_id'])
            ->get(['id', 'name', 'level', 'parent_id', 'utis_code', 'institution_code']);

        $targetsByLevel = $targetInstitutions->groupBy('level');
        $regionTargets = $targetsByLevel->get(2, collect());
        $sectorTargets = $targetsByLevel->get(3, collect());
        $schoolTargets = $targetsByLevel->get(4, collect());

        $overview['target_counts'] = [
            'regions' => $regionTargets->count(),
            'sectors' => $sectorTargets->count(),
            'schools' => $schoolTargets->count(),
            'users' => 0,
        ];

        $targetUsersRaw = $linkShare->target_users;
        if (is_string($targetUsersRaw)) {
            $decodedUsers = json_decode($targetUsersRaw, true);
            $targetUsersRaw = is_array($decodedUsers) ? $decodedUsers : [];
        }

        if (!is_array($targetUsersRaw)) {
            $targetUsersRaw = [];
        }

        $targetUserIds = array_values(array_unique(array_filter(array_map('intval', $targetUsersRaw))));

        if (!empty($targetUserIds)) {
            $users = User::whereIn('id', $targetUserIds)
                ->with('roles:id,name')
                ->get(['id', 'first_name', 'last_name', 'username', 'email']);

            $overview['target_users'] = $users->map(function (User $user) {
                $fullName = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));
                $fallback = $user->username ?? $user->email ?? ('İstifadəçi #' . $user->id);

                return [
                    'id' => $user->id,
                    'name' => $fullName !== '' ? $fullName : $fallback,
                    'username' => $user->username,
                    'email' => $user->email,
                    'roles' => $user->roles->pluck('name')->all(),
                ];
            })->values()->toArray();

            $overview['target_counts']['users'] = count($overview['target_users']);
        }

        $sectorConfigs = [];

        if ($regionTargets->isNotEmpty()) {
            $regionSectorIds = Institution::whereIn('parent_id', $regionTargets->pluck('id')->all())
                ->where('level', 3)
                ->pluck('id')
                ->all();

            foreach ($regionSectorIds as $sectorId) {
                $sectorConfigs[$sectorId] = [
                    'coverage' => 'full',
                ];
            }
        }

        foreach ($sectorTargets as $sector) {
            $sectorConfigs[$sector->id] = [
                'coverage' => 'full',
            ];
        }

        $schoolsGrouped = $schoolTargets->groupBy(fn ($school) => $school->parent_id ?: 0);
        foreach ($schoolsGrouped as $sectorId => $schools) {
            $sectorId = (int) $sectorId;
            if (!isset($sectorConfigs[$sectorId])) {
                $sectorConfigs[$sectorId] = [
                    'coverage' => 'partial',
                ];
            }

            if (($sectorConfigs[$sectorId]['coverage'] ?? 'partial') !== 'full') {
                $sectorConfigs[$sectorId]['school_ids'] = array_values(array_unique(array_merge(
                    $sectorConfigs[$sectorId]['school_ids'] ?? [],
                    $schools->pluck('id')->map(fn ($id) => (int) $id)->all()
                )));
            }
        }

        $sectorIds = array_values(array_filter(array_keys($sectorConfigs), fn ($id) => $id > 0));

        $sectorRecords = empty($sectorIds)
            ? collect()
            : Institution::whereIn('id', $sectorIds)
                ->with(['parent:id,name,level,parent_id'])
                ->get(['id', 'name', 'level', 'parent_id', 'utis_code', 'institution_code'])
                ->keyBy('id');

        $fullSectorIds = array_values(array_filter($sectorIds, function ($sectorId) use ($sectorConfigs) {
            return ($sectorConfigs[$sectorId]['coverage'] ?? 'partial') === 'full';
        }));

        $fullSectorSchools = empty($fullSectorIds)
            ? collect()
            : Institution::whereIn('parent_id', $fullSectorIds)
                ->where('level', 4)
                ->get(['id', 'name', 'parent_id', 'utis_code', 'institution_code'])
                ->groupBy('parent_id');

        // Get access stats for all schools - which institutions have accessed this link
        $accessStats = $this->getInstitutionAccessStats($linkShare->id);

        $sectors = [];
        $totalSchools = 0;
        $accessedCount = 0;
        $notAccessedCount = 0;

        foreach ($sectorConfigs as $sectorId => $config) {
            $coverage = $config['coverage'] ?? 'partial';

            if ($sectorId === 0) {
                $ungroupedSchools = $schoolsGrouped->get(0, collect());
                if ($ungroupedSchools->isEmpty()) {
                    continue;
                }

                $schoolsData = $ungroupedSchools->map(function ($school) use ($accessStats, &$accessedCount, &$notAccessedCount) {
                    $stats = $accessStats[$school->id] ?? null;
                    $hasAccessed = $stats !== null && $stats['access_count'] > 0;

                    if ($hasAccessed) {
                        $accessedCount++;
                    } else {
                        $notAccessedCount++;
                    }

                    return [
                        'id' => $school->id,
                        'name' => $school->name,
                        'utis_code' => $school->utis_code,
                        'institution_code' => $school->institution_code,
                        'has_accessed' => $hasAccessed,
                        'access_count' => $stats['access_count'] ?? 0,
                        'last_accessed_at' => $stats['last_accessed_at'] ?? null,
                        'first_accessed_at' => $stats['first_accessed_at'] ?? null,
                    ];
                })->values()->toArray();

                $totalSchools += count($schoolsData);
                $sectors[] = [
                    'id' => null,
                    'name' => 'Sektor təyin edilməyib',
                    'region_name' => null,
                    'is_full_coverage' => false,
                    'school_count' => count($schoolsData),
                    'schools' => $schoolsData,
                ];
                continue;
            }

            $sector = $sectorRecords->get($sectorId);
            if (!$sector) {
                continue;
            }

            $schoolsCollection = $coverage === 'full'
                ? ($fullSectorSchools->get($sectorId) ?? collect())
                : ($schoolsGrouped->get($sectorId) ?? collect());

            $schoolsData = $schoolsCollection->map(function ($school) use ($accessStats, &$accessedCount, &$notAccessedCount) {
                $stats = $accessStats[$school->id] ?? null;
                $hasAccessed = $stats !== null && $stats['access_count'] > 0;

                if ($hasAccessed) {
                    $accessedCount++;
                } else {
                    $notAccessedCount++;
                }

                return [
                    'id' => $school->id,
                    'name' => $school->name,
                    'utis_code' => $school->utis_code,
                    'institution_code' => $school->institution_code,
                    'has_accessed' => $hasAccessed,
                    'access_count' => $stats['access_count'] ?? 0,
                    'last_accessed_at' => $stats['last_accessed_at'] ?? null,
                    'first_accessed_at' => $stats['first_accessed_at'] ?? null,
                ];
            })->values()->toArray();

            $totalSchools += count($schoolsData);

            $sectors[] = [
                'id' => $sector->id,
                'name' => $sector->name,
                'region_id' => $sector->parent_id,
                'region_name' => $sector->parent->name ?? null,
                'is_full_coverage' => $coverage === 'full',
                'school_count' => count($schoolsData),
                'schools' => $schoolsData,
            ];
        }

        usort($sectors, function ($a, $b) {
            $regionComparison = strcmp($a['region_name'] ?? '', $b['region_name'] ?? '');
            if ($regionComparison !== 0) {
                return $regionComparison;
            }
            return strcmp($a['name'] ?? '', $b['name'] ?? '');
        });

        $overview['total_sectors'] = count($sectors);
        $overview['total_schools'] = $totalSchools;
        $overview['accessed_count'] = $accessedCount;
        $overview['not_accessed_count'] = $notAccessedCount;
        $overview['access_rate'] = $totalSchools > 0
            ? round(($accessedCount / $totalSchools) * 100, 1)
            : 0;
        $overview['sectors'] = $sectors;

        return $overview;
    }

    /**
     * Get access statistics for institutions from link_access_logs
     * Groups by institution_id through user's institution
     */
    private function getInstitutionAccessStats(int $linkShareId): array
    {
        $stats = DB::table('link_access_logs as lal')
            ->join('users as u', 'lal.user_id', '=', 'u.id')
            ->where('lal.link_share_id', $linkShareId)
            ->whereNotNull('u.institution_id')
            ->select(
                'u.institution_id',
                DB::raw('COUNT(lal.id) as access_count'),
                DB::raw('MIN(lal.created_at) as first_accessed_at'),
                DB::raw('MAX(lal.created_at) as last_accessed_at')
            )
            ->groupBy('u.institution_id')
            ->get();

        $result = [];
        foreach ($stats as $stat) {
            $result[$stat->institution_id] = [
                'access_count' => (int) $stat->access_count,
                'first_accessed_at' => $stat->first_accessed_at,
                'last_accessed_at' => $stat->last_accessed_at,
            ];
        }

        return $result;
    }
}
