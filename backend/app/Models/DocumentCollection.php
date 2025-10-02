<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DocumentCollection extends Model
{
    use HasFactory, SoftDeletes;

    // Scope types
    const SCOPE_PERSONAL = 'personal';
    const SCOPE_REGIONAL = 'regional';
    const SCOPE_SECTORAL = 'sectoral';

    // Predefined regional folder templates
    const REGIONAL_TEMPLATES = [
        'schedules' => 'Cədvəl',
        'action_plans' => 'Fəaliyyət Planı',
        'orders' => 'Əmrlər',
    ];

    protected $fillable = [
        'name',
        'description',
        'created_by',
        'institution_id',
        'collection_type',
        'color',
        'icon',
        'is_public',
        'allowed_roles',
        'sort_order',
        'scope',
        'folder_key',
        'is_system_folder',
        'owner_institution_id',
        'owner_institution_level',
        'allow_school_upload',
        'is_locked',
    ];

    protected $casts = [
        'is_public' => 'boolean',
        'allowed_roles' => 'array',
        'sort_order' => 'integer',
        'is_system_folder' => 'boolean',
        'allow_school_upload' => 'boolean',
        'is_locked' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Collection creator relationship
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Institution relationship
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Collection items relationship
     */
    public function items(): HasMany
    {
        return $this->hasMany(DocumentCollectionItem::class, 'collection_id');
    }

    /**
     * Owner institution relationship
     */
    public function ownerInstitution(): BelongsTo
    {
        return $this->belongsTo(Institution::class, 'owner_institution_id');
    }

    /**
     * Documents relationship through collection items
     */
    public function documents(): BelongsToMany
    {
        return $this->belongsToMany(Document::class, 'document_collection_items', 'collection_id', 'document_id')
                    ->withPivot(['added_by', 'sort_order', 'notes', 'created_at'])
                    ->withTimestamps()
                    ->orderBy('document_collection_items.sort_order');
    }

    /**
     * Audit logs relationship
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(FolderAuditLog::class, 'folder_id');
    }

    /**
     * Target institutions relationship (many-to-many)
     * These are the institutions that can upload documents to this folder
     */
    public function targetInstitutions(): BelongsToMany
    {
        return $this->belongsToMany(Institution::class, 'folder_institutions', 'folder_id', 'institution_id')
                    ->withPivot(['can_upload'])
                    ->withTimestamps();
    }

    /**
     * Scope: Filter by type
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('collection_type', $type);
    }

    /**
     * Scope: Public collections
     */
    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    /**
     * Scope: For institution (checks both institution_id and owner_institution_id)
     */
    public function scopeForInstitution($query, int $institutionId)
    {
        return $query->where(function($q) use ($institutionId) {
            $q->where('institution_id', $institutionId)
              ->orWhere('owner_institution_id', $institutionId);
        });
    }

    /**
     * Scope: Accessible by user role
     */
    public function scopeAccessibleByRole($query, string $role)
    {
        return $query->where(function($q) use ($role) {
            $q->where('is_public', true)
              ->orWhereJsonContains('allowed_roles', $role);
        });
    }

    /**
     * Check if user can access this collection
     */
    public function canBeAccessedBy(User $user): bool
    {
        // Public collections are always accessible
        if ($this->is_public) {
            return true;
        }

        // Creator can always access
        if ($this->created_by === $user->id) {
            return true;
        }

        // Check if user's role is in allowed roles
        $userRole = $user->roles->first();
        if ($userRole && in_array($userRole->name, $this->allowed_roles ?? [])) {
            return true;
        }

        // SuperAdmin can access everything
        return $user->hasRole('superadmin');
    }

    /**
     * Add document to collection
     */
    public function addDocument(Document $document, User $addedBy, array $options = []): bool
    {
        // Check if document is already in collection
        if ($this->documents()->where('document_id', $document->id)->exists()) {
            return false;
        }

        $this->items()->create([
            'document_id' => $document->id,
            'added_by' => $addedBy->id,
            'sort_order' => $options['sort_order'] ?? $this->getNextSortOrder(),
            'notes' => $options['notes'] ?? null,
        ]);

        return true;
    }

    /**
     * Remove document from collection
     */
    public function removeDocument(Document $document): bool
    {
        return $this->items()->where('document_id', $document->id)->delete() > 0;
    }

    /**
     * Get next sort order for new items
     */
    private function getNextSortOrder(): int
    {
        return $this->items()->max('sort_order') + 1;
    }

    /**
     * Get collection statistics
     */
    public function getStatistics(): array
    {
        $totalDocuments = $this->documents()->count();
        $totalSize = $this->documents()->sum('file_size');
        $fileTypes = $this->documents()->groupBy('file_type')->pluck('file_type')->toArray();

        return [
            'total_documents' => $totalDocuments,
            'total_size_bytes' => $totalSize,
            'total_size_mb' => round($totalSize / 1024 / 1024, 2),
            'file_types' => $fileTypes,
            'last_updated' => $this->updated_at,
        ];
    }

    /**
     * Scope: Regional folders
     */
    public function scopeRegional($query)
    {
        return $query->where('scope', self::SCOPE_REGIONAL);
    }

    /**
     * Scope: Sectoral folders
     */
    public function scopeSectoral($query)
    {
        return $query->where('scope', self::SCOPE_SECTORAL);
    }

    /**
     * Scope: System folders
     */
    public function scopeSystemFolders($query)
    {
        return $query->where('is_system_folder', true);
    }
}