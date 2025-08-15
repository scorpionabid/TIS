<?php

namespace App\Http\Controllers;

use App\Models\DocumentShare;
use App\Models\DocumentDownload;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class DocumentShareController extends Controller
{
    /**
     * Access shared document
     */
    public function access(Request $request, string $token): JsonResponse|Response
    {
        $share = DocumentShare::with(['document', 'sharedBy'])
                             ->byToken($token)
                             ->first();

        if (!$share) {
            return response()->json([
                'success' => false,
                'message' => 'Paylaşım linki tapılmadı.',
            ], 404);
        }

        // Check if share is valid
        if (!$share->isValid()) {
            return response()->json([
                'success' => false,
                'message' => 'Paylaşım linkinin müddəti bitib və ya deaktiv edilib.',
                'expired' => $share->isExpired(),
                'download_limit_reached' => $share->isDownloadLimitReached(),
            ], 403);
        }

        $document = $share->document;

        // Check if document exists and is accessible
        if (!$document || $document->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Sənəd mövcud deyil və ya deaktiv edilib.',
            ], 404);
        }

        // Check IP restrictions
        $clientIp = $request->ip();
        if (!$share->isIpAllowed($clientIp)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu IP ünvanından paylaşım linkinə giriş icazəsi yoxdur.',
            ], 403);
        }

        // Handle password protection
        if ($share->requires_password) {
            $password = $request->input('password');
            
            if (!$password) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu paylaşım üçün parol tələb olunur.',
                    'requires_password' => true,
                ], 401);
            }

            if (!$share->checkPassword($password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Yanlış parol.',
                    'requires_password' => true,
                ], 401);
            }
        }

        // Record access
        $share->recordAccess($clientIp, 'view');

        // Handle different actions
        $action = $request->input('action', 'info');

        switch ($action) {
            case 'download':
                return $this->handleDownload($share, $document, $clientIp);
            
            case 'preview':
                return $this->handlePreview($share, $document, $clientIp);
            
            default:
                return $this->handleInfo($share, $document);
        }
    }

    /**
     * Handle download action
     */
    protected function handleDownload(DocumentShare $share, $document, string $clientIp): Response|JsonResponse
    {
        if (!$share->can_download) {
            return response()->json([
                'success' => false,
                'message' => 'Bu paylaşım üçün endirmə icazəsi verilməyib.',
            ], 403);
        }

        if (!$document->is_downloadable) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sənəd endirmə üçün mövcud deyil.',
            ], 403);
        }

        if (!Storage::exists($document->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Fayl tapılmadı.',
            ], 404);
        }

        // Record download
        DocumentDownload::recordDownload(
            $document, 
            null, // Anonymous user
            $share, 
            'shared_link'
        );

        // Update share download count
        $share->recordAccess($clientIp, 'download');

        return Storage::download(
            $document->file_path,
            $document->original_filename,
            ['Content-Type' => $document->mime_type]
        );
    }

    /**
     * Handle preview action
     */
    protected function handlePreview(DocumentShare $share, $document, string $clientIp): Response|JsonResponse
    {
        if (!$share->can_view_online) {
            return response()->json([
                'success' => false,
                'message' => 'Bu paylaşım üçün onlayn görüntüləmə icazəsi verilməyib.',
            ], 403);
        }

        if (!$document->is_viewable_online) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sənəd onlayn görüntüləmə üçün mövcud deyil.',
            ], 403);
        }

        if (!Storage::exists($document->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Fayl tapılmadı.',
            ], 404);
        }

        // Record preview
        DocumentDownload::recordDownload(
            $document, 
            null, // Anonymous user
            $share, 
            'preview'
        );

        return Storage::response(
            $document->file_path,
            $document->original_filename,
            ['Content-Type' => $document->mime_type]
        );
    }

    /**
     * Handle info action (default)
     */
    protected function handleInfo(DocumentShare $share, $document): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'share' => [
                    'name' => $share->share_name,
                    'expires_at' => $share->expires_at,
                    'formatted_expiration' => $share->formatted_expiration,
                    'download_count' => $share->download_count,
                    'view_count' => $share->view_count,
                    'max_downloads' => $share->max_downloads,
                    'remaining_downloads' => $share->remaining_downloads,
                    'can_download' => $share->can_download,
                    'can_view_online' => $share->can_view_online,
                    'can_share' => $share->can_share,
                ],
                'document' => [
                    'title' => $document->title,
                    'description' => $document->description,
                    'file_type' => $document->file_type,
                    'file_type_label' => $document->file_type_label,
                    'file_size' => $document->file_size,
                    'formatted_file_size' => $document->formatted_file_size,
                    'category' => $document->category,
                    'category_label' => $document->category_label,
                    'version' => $document->version,
                    'published_at' => $document->published_at,
                ],
                'shared_by' => [
                    'name' => $share->sharedBy->first_name . ' ' . $share->sharedBy->last_name,
                    'institution' => $share->sharedBy->institution->name ?? null,
                ],
            ],
        ]);
    }

    /**
     * Submit password for protected share
     */
    public function submitPassword(Request $request, string $token): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Parol tələb olunur.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $share = DocumentShare::byToken($token)->first();

        if (!$share || !$share->isValid()) {
            return response()->json([
                'success' => false,
                'message' => 'Paylaşım linki mövcud deyil və ya deaktiv edilib.',
            ], 404);
        }

        if (!$share->checkPassword($request->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Yanlış parol.',
                'attempts_remaining' => 3, // Could implement attempt limiting
            ], 401);
        }

        return response()->json([
            'success' => true,
            'message' => 'Parol düzgündür. Sənədə giriş icazəsi verildi.',
        ]);
    }

    /**
     * Get share statistics (for share owner)
     */
    public function getStatistics(string $token): JsonResponse
    {
        $share = DocumentShare::byToken($token)->first();

        if (!$share) {
            return response()->json([
                'success' => false,
                'message' => 'Paylaşım tapılmadı.',
            ], 404);
        }

        // Basic validation - could add more security checks
        $user = auth()->user();
        if (!$user || $share->shared_by !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu paylaşımın statistikasını görmək icazəniz yoxdur.',
            ], 403);
        }

        $analytics = $share->getAnalytics();

        return response()->json([
            'success' => true,
            'data' => $analytics,
        ]);
    }

    /**
     * Deactivate share
     */
    public function deactivate(Request $request, string $token): JsonResponse
    {
        $share = DocumentShare::byToken($token)->first();

        if (!$share) {
            return response()->json([
                'success' => false,
                'message' => 'Paylaşım tapılmadı.',
            ], 404);
        }

        $user = auth()->user();
        if (!$user || $share->shared_by !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu paylaşımı deaktiv etmək icazəniz yoxdur.',
            ], 403);
        }

        $reason = $request->input('reason', 'Manually deactivated');
        $share->deactivate($reason);

        return response()->json([
            'success' => true,
            'message' => 'Paylaşım deaktiv edildi.',
        ]);
    }
}