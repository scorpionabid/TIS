<?php

namespace App\Services\Survey\Domains\Formatting;

use App\Models\Survey;
use Exception;

/**
 * Survey Response Formatter
 *
 * Formats surveys for API responses (basic, detailed, public).
 */
class SurveyResponseFormatter
{
    /**
     * Estimate response time for survey
     */
    public function estimateResponseTime(array $questions): int
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
     * Format survey for API response (basic)
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
                'full_name' => $survey->creator?->profile?->full_name,
            ],
            'institution' => [
                'id' => $survey->institution?->id,
                'name' => $survey->institution?->name,
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
            'updated_at' => $survey->updated_at,
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
                    'question' => $question->question,
                    'description' => $question->description,
                    'type' => $question->type,
                    'order' => $question->order,
                    'required' => $question->required,
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
                    'created_at' => $version->created_at,
                ];
            }),
            'recent_responses' => $survey->responses?->take(5)->map(function ($response) {
                return [
                    'id' => $response->id,
                    'user' => $response->user?->username ?? 'Anonymous',
                    'submitted_at' => $response->created_at,
                ];
            }),
        ]);
    }

    /**
     * Get survey form data for public response
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
            'estimated_duration' => $this->estimateResponseTime($survey->questions->toArray()),
        ];
    }
}
