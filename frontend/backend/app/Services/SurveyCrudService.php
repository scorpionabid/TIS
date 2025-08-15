<?php

namespace App\Services;

use App\Models\Survey;
use App\Models\SurveyVersion;
use App\Models\SurveyAuditLog;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Pagination\LengthAwarePaginator;
use Exception;

class SurveyCrudService
{
    /**
     * Get paginated surveys list with filtering
     */
    public function getPaginatedList(array $params): LengthAwarePaginator
    {
        $query = Survey::with(['creator.profile']);
        
        // Apply filters
        $this->applyFilters($query, $params);
        
        // Apply search
        if (!empty($params['search'])) {
            $query->searchByTitle($params['search']);
        }
        
        // Apply sorting
        $this->applySorting($query, $params);
        
        $surveys = $query->paginate($params['per_page'] ?? 15);
        
        // Log activity
        $this->logActivity('surveys_list', 'Accessed surveys list', [
            'filters' => array_intersect_key($params, array_flip(['search', 'status', 'survey_type', 'creator_id', 'institution_id'])),
            'pagination' => [
                'per_page' => $params['per_page'] ?? 15,
                'page' => $params['page'] ?? 1
            ]
        ]);
        
        return $surveys;
    }
    
    /**
     * Get survey with all relations
     */
    public function getWithRelations(Survey $survey): Survey
    {
        $survey->load(['creator.profile', 'versions', 'responses.user']);
        
        // Log activity
        $this->logActivity('survey_view', "Viewed survey: {$survey->title}", [
            'entity_type' => 'Survey',
            'entity_id' => $survey->id
        ]);
        
        return $survey;
    }
    
    /**
     * Create new survey
     */
    public function create(array $data): Survey
    {
        return DB::transaction(function () use ($data) {
            // Create survey
            $survey = Survey::create([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'survey_type' => $data['survey_type'] ?? 'form',
                'status' => $data['status'] ?? 'draft',
                'questions' => $data['questions'] ?? [],
                'settings' => $data['settings'] ?? [],
                'targeting_rules' => $data['targeting_rules'] ?? [],
                'start_date' => $data['start_date'] ?? null,
                'end_date' => $data['end_date'] ?? null,
                'creator_id' => Auth::id(),
                'institution_id' => $data['institution_id'] ?? Auth::user()->institution_id,
                'max_responses' => $data['max_responses'] ?? null,
                'is_anonymous' => $data['is_anonymous'] ?? false,
                'allow_multiple_responses' => $data['allow_multiple_responses'] ?? false,
                'requires_login' => $data['requires_login'] ?? true,
                'auto_close_on_max' => $data['auto_close_on_max'] ?? false,
                'notification_settings' => $data['notification_settings'] ?? [],
            ]);

            // Create questions if provided
            if (!empty($data['questions'])) {
                foreach ($data['questions'] as $index => $questionData) {
                    // Map frontend question types to backend types
                    $backendType = $this->mapQuestionType($questionData['type']);
                    
                    $survey->questions()->create([
                        'title' => $questionData['question'],
                        'type' => $backendType,
                        'order_index' => $questionData['order'] ?? $index + 1,
                        'is_required' => $questionData['required'] ?? false,
                        'options' => $questionData['options'] ?? null,
                        'validation_rules' => $questionData['validation'] ?? null,
                    ]);
                }
            }

            // Create initial version
            $this->createVersion($survey, 'Initial version', $data);

            // Log activity
            $this->logActivity('survey_create', "Created survey: {$survey->title}", [
                'entity_type' => 'Survey',
                'entity_id' => $survey->id,
                'after_state' => $survey->toArray()
            ]);
            
            // Log survey audit
            $this->logSurveyAudit($survey, 'created', 'Survey created');

            return $survey->load(['creator.profile', 'versions']);
        });
    }
    
    /**
     * Update survey
     */
    public function update(Survey $survey, array $data): Survey
    {
        return DB::transaction(function () use ($survey, $data) {
            $oldData = $survey->toArray();
            
            // Prepare update data
            $updateData = array_intersect_key($data, array_flip([
                'title', 'description', 'survey_type', 'questions', 'settings', 
                'targeting_rules', 'start_date', 'end_date', 'max_responses',
                'is_anonymous', 'allow_multiple_responses', 'requires_login',
                'auto_close_on_max', 'notification_settings'
            ]));

            // Update survey
            $survey->update($updateData);

            // Create version if questions changed
            if (isset($data['questions']) && $data['questions'] !== $oldData['questions']) {
                $this->createVersion($survey, 'Questions updated', $data);
            }

            // Log activity
            $this->logActivity('survey_update', "Updated survey: {$survey->title}", [
                'entity_type' => 'Survey',
                'entity_id' => $survey->id,
                'before_state' => $oldData,
                'after_state' => $survey->toArray()
            ]);
            
            // Log survey audit
            $this->logSurveyAudit($survey, 'updated', 'Survey updated', [
                'changes' => array_diff_assoc($updateData, $oldData)
            ]);

            return $survey->load(['creator.profile', 'versions']);
        });
    }
    
