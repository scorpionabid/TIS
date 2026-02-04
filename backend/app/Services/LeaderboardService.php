<?php

namespace App\Services;

use App\Models\Rating;
use App\Models\User;
use App\Models\Institution;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Builder;

/**
 * PRD: Liderbordlar, filtrlər və dashboard
 *
 * Liderbordlar:
 * - Məktəb üzrə Top 20
 * - Rayon üzrə Top 20
 * - Region üzrə Top 20
 * - Fənn üzrə Top 20 (region/rayon/məktəb filter kontekstində)
 */
class LeaderboardService
{
    /**
     * PRD: Top 20 liderbord sorğusu (filtrli): hədəf ≤ 2 saniyə (cache ilə)
     */
    private const LEADERBOARD_LIMIT = 20;

    /**
     * Get top 20 teachers by scope.
     *
     * @param array $params [
     *   'academic_year_id' => int,
     *   'scope' => 'school'|'rayon'|'region'|'subject',
     *   'scope_id' => int|null,
     *   'subject_id' => int|null (for subject scope)
     * ]
     */
    public function getLeaderboard(array $params): Collection
    {
        $query = Rating::with(['user', 'institution', 'academicYear'])
            ->where('status', 'published')
            ->where('academic_year_id', $params['academic_year_id']);

        // Apply scope filter
        $this->applyScopeFilter($query, $params);

        // Get top 20 ordered by overall_score
        $ratings = $query->orderBy('overall_score', 'desc')
            ->limit(self::LEADERBOARD_LIMIT)
            ->get();

        // Add rank to each entry
        return $ratings->map(function ($rating, $index) {
            $rating->rank = $index + 1;
            return $rating;
        });
    }

    /**
     * Apply scope-based filtering to the query.
     */
    private function applyScopeFilter(Builder $query, array $params): void
    {
        $scope = $params['scope'] ?? null;
        $scopeId = $params['scope_id'] ?? null;

        switch ($scope) {
            case 'school':
                // PRD: Məktəb üzrə Top 20
                if ($scopeId) {
                    $query->where('institution_id', $scopeId);
                }
                break;

            case 'rayon':
                // PRD: Rayon üzrə Top 20
                if ($scopeId) {
                    $query->whereHas('institution', function ($q) use ($scopeId) {
                        // Get institutions that belong to this rayon (region)
                        $q->where('region_id', $scopeId);
                    });
                }
                break;

            case 'region':
                // PRD: Region üzrə Top 20
                if ($scopeId) {
                    // Get all rayons (child regions) under this region
                    $childRegionIds = Institution::where('parent_id', $scopeId)
                        ->pluck('id')
                        ->toArray();

                    $query->whereHas('institution', function ($q) use ($scopeId, $childRegionIds) {
                        $q->whereIn('region_id', array_merge([$scopeId], $childRegionIds));
                    });
                }
                break;

            case 'subject':
                // PRD: Fənn üzrə Top 20 (region/rayon/məktəb filter kontekstində)
                $subjectId = $params['subject_id'] ?? $scopeId;

                if ($subjectId) {
                    $query->whereHas('user', function ($q) use ($subjectId) {
                        // Check if user has this subject as primary
                        $q->whereHas('profile', function ($pq) use ($subjectId) {
                            $pq->where('primary_subject_id', $subjectId);
                        });
                    });
                }

                // Apply additional location filter if provided
                if (isset($params['institution_id'])) {
                    $query->where('institution_id', $params['institution_id']);
                } elseif (isset($params['region_id'])) {
                    $query->whereHas('institution', function ($q) use ($params) {
                        $q->where('region_id', $params['region_id']);
                    });
                }
                break;
        }
    }

    /**
     * PRD: Rayonlararası müqayisə dashboard (basic)
     *
     * - Rayon üzrə orta TotalScore və komponentlər üzrə orta skorlar
     * - Rayon üzrə Top 20 siyahısı (drill-down)
     * - Fənn üzrə müqayisə (orta skorlar)
     */
    public function getStatistics(int $academicYearId, ?int $institutionId = null): array
    {
        $query = Rating::where('academic_year_id', $academicYearId)
            ->where('status', 'published');

        if ($institutionId) {
            $query->where('institution_id', $institutionId);
        }

        $ratings = $query->get();

        if ($ratings->isEmpty()) {
            return $this->getEmptyStatistics();
        }

        return [
            'total_teachers' => $ratings->count(),
            'average_score' => round($ratings->avg('overall_score'), 2),
            'highest_score' => round($ratings->max('overall_score'), 2),
            'lowest_score' => round($ratings->min('overall_score'), 2),
            'median_score' => $this->calculateMedian($ratings->pluck('overall_score')),
            'score_distribution' => $this->getScoreDistribution($ratings),
            'component_averages' => [
                'academic' => round($ratings->avg('academic_score') ?? 0, 2),
                'observation' => round($ratings->avg('observation_score') ?? 0, 2),
                'assessment' => round($ratings->avg('assessment_score') ?? 0, 2),
                'certificate' => round($ratings->avg('certificate_score') ?? 0, 2),
                'olympiad' => round($ratings->avg('olympiad_score') ?? 0, 2),
                'award' => round($ratings->avg('award_score') ?? 0, 2),
            ],
            'growth_bonus_stats' => [
                'average' => round($ratings->avg('growth_bonus') ?? 0, 2),
                'teachers_with_bonus' => $ratings->where('growth_bonus', '>', 0)->count(),
                'max_bonus' => round($ratings->max('growth_bonus') ?? 0, 2),
            ],
        ];
    }

