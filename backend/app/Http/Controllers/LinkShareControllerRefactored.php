<?php

namespace App\Http\Controllers;

use App\Exports\LinkBulkTemplateExport;
use App\Models\Institution;
use App\Models\LinkShare;
use App\Services\LinkAnalyticsService;
use App\Services\LinkSharing\LinkBulkUploadService;
use App\Services\LinkSharingService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

class LinkShareControllerRefactored extends BaseController
{
    protected $linkSharingService;

    protected $linkAnalyticsService;

    protected $notificationService;

    protected $bulkUploadService;

    public function __construct(
        LinkSharingService $linkSharingService,
        LinkAnalyticsService $linkAnalyticsService,
        NotificationService $notificationService,
        LinkBulkUploadService $bulkUploadService
    ) {
        $this->linkSharingService = $linkSharingService;
        $this->linkAnalyticsService = $linkAnalyticsService;
        $this->notificationService = $notificationService;
        $this->bulkUploadService = $bulkUploadService;
    }

    /**
     * Get all link shares with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'search' => 'nullable|string|max:255',
                'document_type' => 'nullable|string',
                'creator_id' => 'nullable|exists:users,id',
                'institution_id' => 'nullable|exists:institutions,id',
                'institution_ids' => 'nullable|array',
                'institution_ids.*' => 'integer|exists:institutions,id',
                'target_institution_id' => 'nullable|integer|exists:institutions,id',
                'target_user_id' => 'nullable|integer|exists:users,id',
                'requires_login' => 'nullable|boolean',
                'is_active' => 'nullable|boolean',
                'has_password' => 'nullable|boolean',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'sort_by' => 'nullable|string|in:created_at,expires_at,access_count,document_name',
                'sort_direction' => 'nullable|string|in:asc,desc',
                'per_page' => 'nullable|integer|min:1|max:500',
                'scope' => 'nullable|string|in:scoped,global',
                'status' => 'nullable|string|in:active,expired,disabled',
                'statuses' => 'nullable|array',
                'statuses.*' => 'string|in:active,expired,disabled',
                'selection_mode' => 'nullable|boolean',
                'group_by_title' => 'nullable|boolean',
            ]);

            $user = Auth::user();

            if ($request->input('scope') === 'global' && ! $this->linkSharingService->canViewAllLinks($user)) {
                abort(403, 'Qlobal link siyahısına baxmaq icazəniz yoxdur');
            }

            $result = $this->linkSharingService->getAccessibleLinks($request, $user);

            return $this->successResponse($result, 'Bağlantılar uğurla alındı');
        }, 'linkshare.index');
    }

    /**
     * Get single link share details
     */
    public function show(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $request->validate([
                'include_accesses' => 'boolean',
                'access_limit' => 'nullable|integer|min:1|max:100',
            ]);

            $user = Auth::user();
            $linkShare = $this->linkSharingService->getLinkShare($id, $request, $user);

            return $this->successResponse($linkShare, 'Bağlantı məlumatları alındı');
        }, 'linkshare.show');
    }

    /**
     * Get sharing overview (sector → school) for a specific link
     */
    public function sharingOverview(LinkShare $linkShare): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($linkShare) {
            $overview = $this->linkSharingService->getLinkSharingOverview($linkShare);

            return $this->successResponse($overview, 'Link paylaşım xülasəsi uğurla alındı');
        }, 'linkshare.sharing_overview');
    }

    /**
     * Get merged sharing overview for all links with the same title (grouped links)
     * Used when displaying institutions for link groups (e.g., "Məktəb pasportu" with 354 links)
     */
    public function groupedSharingOverview(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'title' => 'required|string|max:255',
            ]);

            $title = $request->get('title');
            $overview = $this->linkSharingService->getMergedSharingOverviewByTitle($title);

            return $this->successResponse($overview, 'Qrup link paylaşım xülasəsi uğurla alındı');
        }, 'linkshare.grouped_sharing_overview');
    }

    /**
     * Create new link share
     */
    public function store(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'url' => 'required|url',
                'description' => 'nullable|string|max:500',
                'link_type' => 'required|string|in:external,video,form,document',
                'share_scope' => 'required|string|in:public,regional,sectoral,institutional,specific_users',
                'is_featured' => 'boolean',
                'expires_at' => 'nullable|date|after:now',
                'target_institutions' => 'nullable|array',
                'target_institutions.*' => 'integer|exists:institutions,id',
                'target_roles' => 'nullable|array',
                'target_roles.*' => 'string',
                'target_departments' => 'nullable|array',
                'target_departments.*' => 'integer',
                'target_users' => 'nullable|array',
                'target_users.*' => 'integer|exists:users,id',
            ]);

            $user = Auth::user();
            $linkShare = $this->linkSharingService->createLinkShare($validated, $user);

            // Send link sharing notifications
            $this->sendLinkShareNotification($linkShare, $validated, $user);

            return $this->successResponse($linkShare, 'Bağlantı uğurla yaradıldı', 201);
        }, 'linkshare.store');
    }

    /**
     * Update link share
     */
    public function update(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:255',
                'description' => 'nullable|string|max:500',
                'url' => 'sometimes|required|url|max:2048',
                'link_type' => 'sometimes|required|string|in:external,video,form,document',
                'share_scope' => 'sometimes|required|string|in:public,regional,sectoral,institutional,specific_users',
                'is_featured' => 'boolean',
                'expires_at' => 'nullable|date|after:now',
                'target_institutions' => 'nullable|array',
                'target_institutions.*' => 'integer|exists:institutions,id',
                'target_roles' => 'nullable|array',
                'target_roles.*' => 'string',
                'target_departments' => 'nullable|array',
                'target_departments.*' => 'integer',
                'target_users' => 'nullable|array',
                'target_users.*' => 'integer|exists:users,id',
                'password' => 'nullable|string|min:6|max:50',
                'access_limit' => 'nullable|integer|min:1|max:10000',
                'allow_download' => 'boolean',
                'notify_on_access' => 'boolean',
                'custom_message' => 'nullable|string|max:1000',
                'is_active' => 'boolean',
            ]);

            $user = Auth::user();
            Log::info('LinkShare update request received', [
                'link_share_id' => $id,
                'validated_payload' => $validated,
                'user_id' => $user?->id,
                'route' => $request->path(),
            ]);
            $linkShareModel = LinkShare::with(['sharedBy', 'institution'])->find($id);

            if (! $linkShareModel) {
                Log::error('LinkShare not found during update', [
                    'link_share_id' => $id,
                    'user_id' => $user?->id,
                ]);

                abort(404, "LinkShare #{$id} tapılmadı");
            }

            Log::info('LinkShare model loaded for update', [
                'link_share_id' => $linkShareModel->id,
                'has_sharedBy' => $linkShareModel->relationLoaded('sharedBy'),
                'has_institution' => $linkShareModel->relationLoaded('institution'),
            ]);

            $linkShare = $this->linkSharingService->updateLinkShare($linkShareModel, $validated, $user);
            Log::info('LinkShare updated successfully', [
                'link_share_id' => $linkShare->id,
                'updated_fields' => array_keys($validated),
            ]);
            $this->sendLinkShareNotification($linkShare, $validated, $user, 'updated');

            return $this->successResponse($linkShare, 'Bağlantı yeniləndi');
        }, 'linkshare.update');
    }

    /**
     * Restore a disabled link share
     */
    public function restore(int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();

            $linkShare = \App\Models\LinkShare::findOrFail($id);

            // Check permission: only owner or superadmin can restore
            if (! ($this->linkSharingService->canViewAllLinks($user) || $linkShare->shared_by === $user->id)) {
                abort(403, 'Bu linki bərpa etmək icazəniz yoxdur');
            }

            if ($linkShare->status !== 'disabled') {
                abort(422, 'Yalnız disabled olan linklər bərpa edilə bilər');
            }

            $linkShare->update(['status' => 'active']);

            return $this->successResponse($linkShare, 'Bağlantı uğurla bərpa edildi');
        }, 'linkshare.restore');
    }

    /**
     * Permanently delete (hard delete) a disabled link share
     */
    public function forceDelete(int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();

            $linkShare = \App\Models\LinkShare::findOrFail($id);

            // Only allow hard delete of disabled links
            if ($linkShare->status !== 'disabled') {
                abort(422, 'Yalnız disabled olan linklər silinə bilər');
            }

            // Permission: superadmin, owner, or regionadmin within scope
            $canDelete = $this->linkSharingService->canViewAllLinks($user)
                || $linkShare->shared_by === $user->id
                || ($user->hasRole('regionadmin') && $this->isLinkInUserRegion($linkShare, $user));

            if (! $canDelete) {
                abort(403, 'Bu linki silmək icazəniz yoxdur');
            }

            $linkShare->delete(); // Hard delete

            return $this->successResponse(null, 'Bağlantı birdəfəlik silindi');
        }, 'linkshare.force_delete');
    }

    /**
     * Check if link belongs to user's region (for regionadmin permission)
     */
    protected function isLinkInUserRegion($linkShare, $user): bool
    {
        if (! $user->institution || $user->institution->level != 2) {
            return false;
        }

        $userRegionIds = $user->institution->getAllChildrenIds() ?? [];
        $userRegionIds[] = $user->institution->id;

        return in_array($linkShare->institution_id, $userRegionIds);
    }

    /**
     * Delete link share
     */
    public function destroy(int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();

            // Find the link share first
            $linkShare = \App\Models\LinkShare::findOrFail($id);

            $this->linkSharingService->deleteLinkShare($linkShare, $user);

            return $this->successResponse(null, 'Bağlantı silindi');
        }, 'linkshare.destroy');
    }

    /**
     * Access shared link by ID
     */
    public function access(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $user = Auth::user();
            $result = $this->linkSharingService->accessLinkById($id, $user, $request);

            return $this->successResponse($result, 'Bağlantıya giriş uğurludur');
        }, 'linkshare.access');
    }

    /**
     * Access shared link by token
     */
    public function accessByToken(Request $request, string $token): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $token) {
            $validated = $request->validate([
                'password' => 'nullable|string',
                'user_agent' => 'nullable|string|max:500',
                'referrer' => 'nullable|string|max:500',
            ]);

            $result = $this->linkSharingService->accessLink($token, $validated, $request);

            return $this->successResponse($result, 'Bağlantıya giriş uğurludur');
        }, 'linkshare.access_by_token');
    }

    /**
     * Download shared document
     */
    public function download(Request $request, string $token)
    {
        return $this->executeWithErrorHandling(function () use ($request, $token) {
            $validated = $request->validate([
                'password' => 'nullable|string',
            ]);

            return $this->linkSharingService->downloadSharedDocument($token, $validated, $request);
        }, 'linkshare.download');
    }

    /**
     * Bulk operations on link shares
     */
    public function bulkAction(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'action' => 'required|string|in:delete,activate,deactivate,extend_expiry',
                'link_ids' => 'required|array|min:1|max:100',
                'link_ids.*' => 'integer|exists:link_shares,id',
                'expires_at' => 'nullable|required_if:action,extend_expiry|date|after:now',
            ]);

            $user = Auth::user();
            $result = $this->linkSharingService->bulkAction(
                $validated['action'],
                $validated['link_ids'],
                $user,
                $validated
            );

            return $this->successResponse($result, 'Kütləvi əməliyyat tamamlandı');
        }, 'linkshare.bulk_action');
    }

    /**
     * Bulk create links via JSON payload or Excel upload
     */
    public function bulkCreate(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $user = Auth::user();

            if ($request->hasFile('file')) {
                $validated = $request->validate([
                    'file' => 'required|file|mimes:xlsx,xls,csv|max:5120',
                    'share_scope' => 'nullable|string|in:public,regional,sectoral,institutional,specific_users',
                    'is_featured' => 'nullable|boolean',
                ]);

                $result = $this->bulkUploadService->importFromExcel(
                    $validated['file'],
                    [
                        'share_scope' => $validated['share_scope'] ?? null,
                        'is_featured' => $validated['is_featured'] ?? null,
                    ],
                    $user
                );
            } else {
                $validated = $request->validate([
                    'links' => 'required|array|min:1|max:100',
                    'links.*.title' => 'required|string|max:255',
                    'links.*.url' => 'required|url|max:2048',
                    'links.*.description' => 'nullable|string|max:500',
                    'links.*.link_type' => 'nullable|string|in:external,video,form,document',
                    'links.*.share_scope' => 'required|string|in:public,regional,sectoral,institutional,specific_users',
                    'links.*.target_institutions' => 'nullable|array',
                    'links.*.target_institutions.*' => 'integer|exists:institutions,id',
                    'links.*.target_roles' => 'nullable|array',
                    'links.*.target_roles.*' => 'string',
                    'links.*.expires_at' => 'nullable|date|after:now',
                    'links.*.is_featured' => 'nullable|boolean',
                ]);

                $result = $this->linkSharingService->bulkCreateLinks($validated['links'], $user);
            }

            return $this->successResponse($result, 'Kütləvi link əlavə etmə tamamlandı');
        }, 'linkshare.bulk_create');
    }

    /**
     * Download Excel template for bulk uploads
     */
    public function downloadBulkTemplate()
    {
        return $this->executeWithErrorHandling(function () {
            return Excel::download(new LinkBulkTemplateExport, 'link-bulk-template.xlsx');
        }, 'linkshare.bulk_template');
    }

    /**
     * Get metadata to assist bulk uploads
     */
    public function getBulkMetadata(): JsonResponse
    {
        return $this->executeWithErrorHandling(function () {
            $institutions = Institution::query()
                ->select('id', 'name', 'short_name', 'institution_code', 'utis_code')
                ->where('is_active', true)
                ->orderBy('name')
                ->get();

            return $this->successResponse([
                'template_version' => config('link_bulk.template_version'),
                'required_columns' => config('link_bulk.required_columns'),
                'link_types' => config('link_bulk.allowed_link_types'),
                'max_rows' => config('link_bulk.max_rows'),
                'institutions' => $institutions,
            ], 'Bulk metadata yükləndi');
        }, 'linkshare.bulk_metadata');
    }

    /**
     * Get link sharing statistics
     */
    public function getStats(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'institution_id' => 'nullable|exists:institutions,id',
            ]);

            $user = Auth::user();
            $stats = $this->linkSharingService->getGlobalLinkStats($request, $user);

            return $this->successResponse($stats, 'Statistika alındı');
        }, 'linkshare.stats');
    }

    /**
     * Get popular links
     */
    public function getPopularLinks(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $user = Auth::user();
            $popularLinks = $this->linkSharingService->getPopularLinks($request, $user);

            return $this->successResponse($popularLinks, 'Popular links fetched successfully');
        }, 'linkshare.popular');
    }

    /**
     * Get featured links
     */
    public function getFeaturedLinks(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $user = Auth::user();
            $featuredLinks = $this->linkSharingService->getFeaturedLinks($request, $user);

            return $this->successResponse($featuredLinks, 'Featured links fetched successfully');
        }, 'linkshare.featured');
    }

    /**
     * Get comprehensive analytics
     */
    public function getAnalytics(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'include_trends' => 'boolean',
                'include_security' => 'boolean',
            ]);

            $user = Auth::user();
            $analytics = $this->linkAnalyticsService->getLinkAnalytics($request, $user);

            return $this->successResponse($analytics, 'Analitik məlumatlar alındı');
        }, 'linkshare.analytics');
    }

    /**
     * Get access statistics for specific link
     */
    public function getLinkAccessStats(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'link_id' => 'nullable|exists:link_shares,id',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
            ]);

            $user = Auth::user();
            $stats = $this->linkAnalyticsService->getLinkAccessStats($request, $user);

            return $this->successResponse($stats, 'Giriş statistikaları alındı');
        }, 'linkshare.access_stats');
    }

    /**
     * Get top performing links
     */
    public function getTopLinks(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'limit' => 'nullable|integer|min:1|max:50',
                'order_by' => 'nullable|string|in:access_count,unique_visitors,created_at',
                'period' => 'nullable|integer|min:1|max:365',
            ]);

            $user = Auth::user();
            $topLinks = $this->linkAnalyticsService->getTopLinks($request, $user);

            return $this->successResponse($topLinks, 'Ən yaxşı bağlantılar alındı');
        }, 'linkshare.top_links');
    }

    /**
     * Get sharing trends
     */
    public function getSharingTrends(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'period' => 'nullable|integer|min:1|max:365',
                'group_by' => 'nullable|string|in:day,week,month',
            ]);

            $user = Auth::user();
            $trends = $this->linkAnalyticsService->getSharingTrends($request, $user);

            return $this->successResponse($trends, 'Paylaşım tendensiyaları alındı');
        }, 'linkshare.sharing_trends');
    }

    /**
     * Get security analytics
     */
    public function getSecurityAnalytics(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'period' => 'nullable|integer|min:1|max:365',
            ]);

            $user = Auth::user();
            $security = $this->linkAnalyticsService->getSecurityAnalytics($request, $user);

            return $this->successResponse($security, 'Təhlükəsizlik analitikası alındı');
        }, 'linkshare.security_analytics');
    }

    /**
     * Regenerate link token
     */
    public function regenerateToken(int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();
            $linkShare = $this->linkSharingService->regenerateToken($id, $user);

            return $this->successResponse($linkShare, 'Bağlantı yeniləndi');
        }, 'linkshare.regenerate_token');
    }

    /**
     * Get user's recent activity
     */
    public function getRecentActivity(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'limit' => 'nullable|integer|min:1|max:50',
                'days' => 'nullable|integer|min:1|max:90',
            ]);

            $user = Auth::user();
            $activity = $this->linkSharingService->getRecentActivity($request, $user);

            return $this->successResponse($activity, 'Son fəaliyyət alındı');
        }, 'linkshare.recent_activity');
    }

    /**
     * Export link shares data
     */
    public function exportData(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'statuses' => 'nullable|array',
                'statuses.*' => 'string|in:active,expired,disabled',
                'format' => 'nullable|string|in:csv,excel,pdf',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'include_accesses' => 'boolean',
            ]);

            $user = Auth::user();
            $exportData = $this->linkSharingService->exportLinkData($request, $user);

            return $this->successResponse($exportData, 'Məlumatlar ixrac edildi');
        }, 'linkshare.export');
    }

    /**
     * Send link share notification to target users
     */
    private function sendLinkShareNotification($linkShare, array $shareData, $user, string $action = 'shared'): void
    {
        try {
            $targetUserIds = [];

            $targetInstitutions = $shareData['target_institutions'] ?? $linkShare['target_institutions'] ?? [];
            if (is_string($targetInstitutions)) {
                $decoded = json_decode($targetInstitutions, true);
                $targetInstitutions = is_array($decoded) ? $decoded : [];
            }

            if (! empty($targetInstitutions)) {
                $targetRoles = $shareData['target_roles']
                    ?? $linkShare['target_roles']
                    ?? config('notification_roles.resource_notification_roles', [
                        'sektoradmin', 'schooladmin', 'məktəbadmin', 'müəllim', 'teacher',
                    ]);

                $targetUserIds = \App\Services\InstitutionNotificationHelper::expandInstitutionsToUsers(
                    $targetInstitutions,
                    $targetRoles
                );
            }

            $directUsers = $shareData['target_users'] ?? $linkShare['target_users'] ?? [];
            if (! empty($directUsers)) {
                $targetUserIds = array_merge($targetUserIds, $directUsers);
            }

            $targetUserIds = array_values(array_unique(array_filter($targetUserIds)));

            if (! empty($targetUserIds)) {
                // Prepare notification data
                $notificationData = [
                    'creator_name' => $user->name,
                    'creator_institution' => $user->institution?->name ?? 'N/A',
                    'link_title' => $linkShare['title'] ?? 'Yeni Bağlantı',
                    'link_url' => $linkShare['url'] ?? '',
                    'link_type' => $shareData['link_type'] ?? $linkShare['link_type'] ?? 'external',
                    'description' => $shareData['description'] ?? $linkShare['description'] ?? '',
                    'share_scope' => $shareData['share_scope'] ?? $linkShare['share_scope'] ?? 'institutional',
                    'expires_at' => optional($linkShare->expires_at)->format('d.m.Y H:i'),
                    'action_url' => "/links/{$linkShare['id']}",
                ];

                $this->notificationService->sendLinkNotification(
                    $linkShare,
                    $action,
                    $targetUserIds,
                    $notificationData
                );
            }
        } catch (\Exception $e) {
            \Log::error('Failed to send link sharing notification', [
                'link_id' => $linkShare['id'] ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Get assigned resources for school admins and teachers
     */
    public function getAssignedResources(Request $request)
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            \Log::info('📋 LinkShareController: getAssignedResources called', [
                'user_id' => Auth::id(),
                'user_role' => Auth::user()?->roles?->first()?->name,
                'request_params' => $request->all(),
            ]);

            $user = Auth::user();

            // Check if user has permission to view assigned resources
            if (! $user->hasAnyRole(['sektoradmin', 'schooladmin', 'regionoperator', 'müəllim', 'teacher'])) {
                return $this->errorResponse('Bu səhifəni görməyə icazəniz yoxdur', 403);
            }

            // Get both links and documents assigned to user's institution
            $assignedResources = $this->linkSharingService->getAssignedResources($request, $user);

            \Log::info('📥 LinkShareController: getAssignedResources result', [
                'resources_count' => count($assignedResources),
                'user_institution' => $user->institution_id,
            ]);

            return $this->successResponse([
                'data' => $assignedResources,
                'total' => count($assignedResources),
            ], 'Təyin edilmiş resurslər alındı');
        }, 'linkshare.getAssignedResources');
    }

    /**
     * Get links filtered by department ID
     * Used in Link Database page for department tabs
     */
    public function getLinksByDepartmentType(Request $request, string $departmentId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $departmentId) {
            $user = Auth::user();

            // Validate department exists
            $department = \App\Models\Department::find($departmentId);
            if (! $department) {
                abort(404, 'Departament tapılmadı: ' . $departmentId);
            }

            // Get links that target this department (by ID)
            // Don't apply institution filter here - we want to see all links targeting this department
            $query = LinkShare::with(['sharedBy', 'institution'])
                ->where('status', 'active')
                ->where(function ($q) use ($departmentId) {
                    // Links that specifically target this department by ID
                    $q->whereJsonContains('target_departments', (int) $departmentId)
                        ->orWhereJsonContains('target_departments', (string) $departmentId);
                });

            // For non-superadmin, also show links they created
            if (! $user->hasRole('superadmin')) {
                $query->orWhere(function ($q) use ($user, $departmentId) {
                    $q->where('shared_by', $user->id)
                        ->where(function ($q2) use ($departmentId) {
                            $q2->whereJsonContains('target_departments', (int) $departmentId)
                                ->orWhereJsonContains('target_departments', (string) $departmentId);
                        });
                });
            }

            // Apply search if provided
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'LIKE', "%{$search}%")
                        ->orWhere('description', 'LIKE', "%{$search}%")
                        ->orWhere('url', 'LIKE', "%{$search}%");
                });
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'created_at');
            $sortDirection = $request->get('sort_direction', 'desc');
            $query->orderBy($sortBy, $sortDirection);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $links = $query->paginate($perPage);

            \Log::info('📚 LinkDatabase: getLinksByDepartmentType', [
                'department_id' => $departmentId,
                'user_id' => $user->id,
                'links_count' => $links->total(),
                'sql' => $query->toSql(),
            ]);

            return $this->successResponse($links, 'Departament linkləri alındı');
        }, 'linkshare.getLinksByDepartmentType');
    }

    /**
     * Get links filtered by sector
     * Used in Link Database page for sector tab
     */
    public function getLinksBySector(Request $request, int $sectorId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $sectorId) {
            $user = Auth::user();

            // Verify sector exists and is active
            $sector = \App\Models\Institution::where('id', $sectorId)
                ->where('is_active', true)
                ->where(function ($q) {
                    $q->where('type', 'sektor')
                        ->orWhere('type', 'sector')
                        ->orWhere('level', 3);
                })
                ->first();

            if (! $sector) {
                abort(404, 'Sektor tapılmadı');
            }

            // 🆕 Enhanced permission check
            if ($user->hasRole('sektoradmin') && $sectorId !== $user->institution_id) {
                \Log::warning('📚 LinkDatabase: Sektoradmin attempting to access unauthorized sector', [
                    'user_id' => $user->id,
                    'user_institution_id' => $user->institution_id,
                    'requested_sector_id' => $sectorId,
                    'sector_name' => $sector->name,
                ]);
                abort(403, 'Bu sektora baxmaq icazəniz yoxdur');
            }

            if (($user->hasRole('regionadmin') || $user->hasRole('regionoperator')) 
                && $sector->parent_id !== $user->institution_id) {
                \Log::warning('📚 LinkDatabase: Region user attempting to access unauthorized sector', [
                    'user_id' => $user->id,
                    'user_role' => $user->role,
                    'user_institution_id' => $user->institution_id,
                    'requested_sector_id' => $sectorId,
                    'sector_parent_id' => $sector->parent_id,
                    'sector_name' => $sector->name,
                ]);
                abort(403, 'Bu regionun sektoruna baxmaq icazəniz yoxdur');
            }

            // Get links that target this sector (institution)
            $query = LinkShare::with(['sharedBy', 'institution'])
                ->where('status', 'active')
                ->where(function ($q) use ($sectorId) {
                    $q->whereJsonContains('target_institutions', $sectorId)
                        ->orWhereJsonContains('target_institutions', (string) $sectorId);
                });

            // For non-superadmin, also show links they created
            if (! $user->hasRole('superadmin')) {
                $query->orWhere(function ($q) use ($user, $sectorId) {
                    $q->where('shared_by', $user->id)
                        ->where(function ($q2) use ($sectorId) {
                            $q2->whereJsonContains('target_institutions', $sectorId)
                                ->orWhereJsonContains('target_institutions', (string) $sectorId);
                        });
                });
            }

            // Apply search if provided
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'LIKE', "%{$search}%")
                        ->orWhere('description', 'LIKE', "%{$search}%")
                        ->orWhere('url', 'LIKE', "%{$search}%");
                });
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'created_at');
            $sortDirection = $request->get('sort_direction', 'desc');
            $query->orderBy($sortBy, $sortDirection);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $links = $query->paginate($perPage);

            \Log::info('📚 LinkDatabase: getLinksBySector', [
                'user_id' => $user->id,
                'user_role' => $user->role,
                'sector_id' => $sectorId,
                'sector_name' => $sector->name,
                'sector_parent_id' => $sector->parent_id,
                'links_count' => $links->total(),
                'per_page' => $perPage,
            ]);

            return $this->successResponse($links, 'Sektor linkləri alındı');
        }, 'linkshare.getLinksBySector');
    }

    /**
     * Get sectors for Link Database dropdown
     */
    public function getSectorsForLinkDatabase(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () {
            $user = Auth::user();

            // Get sectors based on user's access level
            // Try both 'sektor' type and level 3
            $query = \App\Models\Institution::where('is_active', true)
                ->where(function ($q) {
                    $q->where('type', 'sektor')
                        ->orWhere('type', 'sector')
                        ->orWhere('level', 3);
                })
                ->select('id', 'name', 'short_name', 'parent_id', 'type', 'level');

            // Apply regional filtering with enhanced logging
            if ($user->hasRole('superadmin')) {
                // SuperAdmin sees all sectors
                \Log::info('📚 LinkDatabase: SuperAdmin accessing all sectors');
            } elseif ($user->hasRole('regionadmin') || $user->hasRole('regionoperator')) {
                // Region admin sees only their region's sectors
                $regionId = $user->institution_id;
                $query->where('parent_id', $regionId);
                \Log::info('📚 LinkDatabase: Region user accessing sectors', [
                    'user_role' => $user->role,
                    'region_id' => $regionId,
                ]);
            } elseif ($user->hasRole('sektoradmin')) {
                // Sector admin sees ONLY their sector
                $query->where('id', $user->institution_id);
                \Log::info('📚 LinkDatabase: Sektoradmin accessing own sector', [
                    'user_institution_id' => $user->institution_id,
                ]);
            } else {
                // Other roles see no sectors
                $query->whereRaw('1 = 0');
                \Log::warning('📚 LinkDatabase: User without sector access attempted access', [
                    'user_id' => $user->id,
                    'user_role' => $user->role,
                ]);
            }

            $sectors = $query->orderBy('name')->get();

            \Log::info('📚 LinkDatabase: getSectorsForLinkDatabase', [
                'user_id' => $user->id,
                'sectors_count' => $sectors->count(),
                'sectors' => $sectors->pluck('name', 'id'),
            ]);

            return $this->successResponse($sectors, 'Sektorlar alındı');
        }, 'linkshare.getSectorsForLinkDatabase');
    }

    /**
     * Get departments from database for Link Database tabs
     * Returns actual departments, not hardcoded types
     */
    public function getDepartmentTypes(): JsonResponse
    {
        return $this->executeWithErrorHandling(function () {
            $user = Auth::user();

            // Get departments based on user's access level
            $query = \App\Models\Department::where('is_active', true)
                ->select('id', 'name', 'short_name', 'department_type', 'institution_id');

            // Apply regional filtering
            if ($user->hasRole('superadmin')) {
                // SuperAdmin sees all departments
            } elseif ($user->hasRole('regionadmin') || $user->hasRole('regionoperator')) {
                // Region admin sees departments in their region hierarchy
                $userInstitution = $user->institution;
                if ($userInstitution) {
                    $childIds = $userInstitution->getAllChildrenIds() ?? [];
                    $scopeIds = array_values(array_unique(array_merge([$userInstitution->id], $childIds)));
                    $query->whereIn('institution_id', $scopeIds);
                }
            } elseif ($user->hasRole('sektoradmin')) {
                // Sector admin sees departments in their sector
                $userInstitution = $user->institution;
                if ($userInstitution) {
                    $childIds = $userInstitution->getAllChildrenIds() ?? [];
                    $scopeIds = array_values(array_unique(array_merge([$userInstitution->id], $childIds)));
                    $query->whereIn('institution_id', $scopeIds);
                }
            } else {
                // Other roles see no departments
                $query->whereRaw('1 = 0');
            }

            $departments = $query->orderBy('name')->get()->map(function ($dept) {
                return [
                    'id' => $dept->id,
                    'key' => (string) $dept->id, // Use ID as key for consistency
                    'name' => $dept->name,
                    'short_name' => $dept->short_name,
                    'label' => $dept->name,
                    'department_type' => $dept->department_type,
                    'institution_id' => $dept->institution_id,
                ];
            });

            return $this->successResponse($departments, 'Departamentlər alındı');
        }, 'linkshare.getDepartmentTypes');
    }

    /**
     * Create a link for a specific department (by ID)
     * Also supports selecting additional target departments and sectors
     */
    public function createLinkForDepartment(Request $request, string $departmentId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $departmentId) {
            // Validate department exists
            $department = \App\Models\Department::find($departmentId);
            if (! $department) {
                abort(404, 'Departament tapılmadı: ' . $departmentId);
            }

            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'url' => 'required|url',
                'description' => 'nullable|string|max:500',
                'link_type' => 'required|string|in:external,video,form,document',
                'is_featured' => 'boolean',
                'expires_at' => 'nullable|date|after:now',
                // Additional targets
                'target_departments' => 'nullable|array',
                'target_departments.*' => 'integer|exists:departments,id',
                'target_institutions' => 'nullable|array',
                'target_institutions.*' => 'integer|exists:institutions,id',
            ]);

            $user = Auth::user();

            // Merge the current department with any additional targets
            $targetDepartments = $validated['target_departments'] ?? [];
            if (! in_array((int) $departmentId, $targetDepartments)) {
                array_unshift($targetDepartments, (int) $departmentId);
            }
            $validated['target_departments'] = $targetDepartments;

            // Set share scope based on targets
            if (! empty($validated['target_institutions'])) {
                $validated['share_scope'] = 'sectoral';
            } else {
                $validated['share_scope'] = 'regional';
            }

            $linkShare = $this->linkSharingService->createLinkShare($validated, $user);

            return $this->successResponse($linkShare, 'Link uğurla yaradıldı', 201);
        }, 'linkshare.createLinkForDepartment');
    }

    /**
     * Create a link for a specific sector
     * Also supports selecting additional target departments and sectors
     */
    public function createLinkForSector(Request $request, int $sectorId): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $sectorId) {
            // Verify sector exists
            $sector = \App\Models\Institution::where('id', $sectorId)
                ->where('level', 3)
                ->first();

            if (! $sector) {
                abort(404, 'Sektor tapılmadı');
            }

            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'url' => 'required|url',
                'description' => 'nullable|string|max:500',
                'link_type' => 'required|string|in:external,video,form,document',
                'is_featured' => 'boolean',
                'expires_at' => 'nullable|date|after:now',
                // Additional targets
                'target_departments' => 'nullable|array',
                'target_departments.*' => 'integer|exists:departments,id',
                'target_institutions' => 'nullable|array',
                'target_institutions.*' => 'integer|exists:institutions,id',
            ]);

            $user = Auth::user();

            // Merge the current sector with any additional institution targets
            $targetInstitutions = $validated['target_institutions'] ?? [];
            if (! in_array($sectorId, $targetInstitutions)) {
                array_unshift($targetInstitutions, $sectorId);
            }
            $validated['target_institutions'] = $targetInstitutions;
            $validated['share_scope'] = 'sectoral';

            $linkShare = $this->linkSharingService->createLinkShare($validated, $user);

            return $this->successResponse($linkShare, 'Link uğurla yaradıldı', 201);
        }, 'linkshare.createLinkForSector');
    }

    /**
     * Helper: Apply regional filtering based on user role
     */
    private function applyUserRegionalFilter($query, $user): void
    {
        if ($user->hasRole('superadmin')) {
            return; // No filter for superadmin
        }

        $userInstitution = $user->institution;
        if (! $userInstitution) {
            $query->where('shared_by', $user->id);

            return;
        }

        if ($user->hasRole('regionadmin') || $user->hasRole('regionoperator')) {
            // Region admin/operator sees all links in their region
            $childIds = $userInstitution->getAllChildrenIds() ?? [];
            $scopeIds = array_values(array_unique(array_merge([$userInstitution->id], $childIds)));
            $query->whereIn('institution_id', $scopeIds);
        } elseif ($user->hasRole('sektoradmin')) {
            // Sector admin sees links in their sector
            $childIds = $userInstitution->getAllChildrenIds() ?? [];
            $scopeIds = array_values(array_unique(array_merge([$userInstitution->id], $childIds)));
            $query->whereIn('institution_id', $scopeIds);
        }
    }

    /**
     * Track link click for analytics
     */
    public function recordClick(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $user = Auth::user();

            $linkShare = LinkShare::findOrFail($id);
            $linkShare->increment('click_count');

            // Log access
            \App\Models\LinkAccessLog::create([
                'link_share_id' => $id,
                'user_id' => $user?->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'referrer' => $request->header('referer'),
            ]);

            return $this->successResponse(['click_count' => $linkShare->click_count], 'Klik qeydə alındı');
        }, 'linkshare.recordClick');
    }

    /**
     * Get tracking activity for links
     */
    public function getTrackingActivity(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $user = Auth::user();

            $query = \App\Models\LinkAccessLog::with(['linkShare', 'user'])
                ->orderBy('created_at', 'desc');

            // Apply filters
            if ($request->filled('link_id')) {
                $query->where('link_share_id', $request->link_id);
            }

            if ($request->filled('date_from')) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }

            if ($request->filled('date_to')) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }

            $perPage = $request->get('per_page', 50);
            $activity = $query->paginate($perPage);

            return $this->successResponse($activity, 'Aktivlik məlumatları alındı');
        }, 'linkshare.getTrackingActivity');
    }

    /**
     * Get link access history
     */
    public function getLinkHistory(Request $request, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $id) {
            $linkShare = LinkShare::findOrFail($id);

            $history = \App\Models\LinkAccessLog::where('link_share_id', $id)
                ->with('user')
                ->orderBy('created_at', 'desc')
                ->limit($request->get('limit', 100))
                ->get();

            return $this->successResponse([
                'link' => $linkShare,
                'history' => $history,
                'total_clicks' => $linkShare->click_count,
            ], 'Link tarixçəsi alındı');
        }, 'linkshare.getLinkHistory');
    }
}
