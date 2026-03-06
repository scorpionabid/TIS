<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleGenerationSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'institution_id',
        'working_days',
        'daily_periods',
        'period_duration',
        'break_periods',
        'lunch_break_period',
        'first_period_start',
        'break_duration',
        'lunch_duration',
        'generation_preferences',
        'is_active',
    ];

    protected $casts = [
        'working_days' => 'array',
        'break_periods' => 'array',
        'generation_preferences' => 'array',
        'is_active' => 'boolean',
        'daily_periods' => 'integer',
        'period_duration' => 'integer',
        'lunch_break_period' => 'integer',
        'break_duration' => 'integer',
        'lunch_duration' => 'integer',
        'first_period_start' => 'datetime:H:i',
    ];

    /**
     * Get the institution that owns this setting.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Scope to get active settings.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get the default working days (Monday to Friday).
     */
    public function getWorkingDaysAttribute($value): array
    {
        $decoded = json_decode($value, true);

        return $decoded ?? [1, 2, 3, 4, 5]; // Default Monday to Friday
    }

    /**
     * Get the break periods array.
     */
    public function getBreakPeriodsAttribute($value): array
    {
        $decoded = json_decode($value, true);

        return $decoded ?? [3, 6]; // Default after 3rd and 6th period
    }

    /**
     * Generate time slots based on settings.
     */
    public function generateTimeSlots(): array
    {
        $timeSlots = [];
        $currentTime = $this->first_period_start instanceof Carbon
            ? $this->first_period_start->copy()
            : Carbon::createFromFormat('H:i', $this->first_period_start);

        for ($period = 1; $period <= $this->daily_periods; $period++) {
            $startTime = $currentTime->copy();
            $endTime = $currentTime->copy()->addMinutes($this->period_duration);

            $timeSlots[] = [
                'period_number' => $period,
                'start_time' => $startTime->format('H:i'),
                'end_time' => $endTime->format('H:i'),
                'duration' => $this->period_duration,
                'is_break' => false,
                'slot_type' => 'lesson',
            ];

            // Add break after this period if it's in break_periods
            $isScheduledBreak = in_array($period, $this->break_periods);
            $isLunchBreak = $this->lunch_break_period && (int) $period === (int) $this->lunch_break_period;

            if ($isScheduledBreak || $isLunchBreak) {
                $breakDuration = $isLunchBreak
                    ? $this->lunch_duration
                    : $this->break_duration;

                $breakStart = $endTime->copy();
                $breakEnd = $breakStart->copy()->addMinutes($breakDuration);

                $timeSlots[] = [
                    'period_number' => $period . '_break',
                    'start_time' => $breakStart->format('H:i'),
                    'end_time' => $breakEnd->format('H:i'),
                    'duration' => $breakDuration,
                    'is_break' => true,
                    'slot_type' => $isLunchBreak ? 'lunch' : 'break',
                ];

                $currentTime = $breakEnd;
            } else {
                $currentTime = $endTime;
            }
        }

        return $timeSlots;
    }

    /**
     * Calculate total daily duration in minutes.
     */
    public function getTotalDailyDuration(): int
    {
        $lessonTime = $this->daily_periods * $this->period_duration;
        $breakTime = count($this->break_periods) * $this->break_duration;
        $lunchTime = $this->lunch_break_period ? $this->lunch_duration : 0;

        return $lessonTime + $breakTime + $lunchTime;
    }

    /**
     * Get the end time of the school day.
     */
    public function getSchoolEndTime(): string
    {
        $totalMinutes = $this->getTotalDailyDuration();

        return date('H:i', strtotime($this->first_period_start . ' +' . $totalMinutes . ' minutes'));
    }

    /**
     * Validate if settings are valid for schedule generation.
     */
    public function validateForGeneration(): array
    {
        $errors = [];

        if (empty($this->working_days)) {
            $errors[] = 'Working days must be specified';
        }

        if ($this->daily_periods < 1 || $this->daily_periods > 12) {
            $errors[] = 'Daily periods must be between 1 and 12';
        }

        if ($this->period_duration < 30 || $this->period_duration > 120) {
            $errors[] = 'Period duration must be between 30 and 120 minutes';
        }

        if (! empty($this->break_periods)) {
            foreach ($this->break_periods as $breakPeriod) {
                if ($breakPeriod > $this->daily_periods) {
                    $errors[] = "Break period {$breakPeriod} exceeds daily periods";
                }
            }
        }

        return $errors;
    }

    /**
     * Get default generation preferences.
     */
    public static function getDefaultPreferences(): array
    {
        return [
            'prioritize_teacher_preferences' => true,
            'minimize_gaps' => true,
            'balance_daily_load' => true,
            'avoid_late_periods' => false,
            'prefer_morning_core_subjects' => true,
            'max_consecutive_same_subject' => 2,
            'min_break_between_same_subject' => 1,
            'room_optimization' => true,
            'conflict_resolution_strategy' => 'balanced', // 'teacher_priority', 'class_priority', 'balanced'
        ];
    }

    /**
     * Merge with default preferences.
     */
    public function getGenerationPreferences(): array
    {
        $defaults = self::getDefaultPreferences();
        $custom = $this->generation_preferences ?? [];

        return array_merge($defaults, $custom);
    }
}
