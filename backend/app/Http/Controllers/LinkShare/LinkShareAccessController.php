<?php

namespace App\Http\Controllers\LinkShare;

use App\Http\Controllers\BaseController;
use App\Models\Document;
use App\Models\LinkShare;
use App\Models\ResourceView;
use App\Services\LinkSharingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class LinkShareAccessController extends BaseController
{
    public function __construct(
        protected LinkSharingService $linkSharingService,
    ) {}

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

            $result = $this->linkSharingService->downloadSharedDocument($token, $validated, $request);

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
     * Get assigned resources for school admins and teachers
     */
    public function getAssignedResources(Request $request)
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            Log::info('📋 LinkShareController: getAssignedResources called', [
                'user_id' => Auth::id(),
                'user_role' => Auth::user()?->roles?->first()?->name,
                'request_params' => $request->all(),
            ]);

            $user = Auth::user();

            if (! $user->hasAnyRole(['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'regionoperator', 'teacher', 'müəllim'])) {
                return $this->errorResponse('Bu səhifəni görməyə icazəniz yoxdur', 403);
            }

            $assignedResources = $this->linkSharingService->getAssignedResources($request, $user);

            Log::info('📥 LinkShareController: getAssignedResources result', [
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
     * Mark a resource as viewed by the current user
     */
    public function markAsViewed(Request $request, string $type, int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($type, $id) {
            $user = Auth::user();

            if ($type === 'link') {
                $resource = LinkShare::find($id);
                if (! $resource) {
                    return $this->errorResponse('Bağlantı tapılmadı', 404);
                }
                if (! $resource->canBeAccessedBy($user)) {
                    return $this->errorResponse('Bu resursa giriş icazəniz yoxdur', 403);
                }
            } elseif ($type === 'document') {
                $resource = Document::withoutGlobalScope(\App\Scopes\InstitutionScope::class)->find($id);
                if (! $resource) {
                    return $this->errorResponse('Sənəd tapılmadı', 404);
                }
                if (! $resource->canAccess($user)) {
                    return $this->errorResponse('Bu sənədə giriş icazəniz yoxdur', 403);
                }
            }

            $view = ResourceView::where([
                'user_id' => $user->id,
                'resource_id' => $id,
                'resource_type' => $type,
            ])->first();

            if ($view) {
                $view->update([
                    'last_viewed_at' => now(),
                    'view_count' => $view->view_count + 1,
                ]);
            } else {
                ResourceView::create([
                    'user_id' => $user->id,
                    'resource_id' => $id,
                    'resource_type' => $type,
                    'first_viewed_at' => now(),
                    'last_viewed_at' => now(),
                    'view_count' => 1,
                ]);
            }

            return $this->successResponse(null, 'Resurs baxılmış kimi işarələndi');
        }, 'linkshare.markAsViewed');
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
     * Regenerate link token
     */
    public function regenerateToken(int $id): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($id) {
            $user = Auth::user();
            $linkShare = LinkShare::findOrFail($id);
            $newToken = $this->linkSharingService->regenerateToken($linkShare, $user);

            return $this->successResponse(['token' => $newToken], 'Bağlantı tokeni yeniləndi');
        }, 'linkshare.regenerate_token');
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
}
