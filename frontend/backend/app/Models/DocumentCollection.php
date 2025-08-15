<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class DocumentCollection extends Model
{
    use HasFactory;

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
    ];

    protected $casts = [
        'is_public' => 'boolean',
        'allowed_roles' => 'array',
        'sort_order' => 'integer',
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
     * Scope: For institution
     */
    public function scopeForInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
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
}