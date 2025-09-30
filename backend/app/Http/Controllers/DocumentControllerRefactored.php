<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentShare;
use App\Services\DocumentService;
use App\Services\DocumentDownloadService;
use App\Services\DocumentSharingService;
use App\Services\DocumentPermissionService;
use App\Services\DocumentValidationService;
use App\Services\DocumentActivityService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentControllerRefactored extends Controller
{
    protected DocumentService $documentService;
    protected DocumentDownloadService $downloadService;
    protected DocumentSharingService $sharingService;
    protected DocumentPermissionService $permissionService;
    protected DocumentValidationService $validationService;
    protected DocumentActivityService $activityService;
    protected NotificationService $notificationService;

    public function __construct(
        DocumentService $documentService,
        DocumentDownloadService $downloadService,
        DocumentSharingService $sharingService,
        DocumentPermissionService $permissionService,
        DocumentValidationService $validationService,
        DocumentActivityService $activityService,
        NotificationService $notificationService
    ) {
        $this->documentService = $documentService;
        $this->downloadService = $downloadService;
        $this->sharingService = $sharingService;
        $this->permissionService = $permissionService;
        $this->validationService = $validationService;
        $this->activityService = $activityService;
        $this->notificationService = $notificationService;
    }

    /**
     * Display a listing of documents
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validator = $this->validationService->validateSearchFilters($request);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $documents = $this->documentService->getDocuments($request);

            return response()->json([
                'success' => true,
                'data' => $documents,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Sənədlər yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Store a newly uploaded document
     */
    public function store(Request $request): JsonResponse
    {
        $validator = $this->validationService->validateDocumentStore($request);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = Auth::user();

            // Check regional permissions for document creation
            $canCreate = $this->permissionService->canUserCreateDocument($user, $validator->validated());

            if (!$canCreate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu əməliyyatı həyata keçirmək üçün icazəniz yoxdur.',
                ], 403);
            }

            $file = $request->file('file');
            $userRole = $user->getRoleNames()->first();
            
            // Validate file with role-based limits
            $fileValidationErrors = $this->validationService->validateFileUpload($file, $userRole);
            if (!empty($fileValidationErrors)) {
                return response()->json([
                    'success' => false,
                    'message' => 'File validation failed',
                    'errors' => $fileValidationErrors,
                ], 422);
            }

            $sanitizedData = $this->validationService->sanitizeDocumentData($validator->validated());
            $document = $this->documentService->createDocument($sanitizedData, $file);

            // Log document upload
            $this->activityService->logActivity($document, $user, 'upload', $request);

            return response()->json([
                'success' => true,
                'message' => 'Sənəd uğurla yükləndi.',
                'data' => $document,
            ], 201);

        } catch (\Exception $e) {
            return $this->handleError($e, 'Sənəd yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Display the specified document
     */
    public function show(Document $document): JsonResponse
    {
        try {
            $user = Auth::user();
            
            // Check if user can access this document
            if (!$this->permissionService->canUserAccessDocument($user, $document)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sənədə giriş icazəniz yoxdur.',
                ], 403);
            }

            // Log access
            $this->activityService->logActivity($document, $user, 'view');

            $document->load([
                'uploader:id,first_name,last_name',
                'institution:id,name,name_en'
            ]);

            return response()->json([
                'success' => true,
                'data' => $document,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Sənəd yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Update the specified document
     */
    public function update(Request $request, Document $document): JsonResponse
    {
        $validator = $this->validationService->validateDocumentUpdate($request);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = Auth::user();
            
            // Check if user can modify this document
            if (!$this->permissionService->canUserModifyDocument($user, $document)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sənədi dəyişdirmək icazəniz yoxdur.',
                ], 403);
            }

            $sanitizedData = $this->validationService->sanitizeDocumentData($validator->validated());
            $updatedDocument = $this->documentService->updateDocument($document, $sanitizedData);

            // Log update activity
            $this->activityService->logActivity($document, $user, 'update', $request);

            return response()->json([
                'success' => true,
                'message' => 'Sənəd uğurla yeniləndi.',
                'data' => $updatedDocument,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Sənəd yenilənərkən xəta baş verdi.');
        }
    }

    /**
     * Remove the specified document
     */
    public function destroy(Document $document): JsonResponse
    {
        try {
            $user = Auth::user();
            
            // Check if user can delete this document
            if (!$this->permissionService->canUserDeleteDocument($user, $document)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sənədi silmək icazəniz yoxdur.',
                ], 403);
            }

            // Log delete activity before deletion
            $this->activityService->logActivity($document, $user, 'delete');

            $this->documentService->deleteDocument($document);

            return response()->json([
                'success' => true,
                'message' => 'Sənəd uğurla silindi.',
            ]);
        } catch (\Exception $e) {
            Log::error('Error in document.destroy', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->handleError($e, 'Sənəd silinərkən xəta baş verdi.');
        }
    }

    /**
     * Download document
     */
    public function download(Document $document, Request $request): StreamedResponse
    {
        $user = Auth::user();

        // Check if user can download this document
        $canDownload = $this->permissionService->canUserDownloadDocument($user, $document);

        if (!$canDownload) {
            abort(403, 'Bu sənədi yükləmək icazəniz yoxdur.');
        }

        Log::info('Document download permission granted', [
            'document_id' => $document->id,
            'user_id' => $user->id,
        ]);

        // Log document download
        $this->activityService->logActivity($document, $user, 'download', $request);

        return $this->downloadService->downloadDocument($document);
    }

    /**
     * Preview document
     */
    public function preview(Document $document): StreamedResponse
    {
        $user = Auth::user();
        
        // Check if user can access this document
        if (!$this->permissionService->canUserAccessDocument($user, $document)) {
            abort(403, 'Bu sənədə giriş icazəniz yoxdur.');
        }

        // Log preview activity
        $this->activityService->logActivity($document, $user, 'preview');

        return $this->downloadService->previewDocument($document);
    }

    /**
     * Get download statistics
     */
    public function downloadStats(Document $document): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$this->permissionService->canUserAccessDocument($user, $document)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sənədə giriş icazəniz yoxdur.',
                ], 403);
            }

            $stats = $this->downloadService->getDownloadStatistics($document);

            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Statistikalar yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Bulk download documents
     */
    public function bulkDownload(Request $request): StreamedResponse
    {
        $validator = $this->validationService->validateBulkDownload($request);

        if ($validator->fails()) {
            abort(422, 'Invalid document IDs provided.');
        }

        return $this->downloadService->bulkDownload($request->document_ids);
    }

    /**
     * Share document
     */
    public function share(Request $request, Document $document): JsonResponse
    {
        $validator = $this->validationService->validateDocumentShare($request);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = Auth::user();

            if (!$this->permissionService->canUserShareDocument($user, $document)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sənədi paylaşmaq icazəniz yoxdur.',
                ], 403);
            }

            $share = $this->sharingService->shareDocument($document, $validator->validated());

            // Log sharing activity
            $this->activityService->logActivity($document, $user, 'share', $request);

            // Send document share notification
            $this->sendDocumentShareNotification($document, $share, $user);

            return response()->json([
                'success' => true,
                'message' => 'Sənəd uğurla paylaşıldı.',
                'data' => $share,
            ], 201);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Sənəd paylaşılarkən xəta baş verdi.');
        }
    }

    /**
     * Create public link
     */
    public function createPublicLink(Request $request, Document $document): JsonResponse
    {
        $validator = $this->validationService->validatePublicLink($request);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = Auth::user();

            if (!$this->permissionService->canUserShareDocument($user, $document)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sənəd üçün ictimai link yaratmaq icazəniz yoxdur.',
                ], 403);
            }

            $share = $this->sharingService->createPublicLink($document, $validator->validated());

            // Log public link creation
            $this->activityService->logActivity($document, $user, 'create_public_link', $request);

            return response()->json([
                'success' => true,
                'message' => 'İctimai link yaradıldı.',
                'data' => [
                    'share_id' => $share->id,
                    'public_url' => url('/documents/public/' . $share->public_token),
                    'expires_at' => $share->expires_at,
                ],
            ], 201);
        } catch (\Exception $e) {
            return $this->handleError($e, 'İctimai link yaradılarkən xəta baş verdi.');
        }
    }

    /**
     * Access document via public link
     */
    public function accessPublic(string $token, Request $request): JsonResponse
    {
        try {
            $document = $this->sharingService->accessViaPublicLink(
                $token,
                $request->get('password')
            );

            return response()->json([
                'success' => true,
                'data' => $document->load(['uploader:id,first_name,last_name']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 403);
        }
    }

    /**
     * Revoke document share
     */
    public function revokeShare(DocumentShare $share): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if user can revoke this share
            if (!$this->permissionService->canUserModifyDocument($user, $share->document)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu paylaşımı ləğv etmək icazəniz yoxdur.',
                ], 403);
            }

            $this->sharingService->revokeShare($share);

            return response()->json([
                'success' => true,
                'message' => 'Paylaşım ləğv edildi.',
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Paylaşım ləğv edilərkən xəta baş verdi.');
        }
    }

    /**
     * Get sharing statistics
     */
    public function sharingStats(Document $document): JsonResponse
    {
        try {
            $user = Auth::user();

            if (!$this->permissionService->canUserAccessDocument($user, $document)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sənədə giriş icazəniz yoxdur.',
                ], 403);
            }

            $stats = $this->sharingService->getShareStatistics($document);

            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Paylaşım statistikaları yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Get user's shared documents
     */
    public function myShares(): JsonResponse
    {
        try {
            $shares = $this->sharingService->getUserSharedDocuments(Auth::id());

            return response()->json([
                'success' => true,
                'data' => $shares,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Paylaşımlar yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Get document statistics
     */
    public function getStats(): JsonResponse
    {
        try {
            $stats = $this->documentService->getDocumentStats();

            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Statistikalar yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Get document tracking activity
     */
    public function getTrackingActivity(Request $request): JsonResponse
    {
        try {
            $validator = $this->validationService->validateActivityFilters($request);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            $result = $this->activityService->getTrackingActivity($request, $user);

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Aktivlik məlumatları yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Get specific document access history
     */
    public function getDocumentHistory(Document $document, Request $request): JsonResponse
    {
        try {
            $validator = $this->validationService->validateActivityFilters($request);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            $result = $this->activityService->getDocumentHistory($document, $request, $user);

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Sənəd tarixçəsi yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Get activity trends
     */
    public function getActivityTrends(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $filters = $request->only(['period', 'action', 'date_from', 'date_to']);
            
            $trends = $this->activityService->getActivityTrends($filters, $user);

            return response()->json([
                'success' => true,
                'data' => $trends,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Aktivlik trendləri yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Get document popularity
     */
    public function getDocumentPopularity(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $filters = $request->only(['date_from', 'date_to', 'limit']);
            
            $popularity = $this->activityService->getDocumentPopularity($filters, $user);

            return response()->json([
                'success' => true,
                'data' => $popularity,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Sənəd populyarlığı yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Export activity data
     */
    public function exportActivityData(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $filters = $request->only(['action', 'date_from', 'date_to', 'institution_id', 'user_id']);
            $format = $request->get('format', 'csv');
            
            $exportData = $this->activityService->exportActivityData($filters, $user, $format);

            $filename = 'document_activity_' . now()->format('Y-m-d_H-i-s') . '.' . $format;

            return response()->json([
                'success' => true,
                'data' => [
                    'filename' => $filename,
                    'content' => $exportData,
                    'format' => $format
                ]
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Aktivlik məlumatları ixrac edilərkən xəta baş verdi.');
        }
    }

    /**
     * Get permission context for current user
     */
    public function getPermissionContext(): JsonResponse
    {
        try {
            $user = Auth::user();
            $context = $this->permissionService->getPermissionContext($user);

            return response()->json([
                'success' => true,
                'data' => $context,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'İcazə konteksti yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Send document share notification to target users
     */
    private function sendDocumentShareNotification($document, $share, $user): void
    {
        try {
            // Get target users based on share configuration
            $targetUserIds = [];

            if (isset($share['user_ids']) && is_array($share['user_ids'])) {
                $targetUserIds = $share['user_ids'];
            } elseif (isset($share['institution_ids']) && is_array($share['institution_ids'])) {
                // Use InstitutionNotificationHelper to expand institution IDs to user IDs
                $targetRoles = config('notification_roles.document_notification_roles', [
                    'sektoradmin', 'schooladmin', 'müəllim'
                ]);
                $targetUserIds = \App\Services\InstitutionNotificationHelper::expandInstitutionsToUsers(
                    $share['institution_ids'],
                    $targetRoles
                );
            }

            if (!empty($targetUserIds)) {
                $this->notificationService->sendDocumentNotification(
                    $document,
                    'shared',
                    $targetUserIds,
                    [
                        'creator_name' => $user->name,
                        'document_title' => $document->title,
                        'share_message' => $share['message'] ?? '',
                        'share_expires_at' => $share['expires_at'] ?? null,
                        'action_url' => "/documents/{$document->id}"
                    ]
                );
            }
        } catch (\Exception $e) {
            // Log notification error but don't fail the share operation
            \Log::error('Document share notification failed', [
                'document_id' => $document->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Handle errors consistently
     */
    private function handleError(\Exception $e, string $defaultMessage): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $defaultMessage,
            'error' => config('app.debug') ? $e->getMessage() : 'Server error',
        ], 500);
    }
}