<?php

namespace App\Services;

use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\SurveyAuditLog;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SurveyResponseService extends BaseService
{
    public function getResponses(array $filters, int $perPage = 15): array
    {
        $query = SurveyResponse::with(['survey', 'institution', 'respondent.profile', 'approvedBy']);

        $this->applyFilters($query, $filters);
        $this->applySorting($query, $filters);
        
        $responses = $query->paginate($perPage);

        $this->logActivity('survey_responses_list', [
            'filters' => $filters,
            'pagination' => ['per_page' => $perPage, 'page' => $responses->currentPage()]
        ]);

        return [
            'responses' => $responses->through(function ($response) {
                return $this->formatResponse($response);
            }),
            'meta' => [
                'current_page' => $responses->currentPage(),
                'last_page' => $responses->lastPage(),
                'per_page' => $responses->perPage(),
                'total' => $responses->total(),
                'from' => $responses->firstItem(),
                'to' => $responses->lastItem()
            ]
        ];
    }

    public function getResponseDetails(int $responseId): array
    {
        $response = SurveyResponse::with([
            'survey', 'institution', 'department', 'respondent.profile', 'approvedBy'
        ])->findOrFail($responseId);

        $this->logActivity('survey_response_view', [
            'entity_type' => 'SurveyResponse',
            'entity_id' => $responseId,
            'description' => "Viewed survey response for: {$response->survey->title}"
        ]);

        return [
            'id' => $response->id,
            'survey' => [
                'id' => $response->survey->id,
                'title' => $response->survey->title,
                'survey_type' => $response->survey->survey_type,
                'is_anonymous' => $response->survey->is_anonymous
            ],
            'institution' => [
                'id' => $response->institution->id,
                'name' => $response->institution->name,
                'type' => $response->institution->type
            ],
            'department' => $response->department ? [
                'id' => $response->department->id,
                'name' => $response->department->name
            ] : null,
            'respondent' => $response->survey->is_anonymous ? null : [
                'id' => $response->respondent->id,
                'username' => $response->respondent->username,
                'name' => $response->respondent->profile?->full_name ?? $response->respondent->username
            ],
            'respondent_role' => $response->respondent_role,
            'responses' => $response->responses,
            'progress_percentage' => $response->progress_percentage,
            'is_complete' => $response->is_complete,
            'status' => $response->status,
            'started_at' => $response->started_at,
            'submitted_at' => $response->submitted_at,
            'approved_at' => $response->approved_at,
            'approved_by' => $response->approvedBy ? [
                'id' => $response->approvedBy->id,
                'username' => $response->approvedBy->username,
                'name' => $response->approvedBy->profile?->full_name ?? $response->approvedBy->username
            ] : null,
            'rejection_reason' => $response->rejection_reason,
            'metadata' => $response->metadata,
            'created_at' => $response->created_at,
            'updated_at' => $response->updated_at
        ];
    }

    public function startSurvey(int $surveyId, array $data): SurveyResponse
    {
        $survey = Survey::findOrFail($surveyId);
        $user = Auth::user();
        $userInstitutionId = $user->institution_id;

        // SuperAdmin və survey creator-ları üçün institution_id tələbi yoxdur
        if (!$userInstitutionId && !$user->hasRole(['superadmin']) && $survey->creator_id !== $user->id) {
            throw new \InvalidArgumentException('You must belong to an institution to respond to surveys');
        }

        // Default institution_id for SuperAdmin or survey creator
        $institutionId = $userInstitutionId ?: 1; // Default to ministry for superadmin
        
        // First check for existing user response before targeting restrictions
        $existingResponse = SurveyResponse::where('survey_id', $surveyId)
            ->where('institution_id', $institutionId)
            ->where('respondent_id', $user->id)
            ->first();

        if ($existingResponse) {
            // Always return existing response, regardless of completion status
            // Frontend will handle showing appropriate UI (edit vs view mode)
            return $existingResponse;
        }
        
        // Only check targeting restrictions if no existing response
        // SuperAdmin və survey creator-ları targeting yoxlanışından keçməz
        if (!$user->hasRole(['superadmin']) && $survey->creator_id !== $user->id) {
            // Use a modified targeting check that only looks at basic availability, not existing responses
            if (!$this->canUserStartSurvey($survey, $institutionId)) {
                throw new \InvalidArgumentException('This survey is not available for your institution or has expired');
            }
        }

        return DB::transaction(function () use ($survey, $user, $institutionId, $data) {
            $response = SurveyResponse::create([
                'survey_id' => $survey->id,
                'institution_id' => $institutionId,
                'department_id' => $data['department_id'] ?? null,
                'respondent_id' => $user->id,
                'respondent_role' => $user->role?->name,
                'responses' => [],
                'progress_percentage' => 0,
                'is_complete' => false,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'started_at' => now(),
                'status' => 'draft',
                'metadata' => []
            ]);

            $this->logActivity('survey_response_start', [
                'entity_type' => 'SurveyResponse',
                'entity_id' => $response->id,
                'description' => "Started survey response for: {$survey->title}"
            ]);

            $this->logAudit($survey->id, $response->id, 'started', [
                'institution_id' => $institutionId,
                'department_id' => $data['department_id'] ?? null
            ]);

            return $response->load(['survey', 'institution', 'respondent.profile']);
        });
    }

    public function saveResponse(int $responseId, array $data): SurveyResponse
    {
        $response = SurveyResponse::findOrFail($responseId);
        $user = Auth::user();

        if ($response->respondent_id !== $user->id) {
            throw new \InvalidArgumentException('You can only update your own responses');
        }

        if ($response->status !== 'draft') {
            throw new \InvalidArgumentException('Cannot modify submitted responses');
        }

        return DB::transaction(function () use ($response, $data, $user) {
            $oldData = $response->toArray();

            $response->responses = $data['responses'];
            $response->updateProgress();
            $response->save();

            if (isset($data['auto_submit']) && $data['auto_submit'] && $response->is_complete) {
                $response->submit();
            }

            $this->logActivity('survey_response_save', [
                'entity_type' => 'SurveyResponse',
                'entity_id' => $response->id,
                'description' => "Saved survey response for: {$response->survey->title}",
                'before_state' => $oldData,
                'after_state' => $response->toArray()
            ]);

            $this->logAudit($response->survey_id, $response->id, 
                $response->status === 'submitted' ? 'submitted' : 'saved', [
                'progress_percentage' => $response->progress_percentage,
                'is_complete' => $response->is_complete,
                'auto_submitted' => isset($data['auto_submit']) && $data['auto_submit'] && $response->is_complete
            ]);

            return $response;
        });
    }

    public function submitResponse(int $responseId): SurveyResponse
    {
        $response = SurveyResponse::findOrFail($responseId);
        $user = Auth::user();

        if ($response->respondent_id !== $user->id) {
            throw new \InvalidArgumentException('You can only submit your own responses');
        }

        if ($response->status !== 'draft') {
            throw new \InvalidArgumentException('Response has already been submitted');
        }

        if (!$response->is_complete) {
            throw new \InvalidArgumentException('Response must be complete before submission');
        }

        return DB::transaction(function () use ($response) {
            $response->submit();
            $response->survey->increment('response_count');

            $this->logActivity('survey_response_submit', [
                'entity_type' => 'SurveyResponse',
                'entity_id' => $response->id,
                'description' => "Submitted survey response for: {$response->survey->title}"
            ]);

            $this->logAudit($response->survey_id, $response->id, 'submitted', [
                'submitted_at' => $response->submitted_at,
                'progress_percentage' => $response->progress_percentage
            ]);

            // Mark related survey assignment notification as completed
            $this->markSurveyNotificationCompleted($response->survey_id, $response->respondent_id);

            return $response;
        });
    }

    /**
     * Mark survey assignment notification as completed when response is submitted
     */
    protected function markSurveyNotificationCompleted(int $surveyId, int $userId): void
    {
        try {
            // Find the survey assignment notification for this user and survey
            $notification = Notification::where('type', 'survey_assigned')
                ->where('user_id', $userId)
                ->where('related_id', $surveyId)
                ->where(function ($query) {
                    $query->where('related_type', 'App\Models\Survey')
                          ->orWhere('related_type', 'Survey');
                })
                ->first();

            if ($notification) {
                // Update notification to indicate survey is completed
                $notification->update([
                    'is_read' => true,
                    'read_at' => now(),
                    'metadata' => array_merge($notification->metadata ?? [], [
                        'status' => 'completed',
                        'completed_at' => now()->toISOString(),
                        'action_type' => 'survey_completed'
                    ])
                ]);

                \Log::info("Survey notification marked as completed", [
                    'notification_id' => $notification->id,
                    'survey_id' => $surveyId,
                    'user_id' => $userId
                ]);
            } else {
                \Log::warning("No survey assignment notification found to mark as completed", [
                    'survey_id' => $surveyId,
                    'user_id' => $userId
                ]);
            }
        } catch (\Exception $e) {
            \Log::error("Failed to mark survey notification as completed", [
                'survey_id' => $surveyId,
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            // Don't throw exception as this is not critical for response submission
        }
    }

    public function approveResponse(int $responseId): SurveyResponse
    {
        $response = SurveyResponse::findOrFail($responseId);

        if ($response->status !== 'submitted') {
            throw new \InvalidArgumentException('Only submitted responses can be approved');
        }

        return DB::transaction(function () use ($response) {
            $user = Auth::user();
            $response->approve($user);

            $this->logActivity('survey_response_approve', [
                'entity_type' => 'SurveyResponse',
                'entity_id' => $response->id,
                'description' => "Approved survey response for: {$response->survey->title}"
            ]);

            $this->logAudit($response->survey_id, $response->id, 'approved', [
                'approved_at' => $response->approved_at,
                'approved_by' => $user->id
            ]);

            return $response;
        });
    }

    public function rejectResponse(int $responseId, string $reason): SurveyResponse
    {
        $response = SurveyResponse::findOrFail($responseId);

        if ($response->status !== 'submitted') {
            throw new \InvalidArgumentException('Only submitted responses can be rejected');
        }

        return DB::transaction(function () use ($response, $reason) {
            $response->reject($reason);

            $this->logActivity('survey_response_reject', [
                'entity_type' => 'SurveyResponse',
                'entity_id' => $response->id,
                'description' => "Rejected survey response for: {$response->survey->title}"
            ]);

            $this->logAudit($response->survey_id, $response->id, 'rejected', [
                'rejection_reason' => $reason
            ]);

            return $response;
        });
    }

    public function deleteResponse(int $responseId): void
    {
        $response = SurveyResponse::findOrFail($responseId);
        $user = Auth::user();

        if ($response->respondent_id !== $user->id && $response->survey->creator_id !== $user->id) {
            throw new \InvalidArgumentException('You can only delete your own responses or responses to your surveys');
        }

        if ($response->status === 'approved') {
            throw new \InvalidArgumentException('Cannot delete approved responses');
        }

        $oldData = $response->toArray();
        $response->delete();

        if ($response->status === 'submitted') {
            $response->survey->decrement('response_count');
        }

        $this->logActivity('survey_response_delete', [
            'entity_type' => 'SurveyResponse',
            'entity_id' => $response->id,
            'description' => "Deleted survey response for: {$response->survey->title}",
            'before_state' => $oldData
        ]);
    }

    public function getResponseStatistics(int $responseId): array
    {
        $response = SurveyResponse::with('survey')->findOrFail($responseId);

        $stats = [
            'progress' => [
                'percentage' => $response->progress_percentage,
                'is_complete' => $response->is_complete
            ],
            'timing' => [
                'started_at' => $response->started_at,
                'submitted_at' => $response->submitted_at,
                'time_spent' => $response->submitted_at ? 
                    $response->started_at->diffInMinutes($response->submitted_at) : null
            ],
            'status' => [
                'current' => $response->status,
                'is_draft' => $response->isDraft(),
                'is_submitted' => $response->isSubmitted(),
                'is_approved' => $response->isApproved(),
                'is_rejected' => $response->isRejected()
            ]
        ];

        if ($response->is_complete && $response->survey->structure) {
            $questionStats = [];
            foreach ($response->survey->structure['sections'] ?? [] as $section) {
                foreach ($section['questions'] ?? [] as $question) {
                    $questionId = $question['id'];
                    $hasResponse = isset($response->responses[$questionId]) && 
                                   $response->responses[$questionId] !== null && 
                                   $response->responses[$questionId] !== '';
                    
                    $questionStats[$questionId] = [
                        'question' => $question['question'],
                        'type' => $question['type'],
                        'has_response' => $hasResponse,
                        'response_length' => $hasResponse ? 
                            (is_string($response->responses[$questionId]) ? 
                                strlen($response->responses[$questionId]) : null) : null
                    ];
                }
            }
            $stats['questions'] = $questionStats;
        }

        return $stats;
    }

    protected function applyFilters($query, array $filters): void
    {
        if (!empty($filters['survey_id'])) {
            $query->bySurvey($filters['survey_id']);
        }

        if (!empty($filters['institution_id'])) {
            $query->byInstitution($filters['institution_id']);
        }

        if (!empty($filters['respondent_id'])) {
            $query->byRespondent($filters['respondent_id']);
        }

        if (!empty($filters['status'])) {
            $query->byStatus($filters['status']);
        }

        if (isset($filters['is_complete'])) {
            if ($filters['is_complete']) {
                $query->completed();
            } else {
                $query->where('is_complete', false);
            }
        }

        if (!empty($filters['my_responses'])) {
            $query->byRespondent(Auth::id());
        }

        if (!empty($filters['institution_responses'])) {
            $userInstitutionId = Auth::user()->institution_id;
            if ($userInstitutionId) {
                $query->byInstitution($userInstitutionId);
            }
        }
    }

    private function applySorting($query, array $filters): void
    {
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDirection = $filters['sort_direction'] ?? 'desc';
        $query->orderBy($sortBy, $sortDirection);
    }

    private function formatResponse($response): array
    {
        return [
            'id' => $response->id,
            'survey' => [
                'id' => $response->survey->id,
                'title' => $response->survey->title,
                'survey_type' => $response->survey->survey_type,
                'is_anonymous' => $response->survey->is_anonymous
            ],
            'institution' => [
                'id' => $response->institution->id,
                'name' => $response->institution->name,
                'type' => $response->institution->type
            ],
            'respondent' => $response->survey->is_anonymous ? null : [
                'id' => $response->respondent->id,
                'username' => $response->respondent->username,
                'name' => $response->respondent->profile?->full_name ?? $response->respondent->username
            ],
            'respondent_role' => $response->respondent_role,
            'progress_percentage' => $response->progress_percentage,
            'is_complete' => $response->is_complete,
            'status' => $response->status,
            'started_at' => $response->started_at,
            'submitted_at' => $response->submitted_at,
            'approved_at' => $response->approved_at,
            'created_at' => $response->created_at,
            'updated_at' => $response->updated_at
        ];
    }

    private function logActivity(string $activityType, array $properties): void
    {
        ActivityLog::logActivity(array_merge([
            'user_id' => Auth::id(),
            'activity_type' => $activityType,
            'institution_id' => Auth::user()->institution_id
        ], $properties));
    }

    private function logAudit(int $surveyId, int $responseId, string $action, array $details): void
    {
        SurveyAuditLog::create([
            'survey_id' => $surveyId,
            'response_id' => $responseId,
            'user_id' => Auth::id(),
            'action' => $action,
            'details' => $details,
            'ip_address' => request()->ip(),
            'created_at' => now()
        ]);
    }

    /**
     * Check if a user can start a survey (basic availability check without existing response constraints)
     */
    private function canUserStartSurvey(Survey $survey, int $institutionId): bool
    {
        // Check if survey is active and not expired
        if (!$survey->isOpenForResponses()) {
            return false;
        }

        // Check if institution is in target list
        if (!in_array($institutionId, $survey->target_institutions ?? [])) {
            return false;
        }

        return true;
    }
}