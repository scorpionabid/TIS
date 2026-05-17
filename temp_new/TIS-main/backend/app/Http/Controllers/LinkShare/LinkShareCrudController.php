<?php

namespace App\Http\Controllers\LinkShare;

use App\Http\Controllers\BaseController;
use App\Http\Controllers\LinkShare\Concerns\HandlesLinkShareHelpers;
use App\Models\LinkShare;
use App\Services\LinkSharingService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class LinkShareCrudController extends BaseController
{
    use HandlesLinkShareHelpers;

    public function __construct(
        protected LinkSharingService $linkSharingService,
        protected NotificationService $notificationService,
    ) {}

    /**
     * Get all link shares with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $request->validate([
                'search' => 'nullable|string|max:255',
                'document_type' => 'nullable|string|in:link,pdf,doc,docx,xls,xlsx,png,jpg,jpeg,gif,other',
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
    public function show(Request $request, LinkShare $linkShare): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $linkShare) {
            $request->validate([
                'include_accesses' => 'boolean',
                'access_limit' => 'nullable|integer|min:1|max:100',
            ]);

            $user = Auth::user();
            // Optional: You might still want to pass it to service if service handles complex logic
            // but for simple cases $linkShare is already loaded.
            // Let's keep service call if it does specific filtering or logging.
            $result = $this->linkSharingService->getLinkShare($linkShare->id, $request, $user);

            return $this->successResponse($result, 'Bağlantı məlumatları alındı');
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

            $this->sendLinkShareNotification($linkShare, $validated, $user);

            return $this->successResponse($linkShare, 'Bağlantı uğurla yaradıldı', 201);
        }, 'linkshare.store');
    }

    /**
     * Update link share
     */
    public function update(Request $request, LinkShare $linkShare): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $linkShare) {
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
                'link_share_id' => $linkShare->id,
                'validated_payload' => $validated,
                'user_id' => $user?->id,
                'route' => $request->path(),
            ]);

            // Model is already injected, ensure relations are loaded if needed
            $linkShare->load(['sharedBy', 'institution']);

            $updatedLinkShare = $this->linkSharingService->updateLinkShare($linkShare, $validated, $user);
            Log::info('LinkShare updated successfully', [
                'link_share_id' => $updatedLinkShare->id,
                'updated_fields' => array_keys($validated),
            ]);

            $this->sendLinkShareNotification($updatedLinkShare, $validated, $user, 'updated');

            return $this->successResponse($updatedLinkShare, 'Bağlantı yeniləndi');
        }, 'linkshare.update');
    }

    /**
     * Delete link share (soft disable)
     */
    public function destroy(LinkShare $linkShare): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($linkShare) {
            $user = Auth::user();
            $this->linkSharingService->deleteLinkShare($linkShare, $user);

            return $this->successResponse(null, 'Bağlantı silindi');
        }, 'linkshare.destroy');
    }

    /**
     * Restore a disabled link share
     */
    public function restore(LinkShare $linkShare): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($linkShare) {
            $user = Auth::user();

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
    public function forceDelete(LinkShare $linkShare): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($linkShare) {
            $user = Auth::user();

            $canDelete = $this->linkSharingService->canViewAllLinks($user)
                || $linkShare->shared_by === $user->id
                || ($user->hasRole('regionadmin') && $this->isLinkInUserRegion($linkShare, $user));

            if (! $canDelete) {
                abort(403, 'Bu linki silmək icazəniz yoxdur');
            }

            $linkShare->delete();

            return $this->successResponse(null, 'Bağlantı birdəfəlik silindi');
        }, 'linkshare.force_delete');
    }
}
