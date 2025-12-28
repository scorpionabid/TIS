<?php

namespace App\Services\TeacherRating;

use App\Models\TeacherProfile;
use App\Models\RatingConfiguration;

/**
 * AwardCalculator - Component 6 (10% weight)
 *
 * Hesablama məntiqi (PRD əsasında):
 * - Mükafatlar və təltiflər
 * - Növləri: dövlət (15 bal), nazirlik (10 bal), regional (7 bal), məktəb (3 bal)
 * - Son 5 il ərzində əldə edilmiş mükafatlar
 * - Hər mükafat növünün balı var (award_types cədvəlində)
 */
class AwardCalculator
{
    public function calculate(TeacherProfile $teacher, int $academicYearId, RatingConfiguration $config): array
    {
        // Get all awards for this teacher
        // Note: Awards are not tied to academic year, they are valid for 5 years
        $fiveYearsAgo = now()->subYears(5);
        $awards = $teacher->awards()
            ->where('award_date', '>=', $fiveYearsAgo)
            ->with('awardType')
            ->get();

        if ($awards->isEmpty()) {
            return [
                'raw_score' => 0,
                'weighted_score' => 0,
                'details' => 'No awards found',
            ];
        }

        // Calculate total points based on award types
        $totalPoints = 0;
        $typeBreakdown = [];

        foreach ($awards as $award) {
            if ($award->awardType && $award->awardType->is_active) {
                $points = $award->awardType->score_weight;
                $totalPoints += $points;

                $typeName = $award->awardType->name;
                if (!isset($typeBreakdown[$typeName])) {
                    $typeBreakdown[$typeName] = [
                        'count' => 0,
                        'points' => 0,
                    ];
                }
                $typeBreakdown[$typeName]['count']++;
                $typeBreakdown[$typeName]['points'] += $points;
            }
        }

        // Normalize to 0-100 scale
        // Maximum realistic score: 3 state awards = 45 points
        // We'll use 50 as max for normalization
        $maxPoints = 50;
        $rawScore = min(($totalPoints / $maxPoints) * 100, 100);

        // Apply component weight
        $weightedScore = $rawScore * $config->weight;

        return [
            'raw_score' => round($rawScore, 2),
            'weighted_score' => round($weightedScore, 2),
            'details' => [
                'total_awards' => $awards->count(),
                'total_points' => $totalPoints,
                'type_breakdown' => $typeBreakdown,
                'latest_award_date' => $awards->max('award_date'),
                'verified_awards' => $awards->filter(function ($award) {
                    return $award->is_verified;
                })->count(),
            ],
        ];
    }
}
