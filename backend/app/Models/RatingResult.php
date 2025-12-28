<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * RatingResult Model - Final Teacher Rating Calculations
 */
class RatingResult extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'academic_year_id',
        'total_score',
        'breakdown',
        'rank_school',
        'rank_district',
        'rank_region',
        'rank_subject',
        'calculated_at',
    ];

    protected $casts = [
        'total_score' => 'float',
        'breakdown' => 'array',
        'rank_school' => 'integer',
        'rank_district' => 'integer',
        'rank_region' => 'integer',
        'rank_subject' => 'integer',
        'calculated_at' => 'datetime',
    ];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(TeacherProfile::class, 'teacher_id');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function scopeByYear($query, int $academicYearId)
    {
        return $query->where('academic_year_id', $academicYearId);
    }

    public function scopeTopRanked($query, int $limit = 20)
    {
        return $query->orderBy('total_score', 'desc')->limit($limit);
    }
}
