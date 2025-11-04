<?php

namespace App\Services;

use App\Models\DocumentCollection;
use App\Models\Document;
use App\Models\FolderAuditLog;
use App\Models\User;
use App\Models\Institution;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class DocumentCollectionService
{
    /**
     * Create regional folders from templates for a specific institution
     */
    public function createRegionalFolders(User $user, Institution $institution, ?array $folderTemplates = null, array $targetInstitutionIds = []): array
    {
        $folderTemplates = $folderTemplates ?? DocumentCollection::REGIONAL_TEMPLATES;
        $createdFolders = [];

        DB::beginTransaction();
        try {
            foreach ($folderTemplates as $key => $name) {
                $createdFolders[] = $this->createFolderFromTemplate(
                    $user,
                    $institution,
                    $key,
                    $name,
                    $targetInstitutionIds
                );
            }

            DB::commit();
            return $createdFolders;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Update folder with audit logging
     */
    public function updateFolder(DocumentCollection $folder, array $data, User $user, ?string $reason = null): DocumentCollection
    {
        DB::beginTransaction();
        try {
            $oldData = [
                'name' => $folder->name,
                'description' => $folder->description,
                'allow_school_upload' => $folder->allow_school_upload,
                'is_locked' => $folder->is_locked,
            ];

            $folder->update($data);

            $newData = [
                'name' => $folder->name,
                'description' => $folder->description,
                'allow_school_upload' => $folder->allow_school_upload,
                'is_locked' => $folder->is_locked,
            ];

            // Determine action type
            $action = 'updated';
            if ($oldData['name'] !== $newData['name']) {
                $action = 'renamed';
            }

            $this->logFolderAction($folder, $user, $action, $oldData, $newData, $reason);

            DB::commit();
            return $folder->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Delete folder with cascade deletion and audit logging
     */
    public function deleteFolder(DocumentCollection $folder, User $user, ?string $reason = null): bool
    {
        DB::beginTransaction();
        try {
            $oldData = [
                'name' => $folder->name,
                'folder_key' => $folder->folder_key,
                'documents_count' => $folder->documents()->count(),
            ];

            // Get cascade deletable documents
            $cascadeDocuments = $folder->documents()
                ->where('cascade_deletable', true)
                ->get();

            // Soft delete cascade deletable documents
            foreach ($cascadeDocuments as $document) {
                $document->delete(); // Soft delete
            }

            // Log folder deletion
            $this->logFolderAction($folder, $user, 'deleted', $oldData, null, $reason);

            // Soft delete the folder itself
            $folder->delete();

            DB::commit();
            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Get folders accessible to user based on role and institution hierarchy
     */
    public function getAccessibleFolders(User $user): Collection
    {
        $query = DocumentCollection::query()
            ->with(['ownerInstitution', 'institution', 'creator', 'targetInstitutions']);

        // SuperAdmin sees all folders
        if ($user->hasRole('superadmin')) {
            return $query->get();
        }

        // RegionAdmin sees folders in their region
        if ($user->hasRole('regionadmin')) {
            return $query->where(function ($q) use ($user) {
                $q->where('owner_institution_id', $user->institution_id)
                  ->orWhere('institution_id', $user->institution_id);
            })->get();
        }

        // SektorAdmin sees folders in their sector and parent region
        if ($user->hasRole('sektoradmin')) {
            $institutionIds = $this->getHierarchicalInstitutionIds($user->institution_id);
            return $query->whereIn('owner_institution_id', $institutionIds)->get();
        }

        // SchoolAdmin sees folders from parent region/sector
        if ($user->hasRole('schooladmin')) {
            $parentInstitutionIds = $this->getParentInstitutionIds($user->institution_id);
            return $query->whereIn('owner_institution_id', $parentInstitutionIds)
                         ->where('allow_school_upload', true)
                         ->get();
        }

        // Default: return empty collection
        return collect([]);
    }

    /**
     * Check if user can manage (rename/delete) a folder
     */
    public function canManageFolder(User $user, DocumentCollection $folder): bool
    {
        // SuperAdmin can manage all folders
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // RegionAdmin can manage folders they own or in their region
        if ($user->hasRole('regionadmin')) {
            if ($folder->owner_institution_id === $user->institution_id) {
                return true;
            }
        }

        // Folder creator can manage their folders even if ownership changed (unless locked)
        if ($folder->created_by === $user->id && !$folder->is_locked) {
            return true;
        }

        return false;
    }

    /**
     * Bulk download all documents in a folder as ZIP
     */
    public function bulkDownloadFolder(DocumentCollection $folder, User $user): string
    {
        $documents = $this->collectDocumentsForBulkDownload($folder, $user);

        $this->guardBulkDownload($documents);

        $zipFilePath = $this->makeZipFilePath($folder);

        $this->buildZipArchive($zipFilePath, $documents);

        // Log bulk download action
        $this->logFolderAction($folder, $user, 'bulk_downloaded', null, [
            'documents_count' => $documents->count(),
            'zip_file' => basename($zipFilePath),
        ]);

        $this->scheduleZipCleanup($zipFilePath);

        return $zipFilePath;
    }

    /**
     * Get documents in folder filtered by user's institution (for SchoolAdmin)
     */
    public function getFolderDocuments(DocumentCollection $folder, User $user): Collection
    {
        $query = $folder->documents()->whereNull('deleted_at');

        // SchoolAdmin sees only their own institution's documents
        if ($user->hasRole('schooladmin')) {
            $query->where('institution_id', $user->institution_id);
        }

        return $query->with(['institution', 'uploader'])->get();
    }

    /**
     * Get folder documents with pagination and filtering (optimized for 600+ institutions)
     * This method groups documents by institution and provides pagination at institution level
     */
    public function getFolderDocumentsPaginated(DocumentCollection $folder, User $user, array $filters): array
    {
        $page = $filters['page'] ?? 1;
        $perPage = $filters['per_page'] ?? 20;
        $search = $filters['search'] ?? null;
        $regionId = $filters['region_id'] ?? null;
        $sectorId = $filters['sector_id'] ?? null;
        $fileType = $filters['file_type'] ?? null;
        $sortBy = $filters['sort_by'] ?? 'institution_name';
        $sortDirection = $filters['sort_direction'] ?? 'asc';

        // Base query for documents in this folder
        $documentsQuery = $folder->documents()
            ->whereNull('documents.deleted_at')
            ->with(['institution', 'uploader'])
            ->when($user->hasRole('schooladmin'), function ($query) use ($user) {
                $query->where('documents.institution_id', $user->institution_id);
            })
            ->when($fileType, function ($query) use ($fileType) {
                $query->where('documents.file_type', $fileType);
            })
            ->when($search, function ($query) use ($search) {
                $query->whereHas('institution', function ($institutionQuery) use ($search) {
                    $institutionQuery->where('name', 'like', '%' . $search . '%');
                });
            });

        // Get all documents matching filters
        $allDocuments = $documentsQuery->get();

        // Group documents by institution with parent (sector) information
        $groupedByInstitution = $allDocuments->groupBy('institution_id')->map(function ($docs, $institutionId) {
            $institution = $docs->first()->institution;
            $parentInstitution = $institution && $institution->parent_id
                ? Institution::find($institution->parent_id)
                : null;

            return [
                'institution_id' => $institutionId,
                'institution_name' => $institution ? $institution->name : 'Naməlum',
                'institution_level' => $institution ? $institution->level : null,
                'institution_type' => $institution && $institution->institutionType
                    ? $institution->institutionType->name
                    : null,
                'parent_id' => $institution ? $institution->parent_id : null,
                'parent_name' => $parentInstitution ? $parentInstitution->name : null,
                'parent_level' => $parentInstitution ? $parentInstitution->level : null,
                'document_count' => $docs->count(),
                'total_size' => $docs->sum('file_size'),
                'last_upload' => $docs->max('created_at'),
                'documents' => $docs->values()->all(),
            ];
        })->values();

        // Apply search filter (institution name)
        if ($search) {
            $groupedByInstitution = $groupedByInstitution->filter(function ($inst) use ($search) {
                return stripos($inst['institution_name'], $search) !== false;
            })->values();
        }

        // Apply region filter
        if ($regionId) {
            $groupedByInstitution = $groupedByInstitution->filter(function ($inst) use ($regionId) {
                // Check if institution is under this region
                $institution = Institution::find($inst['institution_id']);
                if (!$institution) return false;

                // Check if institution is in this region (either directly or through parent)
                return $institution->id === $regionId ||
                       $institution->parent_id === $regionId ||
                       $this->isInRegion($institution, $regionId);
            })->values();
        }

        // Apply sector filter
        if ($sectorId) {
            $groupedByInstitution = $groupedByInstitution->filter(function ($inst) use ($sectorId) {
                $institution = Institution::find($inst['institution_id']);
                if (!$institution) return false;

                return $institution->id === $sectorId ||
                       $institution->parent_id === $sectorId;
            })->values();
        }

        // Sort institutions
        $groupedByInstitution = $this->sortInstitutions($groupedByInstitution, $sortBy, $sortDirection);

        // Calculate pagination
        $totalInstitutions = $groupedByInstitution->count();
        $totalPages = ceil($totalInstitutions / $perPage);
        $offset = ($page - 1) * $perPage;

        // Slice for current page
        $paginatedInstitutions = $groupedByInstitution->slice($offset, $perPage)->values();

        return [
            'data' => [
                'folder' => $folder->load(['ownerInstitution', 'institution', 'creator', 'targetInstitutions']),
                'institutions' => $paginatedInstitutions,
            ],
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total_institutions' => $totalInstitutions,
                'total_pages' => $totalPages,
                'total_documents' => $allDocuments->count(),
                'total_size' => $allDocuments->sum('file_size'),
                'from' => $offset + 1,
                'to' => min($offset + $perPage, $totalInstitutions),
            ],
        ];
    }

    /**
     * Check if institution is in a specific region (recursive parent check)
     */
    private function isInRegion(Institution $institution, int $regionId): bool
    {
        $current = $institution;
        $maxDepth = 5; // Prevent infinite loops
        $depth = 0;

        while ($current && $depth < $maxDepth) {
            if ($current->parent_id === $regionId) {
                return true;
            }

            $current = $current->parent;
            $depth++;
        }

        return false;
    }

    /**
     * Sort institutions by specified field
     */
    private function sortInstitutions(Collection $institutions, string $sortBy, string $sortDirection): Collection
    {
        $ascending = $sortDirection === 'asc';

        return $institutions->sortBy(function ($inst) use ($sortBy) {
            switch ($sortBy) {
                case 'institution_name':
                    return $inst['institution_name'];
                case 'document_count':
                    return $inst['document_count'];
                case 'last_upload':
                    return $inst['last_upload'] ?? '';
                case 'total_size':
                    return $inst['total_size'];
                default:
                    return $inst['institution_name'];
            }
        }, SORT_REGULAR, !$ascending)->values();
    }

    /**
     * Upload document to folder
     */
    public function uploadDocumentToFolder(DocumentCollection $folder, $file, User $user): Document
    {
        \Log::info('uploadDocumentToFolder service called', [
            'folder_id' => $folder->id,
            'user_id' => $user->id,
            'file_size' => $file->getSize(),
            'file_name' => $file->getClientOriginalName(),
        ]);

        $uploadContext = $this->validateUploadRequest($folder, $file, $user);

        DB::beginTransaction();
        try {
            \Log::info('Storing file to storage');
            $path = $file->store('documents', 'local');
            \Log::info('File stored', ['path' => $path]);

            if (!$path || !Storage::disk('local')->exists($path)) {
                throw new \RuntimeException('Fayl saxlanılarkən xəta baş verdi.');
            }

            $document = $this->persistUploadedDocument($folder, $file, $path, $user, $uploadContext);

            $this->attachDocumentToFolder($folder, $document, $user);

            \Log::info('Creating audit log');
            $this->logFolderAction($folder, $user, 'document_uploaded', null, [
                'document_id' => $document->id,
                'file_name' => $document->original_filename,
                'file_size' => $document->file_size,
            ]);

            \Log::info('Committing transaction');
            DB::commit();

            \Log::info('Transaction committed, loading relationships');
            return $document->load(['institution', 'uploader']);
        } catch (\Exception $e) {
            \Log::error('uploadDocumentToFolder service exception', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            DB::rollBack();
            \Log::info('Transaction rolled back');

            // Delete uploaded file if database transaction fails
            if (isset($path) && Storage::exists($path)) {
                Storage::delete($path);
                \Log::info('Uploaded file deleted', ['path' => $path]);
            }
            throw $e;
        }
    }

    private function createFolderFromTemplate(
        User $user,
        Institution $institution,
        string $templateKey,
        string $name,
        array $targetInstitutionIds
    ): DocumentCollection {
        $folder = DocumentCollection::create([
            'name' => $name,
            'description' => "Regional folder for {$name}",
            'collection_type' => 'folder',
            'scope' => DocumentCollection::SCOPE_REGIONAL,
            'folder_key' => $templateKey,
            'is_system_folder' => true,
            'owner_institution_id' => $institution->id,
            'owner_institution_level' => $institution->level,
            'institution_id' => $institution->id,
            'created_by' => $user->id,
            'allow_school_upload' => true,
            'is_locked' => false,
        ]);

        if (!empty($targetInstitutionIds)) {
            $folder->targetInstitutions()->sync($targetInstitutionIds);
        }

        $this->logFolderAction($folder, $user, 'created', null, [
            'name' => $folder->name,
            'scope' => $folder->scope,
            'folder_key' => $folder->folder_key,
            'target_institutions_count' => count($targetInstitutionIds),
        ]);

        return $folder;
    }

    private function collectDocumentsForBulkDownload(DocumentCollection $folder, User $user): Collection
    {
        $documentsQuery = $folder->documents()->whereNull('documents.deleted_at');

        if ($user->hasRole('schooladmin')) {
            $documentsQuery->where('documents.institution_id', $user->institution_id);
        }

        return $documentsQuery->with(['institution'])->get();
    }

    private function guardBulkDownload(Collection $documents): void
    {
        if ($documents->isEmpty()) {
            throw new \RuntimeException('Folderdə yüklənəcək sənəd tapılmadı.');
        }

        $maxMb = (int) config('documents.max_bulk_zip_mb', 512);
        $totalSizeBytes = $documents->sum('file_size');
        $limitBytes = $maxMb * 1024 * 1024;

        if ($totalSizeBytes > $limitBytes) {
            throw new \RuntimeException("ZIP faylı üçün maksimum ölçü {$maxMb}MB-dir.");
        }
    }

    private function makeZipFilePath(DocumentCollection $folder): string
    {
        $zipFileName = "folder_{$folder->id}_" . time() . ".zip";
        $tempDirectory = storage_path('app/temp');

        if (!file_exists($tempDirectory)) {
            mkdir($tempDirectory, 0755, true);
        }

        return $tempDirectory . DIRECTORY_SEPARATOR . $zipFileName;
    }

    private function buildZipArchive(string $zipFilePath, Collection $documents): void
    {
        $zip = new ZipArchive();

        if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('ZIP faylı yaradılmadı.');
        }

        foreach ($documents as $document) {
            $filePath = Storage::disk('local')->path($document->file_path);

            if (!file_exists($filePath)) {
                continue;
            }

            $institutionName = $document->institution?->name ?? 'Unknown';
            $fileName = $document->original_filename ?? $document->stored_filename ?? 'document';

            $zip->addFile($filePath, "{$institutionName}/{$fileName}");
        }

        $zip->close();
    }

    private function scheduleZipCleanup(string $zipFilePath): void
    {
        register_shutdown_function(static function () use ($zipFilePath) {
            if (file_exists($zipFilePath)) {
                @unlink($zipFilePath);
            }
        });
    }

    private function validateUploadRequest(DocumentCollection $folder, UploadedFile $file, User $user): array
    {
        $this->assertAllowedMimeType($file);
        $this->assertUploadWithinUserLimit($file, $user);

        $fileHash = $this->calculateFileHash($file);

        if ($this->folderHasDuplicate($folder, $file->getClientOriginalName(), $fileHash)) {
            \Log::warning('Duplicate document upload blocked', [
                'folder_id' => $folder->id,
                'user_id' => $user->id,
                'file_name' => $file->getClientOriginalName(),
            ]);
            throw new \RuntimeException('Bu fayl artıq folderdə mövcuddur.');
        }

        return [
            'file_hash' => $fileHash,
            'max_allowed_bytes' => $this->determineUserUploadLimitBytes($user),
        ];
    }

    private function assertAllowedMimeType(UploadedFile $file): void
    {
        $mimeType = $file->getMimeType();
        $extension = strtolower($file->getClientOriginalExtension());

        if (!in_array($mimeType, Document::ALLOWED_MIME_TYPES, true)) {
            throw new \RuntimeException('Bu fayl növü dəstəklənmir.');
        }

        if (!in_array($extension, Document::ALLOWED_EXTENSIONS, true)) {
            throw new \RuntimeException('Bu fayl uzantısı üçün yükləməyə icazə verilmir.');
        }
    }

    private function assertUploadWithinUserLimit(UploadedFile $file, User $user): void
    {
        $limitBytes = $this->determineUserUploadLimitBytes($user);

        if ($file->getSize() > $limitBytes) {
            $limitMb = $this->bytesToMegabytes($limitBytes);
            throw new \RuntimeException("Fayl ölçüsü {$limitMb}MB həddini aşır.");
        }
    }

    private function determineUserUploadLimitBytes(User $user): int
    {
        $defaultLimit = Document::MAX_FILE_SIZE;

        $roleNames = collect($user->roles ?? [])
            ->pluck('name')
            ->map(fn ($role) => strtolower((string) $role))
            ->filter()
            ->values();

        if ($roleNames->isEmpty()) {
            return $defaultLimit;
        }

        $limits = $roleNames->map(function ($role) {
            return Document::ROLE_FILE_SIZE_LIMITS[$role] ?? null;
        })->filter()->values();

        if ($limits->isEmpty()) {
            return $defaultLimit;
        }

        return (int) $limits->min();
    }

    private function calculateFileHash(UploadedFile $file): ?string
    {
        $realPath = $file->getRealPath();

        if ($realPath && file_exists($realPath)) {
            return hash_file('sha256', $realPath);
        }

        return null;
    }

    private function folderHasDuplicate(DocumentCollection $folder, string $originalFilename, ?string $fileHash): bool
    {
        return $folder->documents()
            ->whereNull('documents.deleted_at')
            ->where(function ($query) use ($originalFilename, $fileHash) {
                $query->where('documents.original_filename', $originalFilename);

                if ($fileHash) {
                    $query->orWhere('documents.file_hash', $fileHash);
                }
            })
            ->exists();
    }

    private function bytesToMegabytes(int $bytes): int
    {
        return (int) ceil($bytes / 1024 / 1024);
    }

    private function persistUploadedDocument(
        DocumentCollection $folder,
        UploadedFile $file,
        string $path,
        User $user,
        array $uploadContext
    ): Document {
        $originalFilename = $file->getClientOriginalName();
        $fileExtension = $file->getClientOriginalExtension();

        \Log::info('Creating document record', [
            'original_filename' => $originalFilename,
            'extension' => $fileExtension,
        ]);

        $targetInstitutionIds = $folder->targetInstitutions()->pluck('institutions.id')->toArray();

        \Log::info('Creating document with accessible_institutions', [
            'target_institution_ids' => $targetInstitutionIds,
            'folder_id' => $folder->id,
        ]);

        return Document::create([
            'title' => pathinfo($originalFilename, PATHINFO_FILENAME),
            'original_filename' => $originalFilename,
            'stored_filename' => basename($path),
            'file_path' => $path,
            'file_extension' => $fileExtension,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'file_type' => $this->getFileType($fileExtension),
            'uploaded_by' => $user->id,
            'institution_id' => $user->institution_id,
            'category' => 'other',
            'status' => 'active',
            'is_downloadable' => true,
            'is_viewable_online' => true,
            'published_at' => now(),
            'cascade_deletable' => true,
            'file_hash' => $uploadContext['file_hash'] ?? null,
            'accessible_institutions' => $targetInstitutionIds,
        ]);
    }

    private function attachDocumentToFolder(DocumentCollection $folder, Document $document, User $user): void
    {
        \Log::info('Attaching document to folder via pivot table');
        $folder->documents()->attach($document->id, [
            'added_by' => $user->id,
            'sort_order' => $folder->documents()->count() + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        \Log::info('Document attached to folder');
    }

    /**
     * Log folder action to audit trail
     */
    private function logFolderAction(
        DocumentCollection $folder,
        User $user,
        string $action,
        ?array $oldData = null,
        ?array $newData = null,
        ?string $reason = null
    ): void {
        FolderAuditLog::create([
            'folder_id' => $folder->id,
            'user_id' => $user->id,
            'action' => $action,
            'old_data' => $oldData,
            'new_data' => $newData,
            'reason' => $reason,
            'ip_address' => request()->ip(),
        ]);
    }

    /**
     * Get file type from extension
     */
    private function getFileType(string $extension): string
    {
        $extension = strtolower($extension);

        $typeMapping = [
            'pdf' => 'pdf',
            'doc' => 'word',
            'docx' => 'word',
            'xls' => 'excel',
            'xlsx' => 'excel',
            'csv' => 'excel',
            'jpg' => 'image',
            'jpeg' => 'image',
            'png' => 'image',
            'gif' => 'image',
            'webp' => 'image',
        ];

        return $typeMapping[$extension] ?? 'other';
    }

    /**
     * Get hierarchical institution IDs (current + children)
     */
    private function getHierarchicalInstitutionIds(int $institutionId): array
    {
        $institution = Institution::find($institutionId);
        if (!$institution) {
            return [$institutionId];
        }

        $ids = [$institutionId];

        // Add parent if exists
        if ($institution->parent_id) {
            $ids[] = $institution->parent_id;
        }

        // Add children
        $children = Institution::where('parent_id', $institutionId)->pluck('id')->toArray();
        $ids = array_merge($ids, $children);

        return $ids;
    }

    /**
     * Get parent institution IDs
     */
    private function getParentInstitutionIds(int $institutionId): array
    {
        $ids = [];
        $institution = Institution::find($institutionId);

        while ($institution && $institution->parent_id) {
            $ids[] = $institution->parent_id;
            $institution = Institution::find($institution->parent_id);
        }

        return $ids;
    }
}
