<?php

namespace App\Http\Controllers\LinkShare;

use App\Exports\LinkBulkTemplateExport;
use App\Http\Controllers\BaseController;
use App\Models\Institution;
use App\Services\LinkSharing\LinkBulkUploadService;
use App\Services\LinkSharingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;

class LinkShareBulkController extends BaseController
{
    public function __construct(
        protected LinkSharingService $linkSharingService,
        protected LinkBulkUploadService $bulkUploadService,
    ) {}

    /**
     * Bulk operations on link shares (delete, activate, deactivate, extend_expiry)
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
}
