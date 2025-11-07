<?php

namespace App\Services;

use App\Models\LinkShare;
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
}
