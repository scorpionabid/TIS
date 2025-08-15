<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Survey extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'title',
        'description',
        'creator_id',
        'status',
        'survey_type',
        'is_anonymous',
        'allow_multiple_responses',
        'structure',
        'target_institutions',
        'target_departments',
        'start_date',
        'end_date',
        'published_at',
        'archived_at',
        'response_count',
        'completion_threshold',
        'metadata',
        // Enhanced fields from PRD-2
        'frequency',
        'category',
        'max_questions',
        'current_questions_count',
        'is_template',
        'template_id',
        'template_name',
        'auto_archive',
        'archive_reason',
        'approval_status',
        'school_approved_by',
        'school_approved_at',
        'sector_approved_by',
        'sector_approved_at',
        'region_approved_by',
        'region_approved_at',
        'rejection_reason',
        'targeting_summary',
        'estimated_recipients',
        'actual_responses',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_anonymous' => 'boolean',
            'allow_multiple_responses' => 'boolean',
            'structure' => 'array',
            'target_institutions' => 'array',
            'target_departments' => 'array',
            'start_date' => 'datetime',
            'end_date' => 'datetime',
            'published_at' => 'datetime',
            'archived_at' => 'datetime',
            'response_count' => 'integer',
            'completion_threshold' => 'integer',
            'metadata' => 'array',
            // Enhanced casts
            'is_template' => 'boolean',
            'auto_archive' => 'boolean',
            'school_approved_at' => 'datetime',
            'sector_approved_at' => 'datetime',
            'region_approved_at' => 'datetime',
            'targeting_summary' => 'array',
        ];
    }

    /**
     * Get the user who created this survey.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    /**
     * Get the survey questions.
     */
    public function questions(): HasMany
    {
        return $this->hasMany(SurveyQuestion::class)->ordered();
    }

    /**
     * Get the responses for this survey.
     */
    public function responses(): HasMany
    {
        return $this->hasMany(SurveyResponse::class);
    }

    /**
     * Get the versions for this survey.
     */
    public function versions(): HasMany
    {
        return $this->hasMany(SurveyVersion::class);
    }

    /**
     * Get the audit logs for this survey.
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(SurveyAuditLog::class);
    }

    /**
     * Template relationship (if created from template)
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(Survey::class, 'template_id');
    }

    /**
     * Surveys created from this template
     */
    public function templatedSurveys(): HasMany
    {
        return $this->hasMany(Survey::class, 'template_id');
    }

    /**
     * Approval relationships
     */
    public function schoolApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'school_approved_by');
    }

    public function sectorApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sector_approved_by');
    }

    public function regionApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'region_approved_by');
    }

    // Constants for enhanced fields
    const FREQUENCIES = [
        'monthly' => 'Aylıq Statistik Sorğular',
        'quarterly' => 'Rüblük Maliyyə Hesabatları',
        'yearly' => 'İllik Strategik Planlar',
        'daily' => 'Gündəlik Təcili Məlumatlar',
        'once' => 'Təkbərlik sorğu',
    ];

    const CATEGORIES = [
        'statistics' => 'Şagird sayı, dərs saatları, müəllim statistikası',
        'finance' => 'Büdcə icra, xərclər, investisiyalar',
        'strategic' => 'Məqsədlər, KPI-lər, inkişaf planları',
        'urgent' => 'Xəbərdarlıq, təcili bildirişlər',
        'general' => 'Ümumi sorğular',
    ];

    const APPROVAL_STATUSES = [
        'pending' => 'Gözləyir',
        'school_approved' => 'SchoolAdmin təsdiqi',
        'sector_approved' => 'SektorAdmin təsdiqi',
        'region_approved' => 'RegionAdmin təsdiqi (final)',
        'rejected' => 'Rədd edilib',
    ];

    /**
     * Check if survey can have more questions (PRD-2: max 2-3 questions)
     */
    public function canAddQuestion(): bool
    {
        return $this->current_questions_count < $this->max_questions;
    }

    /**
     * Get remaining question slots
     */
    public function getRemainingQuestionSlots(): int
    {
        return max(0, $this->max_questions - $this->current_questions_count);
    }

    /**
     * Update questions count
     */
    public function updateQuestionsCount(): void
    {
        $this->current_questions_count = $this->questions()->active()->count();
        $this->save();
    }

    /**
     * Check if survey is in approval workflow
     */
    public function isInApprovalWorkflow(): bool
    {
        return in_array($this->approval_status, ['pending', 'school_approved', 'sector_approved']);
    }

    /**
     * Check if survey is fully approved
     */
    public function isApproved(): bool
    {
        return $this->approval_status === 'region_approved';
    }

    /**
     * Check if survey is rejected
     */
    public function isRejected(): bool
    {
        return $this->approval_status === 'rejected';
    }

    /**
     * Get next approval level
     */
    public function getNextApprovalLevel(): ?string
    {
        switch ($this->approval_status) {
            case 'pending':
                return 'school_approved';
            case 'school_approved':
                return 'sector_approved';
            case 'sector_approved':
                return 'region_approved';
            default:
                return null;
        }
    }

    /**
     * Approve survey at current level
     */
    public function approve(User $approver): bool
    {
        $nextLevel = $this->getNextApprovalLevel();
        
        if (!$nextLevel) {
            return false;
        }

        switch ($nextLevel) {
            case 'school_approved':
                $this->approval_status = 'school_approved';
                $this->school_approved_by = $approver->id;
                $this->school_approved_at = now();
                break;
            case 'sector_approved':
                $this->approval_status = 'sector_approved';
                $this->sector_approved_by = $approver->id;
                $this->sector_approved_at = now();
                break;
            case 'region_approved':
                $this->approval_status = 'region_approved';
                $this->region_approved_by = $approver->id;
                $this->region_approved_at = now();
                // Auto-publish when fully approved
                if (!$this->is_published) {
                    $this->status = 'published';
                    $this->is_published = true;
                    $this->published_at = now();
                }
                break;
        }

        return $this->save();
    }

    /**
     * Reject survey
     */
    public function reject(User $rejector, string $reason): bool
    {
        $this->approval_status = 'rejected';
        $this->rejection_reason = $reason;
        
        return $this->save();
    }

    /**
     * Check if survey should be auto-archived
     */
    public function shouldAutoArchive(): bool
    {
        if (!$this->auto_archive || $this->archived_at) {
            return false;
        }

        // Auto-archive if past deadline and has responses
        return $this->end_date && 
               $this->end_date->isPast() && 
               $this->actual_responses > 0;
    }

    /**
     * Auto-archive survey
     */
    public function autoArchive(): bool
    {
        if (!$this->shouldAutoArchive()) {
            return false;
        }

        $this->status = 'archived';
        $this->archived_at = now();
        $this->archive_reason = 'Müddət bitib və cavablar toplandı (avtomatik arxivləşdirmə)';
        
        return $this->save();
    }

    /**
     * Create survey from template
     */
    public static function createFromTemplate(Survey $template, array $overrides = []): Survey
    {
        $surveyData = $template->only([
            'title', 'description', 'frequency', 'category', 'max_questions',
            'is_anonymous', 'allow_multiple_responses', 'structure',
            'target_institutions', 'target_departments', 'completion_threshold',
            'auto_archive'
        ]);

        $surveyData = array_merge($surveyData, $overrides, [
            'template_id' => $template->id,
            'template_name' => $template->template_name ?? $template->title,
            'status' => 'draft',
            'approval_status' => 'pending',
            'is_published' => false,
            'current_questions_count' => 0,
        ]);

        $survey = self::create($surveyData);

        // Copy questions from template
        foreach ($template->questions as $templateQuestion) {
            $questionData = $templateQuestion->only([
                'title', 'description', 'type', 'order_index', 'is_required',
                'options', 'validation_rules', 'metadata', 'min_value', 'max_value',
                'min_length', 'max_length', 'allowed_file_types', 'max_file_size',
                'rating_min', 'rating_max', 'rating_min_label', 'rating_max_label',
                'table_headers', 'table_rows', 'translations'
            ]);
            
            $questionData['survey_id'] = $survey->id;
            SurveyQuestion::create($questionData);
        }

        $survey->updateQuestionsCount();
        
        return $survey;
    }

    /**
     * Get response completion rate
     */
    public function getCompletionRate(): float
    {
        if ($this->estimated_recipients <= 0) {
            return 0;
        }

        return round(($this->actual_responses / $this->estimated_recipients) * 100, 2);
    }

    /**
     * Get survey analytics
     */
    public function getAnalytics(): array
    {
        return [
            'total_responses' => $this->actual_responses,
            'completion_rate' => $this->getCompletionRate(),
            'estimated_recipients' => $this->estimated_recipients,
            'questions_count' => $this->current_questions_count,
            'is_approved' => $this->isApproved(),
            'approval_level' => $this->approval_status,
            'days_active' => $this->published_at ? $this->published_at->diffInDays(now()) : 0,
            'questions_analytics' => $this->questions->map(function ($question) {
                return [
                    'id' => $question->id,
                    'title' => $question->title,
                    'type' => $question->type,
                    'response_summary' => $question->getResponseSummary(),
                ];
            }),
        ];
    }

    /**
     * Check if survey is active (published and within date range).
     */
    public function isActive(): bool
    {
        if ($this->status !== 'published') {
            return false;
        }

        $now = now();
        
        if ($this->start_date && $now->lt($this->start_date)) {
            return false;
        }

        if ($this->end_date && $now->gt($this->end_date)) {
            return false;
        }

        return true;
    }

    /**
     * Check if survey has expired.
     */
    public function hasExpired(): bool
    {
        return $this->end_date && now()->gt($this->end_date);
    }

    /**
     * Check if survey is open for responses.
     */
    public function isOpenForResponses(): bool
    {
        return $this->isActive() && !$this->hasExpired();
    }

    /**
     * Get completion percentage based on target institutions.
     */
    public function getCompletionPercentageAttribute(): float
    {
        $targetCount = count($this->target_institutions ?? []);
        if ($targetCount === 0) {
            return 0;
        }

        $completedCount = $this->responses()->where('is_complete', true)->count();
        return round(($completedCount / $targetCount) * 100, 2);
    }

    /**
     * Check if an institution can respond to this survey.
     */
    public function canInstitutionRespond(int $institutionId): bool
    {
        if (!$this->isOpenForResponses()) {
            return false;
        }

        if (!in_array($institutionId, $this->target_institutions ?? [])) {
            return false;
        }

        if (!$this->allow_multiple_responses) {
            $existingResponse = $this->responses()
                ->where('institution_id', $institutionId)
                ->where('is_complete', true)
                ->exists();
            
            if ($existingResponse) {
                return false;
            }
        }

        return true;
    }

    /**
     * Scope to get surveys by status.
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get published surveys.
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    /**
     * Scope to get active surveys.
     */
    public function scopeActive($query)
    {
        $now = now();
        return $query->where('status', 'published')
                    ->where(function ($q) use ($now) {
                        $q->whereNull('start_date')->orWhere('start_date', '<=', $now);
                    })
                    ->where(function ($q) use ($now) {
                        $q->whereNull('end_date')->orWhere('end_date', '>=', $now);
                    });
    }

    /**
     * Scope to get surveys by type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('survey_type', $type);
    }

    /**
     * Scope to get surveys for a specific institution.
     */
    public function scopeForInstitution($query, int $institutionId)
    {
        return $query->whereJsonContains('target_institutions', $institutionId);
    }

    /**
     * Scope to get surveys created by a user.
     */
    public function scopeCreatedBy($query, int $userId)
    {
        return $query->where('creator_id', $userId);
    }

    /**
     * Scope to search by title.
     */
    public function scopeSearchByTitle($query, string $search)
    {
        return $query->where('title', 'ILIKE', "%{$search}%");
    }
}