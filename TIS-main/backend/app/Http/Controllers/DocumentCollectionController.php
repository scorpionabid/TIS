<?php

namespace App\Http\Controllers;

use App\Models\DocumentCollection;
use App\Services\DocumentCollectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DocumentCollectionController extends Controller
{
    protected DocumentCollectionService $service;

    public function __construct(DocumentCollectionService $service)
    {
        $this->service = $service;
    }

    /**
     * Get all accessible folders for the authenticated user
     */
    public function index(Request $request): JsonResponse
    {
        try {
            \Log::info('DocumentCollectionController@index', [
                'user_id' => $request->user()->id ?? null,
            ]);

            $folders = $this->service->getAccessibleFolders($request->user());

            return response()->json([
                'success' => true,
                'data' => $folders,
            ]);
        } catch (\Exception $e) {
            \Log::error('DocumentCollectionController@index failed', [
                'user_id' => $request->user()->id ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch folders',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Show a specific folder with its documents (with pagination and filtering for 600+ institutions)
     */
    public function show(Request $request, DocumentCollection $folder): JsonResponse
    {
        try {
            \Log::info('DocumentCollection show() called', [
                'folder_id' => $folder->id,
                'user_id' => $request->user()->id,
                'user_role' => $request->user()->roles->pluck('name'),
            ]);

            // Validate pagination and filter parameters
            $validator = Validator::make($request->all(), [
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:5|max:100',
                'search' => 'nullable|string|max:255',
                'region_id' => 'nullable|exists:institutions,id',
                'sector_id' => 'nullable|exists:institutions,id',
                'file_type' => 'nullable|string|in:pdf,word,excel,image,other',
                'sort_by' => 'nullable|string|in:institution_name,document_count,last_upload,total_size',
                'sort_direction' => 'nullable|string|in:asc,desc',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $filters = [
                'page' => $request->input('page', 1),
                'per_page' => $request->input('per_page', 20),
                'search' => $request->input('search'),
                'region_id' => $request->input('region_id'),
                'sector_id' => $request->input('sector_id'),
                'file_type' => $request->input('file_type'),
                'sort_by' => $request->input('sort_by', 'institution_name'),
                'sort_direction' => $request->input('sort_direction', 'asc'),
            ];

            $result = $this->service->getFolderDocumentsPaginated($folder, $request->user(), $filters);

            \Log::info('DocumentCollection documents fetched with pagination', [
                'institutions_count' => $result['meta']['total_institutions'],
                'current_page' => $result['meta']['current_page'],
            ]);

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'meta' => $result['meta'],
            ]);
        } catch (\Exception $e) {
            \Log::error('DocumentCollection show() error', [
                'folder_id' => $folder->id ?? null,
                'user_id' => $request->user()->id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch folder details',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create regional folders from templates
     */
    public function createRegionalFolders(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'institution_id' => 'required|exists:institutions,id',
            'folder_templates' => 'nullable|array',
            'target_institutions' => 'nullable|array',
            'target_institutions.*' => 'exists:institutions,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            \Log::info('DocumentCollectionController@createRegionalFolders', [
                'user_id' => $request->user()->id ?? null,
                'institution_id' => $request->input('institution_id'),
                'target_institutions' => $request->input('target_institutions', []),
            ]);

            $institution = \App\Models\Institution::findOrFail($request->institution_id);

            // Check permission
            if (! $request->user()->hasRole(['superadmin', 'regionadmin'])) {
                \Log::warning('DocumentCollectionController@createRegionalFolders unauthorized', [
                    'user_id' => $request->user()->id ?? null,
                    'institution_id' => $request->input('institution_id'),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to create regional folders',
                ], 403);
            }

            $folders = $this->service->createRegionalFolders(
                $request->user(),
                $institution,
                $request->input('folder_templates'),
                $request->input('target_institutions', [])
            );

            // Load target institutions relationship
            foreach ($folders as $folder) {
                $folder->load('targetInstitutions');
            }

            \Log::info('DocumentCollectionController@createRegionalFolders success', [
                'user_id' => $request->user()->id ?? null,
                'created_folders' => collect($folders)->pluck('id'),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Regional folders created successfully',
                'data' => $folders,
            ], 201);
        } catch (\Exception $e) {
            \Log::error('DocumentCollectionController@createRegionalFolders failed', [
                'user_id' => $request->user()->id ?? null,
                'institution_id' => $request->input('institution_id'),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create regional folders',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update/rename a folder
     */
    public function update(Request $request, DocumentCollection $folder): JsonResponse
    {
        // Check permission
        if (! $this->service->canManageFolder($request->user(), $folder)) {
            \Log::warning('DocumentCollectionController@update unauthorized', [
                'folder_id' => $folder->id,
                'user_id' => $request->user()->id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to update this folder',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'allow_school_upload' => 'nullable|boolean',
            'is_locked' => 'nullable|boolean',
            'reason' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            \Log::info('DocumentCollectionController@update', [
                'folder_id' => $folder->id,
                'user_id' => $request->user()->id ?? null,
            ]);

            $updatedFolder = $this->service->updateFolder(
                $folder,
                $request->only(['name', 'description', 'allow_school_upload', 'is_locked']),
                $request->user(),
                $request->input('reason')
            );

            \Log::info('DocumentCollectionController@update success', [
                'folder_id' => $folder->id,
                'user_id' => $request->user()->id ?? null,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Folder updated successfully',
                'data' => $updatedFolder,
            ]);
        } catch (\Exception $e) {
            \Log::error('DocumentCollectionController@update failed', [
                'folder_id' => $folder->id,
                'user_id' => $request->user()->id ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update folder',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a folder with cascade deletion
     */
    public function destroy(Request $request, DocumentCollection $folder): JsonResponse
    {
        // Check permission
        if (! $this->service->canManageFolder($request->user(), $folder)) {
            \Log::warning('DocumentCollectionController@destroy unauthorized', [
                'folder_id' => $folder->id,
                'user_id' => $request->user()->id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to delete this folder',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            \Log::info('DocumentCollectionController@destroy', [
                'folder_id' => $folder->id,
                'user_id' => $request->user()->id ?? null,
            ]);

            $this->service->deleteFolder(
                $folder,
                $request->user(),
                $request->input('reason')
            );

            \Log::info('DocumentCollectionController@destroy success', [
                'folder_id' => $folder->id,
                'user_id' => $request->user()->id ?? null,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Folder and its contents deleted successfully',
            ]);
        } catch (\Exception $e) {
            \Log::error('DocumentCollectionController@destroy failed', [
                'folder_id' => $folder->id,
                'user_id' => $request->user()->id ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete folder',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk download folder contents as ZIP
     */
    public function bulkDownload(Request $request, DocumentCollection $folder): mixed
    {
        try {
            \Log::info('DocumentCollectionController@bulkDownload', [
                'folder_id' => $folder->id,
                'user_id' => $request->user()->id ?? null,
            ]);

            $zipPath = $this->service->bulkDownloadFolder($folder, $request->user());

            \Log::info('DocumentCollectionController@bulkDownload success', [
                'folder_id' => $folder->id,
                'user_id' => $request->user()->id ?? null,
                'zip_path' => $zipPath,
            ]);

            return response()->download($zipPath);
        } catch (\RuntimeException $e) {
            \Log::warning('DocumentCollectionController@bulkDownload validation issue', [
                'folder_id' => $folder->id,
                'user_id' => $request->user()->id ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('DocumentCollectionController@bulkDownload failed', [
                'folder_id' => $folder->id ?? null,
                'user_id' => $request->user()->id ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create ZIP file',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get folder audit logs
     */
    public function auditLogs(Request $request, DocumentCollection $folder): JsonResponse
    {
        try {
            // Check permission
            if (! $this->service->canManageFolder($request->user(), $folder)) {
                \Log::warning('DocumentCollectionController@auditLogs unauthorized', [
                    'folder_id' => $folder->id,
                    'user_id' => $request->user()->id ?? null,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view audit logs',
                ], 403);
            }

            \Log::info('DocumentCollectionController@auditLogs', [
                'folder_id' => $folder->id,
                'user_id' => $request->user()->id ?? null,
            ]);

            $logs = $folder->auditLogs()
                ->with('user:id,name,email')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
            ]);
        } catch (\Exception $e) {
            \Log::error('DocumentCollectionController@auditLogs failed', [
                'folder_id' => $folder->id,
                'user_id' => $request->user()->id ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch audit logs',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload document to folder
     */
    public function uploadDocument(Request $request, DocumentCollection $folder): JsonResponse
    {
        \Log::info('uploadDocument called', [
            'folder_id' => $folder->id,
            'user_id' => $request->user()->id,
            'has_file' => $request->hasFile('file'),
            'file_name' => $request->hasFile('file') ? $request->file('file')->getClientOriginalName() : null,
        ]);

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:102400', // Max 100MB
        ]);

        if ($validator->fails()) {
            \Log::error('uploadDocument validation failed', [
                'errors' => $validator->errors(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Check if user's institution is in target institutions
            $user = $request->user();
            $userInstitutionId = $user->institution_id;

            \Log::info('Checking target institutions', [
                'user_institution_id' => $userInstitutionId,
                'folder_id' => $folder->id,
            ]);

            $isTargetInstitution = $folder->targetInstitutions()
                ->where('institution_id', $userInstitutionId)
                ->exists();

            \Log::info('Target institution check result', [
                'is_target' => $isTargetInstitution,
            ]);

            if (! $isTargetInstitution) {
                \Log::warning('uploadDocument unauthorized institution', [
                    'folder_id' => $folder->id,
                    'user_id' => $user->id,
                    'institution_id' => $userInstitutionId,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Your institution is not authorized to upload to this folder',
                ], 403);
            }

            \Log::info('Starting document upload to service');

            $document = $this->service->uploadDocumentToFolder(
                $folder,
                $request->file('file'),
                $user
            );

            \Log::info('Document uploaded successfully', [
                'document_id' => $document->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully',
                'data' => $document,
            ], 201);
        } catch (\RuntimeException $e) {
            \Log::warning('uploadDocument validation error', [
                'folder_id' => $folder->id,
                'user_id' => $request->user()->id ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('uploadDocument exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to upload document',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
