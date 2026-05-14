<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\DocumentCollection;
use App\Models\FolderShareLink;
use App\Services\DocumentCollectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class FolderShareApiController extends Controller
{
    protected DocumentCollectionService $service;

    public function __construct(DocumentCollectionService $service)
    {
        $this->service = $service;
    }

    /**
     * Create a new share link for a folder
     */
    public function create(Request $request, DocumentCollection $folder): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'days' => 'required|integer|min:1|max:365',
            'can_upload' => 'boolean',
            'can_view' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $shareLink = FolderShareLink::create([
            'document_collection_id' => $folder->id,
            'expires_at' => Carbon::now()->addDays($request->days),
            'can_upload' => $request->input('can_upload', true),
            'can_view' => $request->input('can_view', false),
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $shareLink->token,
                'expires_at' => $shareLink->expires_at,
                'share_url' => config('app.frontend_url', 'http://localhost:3000') . '/public/folder/share/' . $shareLink->token
            ]
        ]);
    }

    /**
     * Get share link info and documents (public)
     */
    public function info(string $token): JsonResponse
    {
        $shareLink = FolderShareLink::where('token', $token)
            ->with(['folder.documents' => function($query) {
                $query->where('status', 'active');
            }])
            ->first();

        if (!$shareLink || !$shareLink->isValid()) {
            return response()->json(['success' => false, 'message' => 'Link tapılmadı və ya müddəti bitib.'], 404);
        }

        $documents = $shareLink->folder->documents->map(function($doc) use ($token) {
            return [
                'id' => $doc->id,
                'file_name' => $doc->file_name || $doc->original_filename,
                'file_size' => $doc->file_size,
                'mime_type' => $doc->mime_type,
                'created_at' => $doc->created_at,
                'download_url' => url("/api/folder-share/{$token}/download/{$doc->id}")
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'folder_name' => $shareLink->folder->name,
                'can_view' => $shareLink->can_view,
                'expires_at' => $shareLink->expires_at,
                'documents' => $documents,
                'zip_url' => url("/api/folder-share/{$token}/download-all")
            ]
        ]);
    }

    /**
     * Public download of a document via share link
     */
    public function downloadDocument(string $token, $documentId)
    {
        $shareLink = FolderShareLink::where('token', $token)->first();

        if (!$shareLink || !$shareLink->isValid()) {
            abort(403, 'Link etibarsızdır.');
        }

        $document = \App\Models\Document::findOrFail($documentId);
        
        // Ensure document belongs to the folder
        if ($document->document_collection_id !== $shareLink->document_collection_id) {
            abort(404);
        }

        if (!\Illuminate\Support\Facades\Storage::exists($document->file_path)) {
            abort(404, 'Fayl tapılmadı.');
        }

        return \Illuminate\Support\Facades\Storage::download(
            $document->file_path,
            $document->file_name || $document->original_filename
        );
    }

    /**
     * Public download of all documents as ZIP
     */
    public function downloadAll(string $token)
    {
        $shareLink = FolderShareLink::where('token', $token)->first();

        if (!$shareLink || !$shareLink->isValid()) {
            abort(403);
        }

        return $this->service->bulkDownloadFolder($shareLink->folder, $shareLink->creator);
    }
}
