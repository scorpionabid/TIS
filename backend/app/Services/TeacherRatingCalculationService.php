<?php

namespace App\Services;

use App\Models\Rating;
use App\Models\RatingConfig;
use App\Models\User;
use App\Models\AcademicYear;
use App\Models\ClassAcademicResult;
use App\Models\LessonObservation;
use App\Models\TeacherAssessmentScore;
use App\Models\TeacherCertification;
use App\Models\OlympiadAchievement;
use App\Models\TeacherAward;
use App\Models\OlympiadLevelConfig;
use App\Models\GrowthBonusConfig;
use App\Models\CertificateType;
use App\Models\AwardType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PRD: Reytinq Engine (hesablama qaydaları)
 *
 * Reytinq performans göstəricilərinə əsaslanır və əlavə olaraq inkişaf (growth) bonusu
 * tətbiq edilə bilər. Missing data qaydası sərtdir: məlumat yoxdursa 0 sayılır.
 */
class TeacherRatingCalculationService
{
    /**
     * PRD: İllər üzrə artan çəki qaydası
     * 2022-2023: 25%, 2023-2024: 30%, 2024-2025: 45%
     */
    private const DEFAULT_YEAR_WEIGHTS = [
        '2022-2023' => 0.25,
        '2023-2024' => 0.30,
        '2024-2025' => 0.45,
    ];

    /**
     * PRD: Calculate comprehensive rating for a teacher
     *
     * Formula: TotalScore = Σ (Wi * ComponentScorei) + GrowthBonus
     */
    public function calculateTeacherRating(int $teacherId, int $targetAcademicYearId): Rating
    {
        $teacher = User::findOrFail($teacherId);
        $institutionId = $teacher->institution_id;

        $config = $this->getRatingConfig($institutionId, $targetAcademicYearId);
        $yearWeights = $config->getYearWeightsWithDefaults();

        // Get all relevant academic years
        $academicYears = $this->getRelevantAcademicYears(array_keys($yearWeights));

        $yearlyScores = [];
        $componentTotals = [
            'academic' => 0,
            'observation' => 0,
            'assessment' => 0,
            'certificate' => 0,
            'olympiad' => 0,
            'award' => 0,
        ];

        foreach ($academicYears as $yearName => $yearId) {
            $yearWeight = $yearWeights[$yearName] ?? 0;

            if ($yearWeight === 0 || !$yearId) {
                continue;
            }

            // Calculate each component score for this year
            $scores = [
                'academic' => $this->calculateAcademicScore($teacherId, $yearId),
                'observation' => $this->calculateObservationScore($teacherId, $yearId),
                'assessment' => $this->calculateAssessmentScore($teacherId, $yearId),
                'certificate' => $this->calculateCertificateScore($teacherId, $yearId),
                'olympiad' => $this->calculateOlympiadScore($teacherId, $yearId),
                'award' => $this->calculateAwardScore($teacherId, $yearId),
            ];

            $yearlyScores[$yearName] = $scores;

            // Accumulate weighted scores for each component
            foreach ($scores as $component => $score) {
                $componentTotals[$component] += $score * $yearWeight;
            }
        }

        // Calculate weighted component score using config weights
        $overallScore =
            ($componentTotals['academic'] * $config->academic_weight) +
            ($componentTotals['observation'] * $config->observation_weight) +
            ($componentTotals['assessment'] * $config->assessment_weight) +
            ($componentTotals['certificate'] * $config->certificate_weight) +
            ($componentTotals['olympiad'] * $config->olympiad_weight) +
            ($componentTotals['award'] * $config->award_weight);

        // PRD: Calculate growth bonus
        $growthBonus = $this->calculateGrowthBonus($teacherId, $yearlyScores);

        // PRD: Apply max bonus cap (+5)
        $growthBonus = min($growthBonus, GrowthBonusConfig::MAX_BONUS);

        $finalScore = min($overallScore + $growthBonus, 100); // Cap at 100

        // Create or update rating
        return Rating::updateOrCreate(
            [
                'user_id' => $teacherId,
                'institution_id' => $institutionId,
                'academic_year_id' => $targetAcademicYearId,
                'period' => 'annual',
            ],
            [
                'overall_score' => round($finalScore, 2),
                'academic_score' => round($componentTotals['academic'], 2),
                'observation_score' => round($componentTotals['observation'], 2),
                'assessment_score' => round($componentTotals['assessment'], 2),
                'certificate_score' => round($componentTotals['certificate'], 2),
                'olympiad_score' => round($componentTotals['olympiad'], 2),
                'award_score' => round($componentTotals['award'], 2),
                'growth_bonus' => round($growthBonus, 2),
                'status' => 'published',
                'yearly_breakdown' => $yearlyScores,
                'metadata' => [
                    'calculation_method' => 'prd_v1',
                    'calculated_at' => now()->toISOString(),
                    'component_weights' => [
                        'academic' => $config->academic_weight,
                        'observation' => $config->observation_weight,
                        'assessment' => $config->assessment_weight,
                        'certificate' => $config->certificate_weight,
                        'olympiad' => $config->olympiad_weight,
                        'award' => $config->award_weight,
                    ],
                    'year_weights' => $yearWeights,
                ],
            ]
        );
    }

