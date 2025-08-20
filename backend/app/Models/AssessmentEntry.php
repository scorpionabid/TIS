<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AssessmentEntry extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'assessment_type_id',
        'student_id',
        'institution_id',
        'created_by',
        'assessment_date',
        'score',
        'grade_level',
        'subject',
        'notes',
        'status',
        'submitted_at',
        'approved_at',
        'approved_by',
        'approval_notes',
        'metadata',
        'bulk_session_id',
        'excel_import_id',
        'entry_method',
        'requires_review',
        'reviewed_at',
        'reviewed_by',
        'review_notes',
    ];

    protected $casts = [
        'assessment_date' => 'date',
        'score' => 'decimal:2',
        'percentage_score' => 'decimal:2',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'metadata' => 'array',
        'requires_review' => 'boolean',
        'reviewed_at' => 'datetime',
    ];

    /**
     * Boot model events
     */
    protected static function boot()
    {
        parent::boot();

        // Calculate percentage score when creating or updating
        static::saving(function ($assessmentEntry) {
            if ($assessmentEntry->score !== null && $assessmentEntry->assessmentType) {
                $assessmentEntry->percentage_score = $assessmentEntry->calculatePercentageScore();
            }
        });
    }

    protected $appends = [
        'status_label',
        'grade_label',
        'entry_method_label'
    ];

    /**
     * Get the status label attribute
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'draft' => 'Layihə',
            'submitted' => 'Təqdim edilib',
            'approved' => 'Təsdiqlənib',
            'rejected' => 'Rədd edilib',
            default => $this->status
        };
    }

    /**
     * Get the grade label attribute
     */
    public function getGradeLabelAttribute(): string
    {
        if (!$this->percentage_score) return 'N/A';
        
        if ($this->percentage_score >= 90) return 'Əla';
        if ($this->percentage_score >= 80) return 'Yaxşı';
        if ($this->percentage_score >= 70) return 'Orta';
        if ($this->percentage_score >= 60) return 'Kafi';
        
        return 'Qeyri-kafi';
    }

    /**
     * Relationship: Assessment entry belongs to assessment type
     */
    public function assessmentType(): BelongsTo
    {
        return $this->belongsTo(AssessmentType::class);
    }

    /**
     * Relationship: Assessment entry belongs to student
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Relationship: Assessment entry belongs to institution
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Relationship: Assessment entry created by user
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship: Assessment entry approved by user
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Relationship: Assessment entry reviewed by user
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Relationship: Assessment entry belongs to Excel import
     */
    public function excelImport(): BelongsTo
    {
        return $this->belongsTo(AssessmentExcelImport::class, 'excel_import_id');
    }

    /**
     * Relationship: Assessment entry belongs to bulk session
     */
    public function bulkSession(): BelongsTo
    {
        return $this->belongsTo(BulkAssessmentSession::class, 'bulk_session_id', 'session_id');
    }

    /**
     * Scope: Filter by institution
     */
    public function scopeForInstitution($query, $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    /**
     * Scope: Filter by assessment type
     */
    public function scopeByAssessmentType($query, $assessmentTypeId)
    {
        return $query->where('assessment_type_id', $assessmentTypeId);
    }

    /**
     * Scope: Filter by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Filter by date range
     */
    public function scopeByDateRange($query, $startDate, $endDate = null)
    {
        $query->where('assessment_date', '>=', $startDate);
        
        if ($endDate) {
            $query->where('assessment_date', '<=', $endDate);
        }
        
        return $query;
    }

    /**
     * Scope: Filter by grade level
     */
    public function scopeByGradeLevel($query, $gradeLevel)
    {
        return $query->where('grade_level', $gradeLevel);
    }

    /**
     * Scope: Filter by entry method
     */
    public function scopeByEntryMethod($query, $method)
    {
        return $query->where('entry_method', $method);
    }

    /**
     * Scope: Filter entries requiring review
     */
    public function scopeRequiringReview($query)
    {
        return $query->where('requires_review', true)->whereNull('reviewed_at');
    }

    /**
     * Scope: Filter by bulk session
     */
    public function scopeByBulkSession($query, $sessionId)
    {
        return $query->where('bulk_session_id', $sessionId);
    }

    /**
     * Scope: Filter by Excel import
     */
    public function scopeByExcelImport($query, $importId)
    {
        return $query->where('excel_import_id', $importId);
    }

    /**
     * Calculate percentage score
     */
    public function calculatePercentageScore(): float
    {
        if (!$this->assessmentType || !$this->assessmentType->max_score) {
            return 0;
        }
        
        return round(($this->score / $this->assessmentType->max_score) * 100, 2);
    }

    /**
     * Check if entry can be edited by user
     */
    public function canBeEditedBy($user): bool
    {
        // Drafts can be edited by creator
        if ($this->status === 'draft' && $this->created_by === $user->id) {
            return true;
        }
        
        // SuperAdmin can edit all
        if ($user->hasRole('superadmin')) {
            return true;
        }
        
        // RegionAdmin can edit within their region
        if ($user->hasRole('regionadmin')) {
            return $this->institution->region_id === $user->institution?->region_id;
        }
        
        return false;
    }

    /**
     * Submit the assessment entry
     */
    public function submit(): bool
    {
        if ($this->status !== 'draft') {
            return false;
        }
        
        $this->update([
            'status' => 'submitted',
            'submitted_at' => now()
        ]);
        
        return true;
    }

    /**
     * Approve the assessment entry
     */
    public function approve($user, $notes = null): bool
    {
        if ($this->status !== 'submitted') {
            return false;
        }
        
        $this->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by' => $user->id,
            'approval_notes' => $notes
        ]);
        
        return true;
    }

    /**
     * Reject the assessment entry
     */
    public function reject($user, $notes = null): bool
    {
        if ($this->status !== 'submitted') {
            return false;
        }
        
        $this->update([
            'status' => 'rejected',
            'approved_by' => $user->id,
            'approval_notes' => $notes
        ]);
        
        return true;
    }

    /**
     * Mark entry as reviewed
     */
    public function markReviewed($user, $notes = null): bool
    {
        $this->update([
            'requires_review' => false,
            'reviewed_at' => now(),
            'reviewed_by' => $user->id,
            'review_notes' => $notes
        ]);
        
        return true;
    }

    /**
     * Check if entry was created via bulk method
     */
    public function isBulkEntry(): bool
    {
        return $this->entry_method === 'bulk';
    }

    /**
     * Check if entry was imported via Excel
     */
    public function isExcelImport(): bool
    {
        return $this->entry_method === 'excel_import';
    }

    /**
     * Check if entry requires review
     */
    public function needsReview(): bool
    {
        return $this->requires_review && !$this->reviewed_at;
    }

    /**
     * Get entry method label
     */
    public function getEntryMethodLabelAttribute(): string
    {
        return match($this->entry_method) {
            'manual' => 'Manual Daxiletmə',
            'bulk' => 'Kütləvi Daxiletmə',
            'excel_import' => 'Excel İmport',
            default => 'Bilinməyən'
        };
    }
}
