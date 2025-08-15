<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentShare;
use App\Models\DocumentDownload;
use App\Models\DocumentAccessLog;
use App\Models\UserStorageQuota;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;

class DocumentService
{
    /**
     * Get filtered and paginated documents
     */
    public function getDocuments(Request $request)
    {
        $user = Auth::user();
        $query = Document::with(['uploader', 'institution'])
                        ->accessibleBy($user)
                        ->active()
                        ->latestVersions();

        // Apply filters
        $this->applyFilters($query, $request);
        
        // Apply search
        $this->applySearch($query, $request);
        
        // Apply sorting
        $this->applySorting($query, $request);

        return $query->paginate($request->get('per_page', 15));
    }

    /**
     * Create new document from uploaded file
     */
    public function createDocument(array $validatedData, UploadedFile $file)
    {
        $user = Auth::user();
        
        // Check storage quota
        $quota = UserStorageQuota::getOrCreateForUser($user);
        if (!$quota->canUpload($file->getSize())) {
            throw new \Exception('Yüklənən fayl ölçüsü aylıq kvotanızı aşır.');
        }

        // Store file
        $fileData = $this->storeFile($file);
        
        // Create document record
        $documentData = array_merge($validatedData, [
            'uploaded_by' => $user->id,
            'institution_id' => $user->institution_id,
            'published_at' => now(),
            'status' => 'active',
        ], $fileData);

        $document = Document::create($documentData);
        
        // Update quota
        $quota->addUpload($file->getSize());

        return $document->load(['uploader', 'institution']);
    }

    /**
     * Update document
     */
    public function updateDocument(Document $document, array $validatedData)
    {
        $user = Auth::user();
        
        // Check permissions
        if (!$this->canUserModifyDocument($user, $document)) {
            throw new \Exception('Bu sənədi dəyişdirmək icazəniz yoxdur.');
        }

        $document->update($validatedData);
        
        return $document->fresh(['uploader', 'institution']);
    }

    /**
     * Delete document
     */
    public function deleteDocument(Document $document)
    {
        $user = Auth::user();
        
        // Check permissions
        if (!$this->canUserDeleteDocument($user, $document)) {
            throw new \Exception('Bu sənədi silmək icazəniz yoxdur.');
        }

        // Delete file from storage
        if (Storage::exists($document->file_path)) {
            Storage::delete($document->file_path);
        }

        // Update quota
        $quota = UserStorageQuota::getOrCreateForUser($document->uploader);
        $quota->removeUpload($document->file_size);

        $document->delete();
    }

    /**
     * Log document access
     */
    public function logAccess(Document $document, string $action = 'view')
    {
        DocumentAccessLog::create([
            'document_id' => $document->id,
            'user_id' => Auth::id(),
            'action' => $action,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Apply filters to query
     */
    private function applyFilters($query, Request $request)
    {
        if ($request->filled('category')) {
            $query->byCategory($request->category);
        }

        if ($request->filled('file_type')) {
            $query->byFileType($request->file_type);
        }

        if ($request->filled('access_level')) {
            $query->byAccessLevel($request->access_level);
        }

        if ($request->filled('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->filled('uploaded_by')) {
            $query->where('uploaded_by', $request->uploaded_by);
        }
    }

    /**
     * Apply search to query
     */
    private function applySearch($query, Request $request)
    {
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('content_preview', 'like', "%{$search}%")
                  ->orWhereJsonContains('tags', $search);
            });
        }
    }

    /**
     * Apply sorting to query
     */
    private function applySorting($query, Request $request)
    {
        $sortField = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        $query->orderBy($sortField, $sortDirection);
    }

    /**
     * Store uploaded file
     */
    private function storeFile(UploadedFile $file): array
    {
        // Generate unique stored filename
        $storedFilename = Document::generateStoredFilename($file->getClientOriginalName());
        $filePath = 'documents/' . now()->format('Y/m') . '/' . $storedFilename;

        // Store file
        $file->storeAs('documents/' . now()->format('Y/m'), $storedFilename, 'local');

        // Calculate file hash
        $fileHash = hash_file('sha256', $file->getPathname());
        
        // Determine file type
        $fileType = Document::getFileTypeFromMime($file->getMimeType());

        return [
            'original_filename' => $file->getClientOriginalName(),
            'stored_filename' => $storedFilename,
            'file_path' => $filePath,
            'file_extension' => $file->getClientOriginalExtension(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'file_hash' => $fileHash,
            'file_type' => $fileType,
        ];
    }

    /**
     * Check if user can modify document
     */
    private function canUserModifyDocument($user, Document $document): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($document->uploaded_by === $user->id) {
            return true;
        }

        if ($user->hasRole(['regionadmin', 'sektoradmin']) && 
            $document->institution_id === $user->institution_id) {
            return true;
        }

        return false;
    }

    /**
     * Get document statistics
     */
    public function getDocumentStats()
    {
        $user = Auth::user();
        $query = Document::accessibleBy($user)->active();
        
        $total = $query->count();
        $totalSize = $query->sum('file_size');
        $publicDocuments = $query->where('is_public', true)->count();
        $recentUploads = $query->where('created_at', '>=', now()->subMonth())->count();
        
        return [
            'total' => $total,
            'total_size' => $totalSize,
            'public_documents' => $publicDocuments,
            'recent_uploads' => $recentUploads,
        ];
    }

    /**
     * Check if user can delete document
     */
    private function canUserDeleteDocument($user, Document $document): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($document->uploaded_by === $user->id) {
            return true;
        }

        return false;
    }
}