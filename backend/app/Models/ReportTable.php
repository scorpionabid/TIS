<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReportTable extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'creator_id',
        'status',
        'columns',
        'max_rows',
        'target_institutions',
        'deadline',
        'published_at',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'columns'             => 'array',
            'target_institutions' => 'array',
            'deadline'            => 'datetime',
            'published_at'        => 'datetime',
            'archived_at'         => 'datetime',
            'deleted_at'          => 'datetime',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(ReportTableResponse::class);
    }

    // ─── Status Methods ───────────────────────────────────────────────────────

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isPublished(): bool
    {
        return $this->status === 'published';
    }

    public function isArchived(): bool
    {
        return $this->status === 'archived';
    }

    public function publish(): void
    {
        $this->status       = 'published';
        $this->published_at = now();
        $this->save();
    }

    public function archive(): void
    {
        $this->status      = 'archived';
        $this->archived_at = now();
        $this->save();
    }

    // ─── Business Logic ───────────────────────────────────────────────────────

    /**
     * Müəssisənin bu cədvəl üçün cavab verə biləcəyini yoxlayır.
     */
    public function canInstitutionRespond(int $institutionId): bool
    {
        if (! $this->isPublished()) {
            return false;
        }

        $targets = $this->target_institutions ?? [];

        return in_array($institutionId, $targets, true);
    }

    /**
     * Sütunların redaktəyə açıq olub-olmadığını yoxlayır.
     * Published cədvəllərdə sütunlar kilidlənir.
     */
    public function canEditColumns(): bool
    {
        return $this->isDraft();
    }

    /**
     * Cədvəlin ümumi redaktəyə açıq olub-olmadığını yoxlayır.
     */
    public function canEdit(): bool
    {
        return $this->isDraft();
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeArchived($query)
    {
        return $query->where('status', 'archived');
    }

    public function scopeForInstitution($query, int $institutionId)
    {
        return $query->whereJsonContains('target_institutions', $institutionId);
    }

    public function scopeCreatedBy($query, int $userId)
    {
        return $query->where('creator_id', $userId);
    }
}
