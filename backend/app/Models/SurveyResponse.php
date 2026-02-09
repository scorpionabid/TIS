<?php

namespace App\Models;

use App\Models\Traits\HasApprover;
use App\Models\Traits\HasInstitution;
use App\Models\Traits\HasUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;

class SurveyResponse extends Model
{
    use HasFactory, HasUser, HasInstitution, HasApprover;

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
     * Get the approval request for this survey response.
     */
    public function approvalRequest()
    {
        return $this->morphOne(\App\Models\DataApprovalRequest::class, 'approvalable');
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
     * Attachments uploaded for this response.
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(SurveyResponseDocument::class)->with(['document', 'question']);
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
        // Load survey questions if not already loaded
        $questions = $this->survey->questions ?? $this->survey->load('questions')->questions;
        $totalQuestions = $questions->count();
        $answeredQuestions = 0;
        $unansweredRequired = 0;

        foreach ($questions as $question) {
            $questionId = (string) $question->id;
            $response = $this->responses[$questionId] ?? null;

            // Check if question has a meaningful answer
            $hasAnswer = false;

            if ($response !== null && $response !== '') {
                // For multiple choice, check if array has items
                if ($question->type === 'multiple_choice' && is_array($response)) {
                    $hasAnswer = count($response) > 0;
                }
                // For other types, check if value exists and is not empty
                elseif (is_string($response)) {
                    $hasAnswer = trim($response) !== '';
                } else {
                    $hasAnswer = true;
                }
            }

            if ($hasAnswer) {
                $answeredQuestions++;
            }

            // Check if this is a required question that's unanswered
            if (($question->required || $question->is_required) && ! $hasAnswer) {
                $unansweredRequired++;
            }
        }

        $this->progress_percentage = $totalQuestions > 0
            ? round(($answeredQuestions / $totalQuestions) * 100)
            : 0;

        // Survey is complete when all required questions are answered (optional questions don't block submission)
        $this->is_complete = $unansweredRequired === 0;
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

        // Auto-create approval request for submitted responses
        $this->ensureApprovalRequestExists();
    }

    /**
     * Ensure approval request exists for this survey response
     */
    public function ensureApprovalRequestExists(): void
    {
        // Check if approval request already exists
        $approvalRequest = $this->approvalRequest;

        if ($approvalRequest) {
            if (
                in_array($this->status, ['submitted', 'pending_approval']) &&
                in_array($approvalRequest->current_status, ['rejected', 'returned', 'cancelled'])
            ) {
                $resubmittedAt = now();
                $metadata = $approvalRequest->request_metadata ?? [];
                $metadata['resubmission_count'] = ($metadata['resubmission_count'] ?? 0) + 1;
                $metadata['last_resubmitted_at'] = $resubmittedAt->toISOString();

                $deadline = $approvalRequest->deadline;
                if (! $deadline || $deadline->isPast()) {
                    $deadline = $resubmittedAt->copy()->addDays(7);
                }

                $approvalRequest->update([
                    'current_status' => 'pending',
                    'current_approval_level' => 1,
                    'completed_at' => null,
                    'submitted_at' => $resubmittedAt,
                    'submitted_by' => Auth::id(),
                    'request_metadata' => $metadata,
                    'deadline' => $deadline,
                ]);
            }

            return;
        }

        // Only create approval request for submitted responses that need approval
        if (! in_array($this->status, ['submitted', 'pending_approval'])) {
            return;
        }

        try {
            // Use the SurveyApprovalBridge to create approval request
            $approvalBridge = app(\App\Services\SurveyApprovalBridge::class);
            $approvalBridge->initiateSurveyResponseApproval($this, [
                'description' => "Avtomatik yaradılmış təsdiq tələbi - {$this->survey->title}",
                'priority' => 'normal',
                'metadata' => [
                    'auto_created' => true,
                    'created_reason' => 'missing_approval_request_fix',
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to create approval request for survey response', [
                'survey_response_id' => $this->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Approve the response.
     */
    public function approve(User $approver): void
    {
        $this->status = 'approved';
        $this->approved_by = $approver->id;
        $this->approved_at = now();

        // Update associated approval request if exists
        if ($this->approvalRequest) {
            $this->approvalRequest->update([
                'status' => 'approved',
                'approved_at' => now(),
                'approver_id' => $approver->id,
            ]);
        }

        $this->save();

        // Mark related survey assignment notification as completed
        $surveyResponseService = app(\App\Services\SurveyResponseService::class);
        $surveyResponseService->markSurveyNotificationCompleted($this->survey_id, $this->respondent_id, 'approved');
    }

    /**
     * Reject the response.
     */
    public function reject(string $reason, ?User $rejector = null): void
    {
        $this->status = 'rejected';
        $this->rejection_reason = $reason;

        // Update associated approval request if exists
        if ($this->approvalRequest) {
            $this->approvalRequest->update([
                'status' => 'rejected',
                'rejected_at' => now(),
                'rejection_reason' => $reason,
                'approver_id' => $rejector ? $rejector->id : null,
            ]);
        }

        $this->save();

        // Mark related survey assignment notification as completed
        $surveyResponseService = app(\App\Services\SurveyResponseService::class);
        $surveyResponseService->markSurveyNotificationCompleted($this->survey_id, $this->respondent_id, 'rejected');
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

    /**
     * Scope to get returned responses.
     */
    public function scopeReturned($query)
    {
        return $query->where('status', 'returned');
    }

    /**
     * Check if response is returned.
     */
    public function isReturned(): bool
    {
        return $this->status === 'returned';
    }

    /**
     * Return the response for revision.
     */
    public function returnForRevision(string $reason, ?User $rejector = null): void
    {
        $this->status = 'returned';
        $this->rejection_reason = $reason;

        // Update associated approval request if exists
        if ($this->approvalRequest) {
            $this->approvalRequest->update([
                'current_status' => 'returned',
                'rejection_reason' => $reason,
                'approver_id' => $rejector ? $rejector->id : null,
            ]);
        }

        $this->save();

        // Mark related survey assignment notification as completed
        $surveyResponseService = app(\App\Services\SurveyResponseService::class);
        $surveyResponseService->markSurveyNotificationCompleted($this->survey_id, $this->respondent_id, 'returned');
    }
}
