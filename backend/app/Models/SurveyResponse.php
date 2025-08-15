<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SurveyResponse extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'survey_id',
        'institution_id',
        'department_id',
        'respondent_id',
        'respondent_role',
        'responses',
        'progress_percentage',
        'is_complete',
        'ip_address',
        'user_agent',
        'started_at',
        'submitted_at',
        'approved_by',
        'approved_at',
        'status',
        'rejection_reason',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'responses' => 'array',
            'progress_percentage' => 'integer',
            'is_complete' => 'boolean',
            'started_at' => 'datetime',
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    /**
     * Get the survey that this response belongs to.
     */
    public function survey(): BelongsTo
    {
        return $this->belongsTo(Survey::class);
    }

    /**
     * Get the institution that submitted this response.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the department that submitted this response.
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get the user who submitted this response.
     */
    public function respondent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'respondent_id');
    }

    /**
     * Get the user who approved this response.
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Check if response is submitted.
     */
    public function isSubmitted(): bool
    {
        return $this->status === 'submitted' || $this->status === 'approved';
    }

    /**
     * Check if response is approved.
     */
    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /**
     * Check if response is rejected.
     */
    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    /**
     * Check if response is draft.
     */
    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    /**
     * Get response to a specific question.
     */
    public function getResponseTo(string $questionId)
    {
        return $this->responses[$questionId] ?? null;
    }

    /**
     * Set response to a specific question.
     */
    public function setResponseTo(string $questionId, $value): void
    {
        $responses = $this->responses ?? [];
        $responses[$questionId] = $value;
        $this->responses = $responses;
    }

    /**
     * Calculate and update progress percentage.
     */
    public function updateProgress(): void
    {
        $structure = $this->survey->structure ?? [];
        $totalQuestions = 0;
        $answeredQuestions = 0;

        foreach ($structure['sections'] ?? [] as $section) {
            foreach ($section['questions'] ?? [] as $question) {
                $totalQuestions++;
                
                if (isset($this->responses[$question['id']]) && 
                    $this->responses[$question['id']] !== null && 
                    $this->responses[$question['id']] !== '') {
                    $answeredQuestions++;
                }
            }
        }

        $this->progress_percentage = $totalQuestions > 0 
            ? round(($answeredQuestions / $totalQuestions) * 100) 
            : 0;

        $this->is_complete = $this->progress_percentage >= 100;
    }

    /**
     * Mark as submitted.
     */
    public function submit(): void
    {
        $this->updateProgress();
        $this->status = 'submitted';
        $this->submitted_at = now();
        $this->save();
    }

    /**
     * Approve the response.
     */
    public function approve(User $approver): void
    {
        $this->status = 'approved';
        $this->approved_by = $approver->id;
        $this->approved_at = now();
        $this->save();
    }

    /**
     * Reject the response.
     */
    public function reject(string $reason): void
    {
        $this->status = 'rejected';
        $this->rejection_reason = $reason;
        $this->save();
    }

    /**
     * Scope to get responses by status.
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get completed responses.
     */
    public function scopeCompleted($query)
    {
        return $query->where('is_complete', true);
    }

    /**
     * Scope to get responses by institution.
     */
    public function scopeByInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    /**
     * Scope to get responses by survey.
     */
    public function scopeBySurvey($query, int $surveyId)
    {
        return $query->where('survey_id', $surveyId);
    }

    /**
     * Scope to get responses by respondent.
     */
    public function scopeByRespondent($query, int $respondentId)
    {
        return $query->where('respondent_id', $respondentId);
    }

    /**
     * Scope to get submitted responses.
     */
    public function scopeSubmitted($query)
    {
        return $query->whereIn('status', ['submitted', 'approved']);
    }

    /**
     * Scope to get approved responses.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope to get draft responses.
     */
    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }
}