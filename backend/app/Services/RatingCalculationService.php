<?php

namespace App\Services;

use App\Models\Rating;
use App\Models\RatingConfig;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RatingCalculationService
{
    /**
     * Calculate rating for a specific user.
     */
    public function calculateRating(int $userId, array $params): Rating
    {
        try {
            $user = User::findOrFail($userId);
            $institutionId = $user->institution_id;
            $academicYearId = $params['academic_year_id'];
            $period = $params['period'];

            // Get rating configuration
            $config = RatingConfig::where('institution_id', $institutionId)
                ->where('academic_year_id', $academicYearId)
                ->firstOrFail();

            // Calculate scores
            $taskScore = $this->calculateTaskScore($userId, $academicYearId);
            $surveyScore = $this->calculateSurveyScore($userId, $academicYearId);
            $manualScore = 0; // Default manual score

            // Calculate overall score based on weights
            $overallScore = ($taskScore * $config->task_weight)
                           + ($surveyScore * $config->survey_weight)
                           + ($manualScore * $config->manual_weight);

            // Create or update rating
            $rating = Rating::updateOrCreate(
                [
                    'user_id' => $userId,
                    'institution_id' => $institutionId,
                    'academic_year_id' => $academicYearId,
                    'period' => $period,
                ],
                [
                    'overall_score' => $overallScore,
                    'task_score' => $taskScore,
                    'survey_score' => $surveyScore,
                    'manual_score' => $manualScore,
                    'status' => 'published',
                    'metadata' => [
                        'calculation_method' => $config->calculation_method,
                        'calculated_at' => now()->toISOString(),
                        'weights' => [
                            'task' => $config->task_weight,
                            'survey' => $config->survey_weight,
                            'manual' => $config->manual_weight,
                        ],
                    ],
                ]
            );

            Log::info('Rating calculated successfully', [
                'user_id' => $userId,
                'overall_score' => $overallScore,
                'period' => $period,
            ]);

            return $rating;
        } catch (\Exception $e) {
            Log::error('Failed to calculate rating', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Calculate ratings for all users in an institution.
     */
    public function calculateAllRatings(array $params): array
    {
        try {
            $institutionId = auth()->user()->institution_id;
            $academicYearId = $params['academic_year_id'];
            $period = $params['period'];

            // Get all users in the institution
            $users = User::where('institution_id', $institutionId)->get();

            $results = [];
            $successCount = 0;
            $errorCount = 0;

            foreach ($users as $user) {
                try {
                    $rating = $this->calculateRating($user->id, $params);
                    $results[] = [
                        'user_id' => $user->id,
                        'user_name' => $user->full_name,
                        'rating' => $rating,
                        'status' => 'success',
                    ];
                    $successCount++;
                } catch (\Exception $e) {
                    $results[] = [
                        'user_id' => $user->id,
                        'user_name' => $user->full_name,
                        'status' => 'error',
                        'error' => $e->getMessage(),
                    ];
                    $errorCount++;
                }
            }

            Log::info('Bulk rating calculation completed', [
                'institution_id' => $institutionId,
                'period' => $period,
                'success_count' => $successCount,
                'error_count' => $errorCount,
            ]);

            return [
                'results' => $results,
                'summary' => [
                    'total_users' => $users->count(),
                    'success_count' => $successCount,
                    'error_count' => $errorCount,
                    'period' => $period,
                ],
            ];
        } catch (\Exception $e) {
            Log::error('Failed to calculate all ratings', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Calculate task completion score for a user.
     */
    private function calculateTaskScore(int $userId, int $academicYearId): float
    {
        // Get completed tasks for the user
        $completedTasks = DB::table('tasks')
            ->where('assigned_to', $userId)
            ->where('academic_year_id', $academicYearId)
            ->where('status', 'completed')
            ->count();

        // Get total tasks assigned to the user
        $totalTasks = DB::table('tasks')
            ->where('assigned_to', $userId)
            ->where('academic_year_id', $academicYearId)
            ->count();

        if ($totalTasks === 0) {
            return 0.0;
        }

        // Calculate score based on completion percentage
        return ($completedTasks / $totalTasks) * 100;
    }

    /**
     * Calculate survey response score for a user.
     */
    private function calculateSurveyScore(int $userId, int $academicYearId): float
    {
        // Get survey responses for the user
        $responses = DB::table('survey_responses')
            ->where('user_id', $userId)
            ->where('academic_year_id', $academicYearId)
            ->where('completed', true)
            ->count();

        // Get total surveys assigned to the user
        $totalSurveys = DB::table('survey_responses')
            ->where('user_id', $userId)
            ->where('academic_year_id', $academicYearId)
            ->count();

        if ($totalSurveys === 0) {
            return 0.0;
        }

        // Calculate score based on response percentage
        return ($responses / $totalSurveys) * 100;
    }
}
