<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class Schedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'academic_year_id',
        'academic_term_id',
        'institution_id',
        'grade_id',
        'name',
        'code',
        'description',
        'schedule_type',
        'effective_date',
        'end_date',
        'total_periods_per_day',
        'total_teaching_periods',
        'working_days',
        'generation_method',
        'template_id',
        'copied_from_schedule_id',
        'status',
        'created_by',
        'reviewed_by',
        'approved_by',
        'submitted_at',
        'reviewed_at',
        'approved_at',
        'activated_at',
        'optimization_score',
        'conflict_count',
        'total_sessions',
        'teacher_utilization',
        'room_utilization',
        'scheduling_constraints',
        'scheduling_preferences',
        'optimization_parameters',
        'notify_teachers',
        'notify_students',
        'last_notification_sent',
        'version',
        'previous_version_id',
        'change_log',
        'metadata',
        'notes',
        'rejection_reason',
    ];

    protected $casts = [
        'effective_date' => 'date',
        'end_date' => 'date',
        'working_days' => 'array',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'approved_at' => 'datetime',
        'activated_at' => 'datetime',
        'optimization_score' => 'decimal:2',
        'teacher_utilization' => 'decimal:2',
        'room_utilization' => 'decimal:2',
        'scheduling_constraints' => 'array',
        'scheduling_preferences' => 'array',
        'optimization_parameters' => 'array',
        'notify_teachers' => 'boolean',
        'notify_students' => 'boolean',
        'last_notification_sent' => 'datetime',
        'change_log' => 'array',
        'metadata' => 'array',
    ];

    const SCHEDULE_TYPES = [
        'regular' => 'Regular Weekly Schedule',
        'exam' => 'Examination Schedule',
        'holiday' => 'Holiday Schedule',
        'special' => 'Special Events Schedule',
        'temporary' => 'Temporary Schedule',
        'makeup' => 'Makeup Classes Schedule',
        'summer' => 'Summer School Schedule',
    ];

    const GENERATION_METHODS = [
        'manual' => 'Manually Created',
        'template' => 'Generated from Template',
        'automated' => 'AI/Algorithm Generated',
        'imported' => 'Imported from External Source',
        'copied' => 'Copied from Another Schedule',
    ];

    const STATUSES = [
        'draft' => 'Draft',
        'pending_review' => 'Pending Review',
        'under_review' => 'Under Review',
        'approved' => 'Approved',
        'active' => 'Active',
        'suspended' => 'Suspended',
        'archived' => 'Archived',
        'rejected' => 'Rejected',
    ];

    /**
     * Academic year relationship
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /**
     * Academic term relationship
     */
    public function academicTerm(): BelongsTo
    {
        return $this->belongsTo(AcademicTerm::class);
    }

    /**
     * Institution relationship
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Grade relationship
     */
    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    /**
     * Template relationship
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(ScheduleTemplate::class);
    }

    /**
     * Copied from schedule relationship
     */
    public function copiedFromSchedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class, 'copied_from_schedule_id');
    }

    /**
     * Previous version relationship
     */
    public function previousVersion(): BelongsTo
    {
        return $this->belongsTo(Schedule::class, 'previous_version_id');
    }

    /**
     * Created by user relationship
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Reviewed by user relationship
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Approved by user relationship
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Schedule sessions
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(ScheduleSession::class);
    }

    /**
     * Active sessions
     */
    public function activeSessions(): HasMany
    {
        return $this->sessions()->where('status', 'scheduled');
    }

    /**
     * Schedule conflicts
     */
    public function conflicts(): HasMany
    {
        return $this->hasMany(ScheduleConflict::class);
    }

    /**
     * Scope: Active schedules
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope: Current schedules
     */
    public function scopeCurrent(Builder $query): Builder
    {
        $today = today();
        return $query->where('effective_date', '<=', $today)
                    ->where(function ($q) use ($today) {
                        $q->whereNull('end_date')
                          ->orWhere('end_date', '>=', $today);
                    });
    }

    /**
     * Scope: By schedule type
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('schedule_type', $type);
    }

    /**
     * Scope: Pending approval
     */
    public function scopePendingApproval(Builder $query): Builder
    {
        return $query->whereIn('status', ['pending_review', 'under_review']);
    }

    /**
     * Get schedule type label
     */
    public function getScheduleTypeLabelAttribute(): string
    {
        return self::SCHEDULE_TYPES[$this->schedule_type] ?? $this->schedule_type;
    }

    /**
     * Get generation method label
     */
    public function getGenerationMethodLabelAttribute(): string
    {
        return self::GENERATION_METHODS[$this->generation_method] ?? $this->generation_method;
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    /**
     * Check if schedule is currently active
     */
    public function isCurrentlyActive(): bool
    {
        if ($this->status !== 'active') {
            return false;
        }

        $today = today();
        return $this->effective_date <= $today && 
               (!$this->end_date || $this->end_date >= $today);
    }

    /**
     * Check if schedule can be edited
     */
    public function canBeEdited(): bool
    {
        return in_array($this->status, ['draft', 'rejected']);
    }

    /**
     * Check if schedule can be approved
     */
    public function canBeApproved(): bool
    {
        return in_array($this->status, ['pending_review', 'under_review']);
    }

    /**
     * Submit for review
     */
    public function submitForReview(): bool
    {
        if (!$this->canBeEdited()) {
            throw new \Exception('Schedule cannot be submitted in current status');
        }

        // Validate schedule before submission
        $validation = $this->validateSchedule();
        if (!$validation['is_valid']) {
            throw new \Exception('Schedule validation failed: ' . implode(', ', $validation['errors']));
        }

        return $this->update([
            'status' => 'pending_review',
            'submitted_at' => now(),
        ]);
    }

    /**
     * Start review process
     */
    public function startReview(User $reviewer): bool
    {
        if ($this->status !== 'pending_review') {
            throw new \Exception('Schedule is not pending review');
        }

        return $this->update([
            'status' => 'under_review',
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
        ]);
    }

    /**
     * Approve schedule
     */
    public function approve(User $approver): bool
    {
        if (!$this->canBeApproved()) {
            throw new \Exception('Schedule cannot be approved in current status');
        }

        return $this->update([
            'status' => 'approved',
            'approved_by' => $approver->id,
            'approved_at' => now(),
        ]);
    }

    /**
     * Reject schedule
     */
    public function reject(User $reviewer, string $reason): bool
    {
        if (!$this->canBeApproved()) {
            throw new \Exception('Schedule cannot be rejected in current status');
        }

        return $this->update([
            'status' => 'rejected',
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
            'rejection_reason' => $reason,
        ]);
    }

    /**
     * Activate schedule
     */
    public function activate(): bool
    {
        if ($this->status !== 'approved') {
            throw new \Exception('Only approved schedules can be activated');
        }

        // Deactivate other active schedules for same grade/type
        self::where('grade_id', $this->grade_id)
           ->where('schedule_type', $this->schedule_type)
           ->where('id', '!=', $this->id)
           ->where('status', 'active')
           ->update(['status' => 'suspended']);

        return $this->update([
            'status' => 'active',
            'activated_at' => now(),
        ]);
    }

    /**
     * Suspend schedule
     */
    public function suspend(string $reason): bool
    {
        if ($this->status !== 'active') {
            throw new \Exception('Only active schedules can be suspended');
        }

        $this->addToChangeLog('suspended', ['reason' => $reason]);

        return $this->update([
            'status' => 'suspended',
            'notes' => ($this->notes ?? '') . "\nSuspended: {$reason}",
        ]);
    }

    /**
     * Archive schedule
     */
    public function archive(): bool
    {
        if (!in_array($this->status, ['active', 'suspended', 'approved'])) {
            throw new \Exception('Schedule cannot be archived in current status');
        }

        $this->addToChangeLog('archived', ['archived_at' => now()]);

        return $this->update(['status' => 'archived']);
    }

    /**
     * Calculate schedule statistics
     */
    public function calculateStatistics(): array
    {
        $sessions = $this->sessions;
        $totalSessions = $sessions->count();

        if ($totalSessions === 0) {
            return [
                'total_sessions' => 0,
                'conflicts' => 0,
                'teacher_utilization' => 0,
                'room_utilization' => 0,
                'optimization_score' => 0,
            ];
        }

        // Calculate teacher utilization
        $teachers = $sessions->pluck('teacher_id')->unique();
        $teacherHours = $sessions->groupBy('teacher_id')->map(function ($teacherSessions) {
            return $teacherSessions->sum('duration_minutes') / 60;
        });

        // Calculate room utilization
        $rooms = $sessions->whereNotNull('room_id')->pluck('room_id')->unique();
        $roomHours = $sessions->groupBy('room_id')->map(function ($roomSessions) {
            return $roomSessions->sum('duration_minutes') / 60;
        });

        // Count conflicts
        $conflicts = $this->detectConflicts();

        $statistics = [
            'total_sessions' => $totalSessions,
            'total_teachers' => $teachers->count(),
            'total_rooms' => $rooms->count(),
            'total_teaching_hours' => $sessions->sum('duration_minutes') / 60,
            'conflicts' => count($conflicts),
            'teacher_utilization' => $teachers->count() > 0 ? $teacherHours->avg() : 0,
            'room_utilization' => $rooms->count() > 0 ? $roomHours->avg() : 0,
            'sessions_by_day' => $sessions->groupBy('day_of_week')->map->count(),
            'sessions_by_type' => $sessions->groupBy('session_type')->map->count(),
            'optimization_score' => $this->calculateOptimizationScore(),
        ];

        // Update schedule with calculated statistics
        $this->update([
            'total_sessions' => $totalSessions,
            'conflict_count' => count($conflicts),
            'teacher_utilization' => $statistics['teacher_utilization'],
            'room_utilization' => $statistics['room_utilization'],
            'optimization_score' => $statistics['optimization_score'],
        ]);

        return $statistics;
    }

    /**
     * Detect schedule conflicts
     */
    public function detectConflicts(): array
    {
        $conflicts = [];
        $sessions = $this->sessions->where('status', 'scheduled');

        foreach ($sessions as $session) {
            // Teacher conflicts
            $teacherConflicts = $sessions->where('id', '!=', $session->id)
                                       ->where('teacher_id', $session->teacher_id)
                                       ->where('day_of_week', $session->day_of_week)
                                       ->where('time_slot_id', $session->time_slot_id);

            foreach ($teacherConflicts as $conflictSession) {
                $conflicts[] = [
                    'type' => 'teacher',
                    'session_id' => $session->id,
                    'conflicting_session_id' => $conflictSession->id,
                    'teacher_id' => $session->teacher_id,
                    'message' => "Teacher double-booked on {$session->day_of_week}",
                    'severity' => 'critical',
                ];
            }

            // Room conflicts
            if ($session->room_id) {
                $roomConflicts = $sessions->where('id', '!=', $session->id)
                                        ->where('room_id', $session->room_id)
                                        ->where('day_of_week', $session->day_of_week)
                                        ->where('time_slot_id', $session->time_slot_id);

                foreach ($roomConflicts as $conflictSession) {
                    $conflicts[] = [
                        'type' => 'room',
                        'session_id' => $session->id,
                        'conflicting_session_id' => $conflictSession->id,
                        'room_id' => $session->room_id,
                        'message' => "Room double-booked on {$session->day_of_week}",
                        'severity' => 'high',
                    ];
                }
            }
        }

        return $conflicts;
    }

    /**
     * Calculate optimization score
     */
    protected function calculateOptimizationScore(): float
    {
        $score = 100.0;
        $sessions = $this->sessions;

        if ($sessions->isEmpty()) {
            return 0.0;
        }

        // Penalty for conflicts
        $conflicts = $this->detectConflicts();
        $score -= count($conflicts) * 10;

        // Penalty for uneven distribution
        $sessionsByDay = $sessions->groupBy('day_of_week');
        if ($sessionsByDay->count() > 1) {
            $avg = $sessions->count() / $sessionsByDay->count();
            $variance = $sessionsByDay->map(function ($daySessions) use ($avg) {
                return pow($daySessions->count() - $avg, 2);
            })->avg();
            $score -= $variance * 2;
        }

        // Bonus for teacher preference alignment
        $teacherPreferenceScore = $this->calculateTeacherPreferenceScore();
        $score += $teacherPreferenceScore * 0.2;

        // Penalty for gaps in teacher schedules
        $gapPenalty = $this->calculateGapPenalty();
        $score -= $gapPenalty;

        return max(0, min(100, $score));
    }

    /**
     * Calculate teacher preference alignment score
     */
    protected function calculateTeacherPreferenceScore(): float
    {
        $sessions = $this->sessions;
        $totalScore = 0;
        $sessionCount = 0;

        foreach ($sessions as $session) {
            $teacherSubject = TeacherSubject::where('teacher_id', $session->teacher_id)
                                          ->where('subject_id', $session->subject_id)
                                          ->first();

            if ($teacherSubject) {
                $sessionScore = 50; // Base score

                // Check time slot preference
                if ($teacherSubject->prefersTimeSlot($session->time_slot_id)) {
                    $sessionScore += 25;
                }

                // Check day preference
                $dayOfWeek = array_search(ucfirst($session->day_of_week), TeacherSubject::DAYS_OF_WEEK);
                if ($dayOfWeek && $teacherSubject->isAvailableOnDay($dayOfWeek)) {
                    $sessionScore += 15;
                }

                $totalScore += $sessionScore;
                $sessionCount++;
            }
        }

        return $sessionCount > 0 ? $totalScore / $sessionCount : 0;
    }

    /**
     * Calculate gap penalty for teacher schedules
     */
    protected function calculateGapPenalty(): float
    {
        $penalty = 0;
        $teacherSessions = $this->sessions->groupBy('teacher_id');

        foreach ($teacherSessions as $teacherId => $sessions) {
            $dailySessions = $sessions->groupBy('day_of_week');
            
            foreach ($dailySessions as $day => $daySessions) {
                $sortedSessions = $daySessions->sortBy('start_time');
                $previousEndTime = null;

                foreach ($sortedSessions as $session) {
                    if ($previousEndTime) {
                        $gap = Carbon::parse($session->start_time)->diffInMinutes(Carbon::parse($previousEndTime));
                        
                        // Penalty for gaps longer than 1 hour
                        if ($gap > 60) {
                            $penalty += ($gap - 60) / 60; // 1 point per hour of gap
                        }
                    }
                    $previousEndTime = $session->end_time;
                }
            }
        }

        return $penalty;
    }

    /**
     * Validate schedule
     */
    public function validateSchedule(): array
    {
        $errors = [];

        // Check basic data integrity
        if (!$this->academic_year_id || !$this->institution_id) {
            $errors[] = 'Academic year and institution are required';
        }

        if ($this->effective_date && $this->end_date && $this->effective_date >= $this->end_date) {
            $errors[] = 'Effective date must be before end date';
        }

        // Check session conflicts
        $conflicts = $this->detectConflicts();
        if (!empty($conflicts)) {
            $errors[] = "Schedule has " . count($conflicts) . " conflicts";
        }

        // Check minimum session requirements
        $sessions = $this->sessions;
        if ($sessions->isEmpty()) {
            $errors[] = 'Schedule must have at least one session';
        }

        // Check working days consistency
        $scheduledDays = $sessions->pluck('day_of_week')->unique();
        $workingDays = $this->working_days ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        
        $invalidDays = $scheduledDays->diff($workingDays);
        if ($invalidDays->isNotEmpty()) {
            $errors[] = 'Sessions scheduled on non-working days: ' . $invalidDays->implode(', ');
        }

        return [
            'is_valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $this->getValidationWarnings(),
        ];
    }

    /**
     * Get validation warnings
     */
    protected function getValidationWarnings(): array
    {
        $warnings = [];

        // Check optimization score
        if ($this->optimization_score && $this->optimization_score < 70) {
            $warnings[] = "Low optimization score ({$this->optimization_score})";
        }

        // Check teacher workload balance
        $teacherWorkloads = $this->sessions->groupBy('teacher_id')
                                         ->map->count();
        
        if ($teacherWorkloads->count() > 1) {
            $maxWorkload = $teacherWorkloads->max();
            $minWorkload = $teacherWorkloads->min();
            
            if ($maxWorkload - $minWorkload > 5) {
                $warnings[] = 'Uneven teacher workload distribution';
            }
        }

        return $warnings;
    }

    /**
     * Add entry to change log
     */
    public function addToChangeLog(string $action, array $data = []): void
    {
        $changeLog = $this->change_log ?? [];
        
        $changeLog[] = [
            'action' => $action,
            'timestamp' => now()->toISOString(),
            'user_id' => auth()->id(),
            'data' => $data,
        ];

        $this->update(['change_log' => $changeLog]);
    }

    /**
     * Create schedule copy
     */
    public function createCopy(User $creator, array $overrides = []): Schedule
    {
        $copyData = array_merge([
            'name' => $this->name . ' (Copy)',
            'status' => 'draft',
            'version' => 1,
            'created_by' => $creator->id,
            'copied_from_schedule_id' => $this->id,
            'generation_method' => 'copied',
            'submitted_at' => null,
            'reviewed_at' => null,
            'approved_at' => null,
            'activated_at' => null,
            'reviewed_by' => null,
            'approved_by' => null,
            'rejection_reason' => null,
        ], $overrides);

        $newSchedule = $this->replicate($copyData);
        $newSchedule->save();

        // Copy sessions
        foreach ($this->sessions as $session) {
            $sessionCopy = $session->replicate();
            $sessionCopy->schedule_id = $newSchedule->id;
            $sessionCopy->save();
        }

        return $newSchedule;
    }
}