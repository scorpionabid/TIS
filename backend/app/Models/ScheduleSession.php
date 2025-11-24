<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScheduleSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'schedule_id',
        'subject_id',
        'teacher_id',
        'room_id',
        'time_slot_id',
        'day_of_week',
        'period_number',
        'start_time',
        'end_time',
        'duration_minutes',
        'session_type',
        'recurrence_pattern',
        'recurrence_config',
        'topic',
        'description',
        'lesson_plan_reference',
        'requires_projector',
        'requires_computer',
        'requires_lab_equipment',
        'requires_special_setup',
        'required_resources',
        'room_setup_requirements',
        'expected_student_count',
        'student_groups',
        'is_mandatory',
        'status',
        'substitute_teacher_id',
        'original_teacher_id',
        'substitution_reason',
        'last_modified_at',
        'last_modified_by',
        'actual_student_count',
        'attendance_percentage',
        'session_started_at',
        'session_ended_at',
        'completion_notes',
        'has_conflicts',
        'conflict_details',
        'conflict_severity',
        'session_rating',
        'teacher_feedback',
        'student_feedback',
        'session_analytics',
        'notify_students',
        'notify_parents',
        'notifications_sent_at',
        'notification_history',
        'external_reference',
        'integration_data',
        'metadata',
        'administrative_notes',
    ];

    protected $casts = [
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'recurrence_config' => 'array',
        'requires_projector' => 'boolean',
        'requires_computer' => 'boolean',
        'requires_lab_equipment' => 'boolean',
        'requires_special_setup' => 'boolean',
        'required_resources' => 'array',
        'room_setup_requirements' => 'array',
        'student_groups' => 'array',
        'is_mandatory' => 'boolean',
        'last_modified_at' => 'datetime',
        'session_started_at' => 'datetime',
        'session_ended_at' => 'datetime',
        'attendance_percentage' => 'decimal:2',
        'has_conflicts' => 'boolean',
        'conflict_details' => 'array',
        'session_rating' => 'decimal:2',
        'session_analytics' => 'array',
        'notify_students' => 'boolean',
        'notify_parents' => 'boolean',
        'notifications_sent_at' => 'datetime',
        'notification_history' => 'array',
        'integration_data' => 'array',
        'metadata' => 'array',
    ];

    const SESSION_TYPES = [
        'regular' => 'Regular Class Session',
        'lab' => 'Laboratory Session',
        'practical' => 'Practical/Hands-on Session',
        'exam' => 'Examination',
        'quiz' => 'Quiz/Test',
        'review' => 'Review Session',
        'makeup' => 'Makeup Class',
        'substitution' => 'Substitute Teacher Session',
        'assembly' => 'School Assembly',
        'activity' => 'Extracurricular Activity',
        'consultation' => 'Teacher Consultation',
        'preparation' => 'Teacher Preparation',
    ];

    const RECURRENCE_PATTERNS = [
        'weekly' => 'Every Week',
        'bi_weekly' => 'Every Two Weeks',
        'monthly' => 'Monthly',
        'one_time' => 'Single Occurrence',
        'custom' => 'Custom Pattern',
    ];

    const STATUSES = [
        'scheduled' => 'Normal Scheduled Session',
        'confirmed' => 'Confirmed by Teacher',
        'cancelled' => 'Cancelled Session',
        'moved' => 'Moved to Different Time/Room',
        'substituted' => 'Substitute Teacher Assigned',
        'completed' => 'Session Completed',
        'in_progress' => 'Currently in Session',
    ];

    const CONFLICT_SEVERITIES = [
        'none' => 'No Conflicts',
        'low' => 'Low Priority Conflict',
        'medium' => 'Medium Priority Conflict',
        'high' => 'High Priority Conflict',
        'critical' => 'Critical Conflict',
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
     * Schedule relationship
     */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }

    /**
     * Subject relationship
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Teacher relationship
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Room relationship
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * Time slot relationship
     */
    public function timeSlot(): BelongsTo
    {
        return $this->belongsTo(TimeSlot::class);
    }

    /**
     * Substitute teacher relationship
     */
    public function substituteTeacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'substitute_teacher_id');
    }

    /**
     * Original teacher relationship
     */
    public function originalTeacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'original_teacher_id');
    }

    /**
     * Last modified by user relationship
     */
    public function lastModifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_modified_by');
    }

    /**
     * Conflicts for this session
     */
    public function conflicts(): HasMany
    {
        return $this->hasMany(ScheduleConflict::class, 'session_id');
    }

    /**
     * Scope: Active sessions
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', ['scheduled', 'confirmed', 'in_progress']);
    }

    /**
     * Scope: Completed sessions
     */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope: Cancelled sessions
     */
    public function scopeCancelled(Builder $query): Builder
    {
        return $query->where('status', 'cancelled');
    }

    /**
     * Scope: Sessions for specific day
     */
    public function scopeForDay(Builder $query, string $dayOfWeek): Builder
    {
        return $query->where('day_of_week', $dayOfWeek);
    }

    /**
     * Scope: Sessions for specific teacher
     */
    public function scopeForTeacher(Builder $query, int $teacherId): Builder
    {
        return $query->where(function ($q) use ($teacherId) {
            $q->where('teacher_id', $teacherId)
                ->orWhere('substitute_teacher_id', $teacherId);
        });
    }

    /**
     * Scope: Sessions in specific room
     */
    public function scopeInRoom(Builder $query, int $roomId): Builder
    {
        return $query->where('room_id', $roomId);
    }

    /**
     * Scope: Sessions by type
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('session_type', $type);
    }

    /**
     * Scope: Sessions with conflicts
     */
    public function scopeWithConflicts(Builder $query): Builder
    {
        return $query->where('has_conflicts', true);
    }

    /**
     * Scope: Sessions ordered by time
     */
    public function scopeOrderedByTime(Builder $query): Builder
    {
        return $query->orderBy('start_time')->orderBy('period_number');
    }

    /**
     * Scope: Sessions in date range
     */
    public function scopeInDateRange(Builder $query, Carbon $startDate, Carbon $endDate): Builder
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Get session type label
     */
    public function getSessionTypeLabelAttribute(): string
    {
        return self::SESSION_TYPES[$this->session_type] ?? $this->session_type;
    }

    /**
     * Get recurrence pattern label
     */
    public function getRecurrencePatternLabelAttribute(): string
    {
        return self::RECURRENCE_PATTERNS[$this->recurrence_pattern] ?? $this->recurrence_pattern;
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    /**
     * Get conflict severity label
     */
    public function getConflictSeverityLabelAttribute(): string
    {
        return self::CONFLICT_SEVERITIES[$this->conflict_severity] ?? $this->conflict_severity;
    }

    /**
     * Get day of week label
     */
    public function getDayOfWeekLabelAttribute(): string
    {
        return self::DAYS_OF_WEEK[$this->day_of_week] ?? ucfirst($this->day_of_week);
    }

    /**
     * Get formatted time range
     */
    public function getTimeRangeAttribute(): string
    {
        return $this->start_time->format('H:i') . ' - ' . $this->end_time->format('H:i');
    }

    /**
     * Get effective teacher (substitute if exists, otherwise original)
     */
    public function getEffectiveTeacherAttribute(): User
    {
        return $this->substituteTeacher ?? $this->teacher;
    }

    /**
     * Check if session is currently happening
     */
    public function isCurrentlyActive(): bool
    {
        if ($this->status !== 'in_progress') {
            return false;
        }

        $now = now();
        $currentTime = $now->format('H:i');
        $currentDay = strtolower($now->format('l'));

        return $this->day_of_week === $currentDay &&
               $currentTime >= $this->start_time->format('H:i') &&
               $currentTime <= $this->end_time->format('H:i');
    }

    /**
     * Check if session can be cancelled
     */
    public function canBeCancelled(): bool
    {
        return in_array($this->status, ['scheduled', 'confirmed']);
    }

    /**
     * Check if session can be moved
     */
    public function canBeMoved(): bool
    {
        return in_array($this->status, ['scheduled', 'confirmed']) &&
               ! $this->isCurrentlyActive();
    }

    /**
     * Check if substitute can be assigned
     */
    public function canAssignSubstitute(): bool
    {
        return in_array($this->status, ['scheduled', 'confirmed']) &&
               ! $this->substitute_teacher_id;
    }

    /**
     * Start session
     */
    public function startSession(): bool
    {
        if ($this->status !== 'confirmed' && $this->status !== 'scheduled') {
            throw new \Exception('Session cannot be started in current status');
        }

        return $this->update([
            'status' => 'in_progress',
            'session_started_at' => now(),
        ]);
    }

    /**
     * Complete session
     */
    public function completeSession(array $completionData = []): bool
    {
        if ($this->status !== 'in_progress') {
            throw new \Exception('Only sessions in progress can be completed');
        }

        $updateData = array_merge([
            'status' => 'completed',
            'session_ended_at' => now(),
        ], $completionData);

        // Calculate actual duration if not provided
        if ($this->session_started_at && ! isset($completionData['actual_duration_minutes'])) {
            $updateData['actual_duration_minutes'] = $this->session_started_at->diffInMinutes(now());
        }

        return $this->update($updateData);
    }

    /**
     * Cancel session
     */
    public function cancelSession(string $reason): bool
    {
        if (! $this->canBeCancelled()) {
            throw new \Exception('Session cannot be cancelled in current status');
        }

        return $this->update([
            'status' => 'cancelled',
            'administrative_notes' => ($this->administrative_notes ?? '') . "\nCancelled: {$reason}",
            'last_modified_at' => now(),
            'last_modified_by' => auth()->id(),
        ]);
    }

    /**
     * Assign substitute teacher
     */
    public function assignSubstitute(int $substituteTeacherId, string $reason): bool
    {
        if (! $this->canAssignSubstitute()) {
            throw new \Exception('Substitute cannot be assigned to this session');
        }

        return $this->update([
            'substitute_teacher_id' => $substituteTeacherId,
            'original_teacher_id' => $this->teacher_id,
            'substitution_reason' => $reason,
            'status' => 'substituted',
            'last_modified_at' => now(),
            'last_modified_by' => auth()->id(),
        ]);
    }

    /**
     * Move session to new time/room
     */
    public function moveSession(array $newScheduleData): bool
    {
        if (! $this->canBeMoved()) {
            throw new \Exception('Session cannot be moved in current status');
        }

        $oldData = [
            'day_of_week' => $this->day_of_week,
            'time_slot_id' => $this->time_slot_id,
            'room_id' => $this->room_id,
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
        ];

        $result = $this->update(array_merge($newScheduleData, [
            'status' => 'moved',
            'last_modified_at' => now(),
            'last_modified_by' => auth()->id(),
        ]));

        if ($result) {
            $this->addToAdministrativeNotes("Moved from {$oldData['day_of_week']} {$oldData['start_time']}-{$oldData['end_time']}");
        }

        return $result;
    }

    /**
     * Update attendance
     */
    public function updateAttendance(int $actualStudentCount, ?float $attendancePercentage = null): bool
    {
        $updateData = ['actual_student_count' => $actualStudentCount];

        if ($attendancePercentage !== null) {
            $updateData['attendance_percentage'] = $attendancePercentage;
        } elseif ($this->expected_student_count) {
            $updateData['attendance_percentage'] = ($actualStudentCount / $this->expected_student_count) * 100;
        }

        return $this->update($updateData);
    }

    /**
     * Add rating and feedback
     */
    public function addFeedback(array $feedbackData): bool
    {
        $updateData = [];

        if (isset($feedbackData['session_rating'])) {
            $updateData['session_rating'] = $feedbackData['session_rating'];
        }

        if (isset($feedbackData['teacher_feedback'])) {
            $updateData['teacher_feedback'] = $feedbackData['teacher_feedback'];
        }

        if (isset($feedbackData['student_feedback'])) {
            $updateData['student_feedback'] = $feedbackData['student_feedback'];
        }

        return $this->update($updateData);
    }

    /**
     * Detect conflicts for this session
     */
    public function detectConflicts(): array
    {
        $conflicts = [];

        // Teacher conflicts
        $teacherConflicts = self::where('schedule_id', $this->schedule_id)
            ->where('id', '!=', $this->id)
            ->where('teacher_id', $this->teacher_id)
            ->where('day_of_week', $this->day_of_week)
            ->where('time_slot_id', $this->time_slot_id)
            ->whereIn('status', ['scheduled', 'confirmed', 'in_progress'])
            ->get();

        foreach ($teacherConflicts as $conflictSession) {
            $conflicts[] = [
                'type' => 'teacher',
                'severity' => 'critical',
                'description' => 'Teacher double-booked',
                'conflicting_session_id' => $conflictSession->id,
                'details' => [
                    'teacher_id' => $this->teacher_id,
                    'day_of_week' => $this->day_of_week,
                    'time_slot' => $this->timeSlot->name ?? "Slot {$this->time_slot_id}",
                ],
            ];
        }

        // Room conflicts
        if ($this->room_id) {
            $roomConflicts = self::where('schedule_id', $this->schedule_id)
                ->where('id', '!=', $this->id)
                ->where('room_id', $this->room_id)
                ->where('day_of_week', $this->day_of_week)
                ->where('time_slot_id', $this->time_slot_id)
                ->whereIn('status', ['scheduled', 'confirmed', 'in_progress'])
                ->get();

            foreach ($roomConflicts as $conflictSession) {
                $conflicts[] = [
                    'type' => 'room',
                    'severity' => 'high',
                    'description' => 'Room double-booked',
                    'conflicting_session_id' => $conflictSession->id,
                    'details' => [
                        'room_id' => $this->room_id,
                        'day_of_week' => $this->day_of_week,
                        'time_slot' => $this->timeSlot->name ?? "Slot {$this->time_slot_id}",
                    ],
                ];
            }
        }

        // Update conflict status
        $hasConflicts = ! empty($conflicts);
        $conflictSeverity = $hasConflicts ?
            ($conflicts[0]['severity'] ?? 'none') : 'none';

        $this->update([
            'has_conflicts' => $hasConflicts,
            'conflict_details' => $conflicts,
            'conflict_severity' => $conflictSeverity,
        ]);

        return $conflicts;
    }

    /**
     * Get next occurrence date for recurring sessions
     */
    public function getNextOccurrenceDate(): ?Carbon
    {
        if ($this->recurrence_pattern === 'one_time') {
            return null;
        }

        $today = today();
        $dayIndex = array_search($this->day_of_week, array_keys(self::DAYS_OF_WEEK));
        $currentDayIndex = $today->dayOfWeek === 0 ? 6 : $today->dayOfWeek - 1; // Convert to 0-6 (Mon-Sun)

        switch ($this->recurrence_pattern) {
            case 'weekly':
                $daysToAdd = $dayIndex >= $currentDayIndex ?
                    $dayIndex - $currentDayIndex :
                    7 - $currentDayIndex + $dayIndex;

                return $today->addDays($daysToAdd);

            case 'bi_weekly':
                $nextWeek = $today->addWeeks(2)->startOfWeek();

                return $nextWeek->addDays($dayIndex);

            case 'monthly':
                $nextMonth = $today->addMonth()->startOfMonth();
                // Find first occurrence of the day in next month
                while ($nextMonth->dayOfWeek !== ($dayIndex + 1) % 7) {
                    $nextMonth->addDay();
                }

                return $nextMonth;

            case 'custom':
                // Handle custom recurrence based on recurrence_config
                $config = $this->recurrence_config ?? [];

                // Implementation depends on custom configuration structure
                return null;

            default:
                return null;
        }
    }

    /**
     * Add note to administrative notes
     */
    public function addToAdministrativeNotes(string $note): void
    {
        $notes = $this->administrative_notes ?? '';
        $timestamp = now()->format('Y-m-d H:i:s');
        $newNote = "[{$timestamp}] {$note}";

        $this->update([
            'administrative_notes' => $notes ? "{$notes}\n{$newNote}" : $newNote,
        ]);
    }

    /**
     * Get session statistics
     */
    public function getSessionStatistics(): array
    {
        return [
            'planned_duration' => $this->duration_minutes,
            'actual_duration' => $this->session_started_at && $this->session_ended_at ?
                $this->session_started_at->diffInMinutes($this->session_ended_at) : null,
            'expected_attendance' => $this->expected_student_count,
            'actual_attendance' => $this->actual_student_count,
            'attendance_rate' => $this->attendance_percentage,
            'rating' => $this->session_rating,
            'has_feedback' => ! empty($this->teacher_feedback) || ! empty($this->student_feedback),
            'resource_requirements' => array_filter([
                'projector' => $this->requires_projector,
                'computer' => $this->requires_computer,
                'lab_equipment' => $this->requires_lab_equipment,
                'special_setup' => $this->requires_special_setup,
            ]),
            'status_history' => $this->getStatusHistory(),
        ];
    }

    /**
     * Get status history from administrative notes
     */
    private function getStatusHistory(): array
    {
        $notes = $this->administrative_notes ?? '';
        $lines = explode("\n", $notes);
        $history = [];

        foreach ($lines as $line) {
            if (preg_match('/\[([\d\-\s:]+)\]\s*(.+)/', $line, $matches)) {
                $history[] = [
                    'timestamp' => $matches[1],
                    'action' => $matches[2],
                ];
            }
        }

        return $history;
    }

    /**
     * Validate session data
     */
    public function validateSession(): array
    {
        $errors = [];
        $warnings = [];

        // Check basic requirements
        if (! $this->schedule_id || ! $this->subject_id || ! $this->teacher_id) {
            $errors[] = 'Schedule, subject, and teacher are required';
        }

        // Check time consistency
        if ($this->start_time >= $this->end_time) {
            $errors[] = 'Start time must be before end time';
        }

        // Check conflicts
        $conflicts = $this->detectConflicts();
        if (! empty($conflicts)) {
            $errors[] = 'Session has ' . count($conflicts) . ' conflicts';
        }

        // Check room capacity if room is assigned
        if ($this->room_id && $this->expected_student_count) {
            $room = $this->room;
            if ($room && $room->capacity && $this->expected_student_count > $room->capacity) {
                $warnings[] = "Expected student count ({$this->expected_student_count}) exceeds room capacity ({$room->capacity})";
            }
        }

        // Check resource availability
        if ($this->room_id) {
            $room = $this->room;
            if ($room) {
                if ($this->requires_projector && ! $room->hasFacility('projector')) {
                    $warnings[] = 'Session requires projector but room does not have one';
                }
                if ($this->requires_computer && ! $room->hasFacility('computer')) {
                    $warnings[] = 'Session requires computer but room does not have one';
                }
            }
        }

        return [
            'is_valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings,
        ];
    }
}
