<?php

namespace App\Http\Controllers;

use App\Models\DocumentCollection;
use App\Services\DocumentCollectionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
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
            $folders = $this->service->getAccessibleFolders($request->user());

            return response()->json([
                'success' => true,
                'data' => $folders,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch folders',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Show a specific folder with its documents
     */
    public function show(Request $request, DocumentCollection $folder): JsonResponse
    {
        try {
            $documents = $this->service->getFolderDocuments($folder, $request->user());

            return response()->json([
                'success' => true,
                'data' => [
                    'folder' => $folder->load(['ownerInstitution', 'institution', 'user', 'targetInstitutions']),
                    'documents' => $documents,
                ],
            ]);
        } catch (\Exception $e) {
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
            $institution = \App\Models\Institution::findOrFail($request->institution_id);

            // Check permission
            if (!$request->user()->hasRole(['superadmin', 'regionadmin'])) {
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

            return response()->json([
                'success' => true,
                'message' => 'Regional folders created successfully',
                'data' => $folders,
            ], 201);
        } catch (\Exception $e) {
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
        if (!$this->service->canManageFolder($request->user(), $folder)) {
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
            $updatedFolder = $this->service->updateFolder(
                $folder,
                $request->only(['name', 'description', 'allow_school_upload', 'is_locked']),
                $request->user(),
                $request->input('reason')
            );

            return response()->json([
                'success' => true,
                'message' => 'Folder updated successfully',
                'data' => $updatedFolder,
            ]);
        } catch (\Exception $e) {
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
        if (!$this->service->canManageFolder($request->user(), $folder)) {
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
            $this->service->deleteFolder(
                $folder,
                $request->user(),
                $request->input('reason')
            );

            return response()->json([
                'success' => true,
                'message' => 'Folder and its contents deleted successfully',
            ]);
        } catch (\Exception $e) {
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
            $zipPath = $this->service->bulkDownloadFolder($folder, $request->user());

            return response()->download($zipPath)->deleteFileAfterSend(true);
        } catch (\Exception $e) {
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
            if (!$this->service->canManageFolder($request->user(), $folder)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view audit logs',
                ], 403);
            }

            $logs = $folder->auditLogs()
                ->with('user:id,name,email')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
            ]);
        } catch (\Exception $e) {
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
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:102400', // Max 100MB
        ]);

        if ($validator->fails()) {
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

            $isTargetInstitution = $folder->targetInstitutions()
                ->where('institution_id', $userInstitutionId)
                ->exists();

            if (!$isTargetInstitution) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your institution is not authorized to upload to this folder',
                ], 403);
            }

            $document = $this->service->uploadDocumentToFolder(
                $folder,
                $request->file('file'),
                $user
            );

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully',
                'data' => $document,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload document',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
