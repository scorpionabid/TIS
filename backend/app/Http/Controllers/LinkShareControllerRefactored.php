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
                'is_active' => 'nullable|boolean',
                'has_password' => 'nullable|boolean',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'sort_by' => 'nullable|string|in:created_at,expires_at,access_count,document_name',
                'sort_direction' => 'nullable|string|in:asc,desc',
                'per_page' => 'nullable|integer|min:1|max:500',
            ]);

            $user = Auth::user();
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
}
