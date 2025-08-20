<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class AcademicAssessment extends Model
{
    use HasFactory;

    protected $fillable = [
        'assessment_title',
        'assessment_type',
        'assessment_level',
        'institution_id',
        'academic_year_id',
        'academic_term_id',
        'grade_id',
        'subject_id',
        'assessment_date',
        'start_time',
        'end_time',
        'duration_minutes',
        'registration_deadline',
        'results_release_date',
        'assessment_description',
        'assessment_objectives',
        'assessment_standards',
        'total_questions',
        'total_points',
        'passing_score',
        'question_breakdown',
        'difficulty_distribution',
        'topic_coverage',
        'participation_type',
        'eligibility_criteria',
        'max_participants',
        'participation_fee',
        'status',
        'proctoring_type',
        'security_measures',
        'requires_id_verification',
        'allows_calculator',
        'allows_reference_materials',
        'allowed_materials',
        'scoring_method',
        'mean_score',
        'median_score',
        'standard_deviation',
        'highest_score',
        'lowest_score',
        'score_distribution',
        'performance_analytics',
        'question_analysis',
        'reliability_coefficient',
        'historical_comparison',
        'regional_comparison',
        'national_benchmarks',
        'improvement_percentage',
        'created_by',
        'approved_by',
        'approved_at',
        'conducted_by',
        'administrative_notes',
        'quality_reviewed',
        'quality_reviewer',
        'quality_review_date',
        'quality_notes',
        'quality_rating',
        'required_resources',
        'venue_assignments',
        'proctors_required',
        'proctor_assignments',
        'uses_technology',
        'technology_requirements',
        'online_platform',
        'digital_delivery_config',
        'accessibility_features',
        'supports_screen_reader',
        'supports_extended_time',
        'special_accommodations',
        'communication_plan',
        'auto_generate_reports',
        'report_templates',
        'parent_access_enabled',
        'student_access_enabled',
        'provides_certification',
        'certificate_template',
        'certification_criteria',
        'certificate_expiry_date',
        'triggers_intervention',
        'intervention_thresholds',
        'recommended_actions',
        'intervention_review_date',
        'retention_period',
        'archive_date',
        'results_published',
        'results_published_at'
    ];

    protected $casts = [
        'assessment_date' => 'date',
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'registration_deadline' => 'date',
        'results_release_date' => 'date',
        'approved_at' => 'datetime',
        'quality_review_date' => 'datetime',
        'certificate_expiry_date' => 'date',
        'intervention_review_date' => 'date',
        'archive_date' => 'date',
        'results_published_at' => 'datetime',
        'assessment_objectives' => 'array',
        'assessment_standards' => 'array',
        'question_breakdown' => 'array',
        'difficulty_distribution' => 'array',
        'topic_coverage' => 'array',
        'eligibility_criteria' => 'array',
        'security_measures' => 'array',
        'allowed_materials' => 'array',
        'score_distribution' => 'array',
        'performance_analytics' => 'array',
        'question_analysis' => 'array',
        'historical_comparison' => 'array',
        'regional_comparison' => 'array',
        'national_benchmarks' => 'array',
        'required_resources' => 'array',
        'venue_assignments' => 'array',
        'proctor_assignments' => 'array',
        'technology_requirements' => 'array',
        'digital_delivery_config' => 'array',
        'accessibility_features' => 'array',
        'special_accommodations' => 'array',
        'communication_plan' => 'array',
        'report_templates' => 'array',
        'certification_criteria' => 'array',
        'intervention_thresholds' => 'array',
        'recommended_actions' => 'array',
        'requires_id_verification' => 'boolean',
        'allows_calculator' => 'boolean',
        'allows_reference_materials' => 'boolean',
        'quality_reviewed' => 'boolean',
        'uses_technology' => 'boolean',
        'supports_screen_reader' => 'boolean',
        'supports_extended_time' => 'boolean',
        'auto_generate_reports' => 'boolean',
        'parent_access_enabled' => 'boolean',
        'student_access_enabled' => 'boolean',
        'provides_certification' => 'boolean',
        'triggers_intervention' => 'boolean',
        'results_published' => 'boolean',
        'passing_score' => 'decimal:2',
        'participation_fee' => 'decimal:2',
        'mean_score' => 'decimal:2',
        'median_score' => 'decimal:2',
        'standard_deviation' => 'decimal:2',
        'highest_score' => 'decimal:2',
        'lowest_score' => 'decimal:2',
        'reliability_coefficient' => 'decimal:4',
        'improvement_percentage' => 'decimal:2'
    ];

    // Relationships
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function academicTerm(): BelongsTo
    {
        return $this->belongsTo(AcademicTerm::class);
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function conductedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'conducted_by');
    }

    public function qualityReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'quality_reviewer');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(AssessmentParticipant::class, 'assessment_id');
    }

    public function analytics(): HasMany
    {
        return $this->hasMany(AssessmentAnalytics::class, 'assessment_id');
    }

    // Status checking methods
    public function isPlanning(): bool
    {
        return $this->status === 'planning';
    }

    public function isScheduled(): bool
    {
        return $this->status === 'scheduled';
    }

    public function isRegistrationOpen(): bool
    {
        return $this->status === 'registration_open' && 
               (!$this->registration_deadline || $this->registration_deadline->isFuture());
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isResultsReady(): bool
    {
        return $this->status === 'results_ready';
    }

    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    public function isArchived(): bool
    {
        return $this->status === 'archived';
    }

    // Type checking methods
    public function isKSQAssessment(): bool
    {
        return $this->assessment_type === 'ksq_national';
    }

    public function isBSQAssessment(): bool
    {
        return $this->assessment_type === 'bsq_national';
    }

    public function isNationalAssessment(): bool
    {
        return in_array($this->assessment_type, ['ksq_national', 'bsq_national']);
    }

    public function isCompetencyTest(): bool
    {
        return $this->assessment_type === 'competency_test';
    }

    public function isCertificationExam(): bool
    {
        return $this->assessment_type === 'certification_exam';
    }

    // Date and time methods
    public function hasStarted(): bool
    {
        $assessmentDateTime = Carbon::parse($this->assessment_date->format('Y-m-d') . ' ' . $this->start_time->format('H:i:s'));
        return $assessmentDateTime->isPast();
    }

    public function hasEnded(): bool
    {
        $assessmentDateTime = Carbon::parse($this->assessment_date->format('Y-m-d') . ' ' . $this->end_time->format('H:i:s'));
        return $assessmentDateTime->isPast();
    }

    public function isInProgress(): bool
    {
        return $this->hasStarted() && !$this->hasEnded() && $this->status === 'in_progress';
    }

    public function getDurationInHours(): float
    {
        return round($this->duration_minutes / 60, 2);
    }

    public function getTimeRemaining(): ?Carbon
    {
        if (!$this->hasStarted()) {
            $assessmentDateTime = Carbon::parse($this->assessment_date->format('Y-m-d') . ' ' . $this->start_time->format('H:i:s'));
            return $assessmentDateTime->diffForHumans();
        }
        
        if ($this->isInProgress()) {
            $endDateTime = Carbon::parse($this->assessment_date->format('Y-m-d') . ' ' . $this->end_time->format('H:i:s'));
            return $endDateTime->diffForHumans();
        }
        
        return null;
    }

    // Registration and participation
    public function canRegister(): bool
    {
        return $this->isRegistrationOpen() && 
               (!$this->max_participants || $this->getRegisteredCount() < $this->max_participants);
    }

    public function getRegisteredCount(): int
    {
        return $this->participants()->whereIn('registration_status', ['confirmed', 'waitlisted'])->count();
    }

    public function getConfirmedCount(): int
    {
        return $this->participants()->where('registration_status', 'confirmed')->count();
    }

    public function getActualParticipantCount(): int
    {
        return $this->participants()->where('attendance_status', 'present')->count();
    }

    public function getWaitlistCount(): int
    {
        return $this->participants()->where('registration_status', 'waitlisted')->count();
    }

    public function getNoShowCount(): int
    {
        return $this->participants()->where('attendance_status', 'absent')->count();
    }

    public function calculateParticipationRate(): float
    {
        $confirmed = $this->getConfirmedCount();
        $actual = $this->getActualParticipantCount();
        
        if ($confirmed === 0) return 0.0;
        
        return round(($actual / $confirmed) * 100, 2);
    }

    // Scoring and analytics
    public function calculatePassRate(): float
    {
        if (!$this->passing_score) return 0.0;
        
        $totalParticipants = $this->participants()->whereNotNull('raw_score')->count();
        if ($totalParticipants === 0) return 0.0;
        
        $passedParticipants = $this->participants()
            ->where('raw_score', '>=', $this->passing_score)
            ->count();
        
        return round(($passedParticipants / $totalParticipants) * 100, 2);
    }

    public function calculateScoreStatistics(): array
    {
        $scores = $this->participants()
            ->whereNotNull('raw_score')
            ->pluck('raw_score')
            ->toArray();
        
        if (empty($scores)) {
            return [
                'count' => 0,
                'mean' => 0,
                'median' => 0,
                'std_dev' => 0,
                'min' => 0,
                'max' => 0
            ];
        }
        
        sort($scores);
        $count = count($scores);
        $sum = array_sum($scores);
        $mean = $sum / $count;
        
        // Calculate median
        $middle = floor($count / 2);
        $median = $count % 2 === 0 
            ? ($scores[$middle - 1] + $scores[$middle]) / 2
            : $scores[$middle];
        
        // Calculate standard deviation
        $variance = array_sum(array_map(function($score) use ($mean) {
            return pow($score - $mean, 2);
        }, $scores)) / $count;
        $stdDev = sqrt($variance);
        
        return [
            'count' => $count,
            'mean' => round($mean, 2),
            'median' => round($median, 2),
            'std_dev' => round($stdDev, 2),
            'min' => min($scores),
            'max' => max($scores)
        ];
    }

    public function updateScoreStatistics(): void
    {
        $stats = $this->calculateScoreStatistics();
        
        $this->update([
            'mean_score' => $stats['mean'],
            'median_score' => $stats['median'],
            'standard_deviation' => $stats['std_dev'],
            'lowest_score' => $stats['min'],
            'highest_score' => $stats['max']
        ]);
    }

    // Performance analysis
    public function getPerformanceLevelDistribution(): array
    {
        $distribution = $this->participants()
            ->selectRaw('performance_level, COUNT(*) as count')
            ->whereNotNull('performance_level')
            ->groupBy('performance_level')
            ->pluck('count', 'performance_level')
            ->toArray();
        
        $total = array_sum($distribution);
        $percentages = [];
        
        foreach ($distribution as $level => $count) {
            $percentages[$level] = [
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 2) : 0
            ];
        }
        
        return $percentages;
    }

    public function getTopPerformers(int $limit = 10): \Illuminate\Database\Eloquent\Collection
    {
        return $this->participants()
            ->with('participant.profile')
            ->whereNotNull('raw_score')
            ->orderBy('raw_score', 'desc')
            ->limit($limit)
            ->get();
    }

    public function getInterventionCandidates(): \Illuminate\Database\Eloquent\Collection
    {
        if (!$this->triggers_intervention || !$this->intervention_thresholds) {
            return collect([]);
        }
        
        $threshold = $this->intervention_thresholds['low_performance_threshold'] ?? null;
        if (!$threshold) return collect([]);
        
        return $this->participants()
            ->with('participant.profile')
            ->where('raw_score', '<', $threshold)
            ->whereNotNull('raw_score')
            ->orderBy('raw_score', 'asc')
            ->get();
    }

    // Quality assurance
    public function markQualityReviewed(int $reviewerId, string $rating = 'good', string $notes = null): void
    {
        $this->update([
            'quality_reviewed' => true,
            'quality_reviewer' => $reviewerId,
            'quality_review_date' => now(),
            'quality_rating' => $rating,
            'quality_notes' => $notes
        ]);
    }

    public function isQualityApproved(): bool
    {
        return $this->quality_reviewed && in_array($this->quality_rating, ['good', 'excellent']);
    }

    // Resource management
    public function calculateResourceRequirements(): array
    {
        $participantCount = $this->getConfirmedCount();
        
        return [
            'rooms_needed' => ceil($participantCount / 30), // Assuming 30 students per room
            'proctors_needed' => ceil($participantCount / 25), // Assuming 1 proctor per 25 students
            'materials_needed' => $participantCount,
            'technology_stations' => $this->uses_technology ? $participantCount : 0
        ];
    }

    public function hasAdequateResources(): bool
    {
        $required = $this->calculateResourceRequirements();
        $available = $this->required_resources ?? [];
        
        foreach ($required as $resource => $needed) {
            $available_count = $available[$resource] ?? 0;
            if ($available_count < $needed) {
                return false;
            }
        }
        
        return true;
    }

    // Accessibility and accommodations
    public function hasAccessibilityFeatures(): bool
    {
        return !empty($this->accessibility_features) || 
               $this->supports_screen_reader || 
               $this->supports_extended_time;
    }

    public function getParticipantsNeedingAccommodations(): \Illuminate\Database\Eloquent\Collection
    {
        return $this->participants()
            ->whereNotNull('accommodations_requested')
            ->get();
    }

    // Certification and credentials
    public function generateCertificates(): int
    {
        if (!$this->provides_certification) return 0;
        
        $eligibleParticipants = $this->participants()
            ->whereNotNull('raw_score');
        
        if (!empty($this->certification_criteria)) {
            $minScore = $this->certification_criteria['minimum_score'] ?? $this->passing_score;
            if ($minScore) {
                $eligibleParticipants->where('raw_score', '>=', $minScore);
            }
        }
        
        $certificatesGenerated = 0;
        foreach ($eligibleParticipants->get() as $participant) {
            if (!$participant->certificate_earned) {
                $participant->update([
                    'certificate_earned' => true,
                    'certificate_number' => $this->generateCertificateNumber($participant),
                    'certificate_issued_date' => now(),
                    'certificate_expiry_date' => $this->certificate_expiry_date
                ]);
                $certificatesGenerated++;
            }
        }
        
        return $certificatesGenerated;
    }

    private function generateCertificateNumber(AssessmentParticipant $participant): string
    {
        $prefix = strtoupper(substr($this->assessment_type, 0, 3));
        $year = $this->assessment_date->year;
        $sequence = str_pad($participant->id, 6, '0', STR_PAD_LEFT);
        
        return "{$prefix}-{$year}-{$sequence}";
    }

    // Reporting and communication
    public function canReleaseResults(): bool
    {
        return $this->isCompleted() && 
               $this->quality_reviewed && 
               (!$this->results_release_date || $this->results_release_date->isPast());
    }

    public function publishResults(): bool
    {
        if (!$this->canReleaseResults()) return false;
        
        $this->update([
            'results_published' => true,
            'results_published_at' => now(),
            'status' => 'results_ready'
        ]);
        
        // Trigger notifications to participants if enabled
        if ($this->parent_access_enabled || $this->student_access_enabled) {
            // This would trigger notification system
            // NotificationService::sendAssessmentResults($this);
        }
        
        return true;
    }

    // Scopes
    public function scopeForInstitution(Builder $query, int $institutionId): Builder
    {
        return $query->where('institution_id', $institutionId);
    }

    public function scopeForAcademicYear(Builder $query, int $academicYearId): Builder
    {
        return $query->where('academic_year_id', $academicYearId);
    }

    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('assessment_type', $type);
    }

    public function scopeByLevel(Builder $query, string $level): Builder
    {
        return $query->where('assessment_level', $level);
    }

    public function scopeNational(Builder $query): Builder
    {
        return $query->where('assessment_level', 'national');
    }

    public function scopeKSQ(Builder $query): Builder
    {
        return $query->where('assessment_type', 'ksq_national');
    }

    public function scopeBSQ(Builder $query): Builder
    {
        return $query->where('assessment_type', 'bsq_national');
    }

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('assessment_date', '>', now())
                    ->whereIn('status', ['scheduled', 'registration_open', 'registration_closed']);
    }

    public function scopeCompleted(Builder $query): Builder
    {
        return $query->whereIn('status', ['completed', 'results_ready', 'archived']);
    }

    public function scopeRequiringQualityReview(Builder $query): Builder
    {
        return $query->where('status', 'completed')
                    ->where('quality_reviewed', false);
    }

    public function scopeReadyForResults(Builder $query): Builder
    {
        return $query->where('status', 'completed')
                    ->where('quality_reviewed', true)
                    ->where('results_published', false);
    }

    public function scopeForGrade(Builder $query, int $gradeId): Builder
    {
        return $query->where('grade_id', $gradeId);
    }

    public function scopeForSubject(Builder $query, int $subjectId): Builder
    {
        return $query->where('subject_id', $subjectId);
    }
}