    /**
     * Delete survey
     */
    public function delete(Survey $survey): bool
    {
        return DB::transaction(function () use ($survey) {
            $surveyTitle = $survey->title;
            $surveyId = $survey->id;
            
            // Check if survey can be deleted
            if ($survey->status === 'published' && $survey->responses()->count() > 0) {
                throw new Exception('Cannot delete published survey with responses. Please archive instead.');
            }

            // Delete related data
            $survey->responses()->delete();
            $survey->versions()->delete();
            
            // Delete survey
            $survey->delete();

            // Log activity
            $this->logActivity('survey_delete', "Deleted survey: {$surveyTitle}", [
                'entity_type' => 'Survey',
                'entity_id' => $surveyId
            ]);
            
            // Log survey audit
            SurveyAuditLog::create([
                'survey_id' => $surveyId,
                'user_id' => Auth::id(),
                'action' => 'deleted',
                'description' => 'Survey deleted',
                'old_values' => $survey->toArray(),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent()
            ]);

            return true;
        });
    }
    
    /**
     * Get survey form data for response
     */
    public function getSurveyForResponse(Survey $survey): array
    {
        // Check if survey is available for response
        if ($survey->status !== 'published') {
            throw new Exception('Survey is not available for responses');
        }
        
        if ($survey->end_date && $survey->end_date < now()) {
            throw new Exception('Survey has expired');
        }
        
        if ($survey->start_date && $survey->start_date > now()) {
            throw new Exception('Survey is not yet available');
        }
        
        if ($survey->max_responses && $survey->responses()->count() >= $survey->max_responses) {
            throw new Exception('Survey has reached maximum responses');
        }

        return [
            'id' => $survey->id,
            'title' => $survey->title,
            'description' => $survey->description,
            'survey_type' => $survey->survey_type,
            'questions' => $survey->questions,
            'settings' => $survey->settings,
            'is_anonymous' => $survey->is_anonymous,
            'allow_multiple_responses' => $survey->allow_multiple_responses,
            'requires_login' => $survey->requires_login,
            'response_count' => $survey->responses()->count(),
            'max_responses' => $survey->max_responses,
            'remaining_responses' => $survey->max_responses ? 
                $survey->max_responses - $survey->responses()->count() : null,
            'expires_at' => $survey->end_date,
            'estimated_duration' => $this->estimateResponseTime($survey->questions)
        ];
    }
    
    /**
     * Duplicate survey
     */
    public function duplicate(Survey $survey, array $overrides = []): Survey
    {
        return DB::transaction(function () use ($survey, $overrides) {
            // Prepare survey data for duplication
            $surveyData = $survey->toArray();
            
            // Remove unique fields
            unset($surveyData['id'], $surveyData['created_at'], $surveyData['updated_at'], $surveyData['published_at']);
            
            // Apply overrides
            $surveyData = array_merge($surveyData, $overrides);
            
            // Set defaults for duplicate
            if (!isset($overrides['title'])) {
                $surveyData['title'] = $survey->title . ' (Copy)';
            }
            $surveyData['status'] = 'draft';
            $surveyData['published_at'] = null;
            $surveyData['creator_id'] = Auth::id();
            
            // Create duplicate
            $duplicate = $this->create($surveyData);
            
            // Log activity
            $this->logActivity('survey_duplicate', "Duplicated survey: {$survey->title} → {$duplicate->title}", [
                'entity_type' => 'Survey',
                'entity_id' => $duplicate->id,
                'source_survey_id' => $survey->id
            ]);
            
            return $duplicate;
        });
    }
    
    /**
     * Apply filters to query
     */
    protected function applyFilters($query, array $params): void
    {
        if (!empty($params['status'])) {
            $query->byStatus($params['status']);
        }

        if (!empty($params['survey_type'])) {
            $query->byType($params['survey_type']);
        }

        if (!empty($params['creator_id'])) {
            $query->createdBy($params['creator_id']);
        }

        if (!empty($params['institution_id'])) {
            $query->forInstitution($params['institution_id']);
        }

        if (!empty($params['start_date'])) {
            $query->where('start_date', '>=', $params['start_date']);
        }

        if (!empty($params['end_date'])) {
            $query->where('end_date', '<=', $params['end_date']);
        }

        // Filter for surveys user can respond to
        if (!empty($params['my_surveys'])) {
            $userInstitutionId = Auth::user()->institution_id;
            if ($userInstitutionId) {
                $query->forInstitution($userInstitutionId);
            }
        }

        // Date range filters
        if (!empty($params['created_from'])) {
            $query->whereDate('created_at', '>=', $params['created_from']);
        }
        if (!empty($params['created_to'])) {
            $query->whereDate('created_at', '<=', $params['created_to']);
        }
    }
    
