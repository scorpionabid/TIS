<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClassAssessmentResult extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'school_assessment_id',
        'class_label',
        'grade_level',
        'subject',
        'student_count',
        'participant_count',
        'metadata',
        'recorded_by',
        'recorded_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'student_count' => 'integer',
        'participant_count' => 'integer',
        'recorded_at' => 'datetime',
    ];

    public function schoolAssessment(): BelongsTo
    {
        return $this->belongsTo(SchoolAssessment::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
