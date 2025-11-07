<?php

namespace App\Services\Survey\Domains\Crud;

use App\Models\Survey;
use App\Models\SurveyVersion;
use App\Services\Survey\Domains\Questions\QuestionSyncService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Exception;

/**
 * Survey CRUD Manager
 *
 * Handles core create, update, delete operations with transaction safety.
 * Integrates with QuestionSyncService for question management.
 */
class SurveyCrudManager
{
    public function __construct(
        protected QuestionSyncService $questionSync
    ) {}

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

            $questionChanges = [];

            // Create questions if provided
            if (!empty($data['questions'])) {
                $questionChanges = $this->questionSync->syncQuestions($survey, $data['questions']);
            }

            // Create initial version
            $this->createVersion($survey, 'Initial version', $data);

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
            throw new Exception('Yayımlanmış və cavabları olan sorğuları düzəliş etmək olmaz');
        }

        return DB::transaction(function () use ($survey, $data) {
            $oldData = $survey->toArray();

            // Prepare update data for valid Survey fields
            $updateData = array_intersect_key($data, array_flip([
                'title', 'description', 'survey_type', 'start_date', 'end_date',
                'is_anonymous', 'allow_multiple_responses', 'max_questions',
                'completion_threshold', 'target_institutions', 'target_departments'
            ]));

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
            $survey->update($updateData);

            $questionChanges = null;
            if (isset($data['questions'])) {
                $questionChanges = $this->questionSync->syncQuestions($survey, $data['questions']);

                if ($this->questionSync->hasQuestionChanges($questionChanges)) {
                    $this->createVersion($survey, 'Questions updated', $data);
                }
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
            // Check if survey can be deleted
            if ($survey->status === 'published' && $survey->responses()->count() > 0) {
                throw new Exception('Cannot delete published survey with responses. Please archive instead.');
            }

            // Delete related data
            $survey->responses()->delete();
            $survey->versions()->delete();

            // Delete survey
            $survey->delete();

            return true;
        });
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
            return $this->create($surveyData);
        });
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
                    'type' => $this->questionSync->mapQuestionTypeToFrontend($question->type),
                    'required' => $question->is_required,
                    'options' => $options,
                    'order' => $question->order_index,
                    'backend_type' => $question->type,
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

        return $survey;
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
}
