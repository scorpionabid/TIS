<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PsychologyAssessment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'session_id',
        'student_id',
        'psychologist_id',
        'assessment_type',
        'assessment_name',
        'assessment_date',
        'raw_scores',
        'standardized_scores',
        'percentile_ranks',
        'interpretation',
        'strengths_identified',
        'areas_of_concern',
        'recommendations',
        'validity_indicators',
        'test_conditions',
        'behavioral_observations',
        'follow_up_assessments_needed',
        'comparison_data',
        'progress_since_last',
        'cultural_considerations',
        'language_factors',
        'accommodations_used',
        'reliability_score',
        'confidence_level',
        'status',
        'reviewed_by',
        'reviewed_at',
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
            'assessment_date' => 'date',
            'reviewed_at' => 'datetime',
            'raw_scores' => 'array',
            'standardized_scores' => 'array',
            'percentile_ranks' => 'array',
            'strengths_identified' => 'array',
            'areas_of_concern' => 'array',
            'recommendations' => 'array',
            'validity_indicators' => 'array',
            'behavioral_observations' => 'array',
            'follow_up_assessments_needed' => 'array',
            'comparison_data' => 'array',
            'cultural_considerations' => 'array',
            'language_factors' => 'array',
            'accommodations_used' => 'array',
            'reliability_score' => 'decimal:2',
            'confidence_level' => 'decimal:2',
            'metadata' => 'array',
        ];
    }

    /**
     * Get the session for this assessment.
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(PsychologySession::class, 'session_id');
    }

    /**
     * Get the student for this assessment.
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get the psychologist who conducted this assessment.
     */
    public function psychologist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'psychologist_id');
    }

    /**
     * Get the reviewer of this assessment.
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Scopes
     */
    public function scopeBySession($query, $sessionId)
    {
        return $query->where('session_id', $sessionId);
    }

    public function scopeByStudent($query, $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    public function scopeByPsychologist($query, $psychologistId)
    {
        return $query->where('psychologist_id', $psychologistId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('assessment_type', $type);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeReviewed($query)
    {
        return $query->whereNotNull('reviewed_by');
    }

    public function scopeRecent($query, $days = 30)
    {
        return $query->where('assessment_date', '>=', now()->subDays($days));
    }

    /**
     * Accessors & Mutators
     */
    public function getAssessmentTypeLabelAttribute(): string
    {
        return match($this->assessment_type) {
            'cognitive' => 'Koqnitiv Qiymətləndirmə',
            'behavioral' => 'Davranış Qiymətləndirməsi',
            'emotional' => 'Emosional Qiymətləndirmə',
            'social' => 'Sosial Bacarıqlar',
            'academic' => 'Akademik Performans',
            'personality' => 'Şəxsiyyət Qiymətləndirməsi',
            'neuropsychological' => 'Neyropsikoloji Test',
            'developmental' => 'İnkişaf Qiymətləndirməsi',
            'trauma' => 'Travma Qiymətləndirməsi',
            'adhd' => 'ADHD Skringinqi',
            'autism' => 'Autizm Spektri Qiymətləndirməsi',
            'anxiety' => 'Narahatlıq Qiymətləndirməsi',
            'depression' => 'Depressiya Skringinqi',
            'other' => 'Digər',
            default => 'Ümumi Qiymətləndirmə'
        ];
    }

    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'draft' => 'Layihə',
            'in_progress' => 'Davam edir',
            'completed' => 'Tamamlandı',
            'reviewed' => 'Baxılıb',
            'cancelled' => 'Ləğv edildi',
            default => 'Naməlum'
        ];
    }

    public function getOverallPerformanceLevelAttribute(): string
    {
        if (!$this->standardized_scores) {
            return 'Qiymətləndirilməyib';
        }

        $scores = $this->standardized_scores;
        $averageScore = collect($scores)->avg();

        if ($averageScore >= 130) return 'Çox yüksək';
        if ($averageScore >= 115) return 'Yüksək';
        if ($averageScore >= 85) return 'Orta';
        if ($averageScore >= 70) return 'Orta aşağı';
        return 'Aşağı';
    }

    public function getReliabilityLevelAttribute(): string
    {
        if (!$this->reliability_score) {
            return 'Məlum deyil';
        }

        if ($this->reliability_score >= 0.90) return 'Çox yüksək';
        if ($this->reliability_score >= 0.80) return 'Yüksək';
        if ($this->reliability_score >= 0.70) return 'Qəbuloluna';
        return 'Aşağı';
    }

    /**
     * Helper Methods
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isReviewed(): bool
    {
        return $this->reviewed_by !== null;
    }

    public function isPending(): bool
    {
        return $this->status === 'pending' || $this->status === 'in_progress';
    }

    public function complete(): bool
    {
        return $this->update([
            'status' => 'completed',
        ]);
    }

    public function markAsReviewed($reviewerId): bool
    {
        return $this->update([
            'status' => 'reviewed',
            'reviewed_by' => $reviewerId,
            'reviewed_at' => now(),
        ]);
    }

    public function getScoreInDomain($domain): ?float
    {
        $scores = $this->standardized_scores ?? [];
        return $scores[$domain] ?? null;
    }

    public function getPercentileInDomain($domain): ?float
    {
        $percentiles = $this->percentile_ranks ?? [];
        return $percentiles[$domain] ?? null;
    }

    public function getStrengths(): array
    {
        return $this->strengths_identified ?? [];
    }

    public function getConcerns(): array
    {
        return $this->areas_of_concern ?? [];
    }

    public function getRecommendations(): array
    {
        return $this->recommendations ?? [];
    }

    public function addStrength($strength): void
    {
        $strengths = $this->strengths_identified ?? [];
        $strengths[] = $strength;
        $this->update(['strengths_identified' => $strengths]);
    }

    public function addConcern($concern): void
    {
        $concerns = $this->areas_of_concern ?? [];
        $concerns[] = $concern;
        $this->update(['areas_of_concern' => $concerns]);
    }

    public function addRecommendation($recommendation): void
    {
        $recommendations = $this->recommendations ?? [];
        $recommendations[] = $recommendation;
        $this->update(['recommendations' => $recommendations]);
    }

    public function calculateCompositeScore($domains = null): ?float
    {
        $scores = $this->standardized_scores ?? [];
        
        if (empty($scores)) {
            return null;
        }

        if ($domains) {
            $filteredScores = array_intersect_key($scores, array_flip($domains));
            return collect($filteredScores)->avg();
        }

        return collect($scores)->avg();
    }

    public function getSignificantFindings(): array
    {
        $findings = [];
        $scores = $this->standardized_scores ?? [];

        foreach ($scores as $domain => $score) {
            if ($score >= 130) {
                $findings[] = [
                    'domain' => $domain,
                    'score' => $score,
                    'level' => 'exceptional',
                    'description' => "{$domain} sahəsində istisnai performans"
                ];
            } elseif ($score <= 70) {
                $findings[] = [
                    'domain' => $domain,
                    'score' => $score,
                    'level' => 'concerning',
                    'description' => "{$domain} sahəsində dəstək tələb olunur"
                ];
            }
        }

        return $findings;
    }

    public function generateSummaryReport(): array
    {
        return [
            'assessment_info' => [
                'type' => $this->assessment_type,
                'name' => $this->assessment_name,
                'date' => $this->assessment_date,
                'psychologist' => $this->psychologist->profile 
                    ? "{$this->psychologist->profile->first_name} {$this->psychologist->profile->last_name}"
                    : $this->psychologist->username,
            ],
            'overall_performance' => $this->overall_performance_level,
            'composite_score' => $this->calculateCompositeScore(),
            'reliability' => $this->reliability_level,
            'strengths' => $this->getStrengths(),
            'concerns' => $this->getConcerns(),
            'recommendations' => $this->getRecommendations(),
            'significant_findings' => $this->getSignificantFindings(),
            'next_steps' => $this->follow_up_assessments_needed ?? [],
        ];
    }
}