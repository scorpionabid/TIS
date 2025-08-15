<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class TimeSlot extends Model
{
    use HasFactory;

    protected $fillable = [
        'institution_id',
        'name',
        'code',
        'start_time',
        'end_time',
        'duration_minutes',
        'slot_type',
        'applicable_days',
        'order_index',
        'is_active',
        'is_teaching_period',
        'allow_conflicts',
        'metadata',
    ];

    protected $casts = [
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'applicable_days' => 'array',
        'is_active' => 'boolean',
        'is_teaching_period' => 'boolean',
        'allow_conflicts' => 'boolean',
        'metadata' => 'array',
    ];

    const SLOT_TYPES = [
        'class' => 'Regular Class Period',
        'break' => 'Break Time',
        'lunch' => 'Lunch Break',
        'assembly' => 'Assembly Time',
        'activity' => 'Extracurricular Activity',
        'exam' => 'Examination Period',
        'preparation' => 'Teacher Preparation',
    ];

    const DAYS_OF_WEEK = [
        1 => 'Monday',
        2 => 'Tuesday', 
        3 => 'Wednesday',
        4 => 'Thursday',
        5 => 'Friday',
        6 => 'Saturday',
        7 => 'Sunday',
    ];

    /**
     * Institution relationship
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Schedule sessions using this time slot
     */
    public function scheduleSessions(): HasMany
    {
        return $this->hasMany(ScheduleSession::class);
    }

    /**
     * Scope: Active time slots
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Teaching periods only
     */
    public function scopeTeachingPeriods(Builder $query): Builder
    {
        return $query->where('is_teaching_period', true);
    }

    /**
     * Scope: By slot type
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('slot_type', $type);
    }

    /**
     * Scope: For specific day
     */
    public function scopeForDay(Builder $query, int $dayOfWeek): Builder
    {
        return $query->whereJsonContains('applicable_days', $dayOfWeek);
    }

    /**
     * Scope: Ordered by time
     */
    public function scopeOrderedByTime(Builder $query): Builder
    {
        return $query->orderBy('order_index')->orderBy('start_time');
    }

    /**
     * Get slot type label
     */
    public function getSlotTypeLabelAttribute(): string
    {
        return self::SLOT_TYPES[$this->slot_type] ?? $this->slot_type;
    }

    /**
     * Get formatted time range
     */
    public function getTimeRangeAttribute(): string
    {
        return $this->start_time->format('H:i') . ' - ' . $this->end_time->format('H:i');
    }

    /**
     * Get applicable days labels
     */
    public function getApplicableDaysLabelsAttribute(): array
    {
        return collect($this->applicable_days)
               ->map(fn($day) => self::DAYS_OF_WEEK[$day] ?? $day)
               ->toArray();
    }

    /**
     * Check if time slot is applicable for a specific day
     */
    public function isApplicableForDay(int $dayOfWeek): bool
    {
        return in_array($dayOfWeek, $this->applicable_days ?? []);
    }

    /**
     * Check if time slot overlaps with another
     */
    public function overlapsWith(TimeSlot $other): bool
    {
        // Check if they have common days
        $commonDays = array_intersect($this->applicable_days, $other->applicable_days);
        if (empty($commonDays)) {
            return false;
        }

        // Check time overlap
        $thisStart = $this->start_time;
        $thisEnd = $this->end_time;
        $otherStart = $other->start_time;
        $otherEnd = $other->end_time;

        return $thisStart < $otherEnd && $otherStart < $thisEnd;
    }

    /**
     * Get overlapping time slots
     */
    public function getOverlappingSlots(): \Illuminate\Database\Eloquent\Collection
    {
        return self::where('institution_id', $this->institution_id)
                  ->where('id', '!=', $this->id)
                  ->active()
                  ->get()
                  ->filter(fn($slot) => $this->overlapsWith($slot));
    }

    /**
     * Check if slot is currently active (happening now)
     */
    public function isCurrentlyActive(): bool
    {
        $now = now();
        $currentTime = $now->format('H:i');
        $currentDay = $now->dayOfWeek === 0 ? 7 : $now->dayOfWeek; // Convert Sunday from 0 to 7

        return $this->isApplicableForDay($currentDay) &&
               $currentTime >= $this->start_time->format('H:i') &&
               $currentTime <= $this->end_time->format('H:i');
    }

    /**
     * Get next occurrence of this time slot
     */
    public function getNextOccurrence(): ?Carbon
    {
        $now = now();
        $currentDay = $now->dayOfWeek === 0 ? 7 : $now->dayOfWeek;

        // Find next applicable day
        $applicableDays = collect($this->applicable_days)->sort();
        
        // Try to find a day this week
        $nextDay = $applicableDays->first(function ($day) use ($currentDay, $now) {
            if ($day > $currentDay) {
                return true;
            }
            if ($day === $currentDay) {
                return $now->format('H:i') < $this->start_time->format('H:i');
            }
            return false;
        });

        if ($nextDay) {
            $daysToAdd = $nextDay - $currentDay;
        } else {
            // Next week
            $daysToAdd = 7 - $currentDay + $applicableDays->first();
        }

        return $now->startOfDay()
                  ->addDays($daysToAdd)
                  ->setTimeFrom($this->start_time);
    }

    /**
     * Create standard time slots for institution
     */
    public static function createStandardSlots(Institution $institution): array
    {
        $standardSlots = [
            ['name' => 'Morning Assembly', 'start' => '08:00', 'end' => '08:15', 'type' => 'assembly'],
            ['name' => '1st Period', 'start' => '08:15', 'end' => '09:00', 'type' => 'class'],
            ['name' => '2nd Period', 'start' => '09:00', 'end' => '09:45', 'type' => 'class'],
            ['name' => 'Short Break', 'start' => '09:45', 'end' => '10:00', 'type' => 'break'],
            ['name' => '3rd Period', 'start' => '10:00', 'end' => '10:45', 'type' => 'class'],
            ['name' => '4th Period', 'start' => '10:45', 'end' => '11:30', 'type' => 'class'],
            ['name' => 'Long Break', 'start' => '11:30', 'end' => '11:45', 'type' => 'break'],
            ['name' => '5th Period', 'start' => '11:45', 'end' => '12:30', 'type' => 'class'],
            ['name' => '6th Period', 'start' => '12:30', 'end' => '13:15', 'type' => 'class'],
            ['name' => 'Lunch Break', 'start' => '13:15', 'end' => '14:00', 'type' => 'lunch'],
            ['name' => '7th Period', 'start' => '14:00', 'end' => '14:45', 'type' => 'class'],
            ['name' => '8th Period', 'start' => '14:45', 'end' => '15:30', 'type' => 'class'],
        ];

        $createdSlots = [];
        foreach ($standardSlots as $index => $slotData) {
            $startTime = Carbon::createFromFormat('H:i', $slotData['start']);
            $endTime = Carbon::createFromFormat('H:i', $slotData['end']);
            
            $slot = self::create([
                'institution_id' => $institution->id,
                'name' => $slotData['name'],
                'code' => 'P' . ($index + 1),
                'start_time' => $startTime,
                'end_time' => $endTime,
                'duration_minutes' => $startTime->diffInMinutes($endTime),
                'slot_type' => $slotData['type'],
                'applicable_days' => [1, 2, 3, 4, 5], // Monday to Friday
                'order_index' => $index + 1,
                'is_active' => true,
                'is_teaching_period' => $slotData['type'] === 'class',
                'allow_conflicts' => false,
            ]);

            $createdSlots[] = $slot;
        }

        return $createdSlots;
    }

    /**
     * Get usage statistics
     */
    public function getUsageStatistics(): array
    {
        $totalSessions = $this->scheduleSessions()->count();
        $activeSessions = $this->scheduleSessions()
                              ->whereHas('schedule', fn($q) => $q->where('status', 'active'))
                              ->count();

        return [
            'total_sessions_scheduled' => $totalSessions,
            'active_sessions' => $activeSessions,
            'utilization_rate' => $totalSessions > 0 ? ($activeSessions / $totalSessions) * 100 : 0,
            'most_used_day' => $this->getMostUsedDay(),
            'average_sessions_per_week' => $this->getAverageSessionsPerWeek(),
        ];
    }

    /**
     * Get most used day for this time slot
     */
    protected function getMostUsedDay(): ?string
    {
        $dayUsage = $this->scheduleSessions()
                         ->selectRaw('day_of_week, COUNT(*) as count')
                         ->groupBy('day_of_week')
                         ->orderByDesc('count')
                         ->first();

        return $dayUsage ? ucfirst($dayUsage->day_of_week) : null;
    }

    /**
     * Get average sessions per week
     */
    protected function getAverageSessionsPerWeek(): float
    {
        $weeks = $this->scheduleSessions()
                     ->selectRaw('YEARWEEK(created_at) as week')
                     ->distinct()
                     ->count();

        if ($weeks === 0) return 0;

        return $this->scheduleSessions()->count() / $weeks;
    }

    /**
     * Validate time slot doesn't conflict with existing slots
     */
    public function validateNoConflicts(): array
    {
        $conflicts = [];
        $overlapping = $this->getOverlappingSlots();

        foreach ($overlapping as $slot) {
            if (!$this->allow_conflicts && !$slot->allow_conflicts) {
                $conflicts[] = [
                    'slot_id' => $slot->id,
                    'slot_name' => $slot->name,
                    'conflict_type' => 'time_overlap',
                    'message' => "Overlaps with {$slot->name} ({$slot->time_range})",
                ];
            }
        }

        return $conflicts;
    }
}