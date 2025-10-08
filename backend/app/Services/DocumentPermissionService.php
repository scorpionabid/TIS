<?php

namespace App\Services;

use App\Models\Document;
use App\Services\BaseService;
use Illuminate\Support\Facades\Cache;

class DocumentPermissionService extends BaseService
{
    /**
     * Permission-specific cache configuration (Phase 2A: Redis tagged caching)
     * Override BaseService defaults for longer caching of permissions
     */
    protected int $cacheMinutes = 60; // 1 hour for permission data
    protected bool $enableCache = true;

    /**
     * Get cache tags for permission operations (Phase 2A)
     * Separate tagging from documents for independent invalidation
     */
    protected function getPermissionCacheTags(int $userId): array
    {
        return ['permissions', "permissions:user:{$userId}"];
    }

    /**
     * Generate permission-specific cache key
     */
    protected function getPermissionCacheKey(string $operation, int $userId, array $params = []): string
    {
        $paramHash = md5(json_encode($params));
        return "permissions:{$operation}:user{$userId}:{$paramHash}";
    }

    /**
     * Cache permission check result with tagging (Phase 2A optimized)
     */
    protected function cachePermissionCheck(string $cacheKey, callable $callback, int $userId = null): mixed
    {
        if (!$this->enableCache) {
            return $callback();
        }

        // Extract userId from cache key if not provided
        if ($userId === null) {
            preg_match('/user(\d+)/', $cacheKey, $matches);
            $userId = $matches[1] ?? 0;
        }

        // Use Redis cache tags for selective invalidation (if supported)
        try {
            return Cache::tags($this->getPermissionCacheTags($userId))
                        ->remember($cacheKey, now()->addMinutes($this->cacheMinutes), $callback);
        } catch (\BadMethodCallException $e) {
            // Fallback for cache drivers that don't support tagging
            return Cache::remember($cacheKey, now()->addMinutes($this->cacheMinutes), $callback);
        }
    }

    /**
     * Clear permission cache for specific user (Phase 2A optimized)
     * Allows clearing user's permission cache without affecting others
     */
    protected function clearUserPermissionCache(int $userId): void
    {
        if (!$this->enableCache) {
            return;
        }

        try {
            Cache::tags(["permissions:user:{$userId}"])->flush();
        } catch (\BadMethodCallException $e) {
            // Fallback: Clear all cache if tags not supported
            Cache::flush();
        }
    }

    /**
     * Clear all permission caches (use sparingly)
     */
    protected function clearAllPermissionCache(): void
    {
        if (!$this->enableCache) {
            return;
        }

        try {
            Cache::tags(['permissions'])->flush();
        } catch (\BadMethodCallException $e) {
            // Fallback: Clear all cache if tags not supported
            Cache::flush();
        }
    }

    /**
     * Check if user can create document with regional permissions
     */
    public function canUserCreateDocument($user, array $documentData): bool
    {

        if ($user->hasRole('superadmin')) {
            return true;
        }

        $userRole = $user->roles->first()?->name;
        $userInstitutionId = $user->institution_id;

        // Users can only create documents in their own institution or sub-institutions
        switch ($userRole) {
            case 'regionadmin':
            case 'regionoperator':
                // Regional admins can create documents for their region and sub-institutions
                $allowedInstitutions = $this->getRegionalInstitutions($userInstitutionId);
                return !isset($documentData['institution_id']) || 
                       in_array($documentData['institution_id'], $allowedInstitutions->toArray());
                
            case 'sektoradmin':
                // Sector admins can create documents for their sector and schools
                $allowedInstitutions = $this->getSectorInstitutions($userInstitutionId);
                return !isset($documentData['institution_id']) || 
                       in_array($documentData['institution_id'], $allowedInstitutions->toArray());
                
            case 'schooladmin':
            case 'müəllim':
                // School-level users can only create documents in their institution
                return !isset($documentData['institution_id']) ||
                       $documentData['institution_id'] === $userInstitutionId;

            default:
                return false;
        }
    }

    /**
     * Check if user can modify document with enhanced regional permissions
     */
    public function canUserModifyDocument($user, Document $document): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($document->uploaded_by === $user->id) {
            return true;
        }

        $userRole = $user->roles->first()?->name;
        $userInstitutionId = $user->institution_id;

