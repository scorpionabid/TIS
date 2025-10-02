<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Document extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'original_filename',
        'stored_filename',
        'file_path',
        'file_extension',
        'mime_type',
        'file_size',
        'file_hash',
        'file_type',
        'access_level',
        'uploaded_by',
        'institution_id',
        'allowed_users',
        'allowed_roles',
        'allowed_institutions',
        'accessible_institutions',
        'accessible_departments',
        'parent_document_id',
        'version',
        'is_latest_version',
        'version_notes',
        'category',
        'tags',
        'status',
        'is_public',
        'is_downloadable',
        'is_viewable_online',
        'expires_at',
        'published_at',
        'archived_at',
        'metadata',
        'content_preview',
        'cascade_deletable',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'allowed_users' => 'array',
        'allowed_roles' => 'array',
        'allowed_institutions' => 'array',
        'accessible_institutions' => 'array',
        'accessible_departments' => 'array',
        'is_latest_version' => 'boolean',
        'tags' => 'array',
        'is_public' => 'boolean',
        'is_downloadable' => 'boolean',
        'is_viewable_online' => 'boolean',
        'cascade_deletable' => 'boolean',
        'expires_at' => 'datetime',
        'deleted_at' => 'datetime',
        'published_at' => 'datetime',
        'archived_at' => 'datetime',
        'metadata' => 'array',
    ];

    // Constants from PRD-2
    const FILE_TYPES = [
        'pdf' => 'PDF sənədləri',
        'excel' => 'Excel faylları',
        'word' => 'Word sənədləri',
        'image' => 'Şəkillər (minimal)',
        'other' => 'Digər',
    ];

    const ACCESS_LEVELS = [
        'public' => 'Hamı görə bilər',
        'regional' => 'Region daxilində',
        'sectoral' => 'Sektor daxilində',
        'institution' => 'Müəssisə daxilində',
    ];

    const CATEGORIES = [
        'administrative' => 'İdarəetmə sənədləri',
        'financial' => 'Maliyyə sənədləri',
        'educational' => 'Təhsil materialları',
        'hr' => 'İnsan resursları',
        'technical' => 'Texniki sənədlər',
        'legal' => 'Hüquqi sənədlər',
        'reports' => 'Hesabatlar',
        'forms' => 'Formalar',
        'other' => 'Digər',
    ];

    const STATUSES = [
        'draft' => 'Qaralama',
        'active' => 'Aktiv',
        'archived' => 'Arxivlənmiş',
        'deleted' => 'Silinmiş',
    ];

    // PRD-2: File size limits - Role-based limits
    const MAX_FILE_SIZE = 10485760; // 10MB in bytes (default)
    const ROLE_FILE_SIZE_LIMITS = [
        'superadmin' => 52428800,    // 50MB
        'regionadmin' => 52428800,   // 50MB
        'schooladmin' => 20971520,   // 20MB
        'sektoradmin' => 20971520,   // 20MB
        'muavin' => 20971520,        // 20MB
        'ubr' => 20971520,           // 20MB
        'tesarrufat' => 20971520,    // 20MB
        'psixoloq' => 20971520,      // 20MB
        'müəllim' => 20971520,       // 20MB
    ];
    
    // PRD-2: Allowed file types - PDF, Excel, Word (JPG minimal hallarda)
    const ALLOWED_MIME_TYPES = [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
    ];

    const ALLOWED_EXTENSIONS = [
        'pdf', 'xls', 'xlsx', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif'
    ];

    /**
     * Uploader relationship
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Institution relationship
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Parent document (for versioning)
     */
    public function parentDocument(): BelongsTo
    {
        return $this->belongsTo(Document::class, 'parent_document_id');
    }

    /**
     * Child versions
     */
    public function versions(): HasMany
    {
        return $this->hasMany(Document::class, 'parent_document_id')->orderBy('version', 'desc');
    }

    /**
     * Document shares
     */
    public function shares(): HasMany
    {
        return $this->hasMany(DocumentShare::class);
    }

    /**
     * Download logs
     */
    public function downloads(): HasMany
    {
        return $this->hasMany(DocumentDownload::class);
    }

    /**
     * Scope: Active documents
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope: Latest versions only
     */
    public function scopeLatestVersions(Builder $query): Builder
    {
        return $query->where('is_latest_version', true);
    }

    /**
     * Scope: Public documents
     */
    public function scopePublic(Builder $query): Builder
    {
        return $query->where('is_public', true);
    }

    /**
     * Scope: By category
     */
    public function scopeByCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }

    /**
     * Scope: By file type
     */
    public function scopeByFileType(Builder $query, string $fileType): Builder
    {
        return $query->where('file_type', $fileType);
    }

    /**
     * Scope: By access level
     */
    public function scopeByAccessLevel(Builder $query, string $accessLevel): Builder
    {
        return $query->where('access_level', $accessLevel);
    }

    /**
     * Scope: Expiring soon
     */
    public function scopeExpiringSoon(Builder $query, int $days = 7): Builder
    {
        return $query->whereNotNull('expires_at')
                    ->where('expires_at', '<=', now()->addDays($days))
                    ->where('expires_at', '>', now());
    }

    /**
     * Scope: Expired documents
     */
    public function scopeExpired(Builder $query): Builder
    {
        return $query->whereNotNull('expires_at')
                    ->where('expires_at', '<', now());
    }

    /**
     * Scope: Documents accessible by user with regional filtering
     */
    public function scopeAccessibleBy(Builder $query, User $user): Builder
    {
        $userRole = $user->roles->first()?->name;
        
        return $query->where(function ($q) use ($user, $userRole) {
            // SuperAdmin can see all documents
            if ($userRole === 'superadmin') {
                return; // No restrictions
            }
            
            // Apply regional filtering based on user role
            $this->applyRegionalDocumentFiltering($q, $user, $userRole);
        });
    }

    /**
     * Apply regional filtering for documents based on user role
     */
    private function applyRegionalDocumentFiltering($query, User $user, $userRole)
    {
        $userInstitutionId = $user->institution_id;

        switch ($userRole) {
            case 'regionadmin':
            case 'regionoperator':
                // Regional admins can see documents in their region and sub-institutions
                $this->applyRegionAdminDocumentFiltering($query, $user, $userInstitutionId);
                break;

            case 'sektoradmin':
                // Sector admins can see documents in their sector and schools
                $this->applySektorAdminDocumentFiltering($query, $user, $userInstitutionId);
                break;

            case 'məktəbadmin':
            case 'müəllim':
                // School-level users can only see documents in their institution
                $this->applySchoolDocumentFiltering($query, $user, $userInstitutionId);
                break;

            default:
                // Unknown role - very restricted access
                $query->where('uploaded_by', $user->id)
                      ->orWhere('is_public', true);
                break;
        }
    }

    /**
     * Check if user can access document
     */
    public function canAccess(User $user): bool
    {
        // Document owner can always access
        if ($this->uploaded_by === $user->id) {
            return true;
        }

        // Public documents
        if ($this->is_public) {
            return true;
        }

        // Check if user is in allowed users
        if ($this->allowed_users && in_array($user->id, $this->allowed_users)) {
            return true;
        }

        // Check role-based access
        if ($this->allowed_roles) {
            $userRoles = $user->roles->pluck('name')->toArray();
            if (array_intersect($userRoles, $this->allowed_roles)) {
                return true;
            }
        }

        // Check access level permissions
        switch ($this->access_level) {
            case 'public':
                return true;
            case 'institution':
                // Check if belongs to same institution
                if ($user->institution_id === $this->institution_id) {
                    return true;
                }

                // HIERARCHICAL ACCESS: Check if user's institution is a parent of document's institution
                // This allows RegionAdmin, SektorAdmin to access sub-institution documents
                if ($user->institution && $this->institution) {
                    $isParentInstitution = $this->isUserInstitutionParent($user->institution, $this->institution);
                    if ($isParentInstitution) {
                        return true;
                    }
                }
                // Don't return false here - continue to check accessible_institutions
                break;
            case 'sectoral':
                // Check if same sector
                if ($user->institution && $this->institution) {
                    if ($user->institution->parent_id === $this->institution->parent_id) {
                        return true;
                    }
                }
                // Don't return false - continue to check accessible_institutions
                break;
            case 'regional':
                // Check if same region
                if ($user->institution && $this->institution) {
                    $userRegion = $user->institution->getRegionalParent();
                    $docRegion = $this->institution->getRegionalParent();
                    if ($userRegion && $docRegion && $userRegion->id === $docRegion->id) {
                        return true;
                    }
                }
                // Don't return false - continue to check accessible_institutions
                break;
        }

        // Check if user's institution is in accessible_institutions
        if ($this->accessible_institutions && is_array($this->accessible_institutions) && $user->institution_id) {
            // Use integer comparison since institution IDs are integers
            if (in_array($user->institution_id, $this->accessible_institutions, false)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if user can download document
     */
    public function canDownload(User $user): bool
    {
        return $this->canAccess($user) && $this->is_downloadable;
    }

    /**
     * Check if user can edit document
     */
    public function canEdit(User $user): bool
    {
        return $this->uploaded_by === $user->id || $user->hasRole(['superadmin', 'regionadmin']);
    }

    /**
     * Get formatted file size
     */
    public function getFormattedFileSizeAttribute(): string
    {
        $bytes = $this->file_size;
        
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        } else {
            return $bytes . ' bytes';
        }
    }

    /**
     * Get file type label
     */
    public function getFileTypeLabelAttribute(): string
    {
        return self::FILE_TYPES[$this->file_type] ?? $this->file_type;
    }

    /**
     * Get access level label
     */
    public function getAccessLevelLabelAttribute(): string
    {
        return self::ACCESS_LEVELS[$this->access_level] ?? $this->access_level;
    }

    /**
     * Get category label
     */
    public function getCategoryLabelAttribute(): string
    {
        return self::CATEGORIES[$this->category] ?? $this->category;
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    /**
     * Check if document is expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    /**
     * Check if document is expiring soon
     */
    public function isExpiringSoon(int $days = 7): bool
    {
        return $this->expires_at && 
               $this->expires_at->isFuture() && 
               $this->expires_at->diffInDays(now()) <= $days;
    }

    /**
     * Create new version of document
     */
    public function createNewVersion(array $data): Document
    {
        // Mark current version as not latest
        $this->update(['is_latest_version' => false]);

        // Generate new version number
        $versionParts = explode('.', $this->version);
        $versionParts[count($versionParts) - 1]++;
        $newVersion = implode('.', $versionParts);

        // Create new version
        $newVersionData = array_merge($data, [
            'parent_document_id' => $this->parent_document_id ?? $this->id,
            'version' => $newVersion,
            'is_latest_version' => true,
            'title' => $data['title'] ?? $this->title,
            'description' => $data['description'] ?? $this->description,
            'category' => $data['category'] ?? $this->category,
            'access_level' => $data['access_level'] ?? $this->access_level,
            'institution_id' => $this->institution_id,
            'uploaded_by' => $data['uploaded_by'] ?? $this->uploaded_by,
        ]);

        return self::create($newVersionData);
    }

    /**
     * Get all versions of this document
     */
    public function getAllVersions()
    {
        $parentId = $this->parent_document_id ?? $this->id;
        
        return self::where(function ($query) use ($parentId) {
            $query->where('id', $parentId)
                  ->orWhere('parent_document_id', $parentId);
        })->orderBy('version', 'desc')->get();
    }

    /**
     * Generate unique stored filename
     */
    public static function generateStoredFilename(string $originalFilename): string
    {
        $extension = pathinfo($originalFilename, PATHINFO_EXTENSION);
        $timestamp = now()->format('Y-m-d_H-i-s');
        $random = Str::random(8);
        
        return "{$timestamp}_{$random}.{$extension}";
    }

    /**
     * Get file download URL
     */
    public function getDownloadUrlAttribute(): string
    {
        return route('documents.download', $this->id);
    }

    /**
     * Get file preview URL
     */
    public function getPreviewUrlAttribute(): string
    {
        return route('documents.preview', $this->id);
    }

    /**
     * Get document analytics
     */
    public function getAnalytics(): array
    {
        return [
            'total_downloads' => $this->downloads()->count(),
            'unique_downloaders' => $this->downloads()->distinct('user_id')->count('user_id'),
            'total_views' => $this->downloads()->where('download_type', 'preview')->count(),
            'shares_count' => $this->shares()->count(),
            'active_shares' => $this->shares()->where('is_active', true)->where('expires_at', '>', now())->count(),
            'last_downloaded' => $this->downloads()->latest()->first()?->created_at,
            'download_by_type' => $this->downloads()
                ->selectRaw('download_type, COUNT(*) as count')
                ->groupBy('download_type')
                ->pluck('count', 'download_type')
                ->toArray(),
        ];
    }

    /**
     * Archive document
     */
    public function archive(?string $reason = null): bool
    {
        return $this->update([
            'status' => 'archived',
            'archived_at' => now(),
            'metadata' => array_merge($this->metadata ?? [], [
                'archive_reason' => $reason,
                'archived_by' => auth()->id(),
            ])
        ]);
    }

    /**
     * Validate file before upload with role-based size limits
     */
    public static function validateFile($file, $userRole = null): array
    {
        $errors = [];

        // Check file size with role-based limits
        $maxFileSize = self::getMaxFileSizeForRole($userRole);
        if ($file->getSize() > $maxFileSize) {
            $maxSizeMB = round($maxFileSize / 1048576);
            $errors[] = "Fayl ölçüsü {$maxSizeMB}MB-dan böyük ola bilməz.";
        }

        // Check file type (PRD-2: PDF, Excel, Word only)
        $mimeType = $file->getMimeType();
        if (!in_array($mimeType, self::ALLOWED_MIME_TYPES)) {
            $errors[] = "Yalnız PDF, Excel və Word faylları yüklənə bilər.";
        }

        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, self::ALLOWED_EXTENSIONS)) {
            $errors[] = "Bu fayl növü dəstəklənmir.";
        }

        return $errors;
    }

    /**
     * Get maximum file size for a user role
     */
    public static function getMaxFileSizeForRole($userRole = null): int
    {
        if ($userRole && isset(self::ROLE_FILE_SIZE_LIMITS[$userRole])) {
            return self::ROLE_FILE_SIZE_LIMITS[$userRole];
        }
        
        return self::MAX_FILE_SIZE;
    }

    /**
     * Determine file type from mime type
     */
    public static function getFileTypeFromMime(string $mimeType): string
    {
        switch ($mimeType) {
            case 'application/pdf':
                return 'pdf';
            case 'application/vnd.ms-excel':
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                return 'excel';
            case 'application/msword':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return 'word';
            case 'image/jpeg':
            case 'image/png':
            case 'image/gif':
                return 'image';
            default:
                return 'other';
        }
    }

    /**
     * Apply RegionAdmin document filtering
     */
    private function applyRegionAdminDocumentFiltering($query, User $user, $userRegionId)
    {
        // Get all institutions in the region
        $regionInstitutions = Institution::where(function($q) use ($userRegionId) {
            $q->where('id', $userRegionId) // The region itself
              ->orWhere('parent_id', $userRegionId); // Sectors
        })->pluck('id');

        $schoolInstitutions = Institution::whereIn('parent_id', $regionInstitutions)->pluck('id');
        $allRegionalInstitutions = $regionInstitutions->merge($schoolInstitutions);

        $query->where(function ($q) use ($user, $allRegionalInstitutions) {
            // Documents from regional institutions
            $q->whereIn('institution_id', $allRegionalInstitutions)
              // Or uploaded by user
              ->orWhere('uploaded_by', $user->id)
              // Or public documents
              ->orWhere('is_public', true)
              // Or regional access level documents
              ->orWhere(function($subQ) use ($allRegionalInstitutions) {
                  $subQ->where('access_level', 'regional')
                       ->whereIn('institution_id', $allRegionalInstitutions);
              })
              // Or sectoral documents in their region
              ->orWhere(function($subQ) use ($allRegionalInstitutions) {
                  $subQ->where('access_level', 'sectoral')
                       ->whereIn('institution_id', $allRegionalInstitutions);
              });
        });
    }

    /**
     * Apply SektorAdmin document filtering
     */
    private function applySektorAdminDocumentFiltering($query, User $user, $userSektorId)
    {
        $sektorSchools = Institution::where('parent_id', $userSektorId)->pluck('id');
        $allSektorInstitutions = $sektorSchools->push($userSektorId);

        $query->where(function ($q) use ($user, $allSektorInstitutions) {
            $q->whereIn('institution_id', $allSektorInstitutions)
              ->orWhere('uploaded_by', $user->id)
              ->orWhere('is_public', true)
              ->orWhere(function($subQ) use ($allSektorInstitutions) {
                  $subQ->where('access_level', 'sectoral')
                       ->whereIn('institution_id', $allSektorInstitutions);
              });
        });
    }

    /**
     * Apply School-level document filtering
     */
    private function applySchoolDocumentFiltering($query, User $user, $userInstitutionId)
    {
        $query->where(function ($q) use ($user, $userInstitutionId) {
            $q->where('institution_id', $userInstitutionId)
              ->orWhere('uploaded_by', $user->id)
              ->orWhere('is_public', true)
              ->orWhere(function($subQ) use ($userInstitutionId) {
                  $subQ->where('access_level', 'institution')
                       ->where('institution_id', $userInstitutionId);
              });
        });
    }

    /**
     * Check if user's institution is a parent (ancestor) of document's institution
     * This enables hierarchical access: RegionAdmin can access Sektor/School documents
     *
     * @param Institution $userInstitution
     * @param Institution $documentInstitution
     * @return bool
     */
    private function isUserInstitutionParent($userInstitution, $documentInstitution): bool
    {
        $current = $documentInstitution;

        // Traverse up the hierarchy (max 10 levels to prevent infinite loop)
        for ($i = 0; $i < 10; $i++) {
            if (!$current->parent_id) {
                break;
            }

            // Check if current parent matches user's institution
            if ($current->parent_id === $userInstitution->id) {
                return true;
            }

            // Move up one level
            $current = $current->parent;
            if (!$current) {
                break;
            }
        }

        return false;
    }
}