<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentAccessLog;
use App\Models\Institution;
use App\Models\UserStorageQuota;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class DocumentService
{
    /**
     * Cache configuration (Phase 2A: Redis tagged caching)
     */
    protected int $cacheTtl = 1800; // 30 minutes for documents (frequently updated)

    protected bool $cacheEnabled = true;

    /**
     * Get cache tags for this service (Phase 2A)
     * Tags allow selective cache invalidation per user
     */
    protected function getCacheTags(): array
    {
        $userId = Auth::id() ?? 'guest';

        return ['documents', "documents:user:{$userId}"];
    }

    /**
     * Generate cache key for document operations
     */
    protected function getCacheKey(string $operation, array $params = []): string
    {
        $userId = Auth::id() ?? 'guest';
        $paramHash = md5(json_encode($params));

        return "documents:{$operation}:{$userId}:{$paramHash}";
    }

    /**
     * Get data from cache or execute callback with tagging (Phase 2A optimized)
     */
    protected function getCached(string $key, callable $callback, ?int $ttl = null): mixed
    {
        if (! $this->cacheEnabled) {
            return $callback();
        }

        $ttl = $ttl ?? $this->cacheTtl;

        // Use Redis cache tags for selective invalidation (only if supported)
        try {
            return Cache::tags($this->getCacheTags())->remember($key, $ttl, $callback);
        } catch (\BadMethodCallException $e) {
            // Fallback for cache drivers that don't support tagging (file, database, array)
            return Cache::remember($key, $ttl, $callback);
        }
    }

    /**
     * Clear document-related cache with selective tagging (Phase 2A optimized)
     *
     * Phase 1: Cache::flush() - cleared ALL caches (aggressive, safe)
     * Phase 2A: Cache::tags()->flush() - clears only document caches (selective, efficient)
     */
    protected function clearDocumentCache(): void
    {
        if (! $this->cacheEnabled) {
            return;
        }

        // Clear only document-related caches using tags (if supported)
        try {
            Cache::tags(['documents'])->flush();
        } catch (\BadMethodCallException $e) {
            // Fallback: Clear all cache if tags not supported
            // This is less efficient but ensures cache consistency
            Cache::flush();
        }
    }

    /**
     * Get filtered and paginated documents with caching
     */
    public function getDocuments(Request $request)
    {
        // Generate cache key based on user and request parameters
        $cacheParams = [
            'filters' => $request->only(['category', 'file_type', 'access_level', 'institution_id', 'uploaded_by']),
            'search' => $request->input('search'),
            'sort_by' => $request->input('sort_by', 'created_at'),
            'sort_direction' => $request->input('sort_direction', 'desc'),
            'per_page' => $request->input('per_page', 15),
            'page' => $request->input('page', 1),
        ];

        $cacheKey = $this->getCacheKey('getDocuments', $cacheParams);

        return $this->getCached($cacheKey, function () use ($request) {
            $user = Auth::user();
            $query = Document::with(['uploader.institution', 'institution'])
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
        });
    }

    /**
     * Create new document from uploaded file with cache invalidation
     */
    public function createDocument(array $validatedData, UploadedFile $file)
    {
        $user = Auth::user();

        // Check storage quota
        $quota = UserStorageQuota::getOrCreateForUser($user);
        if (! $quota->canUpload($file->getSize())) {
            throw new \Exception('Yüklənən fayl ölçüsü aylıq kvotanızı aşır.');
        }

        // Store file
        $fileData = $this->storeFile($file);

        // Create document record
        // Map accessible_institutions from frontend target_institutions if provided
        $accessibleInstitutions = $validatedData['accessible_institutions'] ?? null;

        $documentData = array_merge($validatedData, [
            'uploaded_by' => $user->id,
            'institution_id' => $user->institution_id,
            'published_at' => now(),
            'status' => 'active',
            'accessible_institutions' => $accessibleInstitutions,
        ], $fileData);

        $document = Document::create($documentData);

        // Update quota
        $quota->addUpload($file->getSize());

        // Clear document cache after creation
        $this->clearDocumentCache();

        return $document->load(['uploader', 'institution']);
    }

    /**
     * Update document with cache invalidation
     */
    public function updateDocument(Document $document, array $validatedData)
    {
        $user = Auth::user();

        // Check permissions
        if (! $this->canUserModifyDocument($user, $document)) {
            throw new \Exception('Bu sənədi dəyişdirmək icazəniz yoxdur.');
        }

        $document->update($validatedData);

        // Clear document cache after update
        $this->clearDocumentCache();

        return $document->fresh(['uploader', 'institution']);
    }

    /**
     * Delete document with cache invalidation
     */
    public function deleteDocument(Document $document)
    {
        $user = Auth::user();

        // Check permissions
        if (! $this->canUserDeleteDocument($user, $document)) {
            throw new \Exception('Bu sənədi silmək icazəniz yoxdur.');
        }

        // Delete file from storage
        if (Storage::exists($document->file_path)) {
            Storage::delete($document->file_path);
        }

        // Update quota
        $quota = UserStorageQuota::getOrCreateForUser($document->uploader);
        $quota->removeFile($document->file_size);

        $document->delete();

        // Clear document cache after deletion
        $this->clearDocumentCache();
    }

    /**
     * Log document access
     */
    public function logAccess(Document $document, string $action = 'view')
    {
        try {
            DocumentAccessLog::create([
                'document_id' => $document->id,
                'user_id' => Auth::id(),
                'access_type' => $action,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);
        } catch (\Exception $e) {
            // Log error but don't fail the operation
            \Log::warning('Failed to log document access in DocumentService: ' . $e->getMessage());
        }
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
            $institutionIds = $this->resolveInstitutionHierarchyIds((int) $request->institution_id);
            $query->where(function ($q) use ($institutionIds) {
                $q->whereIn('institution_id', $institutionIds)
                    ->orWhere(function ($targetQuery) use ($institutionIds) {
                        foreach ($institutionIds as $index => $institutionId) {
                            if ($index === 0) {
                                $targetQuery->whereJsonContains('accessible_institutions', $institutionId)
                                    ->orWhereJsonContains('accessible_institutions', (string) $institutionId);
                            } else {
                                $targetQuery->orWhereJsonContains('accessible_institutions', $institutionId)
                                    ->orWhereJsonContains('accessible_institutions', (string) $institutionId);
                            }
                        }
                    });
            });
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

    private function resolveInstitutionHierarchyIds(int $institutionId): array
    {
        static $cache = [];

        if (isset($cache[$institutionId])) {
            return $cache[$institutionId];
        }

        $institution = Institution::withTrashed()->find($institutionId);
        if (! $institution) {
            return $cache[$institutionId] = [$institutionId];
        }

        $ids = $institution->getAllChildrenIds();
        if (empty($ids)) {
            $ids = [$institutionId];
        }

        $ids = array_values(array_unique(array_map('intval', $ids)));
        if (! in_array($institutionId, $ids, true)) {
            array_unshift($ids, $institutionId);
        }

        return $cache[$institutionId] = $ids;
    }

    /**
     * Store uploaded file to private storage
     *
     * Storage structure: storage/app/private/documents/YYYY/MM/filename
     * - Uses 'local' disk which maps to storage/app/private/
     * - Files are organized by upload date for better management
     * - Generates unique filename to prevent collisions
     *
     * @param  UploadedFile $file The uploaded file
     * @return array        File metadata
     *
     * @throws \Exception If file storage fails
     */
    private function storeFile(UploadedFile $file): array
    {
        // Generate unique stored filename
        $storedFilename = Document::generateStoredFilename($file->getClientOriginalName());
        $filePath = 'documents/' . now()->format('Y/m') . '/' . $storedFilename;

        // Store file to private storage (storage/app/private/documents/...)
        // Using 'local' disk for private storage with access control
        $stored = $file->storeAs('documents/' . now()->format('Y/m'), $storedFilename, 'local');

        if (! $stored) {
            throw new \Exception('Fayl yüklənərkən xəta baş verdi.');
        }

        // Verify file was stored successfully
        if (! Storage::exists($filePath)) {
            throw new \Exception('Fayl saxlanıldı, amma yoxlanıla bilmədi.');
        }

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

    /**
     * Get sub-institution documents grouped by institution with caching
     *
     * This method retrieves documents from institutions hierarchically below
     * the current user's institution. Used by regionadmin and sektoradmin
     * to see what documents their sub-institutions have uploaded.
     *
     * @param  \App\Models\User               $user
     * @return \Illuminate\Support\Collection
     */
    public function getSubInstitutionDocumentsGrouped($user)
    {
        // Generate cache key based on user's institution
        $cacheKey = $this->getCacheKey('subInstitutionDocs', [
            'user_id' => $user->id,
            'institution_id' => $user->institution_id,
        ]);

        return $this->getCached($cacheKey, function () use ($user) {
            $permissionService = app(DocumentPermissionService::class);

            // Get accessible institution IDs (excluding user's own)
            $accessibleInstitutions = $permissionService->getUserAccessibleInstitutions($user);
            $userInstitutionId = $user->institution_id;

            // Exclude user's own institution to show only sub-institutions
            $subInstitutionIds = array_filter($accessibleInstitutions, fn ($id) => $id !== $userInstitutionId);

            if (empty($subInstitutionIds)) {
                return collect([]);
            }

            // Get documents grouped by institution with eager loading to prevent N+1
            $documents = Document::with(['uploader:id,first_name,last_name', 'institution:id,name,type'])
                ->whereIn('institution_id', $subInstitutionIds)
                ->where('status', 'active')
                ->orderBy('institution_id')
                ->orderBy('created_at', 'desc')
                ->get();

            // Group by institution and format response
            return $documents->groupBy('institution_id')->map(function ($docs, $institutionId) {
                $institution = $docs->first()->institution;

                return [
                    'institution_id' => $institutionId,
                    'institution_name' => $institution->name ?? 'Unknown',
                    'institution_type' => $institution->type ?? 'Unknown',
                    'document_count' => $docs->count(),
                    'documents' => $docs->map(function ($doc) {
                        return [
                            'id' => $doc->id,
                            'title' => $doc->title,
                            'description' => $doc->description,
                            'file_extension' => $doc->file_extension,
                            'file_size' => $doc->file_size,
                            'mime_type' => $doc->mime_type,
                            'original_filename' => $doc->original_filename,
                            'uploaded_by' => $doc->uploaded_by,
                            'uploader' => $doc->uploader ? [
                                'id' => $doc->uploader->id,
                                'first_name' => $doc->uploader->first_name,
                                'last_name' => $doc->uploader->last_name,
                            ] : null,
                            'created_at' => $doc->created_at,
                            'is_downloadable' => $doc->is_downloadable,
                        ];
                    }),
                ];
            })->values();
        }, 3600); // Cache for 1 hour (less frequently updated)
    }
}
