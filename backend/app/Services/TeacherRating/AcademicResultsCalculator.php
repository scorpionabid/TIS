<?php

namespace App\Services\TeacherRating;

use App\Models\TeacherProfile;
use App\Models\RatingConfiguration;

/**
 * AcademicResultsCalculator - Component 1 (30% weight)
 *
 * Hesablama məntiqi (PRD əsasında):
 * - Şagird akademik nəticələri (quality_rate, success_rate)
 * - Sinifdə 5-lik və 4-lük alan şagirdlərin faizi
 * - Year weights: 2022-2023 (25%), 2023-2024 (30%), 2024-2025 (45%)
 * - Growth bonus: Əgər nəticə artırsa (>5%), bonus bal (+10 max)
 */
class AcademicResultsCalculator
{
    public function calculate(TeacherProfile $teacher, int $academicYearId, RatingConfiguration $config): array
    {
        // Get all academic results for this teacher
        $results = $teacher->classAcademicResults()
            ->where('academic_year_id', $academicYearId)
            ->get();

        if ($results->isEmpty()) {
            return [
                'raw_score' => 0,
                'weighted_score' => 0,
                'details' => 'No academic results found',
            ];
        }

        // Calculate average quality rate and success rate
        $avgQualityRate = $results->avg('quality_rate') ?? 0;
        $avgSuccessRate = $results->avg('success_rate') ?? 0;

        // Raw score = average of quality and success rates (0-100)
        $rawScore = ($avgQualityRate + $avgSuccessRate) / 2;

        // Apply year weights if configured
        $yearWeights = $config->year_weights ?? [];
        $academicYear = \App\Models\AcademicYear::find($academicYearId);
        $yearWeight = $yearWeights[$academicYear?->name ?? '2024-2025'] ?? 1.0;

        // Calculate growth bonus
        $growthBonus = 0;
        if ($config->hasGrowthBonus()) {
            $growthBonus = $this->calculateGrowthBonus($teacher, $academicYearId, $rawScore, $config);
        }

        // Weighted score = (raw_score * year_weight + growth_bonus) * component_weight
        $weightedScore = ($rawScore * $yearWeight + $growthBonus) * $config->weight;

        return [
            'raw_score' => round($rawScore, 2),
            'year_weight' => $yearWeight,
            'growth_bonus' => round($growthBonus, 2),
            'weighted_score' => round($weightedScore, 2),
            'details' => [
                'avg_quality_rate' => round($avgQualityRate, 2),
                'avg_success_rate' => round($avgSuccessRate, 2),
                'total_classes' => $results->count(),
            ],
        ];
    }

    protected function calculateGrowthBonus(TeacherProfile $teacher, int $currentYearId, float $currentScore, RatingConfiguration $config): float
    {
        // Get previous year result
        $previousYear = \App\Models\AcademicYear::where('id', '<', $currentYearId)
            ->orderBy('id', 'desc')
            ->first();

        if (!$previousYear) {
            return 0;
        }

        $previousResults = $teacher->classAcademicResults()
            ->where('academic_year_id', $previousYear->id)
            ->get();

        if ($previousResults->isEmpty()) {
            return 0;
        }

        $previousQualityRate = $previousResults->avg('quality_rate') ?? 0;
        $previousSuccessRate = $previousResults->avg('success_rate') ?? 0;
        $previousScore = ($previousQualityRate + $previousSuccessRate) / 2;

        if ($previousScore == 0) {
            return 0;
        }

        // Calculate growth percentage
        $growthPercent = (($currentScore - $previousScore) / $previousScore) * 100;

        $rules = $config->growth_bonus_rules ?? [];
        $minGrowth = $rules['min_growth_percent'] ?? 5.0;
        $maxBonus = $rules['max_bonus_points'] ?? 10.0;

        if ($growthPercent >= $minGrowth) {
            // Linear bonus: 5% growth = 5 points, 10% growth = 10 points (max)
            return min($growthPercent, $maxBonus);
        }

        return 0;
    }
}
