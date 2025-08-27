<?php

namespace App\Services;

use App\Models\Schedule;
use App\Models\ScheduleSession;
use App\Models\TeachingLoad;
use App\Models\Classes;
use App\Models\User;
use App\Models\Subject;
use App\Services\BaseService;
use App\Services\ScheduleValidationService;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ScheduleGenerationService extends BaseService
{
    protected $scheduleValidationService;

    public function __construct(ScheduleValidationService $scheduleValidationService)
    {
        $this->scheduleValidationService = $scheduleValidationService;
    }

    /**
     * Generate automatic schedule
     */
    public function generateSchedule(array $data, $user): array
    {
        return DB::transaction(function () use ($data, $user) {
            $schedule = Schedule::create([
                'institution_id' => $data['institution_id'],
                'academic_year' => $data['academic_year'],
                'semester' => $data['semester'],
                'name' => $data['name'],
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'status' => 'draft',
                'created_by' => $user->id,
                'working_days' => $data['working_days'] ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                'periods_per_day' => $data['periods_per_day'] ?? 7,
                'period_duration' => $data['period_duration'] ?? 45,
                'break_duration' => $data['break_duration'] ?? 10,
                'start_time' => $data['start_time'] ?? '08:00',
            ]);

            // Generate schedule sessions from teaching loads
            $generationResult = $this->generateScheduleSessions($schedule, $data);

            return [
                'schedule' => $schedule->fresh(['sessions', 'institution']),
                'generation_stats' => $generationResult['stats'],
                'conflicts' => $generationResult['conflicts'],
                'warnings' => $generationResult['warnings']
            ];
        });
    }

    /**
     * Generate schedule sessions from teaching loads
     */
    public function generateScheduleSessions(Schedule $schedule, array $options = []): array
    {
        $stats = [
            'total_loads' => 0,
            'sessions_created' => 0,
            'failed_assignments' => 0,
            'conflicts_detected' => 0
        ];

        $conflicts = [];
        $warnings = [];

        // Get teaching loads for this institution
        $teachingLoads = TeachingLoad::with(['teacher', 'class', 'subject'])
            ->whereHas('class', function ($query) use ($schedule) {
                $query->where('institution_id', $schedule->institution_id);
            })
            ->where('academic_year', $schedule->academic_year)
            ->where('semester', $schedule->semester)
            ->get();

        $stats['total_loads'] = $teachingLoads->count();

        foreach ($teachingLoads as $load) {
            try {
                $sessionResult = $this->createSessionsFromLoad($schedule, $load, $options);
                
                $stats['sessions_created'] += $sessionResult['sessions_created'];
                $stats['conflicts_detected'] += $sessionResult['conflicts'];
                
                if (!empty($sessionResult['conflicts_detail'])) {
                    $conflicts = array_merge($conflicts, $sessionResult['conflicts_detail']);
                }
                
                if (!empty($sessionResult['warnings'])) {
                    $warnings = array_merge($warnings, $sessionResult['warnings']);
                }
                
                if ($sessionResult['sessions_created'] == 0) {
                    $stats['failed_assignments']++;
                }
                
            } catch (\Exception $e) {
                $stats['failed_assignments']++;
                $warnings[] = "Dərs yükü ID {$load->id} üçün sesiyalar yaradıla bilmədi: {$e->getMessage()}";
            }
        }

        return [
            'stats' => $stats,
            'conflicts' => $conflicts,
            'warnings' => $warnings
        ];
    }

    /**
     * Create schedule sessions from a teaching load
     */
    private function createSessionsFromLoad(Schedule $schedule, TeachingLoad $load, array $options): array
    {
        $result = [
            'sessions_created' => 0,
            'conflicts' => 0,
            'conflicts_detail' => [],
            'warnings' => []
        ];

        // Distribute weekly hours across working days
        $distribution = $this->distributeHoursAcrossDays(
            $load->weekly_hours,
            $schedule->working_days,
            $options
        );

        foreach ($distribution as $dayInfo) {
            for ($i = 0; $i < $dayInfo['sessions']; $i++) {
                $sessionData = [
                    'schedule_id' => $schedule->id,
                    'class_id' => $load->class_id,
                    'teacher_id' => $load->teacher_id,
                    'subject_id' => $load->subject_id,
                    'day_of_week' => $dayInfo['day'],
                    'room_id' => $load->preferred_room_id,
                ];

                // Find available period
                $availablePeriod = $this->findAvailablePeriod($schedule, $sessionData);
                
                if ($availablePeriod) {
                    $sessionData['period'] = $availablePeriod['period'];
                    $sessionData['start_time'] = $availablePeriod['start_time'];
                    $sessionData['end_time'] = $availablePeriod['end_time'];

                    // Validate for conflicts before creating
                    $validationResult = $this->scheduleValidationService->validateSession($sessionData);
                    
                    if ($validationResult['is_valid']) {
                        ScheduleSession::create($sessionData);
                        $result['sessions_created']++;
                    } else {
                        $result['conflicts']++;
                        $result['conflicts_detail'][] = [
                            'type' => 'creation_conflict',
                            'message' => "Seziyanı yaratmaq mümkün deyil: " . implode(', ', $validationResult['errors']),
                            'session_data' => $sessionData,
                            'validation_errors' => $validationResult['errors']
                        ];
                    }
                } else {
                    $result['warnings'][] = "Müəllim {$load->teacher->name} üçün {$dayInfo['day']} günü üçün boş dövrə tapılmadı";
                }
            }
        }

        return $result;
    }

    /**
     * Distribute weekly hours across working days
     */
    public function distributeHoursAcrossDays(int $weeklyHours, array $workingDays, array $options = []): array
    {
        $maxSessionsPerDay = $options['max_sessions_per_day'] ?? 2;
        $preferredDistribution = $options['distribution_preference'] ?? 'even';
        
        $daysCount = count($workingDays);
        $distribution = [];

        if ($preferredDistribution === 'even') {
            // Even distribution
            $sessionsPerDay = intval($weeklyHours / $daysCount);
            $remainder = $weeklyHours % $daysCount;

            foreach ($workingDays as $index => $day) {
                $sessions = $sessionsPerDay;
                if ($index < $remainder) {
                    $sessions++; // Distribute remainder across first days
                }
                
                // Respect max sessions per day limit
                $sessions = min($sessions, $maxSessionsPerDay);
                
                if ($sessions > 0) {
                    $distribution[] = [
                        'day' => $day,
                        'sessions' => $sessions
                    ];
                }
            }
        } else {
            // Custom distribution logic can be added here
            $distribution = $this->customDistribution($weeklyHours, $workingDays, $options);
        }

        return $distribution;
    }

    /**
     * Find available period for a session
     */
    public function findAvailablePeriod(Schedule $schedule, array $sessionData): ?array
    {
        $periodsPerDay = $schedule->periods_per_day;
        $startTime = Carbon::createFromFormat('H:i', $schedule->start_time ?? '08:00');
        $periodDuration = $schedule->period_duration ?? 45;
        $breakDuration = $schedule->break_duration ?? 10;

        for ($period = 1; $period <= $periodsPerDay; $period++) {
            // Calculate period start and end times
            $periodStartMinutes = ($period - 1) * ($periodDuration + $breakDuration);
            $periodStart = $startTime->copy()->addMinutes($periodStartMinutes);
            $periodEnd = $periodStart->copy()->addMinutes($periodDuration);

            $sessionCheck = array_merge($sessionData, [
                'period' => $period,
                'start_time' => $periodStart->format('H:i'),
                'end_time' => $periodEnd->format('H:i')
            ]);

            // Check if this period is available (no conflicts)
            if ($this->isPeriodAvailable($schedule, $sessionCheck)) {
                return [
                    'period' => $period,
                    'start_time' => $periodStart->format('H:i'),
                    'end_time' => $periodEnd->format('H:i')
                ];
            }
        }

        return null; // No available period found
    }

    /**
     * Check if a period is available (no conflicts)
     */
    private function isPeriodAvailable(Schedule $schedule, array $sessionData): bool
    {
        // Check teacher availability
        $teacherConflict = ScheduleSession::where('schedule_id', $schedule->id)
            ->where('teacher_id', $sessionData['teacher_id'])
            ->where('day_of_week', $sessionData['day_of_week'])
            ->where('period', $sessionData['period'])
            ->exists();

        if ($teacherConflict) {
            return false;
        }

        // Check room availability (if room is specified)
        if (!empty($sessionData['room_id'])) {
            $roomConflict = ScheduleSession::where('schedule_id', $schedule->id)
                ->where('room_id', $sessionData['room_id'])
                ->where('day_of_week', $sessionData['day_of_week'])
                ->where('period', $sessionData['period'])
                ->exists();

            if ($roomConflict) {
                return false;
            }
        }

        // Check class availability
        $classConflict = ScheduleSession::where('schedule_id', $schedule->id)
            ->where('class_id', $sessionData['class_id'])
            ->where('day_of_week', $sessionData['day_of_week'])
            ->where('period', $sessionData['period'])
            ->exists();

        if ($classConflict) {
            return false;
        }

        return true;
    }

    /**
     * Custom distribution algorithm
     */
    private function customDistribution(int $weeklyHours, array $workingDays, array $options): array
    {
        $distribution = [];
        $remainingHours = $weeklyHours;
        $maxSessionsPerDay = $options['max_sessions_per_day'] ?? 2;

        // Priority days (if specified)
        $priorityDays = $options['priority_days'] ?? [];

        // First, assign to priority days
        foreach ($priorityDays as $day) {
            if (in_array($day, $workingDays) && $remainingHours > 0) {
                $sessions = min($remainingHours, $maxSessionsPerDay);
                $distribution[] = [
                    'day' => $day,
                    'sessions' => $sessions
                ];
                $remainingHours -= $sessions;
            }
        }

        // Then distribute remaining hours to other days
        $nonPriorityDays = array_diff($workingDays, $priorityDays);
        foreach ($nonPriorityDays as $day) {
            if ($remainingHours <= 0) break;
            
            $sessions = min($remainingHours, $maxSessionsPerDay);
            if ($sessions > 0) {
                $distribution[] = [
                    'day' => $day,
                    'sessions' => $sessions
                ];
                $remainingHours -= $sessions;
            }
        }

        return $distribution;
    }

    /**
     * Regenerate schedule with different parameters
     */
    public function regenerateSchedule(Schedule $schedule, array $options = [], $user = null): array
    {
        return DB::transaction(function () use ($schedule, $options, $user) {
            // Clear existing sessions
            $schedule->sessions()->delete();

            // Update schedule parameters if provided
            if (!empty($options['schedule_updates'])) {
                $schedule->update($options['schedule_updates']);
            }

            // Regenerate sessions
            $generationResult = $this->generateScheduleSessions($schedule, $options);

            // Update status
            if ($user) {
                $schedule->update([
                    'status' => 'draft',
                    'updated_by' => $user->id
                ]);
            }

            return [
                'schedule' => $schedule->fresh(['sessions', 'institution']),
                'generation_stats' => $generationResult['stats'],
                'conflicts' => $generationResult['conflicts'],
                'warnings' => $generationResult['warnings']
            ];
        });
    }

    /**
     * Optimize existing schedule
     */
    public function optimizeSchedule(Schedule $schedule, array $options = []): array
    {
        $optimizationResult = [
            'optimizations_applied' => 0,
            'conflicts_resolved' => 0,
            'improvements' => []
        ];

        // Get current conflicts
        $conflicts = $this->scheduleValidationService->validateCompleteSchedule($schedule);

        if (!empty($conflicts)) {
            // Attempt to resolve conflicts by reassigning periods
            foreach ($conflicts as $conflict) {
                $resolved = $this->resolveConflict($schedule, $conflict);
                if ($resolved) {
                    $optimizationResult['conflicts_resolved']++;
                    $optimizationResult['improvements'][] = "Çakışma həll edildi: {$conflict['message']}";
                }
            }
        }

        // Apply additional optimizations
        if ($options['balance_teacher_load'] ?? false) {
            $balanceResult = $this->balanceTeacherDailyLoad($schedule);
            $optimizationResult['optimizations_applied'] += $balanceResult['changes_made'];
            $optimizationResult['improvements'] = array_merge(
                $optimizationResult['improvements'], 
                $balanceResult['improvements']
            );
        }

        if ($options['optimize_room_usage'] ?? false) {
            $roomResult = $this->optimizeRoomUsage($schedule);
            $optimizationResult['optimizations_applied'] += $roomResult['changes_made'];
            $optimizationResult['improvements'] = array_merge(
                $optimizationResult['improvements'], 
                $roomResult['improvements']
            );
        }

        return $optimizationResult;
    }

    /**
     * Resolve a specific conflict
     */
    private function resolveConflict(Schedule $schedule, array $conflict): bool
    {
        // Implementation depends on conflict type
        // This is a simplified version
        
        if ($conflict['type'] === 'teacher_conflict') {
            return $this->resolveTeacherConflict($schedule, $conflict);
        }

        if ($conflict['type'] === 'room_conflict') {
            return $this->resolveRoomConflict($schedule, $conflict);
        }

        return false;
    }

    /**
     * Resolve teacher conflict by finding alternative period
     */
    private function resolveTeacherConflict(Schedule $schedule, array $conflict): bool
    {
        $conflictedSession = ScheduleSession::find($conflict['session_id']);
        if (!$conflictedSession) return false;

        // Find alternative period
        $originalPeriod = $conflictedSession->period;
        $conflictedSession->period = null; // Temporarily remove to check availability

        $alternativePeriod = $this->findAvailablePeriod($schedule, [
            'teacher_id' => $conflictedSession->teacher_id,
            'class_id' => $conflictedSession->class_id,
            'day_of_week' => $conflictedSession->day_of_week,
            'room_id' => $conflictedSession->room_id,
        ]);

        if ($alternativePeriod) {
            $conflictedSession->update([
                'period' => $alternativePeriod['period'],
                'start_time' => $alternativePeriod['start_time'],
                'end_time' => $alternativePeriod['end_time']
            ]);
            return true;
        }

        // Restore original period if no alternative found
        $conflictedSession->period = $originalPeriod;
        return false;
    }

    /**
     * Resolve room conflict by assigning alternative room
     */
    private function resolveRoomConflict(Schedule $schedule, array $conflict): bool
    {
        // This would require room availability checking
        // Simplified implementation
        return false;
    }

    /**
     * Balance teacher daily load
     */
    private function balanceTeacherDailyLoad(Schedule $schedule): array
    {
        // Implementation for balancing teacher workload across days
        return [
            'changes_made' => 0,
            'improvements' => []
        ];
    }

    /**
     * Optimize room usage
     */
    private function optimizeRoomUsage(Schedule $schedule): array
    {
        // Implementation for optimizing room assignments
        return [
            'changes_made' => 0,
            'improvements' => []
        ];
    }

    /**
     * Get generation statistics for a schedule
     */
    public function getGenerationStats(Schedule $schedule): array
    {
        $sessions = $schedule->sessions();
        
        return [
            'total_sessions' => $sessions->count(),
            'sessions_by_day' => $sessions->selectRaw('day_of_week, COUNT(*) as count')
                ->groupBy('day_of_week')
                ->pluck('count', 'day_of_week')
                ->toArray(),
            'sessions_by_period' => $sessions->selectRaw('period, COUNT(*) as count')
                ->groupBy('period')
                ->pluck('count', 'period')
                ->toArray(),
            'teachers_count' => $sessions->distinct('teacher_id')->count(),
            'classes_count' => $sessions->distinct('class_id')->count(),
            'subjects_count' => $sessions->distinct('subject_id')->count(),
            'utilization_rate' => $this->calculateUtilizationRate($schedule)
        ];
    }

    /**
     * Calculate schedule utilization rate
     */
    private function calculateUtilizationRate(Schedule $schedule): float
    {
        $totalPossibleSlots = count($schedule->working_days) * $schedule->periods_per_day;
        $usedSlots = $schedule->sessions()->count();
        
        return $totalPossibleSlots > 0 ? round(($usedSlots / $totalPossibleSlots) * 100, 2) : 0;
    }
}