    /**
     * Get district (rayon) comparison statistics.
     */
    public function getDistrictComparison(int $academicYearId, int $regionId): array
    {
        // Get all districts (rayons) under this region
        $districts = Institution::where('parent_id', $regionId)
            ->where('type', 'region') // or appropriate type
            ->get();

        $comparison = [];

        foreach ($districts as $district) {
            $stats = $this->getStatistics($academicYearId, $district->id);
            $comparison[] = [
                'district_id' => $district->id,
                'district_name' => $district->name,
                'statistics' => $stats,
            ];
        }

        // Sort by average score descending
        usort($comparison, function ($a, $b) {
            return $b['statistics']['average_score'] <=> $a['statistics']['average_score'];
        });

        return $comparison;
    }

    /**
     * Get subject-wise comparison.
     */
    public function getSubjectComparison(int $academicYearId, ?int $institutionId = null): array
    {
        $query = Rating::with(['user.profile.subject'])
            ->where('academic_year_id', $academicYearId)
            ->where('status', 'published');

        if ($institutionId) {
            $query->where('institution_id', $institutionId);
        }

        $ratings = $query->get();

        // Group by subject
        $bySubject = $ratings->groupBy(function ($rating) {
            return $rating->user?->profile?->subject?->name ?? 'Digər';
        });

        $comparison = [];

        foreach ($bySubject as $subjectName => $subjectRatings) {
            $comparison[] = [
                'subject_name' => $subjectName,
                'teacher_count' => $subjectRatings->count(),
                'average_score' => round($subjectRatings->avg('overall_score'), 2),
                'highest_score' => round($subjectRatings->max('overall_score'), 2),
                'lowest_score' => round($subjectRatings->min('overall_score'), 2),
            ];
        }

        // Sort by average score descending
        usort($comparison, function ($a, $b) {
            return $b['average_score'] <=> $a['average_score'];
        });

        return $comparison;
    }

    /**
     * Calculate median value.
     */
    private function calculateMedian(Collection $values): float
    {
        $sorted = $values->filter()->sort()->values();
        $count = $sorted->count();

        if ($count === 0) {
            return 0;
        }

        $middle = (int) floor($count / 2);

        if ($count % 2 === 0) {
            return round(($sorted[$middle - 1] + $sorted[$middle]) / 2, 2);
        }

        return round($sorted[$middle], 2);
    }

    /**
     * Get score distribution.
     */
    private function getScoreDistribution(Collection $ratings): array
    {
        return [
            '0-20' => $ratings->filter(fn($r) => $r->overall_score >= 0 && $r->overall_score < 21)->count(),
            '21-40' => $ratings->filter(fn($r) => $r->overall_score >= 21 && $r->overall_score < 41)->count(),
            '41-60' => $ratings->filter(fn($r) => $r->overall_score >= 41 && $r->overall_score < 61)->count(),
            '61-80' => $ratings->filter(fn($r) => $r->overall_score >= 61 && $r->overall_score < 81)->count(),
            '81-100' => $ratings->filter(fn($r) => $r->overall_score >= 81)->count(),
        ];
    }

    /**
     * Get empty statistics structure.
     */
    private function getEmptyStatistics(): array
    {
        return [
            'total_teachers' => 0,
            'average_score' => 0,
            'highest_score' => 0,
            'lowest_score' => 0,
            'median_score' => 0,
            'score_distribution' => [
                '0-20' => 0,
                '21-40' => 0,
                '41-60' => 0,
                '61-80' => 0,
                '81-100' => 0,
            ],
            'component_averages' => [
                'academic' => 0,
                'observation' => 0,
                'assessment' => 0,
                'certificate' => 0,
                'olympiad' => 0,
                'award' => 0,
            ],
            'growth_bonus_stats' => [
                'average' => 0,
                'teachers_with_bonus' => 0,
                'max_bonus' => 0,
            ],
        ];
    }
}
