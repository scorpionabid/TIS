<?php

namespace App\Models;

use App\Models\Traits\HasUser;
use App\Models\Traits\HasCreator;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClassAssessmentResult extends Model
{
    use HasFactory, SoftDeletes, HasUser, HasCreator;

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
    ];

    /**
     * School Assessment relationship
     */
    public function schoolAssessment(): BelongsTo
    {
        return $this->belongsTo(SchoolAssessment::class);
    }
}
