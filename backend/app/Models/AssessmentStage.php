<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssessmentStage extends Model
{
    use HasFactory;

    protected $fillable = [
        'assessment_type_id',
        'name',
        'roman_numeral',
        'description',
        'display_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function assessmentType(): BelongsTo
    {
        return $this->belongsTo(AssessmentType::class);
    }

    public function schoolAssessments(): HasMany
    {
        return $this->hasMany(SchoolAssessment::class);
    }

    public function getDisplayNameAttribute(): string
    {
        if ($this->roman_numeral) {
            return "{$this->roman_numeral} ({$this->name})";
        }

        return $this->name;
    }
}
