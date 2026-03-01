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
        'row_statuses',
    ];

    protected function casts(): array
    {
        return [
            'rows'         => 'array',
            'submitted_at' => 'datetime',
            'row_statuses' => 'array',
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

    // ─── Row Status Methods ───────────────────────────────────────────────────

    public function getRowStatus(int $rowIndex): ?array
    {
        return $this->row_statuses[$rowIndex] ?? null;
    }

    public function isRowEditable(int $rowIndex): bool
    {
        $status = $this->getRowStatus($rowIndex)['status'] ?? null;
        return $status === null || $status === 'rejected' || $status === 'draft';
    }

    public function submitRow(int $rowIndex, int $userId): void
    {
        $statuses              = $this->row_statuses ?? [];
        $statuses[$rowIndex]   = [
            'status'       => 'submitted',
            'submitted_by' => $userId,
            'submitted_at' => now()->toISOString(),
        ];
        $this->update(['row_statuses' => $statuses]);
    }

    public function approveRow(int $rowIndex, int $userId): void
    {
        $statuses            = $this->row_statuses ?? [];
        $statuses[$rowIndex] = array_merge($statuses[$rowIndex] ?? [], [
            'status'      => 'approved',
            'approved_by' => $userId,
            'approved_at' => now()->toISOString(),
        ]);
        $this->update(['row_statuses' => $statuses]);
    }

    public function rejectRow(int $rowIndex, int $userId, string $reason): void
    {
        $statuses            = $this->row_statuses ?? [];
        $statuses[$rowIndex] = array_merge($statuses[$rowIndex] ?? [], [
            'status'           => 'rejected',
            'rejected_by'      => $userId,
            'rejected_at'      => now()->toISOString(),
            'rejection_reason' => $reason,
        ]);
        $this->update(['row_statuses' => $statuses]);
    }

    public function returnRowToDraft(int $rowIndex): void
    {
        $statuses            = $this->row_statuses ?? [];
        $statuses[$rowIndex] = ['status' => 'draft'];
        $this->update(['row_statuses' => $statuses]);
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