    /**
     * Apply sorting to query
     */
    protected function applySorting($query, array $params): void
    {
        $sortBy = $params['sort_by'] ?? 'created_at';
        $sortDirection = $params['sort_direction'] ?? 'desc';
        
        $allowedSorts = ['title', 'status', 'created_at', 'published_at', 'start_date', 'end_date'];
        
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDirection);
        } else {
            $query->orderBy('created_at', 'desc');
        }
    }
    
    /**
     * Create survey version
     */
    protected function createVersion(Survey $survey, string $description, array $data): SurveyVersion
    {
        return SurveyVersion::create([
            'survey_id' => $survey->id,
            'version_number' => $survey->versions()->count() + 1,
            'structure' => [
                'questions' => $data['questions'] ?? [],
                'settings' => $data['settings'] ?? [],
                'description' => $description
            ],
            'created_by' => Auth::id()
        ]);
    }
    
    /**
     * Estimate response time for survey
     */
    protected function estimateResponseTime(array $questions): int
    {
        $estimatedMinutes = 0;
        
        foreach ($questions as $question) {
            switch ($question['type'] ?? 'text') {
                case 'text':
                case 'email':
                case 'number':
                    $estimatedMinutes += 1;
                    break;
                case 'textarea':
                    $estimatedMinutes += 2;
                    break;
                case 'select':
                case 'radio':
                    $estimatedMinutes += 0.5;
                    break;
                case 'checkbox':
                    $estimatedMinutes += 1;
                    break;
                case 'rating':
                    $estimatedMinutes += 0.5;
                    break;
                case 'file':
                    $estimatedMinutes += 3;
                    break;
                default:
                    $estimatedMinutes += 1;
            }
        }
        
        return max(1, ceil($estimatedMinutes));
    }
    
    /**
     * Format survey for API response
     */
    public function formatForResponse(Survey $survey): array
    {
        return [
            'id' => $survey->id,
            'title' => $survey->title,
            'description' => $survey->description,
            'survey_type' => $survey->survey_type,
            'status' => $survey->status,
            'creator' => [
                'id' => $survey->creator?->id,
                'username' => $survey->creator?->username,
                'full_name' => $survey->creator?->profile?->full_name
            ],
            'institution' => [
                'id' => $survey->institution?->id,
                'name' => $survey->institution?->name
            ],
            'response_count' => $survey->responses_count ?? 0,
            'max_responses' => $survey->max_responses,
            'is_anonymous' => $survey->is_anonymous,
            'requires_login' => $survey->requires_login,
            'start_date' => $survey->start_date,
            'end_date' => $survey->end_date,
            'published_at' => $survey->published_at,
            'created_at' => $survey->created_at,
            'updated_at' => $survey->updated_at
        ];
    }
    
    /**
     * Format detailed survey for API response
     */
    public function formatDetailedForResponse(Survey $survey): array
    {
        $basic = $this->formatForResponse($survey);
        
        return array_merge($basic, [
            'questions' => $survey->questions,
            'settings' => $survey->settings,
            'targeting_rules' => $survey->targeting_rules,
            'notification_settings' => $survey->notification_settings,
            'allow_multiple_responses' => $survey->allow_multiple_responses,
            'auto_close_on_max' => $survey->auto_close_on_max,
            'versions' => $survey->versions?->map(function ($version) {
                return [
                    'id' => $version->id,
                    'version_number' => $version->version_number,
                    'description' => $version->description,
                    'created_at' => $version->created_at
                ];
            }),
            'recent_responses' => $survey->responses?->take(5)->map(function ($response) {
                return [
                    'id' => $response->id,
                    'user' => $response->user?->username ?? 'Anonymous',
                    'submitted_at' => $response->created_at
                ];
            })
        ]);
    }
    
    /**
     * Log survey audit
     */
    protected function logSurveyAudit(Survey $survey, string $action, string $description, array $additionalData = []): void
    {
        SurveyAuditLog::create([
            'survey_id' => $survey->id,
            'user_id' => Auth::id(),
            'action' => $action,
            'description' => $description,
            'old_values' => $additionalData['old_values'] ?? null,
            'new_values' => $additionalData['new_values'] ?? null,
            'metadata' => $additionalData,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);
    }
    
    /**
     * Map frontend question types to backend enum types
     */
    private function mapQuestionType(string $frontendType): string
    {
        $mapping = [
            'radio' => 'single_choice',
            'checkbox' => 'multiple_choice',
            'text' => 'text',
            'textarea' => 'text',
            'number' => 'number',
            'email' => 'text',
            'date' => 'date',
            'file' => 'file_upload',
            'rating' => 'rating',
            'select' => 'single_choice'
        ];

        return $mapping[$frontendType] ?? 'text';
    }
    
    /**
     * Log activity
     */
    protected function logActivity(string $activityType, string $description, array $additionalData = []): void
    {
        $data = array_merge([
            'user_id' => Auth::id(),
            'activity_type' => $activityType,
            'description' => $description,
            'institution_id' => Auth::user()?->institution_id
        ], $additionalData);
        
        ActivityLog::logActivity($data);
    }
}