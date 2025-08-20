<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SurveyVersion extends Model
{
    use HasFactory;

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'survey_id',
        'version_number',
        'structure',
        'created_by',
        'created_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'structure' => 'array',
            'version_number' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get the survey that this version belongs to.
     */
    public function survey(): BelongsTo
    {
        return $this->belongsTo(Survey::class);
    }

    /**
     * Get the user who created this version.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope to get versions by survey.
     */
    public function scopeBySurvey($query, int $surveyId)
    {
        return $query->where('survey_id', $surveyId);
    }

    /**
     * Scope to get latest version for a survey.
     */
    public function scopeLatestForSurvey($query, int $surveyId)
    {
        return $query->where('survey_id', $surveyId)
                    ->orderBy('version_number', 'desc')
                    ->limit(1);
    }
}