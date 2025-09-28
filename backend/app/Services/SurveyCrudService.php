<?php

namespace App\Services;

use App\Models\Survey;
use App\Models\SurveyVersion;
use App\Models\SurveyAuditLog;
use App\Models\ActivityLog;
use App\Models\Institution;
use App\Models\SurveyResponse;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Pagination\LengthAwarePaginator;
use Exception;

class SurveyCrudService
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }
    /**
     * Get paginated surveys list with filtering
     */
    public function getPaginatedList(array $params): LengthAwarePaginator
    {
        $query = Survey::with(['creator.profile'])->withCount(['questions']);
        
        // Apply filters
        $this->applyFilters($query, $params);
        
        // Apply hierarchical filtering - ƏSAS DÜZƏLİŞ
        $this->applySurveyVisibilityFiltering($query, auth()->user());
        
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
        $survey->load(['creator.profile', 'institution', 'versions', 'responses.respondent', 'questions']);
        
        // Format questions for API response (backward compatibility)
        if ($survey->questions->count() > 0) {
            $questionsData = $survey->questions->map(function($question) {
                // Ensure options is always an array
                $options = [];
                if ($question->options) {
                    if (is_string($question->options)) {
                        $options = json_decode($question->options, true) ?? [];
                    } elseif (is_array($question->options)) {
                        $options = $question->options;
                    }
                }
                
                return [
                    'id' => $question->id,
                    'question' => $question->title,
                    'type' => $this->mapQuestionTypeToFrontend($question->type),
                    'required' => $question->is_required,
                    'options' => $options,
                    'order' => $question->order_index,
                    'backend_type' => $question->type, // Keep original backend type for debugging
                ];
            })->toArray();
            
            // Update structure with questions for compatibility
            $structure = $survey->structure ?? [];
            $structure['sections'] = [
                [
                    'id' => 'default',
                    'title' => 'Questions',
                    'questions' => $questionsData
                ]
            ];
            $survey->structure = $structure;
        }
        
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
                'structure' => [
                    'settings' => $data['settings'] ?? [],
                    'notification_settings' => $data['notification_settings'] ?? [],
                ],
                'target_institutions' => $data['target_institutions'] ?? [],
                'target_departments' => $data['target_departments'] ?? [],
                'start_date' => $data['start_date'] ?? null,
                'end_date' => $data['end_date'] ?? null,
                'creator_id' => Auth::id(),
                'max_questions' => $data['max_questions'] ?? 10,
                'completion_threshold' => $data['max_responses'] ?? null,
                'is_anonymous' => $data['is_anonymous'] ?? false,
                'allow_multiple_responses' => $data['allow_multiple_responses'] ?? false,
                'approval_status' => 'pending',
                'estimated_recipients' => count($data['target_institutions'] ?? []) * 10,
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
                
                // Update questions count
                $survey->updateQuestionsCount();
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

            // Send notification to target institutions if specified
            if (!empty($data['target_institutions'])) {
                try {
                    $this->sendSurveyNotification($survey, 'survey_assigned', $data['target_institutions']);
                } catch (\Exception $e) {
                    \Log::error('Failed to send survey assignment notification', [
                        'survey_id' => $survey->id,
                        'target_institutions' => $data['target_institutions'],
                        'error' => $e->getMessage()
                    ]);
                    // Don't fail the survey creation if notification fails
                }
            }

            return $survey->load(['creator.profile', 'versions']);
        });
    }
    
    /**
     * Update survey
     */
    public function update(Survey $survey, array $data): Survey
    {
        // Check if survey can be edited
        if ($survey->status === 'published' && $survey->responses()->count() > 0) {
            throw new \Exception('Yayımlanmış və cavabları olan sorğuları düzəliş etmək olmaz');
        }
        
        return DB::transaction(function () use ($survey, $data) {
            $oldData = $survey->toArray();
            
            // Prepare update data for valid Survey fields
            $updateData = array_intersect_key($data, array_flip([
                'title', 'description', 'survey_type', 'start_date', 'end_date',
                'is_anonymous', 'allow_multiple_responses', 'max_questions',
                'completion_threshold', 'target_institutions', 'target_departments'
            ]));
            
            // Debug: Log update data preparation
            \Log::info('SurveyCrudService update data preparation:', [
                'survey_id' => $survey->id,
                'original_target_institutions' => $data['target_institutions'] ?? 'not in original data',
                'prepared_target_institutions' => $updateData['target_institutions'] ?? 'not in update data',
                'update_data_keys' => array_keys($updateData)
            ]);

            // Update structure if settings changed
            if (isset($data['settings']) || isset($data['notification_settings'])) {
                $structure = $survey->structure ?? [];
                if (isset($data['settings'])) {
                    $structure['settings'] = $data['settings'];
                }
                if (isset($data['notification_settings'])) {
                    $structure['notification_settings'] = $data['notification_settings'];
                }
                $updateData['structure'] = $structure;
            }

            // Update survey
            try {
                $survey->update($updateData);
                \Log::info('Survey update successful:', ['survey_id' => $survey->id]);
            } catch (\Exception $e) {
                \Log::error('Survey update failed:', [
                    'survey_id' => $survey->id,
                    'error' => $e->getMessage(),
                    'update_data' => $updateData
                ]);
                throw $e;
            }

            // Update questions if provided
            if (isset($data['questions'])) {
                try {
                    // Remove old questions
                    \Log::info('Deleting existing questions for survey', ['survey_id' => $survey->id]);
                    $survey->questions()->delete();
                    \Log::info('Successfully deleted existing questions');
                } catch (\Exception $e) {
                    \Log::error('Failed to delete existing questions:', [
                        'survey_id' => $survey->id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    throw $e;
                }
                
                // Create new questions
                foreach ($data['questions'] as $index => $questionData) {
                    try {
                        $backendType = $this->mapQuestionType($questionData['type']);
                        
                        \Log::info('Creating question:', [
                            'index' => $index,
                            'question' => $questionData['question'],
                            'type' => $backendType,
                            'options' => $questionData['options'] ?? null,
                            'options_type' => gettype($questionData['options'] ?? null)
                        ]);
                        
                        // Handle options - convert empty arrays to null
                        $options = $questionData['options'] ?? null;
                        if (is_array($options) && empty($options)) {
                            $options = null;
                        }
                        
                        $newQuestion = $survey->questions()->create([
                            'title' => $questionData['question'],
                            'type' => $backendType,
                            'order_index' => $questionData['order'] ?? $index + 1,
                            'is_required' => $questionData['required'] ?? false,
                            'options' => $options,
                            'validation_rules' => $questionData['validation'] ?? null,
                        ]);
                        
                        \Log::info('Question created successfully:', [
                            'question_id' => $newQuestion->id,
                            'title' => $newQuestion->title,
                            'type' => $newQuestion->type
                        ]);
                    } catch (\Exception $e) {
                        \Log::error('Question creation failed:', [
                            'survey_id' => $survey->id,
                            'question_index' => $index,
                            'error' => $e->getMessage(),
                            'question_data' => $questionData
                        ]);
                        throw $e;
                    }
                }
                
                \Log::info('All questions processed successfully');
                
                // Update questions count
                try {
                    \Log::info('Updating questions count');
                    $survey->updateQuestionsCount();
                    \Log::info('Questions count updated successfully');
                } catch (\Exception $e) {
                    \Log::error('Failed to update questions count:', [
                        'survey_id' => $survey->id,
                        'error' => $e->getMessage()
                    ]);
                    throw $e;
                }
                
                // Create version for questions change
                try {
                    \Log::info('Creating version for questions change');
                    $this->createVersion($survey, 'Questions updated', $data);
                    \Log::info('Version created successfully');
                } catch (\Exception $e) {
                    \Log::error('Failed to create version:', [
                        'survey_id' => $survey->id,
                        'error' => $e->getMessage()
                    ]);
                    throw $e;
                }
            }

            // Log activity
            try {
                \Log::info('Starting activity log');
                $this->logActivity('survey_update', "Updated survey: {$survey->title}", [
                    'entity_type' => 'Survey',
                    'entity_id' => $survey->id,
                    'before_state' => $oldData,
                    'after_state' => $survey->toArray()
                ]);
                \Log::info('Activity log completed');
            } catch (\Exception $e) {
                \Log::error('Activity log failed:', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }
            
            // Log survey audit
            try {
                \Log::info('Starting survey audit log');
                // Calculate changes safely for nested arrays
                $changes = [];
                foreach ($updateData as $key => $newValue) {
                    $oldValue = $oldData[$key] ?? null;
                    if (json_encode($newValue) !== json_encode($oldValue)) {
                        $changes[$key] = [
                            'old' => $oldValue,
                            'new' => $newValue
                        ];
                    }
                }
                
                $this->logSurveyAudit($survey, 'updated', 'Survey updated', [
                    'changes' => $changes
                ]);
                \Log::info('Survey audit log completed');
            } catch (\Exception $e) {
                \Log::error('Survey audit log failed:', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }

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
            'estimated_duration' => $this->estimateResponseTime($survey->questions->toArray())
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
            'questions_count' => $survey->questions_count ?? $survey->questions()->count(),
            'max_responses' => $survey->max_responses,
            'is_anonymous' => $survey->is_anonymous,
            'requires_login' => $survey->requires_login,
            'start_date' => $survey->start_date,
            'end_date' => $survey->end_date,
            'target_institutions' => $survey->target_institutions,
            'target_departments' => $survey->target_departments,
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
            'questions' => $survey->questions->map(function ($question) {
                return [
                    'id' => $question->id,
                    'question' => $question->question,  // Uses accessor
                    'description' => $question->description,
                    'type' => $question->type,
                    'order' => $question->order,        // Uses accessor
                    'required' => $question->required,  // Uses accessor
                    'is_active' => $question->is_active,
                    'options' => $question->options,
                    'validation_rules' => $question->validation_rules,
                    'metadata' => $question->metadata,
                    'min_value' => $question->min_value,
                    'max_value' => $question->max_value,
                    'min_length' => $question->min_length,
                    'max_length' => $question->max_length,
                    'allowed_file_types' => $question->allowed_file_types,
                    'max_file_size' => $question->max_file_size,
                    'rating_min' => $question->rating_min,
                    'rating_max' => $question->rating_max,
                    'rating_min_label' => $question->rating_min_label,
                    'rating_max_label' => $question->rating_max_label,
                    'table_headers' => $question->table_headers,
                    'table_rows' => $question->table_rows,
                    'translations' => $question->translations,
                    'created_at' => $question->created_at,
                    'updated_at' => $question->updated_at,
                ];
            }),
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
            // Legacy frontend types (for backward compatibility)
            'radio' => 'single_choice',
            'checkbox' => 'multiple_choice', 
            'textarea' => 'text',
            'email' => 'text',
            'select' => 'single_choice',
            'file' => 'file_upload',
            
            // New aligned types (pass through)
            'text' => 'text',
            'number' => 'number', 
            'date' => 'date',
            'single_choice' => 'single_choice',
            'multiple_choice' => 'multiple_choice',
            'file_upload' => 'file_upload',
            'rating' => 'rating',
            'table_matrix' => 'table_matrix',
        ];

        return $mapping[$frontendType] ?? 'text';
    }
    
    /**
     * Map backend question types to frontend types
     */
    private function mapQuestionTypeToFrontend(string $backendType): string
    {
        $mapping = [
            'single_choice' => 'radio',
            'multiple_choice' => 'checkbox',
            'text' => 'text',
            'number' => 'number',
            'date' => 'date',
            'file_upload' => 'file',
            'rating' => 'rating',
            'table_matrix' => 'table',
        ];

        return $mapping[$backendType] ?? 'text';
    }
    
    /**
     * Get hierarchical institution IDs for user
     */
    public function getHierarchicalInstitutionIds($user): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }
        
        if ($user->hasRole('regionadmin')) {
            $userRegionId = $user->institution_id;
            return Institution::where(function($query) use ($userRegionId) {
                $query->where('id', $userRegionId)
                      ->orWhere('parent_id', $userRegionId)
                      ->orWhereHas('parent', function($q) use ($userRegionId) {
                          $q->where('parent_id', $userRegionId);
                      });
            })->pluck('id')->toArray();
        }
        
        if ($user->hasRole('sektoradmin')) {
            $userSectorId = $user->institution_id;
            return Institution::where(function($query) use ($userSectorId) {
                $query->where('id', $userSectorId)
                      ->orWhere('parent_id', $userSectorId);
            })->pluck('id')->toArray();
        }
        
        // SchoolAdmin and other roles see only their own institution
        return [$user->institution_id];
    }

    /**
     * Apply hierarchical access control to survey query
     */
    public function applyHierarchicalFiltering($query, $user): void
    {
        if ($user->hasRole('superadmin')) {
            return; // SuperAdmin sees all
        }
        
        $allowedInstitutionIds = $this->getHierarchicalInstitutionIds($user);
        
        $query->whereHas('creator', function($q) use ($allowedInstitutionIds) {
            $q->whereIn('institution_id', $allowedInstitutionIds);
        });
    }

    /**
     * Apply survey visibility filtering - users see surveys they created OR surveys targeted to them
     */
    public function applySurveyVisibilityFiltering($query, $user): void
    {
        if ($user->hasRole('superadmin')) {
            return; // SuperAdmin sees all
        }
        
        $userInstitutionId = $user->institution_id;
        $allowedInstitutionIds = $this->getHierarchicalInstitutionIds($user);
        
        $query->where(function($q) use ($allowedInstitutionIds, $userInstitutionId) {
            // See surveys created by users from allowed institutions (hierarchy)
            $q->whereHas('creator', function($creatorQuery) use ($allowedInstitutionIds) {
                $creatorQuery->whereIn('institution_id', $allowedInstitutionIds);
            })
            // OR see surveys targeted to this user's institution or hierarchy
            ->orWhere(function($targetQuery) use ($userInstitutionId, $allowedInstitutionIds) {
                $targetQuery->where(function($q1) use ($userInstitutionId) {
                    // Surveys targeted to user's own institution
                    $q1->whereJsonContains('target_institutions', $userInstitutionId);
                })->orWhere(function($q2) use ($allowedInstitutionIds) {
                    // Surveys targeted to any institution in user's hierarchy
                    foreach ($allowedInstitutionIds as $instId) {
                        $q2->orWhereJsonContains('target_institutions', $instId);
                    }
                });
            });
        });
    }

    /**
     * Get performance metrics by sector (for RegionAdmin)
     */
    public function getPerformanceBySector($user): array
    {
        if (!$user->hasRole('regionadmin')) {
            return [];
        }
        
        $userRegionId = $user->institution_id;
        
        return Institution::where('parent_id', $userRegionId)
            ->where('level', 3)
            ->with(['children'])
            ->get()
            ->map(function($sector) {
                $schoolIds = $sector->children->pluck('id');
                
                $surveys = Survey::whereJsonOverlaps('target_institutions', $schoolIds->toArray())->count();
                
                $responses = SurveyResponse::whereHas('survey', function($query) {
                    // Survey from this region
                })->whereIn('institution_id', $schoolIds)->count();
                
                return [
                    'sector_name' => $sector->name,
                    'surveys_count' => $surveys,
                    'responses_count' => $responses,
                    'response_rate' => $surveys > 0 ? round(($responses / ($surveys * 10)) * 100, 1) : 0
                ];
            })->toArray();
    }

    /**
     * Send survey notification to target institutions
     */
    protected function sendSurveyNotification(Survey $survey, string $action, array $targetInstitutions): void
    {
        $variables = [
            'survey_title' => $survey->title,
            'survey_description' => $survey->description ?? '',
            'creator_name' => $survey->creator->name ?? 'Sistem',
            'deadline' => $survey->end_date ? $survey->end_date->format('d.m.Y H:i') : 'Müddət təyin edilməyib',
        ];

        $recipients = [
            'institutions' => $targetInstitutions
        ];

        $options = [
            'related' => $survey,
            'priority' => $survey->priority ?? 'normal',
            'channels' => ['in_app', 'email'], // Default channels for survey notifications
        ];

        $notifications = $this->notificationService->sendFromTemplate($action, $recipients, $variables, $options);

        \Log::info('Survey notification sent', [
            'survey_id' => $survey->id,
            'action' => $action,
            'target_institutions' => $targetInstitutions,
            'notifications_sent' => count($notifications),
        ]);
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