<?php

namespace App\Services\TeacherRating;

use App\Models\TeacherProfile;
use App\Models\RatingConfiguration;

/**
 * AssessmentCalculator - Component 4 (15% weight)
 *
 * Hesablama məntiqi (PRD əsasında):
 * - Peşəkar qiymətləndirmə testləri
 * - Fənn bilikləri testi (subject knowledge test)
 * - Pedaqoji biliklər testi (pedagogical knowledge test)
 * - Texnologiya inteqrasiyası testi (technology integration test)
 * - Hər test 0-100 bal
 */
class AssessmentCalculator
{
    public function calculate(TeacherProfile $teacher, int $academicYearId, RatingConfiguration $config): array
    {
        // Get all assessment scores for this teacher
        $assessments = $teacher->assessmentScores()
            ->where('academic_year_id', $academicYearId)
            ->get();

        if ($assessments->isEmpty()) {
            return [
                'raw_score' => 0,
                'weighted_score' => 0,
                'details' => 'No assessment scores found',
            ];
        }

        // Calculate average score
        $avgScore = $assessments->avg('score') ?? 0;

        // Apply component weight
        $weightedScore = $avgScore * $config->weight;

        // Breakdown by assessment type
        $typeBreakdown = [];
        $assessmentTypes = ['subject_knowledge', 'pedagogical_knowledge', 'technology_integration', 'classroom_management'];

        foreach ($assessmentTypes as $type) {
            $typeAssessments = $assessments->where('assessment_type', $type);
            if ($typeAssessments->isNotEmpty()) {
                $typeBreakdown[$type] = [
                    'avg_score' => round($typeAssessments->avg('score'), 2),
                    'count' => $typeAssessments->count(),
                    'latest_score' => round($typeAssessments->sortByDesc('assessment_date')->first()->score ?? 0, 2),
                ];
            }
        }

        return [
            'raw_score' => round($avgScore, 2),
            'weighted_score' => round($weightedScore, 2),
            'details' => [
                'total_assessments' => $assessments->count(),
                'avg_score' => round($avgScore, 2),
                'type_breakdown' => $typeBreakdown,
                'min_score' => round($assessments->min('score'), 2),
                'max_score' => round($assessments->max('score'), 2),
                'latest_assessment_date' => $assessments->max('assessment_date'),
            ],
        ];
    }
}
