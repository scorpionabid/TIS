<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BSQResult extends Model
{
    use HasFactory;

    /**
     * BSQ - Beynəlxalq Standartlar Qiymətləndirməsi Results
     */
    protected $table = 'bsq_results';

    protected $fillable = [
        'institution_id',
        'academic_year_id',
        'assessment_date',
        'international_standard',
        'assessment_body',
        'assessor_id',
        'total_score',
        'max_possible_score',
        'percentage_score',
        'international_ranking',
        'national_ranking',
        'regional_ranking',
        'benchmark_comparison',
        'competency_areas',
        'detailed_scores',
        'international_comparison',
        'certification_level',
        'certification_valid_until',
        'improvement_plan',
        'action_items',
        'status',
        'approved_by',
        'approved_at',
        'published',
        'published_at',
        'external_report_url',
        'compliance_score',
        'accreditation_status'
    ];

    protected $casts = [
        'assessment_date' => 'date',
        'approved_at' => 'datetime',
        'published_at' => 'datetime',
        'certification_valid_until' => 'date',
        'published' => 'boolean',
        'competency_areas' => 'array',
        'detailed_scores' => 'array',
        'international_comparison' => 'array',
        'improvement_plan' => 'array',
        'action_items' => 'array',
        'benchmark_comparison' => 'array',
        'total_score' => 'decimal:2',
        'max_possible_score' => 'decimal:2',
        'percentage_score' => 'decimal:2',
        'compliance_score' => 'decimal:2',
        'international_ranking' => 'integer',
        'national_ranking' => 'integer',
        'regional_ranking' => 'integer'
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

    public function scopeByStandard($query, $standard)
    {
        return $query->where('international_standard', $standard);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopePublished($query)
    {
        return $query->where('published', true);
    }

    public function scopeCertificationValid($query)
    {
        return $query->where('certification_valid_until', '>', now());
    }

    /**
     * Accessors & Mutators
     */
    public function getInternationalStandardAttribute($value)
    {
        return strtoupper($value);
    }

    public function getCertificationStatusAttribute()
    {
        if (!$this->certification_valid_until) return 'not_certified';
        if ($this->certification_valid_until->isFuture()) return 'certified';
        return 'expired';
    }

    public function getPerformanceLevelAttribute()
    {
        if ($this->percentage_score >= 95) return 'outstanding';
        if ($this->percentage_score >= 85) return 'excellent';
        if ($this->percentage_score >= 75) return 'good';
        if ($this->percentage_score >= 65) return 'satisfactory';
        if ($this->percentage_score >= 50) return 'needs_improvement';
        return 'unsatisfactory';
    }

    public function getAccreditationLevelAttribute()
    {
        switch ($this->accreditation_status) {
            case 'full_accreditation':
                return 'Tam Akreditasiya';
            case 'conditional_accreditation':
                return 'Şərti Akreditasiya';
            case 'provisional_accreditation':
                return 'Müvəqqəti Akreditasiya';
            case 'denied':
                return 'Akreditasiya Verilmədi';
            default:
                return 'Qiymətləndirilmir';
        }
    }

    /**
     * Helper Methods
     */
    public function calculateInternationalRanking()
    {
        // Bu metod beynəlxalq müqayisə üçün istifadə olunur
        // Real implementation-da external API integration ola bilər
        
        $percentile = $this->percentage_score;
        
        if ($percentile >= 95) return ['level' => 'top_5_percent', 'description' => 'Ən yüksək 5% arasında'];
        if ($percentile >= 90) return ['level' => 'top_10_percent', 'description' => 'Ən yüksək 10% arasında'];
        if ($percentile >= 75) return ['level' => 'top_25_percent', 'description' => 'Ən yüksək 25% arasında'];
        if ($percentile >= 50) return ['level' => 'above_average', 'description' => 'Ortadan yuxarı'];
        
        return ['level' => 'below_average', 'description' => 'Ortadan aşağı'];
    }

    public function generateComplianceReport()
    {
        $report = [
            'assessment_date' => $this->assessment_date,
            'standard' => $this->international_standard,
            'overall_score' => $this->percentage_score,
            'certification_status' => $this->certification_status,
            'compliance_areas' => []
        ];

        if (is_array($this->competency_areas)) {
            foreach ($this->competency_areas as $area => $score) {
                $compliance = $score >= 70 ? 'compliant' : 'non_compliant';
                $report['compliance_areas'][$area] = [
                    'score' => $score,
                    'status' => $compliance,
                    'meets_standard' => $score >= 70
                ];
            }
        }

        return $report;
    }

    public function isNearExpiration($days = 90)
    {
        if (!$this->certification_valid_until) return false;
        
        return $this->certification_valid_until->diffInDays(now()) <= $days;
    }

    public function requiresReassessment()
    {
        return $this->certification_status === 'expired' || 
               $this->accreditation_status === 'conditional_accreditation' ||
               $this->percentage_score < 70;
    }

    public function getBenchmarkPosition()
    {
        // Regional və national pozisiya müqayisəsi
        return [
            'regional' => $this->regional_ranking,
            'national' => $this->national_ranking,
            'international' => $this->international_ranking,
            'percentile' => $this->calculatePercentile()
        ];
    }

    private function calculatePercentile()
    {
        // Bu metod database-dəki digər nəticələrlə müqayisə edir
        $totalInstitutions = static::where('international_standard', $this->international_standard)
                                  ->where('academic_year_id', $this->academic_year_id)
                                  ->count();
        
        $lowerScores = static::where('international_standard', $this->international_standard)
                            ->where('academic_year_id', $this->academic_year_id)
                            ->where('percentage_score', '<', $this->percentage_score)
                            ->count();
        
        return $totalInstitutions > 0 ? round(($lowerScores / $totalInstitutions) * 100, 2) : 0;
    }
}