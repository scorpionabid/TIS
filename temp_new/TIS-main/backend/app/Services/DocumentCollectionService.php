<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentCollection;
use App\Models\FolderAuditLog;
use App\Models\Institution;
use App\Models\User;
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
    public function createRegionalFolders(User $user, Institution $institution, ?array $folderTemplates = null, array $targetInstitutionIds = [], array $targetUserIds = []): array
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
                    $targetInstitutionIds,
                    $targetUserIds
                );
            }

            $this->clearUserFolderCache($user);
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
            if (! $this->canManageFolder($user, $folder)) {
                throw new \Exception('Unauthorized to update this folder');
            }

            // If folder is locked, only SuperAdmin can change attributes other than 'is_locked'
            if ($folder->is_locked && ! $user->hasRole('superadmin')) {
                // If they are trying to unlock it, allow ONLY that change
                if (isset($data['is_locked']) && $data['is_locked'] === false) {
                    // We will proceed to update just the is_locked field
                    $data = ['is_locked' => false];
                } else {
                    throw new \Exception('Qovluq kilidlidir. Dəyişiklik etmək üçün əvvəlcə kilidi açın.');
                }
            }

            $oldData = [
                'name' => $folder->name,
                'description' => $folder->description,
                'allow_school_upload' => $folder->allow_school_upload,
                'is_locked' => $folder->is_locked,
                'target_institutions' => $folder->targetInstitutions()->pluck('institutions.id')->toArray(),
                'target_user_ids' => $folder->targetUsers()->pluck('users.id')->toArray(),
            ];

            // Extract relationship data
            $targetInstitutionIds = $data['target_institutions'] ?? null;
            $targetUserIds = $data['target_user_ids'] ?? null;
            
            // Remove from data array to prevent mass assignment issues if columns don't exist
            unset($data['target_institutions'], $data['target_user_ids']);

            $folder->update($data);

            // Sync relationships if provided
            if ($targetInstitutionIds !== null) {
                $folder->targetInstitutions()->sync($targetInstitutionIds);
            }
            if ($targetUserIds !== null) {
                $syncData = [];
                foreach ($targetUserIds as $userData) {
                    if (is_array($userData)) {
                        $syncData[$userData['id']] = [
                            'can_delete' => $userData['can_delete'] ?? false,
                            'can_upload' => $userData['can_upload'] ?? true,
                            'can_view' => $userData['can_view'] ?? true,
                        ];
                    } else {
                        $syncData[$userData] = [
                            'can_delete' => false,
                            'can_upload' => true,
                            'can_view' => true,
                        ];
                    }
                }
                $folder->targetUsers()->sync($syncData);
            }

            $newData = [
                'name' => $folder->name,
                'description' => $folder->description,
                'allow_school_upload' => $folder->allow_school_upload,
                'is_locked' => $folder->is_locked,
                'target_institutions' => $folder->targetInstitutions()->pluck('institutions.id')->toArray(),
                'target_user_ids' => $folder->targetUsers()->pluck('users.id')->toArray(),
            ];

            // Determine action type
            $action = 'updated';
            if ($oldData['name'] !== $newData['name']) {
                $action = 'renamed';
            }

            $this->logFolderAction($folder, $user, $action, $oldData, $newData, $reason);

            $this->clearUserFolderCache($user);
            DB::commit();

            return $folder->fresh(['creator', 'ownerInstitution', 'targetInstitutions', 'targetUsers']);
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
        if (! $this->canManageFolder($user, $folder)) {
            throw new \Exception('Unauthorized to delete this folder');
        }

        if ($folder->is_locked && ! $user->hasRole('superadmin')) {
            throw new \Exception('Qovluq kilidlidir. Silmək üçün əvvəlcə kilidi açın.');
        }

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

            $this->clearUserFolderCache($user);
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
        $cacheKey = "user_{$user->id}_accessible_folders_v10";
        
        return \Cache::remember($cacheKey, 60, function () use ($user) {
            $query = DocumentCollection::query()
                ->with(['ownerInstitution', 'institution', 'creator', 'targetInstitutions', 'targetUsers'])
                ->withCount('documents as documents_count')
                ->selectSub(function ($q) {
                    $q->selectRaw('count(distinct institution_id)')
                      ->from('documents')
                      ->whereIn('id', function ($sub) {
                          $sub->select('document_id')
                              ->from('document_collection_items')
                              ->whereColumn('collection_id', 'document_collections.id');
                      })
                      ->whereNull('deleted_at');
                }, 'participating_institutions_count');

            // SuperAdmin sees all folders
            if ($user->hasRole('superadmin')) {
                return $query->get();
            }

            $myInstId = (int) $user->institution_id;
            
            // All admin roles see folders in their hierarchy (themselves, parents, children)
            if ($user->hasAnyRole(['regionadmin', 'sektoradmin', 'schooladmin', 'məktəbadmin', 'regionoperator'])) {
                if ($myInstId > 0) {
                    $parentIds = $this->getParentInstitutionIds($myInstId);
                    $childIds = $this->getHierarchicalInstitutionIds($myInstId);
                    
                    $relevantIds = array_unique(array_merge([$myInstId], $parentIds, $childIds));

                    $query->where(function($q) use ($relevantIds, $myInstId, $user) {
                        $q->where(function($innerQ) use ($relevantIds) {
                            $innerQ->whereIn('owner_institution_id', $relevantIds)
                                   ->orWhereIn('institution_id', $relevantIds);
                        })
                          ->orWhereHas('targetInstitutions', function($subQ) use ($myInstId) {
                              $subQ->where('institution_id', $myInstId);
                          })
                          ->orWhereHas('targetUsers', function($subQ) use ($user) {
                              $subQ->where('user_id', $user->id);
                          })
                          ->orWhere('created_by', $user->id);
                    });
                } else {
                    $query->where('created_by', $user->id);
                }
            } else {
                // Non-admin roles (Teachers, etc.): see folders targeting their institution or directly assigned to them
                $query->where(function ($q) use ($user, $myInstId) {
                    if ($myInstId > 0) {
                        $q->whereHas('targetInstitutions', function($subQ) use ($myInstId) {
                            $subQ->where('institution_id', $myInstId);
                        });
                    }
                    
                    $q->orWhereHas('targetUsers', function($subQ) use ($user) {
                        $subQ->where('user_id', $user->id);
                    });
                    
                    $q->orWhere('created_by', $user->id);
                });
            }

            return $query->orderBy('created_at', 'desc')->get();
        });
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

        // Admin roles can manage folders owned by their institution
        if ($user->hasAnyRole(['regionadmin', 'sektoradmin', 'schooladmin', 'məktəbadmin', 'regionoperator'])) {
            if ((int) $folder->owner_institution_id === (int) $user->institution_id) {
                return true;
            }
        }

        // Folder creator can manage their folders
        if ($folder->created_by === $user->id) {
            return true;
        }

        return false;
    }

    /**
     * Toggle folder lock status
     */
    public function toggleFolderLock(DocumentCollection $folder, User $user): DocumentCollection
    {
        // Only SuperAdmin or the owner institution admin can lock/unlock
        if (! $user->hasRole('superadmin') && 
            (int) $folder->owner_institution_id !== (int) $user->institution_id &&
            $folder->created_by !== $user->id) {
            throw new \Exception('Unauthorized to toggle folder lock');
        }

        $folder->is_locked = ! $folder->is_locked;
        $folder->save();

        $this->clearUserFolderCache($user);

        $action = $folder->is_locked ? 'locked' : 'unlocked';
        $this->logFolderAction($folder, $user, $action, null, ['is_locked' => $folder->is_locked]);

        return $folder->fresh(['creator', 'ownerInstitution', 'targetInstitutions']);
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

        // SchoolAdmin sees:
        // 1. Their own institution's documents
        // 2. Documents from the folder owner (Region/Sector)
        if ($user->hasAnyRole(['schooladmin', 'məktəbadmin'])) {
            $query->where(function($q) use ($user, $folder) {
                $q->where('institution_id', $user->institution_id)
                  ->orWhere('institution_id', $folder->owner_institution_id);
            });
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
            ->when($user->hasAnyRole(['schooladmin', 'məktəbadmin']), function ($query) use ($user, $folder) {
                // SchoolAdmin sees:
                // 1. Their own institution's documents
                // 2. Documents from the folder owner (Region/Sector) which are intended for everyone
                $query->where(function($q) use ($user, $folder) {
                    $q->where('documents.institution_id', $user->institution_id)
                      ->orWhere('documents.institution_id', $folder->owner_institution_id);
                });
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
                if (! $institution) {
                    return false;
                }

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
                if (! $institution) {
                    return false;
                }

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
        }, SORT_REGULAR, ! $ascending)->values();
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

            if (! $path || ! Storage::disk('local')->exists($path)) {
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
        array $targetInstitutionIds,
        array $targetUserIds = []
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

        if (! empty($targetInstitutionIds)) {
            $folder->targetInstitutions()->sync($targetInstitutionIds);
        }

        if (! empty($targetUserIds)) {
            $syncData = [];
            foreach ($targetUserIds as $userData) {
                if (is_array($userData)) {
                    $syncData[$userData['id']] = [
                        'can_delete' => $userData['can_delete'] ?? false,
                        'can_upload' => $userData['can_upload'] ?? true,
                        'can_view' => $userData['can_view'] ?? true,
                    ];
                } else {
                    $syncData[$userData] = [
                        'can_delete' => false,
                        'can_upload' => true,
                        'can_view' => true,
                    ];
                }
            }
            $folder->targetUsers()->sync($syncData);
        }

        $this->logFolderAction($folder, $user, 'created', null, [
            'name' => $folder->name,
            'scope' => $folder->scope,
            'folder_key' => $folder->folder_key,
            'target_institutions_count' => count($targetInstitutionIds),
            'target_users_count' => count($targetUserIds),
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
        $zipFileName = "folder_{$folder->id}_" . time() . '.zip';
        $tempDirectory = storage_path('app/temp');

        if (! file_exists($tempDirectory)) {
            mkdir($tempDirectory, 0755, true);
        }

        return $tempDirectory . DIRECTORY_SEPARATOR . $zipFileName;
    }

    private function buildZipArchive(string $zipFilePath, Collection $documents): void
    {
        $zip = new ZipArchive;

        if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('ZIP faylı yaradılmadı.');
        }

        foreach ($documents as $document) {
            $filePath = Storage::disk('local')->path($document->file_path);

            if (! file_exists($filePath)) {
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
        // Check if folder is locked (Global lock)
        if ($folder->is_locked) {
            \Log::warning('Upload attempt to locked folder', [
                'folder_id' => $folder->id,
                'user_id' => $user->id,
            ]);
            throw new \RuntimeException('Bu qovluq kilidlidir. Yeni sənəd yükləmək mümkün deyil.');
        }

        // Check if school uploads are allowed (for school admins)
        if (! $folder->allow_school_upload && $user->hasRole('schooladmin')) {
            \Log::warning('School upload attempt to restricted folder', [
                'folder_id' => $folder->id,
                'user_id' => $user->id,
            ]);
            throw new \RuntimeException('Bu qovluğa məktəblər tərəfindən sənəd yüklənilməsi dayandırılıb.');
        }

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

        if (! in_array($mimeType, Document::ALLOWED_MIME_TYPES, true)) {
            throw new \RuntimeException('Bu fayl növü dəstəklənmir.');
        }

        if (! in_array($extension, Document::ALLOWED_EXTENSIONS, true)) {
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

        // accessible_institutions is kept for download access control.
        // Separation from my-resources is handled in getAssignedResources via whereDoesntHave('collections').
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
        if ($institutionId <= 0) {
            return [];
        }

        return \Cache::remember("inst_{$institutionId}_hierarchy_v10", 3600, function () use ($institutionId) {
            $institution = Institution::withoutGlobalScopes()->find($institutionId);
            if (! $institution) {
                return [$institutionId];
            }

            return $institution->getAllChildrenIds();
        });
    }

    /**
     * Get parent institution IDs
     */
    private function getParentInstitutionIds(int $institutionId): array
    {
        if ($institutionId <= 0) {
            return [];
        }

        return \Cache::remember("inst_{$institutionId}_parents_v10", 3600, function () use ($institutionId) {
            $ids = [];
            $visited = [$institutionId];
            $institution = Institution::withoutGlobalScopes()->find($institutionId);

            while ($institution && $institution->parent_id && ! in_array($institution->parent_id, $visited)) {
                $ids[] = $institution->parent_id;
                $visited[] = $institution->parent_id;
                $institution = Institution::withoutGlobalScopes()->find($institution->parent_id);

                // Maximum hierarchy depth safety
                if (count($visited) > 20) {
                    break;
                }
            }

            return $ids;
        });
    }
    /**
     * Clear the cache for user's accessible folders
     */
    private function clearUserFolderCache(User $user): void
    {
        $cacheKey = "user_{$user->id}_accessible_folders_v10";
        \Cache::forget($cacheKey);
    }
}
