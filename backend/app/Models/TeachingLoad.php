<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class TeachingLoad extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'teacher_id',
        'subject_id',
        'class_id',
        'weekly_hours',
        'total_hours',
        'academic_year_id',
        'status',
        'start_date',
        'end_date',
        'schedule_slots',
        'is_scheduled',
        'last_schedule_id',
        'last_scheduled_at',
        'scheduling_constraints',
        'preferred_consecutive_hours',
        'preferred_time_slots',
        'unavailable_periods',
        'schedule_generation_status',
        'distribution_pattern',
        'priority_level',
        'metadata',
        'institution_id'
    ];

    protected $casts = [
        'schedule_slots' => 'array',
        'scheduling_constraints' => 'array',
        'preferred_time_slots' => 'array',
        'unavailable_periods' => 'array',
        'distribution_pattern' => 'array',
        'metadata' => 'array',
        'is_scheduled' => 'boolean',
        'last_scheduled_at' => 'datetime',
        'priority_level' => 'integer',
        'weekly_hours' => 'integer',
        'preferred_consecutive_hours' => 'integer',
    ];

    /**
     * Get the teacher that has this teaching load.
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Get the subject for this teaching load.
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Get the class for this teaching load.
     */
    public function class(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    /**
     * Get the academic year for this teaching load.
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /**
     * Get the last schedule this teaching load was assigned to.
     */
    public function lastSchedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class, 'last_schedule_id');
    }

    /**
     * Get all schedule sessions for this teaching load.
     */
    public function scheduleSessions(): HasMany
    {
        return $this->hasMany(ScheduleSession::class);
    }

    /**
     * Scope to get ready-to-schedule teaching loads.
     */
    public function scopeReadyForScheduling($query)
    {
        return $query->where('schedule_generation_status', 'ready')
                    ->where('is_scheduled', false);
    }

    /**
     * Scope to get pending teaching loads.
     */
    public function scopePending($query)
    {
        return $query->where('schedule_generation_status', 'pending');
    }

    /**
     * Scope to get scheduled teaching loads.
     */
    public function scopeScheduled($query)
    {
        return $query->where('is_scheduled', true)
                    ->where('schedule_generation_status', 'scheduled');
    }

    /**
     * Scope to get teaching loads with conflicts.
     */
    public function scopeWithConflicts($query)
    {
        return $query->where('schedule_generation_status', 'conflict');
    }

    /**
     * Check if this teaching load is ready for scheduling.
     */
    public function isReadyForScheduling(): bool
    {
        return $this->schedule_generation_status === 'ready' && !$this->is_scheduled;
    }

    /**
     * Mark this teaching load as scheduled.
     */
    public function markAsScheduled(int $scheduleId): bool
    {
        return $this->update([
            'is_scheduled' => true,
            'last_schedule_id' => $scheduleId,
            'last_scheduled_at' => now(),
            'schedule_generation_status' => 'scheduled'
        ]);
    }

    /**
     * Mark this teaching load as having conflicts.
     */
    public function markAsConflicted(): bool
    {
        return $this->update([
            'schedule_generation_status' => 'conflict'
        ]);
    }

    /**
     * Reset scheduling status.
     */
    public function resetSchedulingStatus(): bool
    {
        return $this->update([
            'is_scheduled' => false,
            'last_schedule_id' => null,
            'last_scheduled_at' => null,
            'schedule_generation_status' => 'pending'
        ]);
    }

    /**
     * Get the distribution pattern or default pattern.
     */
    public function getDistributionPattern(): array
    {
        if ($this->distribution_pattern) {
            return $this->distribution_pattern;
        }

        // Default distribution pattern based on weekly hours
        if ($this->weekly_hours <= 2) {
            return ['pattern' => 'spread', 'max_consecutive' => 1]; // Spread across days
        } elseif ($this->weekly_hours <= 4) {
            return ['pattern' => 'paired', 'max_consecutive' => 2]; // Pairs of lessons
        } else {
            return ['pattern' => 'block', 'max_consecutive' => 3]; // Block scheduling
        }
    }

    /**
     * Calculate the ideal distribution for this teaching load.
     */
    public function calculateIdealDistribution(): array
    {
        $weeklyHours = $this->weekly_hours;
        $maxConsecutive = $this->preferred_consecutive_hours;
        
        $distributions = [];
        
        // Try to distribute evenly across weekdays
        $workingDays = 5; // Monday to Friday
        
        if ($weeklyHours <= $workingDays) {
            // One lesson per day or less
            for ($i = 1; $i <= $weeklyHours; $i++) {
                $distributions[] = [
                    'day' => $i,
                    'lessons' => 1,
                    'consecutive' => false
                ];
            }
        } else {
            // Multiple lessons per day
            $basePerDay = intval($weeklyHours / $workingDays);
            $remainder = $weeklyHours % $workingDays;
            
            for ($day = 1; $day <= $workingDays; $day++) {
                $lessonsThisDay = $basePerDay;
                if ($remainder > 0) {
                    $lessonsThisDay++;
                    $remainder--;
                }
                
                if ($lessonsThisDay > 0) {
                    $distributions[] = [
                        'day' => $day,
                        'lessons' => $lessonsThisDay,
                        'consecutive' => $lessonsThisDay > 1 && $lessonsThisDay <= $maxConsecutive
                    ];
                }
            }
        }
        
        return $distributions;
    }
}
