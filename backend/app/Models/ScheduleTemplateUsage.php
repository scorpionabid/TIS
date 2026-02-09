<?php

namespace App\Models;

use App\Models\Traits\HasInstitution;
use App\Models\Traits\HasUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleTemplateUsage extends Model
{
    use HasFactory, HasUser, HasInstitution;

    protected $fillable = [
        'template_id',
        'schedule_id',
        'user_id',
        'institution_id',
        'usage_context',
        'performance_rating',
        'generation_time',
        'conflicts_resolved',
        'user_feedback',
        'success_metrics',
        'used_at',
    ];

    protected $casts = [
        'usage_context' => 'array',
        'user_feedback' => 'array',
        'success_metrics' => 'array',
        'performance_rating' => 'decimal:2',
        'used_at' => 'datetime',
    ];

    /**
     * Get the template that was used
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(ScheduleTemplate::class);
    }

    /**
     * Get the schedule that was created
     */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }

}
