<?php

namespace App\Services\LinkSharing\Domains\Access;

use App\Models\LinkShare;
use App\Models\LinkAccessLog;
use App\Services\LinkSharing\Domains\Permission\LinkPermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Exception;

/**
 * Link Access Manager
 *
 * Handles link access operations, click tracking, and access logging.
 */
class LinkAccessManager
{
    public function __construct(
        protected LinkPermissionService $permissionService
    ) {}

    /**
     * Access link and log the access
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 192-219)
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
        if (!$this->permissionService->canAccessLink($user, $linkShare)) {
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
     * Record link click/access
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 301-317)
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
     * Access link by ID
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 711-728)
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
     * Log link access
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 642-652)
     */
    public function logLinkAccess($linkShare, $request, $user = null): void
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
}