    /**
     * PRD: Akademik göstərici (ClassResults)
     *
     * Hər tədris ilində müəllimin birdən çox sinfi ola bilər.
     * Həmin il üçün müəllim göstəricisi bütün siniflərin avg_score_0_100
     * dəyərlərinin adi ortalamasıdır.
     */
    private function calculateAcademicScore(int $teacherId, int $academicYearId): float
    {
        $results = ClassAcademicResult::where('teacher_id', $teacherId)
            ->where('academic_year_id', $academicYearId)
            ->get();

        if ($results->isEmpty()) {
            return 0; // PRD: Missing data = 0
        }

        return round($results->avg('avg_score_0_100') ?? 0, 2);
    }

    /**
     * PRD: Dərs dinləmə (LessonObservations)
     *
     * Hər il üçün həmin ilin müşahidələrinin final_score_0_100
     * dəyərlərinin ortalaması götürülür.
     */
    private function calculateObservationScore(int $teacherId, int $academicYearId): float
    {
        $observations = LessonObservation::where('teacher_id', $teacherId)
            ->where('academic_year_id', $academicYearId)
            ->get();

        if ($observations->isEmpty()) {
            return 0; // PRD: Missing data = 0
        }

        return round($observations->avg('final_score_0_100') ?? 0, 2);
    }

    /**
     * PRD: Qiymətləndirmə (Assessments)
     *
     * Sertifikasiya/MİQ/diaqnostik üçün qayda: ən son nəticə götürülür.
     * Mümkündürsə 0-100-ə normallaşdırılır.
     */
    private function calculateAssessmentScore(int $teacherId, int $academicYearId): float
    {
        $assessments = TeacherAssessmentScore::where('teacher_id', $teacherId)
            ->where('academic_year_id', $academicYearId)
            ->get();

        if ($assessments->isEmpty()) {
            return 0; // PRD: Missing data = 0
        }

        // Calculate average percentage across all assessment types
        $totalPercentage = 0;
        $count = 0;

        foreach ($assessments as $assessment) {
            if ($assessment->max_score > 0) {
                $totalPercentage += ($assessment->score / $assessment->max_score) * 100;
                $count++;
            }
        }

        return $count > 0 ? round($totalPercentage / $count, 2) : 0;
    }

    /**
     * PRD: Sertifikatlar (Certificates)
     *
     * Sertifikat növünə görə bal cədvəli Region Admin tərəfindən konfiqurasiya olunur.
     * Sertifikatların cəmi 0-100-ə normallaşdırılır.
     */
    private function calculateCertificateScore(int $teacherId, int $academicYearId): float
    {
        $academicYear = AcademicYear::find($academicYearId);
        if (!$academicYear) {
            return 0;
        }

        // Get year end date from academic year name (e.g., "2024-2025" -> 2025)
        $yearEnd = (int) substr($academicYear->name, -4);

        $certifications = TeacherCertification::where('teacher_id', $teacherId)
            ->whereYear('issue_date', '<=', $yearEnd)
            ->where('status', 'active')
            ->get();

        if ($certifications->isEmpty()) {
            return 0; // PRD: Missing data = 0
        }

        $totalScore = 0;
        $maxPossibleScore = 100; // Normalization base

        foreach ($certifications as $cert) {
            // Get score weight from certificate_types table
            $weight = CertificateType::where('name', $cert->certification_type)
                ->where('is_active', true)
                ->value('score_weight') ?? 1;

            $totalScore += $weight;
        }

        // Normalize to 0-100 scale
        return min(round($totalScore, 2), $maxPossibleScore);
    }

    /**
     * PRD: Olimpiada (Olympiads)
     *
     * Hər il üçün olimpiada qeydləri üzrə bal: (placement x level x student_count)
     * kimi konfiqurasiya olunan qayda ilə hesablanır, 0-100 aralığına normallaşdırılır.
     */
    private function calculateOlympiadScore(int $teacherId, int $academicYearId): float
    {
        $achievements = OlympiadAchievement::where('teacher_id', $teacherId)
            ->where('academic_year_id', $academicYearId)
            ->get();

        if ($achievements->isEmpty()) {
            return 0; // PRD: Missing data = 0
        }

        $totalScore = 0;

        foreach ($achievements as $achievement) {
            $totalScore += OlympiadLevelConfig::calculateScore(
                $achievement->olympiad_level,
                (int) $achievement->placement,
                $achievement->student_count
            );
        }

        // Normalize to 0-100 scale
        return min(round($totalScore, 2), 100);
    }

