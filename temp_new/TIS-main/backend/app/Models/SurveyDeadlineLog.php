<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SurveyDeadlineLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'survey_id',
        'event_type',
        'notification_type',
        'days_reference',
        'recipient_count',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function survey(): BelongsTo
    {
        return $this->belongsTo(Survey::class);
    }
}
