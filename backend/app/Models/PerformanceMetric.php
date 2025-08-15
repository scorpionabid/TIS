<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerformanceMetric extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'evaluation_id',
        'teacher_id',
        'metric_type',
        'metric_name',
        'metric_value',
        'target_value',
        'unit_of_measure',
        'measurement_period',
        'data_source',
        'calculation_method',
        'weight',
        'score',
        'benchmark_comparison',
        'trend_analysis',
        'achievement_level',
        'notes',
        'supporting_evidence',
        'improvement_suggestions',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metric_value' => 'decimal:2',
            'target_value' => 'decimal:2',
            'weight' => 'decimal:2',
            'score' => 'decimal:2',
            'supporting_evidence' => 'array',
            'improvement_suggestions' => 'array',
            'benchmark_comparison' => 'array',
            'trend_analysis' => 'array',
            'metadata' => 'array',
        ];
    }

    /**
     * Relationships
     */
    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(TeacherEvaluation::class, 'evaluation_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Scopes
     */
    public function scopeByEvaluation($query, $evaluationId)
    {
        return $query->where('evaluation_id', $evaluationId);
    }

    public function scopeByTeacher($query, $teacherId)
    {
        return $query->where('teacher_id', $teacherId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('metric_type', $type);
    }

    public function scopeByAchievementLevel($query, $level)
    {
        return $query->where('achievement_level', $level);
    }

    public function scopeAboveTarget($query)
    {
        return $query->whereColumn('metric_value', '>=', 'target_value');
    }

    public function scopeBelowTarget($query)
    {
        return $query->whereColumn('metric_value', '<', 'target_value');
    }

    /**
     * Accessors & Mutators
     */
    public function getMetricTypeLabelAttribute(): string
    {
        return match($this->metric_type) {
            'student_performance' => 'Şagird Performansı',
            'attendance' => 'Davamiyyət',
            'lesson_quality' => 'Dərs Keyfiyyəti',
            'engagement' => 'Cəlbedicilik',
            'innovation' => 'İnnovasiya',
            'collaboration' => 'Əməkdaşlıq',
            'professional_development' => 'Peşəkar İnkişaf',
            'student_satisfaction' => 'Şagird Məmnuniyyəti',
            'parent_satisfaction' => 'Valideyn Məmnuniyyəti',
            'peer_evaluation' => 'Həmkarların Qiymətləndirməsi',
            'administrative_tasks' => 'İnzibati Vəzifələr',
            'extracurricular' => 'Kurikulum Xarici',
            default => 'Ümumi'
        ];
    }

    public function getAchievementLevelLabelAttribute(): string
    {
        return match($this->achievement_level) {
            'exceeds' => 'Hədəfi Üstələyir',
            'meets' => 'Hədəfə Çatır',
            'approaches' => 'Hədəfə Yaxınlaşır',
            'below' => 'Hədəfdən Aşağı',
            'significantly_below' => 'Hədəfdən Əhəmiyyətli Aşağı',
            default => 'Qiymətləndirilməyib'
        ];
    }

    public function getPerformanceIndicatorAttribute(): string
    {
        if (!$this->metric_value || !$this->target_value) {
            return 'Məlum deyil';
        }

        $percentage = ($this->metric_value / $this->target_value) * 100;

        if ($percentage >= 120) return 'Əla';
        if ($percentage >= 100) return 'Hədəfə çatıb';
        if ($percentage >= 90) return 'Yaxın';
        if ($percentage >= 80) return 'Orta';
        return 'Aşağı';
    }

    public function getProgressPercentageAttribute(): ?float
    {
        if (!$this->metric_value || !$this->target_value) {
            return null;
        }

        return round(($this->metric_value / $this->target_value) * 100, 2);
    }

    /**
     * Helper Methods
     */
    public function isAboveTarget(): bool
    {
        return $this->metric_value && $this->target_value && 
               $this->metric_value >= $this->target_value;
    }

    public function isBelowTarget(): bool
    {
        return $this->metric_value && $this->target_value && 
               $this->metric_value < $this->target_value;
    }

    public function calculateScore($maxScore = 100): float
    {
        if (!$this->metric_value || !$this->target_value) {
            return 0;
        }

        $percentage = ($this->metric_value / $this->target_value) * 100;
        return min($maxScore, $percentage);
    }

    public function updateAchievementLevel(): void
    {
        if (!$this->metric_value || !$this->target_value) {
            return;
        }

        $percentage = ($this->metric_value / $this->target_value) * 100;

        $level = match(true) {
            $percentage >= 120 => 'exceeds',
            $percentage >= 100 => 'meets',
            $percentage >= 80 => 'approaches',
            $percentage >= 60 => 'below',
            default => 'significantly_below'
        };

        $this->update(['achievement_level' => $level]);
    }

    public function addTrendData($period, $value): void
    {
        $trends = $this->trend_analysis ?? [];
        $trends[] = [
            'period' => $period,
            'value' => $value,
            'recorded_at' => now()->toISOString(),
        ];
        $this->update(['trend_analysis' => $trends]);
    }

    public function addBenchmarkData($benchmark_type, $value, $source = null): void
    {
        $benchmarks = $this->benchmark_comparison ?? [];
        $benchmarks[] = [
            'type' => $benchmark_type,
            'value' => $value,
            'source' => $source,
            'recorded_at' => now()->toISOString(),
        ];
        $this->update(['benchmark_comparison' => $benchmarks]);
    }

    public function addEvidence($evidence_type, $description, $attachment = null): void
    {
        $evidence = $this->supporting_evidence ?? [];
        $evidence[] = [
            'type' => $evidence_type,
            'description' => $description,
            'attachment' => $attachment,
            'added_at' => now()->toISOString(),
        ];
        $this->update(['supporting_evidence' => $evidence]);
    }

    public function addImprovementSuggestion($suggestion, $priority = 'medium'): void
    {
        $suggestions = $this->improvement_suggestions ?? [];
        $suggestions[] = [
            'suggestion' => $suggestion,
            'priority' => $priority,
            'added_at' => now()->toISOString(),
        ];
        $this->update(['improvement_suggestions' => $suggestions]);
    }

    public function getTrendDirection(): string
    {
        $trends = $this->trend_analysis ?? [];
        
        if (count($trends) < 2) {
            return 'insufficient_data';
        }

        $latest = end($trends);
        $previous = $trends[count($trends) - 2];

        if ($latest['value'] > $previous['value']) {
            return 'improving';
        } elseif ($latest['value'] < $previous['value']) {
            return 'declining';
        } else {
            return 'stable';
        }
    }

    public function getMetricSummary(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->metric_name,
            'type' => $this->metric_type,
            'type_label' => $this->metric_type_label,
            'current_value' => $this->metric_value,
            'target_value' => $this->target_value,
            'unit' => $this->unit_of_measure,
            'progress_percentage' => $this->progress_percentage,
            'achievement_level' => $this->achievement_level,
            'achievement_label' => $this->achievement_level_label,
            'performance_indicator' => $this->performance_indicator,
            'score' => $this->score,
            'weight' => $this->weight,
            'trend_direction' => $this->getTrendDirection(),
            'above_target' => $this->isAboveTarget(),
            'notes' => $this->notes,
            'evidence_count' => count($this->supporting_evidence ?? []),
            'suggestion_count' => count($this->improvement_suggestions ?? []),
        ];
    }

    public static function createStudentPerformanceMetric($evaluationId, $teacherId, $averageScore, $targetScore = 80): self
    {
        return self::create([
            'evaluation_id' => $evaluationId,
            'teacher_id' => $teacherId,
            'metric_type' => 'student_performance',
            'metric_name' => 'Ortalama Şagird Nəticəsi',
            'metric_value' => $averageScore,
            'target_value' => $targetScore,
            'unit_of_measure' => 'bal',
            'data_source' => 'student_grades',
            'weight' => 30,
        ]);
    }

    public static function createAttendanceMetric($evaluationId, $teacherId, $attendanceRate, $targetRate = 95): self
    {
        return self::create([
            'evaluation_id' => $evaluationId,
            'teacher_id' => $teacherId,
            'metric_type' => 'attendance',
            'metric_name' => 'Davamiyyət Faizi',
            'metric_value' => $attendanceRate,
            'target_value' => $targetRate,
            'unit_of_measure' => 'faiz',
            'data_source' => 'attendance_records',
            'weight' => 15,
        ]);
    }

    public static function createLessonQualityMetric($evaluationId, $teacherId, $qualityScore, $targetScore = 85): self
    {
        return self::create([
            'evaluation_id' => $evaluationId,
            'teacher_id' => $teacherId,
            'metric_type' => 'lesson_quality',
            'metric_name' => 'Dərs Keyfiyyəti Qiymətləndirməsi',
            'metric_value' => $qualityScore,
            'target_value' => $targetScore,
            'unit_of_measure' => 'bal',
            'data_source' => 'classroom_observations',
            'weight' => 25,
        ]);
    }

    public static function createEngagementMetric($evaluationId, $teacherId, $engagementScore, $targetScore = 80): self
    {
        return self::create([
            'evaluation_id' => $evaluationId,
            'teacher_id' => $teacherId,
            'metric_type' => 'engagement',
            'metric_name' => 'Şagird Cəlbediciliyi',
            'metric_value' => $engagementScore,
            'target_value' => $targetScore,
            'unit_of_measure' => 'bal',
            'data_source' => 'student_feedback',
            'weight' => 20,
        ]);
    }
}