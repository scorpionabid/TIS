<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeacherEvaluation extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'teacher_id',
        'evaluator_id',
        'institution_id',
        'evaluation_period',
        'academic_year',
        'evaluation_type',
        'evaluation_date',
        'overall_score',
        'overall_rating',
        'status',
        'teaching_effectiveness_score',
        'classroom_management_score',
        'subject_knowledge_score',
        'student_engagement_score',
        'professional_development_score',
        'collaboration_score',
        'innovation_score',
        'punctuality_score',
        'communication_score',
        'leadership_score',
        'strengths',
        'areas_for_improvement',
        'goals_set',
        'goals_achieved',
        'recommendations',
        'action_plan',
        'follow_up_date',
        'evaluator_comments',
        'teacher_self_assessment',
        'student_feedback_summary',
        'parent_feedback_summary',
        'peer_feedback_summary',
        'classroom_observation_notes',
        'lesson_plan_review',
        'student_performance_analysis',
        'attendance_record',
        'professional_activities',
        'certification_status',
        'improvement_plan_required',
        'support_provided',
        'next_evaluation_date',
        'approved_by',
        'approved_at',
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
            'evaluation_date' => 'date',
            'follow_up_date' => 'date',
            'next_evaluation_date' => 'date',
            'approved_at' => 'datetime',
            'overall_score' => 'decimal:2',
            'teaching_effectiveness_score' => 'decimal:2',
            'classroom_management_score' => 'decimal:2',
            'subject_knowledge_score' => 'decimal:2',
            'student_engagement_score' => 'decimal:2',
            'professional_development_score' => 'decimal:2',
            'collaboration_score' => 'decimal:2',
            'innovation_score' => 'decimal:2',
            'punctuality_score' => 'decimal:2',
            'communication_score' => 'decimal:2',
            'leadership_score' => 'decimal:2',
            'improvement_plan_required' => 'boolean',
            'strengths' => 'array',
            'areas_for_improvement' => 'array',
            'goals_set' => 'array',
            'goals_achieved' => 'array',
            'recommendations' => 'array',
            'action_plan' => 'array',
            'professional_activities' => 'array',
            'support_provided' => 'array',
            'metadata' => 'array',
        ];
    }

    /**
     * Relationships
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function metrics(): HasMany
    {
        return $this->hasMany(PerformanceMetric::class, 'evaluation_id');
    }

    /**
     * Scopes
     */
    public function scopeByTeacher($query, $teacherId)
    {
        return $query->where('teacher_id', $teacherId);
    }

    public function scopeByEvaluator($query, $evaluatorId)
    {
        return $query->where('evaluator_id', $evaluatorId);
    }

    public function scopeByInstitution($query, $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    public function scopeByAcademicYear($query, $academicYear)
    {
        return $query->where('academic_year', $academicYear);
    }

    public function scopeByPeriod($query, $period)
    {
        return $query->where('evaluation_period', $period);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('evaluation_type', $type);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByRating($query, $rating)
    {
        return $query->where('overall_rating', $rating);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->whereNotNull('approved_by');
    }

    public function scopeRequiresImprovement($query)
    {
        return $query->where('improvement_plan_required', true);
    }

    public function scopeExcellent($query)
    {
        return $query->where('overall_rating', 'excellent');
    }

    public function scopeCurrentYear($query)
    {
        return $query->where('academic_year', now()->year);
    }

    public function scopeOverdue($query)
    {
        return $query->where('next_evaluation_date', '<', now()->toDateString())
                    ->where('status', '!=', 'completed');
    }

    /**
     * Accessors & Mutators
     */
    public function getEvaluationTypeLabelAttribute(): string
    {
        return match($this->evaluation_type) {
            'annual' => 'İllik Qiymətləndirmə',
            'probationary' => 'Sınaq Müddəti',
            'mid_year' => 'İl Ortası',
            'promotion' => 'Yüksəliş',
            'performance_improvement' => 'Performans İyileşdirmə',
            'special' => 'Xüsusi Qiymətləndirmə',
            'continuous' => 'Davamlı İzləmə',
            default => 'Ümumi'
        ];
    }

    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'draft' => 'Layihə',
            'in_progress' => 'Davam edir',
            'pending_approval' => 'Təsdiq gözləyir',
            'completed' => 'Tamamlandı',
            'approved' => 'Təsdiqləndi',
            'requires_revision' => 'Düzəliş tələb edir',
            'cancelled' => 'Ləğv edildi',
            default => 'Naməlum'
        ];
    }

    public function getOverallRatingLabelAttribute(): string
    {
        return match($this->overall_rating) {
            'excellent' => 'Əla',
            'very_good' => 'Çox yaxşı',
            'good' => 'Yaxşı',
            'satisfactory' => 'Qənaətbəxş',
            'needs_improvement' => 'İyileşdirmə tələb edir',
            'unsatisfactory' => 'Qeyri-qənaətbəxş',
            default => 'Qiymətləndirilməyib'
        ];
    }

    public function getEvaluationPeriodLabelAttribute(): string
    {
        return match($this->evaluation_period) {
            'q1' => '1-ci Rüb',
            'q2' => '2-ci Rüb',
            'q3' => '3-cü Rüb',
            'q4' => '4-cü Rüb',
            'semester1' => '1-ci Semestr',
            'semester2' => '2-ci Semestr',
            'annual' => 'İllik',
            default => $this->evaluation_period
        };
    }

    public function getPerformanceLevelAttribute(): string
    {
        if (!$this->overall_score) {
            return 'Qiymətləndirilməyib';
        }

        if ($this->overall_score >= 90) return 'Əla';
        if ($this->overall_score >= 80) return 'Çox yaxşı';
        if ($this->overall_score >= 70) return 'Yaxşı';
        if ($this->overall_score >= 60) return 'Qənaətbəxş';
        if ($this->overall_score >= 50) return 'İyileşdirmə tələb edir';
        return 'Qeyri-qənaətbəxş';
    }

    public function getProgressSinceLastEvaluationAttribute(): ?float
    {
        $lastEvaluation = self::where('teacher_id', $this->teacher_id)
            ->where('id', '!=', $this->id)
            ->where('evaluation_date', '<', $this->evaluation_date)
            ->orderBy('evaluation_date', 'desc')
            ->first();

        if (!$lastEvaluation || !$lastEvaluation->overall_score || !$this->overall_score) {
            return null;
        }

        return $this->overall_score - $lastEvaluation->overall_score;
    }

    /**
     * Helper Methods
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isApproved(): bool
    {
        return $this->approved_by !== null;
    }

    public function isPending(): bool
    {
        return $this->status === 'pending' || $this->status === 'in_progress';
    }

    public function requiresImprovement(): bool
    {
        return $this->improvement_plan_required === true;
    }

    public function isOverdue(): bool
    {
        return $this->next_evaluation_date && 
               $this->next_evaluation_date->isPast() && 
               !$this->isCompleted();
    }

    public function calculateOverallScore(): float
    {
        $scores = [
            $this->teaching_effectiveness_score,
            $this->classroom_management_score,
            $this->subject_knowledge_score,
            $this->student_engagement_score,
            $this->professional_development_score,
            $this->collaboration_score,
            $this->innovation_score,
            $this->punctuality_score,
            $this->communication_score,
            $this->leadership_score,
        ];

        $validScores = array_filter($scores, fn($score) => $score !== null);
        
        return count($validScores) > 0 ? array_sum($validScores) / count($validScores) : 0;
    }

    public function complete($overallScore = null): bool
    {
        $score = $overallScore ?: $this->calculateOverallScore();
        $rating = $this->determineRating($score);

        return $this->update([
            'status' => 'completed',
            'overall_score' => $score,
            'overall_rating' => $rating,
            'next_evaluation_date' => $this->calculateNextEvaluationDate(),
        ]);
    }

    public function approve($approverId): bool
    {
        if ($this->status !== 'completed') {
            return false;
        }

        return $this->update([
            'status' => 'approved',
            'approved_by' => $approverId,
            'approved_at' => now(),
        ]);
    }

    public function requestRevision($reason = null): bool
    {
        $metadata = $this->metadata ?? [];
        $metadata['revision_reason'] = $reason;
        $metadata['revision_requested_at'] = now()->toISOString();

        return $this->update([
            'status' => 'requires_revision',
            'metadata' => $metadata,
        ]);
    }

    public function addGoal($goal, $targetDate = null, $priority = 'medium'): void
    {
        $goals = $this->goals_set ?? [];
        $goals[] = [
            'goal' => $goal,
            'target_date' => $targetDate,
            'priority' => $priority,
            'status' => 'active',
            'created_at' => now()->toISOString(),
        ];
        $this->update(['goals_set' => $goals]);
    }

    public function markGoalAchieved($goalIndex): void
    {
        $goals = $this->goals_set ?? [];
        if (isset($goals[$goalIndex])) {
            $goals[$goalIndex]['status'] = 'achieved';
            $goals[$goalIndex]['achieved_at'] = now()->toISOString();
            $this->update(['goals_set' => $goals]);
        }
    }

    public function addRecommendation($recommendation, $priority = 'medium'): void
    {
        $recommendations = $this->recommendations ?? [];
        $recommendations[] = [
            'recommendation' => $recommendation,
            'priority' => $priority,
            'created_at' => now()->toISOString(),
        ];
        $this->update(['recommendations' => $recommendations]);
    }

    public function getActiveGoals(): array
    {
        $goals = $this->goals_set ?? [];
        return array_filter($goals, fn($goal) => ($goal['status'] ?? 'active') === 'active');
    }

    public function getAchievedGoals(): array
    {
        $goals = $this->goals_set ?? [];
        return array_filter($goals, fn($goal) => ($goal['status'] ?? 'active') === 'achieved');
    }

    public function getScoreBreakdown(): array
    {
        return [
            'teaching_effectiveness' => [
                'score' => $this->teaching_effectiveness_score,
                'label' => 'Təlim Effektivliyi',
                'weight' => 20,
            ],
            'classroom_management' => [
                'score' => $this->classroom_management_score,
                'label' => 'Sinif İdarəetməsi',
                'weight' => 15,
            ],
            'subject_knowledge' => [
                'score' => $this->subject_knowledge_score,
                'label' => 'Fənn Bilgisi',
                'weight' => 15,
            ],
            'student_engagement' => [
                'score' => $this->student_engagement_score,
                'label' => 'Şagird Cəlbi',
                'weight' => 15,
            ],
            'professional_development' => [
                'score' => $this->professional_development_score,
                'label' => 'Peşəkar İnkişaf',
                'weight' => 10,
            ],
            'collaboration' => [
                'score' => $this->collaboration_score,
                'label' => 'Əməkdaşlıq',
                'weight' => 10,
            ],
            'innovation' => [
                'score' => $this->innovation_score,
                'label' => 'İnnovasiya',
                'weight' => 5,
            ],
            'punctuality' => [
                'score' => $this->punctuality_score,
                'label' => 'Vaxtında gəlmə',
                'weight' => 5,
            ],
            'communication' => [
                'score' => $this->communication_score,
                'label' => 'Ünsiyyət',
                'weight' => 3,
            ],
            'leadership' => [
                'score' => $this->leadership_score,
                'label' => 'Liderlik',
                'weight' => 2,
            ],
        ];
    }

    private function determineRating($score): string
    {
        if ($score >= 90) return 'excellent';
        if ($score >= 80) return 'very_good';
        if ($score >= 70) return 'good';
        if ($score >= 60) return 'satisfactory';
        if ($score >= 50) return 'needs_improvement';
        return 'unsatisfactory';
    }

    private function calculateNextEvaluationDate()
    {
        return match($this->evaluation_type) {
            'annual' => $this->evaluation_date->addYear(),
            'probationary' => $this->evaluation_date->addMonths(6),
            'mid_year' => $this->evaluation_date->addMonths(6),
            'continuous' => $this->evaluation_date->addMonths(3),
            default => $this->evaluation_date->addYear()
        };
    }

    public function generateEvaluationSummary(): array
    {
        return [
            'evaluation_info' => [
                'id' => $this->id,
                'type' => $this->evaluation_type_label,
                'period' => $this->evaluation_period_label,
                'academic_year' => $this->academic_year,
                'date' => $this->evaluation_date,
                'status' => $this->status_label,
            ],
            'teacher_info' => [
                'id' => $this->teacher->id,
                'name' => $this->teacher->profile 
                    ? "{$this->teacher->profile->first_name} {$this->teacher->profile->last_name}"
                    : $this->teacher->username,
                'email' => $this->teacher->email,
            ],
            'performance' => [
                'overall_score' => $this->overall_score,
                'overall_rating' => $this->overall_rating_label,
                'performance_level' => $this->performance_level,
                'progress_since_last' => $this->progress_since_last_evaluation,
                'improvement_required' => $this->improvement_plan_required,
            ],
            'score_breakdown' => $this->getScoreBreakdown(),
            'goals' => [
                'total_set' => count($this->goals_set ?? []),
                'achieved' => count($this->getAchievedGoals()),
                'active' => count($this->getActiveGoals()),
            ],
            'strengths' => $this->strengths ?? [],
            'areas_for_improvement' => $this->areas_for_improvement ?? [],
            'recommendations' => $this->recommendations ?? [],
            'next_evaluation' => $this->next_evaluation_date,
            'is_approved' => $this->isApproved(),
        ];
    }
}