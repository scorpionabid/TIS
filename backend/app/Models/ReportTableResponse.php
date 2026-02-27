<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportTableResponse extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_table_id',
        'institution_id',
        'respondent_id',
        'rows',
        'status',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'rows'         => 'array',
            'submitted_at' => 'datetime',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function reportTable(): BelongsTo
    {
        return $this->belongsTo(ReportTable::class);
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function respondent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'respondent_id');
    }

    // ─── Status Methods ───────────────────────────────────────────────────────

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isSubmitted(): bool
    {
        return $this->status === 'submitted';
    }

    public function submit(): void
    {
        $this->status       = 'submitted';
        $this->submitted_at = now();
        $this->save();
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeSubmitted($query)
    {
        return $query->where('status', 'submitted');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeByInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    public function scopeByTable($query, int $reportTableId)
    {
        return $query->where('report_table_id', $reportTableId);
    }
}
