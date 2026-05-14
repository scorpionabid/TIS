<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Services\Survey\Domains\Activity\SurveyActivityTracker;
use App\Services\Survey\Domains\Crud\SurveyCrudManager;
use App\Services\Survey\Domains\Formatting\SurveyResponseFormatter;
use App\Services\Survey\Domains\Query\SurveyQueryBuilder;
use App\Services\Survey\Domains\Questions\QuestionSyncService;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Survey CRUD Service (Refactored - Sprint 3)
 *
 * Central orchestrator for survey operations, now delegating to domain services.
 *
 * ARCHITECTURE:
 * - SurveyQueryBuilder: Filtering, searching, pagination, hierarchy
 * - SurveyCrudManager: Create, update, delete, duplicate operations
 * - QuestionSyncService: Question synchronization and type mapping
 * - SurveyResponseFormatter: API response formatting
 * - SurveyActivityTracker: Logging, audit, notifications
 *
 * REFACTORED: Original 1,012 lines → ~200 lines orchestrator + 5 domain services
 */
class SurveyCrudService
{
    /**
     * Constructor with dependency injection
     */
    public function __construct(
        protected SurveyQueryBuilder $queryBuilder,
        protected SurveyCrudManager $crudManager,
        protected QuestionSyncService $questionSync,
        protected SurveyResponseFormatter $formatter,
        protected SurveyActivityTracker $activityTracker
    ) {}

    /**
     * Get paginated surveys list with filtering
     */
    public function getPaginatedList(array $params): LengthAwarePaginator
    {
        $surveys = $this->queryBuilder->getPaginatedList($params);

        // Log activity
        $this->activityTracker->logActivity('surveys_list', 'Accessed surveys list', [
            'filters' => array_intersect_key($params, array_flip(['search', 'status', 'survey_type', 'creator_id', 'institution_id'])),
            'pagination' => [
                'per_page' => $params['per_page'] ?? 15,
                'page' => $params['page'] ?? 1,
            ],
        ]);

        return $surveys;
    }

    /**
     * Get survey with all relations
     */
    public function getWithRelations(Survey $survey): Survey
    {
        $survey = $this->crudManager->getWithRelations($survey);

        // Log activity
        $this->activityTracker->logActivity('survey_view', "Viewed survey: {$survey->title}", [
            'entity_type' => 'Survey',
            'entity_id' => $survey->id,
        ]);

        return $survey;
    }

    /**
     * Create new survey
     */
    public function create(array $data): Survey
    {
        $survey = $this->crudManager->create($data);

        // Log activity
        $this->activityTracker->logActivity('survey_create', "Created survey: {$survey->title}", [
            'entity_type' => 'Survey',
            'entity_id' => $survey->id,
            'after_state' => $survey->toArray(),
        ]);

        // Log survey audit
        $this->activityTracker->logSurveyAudit($survey, 'created', 'Survey created');

        return $survey;
    }

    /**
     * Update survey
     */
    public function update(Survey $survey, array $data): Survey
    {
        $oldData = $survey->toArray();

        $survey = $this->crudManager->update($survey, $data);

        // Log activity
        $this->activityTracker->logActivity('survey_update', "Updated survey: {$survey->title}", [
            'entity_type' => 'Survey',
            'entity_id' => $survey->id,
            'before_state' => $oldData,
            'after_state' => $survey->toArray(),
        ]);

        // Log survey audit
        $this->activityTracker->logSurveyAudit($survey, 'updated', 'Survey updated');

        return $survey;
    }

    /**
     * Delete survey
     */
    public function delete(Survey $survey): bool
    {
        $surveyTitle = $survey->title;
        $surveyId = $survey->id;

        $result = $this->crudManager->delete($survey);

        // Log activity
        $this->activityTracker->logActivity('survey_delete', "Deleted survey: {$surveyTitle}", [
            'entity_type' => 'Survey',
            'entity_id' => $surveyId,
        ]);

        return $result;
    }

    /**
     * Get survey form data for response
     */
    public function getSurveyForResponse(Survey $survey): array
    {
        return $this->formatter->getSurveyForResponse($survey);
    }

    /**
     * Duplicate survey
     */
    public function duplicate(Survey $survey, array $overrides = []): Survey
    {
        $duplicate = $this->crudManager->duplicate($survey, $overrides);

        // Log activity
        $this->activityTracker->logActivity('survey_duplicate', "Duplicated survey: {$survey->title} → {$duplicate->title}", [
            'entity_type' => 'Survey',
            'entity_id' => $duplicate->id,
            'source_survey_id' => $survey->id,
        ]);

        return $duplicate;
    }

    /**
     * Format survey for API response
     */
    public function formatForResponse(Survey $survey): array
    {
        return $this->formatter->formatForResponse($survey);
    }

    /**
     * Format detailed survey for API response
     */
    public function formatDetailedForResponse(Survey $survey): array
    {
        return $this->formatter->formatDetailedForResponse($survey);
    }

    /**
     * Get hierarchical institution IDs for user
     */
    public function getHierarchicalInstitutionIds($user): array
    {
        return $this->queryBuilder->getHierarchicalInstitutionIds($user);
    }

    /**
     * Apply hierarchical access control to survey query
     */
    public function applyHierarchicalFiltering($query, $user): void
    {
        $this->queryBuilder->applyHierarchicalFiltering($query, $user);
    }

    /**
     * Apply survey visibility filtering
     */
    public function applySurveyVisibilityFiltering($query, $user): void
    {
        $this->queryBuilder->applySurveyVisibilityFiltering($query, $user);
    }

    /**
     * Get performance metrics by sector (for RegionAdmin)
     */
    public function getPerformanceBySector($user): array
    {
        if (! $user->hasRole('regionadmin')) {
            return [];
        }

        $userRegionId = $user->institution_id;

        return Institution::where('parent_id', $userRegionId)
            ->where('level', 3)
            ->with(['children'])
            ->get()
            ->map(function ($sector) {
                $schoolIds = $sector->children->pluck('id');

                $surveys = Survey::whereJsonOverlaps('target_institutions', $schoolIds->toArray())->count();

                $responses = SurveyResponse::whereHas('survey', function ($query) {
                    // Survey from this region
                })->whereIn('institution_id', $schoolIds)->count();

                return [
                    'sector_name' => $sector->name,
                    'surveys_count' => $surveys,
                    'responses_count' => $responses,
                    'response_rate' => $surveys > 0 ? round(($responses / ($surveys * 10)) * 100, 1) : 0,
                ];
            })->toArray();
    }

    /**
     * Send survey notification to target institutions
     */
    protected function sendSurveyNotification(Survey $survey, string $action, array $targetInstitutions): void
    {
        $this->activityTracker->sendSurveyNotification($survey, $action, $targetInstitutions);
    }
}
