<?php

namespace App\Http\Controllers;

use App\Http\Controllers\BaseController;
use App\Services\LinkSharingService;
use App\Services\LinkAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class LinkShareControllerRefactored extends BaseController
{
    protected $linkSharingService;
    protected $linkAnalyticsService;

    public function __construct(
        LinkSharingService $linkSharingService,
        LinkAnalyticsService $linkAnalyticsService
    ) {
        $this->linkSharingService = $linkSharingService;
        $this->linkAnalyticsService = $linkAnalyticsService;
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
            $result = $this->linkSharingService->getLinkShares($request, $user);
            
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
                'document_id' => 'required|exists:documents,id',
                'password' => 'nullable|string|min:6|max:50',
                'expires_at' => 'nullable|date|after:now',
                'access_limit' => 'nullable|integer|min:1|max:10000',
                'description' => 'nullable|string|max:500',
                'allow_download' => 'boolean',
                'notify_on_access' => 'boolean',
                'custom_message' => 'nullable|string|max:1000'
            ]);

            $user = Auth::user();
            $linkShare = $this->linkSharingService->createLinkShare($validated, $user);
            
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
                'password' => 'nullable|string|min:6|max:50',
                'expires_at' => 'nullable|date|after:now',
                'access_limit' => 'nullable|integer|min:1|max:10000',
                'description' => 'nullable|string|max:500',
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
     * Access shared link
     */
    public function access(Request $request, string $token): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $token) {
            $validated = $request->validate([
                'password' => 'nullable|string',
                'user_agent' => 'nullable|string|max:500',
                'referrer' => 'nullable|string|max:500'
            ]);

            $result = $this->linkSharingService->accessLink($token, $validated, $request);
            
            return $this->successResponse($result, 'Bağlantıya giriş uğurludur');
        }, 'linkshare.access');
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
            $stats = $this->linkSharingService->getLinkStats($request, $user);
            
            return $this->successResponse($stats, 'Statistika alındı');
        }, 'linkshare.stats');
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
}