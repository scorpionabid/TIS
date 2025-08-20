<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class TeacherSubject extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'subject_id',
        'grade_levels',
        'specialization_level',
        'max_hours_per_week',
        'max_classes_per_day',
        'max_consecutive_classes',
        'preferred_time_slots',
        'unavailable_time_slots',
        'preferred_days',
        'requires_lab',
        'requires_projector',
        'requires_computer',
        'room_requirements',
        'qualified_since',
        'last_training_date',
        'certification_number',
        'teaching_notes',
        'is_active',
        'is_primary_subject',
        'valid_from',
        'valid_until',
        'performance_rating',
        'years_experience',
        'teaching_statistics',
    ];

    protected $casts = [
        'grade_levels' => 'array',
        'preferred_time_slots' => 'array',
        'unavailable_time_slots' => 'array',
        'preferred_days' => 'array',
        'requires_lab' => 'boolean',
        'requires_projector' => 'boolean',
        'requires_computer' => 'boolean',
        'room_requirements' => 'array',
        'qualified_since' => 'date',
        'last_training_date' => 'date',
        'is_active' => 'boolean',
        'is_primary_subject' => 'boolean',
        'valid_from' => 'date',
        'valid_until' => 'date',
        'performance_rating' => 'decimal:2',
        'teaching_statistics' => 'array',
    ];

    const SPECIALIZATION_LEVELS = [
        'basic' => 'Basic Teaching Qualification',
        'intermediate' => 'Experienced Teacher',
        'advanced' => 'Senior Teacher',
        'expert' => 'Subject Matter Expert',
        'master' => 'Master Teacher/Department Head',
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
     * Teacher relationship
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Subject relationship
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Schedule sessions for this teacher-subject combination
     */
    public function scheduleSessions(): HasMany
    {
        return $this->hasMany(ScheduleSession::class, 'teacher_id', 'teacher_id')
                   ->where('subject_id', $this->subject_id);
    }

    /**
     * Scope: Active teacher-subject assignments
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
                    ->where('valid_from', '<=', today())
                    ->where(function ($q) {
                        $q->whereNull('valid_until')
                          ->orWhere('valid_until', '>=', today());
                    });
    }

    /**
     * Scope: Primary subjects
     */
    public function scopePrimary(Builder $query): Builder
    {
        return $query->where('is_primary_subject', true);
    }

    /**
     * Scope: By specialization level
     */
    public function scopeBySpecialization(Builder $query, string $level): Builder
    {
        return $query->where('specialization_level', $level);
    }

    /**
     * Scope: Can teach grade level
     */
    public function scopeCanTeachGrade(Builder $query, int $gradeLevel): Builder
    {
        return $query->whereJsonContains('grade_levels', $gradeLevel);
    }

    /**
     * Scope: Available for scheduling
     */
    public function scopeAvailableForScheduling(Builder $query): Builder
    {
        return $query->active()
                    ->where('max_hours_per_week', '>', 0);
    }

    /**
     * Get specialization level label
     */
    public function getSpecializationLevelLabelAttribute(): string
    {
        return self::SPECIALIZATION_LEVELS[$this->specialization_level] ?? $this->specialization_level;
    }

    /**
     * Get grade levels labels
     */
    public function getGradeLevelsLabelsAttribute(): array
    {
        return collect($this->grade_levels)
               ->map(fn($grade) => "Grade {$grade}")
               ->toArray();
    }

    /**
     * Get preferred days labels
     */
    public function getPreferredDaysLabelsAttribute(): array
    {
        return collect($this->preferred_days ?? [])
               ->map(fn($day) => self::DAYS_OF_WEEK[$day] ?? $day)
               ->toArray();
    }

    /**
     * Check if teacher can teach specific grade level
     */
    public function canTeachGrade(int $gradeLevel): bool
    {
        return in_array($gradeLevel, $this->grade_levels ?? []);
    }

    /**
     * Check if teacher is available on specific day
     */
    public function isAvailableOnDay(int $dayOfWeek): bool
    {
        $preferredDays = $this->preferred_days ?? [1, 2, 3, 4, 5]; // Default to weekdays
        return in_array($dayOfWeek, $preferredDays);
    }

    /**
     * Check if teacher prefers specific time slot
     */
    public function prefersTimeSlot(int $timeSlotId): bool
    {
        return in_array($timeSlotId, $this->preferred_time_slots ?? []);
    }

    /**
     * Check if teacher is unavailable at specific time slot
     */
    public function isUnavailableAtTimeSlot(int $timeSlotId): bool
    {
        return in_array($timeSlotId, $this->unavailable_time_slots ?? []);
    }

    /**
     * Get current weekly workload
     */
    public function getCurrentWeeklyWorkload(): array
    {
        $currentSessions = $this->scheduleSessions()
                               ->whereHas('schedule', fn($q) => $q->where('status', 'active'))
                               ->get();

        $totalHours = $currentSessions->sum('duration_minutes') / 60;
        $sessionsByDay = $currentSessions->groupBy('day_of_week');

        return [
            'total_hours' => $totalHours,
            'total_sessions' => $currentSessions->count(),
            'max_hours_per_week' => $this->max_hours_per_week,
            'hours_remaining' => max(0, $this->max_hours_per_week - $totalHours),
            'utilization_percentage' => $this->max_hours_per_week > 0 ? 
                ($totalHours / $this->max_hours_per_week) * 100 : 0,
            'sessions_by_day' => $sessionsByDay->map->count()->toArray(),
            'can_add_more_sessions' => $totalHours < $this->max_hours_per_week,
        ];
    }

    /**
     * Get daily workload for specific day
     */
    public function getDailyWorkload(string $dayOfWeek): array
    {
        $daySessions = $this->scheduleSessions()
                           ->where('day_of_week', $dayOfWeek)
                           ->whereHas('schedule', fn($q) => $q->where('status', 'active'))
                           ->orderBy('start_time')
                           ->get();

        $totalMinutes = $daySessions->sum('duration_minutes');
        $consecutiveBlocks = $this->calculateConsecutiveBlocks($daySessions);

        return [
            'total_sessions' => $daySessions->count(),
            'total_minutes' => $totalMinutes,
            'total_hours' => $totalMinutes / 60,
            'max_classes_per_day' => $this->max_classes_per_day,
            'sessions_remaining' => max(0, $this->max_classes_per_day - $daySessions->count()),
            'consecutive_blocks' => $consecutiveBlocks,
            'max_consecutive_allowed' => $this->max_consecutive_classes,
            'can_add_more_sessions' => $daySessions->count() < $this->max_classes_per_day,
            'sessions' => $daySessions->toArray(),
        ];
    }

    /**
     * Calculate consecutive class blocks
     */
    protected function calculateConsecutiveBlocks($sessions): array
    {
        if ($sessions->isEmpty()) {
            return [];
        }

        $blocks = [];
        $currentBlock = [];
        $sessions = $sessions->sortBy('start_time');

        foreach ($sessions as $session) {
            if (empty($currentBlock)) {
                $currentBlock = [$session];
            } else {
                $lastSession = end($currentBlock);
                
                // Check if this session is consecutive (within 15 minutes of last session end)
                $timeDiff = Carbon::parse($session->start_time)->diffInMinutes(Carbon::parse($lastSession->end_time));
                
                if ($timeDiff <= 15) {
                    $currentBlock[] = $session;
                } else {
                    // Start new block
                    $blocks[] = $currentBlock;
                    $currentBlock = [$session];
                }
            }
        }

        if (!empty($currentBlock)) {
            $blocks[] = $currentBlock;
        }

        return array_map(function ($block) {
            return [
                'sessions_count' => count($block),
                'start_time' => $block[0]->start_time,
                'end_time' => end($block)->end_time,
                'total_duration' => collect($block)->sum('duration_minutes'),
                'exceeds_limit' => count($block) > $this->max_consecutive_classes,
            ];
        }, $blocks);
    }

    /**
     * Check if teacher can be assigned to new session
     */
    public function canBeAssignedToSession(array $sessionData): array
    {
        $conflicts = [];
        $dayOfWeek = $sessionData['day_of_week'];
        $timeSlotId = $sessionData['time_slot_id'];
        $gradeLevel = $sessionData['grade_level'] ?? null;

        // Check if active and valid
        if (!$this->is_active || $this->valid_until && $this->valid_until < today()) {
            $conflicts[] = [
                'type' => 'inactive',
                'message' => 'Teacher-subject assignment is inactive or expired',
            ];
        }

        // Check grade level compatibility
        if ($gradeLevel && !$this->canTeachGrade($gradeLevel)) {
            $conflicts[] = [
                'type' => 'grade_level',
                'message' => "Teacher cannot teach grade {$gradeLevel} for this subject",
            ];
        }

        // Check day availability
        if (!$this->isAvailableOnDay($dayOfWeek)) {
            $conflicts[] = [
                'type' => 'day_availability',
                'message' => "Teacher prefers not to work on " . self::DAYS_OF_WEEK[$dayOfWeek],
            ];
        }

        // Check time slot availability
        if ($this->isUnavailableAtTimeSlot($timeSlotId)) {
            $conflicts[] = [
                'type' => 'time_unavailable',
                'message' => 'Teacher is unavailable at this time slot',
            ];
        }

        // Check weekly workload
        $workload = $this->getCurrentWeeklyWorkload();
        if (!$workload['can_add_more_sessions']) {
            $conflicts[] = [
                'type' => 'weekly_overload',
                'message' => "Teacher has reached maximum weekly hours ({$this->max_hours_per_week})",
            ];
        }

        // Check daily workload
        $dailyWorkload = $this->getDailyWorkload($dayOfWeek);
        if (!$dailyWorkload['can_add_more_sessions']) {
            $conflicts[] = [
                'type' => 'daily_overload',
                'message' => "Teacher has reached maximum daily classes ({$this->max_classes_per_day})",
            ];
        }

        // Check for existing session at same time
        $existingSession = $this->scheduleSessions()
                               ->where('day_of_week', $dayOfWeek)
                               ->where('time_slot_id', $timeSlotId)
                               ->whereHas('schedule', fn($q) => $q->where('status', 'active'))
                               ->first();

        if ($existingSession) {
            $conflicts[] = [
                'type' => 'time_conflict',
                'message' => 'Teacher already has a class at this time',
                'conflicting_session_id' => $existingSession->id,
            ];
        }

        return [
            'can_assign' => empty($conflicts),
            'conflicts' => $conflicts,
            'assignment_score' => $this->calculateAssignmentScore($sessionData),
        ];
    }

    /**
     * Calculate assignment score (higher is better)
     */
    protected function calculateAssignmentScore(array $sessionData): int
    {
        $score = 50; // Base score

        // Bonus for primary subject
        if ($this->is_primary_subject) {
            $score += 20;
        }

        // Bonus for higher specialization
        $specializationBonus = [
            'basic' => 0,
            'intermediate' => 5,
            'advanced' => 10,
            'expert' => 15,
            'master' => 20,
        ];
        $score += $specializationBonus[$this->specialization_level] ?? 0;

        // Bonus for preferred time slot
        if ($this->prefersTimeSlot($sessionData['time_slot_id'])) {
            $score += 15;
        }

        // Bonus for preferred day
        if ($this->isAvailableOnDay($sessionData['day_of_week'])) {
            $score += 10;
        }

        // Penalty for high current workload
        $workload = $this->getCurrentWeeklyWorkload();
        if ($workload['utilization_percentage'] > 80) {
            $score -= 10;
        }

        // Bonus for experience
        $score += min(10, $this->years_experience);

        // Bonus for good performance rating
        if ($this->performance_rating) {
            $score += ($this->performance_rating - 3) * 5; // Scale 1-5 to -10 to +10
        }

        return max(0, min(100, $score));
    }

    /**
     * Get room requirements for scheduling
     */
    public function getRoomRequirements(): array
    {
        $requirements = [];

        if ($this->requires_lab) {
            $requirements[] = 'laboratory';
        }

        if ($this->requires_projector) {
            $requirements[] = 'projector';
        }

        if ($this->requires_computer) {
            $requirements[] = 'computer_lab';
        }

        // Add custom room requirements
        if ($this->room_requirements) {
            $requirements = array_merge($requirements, $this->room_requirements);
        }

        return array_unique($requirements);
    }

    /**
     * Get teaching performance summary
     */
    public function getPerformanceSummary(): array
    {
        $statistics = $this->teaching_statistics ?? [];

        return [
            'years_experience' => $this->years_experience,
            'performance_rating' => $this->performance_rating,
            'specialization_level' => $this->specialization_level_label,
            'is_primary_subject' => $this->is_primary_subject,
            'last_training' => $this->last_training_date?->diffForHumans(),
            'current_workload' => $this->getCurrentWeeklyWorkload(),
            'student_satisfaction' => $statistics['student_satisfaction'] ?? null,
            'completion_rate' => $statistics['completion_rate'] ?? null,
            'professional_development_hours' => $statistics['pd_hours'] ?? 0,
            'certifications' => $statistics['certifications'] ?? [],
        ];
    }

    /**
     * Update teaching statistics
     */
    public function updateTeachingStatistics(array $newStats): bool
    {
        $currentStats = $this->teaching_statistics ?? [];
        $updatedStats = array_merge($currentStats, $newStats);

        return $this->update(['teaching_statistics' => $updatedStats]);
    }

    /**
     * Get qualified teachers for subject and grade
     */
    public static function getQualifiedTeachers(int $subjectId, int $gradeLevel): \Illuminate\Database\Eloquent\Collection
    {
        return self::with(['teacher', 'subject'])
                  ->where('subject_id', $subjectId)
                  ->canTeachGrade($gradeLevel)
                  ->availableForScheduling()
                  ->orderByDesc('performance_rating')
                  ->orderByDesc('years_experience')
                  ->orderBy('specialization_level')
                  ->get();
    }

    /**
     * Get teacher's subject expertise summary
     */
    public static function getTeacherExpertise(int $teacherId): array
    {
        $assignments = self::with('subject')
                          ->where('teacher_id', $teacherId)
                          ->active()
                          ->get();

        return [
            'total_subjects' => $assignments->count(),
            'primary_subjects' => $assignments->where('is_primary_subject', true)->count(),
            'subjects_by_level' => $assignments->groupBy('specialization_level')->map->count(),
            'grade_range' => [
                'min' => $assignments->flatMap(fn($a) => $a->grade_levels)->min(),
                'max' => $assignments->flatMap(fn($a) => $a->grade_levels)->max(),
            ],
            'total_max_hours' => $assignments->sum('max_hours_per_week'),
            'subjects' => $assignments->map(function ($assignment) {
                return [
                    'subject_name' => $assignment->subject->name,
                    'specialization_level' => $assignment->specialization_level_label,
                    'grade_levels' => $assignment->grade_levels_labels,
                    'is_primary' => $assignment->is_primary_subject,
                    'max_hours' => $assignment->max_hours_per_week,
                    'performance_rating' => $assignment->performance_rating,
                ];
            })->toArray(),
        ];
    }
}