<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KSQResult extends Model
{
    use HasFactory;

    /**
     * KSQ - Keyfiyyət Standartları Qiymətləndirməsi Results
     */
    protected $table = 'ksq_results';

    protected $fillable = [
        'institution_id',
        'academic_year_id',
        'assessment_date',
        'assessment_type',
        'assessor_id',
        'total_score',
        'max_possible_score',
        'percentage_score',
        'grade_level',
        'subject_id',
        'criteria_scores',
        'detailed_results',
        'strengths',
        'improvement_areas',
        'recommendations',
        'status',
        'approved_by',
        'approved_at',
        'notes',
        'follow_up_required',
        'follow_up_date',
        'previous_assessment_id',
        'improvement_percentage'
    ];

    protected $casts = [
        'assessment_date' => 'date',
        'approved_at' => 'datetime',
        'follow_up_date' => 'date',
        'follow_up_required' => 'boolean',
        'criteria_scores' => 'array',
        'detailed_results' => 'array',
        'strengths' => 'array',
        'improvement_areas' => 'array',
        'recommendations' => 'array',
        'total_score' => 'decimal:2',
        'max_possible_score' => 'decimal:2',
        'percentage_score' => 'decimal:2',
        'improvement_percentage' => 'decimal:2'
    ];

    /**
     * Relations
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function assessor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assessor_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function previousAssessment(): BelongsTo
    {
        return $this->belongsTo(KSQResult::class, 'previous_assessment_id');
    }

    public function followUpAssessments(): HasMany
    {
        return $this->hasMany(KSQResult::class, 'previous_assessment_id');
    }

    /**
     * Scopes
     */
    public function scopeByInstitution($query, $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    public function scopeByAcademicYear($query, $academicYearId)
    {
        return $query->where('academic_year_id', $academicYearId);
    }

    public function scopeByAssessmentType($query, $type)
    {
        return $query->where('assessment_type', $type);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeNeedsFollowUp($query)
    {
        return $query->where('follow_up_required', true)
                    ->where('follow_up_date', '<=', now());
    }

    /**
     * Accessors & Mutators
     */
    public function getGradeLevelAttribute($value)
    {
        return $value ?: 'general';
    }

    public function getPerformanceLevelAttribute()
    {
        if ($this->percentage_score >= 90) return 'excellent';
        if ($this->percentage_score >= 80) return 'good';
        if ($this->percentage_score >= 70) return 'satisfactory';
        if ($this->percentage_score >= 60) return 'needs_improvement';
        return 'unsatisfactory';
    }

    public function getImprovementStatusAttribute()
    {
        if (!$this->improvement_percentage) return 'no_comparison';
        if ($this->improvement_percentage > 5) return 'significant_improvement';
        if ($this->improvement_percentage > 0) return 'slight_improvement';
        if ($this->improvement_percentage == 0) return 'no_change';
        if ($this->improvement_percentage > -5) return 'slight_decline';
        return 'significant_decline';
    }

    /**
     * Helper Methods
     */
    public function calculateImprovementFromPrevious()
    {
        if ($this->previousAssessment) {
            $this->improvement_percentage = $this->percentage_score - $this->previousAssessment->percentage_score;
            $this->save();
        }
    }

    public function generateRecommendations()
    {
        $recommendations = [];
        
        if ($this->percentage_score < 70) {
            $recommendations[] = 'Təhsil keyfiyyətinin artırılması üçün dəstək tədbirləri lazımdır';
        }
        
        if ($this->improvement_percentage < 0) {
            $recommendations[] = 'Əvvəlki qiymətləndirmə ilə müqayisədə gerilədiyinə görə xüsusi diqqət tələb olunur';
        }

        // Criteria-based recommendations
        if (is_array($this->criteria_scores)) {
            foreach ($this->criteria_scores as $criteria => $score) {
                if ($score < 60) {
                    $recommendations[] = "'{$criteria}' sahəsində təkmilləşdirmə tələb olunur";
                }
            }
        }

        return $recommendations;
    }

    public function isOverdue()
    {
        return $this->follow_up_required && 
               $this->follow_up_date && 
               $this->follow_up_date->isPast();
    }
}