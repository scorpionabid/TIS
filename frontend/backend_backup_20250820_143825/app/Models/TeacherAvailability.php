<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class TeacherAvailability extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'day_of_week',
        'start_time',
        'end_time',
        'availability_type',
        'recurrence_type',
        'effective_date',
        'end_date',
        'priority',
        'is_flexible',
        'is_mandatory',
        'reason',
        'description',
        'location',
        'created_by',
        'approved_by',
        'approved_at',
        'status',
        'conflict_resolution_priority',
        'allow_emergency_override',
        'metadata',
    ];

    protected $casts = [
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'effective_date' => 'date',
        'end_date' => 'date',
        'is_flexible' => 'boolean',
        'is_mandatory' => 'boolean',
        'approved_at' => 'datetime',
        'allow_emergency_override' => 'boolean',
        'metadata' => 'array',
    ];

    const AVAILABILITY_TYPES = [
        'available' => 'Available for Teaching',
        'unavailable' => 'Not Available',
        'preferred' => 'Preferred Hours',
        'restricted' => 'Limited Availability',
        'meeting' => 'Administrative Meeting',
        'training' => 'Professional Development',
        'preparation' => 'Lesson Preparation',
        'examination' => 'Exam Supervision',
        'consultation' => 'Student Consultation',
    ];

    const RECURRENCE_TYPES = [
        'weekly' => 'Every Week',
        'bi_weekly' => 'Every Two Weeks',
        'monthly' => 'Monthly',
        'one_time' => 'Single Occurrence',
        'term' => 'Entire Term',
        'year' => 'Entire Academic Year',
    ];

    const STATUSES = [
        'pending' => 'Pending Approval',
        'approved' => 'Approved',
        'rejected' => 'Rejected',
        'active' => 'Active',
        'expired' => 'Expired',
    ];

    const DAYS_OF_WEEK = [
        'monday' => 'Monday',
        'tuesday' => 'Tuesday',
        'wednesday' => 'Wednesday',
        'thursday' => 'Thursday',
        'friday' => 'Friday',
        'saturday' => 'Saturday',
        'sunday' => 'Sunday',
    ];

    /**
     * Teacher relationship
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Created by user relationship
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Approved by user relationship
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Scope: Active availability records
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active')
                    ->where('effective_date', '<=', today())
                    ->where(function ($q) {
                        $q->whereNull('end_date')
                          ->orWhere('end_date', '>=', today());
                    });
    }

    /**
     * Scope: Available periods
     */
    public function scopeAvailable(Builder $query): Builder
    {
        return $query->whereIn('availability_type', ['available', 'preferred']);
    }

    /**
     * Scope: Unavailable periods
     */
    public function scopeUnavailable(Builder $query): Builder
    {
        return $query->whereIn('availability_type', ['unavailable', 'restricted', 'meeting', 'training']);
    }

    /**
     * Scope: By day of week
     */
    public function scopeForDay(Builder $query, string $dayOfWeek): Builder
    {
        return $query->where('day_of_week', $dayOfWeek);
    }

    /**
     * Scope: Mandatory availability
     */
    public function scopeMandatory(Builder $query): Builder
    {
        return $query->where('is_mandatory', true);
    }

    /**
     * Scope: Flexible availability
     */
    public function scopeFlexible(Builder $query): Builder
    {
        return $query->where('is_flexible', true);
    }

    /**
     * Scope: Current period
     */
    public function scopeCurrent(Builder $query): Builder
    {
        return $query->where('effective_date', '<=', today())
                    ->where(function ($q) {
                        $q->whereNull('end_date')
                          ->orWhere('end_date', '>=', today());
                    });
    }

    /**
     * Get availability type label
     */
    public function getAvailabilityTypeLabelAttribute(): string
    {
        return self::AVAILABILITY_TYPES[$this->availability_type] ?? $this->availability_type;
    }

    /**
     * Get recurrence type label
     */
    public function getRecurrenceTypeLabelAttribute(): string
    {
        return self::RECURRENCE_TYPES[$this->recurrence_type] ?? $this->recurrence_type;
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    /**
     * Get day of week label
     */
    public function getDayOfWeekLabelAttribute(): string
    {
        return self::DAYS_OF_WEEK[$this->day_of_week] ?? $this->day_of_week;
    }

    /**
     * Get time range
     */
    public function getTimeRangeAttribute(): string
    {
        return $this->start_time->format('H:i') . ' - ' . $this->end_time->format('H:i');
    }

    /**
     * Check if availability is currently active
     */
    public function isCurrentlyActive(): bool
    {
        $today = today();
        $now = now();
        
        // Check date range
        if ($this->effective_date > $today || ($this->end_date && $this->end_date < $today)) {
            return false;
        }

        // Check if today matches the day of week
        $currentDayOfWeek = strtolower($now->format('l'));
        if ($this->day_of_week !== $currentDayOfWeek) {
            return false;
        }

        // Check time range
        $currentTime = $now->format('H:i');
        return $currentTime >= $this->start_time->format('H:i') && 
               $currentTime <= $this->end_time->format('H:i');
    }

    /**
     * Check if conflicts with another availability
     */
    public function conflictsWith(TeacherAvailability $other): bool
    {
        // Different teachers can't conflict
        if ($this->teacher_id !== $other->teacher_id) {
            return false;
        }

        // Different days can't conflict
        if ($this->day_of_week !== $other->day_of_week) {
            return false;
        }

        // Check date overlap
        if (!$this->dateRangesOverlap($other)) {
            return false;
        }

        // Check time overlap
        return $this->timeRangesOverlap($other);
    }

    /**
     * Check if date ranges overlap
     */
    protected function dateRangesOverlap(TeacherAvailability $other): bool
    {
        $thisStart = $this->effective_date;
        $thisEnd = $this->end_date ?? Carbon::parse('2099-12-31');
        $otherStart = $other->effective_date;
        $otherEnd = $other->end_date ?? Carbon::parse('2099-12-31');

        return $thisStart <= $otherEnd && $otherStart <= $thisEnd;
    }

    /**
     * Check if time ranges overlap
     */
    protected function timeRangesOverlap(TeacherAvailability $other): bool
    {
        $thisStart = $this->start_time;
        $thisEnd = $this->end_time;
        $otherStart = $other->start_time;
        $otherEnd = $other->end_time;

        return $thisStart < $otherEnd && $otherStart < $thisEnd;
    }

    /**
     * Get conflicting availabilities
     */
    public function getConflictingAvailabilities(): \Illuminate\Database\Eloquent\Collection
    {
        return self::where('teacher_id', $this->teacher_id)
                  ->where('id', '!=', $this->id)
                  ->where('day_of_week', $this->day_of_week)
                  ->active()
                  ->get()
                  ->filter(fn($availability) => $this->conflictsWith($availability));
    }

    /**
     * Check if teacher is available at specific time
     */
    public static function isTeacherAvailable(
        int $teacherId, 
        string $dayOfWeek, 
        Carbon $startTime, 
        Carbon $endTime,
        ?Carbon $date = null
    ): array {
        $date = $date ?? today();
        
        $availabilities = self::where('teacher_id', $teacherId)
                             ->forDay($dayOfWeek)
                             ->current()
                             ->active()
                             ->orderBy('priority')
                             ->get();

        $result = [
            'is_available' => true,
            'conflicts' => [],
            'restrictions' => [],
            'preferences' => [],
        ];

        foreach ($availabilities as $availability) {
            // Check if the requested time overlaps with this availability
            if (!$availability->timeRangesOverlap((object)[
                'start_time' => $startTime,
                'end_time' => $endTime
            ])) {
                continue;
            }

            switch ($availability->availability_type) {
                case 'unavailable':
                case 'meeting':
                case 'training':
                    if (!$availability->is_flexible && !$availability->allow_emergency_override) {
                        $result['is_available'] = false;
                        $result['conflicts'][] = [
                            'type' => $availability->availability_type,
                            'time_range' => $availability->time_range,
                            'reason' => $availability->reason,
                            'is_mandatory' => $availability->is_mandatory,
                        ];
                    } else {
                        $result['restrictions'][] = [
                            'type' => $availability->availability_type,
                            'time_range' => $availability->time_range,
                            'reason' => $availability->reason,
                            'is_flexible' => $availability->is_flexible,
                            'allow_override' => $availability->allow_emergency_override,
                        ];
                    }
                    break;

                case 'restricted':
                    $result['restrictions'][] = [
                        'type' => 'restricted',
                        'time_range' => $availability->time_range,
                        'reason' => $availability->reason,
                        'priority' => $availability->priority,
                    ];
                    break;

                case 'preferred':
                    $result['preferences'][] = [
                        'type' => 'preferred',
                        'time_range' => $availability->time_range,
                        'priority' => $availability->priority,
                    ];
                    break;

                case 'available':
                    // Teacher is explicitly available
                    break;
            }
        }

        return $result;
    }

    /**
     * Get teacher's weekly availability summary
     */
    public static function getWeeklyAvailabilitySummary(int $teacherId): array
    {
        $availabilities = self::where('teacher_id', $teacherId)
                             ->active()
                             ->orderBy('day_of_week')
                             ->orderBy('start_time')
                             ->get()
                             ->groupBy('day_of_week');

        $summary = [];
        
        foreach (self::DAYS_OF_WEEK as $dayKey => $dayLabel) {
            $dayAvailabilities = $availabilities->get($dayKey, collect());
            
            $summary[$dayKey] = [
                'day' => $dayLabel,
                'total_periods' => $dayAvailabilities->count(),
                'available_periods' => $dayAvailabilities->where('availability_type', 'available')->count(),
                'unavailable_periods' => $dayAvailabilities->whereIn('availability_type', ['unavailable', 'meeting', 'training'])->count(),
                'preferred_periods' => $dayAvailabilities->where('availability_type', 'preferred')->count(),
                'restricted_periods' => $dayAvailabilities->where('availability_type', 'restricted')->count(),
                'total_available_hours' => $dayAvailabilities->where('availability_type', 'available')
                                                          ->sum(function ($a) {
                                                              return $a->start_time->diffInMinutes($a->end_time) / 60;
                                                          }),
                'periods' => $dayAvailabilities->map(function ($availability) {
                    return [
                        'time_range' => $availability->time_range,
                        'type' => $availability->availability_type_label,
                        'reason' => $availability->reason,
                        'is_flexible' => $availability->is_flexible,
                        'priority' => $availability->priority,
                    ];
                })->toArray(),
            ];
        }

        return $summary;
    }

    /**
     * Create standard availability for teacher
     */
    public static function createStandardAvailability(User $teacher, User $creator): array
    {
        $standardHours = [
            'monday' => ['08:00', '15:30'],
            'tuesday' => ['08:00', '15:30'],
            'wednesday' => ['08:00', '15:30'],
            'thursday' => ['08:00', '15:30'],
            'friday' => ['08:00', '15:30'],
        ];

        $createdAvailabilities = [];

        foreach ($standardHours as $day => $hours) {
            $availability = self::create([
                'teacher_id' => $teacher->id,
                'day_of_week' => $day,
                'start_time' => Carbon::createFromFormat('H:i', $hours[0]),
                'end_time' => Carbon::createFromFormat('H:i', $hours[1]),
                'availability_type' => 'available',
                'recurrence_type' => 'weekly',
                'effective_date' => today(),
                'end_date' => null,
                'priority' => 5,
                'is_flexible' => true,
                'is_mandatory' => false,
                'reason' => 'Standard teaching hours',
                'created_by' => $creator->id,
                'status' => 'active',
                'conflict_resolution_priority' => 5,
                'allow_emergency_override' => true,
            ]);

            $createdAvailabilities[] = $availability;
        }

        return $createdAvailabilities;
    }

    /**
     * Approve availability
     */
    public function approve(User $approver): bool
    {
        return $this->update([
            'status' => 'approved',
            'approved_by' => $approver->id,
            'approved_at' => now(),
        ]);
    }

    /**
     * Reject availability
     */
    public function reject(User $approver, string $reason): bool
    {
        return $this->update([
            'status' => 'rejected',
            'approved_by' => $approver->id,
            'approved_at' => now(),
            'reason' => $reason,
        ]);
    }

    /**
     * Activate availability
     */
    public function activate(): bool
    {
        if ($this->status !== 'approved') {
            throw new \Exception('Availability must be approved before activation');
        }

        return $this->update(['status' => 'active']);
    }

    /**
     * Get optimal time slots for teacher
     */
    public function getOptimalTimeSlots(string $dayOfWeek): array
    {
        $teacherAvailabilities = self::where('teacher_id', $this->teacher_id)
                                   ->forDay($dayOfWeek)
                                   ->active()
                                   ->get();

        $optimalSlots = [];

        foreach ($teacherAvailabilities as $availability) {
            $score = $this->calculateOptimalityScore($availability);
            
            $optimalSlots[] = [
                'availability_id' => $availability->id,
                'time_range' => $availability->time_range,
                'type' => $availability->availability_type,
                'score' => $score,
                'reason' => $this->getOptimalityReason($availability),
            ];
        }

        // Sort by score (highest first)
        usort($optimalSlots, fn($a, $b) => $b['score'] <=> $a['score']);

        return $optimalSlots;
    }

    /**
     * Calculate optimality score for availability
     */
    protected function calculateOptimalityScore(TeacherAvailability $availability): int
    {
        $score = 50; // Base score

        // Score based on availability type
        $typeScores = [
            'preferred' => 30,
            'available' => 20,
            'restricted' => -10,
            'unavailable' => -50,
            'meeting' => -30,
            'training' => -20,
        ];

        $score += $typeScores[$availability->availability_type] ?? 0;

        // Bonus for high priority
        $score += (10 - $availability->priority) * 2;

        // Bonus for flexibility
        if ($availability->is_flexible) {
            $score += 10;
        }

        // Penalty for mandatory restrictions
        if ($availability->is_mandatory && in_array($availability->availability_type, ['unavailable', 'meeting'])) {
            $score -= 20;
        }

        return max(0, min(100, $score));
    }

    /**
     * Get optimality reason
     */
    protected function getOptimalityReason(TeacherAvailability $availability): string
    {
        $reasons = [];

        if ($availability->availability_type === 'preferred') {
            $reasons[] = 'Teacher\'s preferred time';
        }

        if ($availability->is_flexible) {
            $reasons[] = 'Flexible scheduling';
        }

        if ($availability->priority <= 3) {
            $reasons[] = 'High priority availability';
        }

        if (empty($reasons)) {
            $reasons[] = 'Standard availability';
        }

        return implode(', ', $reasons);
    }

    /**
     * Clean up expired availabilities
     */
    public static function cleanupExpired(): int
    {
        return self::where('end_date', '<', today())
                  ->where('status', 'active')
                  ->update(['status' => 'expired']);
    }
}