    /**
     * PRD: Təltiflər (Awards)
     *
     * Təltif növləri və balları Region Admin tərəfindən konfiqurasiya olunur.
     * Təltiflər 0-100-ə normallaşdırılır.
     */
    private function calculateAwardScore(int $teacherId, int $academicYearId): float
    {
        $academicYear = AcademicYear::find($academicYearId);
        if (!$academicYear) {
            return 0;
        }

        $yearEnd = (int) substr($academicYear->name, -4);

        $awards = TeacherAward::where('teacher_id', $teacherId)
            ->whereYear('award_date', '<=', $yearEnd)
            ->get();

        if ($awards->isEmpty()) {
            return 0; // PRD: Missing data = 0
        }

        $totalScore = 0;

        foreach ($awards as $award) {
            // Get score weight from award_types table
            $weight = AwardType::where('name', $award->award_type)
                ->where('is_active', true)
                ->value('score_weight') ?? 1;

            $totalScore += $weight;
        }

        // Normalize to 0-100 scale
        return min(round($totalScore, 2), 100);
    }

    /**
     * PRD: Growth bonus (performans + inkişaf)
     *
     * Growth bonus məqsədi - son illərdə yaxşılaşmanı təşviq etməkdir.
     * MVP üçün tövsiyə: 2024-2025 göstəricisi 2022-2023-dən 15+ bal yüksəkdirsə +2,
     * 25+ bal yüksəkdirsə +5 (cap +5).
     */
    private function calculateGrowthBonus(int $teacherId, array $yearlyScores): float
    {
        $yearKeys = array_keys($yearlyScores);

        if (count($yearKeys) < 2) {
            return 0;
        }

        // Get first and last years for comparison
        $firstYear = reset($yearKeys);
        $lastYear = end($yearKeys);

        if ($firstYear === $lastYear) {
            return 0;
        }

        // Calculate total score for first year
        $firstYearTotal = array_sum($yearlyScores[$firstYear] ?? []);

        // Calculate total score for last year
        $lastYearTotal = array_sum($yearlyScores[$lastYear] ?? []);

        // Calculate growth
        $growth = $lastYearTotal - $firstYearTotal;

        // Apply bonus based on growth
        return GrowthBonusConfig::calculateBonus($growth);
    }

    /**
     * Get or create rating config for institution and academic year.
     */
    private function getRatingConfig(int $institutionId, int $academicYearId): RatingConfig
    {
        return RatingConfig::firstOrCreate(
            [
                'institution_id' => $institutionId,
                'academic_year_id' => $academicYearId,
            ],
            [
                'task_weight' => 0.40,
                'survey_weight' => 0.60,
                'manual_weight' => 0.00,
                // PRD defaults
                'academic_weight' => 0.25,
                'observation_weight' => 0.20,
                'assessment_weight' => 0.20,
                'certificate_weight' => 0.15,
                'olympiad_weight' => 0.10,
                'award_weight' => 0.10,
                'year_weights' => self::DEFAULT_YEAR_WEIGHTS,
                'calculation_method' => 'automatic',
            ]
        );
    }

    /**
     * Get academic year IDs for the given year names.
     */
    private function getRelevantAcademicYears(array $yearNames): array
    {
        return AcademicYear::whereIn('name', $yearNames)
            ->pluck('id', 'name')
            ->toArray();
    }

    /**
     * Calculate ratings for all teachers in an institution.
     */
    public function calculateAllRatings(int $academicYearId, ?int $institutionId = null): array
    {
        $query = User::query()
            ->whereHas('roles', function ($q) {
                $q->where('name', 'like', '%teacher%')
                    ->orWhere('name', 'like', '%müəllim%');
            });

        if ($institutionId) {
            $query->where('institution_id', $institutionId);
        }

        $teachers = $query->get();

        $results = [
            'total' => $teachers->count(),
            'success' => 0,
            'errors' => [],
        ];

        foreach ($teachers as $teacher) {
            try {
                $this->calculateTeacherRating($teacher->id, $academicYearId);
                $results['success']++;
            } catch (\Exception $e) {
                $results['errors'][] = [
                    'teacher_id' => $teacher->id,
                    'teacher_name' => $teacher->name ?? $teacher->full_name,
                    'error' => $e->getMessage(),
                ];
                Log::error("Rating calculation failed for teacher {$teacher->id}: " . $e->getMessage());
            }
        }

        return $results;
    }
}
