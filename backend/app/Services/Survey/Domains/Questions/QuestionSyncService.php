<?php

namespace App\Services\Survey\Domains\Questions;

use App\Models\Survey;
use App\Models\SurveyQuestion;

/**
 * Question Sync Service
 *
 * Handles synchronization of survey questions (create, update, delete).
 * Critical service for maintaining question data integrity.
 */
class QuestionSyncService
{
    /**
     * Sync questions for a survey
     *
     * Handles create, update, and delete operations in a single sync.
     * Returns summary of changes for audit logging.
     *
     * @return array Summary of changes (created, updated, deleted)
     */
    public function syncQuestions(Survey $survey, array $questions): array
    {
        $existingQuestions = $survey->questions()->get()->keyBy('id');
        $processedIds = [];

        $summary = [
            'created' => [],
            'updated' => [],
            'deleted' => [],
        ];

        foreach ($questions as $index => $questionData) {
            $questionId = $questionData['id'] ?? null;
            $payload = $this->prepareQuestionPayload($questionData, $index);

            if ($questionId && $existingQuestions->has($questionId)) {
                /** @var \App\Models\SurveyQuestion $question */
                $question = $existingQuestions->get($questionId);
                $diff = $this->diffQuestionPayload($question, $payload);

                if (! empty($diff)) {
                    $question->fill($payload);
                    $question->save();

                    $summary['updated'][] = [
                        'id' => $question->id,
                        'changes' => $diff,
                    ];
                } elseif ($question->order_index !== $payload['order_index']) {
                    $question->update(['order_index' => $payload['order_index']]);
                }

                $processedIds[] = $question->id;
            } else {
                $newQuestion = $survey->questions()->create($payload);

                $summary['created'][] = [
                    'id' => $newQuestion->id,
                    'title' => $newQuestion->title,
                    'type' => $newQuestion->type,
                ];

                $processedIds[] = $newQuestion->id;
            }
        }

        $deletedIds = $existingQuestions->keys()->diff($processedIds);
        if ($deletedIds->isNotEmpty()) {
            $deletedQuestions = $survey->questions()->whereIn('id', $deletedIds->all())->get();
            $survey->questions()->whereIn('id', $deletedIds->all())->delete();

            foreach ($deletedQuestions as $question) {
                $summary['deleted'][] = [
                    'id' => $question->id,
                    'title' => $question->title,
                    'type' => $question->type,
                ];
            }

            // Reindex remaining questions after deletion
            $this->reindexQuestions($survey);
        }

        $survey->updateQuestionsCount();

        return $summary;
    }

    /**
     * Reindex questions after deletion to ensure sequential order_index
     */
    public function reindexQuestions(Survey $survey): void
    {
        $questions = $survey->questions()->ordered()->get();

        foreach ($questions as $index => $question) {
            $newOrderIndex = $index + 1;
            if ($question->order_index !== $newOrderIndex) {
                $question->update(['order_index' => $newOrderIndex]);
            }
        }
    }

    /**
     * Prepare question payload for database
     *
     * Maps frontend format to backend database schema.
     */
    public function prepareQuestionPayload(array $questionData, int $index): array
    {
        $backendType = $this->mapQuestionType($questionData['type'] ?? 'text');

        return [
            'title' => $questionData['question'] ?? $questionData['title'] ?? 'Unnamed question',
            'description' => $questionData['description'] ?? null,
            'type' => $backendType,
            'order_index' => $questionData['order'] ?? $questionData['order_index'] ?? $index + 1,
            'is_required' => (bool) ($questionData['required'] ?? $questionData['is_required'] ?? false),
            'is_active' => (bool) ($questionData['is_active'] ?? true),
            'options' => $this->normaliseOptions($questionData['options'] ?? null),
            'validation_rules' => $questionData['validation'] ?? $questionData['validation_rules'] ?? null,
            'metadata' => $questionData['metadata'] ?? null,
            'min_value' => $questionData['min_value'] ?? null,
            'max_value' => $questionData['max_value'] ?? null,
            'min_length' => $questionData['min_length'] ?? null,
            'max_length' => $questionData['max_length'] ?? null,
            'allowed_file_types' => $questionData['allowed_file_types'] ?? null,
            'max_file_size' => $questionData['max_file_size'] ?? null,
            'rating_min' => $questionData['rating_min'] ?? null,
            'rating_max' => $questionData['rating_max'] ?? null,
            'rating_min_label' => $questionData['rating_min_label'] ?? null,
            'rating_max_label' => $questionData['rating_max_label'] ?? null,
            'table_headers' => $questionData['table_headers'] ?? null,
            'table_rows' => $questionData['table_rows'] ?? null,
            'translations' => $questionData['translations'] ?? null,
        ];
    }

    /**
     * Normalize question options
     *
     * Ensures options are always in array format or null.
     *
     * @param mixed $options
     */
    public function normaliseOptions($options): ?array
    {
        if ($options === null) {
            return null;
        }

        if (is_array($options)) {
            return empty($options) ? null : array_values($options);
        }

        if (is_string($options)) {
            $decoded = json_decode($options, true);

            return empty($decoded) ? null : array_values($decoded);
        }

        return null;
    }

    /**
     * Diff question payload against existing question
     *
     * Returns array of changes for audit logging.
     *
     * @param SurveyQuestion $question
     */
    public function diffQuestionPayload($question, array $payload): array
    {
        $changes = [];

        foreach ($payload as $key => $value) {
            $original = $question->{$key};

            if (in_array($key, ['options', 'validation_rules', 'metadata', 'allowed_file_types', 'table_headers', 'table_rows', 'translations'], true)) {
                if (json_encode($original) !== json_encode($value)) {
                    $changes[$key] = [
                        'old' => $original,
                        'new' => $value,
                    ];
                }
            } elseif ($original != $value) {
                $changes[$key] = [
                    'old' => $original,
                    'new' => $value,
                ];
            }
        }

        return $changes;
    }

    /**
     * Check if question changes summary has any changes
     */
    public function hasQuestionChanges(?array $summary): bool
    {
        if (empty($summary)) {
            return false;
        }

        return ! empty($summary['created'])
            || ! empty($summary['updated'])
            || ! empty($summary['deleted']);
    }

    /**
     * Map frontend question types to backend enum types
     */
    public function mapQuestionType(string $frontendType): string
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
    public function mapQuestionTypeToFrontend(string $backendType): string
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
}
