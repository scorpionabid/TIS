<?php

namespace App\Services;

use App\Models\DocumentCollection;
use App\Models\Document;
use App\Models\FolderAuditLog;
use App\Models\User;
use App\Models\Institution;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class DocumentCollectionService
{
    /**
     * Create regional folders from templates for a specific institution
     */
    public function createRegionalFolders(User $user, Institution $institution, array $folderTemplates = null, array $targetInstitutionIds = []): array
    {
        $folderTemplates = $folderTemplates ?? DocumentCollection::REGIONAL_TEMPLATES;
        $createdFolders = [];

        DB::beginTransaction();
        try {
            foreach ($folderTemplates as $key => $name) {
                $folder = DocumentCollection::create([
                    'name' => $name,
                    'description' => "Regional folder for {$name}",
                    'collection_type' => 'folder',
                    'scope' => DocumentCollection::SCOPE_REGIONAL,
                    'folder_key' => $key,
                    'is_system_folder' => true,
                    'owner_institution_id' => $institution->id,
                    'owner_institution_level' => $institution->level,
                    'institution_id' => $institution->id,
                    'created_by' => $user->id,
                    'allow_school_upload' => true,
                    'is_locked' => false,
                ]);

                // Attach target institutions if provided
                if (!empty($targetInstitutionIds)) {
                    $folder->targetInstitutions()->sync($targetInstitutionIds);
                }

                // Log folder creation
                $this->logFolderAction($folder, $user, 'created', null, [
                    'name' => $folder->name,
                    'scope' => $folder->scope,
                    'folder_key' => $folder->folder_key,
                    'target_institutions_count' => count($targetInstitutionIds),
                ]);

                $createdFolders[] = $folder;
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
            return $folder->owner_institution_id === $user->institution_id
                || $folder->user_id === $user->id;
        }

        // Folder owner can manage their own folders
        if ($folder->user_id === $user->id && !$folder->is_locked) {
            return true;
        }

        return false;
    }

    /**
     * Bulk download all documents in a folder as ZIP
     */
    public function bulkDownloadFolder(DocumentCollection $folder, User $user): string
    {
        $zipFileName = "folder_{$folder->id}_{$folder->name}_" . time() . ".zip";
        $zipFilePath = storage_path("app/temp/{$zipFileName}");

        // Ensure temp directory exists
        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $zip = new ZipArchive();

        if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new \Exception("Cannot create ZIP file");
        }

        // Get documents for user's institution if SchoolAdmin, otherwise all documents
        $documents = $folder->documents()->whereNull('deleted_at');

        if ($user->hasRole('SchoolAdmin')) {
            $documents = $documents->where('institution_id', $user->institution_id);
        }

        $documents = $documents->get();

        foreach ($documents as $document) {
            $filePath = Storage::path($document->file_path);
            if (file_exists($filePath)) {
                // Organize by institution name if multi-institution view
                $institutionName = $document->institution?->name ?? 'Unknown';
                $zip->addFile($filePath, "{$institutionName}/{$document->file_name}");
            }
        }

        $zip->close();

        // Log bulk download action
        $this->logFolderAction($folder, $user, 'bulk_downloaded', null, [
            'documents_count' => $documents->count(),
            'zip_file' => $zipFileName,
        ]);

        return $zipFilePath;
    }

    /**
     * Get documents in folder filtered by user's institution (for SchoolAdmin)
     */
    public function getFolderDocuments(DocumentCollection $folder, User $user): Collection
    {
        $query = $folder->documents()->whereNull('deleted_at');

        // SchoolAdmin sees only their own institution's documents
        if ($user->hasRole('SchoolAdmin')) {
            $query->where('institution_id', $user->institution_id);
        }

        return $query->with(['institution', 'user'])->get();
    }

    /**
     * Upload document to folder
     */
    public function uploadDocumentToFolder(DocumentCollection $folder, $file, User $user): Document
    {
        DB::beginTransaction();
        try {
            // Store the file
            $path = $file->store('documents', 'local');

            // Create document record
            $document = Document::create([
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'institution_id' => $user->institution_id,
                'user_id' => $user->id,
                'collection_id' => $folder->id,
                'cascade_deletable' => true, // Can be deleted with folder
            ]);

            // Log document upload to audit trail
            $this->logFolderAction($folder, $user, 'document_uploaded', null, [
                'document_id' => $document->id,
                'file_name' => $document->file_name,
                'file_size' => $document->file_size,
            ]);

            DB::commit();
            return $document->load(['institution', 'user']);
        } catch (\Exception $e) {
            DB::rollBack();
            // Delete uploaded file if database transaction fails
            if (isset($path) && Storage::exists($path)) {
                Storage::delete($path);
            }
            throw $e;
        }
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
