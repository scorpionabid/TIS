<?php

namespace App\Services\SurveyAnalytics\Domains\Question;

use App\Models\Survey;
use Illuminate\Support\Collection;

/**
 * Question Analytics Service
 *
 * Handles question-level analytics for surveys.
 * Extracted from SurveyAnalyticsService (Sprint 5 Phase 2).
 *
 * RESPONSIBILITIES:
 * - Question-level statistics (response counts, skip rates)
 * - Answer distribution analysis
 * - Rating/scale calculations
 * - Question completion tracking
 */
class QuestionAnalyticsService
{
    /**
     * Get comprehensive question statistics for a survey
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getQuestionStats() (lines 221-240)
     */
    public function getQuestionStats(Survey $survey): array
    {
        $questions = $survey->questions;
        $responses = $survey->responses;

        $questionStats = [];
        foreach ($questions as $index => $question) {
            $questionStats[] = [
                'question_index' => $index,
                'question_text' => $question['question'],
                'question_type' => $question['type'],
                'response_count' => $this->getQuestionResponseCount($responses, $index),
                'skip_rate' => $this->getQuestionSkipRate($responses, $index),
                'answer_distribution' => $this->getAnswerDistribution($responses, $index, $question['type']),
                'average_rating' => $this->getAverageRating($responses, $index, $question['type'])
            ];
        }

        return $questionStats;
    }

    /**
     * Get completion rate by question
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getCompletionByQuestion() (lines 1080-1094)
     */
    public function getCompletionByQuestion(Survey $survey): array
    {
        $questions = $survey->questions;
        $responses = $survey->responses;

        $completion = [];
        foreach ($questions as $index => $question) {
            $completion[] = [
                'question_index' => $index,
                'completion_rate' => $this->getQuestionResponseCount($responses, $index)
            ];
        }

        return $completion;
    }

    /**
     * Get response count for a specific question
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getQuestionResponseCount() (lines 912-918)
     */
    public function getQuestionResponseCount(Collection $responses, int $questionIndex): int
    {
        return $responses->filter(function($response) use ($questionIndex) {
            $answers = $response->responses ?? [];
            return isset($answers[$questionIndex]) && !empty($answers[$questionIndex]);
        })->count();
    }

    /**
     * Get skip rate for a specific question
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getQuestionSkipRate() (lines 923-930)
     */
    public function getQuestionSkipRate(Collection $responses, int $questionIndex): float
    {
        $total = $responses->count();
        if ($total == 0) return 0;

        $answered = $this->getQuestionResponseCount($responses, $questionIndex);
        return round((($total - $answered) / $total) * 100, 2);
    }

    /**
     * Get answer distribution for a specific question
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getAnswerDistribution() (lines 935-961)
     */
    public function getAnswerDistribution(Collection $responses, int $questionIndex, string $questionType): array
    {
        if ($questionType === 'rating' || $questionType === 'scale') {
            return $responses
                ->pluck("responses.$questionIndex")
                ->filter()
                ->countBy()
                ->toArray();
        }

        if ($questionType === 'multiple_choice' || $questionType === 'checkbox') {
            $distribution = [];
            foreach ($responses as $response) {
                $answer = $response->responses[$questionIndex] ?? null;
                if (is_array($answer)) {
                    foreach ($answer as $choice) {
                        $distribution[$choice] = ($distribution[$choice] ?? 0) + 1;
                    }
                } elseif ($answer) {
                    $distribution[$answer] = ($distribution[$answer] ?? 0) + 1;
                }
            }
            return $distribution;
        }

        return [];
    }

    /**
     * Get average rating for a specific question
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getAverageRating() (lines 966-978)
     */
    public function getAverageRating(Collection $responses, int $questionIndex, string $questionType): ?float
    {
        if (!in_array($questionType, ['rating', 'scale', 'number'])) {
            return null;
        }

        $ratings = $responses
            ->pluck("responses.$questionIndex")
            ->filter()
            ->filter(fn($val) => is_numeric($val));

        return $ratings->isEmpty() ? null : round($ratings->average(), 2);
    }
}
