<?php

namespace App\Http\Controllers\LinkShare;

use App\Http\Controllers\BaseController;
use App\Services\LinkAnalyticsService;
use App\Services\LinkSharingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LinkShareAnalyticsController extends BaseController
{
    public function __construct(
        protected LinkSharingService $linkSharingService,
        protected LinkAnalyticsService $linkAnalyticsService,
    ) {}

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
}
