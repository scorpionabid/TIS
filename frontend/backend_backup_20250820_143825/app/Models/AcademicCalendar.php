<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class AcademicCalendar extends Model
{
    use HasFactory;

    protected $fillable = [
        'academic_year_id',
        'institution_id',
        'name',
        'calendar_type',
        'start_date',
        'end_date',
        'first_semester_start',
        'first_semester_end',
        'second_semester_start',
        'second_semester_end',
        'working_days',
        'working_hours',
        'holidays',
        'special_events',
        'exam_periods',
        'min_teaching_days',
        'max_daily_periods',
        'calendar_rules',
        'status',
        'is_default',
        'created_by',
        'approved_by',
        'approved_at',
        'metadata',
        'notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'first_semester_start' => 'date',
        'first_semester_end' => 'date',
        'second_semester_start' => 'date',
        'second_semester_end' => 'date',
        'working_days' => 'array',
        'working_hours' => 'array',
        'holidays' => 'array',
        'special_events' => 'array',
        'exam_periods' => 'array',
        'calendar_rules' => 'array',
        'is_default' => 'boolean',
        'approved_at' => 'datetime',
        'metadata' => 'array',
    ];

    const CALENDAR_TYPES = [
        'school' => 'Regular School Calendar',
        'exam' => 'Examination Schedule',
        'holiday' => 'Holiday Calendar',
        'event' => 'Special Events Calendar',
        'training' => 'Teacher Training Calendar',
    ];

    const STATUSES = [
        'draft' => 'Draft',
        'pending_approval' => 'Pending Approval',
        'approved' => 'Approved',
        'active' => 'Active',
        'archived' => 'Archived',
    ];

    /**
     * Academic year relationship
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /**
     * Institution relationship
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
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
     * Scope: Active calendars
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope: Default calendars
     */
    public function scopeDefault(Builder $query): Builder
    {
        return $query->where('is_default', true);
    }

    /**
     * Scope: By calendar type
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('calendar_type', $type);
    }

    /**
     * Scope: Current period
     */
    public function scopeCurrent(Builder $query): Builder
    {
        $today = today();
        return $query->where('start_date', '<=', $today)
                    ->where('end_date', '>=', $today);
    }

    /**
     * Get calendar type label
     */
    public function getCalendarTypeLabelAttribute(): string
    {
        return self::CALENDAR_TYPES[$this->calendar_type] ?? $this->calendar_type;
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    /**
     * Get total calendar days
     */
    public function getTotalDaysAttribute(): int
    {
        return $this->start_date->diffInDays($this->end_date) + 1;
    }

    /**
     * Get working days count
     */
    public function getWorkingDaysCountAttribute(): int
    {
        $workingDaysOfWeek = $this->working_days ?? [1, 2, 3, 4, 5];
        $holidays = collect($this->holidays ?? [])->pluck('date')->map(fn($date) => Carbon::parse($date)->toDateString());
        
        $period = CarbonPeriod::create($this->start_date, $this->end_date);
        $workingDays = 0;

        foreach ($period as $date) {
            $dayOfWeek = $date->dayOfWeek === 0 ? 7 : $date->dayOfWeek; // Convert Sunday from 0 to 7
            
            if (in_array($dayOfWeek, $workingDaysOfWeek) && !$holidays->contains($date->toDateString())) {
                $workingDays++;
            }
        }

        return $workingDays;
    }

    /**
     * Check if a date is a working day
     */
    public function isWorkingDay(Carbon $date): bool
    {
        $dayOfWeek = $date->dayOfWeek === 0 ? 7 : $date->dayOfWeek;
        $workingDays = $this->working_days ?? [1, 2, 3, 4, 5];
        
        if (!in_array($dayOfWeek, $workingDays)) {
            return false;
        }

        // Check if it's a holiday
        $holidays = collect($this->holidays ?? [])->pluck('date');
        return !$holidays->contains($date->toDateString());
    }

    /**
     * Check if a date is a holiday
     */
    public function isHoliday(Carbon $date): bool
    {
        $holidays = collect($this->holidays ?? []);
        return $holidays->contains('date', $date->toDateString());
    }

    /**
     * Get holiday information for a date
     */
    public function getHolidayInfo(Carbon $date): ?array
    {
        $holidays = collect($this->holidays ?? []);
        return $holidays->firstWhere('date', $date->toDateString());
    }

    /**
     * Get working days between two dates
     */
    public function getWorkingDaysBetween(Carbon $startDate, Carbon $endDate): int
    {
        $period = CarbonPeriod::create($startDate, $endDate);
        $workingDays = 0;

        foreach ($period as $date) {
            if ($this->isWorkingDay($date)) {
                $workingDays++;
            }
        }

        return $workingDays;
    }

    /**
     * Get next working day after given date
     */
    public function getNextWorkingDay(Carbon $date): ?Carbon
    {
        $nextDate = $date->copy()->addDay();
        $maxAttempts = 14; // Prevent infinite loop
        $attempts = 0;

        while ($attempts < $maxAttempts) {
            if ($nextDate->gt($this->end_date)) {
                return null; // Beyond calendar period
            }

            if ($this->isWorkingDay($nextDate)) {
                return $nextDate;
            }

            $nextDate->addDay();
            $attempts++;
        }

        return null;
    }

    /**
     * Get current semester
     */
    public function getCurrentSemester(): ?string
    {
        $today = today();

        if ($this->first_semester_start && $this->first_semester_end) {
            if ($today->between($this->first_semester_start, $this->first_semester_end)) {
                return 'first';
            }
        }

        if ($this->second_semester_start && $this->second_semester_end) {
            if ($today->between($this->second_semester_start, $this->second_semester_end)) {
                return 'second';
            }
        }

        return null;
    }

    /**
     * Get semester information
     */
    public function getSemesterInfo(string $semester): ?array
    {
        switch ($semester) {
            case 'first':
                if ($this->first_semester_start && $this->first_semester_end) {
                    return [
                        'name' => 'First Semester',
                        'start_date' => $this->first_semester_start,
                        'end_date' => $this->first_semester_end,
                        'working_days' => $this->getWorkingDaysBetween($this->first_semester_start, $this->first_semester_end),
                    ];
                }
                break;
            
            case 'second':
                if ($this->second_semester_start && $this->second_semester_end) {
                    return [
                        'name' => 'Second Semester',
                        'start_date' => $this->second_semester_start,
                        'end_date' => $this->second_semester_end,
                        'working_days' => $this->getWorkingDaysBetween($this->second_semester_start, $this->second_semester_end),
                    ];
                }
                break;
        }

        return null;
    }

    /**
     * Get upcoming events
     */
    public function getUpcomingEvents(int $days = 30): array
    {
        $startDate = today();
        $endDate = $startDate->copy()->addDays($days);
        $events = [];

        // Add holidays
        $holidays = collect($this->holidays ?? []);
        foreach ($holidays as $holiday) {
            $holidayDate = Carbon::parse($holiday['date']);
            if ($holidayDate->between($startDate, $endDate)) {
                $events[] = [
                    'type' => 'holiday',
                    'date' => $holidayDate,
                    'title' => $holiday['name'] ?? 'Holiday',
                    'description' => $holiday['description'] ?? null,
                ];
            }
        }

        // Add special events
        $specialEvents = collect($this->special_events ?? []);
        foreach ($specialEvents as $event) {
            $eventDate = Carbon::parse($event['date']);
            if ($eventDate->between($startDate, $endDate)) {
                $events[] = [
                    'type' => 'event',
                    'date' => $eventDate,
                    'title' => $event['name'] ?? 'Special Event',
                    'description' => $event['description'] ?? null,
                ];
            }
        }

        // Add exam periods
        $examPeriods = collect($this->exam_periods ?? []);
        foreach ($examPeriods as $exam) {
            $examStart = Carbon::parse($exam['start_date']);
            $examEnd = Carbon::parse($exam['end_date']);
            
            if ($examStart->between($startDate, $endDate) || $examEnd->between($startDate, $endDate)) {
                $events[] = [
                    'type' => 'exam',
                    'date' => $examStart,
                    'end_date' => $examEnd,
                    'title' => $exam['name'] ?? 'Examination Period',
                    'description' => $exam['description'] ?? null,
                ];
            }
        }

        // Sort events by date
        usort($events, fn($a, $b) => $a['date']->compare($b['date']));

        return $events;
    }

    /**
     * Validate calendar consistency
     */
    public function validateCalendar(): array
    {
        $errors = [];

        // Check date consistency
        if ($this->start_date->gte($this->end_date)) {
            $errors[] = 'Start date must be before end date';
        }

        // Check semester dates
        if ($this->first_semester_start && $this->first_semester_end) {
            if ($this->first_semester_start->gte($this->first_semester_end)) {
                $errors[] = 'First semester start must be before end';
            }
            if ($this->first_semester_start->lt($this->start_date) || $this->first_semester_end->gt($this->end_date)) {
                $errors[] = 'First semester dates must be within calendar period';
            }
        }

        if ($this->second_semester_start && $this->second_semester_end) {
            if ($this->second_semester_start->gte($this->second_semester_end)) {
                $errors[] = 'Second semester start must be before end';
            }
            if ($this->second_semester_start->lt($this->start_date) || $this->second_semester_end->gt($this->end_date)) {
                $errors[] = 'Second semester dates must be within calendar period';
            }
        }

        // Check minimum teaching days
        if ($this->working_days_count < $this->min_teaching_days) {
            $errors[] = "Calendar has {$this->working_days_count} working days, but minimum {$this->min_teaching_days} required";
        }

        // Validate working days
        $workingDays = $this->working_days ?? [];
        if (empty($workingDays)) {
            $errors[] = 'At least one working day must be specified';
        }

        foreach ($workingDays as $day) {
            if (!in_array($day, [1, 2, 3, 4, 5, 6, 7])) {
                $errors[] = "Invalid working day: {$day}";
            }
        }

        return $errors;
    }

    /**
     * Activate calendar
     */
    public function activate(): bool
    {
        $errors = $this->validateCalendar();
        if (!empty($errors)) {
            throw new \Exception('Calendar validation failed: ' . implode(', ', $errors));
        }

        // Deactivate other active calendars of same type for this institution
        self::where('institution_id', $this->institution_id)
           ->where('calendar_type', $this->calendar_type)
           ->where('id', '!=', $this->id)
           ->where('status', 'active')
           ->update(['status' => 'archived']);

        return $this->update(['status' => 'active']);
    }

    /**
     * Create standard academic calendar
     */
    public static function createStandardCalendar(
        AcademicYear $academicYear,
        Institution $institution,
        User $creator
    ): self {
        return self::create([
            'academic_year_id' => $academicYear->id,
            'institution_id' => $institution->id,
            'name' => $academicYear->name . ' School Calendar',
            'calendar_type' => 'school',
            'start_date' => $academicYear->start_date,
            'end_date' => $academicYear->end_date,
            'first_semester_start' => $academicYear->start_date,
            'first_semester_end' => $academicYear->start_date->copy()->addMonths(4),
            'second_semester_start' => $academicYear->start_date->copy()->addMonths(5),
            'second_semester_end' => $academicYear->end_date,
            'working_days' => [1, 2, 3, 4, 5], // Monday to Friday
            'working_hours' => [
                'start_time' => '08:00',
                'end_time' => '15:30',
                'lunch_break' => ['start' => '13:15', 'end' => '14:00'],
            ],
            'holidays' => self::getStandardHolidays($academicYear),
            'min_teaching_days' => 180,
            'max_daily_periods' => 8,
            'status' => 'draft',
            'is_default' => true,
            'created_by' => $creator->id,
        ]);
    }

    /**
     * Get standard holidays for Azerbaijan
     */
    protected static function getStandardHolidays(AcademicYear $academicYear): array
    {
        $year = $academicYear->start_date->year;
        $nextYear = $year + 1;

        return [
            ['date' => "{$year}-01-01", 'name' => 'New Year', 'type' => 'national'],
            ['date' => "{$year}-01-20", 'name' => 'Martyrs Day', 'type' => 'national'],
            ['date' => "{$year}-03-08", 'name' => 'Women\'s Day', 'type' => 'national'],
            ['date' => "{$year}-03-20", 'name' => 'Novruz Holiday', 'type' => 'national'],
            ['date' => "{$year}-03-21", 'name' => 'Novruz Holiday', 'type' => 'national'],
            ['date' => "{$year}-03-22", 'name' => 'Novruz Holiday', 'type' => 'national'],
            ['date' => "{$year}-03-23", 'name' => 'Novruz Holiday', 'type' => 'national'],
            ['date' => "{$year}-03-24", 'name' => 'Novruz Holiday', 'type' => 'national'],
            ['date' => "{$year}-05-09", 'name' => 'Victory Day', 'type' => 'national'],
            ['date' => "{$year}-05-28", 'name' => 'Republic Day', 'type' => 'national'],
            ['date' => "{$year}-06-15", 'name' => 'National Salvation Day', 'type' => 'national'],
            ['date' => "{$year}-06-26", 'name' => 'Armed Forces Day', 'type' => 'national'],
            ['date' => "{$year}-10-18", 'name' => 'Independence Day', 'type' => 'national'],
            ['date' => "{$year}-11-12", 'name' => 'Constitution Day', 'type' => 'national'],
            ['date' => "{$year}-11-17", 'name' => 'National Revival Day', 'type' => 'national'],
            ['date' => "{$year}-12-31", 'name' => 'World Solidarity Day', 'type' => 'national'],
        ];
    }
}