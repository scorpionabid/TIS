<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentAnalytics extends Model
{
    use HasFactory;

    protected $fillable = [
        'institution_id',
        'assessment_type_id',
        'analysis_date',
        'scope',
        'scope_value',
        'total_assessments',
        'total_students',
        'average_score',
        'median_score',
        'highest_score',
        'lowest_score',
        'standard_deviation',
        'score_distribution',
        'performance_grades',
        'trend_data',
        'benchmark_comparison',
    ];

    protected $casts = [
        'analysis_date' => 'date',
        'average_score' => 'decimal:2',
        'median_score' => 'decimal:2',
        'highest_score' => 'decimal:2',
        'lowest_score' => 'decimal:2',
        'standard_deviation' => 'decimal:2',
        'score_distribution' => 'array',
        'performance_grades' => 'array',
        'trend_data' => 'array',
        'benchmark_comparison' => 'array',
    ];

    /**
     * Get the institution this analytics belongs to.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the assessment type this analytics belongs to.
     */
    public function assessmentType(): BelongsTo
    {
        return $this->belongsTo(AssessmentType::class);
    }

    /**
     * Get analytics for a specific institution and date range.
     */
    public static function getForInstitution(int $institutionId, ?string $startDate = null, ?string $endDate = null): \Illuminate\Database\Eloquent\Collection
    {
        $query = self::where('institution_id', $institutionId);

        if ($startDate) {
            $query->where('analysis_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->where('analysis_date', '<=', $endDate);
        }

        return $query->orderBy('analysis_date', 'desc')->get();
    }

    /**
     * Get analytics for a specific assessment type.
     */
    public static function getForAssessmentType(int $assessmentTypeId, ?string $startDate = null, ?string $endDate = null): \Illuminate\Database\Eloquent\Collection
    {
        $query = self::where('assessment_type_id', $assessmentTypeId);

        if ($startDate) {
            $query->where('analysis_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->where('analysis_date', '<=', $endDate);
        }

        return $query->orderBy('analysis_date', 'desc')->get();
    }

    /**
     * Get regional analytics by scope.
     */
    public static function getByScope(string $scope, ?string $scopeValue = null, ?string $startDate = null, ?string $endDate = null): \Illuminate\Database\Eloquent\Collection
    {
        $query = self::where('scope', $scope);

        if ($scopeValue) {
            $query->where('scope_value', $scopeValue);
        }

        if ($startDate) {
            $query->where('analysis_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->where('analysis_date', '<=', $endDate);
        }

        return $query->orderBy('analysis_date', 'desc')->get();
    }

    /**
     * Calculate performance grade based on average score.
     */
    public function getPerformanceGrade(): string
    {
        if ($this->average_score >= 90) {
            return 'excellent';
        }
        if ($this->average_score >= 80) {
            return 'good';
        }
        if ($this->average_score >= 70) {
            return 'average';
        }

        return 'poor';
    }

    /**
     * Get performance grade with localized label.
     */
    public function getPerformanceGradeWithLabel(): array
    {
        $grade = $this->getPerformanceGrade();

        $labels = [
            'excellent' => 'Əla',
            'good' => 'Yaxşı',
            'average' => 'Orta',
            'poor' => 'Zəif',
        ];

        return [
            'grade' => $grade,
            'label' => $labels[$grade] ?? 'Bilinməyən',
        ];
    }

    /**
     * Get score distribution with percentages.
     */
    public function getFormattedScoreDistribution(): array
    {
        $distribution = $this->score_distribution ?? [];
        $total = $this->total_students;

        if ($total === 0) {
            return [];
        }

        $formatted = [];
        foreach ($distribution as $range => $count) {
            $formatted[] = [
                'range' => $range,
                'count' => $count,
                'percentage' => round(($count / $total) * 100, 1),
            ];
        }

        return $formatted;
    }

    /**
     * Get performance grades with percentages.
     */
    public function getFormattedPerformanceGrades(): array
    {
        $grades = $this->performance_grades ?? [];
        $total = $this->total_students;

        if ($total === 0) {
            return [];
        }

        $labels = [
            'excellent' => 'Əla (90-100%)',
            'good' => 'Yaxşı (80-89%)',
            'average' => 'Orta (70-79%)',
            'poor' => 'Zəif (0-69%)',
        ];

        $formatted = [];
        foreach (['excellent', 'good', 'average', 'poor'] as $grade) {
            $count = $grades[$grade] ?? 0;
            $formatted[$grade] = [
                'count' => $count,
                'label' => $labels[$grade],
                'percentage' => round(($count / $total) * 100, 1),
            ];
        }

        return $formatted;
    }

    /**
     * Get trend direction based on trend data.
     */
    public function getTrendDirection(): string
    {
        $trendData = $this->trend_data ?? [];

        if (empty($trendData['previous_score'])) {
            return 'stable';
        }

        $current = $this->average_score;
        $previous = $trendData['previous_score'];

        if ($current > $previous + 2) {
            return 'up';
        }
        if ($current < $previous - 2) {
            return 'down';
        }

        return 'stable';
    }

    /**
     * Get trend percentage change.
     */
    public function getTrendPercentage(): ?float
    {
        $trendData = $this->trend_data ?? [];

        if (empty($trendData['previous_score'])) {
            return null;
        }

        $current = $this->average_score;
        $previous = $trendData['previous_score'];

        if ($previous == 0) {
            return null;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }
}
