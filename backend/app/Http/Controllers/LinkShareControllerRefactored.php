<?php

namespace App\Http\Controllers;

use App\Http\Controllers\BaseController;
use App\Services\LinkSharingService;
use App\Services\LinkAnalyticsService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class LinkShareControllerRefactored extends BaseController
{
    protected $linkSharingService;
    protected $linkAnalyticsService;
    protected $notificationService;

    public function __construct(
        LinkSharingService $linkSharingService,
        LinkAnalyticsService $linkAnalyticsService,
        NotificationService $notificationService
    ) {
        $this->linkSharingService = $linkSharingService;
        $this->linkAnalyticsService = $linkAnalyticsService;
        $this->notificationService = $notificationService;
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
                'is_active' => 'nullable|boolean',
                'has_password' => 'nullable|boolean',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'sort_by' => 'nullable|string|in:created_at,expires_at,access_count,document_name',
                'sort_direction' => 'nullable|string|in:asc,desc',
                'per_page' => 'nullable|integer|min:1|max:100'
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
                'access_limit' => 'nullable|integer|min:1|max:100'
            ]);

            $user = Auth::user();
            $linkShare = $this->linkSharingService->getLinkShare($id, $request, $user);
            
            return $this->successResponse($linkShare, 'Bağlantı məlumatları alındı');
        }, 'linkshare.show');
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
                'share_scope' => 'required|string|in:public,regional,sectoral,institutional',
                'is_featured' => 'boolean',
                'expires_at' => 'nullable|date|after:now',
                'target_institutions' => 'nullable|array',
                'target_institutions.*' => 'integer|exists:institutions,id',
                'target_roles' => 'nullable|array',
                'target_roles.*' => 'string',
                'target_departments' => 'nullable|array',
                'target_departments.*' => 'integer',
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
                'share_scope' => 'sometimes|required|string|in:public,regional,sectoral,institutional',
                'is_featured' => 'boolean',
                'expires_at' => 'nullable|date|after:now',
                'target_institutions' => 'nullable|array',
                'target_institutions.*' => 'integer|exists:institutions,id',
                'target_roles' => 'nullable|array',
                'target_roles.*' => 'string',
                'target_departments' => 'nullable|array',
                'target_departments.*' => 'integer',
                'password' => 'nullable|string|min:6|max:50',
                'access_limit' => 'nullable|integer|min:1|max:10000',
                'allow_download' => 'boolean',
                'notify_on_access' => 'boolean',
                'custom_message' => 'nullable|string|max:1000',
                'is_active' => 'boolean'
            ]);

            $user = Auth::user();
            $linkShare = $this->linkSharingService->updateLinkShare($id, $validated, $user);
            
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
            $this->linkSharingService->deleteLinkShare($id, $user);
            
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
                'referrer' => 'nullable|string|max:500'
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
                'password' => 'nullable|string'
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
                'expires_at' => 'nullable|required_if:action,extend_expiry|date|after:now'
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
     * Get link sharing statistics
     */
    public function getStats(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'institution_id' => 'nullable|exists:institutions,id'
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
                'include_security' => 'boolean'
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
                'date_to' => 'nullable|date|after_or_equal:date_from'
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
                'period' => 'nullable|integer|min:1|max:365'
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
                'group_by' => 'nullable|string|in:day,week,month'
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
                'period' => 'nullable|integer|min:1|max:365'
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
                'days' => 'nullable|integer|min:1|max:90'
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
                'include_accesses' => 'boolean'
            ]);

            $user = Auth::user();
            $exportData = $this->linkSharingService->exportLinkData($request, $user);
            
            return $this->successResponse($exportData, 'Məlumatlar ixrac edildi');
        }, 'linkshare.export');
    }

    /**
     * Send link share notification to target users
     */
    private function sendLinkShareNotification($linkShare, array $shareData, $user): void
    {
        try {
            $targetUserIds = [];

            // Get target user IDs based on institutions and roles
            if (isset($shareData['target_institutions']) && !empty($shareData['target_institutions'])) {
                $targetRoles = config('notification_roles.document_notification_roles', [
                    'schooladmin', 'məktəbadmin', 'müəllim', 'teacher'
                ]);

                $targetUserIds = \App\Services\InstitutionNotificationHelper::expandInstitutionsToUsers(
                    $shareData['target_institutions'],
                    $targetRoles
                );
            }

            if (!empty($targetUserIds)) {
                // Prepare notification data
                $notificationData = [
                    'creator_name' => $user->name,
                    'creator_institution' => $user->institution?->name ?? 'N/A',
                    'link_title' => $linkShare['title'] ?? 'Yeni Bağlantı',
                    'link_url' => $linkShare['url'] ?? '',
                    'link_type' => $shareData['link_type'] ?? 'external',
                    'description' => $shareData['description'] ?? '',
                    'share_scope' => $shareData['share_scope'] ?? 'institutional',
                    'expires_at' => isset($shareData['expires_at']) ? date('d.m.Y H:i', strtotime($shareData['expires_at'])) : null,
                    'action_url' => "/links/{$linkShare['id']}"
                ];

                $this->notificationService->sendLinkNotification(
                    $linkShare,
                    'shared',
                    $targetUserIds,
                    $notificationData
                );
            }
        } catch (\Exception $e) {
            \Log::error('Failed to send link sharing notification', [
                'link_id' => $linkShare['id'] ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
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
                'request_params' => $request->all()
            ]);

            $user = Auth::user();

            // Check if user has permission to view assigned resources
            if (!$user->hasAnyRole(['schooladmin', 'məktəbadmin', 'muellim', 'teacher'])) {
                return $this->errorResponse('Bu səhifəni görməyə icazəniz yoxdur', 403);
            }

            // Get both links and documents assigned to user's institution
            $assignedResources = $this->linkSharingService->getAssignedResources($request, $user);

            \Log::info('📥 LinkShareController: getAssignedResources result', [
                'resources_count' => count($assignedResources),
                'user_institution' => $user->institution_id
            ]);

            return $this->successResponse([
                'data' => $assignedResources,
                'total' => count($assignedResources)
            ], 'Təyin edilmiş resurslər alındı');

        }, 'linkshare.getAssignedResources');
    }
}