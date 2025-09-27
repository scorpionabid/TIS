<?php

namespace App\Services;

use App\Models\Document;
use App\Services\BaseService;

class DocumentPermissionService extends BaseService
{
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
                
            case 'məktəbadmin':
            case 'schooladmin':
            case 'müəllim':
            case 'teacher':
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
                
            case 'məktəbadmin':
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
     * Check if user can access document based on permissions
     */
    public function canUserAccessDocument($user, Document $document): bool
    {
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
                return $this->isDocumentInUserSector($document, $userInstitutionId);
                
            case 'məktəbadmin':
            case 'schooladmin':
            case 'müəllim':
            case 'teacher':
                return $document->institution_id === $userInstitutionId || 
                       $document->uploaded_by === $user->id;
                
            default:
                return false;
        }
    }

    /**
     * Check if user can download document
     */
    public function canUserDownloadDocument($user, Document $document): bool
    {
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
     * Get user's accessible institution IDs for document filtering
     */
    public function getUserAccessibleInstitutions($user): array
    {
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
                
            case 'məktəbadmin':
            case 'schooladmin':
            case 'müəllim':
            case 'teacher':
                return [$userInstitutionId];
                
            default:
                return [];
        }
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
                
            case 'məktəbadmin':
            case 'schooladmin':
                return 'institutional';
                
            case 'müəllim':
            case 'teacher':
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
}