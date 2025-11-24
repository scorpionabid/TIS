<?php

namespace App\Services\LinkSharing\Domains\Crud;

use App\Models\LinkShare;
use App\Services\LinkSharing\Domains\Permission\LinkPermissionService;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Link CRUD Manager
 *
 * Handles create, update, delete operations for links
 * with transaction safety and validation.
 */
class LinkCrudManager
{
    public function __construct(
        protected LinkPermissionService $permissionService
    ) {}

    /**
     * Create new link share
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 70-123)
     */
    public function createLinkShare(array $data, $user)
    {
        return DB::transaction(function () use ($data, $user) {
            // Validate user can create link with specified scope
            if (! $this->permissionService->canCreateLinkWithScope($user, $data['share_scope'])) {
                throw new Exception('Bu paylaşım sahəsi üçün icazəniz yoxdur', 403);
            }

            // Generate unique link hash
            // CRITICAL: Collision prevention (lines 79-81)
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
                'target_users' => $data['target_users'] ?? null,
                'target_users' => $data['target_users'] ?? null,
                'shared_by' => $user->id,
                'institution_id' => $data['institution_id'] ?? $user->institution_id,
                'link_hash' => $linkHash,
                'is_active' => $data['is_active'] ?? true,
                'is_featured' => $data['is_featured'] ?? false,
                'expires_at' => ! empty($data['expires_at']) ? Carbon::parse($data['expires_at']) : null,
                'priority' => $data['priority'] ?? 'normal',
                'tags' => $data['tags'] ?? null,
                'access_restrictions' => $data['access_restrictions'] ?? null,
                'metadata' => $data['metadata'] ?? null,
            ];

            Log::info('Creating LinkShare with data:', $linkData);

            $linkShare = LinkShare::create($linkData);

            return $linkShare->load(['sharedBy', 'institution']);
        });
    }

    /**
     * Update link share
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 128-167)
     */
    public function updateLinkShare($linkShare, array $data, $user)
    {
        // Check if user can modify this link
        if (! $this->permissionService->canModifyLink($user, $linkShare)) {
            throw new Exception('Bu linki dəyişmək icazəniz yoxdur', 403);
        }

        return DB::transaction(function () use ($linkShare, $data, $user) {
            // Validate scope change if provided
            if (isset($data['share_scope']) && $data['share_scope'] !== $linkShare->share_scope) {
                if (! $this->permissionService->canCreateLinkWithScope($user, $data['share_scope'])) {
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
                'target_users' => $data['target_users'] ?? null,
                'is_active' => $data['is_active'] ?? null,
                'is_featured' => $data['is_featured'] ?? null,
                'expires_at' => isset($data['expires_at']) ? ($data['expires_at'] ? Carbon::parse($data['expires_at']) : null) : null,
                'priority' => $data['priority'] ?? null,
                'tags' => $data['tags'] ?? null,
                'access_restrictions' => $data['access_restrictions'] ?? null,
                'metadata' => $data['metadata'] ?? null,
            ], function ($value) {
                return $value !== null;
            });

            $linkShare->update($updateData);

            return $linkShare->fresh(['sharedBy', 'institution']);
        });
    }

    /**
     * Delete link share
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 172-187)
     */
    public function deleteLinkShare($linkShare, $user)
    {
        if (! $this->permissionService->canModifyLink($user, $linkShare)) {
            throw new Exception('Bu linki silmək icazəniz yoxdur', 403);
        }

        return DB::transaction(function () use ($linkShare) {
            // Soft delete the link by setting status to disabled
            $linkShare->update(['status' => 'disabled']);

            // Or permanently delete if required
            // $linkShare->delete();

            return true;
        });
    }

    /**
     * Bulk create links
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 322-345)
     */
    public function bulkCreateLinks(array $linksData, $user)
    {
        return DB::transaction(function () use ($linksData, $user) {
            $results = [
                'created' => 0,
                'failed' => 0,
                'errors' => [],
                'links' => [],
            ];

            foreach ($linksData as $index => $linkData) {
                try {
                    $link = $this->createLinkShare($linkData, $user);
                    $results['created']++;
                    $results['links'][] = $link;
                } catch (Exception $e) {
                    $results['failed']++;
                    $results['errors'][] = 'Link ' . ($index + 1) . ': ' . $e->getMessage();
                }
            }

            return $results;
        });
    }
}
