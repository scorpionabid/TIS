<?php

namespace App\Models;

use App\Models\Traits\HasApprover;
use App\Models\Traits\HasUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * PRD: AssessmentScore - sertifikasiya/MİQ/diaqnostik (ən son nəticə)
 */
class TeacherAssessmentScore extends Model
{
    use HasFactory, HasUser, HasApprover;

    protected $fillable = [
        'teacher_id',
        'academic_year_id',
        'assessment_type',
        'score',
        'max_score',
        'assessment_date',
        'document_path',
        'metadata',
        'verified',
        'verified_at',
        'verified_by',
    ];

    protected $casts = [
        'score' => 'decimal:2',
        'max_score' => 'decimal:2',
        'assessment_date' => 'date',
        'metadata' => 'array',
        'verified' => 'boolean',
        'verified_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Assessment types
     */
    public const TYPE_MIQ = 'miq';
    public const TYPE_CERTIFICATION = 'certification';
    public const TYPE_DIAGNOSTIC = 'diagnostic';

    public const TYPES = [
        self::TYPE_MIQ => 'MİQ',
        self::TYPE_CERTIFICATION => 'Sertifikasiya',
        self::TYPE_DIAGNOSTIC => 'Diaqnostik',
    ];

    /**
     * Get the academic year that owns the assessment score.
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /**
     * PRD: Calculate percentage score (0-100).
     */
    public function getPercentageScoreAttribute(): float
    {
        if ($this->max_score <= 0) {
            return 0;
        }

        return round(($this->score / $this->max_score) * 100, 2);
    }

    /**
     * Scope by assessment type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('assessment_type', $type);
    }

    /**
     * Scope by teacher.
     */
    public function scopeByTeacher($query, int $teacherId)
    {
        return $query->where('teacher_id', $teacherId);
    }

    /**
     * Scope by academic year.
     */
    public function scopeByAcademicYear($query, int $academicYearId)
    {
        return $query->where('academic_year_id', $academicYearId);
    }

    /**
     * Scope verified only.
     */
    public function scopeVerified($query)
    {
        return $query->where('verified', true);
    }

    /**
     * PRD: Get the latest assessment for a teacher in an academic year.
     */
    public static function getLatestForTeacher(int $teacherId, int $academicYearId, ?string $type = null): ?self
    {
        $query = self::where('teacher_id', $teacherId)
            ->where('academic_year_id', $academicYearId);

        if ($type) {
            $query->where('assessment_type', $type);
        }

        return $query->latest('assessment_date')->first();
    }
}
