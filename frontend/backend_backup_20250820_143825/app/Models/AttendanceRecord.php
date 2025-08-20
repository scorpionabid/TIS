<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class AttendanceRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'subject_id',
        'teacher_id',
        'academic_year_id',
        'academic_term_id',
        'attendance_date',
        'period_start_time',
        'period_end_time',
        'period_number',
        'status',
        'arrival_time',
        'departure_time',
        'minutes_late',
        'minutes_absent',
        'recording_method',
        'device_id',
        'location',
        'recorded_by',
        'recorded_at',
        'approved_by',
        'approved_at',
        'absence_reason',
        'absence_request_id',
        'supporting_documents',
        'parent_notified',
        'parent_notified_at',
        'notification_method',
        'notes',
        'metadata',
        'affects_grade',
        'attendance_weight'
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'period_start_time' => 'datetime:H:i',
        'period_end_time' => 'datetime:H:i',
        'arrival_time' => 'datetime:H:i',
        'departure_time' => 'datetime:H:i',
        'recorded_at' => 'datetime',
        'approved_at' => 'datetime',
        'parent_notified_at' => 'datetime',
        'supporting_documents' => 'array',
        'metadata' => 'array',
        'parent_notified' => 'boolean',
        'affects_grade' => 'boolean',
        'attendance_weight' => 'decimal:2'
    ];

    // Relationships
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function academicTerm(): BelongsTo
    {
        return $this->belongsTo(AcademicTerm::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function absenceRequest(): BelongsTo
    {
        return $this->belongsTo(AbsenceRequest::class);
    }

    // Status checking methods
    public function isPresent(): bool
    {
        return $this->status === 'present';
    }

    public function isAbsent(): bool
    {
        return in_array($this->status, ['absent', 'excused', 'medical', 'authorized']);
    }

    public function isLate(): bool
    {
        return $this->status === 'late' || $this->minutes_late > 0;
    }

    public function isExcused(): bool
    {
        return in_array($this->status, ['excused', 'medical', 'authorized']);
    }

    public function requiresApproval(): bool
    {
        return $this->isAbsent() && !$this->approved_at;
    }

    public function isApproved(): bool
    {
        return $this->approved_at !== null && $this->approved_by !== null;
    }

    // Time calculations
    public function calculateMinutesLate(): int
    {
        if (!$this->period_start_time || !$this->arrival_time) {
            return 0;
        }

        $startTime = Carbon::parse($this->period_start_time);
        $arrivalTime = Carbon::parse($this->arrival_time);

        if ($arrivalTime->greaterThan($startTime)) {
            return $arrivalTime->diffInMinutes($startTime);
        }

        return 0;
    }

    public function calculateMinutesAbsent(): int
    {
        if ($this->isPresent()) {
            return 0;
        }

        if (!$this->period_start_time || !$this->period_end_time) {
            return 0;
        }

        $startTime = Carbon::parse($this->period_start_time);
        $endTime = Carbon::parse($this->period_end_time);
        $totalMinutes = $endTime->diffInMinutes($startTime);

        if ($this->arrival_time && $this->departure_time) {
            $arrivalTime = Carbon::parse($this->arrival_time);
            $departureTime = Carbon::parse($this->departure_time);
            $presentMinutes = $departureTime->diffInMinutes($arrivalTime);
            return max(0, $totalMinutes - $presentMinutes);
        }

        return $totalMinutes;
    }

    public function getAttendancePercentageForPeriod(): float
    {
        if (!$this->period_start_time || !$this->period_end_time) {
            return $this->isPresent() ? 100.0 : 0.0;
        }

        $totalMinutes = Carbon::parse($this->period_end_time)
            ->diffInMinutes(Carbon::parse($this->period_start_time));
        
        if ($totalMinutes === 0) return 100.0;

        $presentMinutes = $totalMinutes - $this->minutes_absent;
        return round(($presentMinutes / $totalMinutes) * 100, 2);
    }

    // Notification methods
    public function needsParentNotification(): bool
    {
        return $this->isAbsent() && !$this->parent_notified;
    }

    public function markParentNotified(string $method = 'sms'): void
    {
        $this->update([
            'parent_notified' => true,
            'parent_notified_at' => now(),
            'notification_method' => $method
        ]);
    }

    public function getNotificationMessage(): string
    {
        $studentName = $this->student->profile->first_name ?? 'Student';
        $subjectName = $this->subject->name ?? 'Class';
        $statusText = ucfirst($this->status);
        $date = $this->attendance_date->format('d/m/Y');

        if ($this->isAbsent()) {
            return "ATİS: {$studentName} was {$statusText} from {$subjectName} on {$date}.";
        }

        if ($this->isLate()) {
            return "ATİS: {$studentName} arrived {$this->minutes_late} minutes late to {$subjectName} on {$date}.";
        }

        return "ATİS: Attendance update for {$studentName} in {$subjectName} on {$date}: {$statusText}.";
    }

    // Recording and validation
    public function recordAttendance(array $data): bool
    {
        try {
            // Validate recording time
            if ($this->attendance_date->isFuture()) {
                return false;
            }

            // Calculate minutes if times provided
            if (isset($data['arrival_time'])) {
                $data['minutes_late'] = $this->calculateMinutesLate();
            }

            if (isset($data['status']) && $this->isAbsent()) {
                $data['minutes_absent'] = $this->calculateMinutesAbsent();
            }

            // Set recording metadata
            $data['recorded_at'] = now();
            $data['recorded_by'] = auth()->id();

            return $this->update($data);
        } catch (\Exception $e) {
            return false;
        }
    }

    public function approveAttendance(int $approvedBy, string $notes = null): bool
    {
        return $this->update([
            'approved_by' => $approvedBy,
            'approved_at' => now(),
            'notes' => $notes ? ($this->notes . "\n" . $notes) : $this->notes
        ]);
    }

    // Academic impact
    public function getGradeImpact(): float
    {
        if (!$this->affects_grade) {
            return 0.0;
        }

        $weight = $this->attendance_weight ?? 1.0;
        $attendancePercentage = $this->getAttendancePercentageForPeriod();

        return ($attendancePercentage / 100) * $weight;
    }

    public function hasAcademicImpact(): bool
    {
        return $this->affects_grade && $this->isAbsent();
    }

    // Supporting documents
    public function addSupportingDocument(string $filePath, string $type = 'other'): void
    {
        $documents = $this->supporting_documents ?? [];
        $documents[] = [
            'file_path' => $filePath,
            'type' => $type,
            'uploaded_at' => now()->toISOString(),
            'uploaded_by' => auth()->id()
        ];

        $this->update(['supporting_documents' => $documents]);
    }

    public function hasSupportingDocuments(): bool
    {
        return !empty($this->supporting_documents);
    }

    public function getMedicalDocuments(): array
    {
        return collect($this->supporting_documents ?? [])
            ->where('type', 'medical')
            ->toArray();
    }

    // Pattern analysis
    public function isPartOfPattern(): bool
    {
        // Check if this absence is part of a concerning pattern
        $recentAbsences = static::where('student_id', $this->student_id)
            ->where('attendance_date', '>=', $this->attendance_date->subDays(7))
            ->where('status', 'absent')
            ->count();

        return $recentAbsences >= 3; // 3 or more absences in a week
    }

    public function getConsecutiveAbsenceDays(): int
    {
        return static::where('student_id', $this->student_id)
            ->where('attendance_date', '<=', $this->attendance_date)
            ->where('status', 'absent')
            ->orderBy('attendance_date', 'desc')
            ->get()
            ->takeWhile(function ($record, $index) {
                if ($index === 0) return true;
                $previousDate = $this->attendance_date->subDays($index);
                return $record->attendance_date->equalTo($previousDate);
            })
            ->count();
    }

    // Scopes
    public function scopeForStudent(Builder $query, int $studentId): Builder
    {
        return $query->where('student_id', $studentId);
    }

    public function scopeForSubject(Builder $query, int $subjectId): Builder
    {
        return $query->where('subject_id', $subjectId);
    }

    public function scopeForDateRange(Builder $query, Carbon $startDate, Carbon $endDate): Builder
    {
        return $query->whereBetween('attendance_date', [$startDate, $endDate]);
    }

    public function scopeWithStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    public function scopePresent(Builder $query): Builder
    {
        return $query->where('status', 'present');
    }

    public function scopeAbsent(Builder $query): Builder
    {
        return $query->whereIn('status', ['absent', 'excused', 'medical', 'authorized']);
    }

    public function scopeLate(Builder $query): Builder
    {
        return $query->where('status', 'late')->orWhere('minutes_late', '>', 0);
    }

    public function scopeRequiringApproval(Builder $query): Builder
    {
        return $query->whereNull('approved_at')
                    ->whereIn('status', ['absent', 'excused', 'medical']);
    }

    public function scopeNeedingParentNotification(Builder $query): Builder
    {
        return $query->where('parent_notified', false)
                    ->whereIn('status', ['absent', 'late']);
    }

    public function scopeForAcademicYear(Builder $query, int $academicYearId): Builder
    {
        return $query->where('academic_year_id', $academicYearId);
    }

    public function scopeForAcademicTerm(Builder $query, int $academicTermId): Builder
    {
        return $query->where('academic_term_id', $academicTermId);
    }

    public function scopeRecordedBy(Builder $query, string $method): Builder
    {
        return $query->where('recording_method', $method);
    }
}