        switch ($userRole) {
            case 'regionadmin':
            case 'regionoperator':
                // Regional admins can modify documents in their region
                return $this->isDocumentInUserRegion($document, $userInstitutionId);
                
            case 'sektoradmin':
                // Sector admins can modify documents in their sector
                return $this->isDocumentInUserSector($document, $userInstitutionId);
                
            case 'schooladmin':
                // School admins can only modify documents in their institution
                return $document->institution_id === $userInstitutionId;
                
            default:
                return false;
        }
    }

    /**
     * Check if user can delete document with enhanced regional permissions
     */
    public function canUserDeleteDocument($user, Document $document): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($document->uploaded_by === $user->id) {
            return true;
        }

        $userRole = $user->roles->first()?->name;

        // Only document owners and superadmins can delete documents for security
        // RegionAdmins can only delete if they uploaded the document
        return false;
    }

    /**
     * Check if user can access document based on permissions (with caching)
     */
    public function canUserAccessDocument($user, Document $document): bool
    {
        // Generate cache key based on user and document
        $cacheKey = $this->getPermissionCacheKey(
            'canAccessDocument',
            $user->id,
            [
                'doc_id' => $document->id,
                'doc_institution' => $document->institution_id,
                'doc_public' => $document->is_public,
                'doc_uploaded_by' => $document->uploaded_by,
            ]
        );

        return $this->cachePermissionCheck($cacheKey, function () use ($user, $document) {
            // Use the existing document model method with additional checks
            if (!$document->canAccess($user)) {
                return false;
            }

            // Additional regional permission checks
            if ($user->hasRole('superadmin')) {
                return true;
            }

            $userRole = $user->roles->first()?->name;
            $userInstitutionId = $user->institution_id;

            switch ($userRole) {
                case 'regionadmin':
                case 'regionoperator':
                    return $this->isDocumentInUserRegion($document, $userInstitutionId);

                case 'sektoradmin':
                    // Check if document is in user's sector
                    if ($this->isDocumentInUserSector($document, $userInstitutionId)) {
                        return true;
                    }

                    // Check if user uploaded the document
                    if ($document->uploaded_by === $user->id) {
                        return true;
                    }

                    // Check if document is public
                    if ($document->is_public) {
                        return true;
                    }

                    // Check if user's institution is in accessible_institutions
                    if ($document->accessible_institutions && is_array($document->accessible_institutions)) {
                        // Use integer comparison since institution IDs are integers
                        return in_array($userInstitutionId, $document->accessible_institutions, false);
                    }

                    return false;

                case 'schooladmin':
                case 'müəllim':
                    // Check if document belongs to user's institution
                    if ($document->institution_id === $userInstitutionId) {
                        return true;
                    }

                    // Check if user uploaded the document
                    if ($document->uploaded_by === $user->id) {
                        return true;
                    }

                    // Check if document is public
                    if ($document->is_public) {
                        return true;
                    }

                    // Check if user's institution is in accessible_institutions
                    if ($document->accessible_institutions && is_array($document->accessible_institutions)) {
                        // Use integer comparison since institution IDs are integers
                        return in_array($userInstitutionId, $document->accessible_institutions, false);
                    }

                    return false;

                default:
                    return false;
            }
        });
    }

    /**
     * Check if user can download document
     */
    public function canUserDownloadDocument($user, Document $document): bool
    {
        // SuperAdmin can always download
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // RegionAdmin special case: If they created a folder that contains this document
        // Or if their institution is in accessible_institutions, they can download
        if ($user->hasRole(['regionadmin', 'regionoperator'])) {
            // Check if user's institution is in accessible_institutions
            if ($document->accessible_institutions && is_array($document->accessible_institutions)) {
                $userInstitutionId = $user->institution_id;
                if (in_array($userInstitutionId, $document->accessible_institutions, false)) {
                    return true;
                }
            }

            // Check if document is in a folder created by this RegionAdmin
            $folderCollections = $document->collections()
                ->where('created_by', $user->id)
                ->where('scope', 'regional')
                ->exists();

            if ($folderCollections) {
                return true;
            }

            // Check if document is in user's region
            if ($this->isDocumentInUserRegion($document, $user->institution_id)) {
                return true;
            }
        }

        // Must have access first
        if (!$this->canUserAccessDocument($user, $document)) {
            return false;
        }

        // Use document model method
        return $document->canDownload($user);
    }

    /**
     * Check if user can share document
     */
    public function canUserShareDocument($user, Document $document): bool
    {
        // Must have modify permission or be owner to share
        return $this->canUserModifyDocument($user, $document);
    }

    /**
     * Get user's accessible institution IDs for document filtering (with caching)
     */
    public function getUserAccessibleInstitutions($user): array
    {
        // Generate cache key based on user's role and institution
        $cacheKey = $this->getPermissionCacheKey(
            'accessibleInstitutions',
            $user->id,
            [
                'institution_id' => $user->institution_id,
                'role' => $user->roles->first()?->name,
            ]
        );

        return $this->cachePermissionCheck($cacheKey, function () use ($user) {
            if ($user->hasRole('superadmin')) {
                return \App\Models\Institution::pluck('id')->toArray();
            }

            $userRole = $user->roles->first()?->name;
            $userInstitutionId = $user->institution_id;

            switch ($userRole) {
                case 'regionadmin':
                case 'regionoperator':
                    return $this->getRegionalInstitutions($userInstitutionId)->toArray();

                case 'sektoradmin':
                    return $this->getSectorInstitutions($userInstitutionId)->toArray();

                case 'schooladmin':
                case 'müəllim':
                    return [$userInstitutionId];

                default:
                    return [];
            }
        });
    }

    /**
     * Apply document access control to query
     */
    public function applyDocumentAccessControl($query, $user)
    {
        if ($user->hasRole('superadmin')) {
            return $query; // SuperAdmin sees all documents
        }

        $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
        
        $query->where(function($q) use ($user, $accessibleInstitutions) {
            // Documents uploaded by user
            $q->where('uploaded_by', $user->id)
              // Documents in accessible institutions
              ->orWhereIn('institution_id', $accessibleInstitutions)
              // Public documents
              ->orWhere('is_public', true)
              // Documents specifically shared with user
              ->orWhereHas('shares', function($shareQuery) use ($user) {
                  $shareQuery->where('user_id', $user->id)
                           ->where('expires_at', '>', now())
                           ->orWhereNull('expires_at');
              });
        });

        return $query;
    }

    /**
     * Get permission context for user
     */
    public function getPermissionContext($user): array
    {
        return [
            'can_create_documents' => true,
            'can_access_all_documents' => $user->hasRole('superadmin'),
            'accessible_institutions' => $this->getUserAccessibleInstitutions($user),
            'role_level' => $this->getUserRoleLevel($user),
            'max_file_size' => $this->getUserMaxFileSize($user),
            'allowed_file_types' => $this->getAllowedFileTypes($user)
        ];
    }

    /**
     * Get user's role level for permission hierarchy
     */
    private function getUserRoleLevel($user): string
    {
        if ($user->hasRole('superadmin')) {
            return 'global';
        }

        $userRole = $user->roles->first()?->name;
        
        switch ($userRole) {
            case 'regionadmin':
            case 'regionoperator':
                return 'regional';
                
            case 'sektoradmin':
                return 'sectoral';
                
            case 'schooladmin':
                return 'institutional';

            case 'müəllim':
                return 'personal';
                
            default:
                return 'none';
        }
    }

    /**
     * Get user's maximum file size limit
     */
    private function getUserMaxFileSize($user): int
    {
        if ($user->hasRole('superadmin')) {
            return 500 * 1024 * 1024; // 500MB
        }

        return 100 * 1024 * 1024; // 100MB for others
    }

    /**
     * Get allowed file types for user
     */
    private function getAllowedFileTypes($user): array
    {
        $baseTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
        
        if ($user->hasRole(['superadmin', 'regionadmin', 'sektoradmin'])) {
            return array_merge($baseTypes, ['zip', 'rar', 'jpg', 'jpeg', 'png', 'gif']);
        }

        return $baseTypes;
    }

    /**
     * Get all institutions in user's region
     */
    private function getRegionalInstitutions($regionId)
    {
        return \App\Models\Institution::where(function($q) use ($regionId) {
            $q->where('id', $regionId) // The region itself
              ->orWhere('parent_id', $regionId); // Sectors
        })->get()->pluck('id')
        ->merge(
            \App\Models\Institution::whereIn('parent_id', 
                \App\Models\Institution::where('parent_id', $regionId)->pluck('id')
            )->pluck('id') // Schools
        );
    }

    /**
     * Get all institutions in user's sector
     */
    private function getSectorInstitutions($sektorId)
    {
        return \App\Models\Institution::where('parent_id', $sektorId)->pluck('id')
               ->push($sektorId);
    }

    /**
     * Check if document is in user's region
     */
    private function isDocumentInUserRegion(Document $document, $userRegionId): bool
    {
        $allowedInstitutions = $this->getRegionalInstitutions($userRegionId);
        return $allowedInstitutions->contains($document->institution_id);
    }

    /**
     * Check if document is in user's sector
     */
    private function isDocumentInUserSector(Document $document, $userSektorId): bool
    {
        $allowedInstitutions = $this->getSectorInstitutions($userSektorId);
        return $allowedInstitutions->contains($document->institution_id);
    }

    /**
     * Validate document permissions for operation
     */
    public function validateDocumentPermissions($user, Document $document, string $operation): array
    {
        $errors = [];

        switch ($operation) {
            case 'view':
                if (!$this->canUserAccessDocument($user, $document)) {
                    $errors[] = 'Bu sənədə giriş icazəniz yoxdur.';
                }
                break;

            case 'download':
                if (!$this->canUserDownloadDocument($user, $document)) {
                    $errors[] = 'Bu sənədi yükləmək icazəniz yoxdur.';
                }
                break;

            case 'modify':
                if (!$this->canUserModifyDocument($user, $document)) {
                    $errors[] = 'Bu sənədi dəyişdirmək icazəniz yoxdur.';
                }
                break;

            case 'delete':
                if (!$this->canUserDeleteDocument($user, $document)) {
                    $errors[] = 'Bu sənədi silmək icazəniz yoxdur.';
                }
                break;

            case 'share':
                if (!$this->canUserShareDocument($user, $document)) {
                    $errors[] = 'Bu sənədi paylaşmaq icazəniz yoxdur.';
                }
                break;

            default:
                $errors[] = 'Naməlum əməliyyat.';
        }

        return [
            'is_valid' => empty($errors),
            'errors' => $errors
        ];
    }

    /**
     * Get user's superior institutions (parent institutions in hierarchy) with caching
     * SchoolAdmin can target their sector and region
     * SektorAdmin can target their region
     */
    public function getUserSuperiorInstitutions($user): array
    {
        // Generate cache key based on user's role and institution
        $cacheKey = $this->getPermissionCacheKey(
            'superiorInstitutions',
            $user->id,
            [
                'institution_id' => $user->institution_id,
                'role' => $user->roles->first()?->name,
            ]
        );

        return $this->cachePermissionCheck($cacheKey, function () use ($user) {
            if ($user->hasRole('superadmin')) {
                return \App\Models\Institution::pluck('id')->toArray();
            }

            $userRole = $user->roles->first()?->name;
            $userInstitutionId = $user->institution_id;

            if (!$userInstitutionId) {
                return [];
            }

            $userInstitution = \App\Models\Institution::find($userInstitutionId);

            if (!$userInstitution) {
                return [];
            }

            $superiorIds = [];

            switch ($userRole) {
                case 'schooladmin':
                    // School can target: sector (parent) and region (grandparent)
                    if ($userInstitution->parent_id) {
                        $sector = \App\Models\Institution::find($userInstitution->parent_id);
                        $superiorIds[] = $sector->id;

                        if ($sector && $sector->parent_id) {
                            $superiorIds[] = $sector->parent_id; // Region
                        }
                    }
                    break;

                case 'sektoradmin':
                    // Sector can target: region (parent)
                    if ($userInstitution->parent_id) {
                        $superiorIds[] = $userInstitution->parent_id;
                    }
                    break;

                case 'regionadmin':
                case 'regionoperator':
                    // Regional users see all sub-institutions (for document distribution)
                    // They can select which sectors/schools to share documents with
                    return $this->getRegionalInstitutions($userInstitutionId)->toArray();

                default:
                    return [];
            }

            return array_unique($superiorIds);
        });
    }
}