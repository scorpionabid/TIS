<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class DailyAttendanceSummary extends Model
{
    use HasFactory;

    protected $table = 'daily_attendance_summary';

    protected $fillable = [
        'student_id',
        'grade_id',
        'academic_year_id',
        'academic_term_id',
        'attendance_date',
        'day_type',
        'daily_status',
        'first_period_start',
        'last_period_end',
        'actual_arrival_time',
        'actual_departure_time',
        'total_periods_scheduled',
        'periods_present',
        'periods_absent',
        'periods_late',
        'periods_excused',
        'daily_attendance_rate',
        'total_minutes_scheduled',
        'minutes_present',
        'minutes_late',
        'minutes_absent',
        'absence_reason',
        'absence_authorized',
        'authorized_by',
        'authorized_at',
        'parent_notified',
        'parent_notified_at',
        'notification_details',
        'parent_acknowledged',
        'parent_acknowledged_at',
        'affected_subjects',
        'makeup_required',
        'makeup_assignments',
        'daily_notes',
        'discipline_incidents',
        'reported_by',
        'summary_generated_at',
        'temperature_check',
        'health_screening_passed',
        'health_notes',
        'transportation_status'
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'first_period_start' => 'datetime:H:i',
        'last_period_end' => 'datetime:H:i',
        'actual_arrival_time' => 'datetime:H:i',
        'actual_departure_time' => 'datetime:H:i',
        'daily_attendance_rate' => 'decimal:2',
        'authorized_at' => 'datetime',
        'parent_notified_at' => 'datetime',
        'parent_acknowledged_at' => 'datetime',
        'summary_generated_at' => 'datetime',
        'notification_details' => 'array',
        'affected_subjects' => 'array',
        'makeup_assignments' => 'array',
        'discipline_incidents' => 'array',
        'health_notes' => 'array',
        'absence_authorized' => 'boolean',
        'parent_notified' => 'boolean',
        'parent_acknowledged' => 'boolean',
        'makeup_required' => 'boolean',
        'health_screening_passed' => 'boolean',
        'temperature_check' => 'decimal:1'
    ];

    // Relationships
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function academicTerm(): BelongsTo
    {
        return $this->belongsTo(AcademicTerm::class);
    }

    public function authorizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'authorized_by');
    }

    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class, 'student_id', 'student_id')
                    ->whereDate('attendance_date', $this->attendance_date);
    }

    // Status checking methods
    public function isFullyPresent(): bool
    {
        return $this->daily_status === 'full_present';
    }

    public function isFullyAbsent(): bool
    {
        return $this->daily_status === 'full_absent';
    }

    public function isPartiallyPresent(): bool
    {
        return $this->daily_status === 'partial_present';
    }

    public function isExcusedAbsent(): bool
    {
        return $this->daily_status === 'excused_absent';
    }

    public function wasLate(): bool
    {
        return $this->daily_status === 'late_arrival' || $this->periods_late > 0;
    }

    public function leftEarly(): bool
    {
        return $this->daily_status === 'early_departure';
    }

    public function needsAttention(): bool
    {
        return in_array($this->daily_status, [
            'full_absent', 
            'partial_present'
        ]) && !$this->absence_authorized;
    }

    // Calculation methods
    public function calculateDailyAttendanceRate(): float
    {
        if ($this->total_periods_scheduled === 0) {
            return 100.0;
        }

        return round(($this->periods_present / $this->total_periods_scheduled) * 100, 2);
    }

    public function calculateMinutesAttendanceRate(): float
    {
        if ($this->total_minutes_scheduled === 0) {
            return 100.0;
        }

        return round(($this->minutes_present / $this->total_minutes_scheduled) * 100, 2);
    }

    public function getTotalAbsentPeriods(): int
    {
        return $this->periods_absent + $this->periods_excused;
    }

    public function getAttendanceEfficiency(): float
    {
        // Combine period attendance with punctuality
        $periodRate = $this->calculateDailyAttendanceRate();
        $punctualityPenalty = ($this->periods_late / max($this->total_periods_scheduled, 1)) * 10;
        
        return max(0, $periodRate - $punctualityPenalty);
    }

    // Time calculations
    public function getTotalScheduledHours(): float
    {
        return round($this->total_minutes_scheduled / 60, 2);
    }

    public function getActualPresentHours(): float
    {
        return round($this->minutes_present / 60, 2);
    }

    public function getTimeSpentInSchool(): float
    {
        if (!$this->actual_arrival_time || !$this->actual_departure_time) {
            return $this->getActualPresentHours();
        }

        $arrivalTime = Carbon::parse($this->actual_arrival_time);
        $departureTime = Carbon::parse($this->actual_departure_time);
        
        return round($departureTime->diffInMinutes($arrivalTime) / 60, 2);
    }

    public function getLatenessInMinutes(): int
    {
        if (!$this->first_period_start || !$this->actual_arrival_time) {
            return $this->minutes_late;
        }

        $scheduledStart = Carbon::parse($this->first_period_start);
        $actualArrival = Carbon::parse($this->actual_arrival_time);

        if ($actualArrival->greaterThan($scheduledStart)) {
            return $actualArrival->diffInMinutes($scheduledStart);
        }

        return 0;
    }

    // Absence management
    public function authorizeAbsence(int $authorizedBy, string $reason = null): bool
    {
        return $this->update([
            'absence_authorized' => true,
            'authorized_by' => $authorizedBy,
            'authorized_at' => now(),
            'absence_reason' => $reason ?? $this->absence_reason
        ]);
    }

    public function requiresMakeupWork(): bool
    {
        return $this->makeup_required || 
               ($this->isFullyAbsent() && !empty($this->affected_subjects));
    }

    public function getMissedSubjects(): array
    {
        return $this->affected_subjects ?? [];
    }

    public function addMakeupAssignment(array $assignment): void
    {
        $assignments = $this->makeup_assignments ?? [];
        $assignments[] = array_merge($assignment, [
            'assigned_at' => now()->toISOString(),
            'assigned_by' => auth()->id()
        ]);

        $this->update(['makeup_assignments' => $assignments]);
    }

    // Parent communication
    public function needsParentNotification(): bool
    {
        return $this->needsAttention() && !$this->parent_notified;
    }

    public function sendParentNotification(string $method, array $details = []): void
    {
        $notificationDetails = $this->notification_details ?? [];
        $notificationDetails[] = [
            'method' => $method,
            'sent_at' => now()->toISOString(),
            'details' => $details,
            'message' => $this->generateParentNotificationMessage()
        ];

        $this->update([
            'parent_notified' => true,
            'parent_notified_at' => now(),
            'notification_details' => $notificationDetails
        ]);
    }

    public function markParentAcknowledged(): void
    {
        $this->update([
            'parent_acknowledged' => true,
            'parent_acknowledged_at' => now()
        ]);
    }

    public function generateParentNotificationMessage(): string
    {
        $studentName = $this->student->profile->first_name ?? 'Your child';
        $date = $this->attendance_date->format('d/m/Y');
        $status = str_replace('_', ' ', $this->daily_status);

        if ($this->isFullyAbsent()) {
            return "ATİS: {$studentName} was absent from school on {$date}. Please contact the school if this absence was unplanned.";
        }

        if ($this->isPartiallyPresent()) {
            $missedPeriods = $this->periods_absent + $this->periods_excused;
            return "ATİS: {$studentName} missed {$missedPeriods} period(s) on {$date}. Attendance rate: {$this->daily_attendance_rate}%.";
        }

        if ($this->wasLate()) {
            $lateMinutes = $this->getLatenessInMinutes();
            return "ATİS: {$studentName} arrived {$lateMinutes} minutes late on {$date}.";
        }

        return "ATİS: Attendance update for {$studentName} on {$date}: {$status}.";
    }

    // Health and safety
    public function recordHealthScreening(float $temperature = null, bool $passed = true, array $notes = []): void
    {
        $this->update([
            'temperature_check' => $temperature,
            'health_screening_passed' => $passed,
            'health_notes' => array_merge($this->health_notes ?? [], $notes)
        ]);
    }

    public function hasHealthConcerns(): bool
    {
        return !$this->health_screening_passed || 
               ($this->temperature_check && $this->temperature_check >= 37.5);
    }

    public function getHealthAlerts(): array
    {
        $alerts = [];

        if ($this->temperature_check && $this->temperature_check >= 37.5) {
            $alerts[] = "High temperature recorded: {$this->temperature_check}°C";
        }

        if (!$this->health_screening_passed) {
            $alerts[] = "Failed daily health screening";
        }

        if (!empty($this->health_notes)) {
            $alerts = array_merge($alerts, $this->health_notes);
        }

        return $alerts;
    }

    // Transportation tracking
    public function hasTransportationIssues(): bool
    {
        return in_array($this->transportation_status, ['bus_late', 'bus_missed']);
    }

    public function getTransportationNote(): ?string
    {
        return match($this->transportation_status) {
            'bus_late' => 'School bus was delayed',
            'bus_missed' => 'Student missed the school bus',
            'parent_pickup' => 'Transported by parent/guardian',
            'walking' => 'Student walked to school',
            'bicycle' => 'Student cycled to school',
            default => null
        };
    }

    // Academic impact
    public function getAcademicImpactScore(): float
    {
        $baseScore = $this->daily_attendance_rate;
        
        // Penalty for lateness
        if ($this->periods_late > 0) {
            $latenessPenalty = ($this->periods_late / $this->total_periods_scheduled) * 20;
            $baseScore -= $latenessPenalty;
        }

        // Bonus for perfect attendance
        if ($this->isFullyPresent() && $this->periods_late === 0) {
            $baseScore += 5;
        }

        return max(0, min(100, $baseScore));
    }

    public function affectsAcademicStanding(): bool
    {
        return $this->daily_attendance_rate < 75 || // Below minimum threshold
               $this->getTotalAbsentPeriods() > ($this->total_periods_scheduled * 0.5); // Missed more than half
    }

    // Pattern detection
    public static function generateDailySummary(int $studentId, Carbon $date): self
    {
        $attendanceRecords = AttendanceRecord::where('student_id', $studentId)
            ->whereDate('attendance_date', $date)
            ->get();

        if ($attendanceRecords->isEmpty()) {
            return static::createEmptySummary($studentId, $date);
        }

        $summary = new static();
        $summary->student_id = $studentId;
        $summary->attendance_date = $date;
        $summary->processAttendanceRecords($attendanceRecords);
        $summary->save();

        return $summary;
    }

    private static function createEmptySummary(int $studentId, Carbon $date): self
    {
        return static::create([
            'student_id' => $studentId,
            'attendance_date' => $date,
            'daily_status' => 'not_scheduled',
            'total_periods_scheduled' => 0,
            'periods_present' => 0,
            'periods_absent' => 0,
            'periods_late' => 0,
            'periods_excused' => 0,
            'daily_attendance_rate' => 0.00,
            'summary_generated_at' => now()
        ]);
    }

    private function processAttendanceRecords($records): void
    {
        $this->total_periods_scheduled = $records->count();
        $this->periods_present = $records->where('status', 'present')->count();
        $this->periods_absent = $records->where('status', 'absent')->count();
        $this->periods_late = $records->where('status', 'late')->count();
        $this->periods_excused = $records->whereIn('status', ['excused', 'medical', 'authorized'])->count();

        $this->daily_attendance_rate = $this->calculateDailyAttendanceRate();
        $this->determineDailyStatus();
        $this->calculateTimings($records);
        $this->identifyAffectedSubjects($records);
        $this->summary_generated_at = now();
    }

    private function determineDailyStatus(): void
    {
        if ($this->periods_present === $this->total_periods_scheduled && $this->periods_late === 0) {
            $this->daily_status = 'full_present';
        } elseif ($this->periods_present === 0) {
            $this->daily_status = $this->periods_excused > 0 ? 'excused_absent' : 'full_absent';
        } elseif ($this->periods_late > 0) {
            $this->daily_status = 'late_arrival';
        } else {
            $this->daily_status = 'partial_present';
        }
    }

    private function calculateTimings($records): void
    {
        $this->first_period_start = $records->min('period_start_time');
        $this->last_period_end = $records->max('period_end_time');
        $this->actual_arrival_time = $records->whereNotNull('arrival_time')->min('arrival_time');
        $this->actual_departure_time = $records->whereNotNull('departure_time')->max('departure_time');

        $this->total_minutes_scheduled = $records->sum(function ($record) {
            return Carbon::parse($record->period_end_time)->diffInMinutes(
                Carbon::parse($record->period_start_time)
            );
        });

        $this->minutes_present = $this->total_minutes_scheduled - $records->sum('minutes_absent');
        $this->minutes_late = $records->sum('minutes_late');
        $this->minutes_absent = $records->sum('minutes_absent');
    }

    private function identifyAffectedSubjects($records): void
    {
        $absentRecords = $records->whereIn('status', ['absent', 'excused', 'medical']);
        $this->affected_subjects = $absentRecords->pluck('subject.name', 'subject_id')->toArray();
        $this->makeup_required = $absentRecords->where('affects_grade', true)->isNotEmpty();
    }

    // Scopes
    public function scopeForStudent(Builder $query, int $studentId): Builder
    {
        return $query->where('student_id', $studentId);
    }

    public function scopeForDateRange(Builder $query, Carbon $startDate, Carbon $endDate): Builder
    {
        return $query->whereBetween('attendance_date', [$startDate, $endDate]);
    }

    public function scopeWithStatus(Builder $query, string $status): Builder
    {
        return $query->where('daily_status', $status);
    }

    public function scopeNeedingAttention(Builder $query): Builder
    {
        return $query->whereIn('daily_status', ['full_absent', 'partial_present'])
                    ->where('absence_authorized', false);
    }

    public function scopeNeedingParentNotification(Builder $query): Builder
    {
        return $query->where('parent_notified', false)
                    ->whereIn('daily_status', ['full_absent', 'partial_present', 'late_arrival']);
    }

    public function scopeWithHealthConcerns(Builder $query): Builder
    {
        return $query->where('health_screening_passed', false)
                    ->orWhere('temperature_check', '>=', 37.5);
    }

    public function scopeForAcademicYear(Builder $query, int $academicYearId): Builder
    {
        return $query->where('academic_year_id', $academicYearId);
    }

    public function scopeForGrade(Builder $query, int $gradeId): Builder
    {
        return $query->where('grade_id', $gradeId);
    }

    public function scopeRequiringMakeup(Builder $query): Builder
    {
        return $query->where('makeup_required', true);
    }

    public function scopeWithTransportationIssues(Builder $query): Builder
    {
        return $query->whereIn('transportation_status', ['bus_late', 'bus_missed']);
    }
}