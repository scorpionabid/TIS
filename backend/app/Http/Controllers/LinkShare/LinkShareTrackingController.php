<?php

namespace App\Http\Controllers\LinkShare;

use App\Http\Controllers\BaseController;
use App\Models\LinkAccessLog;
use App\Models\LinkShare;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LinkShareTrackingController extends BaseController
{
    /**
     * Track link click for analytics
     */
    public function recordClick(Request $request, LinkShare $linkShare): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $linkShare) {
            $user = Auth::user();

            $linkShare->increment('click_count');

            LinkAccessLog::create([
                'link_share_id' => $linkShare->id,
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
            $query = LinkAccessLog::with(['linkShare', 'user'])
                ->orderBy('created_at', 'desc');

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
    public function getLinkHistory(Request $request, LinkShare $linkShare): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $linkShare) {
            $history = LinkAccessLog::where('link_share_id', $linkShare->id)
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
