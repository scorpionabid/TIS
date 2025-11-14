<?php

namespace App\Services\SurveyAnalytics\Domains\Demographic;

use App\Models\Survey;

/**
 * Demographic Analytics Service
 *
 * Handles demographic breakdowns and institution-level analytics.
 * Extracted from SurveyAnalyticsService (REFACTOR Phase 3).
 *
 * RESPONSIBILITIES:
 * - Role-based demographic analysis
 * - Institution-based response breakdown
 * - Institution type distribution
 * - Hierarchical demographic insights
 *
 * @package App\Services\SurveyAnalytics\Domains\Demographic
 */
class DemographicAnalyticsService
{
    /**
     * Get demographic statistics for a survey
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getDemographicStats() (lines 179-188)
     *
     * @param Survey $survey
     * @return array
     */
    public function getDemographicStats(Survey $survey): array
    {
        $responses = $survey->responses()->with(['respondent.role', 'respondent.institution'])->get();

        return [
            'by_role' => $responses->groupBy('respondent.role.name')->map->count()->toArray(),
            'by_institution' => $responses->groupBy('respondent.institution.name')->map->count()->toArray(),
            'by_institution_type' => $responses->groupBy('respondent.institution.type')->map->count()->toArray()
        ];
    }

    /**
     * Get comprehensive demographic breakdown
     *
     * Provides detailed demographic insights with percentages
     *
     * @param Survey $survey
     * @return array
     */
    public function getDemographicBreakdown(Survey $survey): array
    {
        $responses = $survey->responses()->with(['respondent.role', 'respondent.institution'])->get();
        $totalResponses = $responses->count();

        return [
            'total_responses' => $totalResponses,
            'role_distribution' => $this->getRoleDistribution($responses, $totalResponses),
            'institution_distribution' => $this->getInstitutionDistribution($responses, $totalResponses),
            'institution_type_distribution' => $this->getInstitutionTypeDistribution($responses, $totalResponses),
            'diversity_metrics' => $this->calculateDiversityMetrics($responses)
        ];
    }

    /**
     * Get role distribution with counts and percentages
     *
     * @param \Illuminate\Support\Collection $responses
     * @param int $total
     * @return array
     */
    protected function getRoleDistribution($responses, int $total): array
    {
        $byRole = $responses->groupBy('respondent.role.name');

        $distribution = [];
        foreach ($byRole as $role => $roleResponses) {
            $count = $roleResponses->count();
            $distribution[$role] = [
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 2) : 0
            ];
        }

        return $distribution;
    }

    /**
     * Get institution distribution with counts and percentages
     *
     * @param \Illuminate\Support\Collection $responses
     * @param int $total
     * @return array
     */
    protected function getInstitutionDistribution($responses, int $total): array
    {
        $byInstitution = $responses->groupBy('respondent.institution.name');

        $distribution = [];
        foreach ($byInstitution as $institution => $institutionResponses) {
            $count = $institutionResponses->count();
            $distribution[$institution] = [
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 2) : 0
            ];
        }

        // Sort by count descending
        uasort($distribution, function ($a, $b) {
            return $b['count'] <=> $a['count'];
        });

        return $distribution;
    }

    /**
     * Get institution type distribution with counts and percentages
     *
     * @param \Illuminate\Support\Collection $responses
     * @param int $total
     * @return array
     */
    protected function getInstitutionTypeDistribution($responses, int $total): array
    {
        $byType = $responses->groupBy('respondent.institution.type');

        $distribution = [];
        foreach ($byType as $type => $typeResponses) {
            $count = $typeResponses->count();
            $distribution[$type] = [
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 2) : 0
            ];
        }

        return $distribution;
    }

    /**
     * Calculate diversity metrics
     *
     * Measures how diverse the respondent pool is across dimensions
     *
     * @param \Illuminate\Support\Collection $responses
     * @return array
     */
    protected function calculateDiversityMetrics($responses): array
    {
        return [
            'unique_roles' => $responses->pluck('respondent.role.name')->unique()->count(),
            'unique_institutions' => $responses->pluck('respondent.institution.name')->unique()->count(),
            'unique_institution_types' => $responses->pluck('respondent.institution.type')->unique()->count(),
            'role_diversity_index' => $this->calculateDiversityIndex(
                $responses->groupBy('respondent.role.name')->map->count()
            ),
            'institution_diversity_index' => $this->calculateDiversityIndex(
                $responses->groupBy('respondent.institution.name')->map->count()
            )
        ];
    }

    /**
     * Calculate Shannon diversity index
     *
     * Measures heterogeneity in the distribution
     *
     * @param \Illuminate\Support\Collection $distribution
     * @return float
     */
    protected function calculateDiversityIndex($distribution): float
    {
        $total = $distribution->sum();
        if ($total == 0) return 0;

        $index = 0;
        foreach ($distribution as $count) {
            $proportion = $count / $total;
            if ($proportion > 0) {
                $index -= $proportion * log($proportion);
            }
        }

        return round($index, 3);
    }
}
