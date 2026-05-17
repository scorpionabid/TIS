<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserCalendarEvent extends Model
{
    protected $fillable = [
        'user_id', 'title', 'type', 'date', 'time', 'link',
        'reminder_minutes', 'recurrence_rule', 'recurrence_end_date',
    ];

    protected $casts = [
        'date' => 'date',
        'recurrence_end_date' => 'date',
        'reminder_minutes' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function participants(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(User::class, 'calendar_event_participants', 'event_id', 'user_id')
            ->withPivot('status')
            ->withTimestamps();
    }
}
