<?php

namespace App\Services\TeacherRating;

use App\Models\TeacherProfile;
use App\Models\RatingConfiguration;

/**
 * LessonObservationCalculator - Component 2 (20% weight)
 *
 * Hesablama məntiqi (PRD əsasında):
 * - Dərs müşahidələri (lesson observations)
 * - Criteriyalar: didaktik, metodoloji, pedaqoji, texniki
 * - Hər müşahidə 0-100 bal
 * - İl ərzindəki bütün müşahidələrin ortalaması
 */
class LessonObservationCalculator
{
    public function calculate(TeacherProfile $teacher, int $academicYearId, RatingConfiguration $config): array
    {
        // Get all lesson observations for this teacher in academic year
        $observations = $teacher->lessonObservations()
            ->where('academic_year_id', $academicYearId)
            ->get();

        if ($observations->isEmpty()) {
            return [
                'raw_score' => 0,
                'weighted_score' => 0,
                'details' => 'No lesson observations found',
            ];
        }

        // Calculate average score across all observations
        $avgScore = $observations->avg('score') ?? 0;

        // Apply component weight
        $weightedScore = $avgScore * $config->weight;

        // Breakdown by criteria (if available)
        $criteriaBreakdown = [];
        $criteriaFields = ['didactic_score', 'methodological_score', 'pedagogical_score', 'technical_score'];

        foreach ($criteriaFields as $field) {
            $avg = $observations->avg($field);
            if ($avg !== null) {
                $criteriaName = str_replace('_score', '', $field);
                $criteriaBreakdown[$criteriaName] = round($avg, 2);
            }
        }

        return [
            'raw_score' => round($avgScore, 2),
            'weighted_score' => round($weightedScore, 2),
            'details' => [
                'total_observations' => $observations->count(),
                'avg_score' => round($avgScore, 2),
                'criteria_breakdown' => $criteriaBreakdown,
                'min_score' => round($observations->min('score'), 2),
                'max_score' => round($observations->max('score'), 2),
            ],
        ];
    }
}
