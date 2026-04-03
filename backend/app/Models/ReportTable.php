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
        'notes',
        'creator_id',
        'status',
        'is_template',
        'cloned_from_id',
        'template_category',
        'columns',
        'fixed_rows',
        'max_rows',
        'target_institutions',
        'deadline',
        'published_at',
        'archived_at',
        'allow_additional_rows_after_confirmation',
    ];

    protected function casts(): array
    {
        return [
            'columns' => 'array',
            'fixed_rows' => 'array',
            'target_institutions' => 'array',
            'deadline' => 'datetime',
            'published_at' => 'datetime',
            'archived_at' => 'datetime',
            'deleted_at' => 'datetime',
            'is_template' => 'boolean',
            'allow_additional_rows_after_confirmation' => 'boolean',
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

    public function clonedFrom(): BelongsTo
    {
        return $this->belongsTo(ReportTable::class, 'cloned_from_id');
    }

    public function clones(): HasMany
    {
        return $this->hasMany(ReportTable::class, 'cloned_from_id');
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

    public function isTemplate(): bool
    {
        return $this->is_template;
    }

    public function publish(): void
    {
        $this->status = 'published';
        $this->published_at = now();
        $this->save();
    }

    public function archive(): void
    {
        $this->status = 'archived';
        $this->archived_at = now();
        $this->save();
    }

    public function unarchive(): void
    {
        $this->status = 'published';
        $this->archived_at = null;
        $this->save();
    }

    // ─── Template Methods ───────────────────────────────────────────────────

    /**
     * Create a new table from this template
     */
    public function cloneAsNew(string $newTitle, ?int $creatorId = null): ReportTable
    {
        $clone = new static;
        $clone->title = $newTitle;
        $clone->description = $this->description;
        $clone->creator_id = $creatorId ?? $this->creator_id;
        $clone->status = 'draft';
        $clone->is_template = false;
        $clone->cloned_from_id = $this->id;
        $clone->columns = $this->columns;
        $clone->fixed_rows = $this->fixed_rows; // Stabil cədvəl strukturu kopyalanır
        $clone->max_rows = $this->max_rows;
        $clone->target_institutions = [];
        $clone->deadline = null;
        $clone->save();

        return $clone;
    }

    /**
     * Mark this table as a template
     */
    public function saveAsTemplate(?string $category = null): void
    {
        $this->is_template = true;
        $this->template_category = $category;
        $this->save();
    }

    /**
     * Remove template status from this table
     */
    public function removeTemplateStatus(): void
    {
        $this->is_template = false;
        $this->template_category = null;
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

    /**
     * Təsdiqlənmiş cavablardan sonra əlavə sətir əlavə edilməsinə icazə veriləcəyini yoxlayır.
     */
    public function canAddRowsAfterConfirmation(): bool
    {
        return $this->allow_additional_rows_after_confirmation === true;
    }

    /**
     * Əlavə sətir əlavə etmə parametri yeniləyir (RegionAdmin üçün).
     */
    public function setAllowAdditionalRows(bool $allow): void
    {
        $this->allow_additional_rows_after_confirmation = $allow;
        $this->save();
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

    public function scopeTemplates($query)
    {
        return $query->where('is_template', true);
    }

    public function scopeNotTemplates($query)
    {
        return $query->where('is_template', false);
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('template_category', $category);
    }
}
