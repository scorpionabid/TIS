<?php

namespace App\Services\Schedule;

use App\Models\Schedule;
use App\Models\ScheduleSession;
use App\Models\TeachingLoad;
use App\Models\ScheduleGenerationSetting;
use App\Services\Schedule\WorkloadScheduleIntegrationService;
use App\Services\Schedule\ScheduleRoomAssignmentService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ScheduleGenerationEngine
{
    private WorkloadScheduleIntegrationService $integrationService;
    private ScheduleRoomAssignmentService $roomAssignmentService;
    private array $timeMatrix = [];
    private array $conflicts = [];
    private array $generationLog = [];

    public function __construct(WorkloadScheduleIntegrationService $integrationService, ScheduleRoomAssignmentService $roomAssignmentService)
    {
        $this->integrationService = $integrationService;
        $this->roomAssignmentService = $roomAssignmentService;
    }

    /**
     * Generate schedule from workload data.
     */
    public function generateFromWorkload(array $workloadData, array $preferences = []): array
    {
        try {
            $startTime = microtime(true);
            $startMemory = memory_get_usage();

            $this->log('Starting schedule generation', ['institution_id' => $workloadData['institution']['id']]);

            // Initialize generation process
            $this->initializeGeneration($workloadData, $preferences);

            // Create schedule record
            $schedule = $this->createScheduleRecord($workloadData, $preferences);

            // Generate time matrix
            $this->createTimeMatrix($workloadData['settings'], $workloadData['time_slots']);

            // Process teaching loads with constraint satisfaction
            $scheduledSessions = $this->processTeachingLoads($workloadData['teaching_loads'], $schedule);

            // Detect and resolve conflicts
            $this->detectConflicts();
            $resolvedConflicts = $this->resolveConflicts($workloadData['settings']);

            // Save schedule sessions
            $this->saveScheduleSessions($scheduledSessions, $schedule);

            // Update teaching loads status
            $this->updateTeachingLoadsStatus($workloadData['teaching_loads'], $schedule->id);

            // Calculate final statistics
            $executionTime = (microtime(true) - $startTime) * 1000;
            $statistics = $this->calculateFinalStatistics($schedule, $executionTime, $startMemory);

            $this->log('Schedule generation completed successfully');

            return [
                'success' => true,
                'schedule' => $schedule->fresh(['sessions', 'teachingLoads']),
                'sessions_created' => count($scheduledSessions),
                'conflicts' => $this->conflicts,
                'resolved_conflicts' => $resolvedConflicts,
                'statistics' => $statistics,
                'generation_log' => $this->generationLog
            ];

        } catch (\Exception $e) {
            Log::error('Schedule generation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
                'conflicts' => $this->conflicts,
                'generation_log' => $this->generationLog
            ];
        }
    }

    /**
     * Initialize the generation process.
     */
    private function initializeGeneration(array $workloadData, array $preferences): void
    {
        $this->timeMatrix = [];
        $this->conflicts = [];
        $this->generationLog = [];
        
        $this->log('Generation initialized', [
            'teaching_loads_count' => count($workloadData['teaching_loads']),
            'time_slots_count' => count($workloadData['time_slots']),
            'preferences' => $preferences
        ]);
    }

    /**
     * Create schedule record.
     */
    private function createScheduleRecord(array $workloadData, array $preferences): Schedule
    {
        $scheduleName = 'Generated Schedule - ' . $workloadData['institution']['name'] . ' - ' . date('Y-m-d H:i');

        $schedule = Schedule::create([
            'name' => $scheduleName,
            'institution_id' => $workloadData['institution']['id'],
            'academic_year_id' => $workloadData['academic_year_id'],
            'schedule_type' => 'regular',
            'generation_method' => 'automated',
            'status' => 'draft',
            'created_by' => auth()->id() ?? 1,
            'effective_date' => Carbon::now()->startOfWeek(),
            'working_days' => $workloadData['settings']['working_days'],
            'total_periods_per_day' => $workloadData['settings']['daily_periods'],
            'scheduling_preferences' => $preferences,
            'metadata' => [
                'generated_at' => now()->toISOString(),
                'generation_engine_version' => '1.0',
                'workload_data_hash' => md5(json_encode($workloadData['teaching_loads']))
            ]
        ]);

        $this->log('Schedule record created', ['schedule_id' => $schedule->id]);

        return $schedule;
    }

    /**
     * Create time matrix for scheduling.
     */
    private function createTimeMatrix(array $settings, array $timeSlots): void
    {
        $this->timeMatrix = [];
        
        foreach ($settings['working_days'] as $day) {
            $this->timeMatrix[$day] = [];
            
            foreach ($timeSlots as $slot) {
                if ($slot['slot_type'] === 'lesson') {
                    $this->timeMatrix[$day][$slot['period_number']] = [
                        'available' => true,
                        'assignments' => [],
                        'conflicts' => [],
                        'time_slot' => $slot
                    ];
                }
            }
        }

        $this->log('Time matrix created', [
            'days' => count($this->timeMatrix),
            'periods_per_day' => count($timeSlots)
        ]);
    }

    /**
     * Process teaching loads using constraint satisfaction.
     */
    private function processTeachingLoads(array $teachingLoads, Schedule $schedule): array
    {
        $scheduledSessions = [];
        
        // Sort teaching loads by priority
        usort($teachingLoads, function ($a, $b) {
            return $a['priority_level'] <=> $b['priority_level'];
        });

        foreach ($teachingLoads as $load) {
            $this->log("Processing teaching load", [
                'load_id' => $load['id'],
                'teacher' => $load['teacher']['name'],
                'subject' => $load['subject']['name'],
                'weekly_hours' => $load['weekly_hours']
            ]);

            $sessions = $this->scheduleTeachingLoad($load, $schedule);
            $scheduledSessions = array_merge($scheduledSessions, $sessions);
        }

        return $scheduledSessions;
    }

    /**
     * Schedule a single teaching load.
     */
    private function scheduleTeachingLoad(array $load, Schedule $schedule): array
    {
        $sessions = [];
        $remainingHours = $load['weekly_hours'];
        $distribution = $load['ideal_distribution'];

        foreach ($distribution as $dayDistribution) {
            $day = $dayDistribution['day'];
            $lessonsNeeded = min($dayDistribution['lessons'], $remainingHours);
            
            if ($lessonsNeeded <= 0) continue;

            $daySessions = $this->findOptimalSlotsForDay($load, $day, $lessonsNeeded, $dayDistribution['consecutive']);
            
            foreach ($daySessions as $session) {
                $sessions[] = $session;
                $remainingHours--;
                
                if ($remainingHours <= 0) break;
            }
            
            if ($remainingHours <= 0) break;
        }

        // If we couldn't schedule all hours, try to fit remaining hours anywhere
        if ($remainingHours > 0) {
            $additionalSessions = $this->scheduleRemainingHours($load, $remainingHours, $schedule);
            $sessions = array_merge($sessions, $additionalSessions);
        }

        return $sessions;
    }

    /**
     * Find optimal time slots for a specific day.
     */
    private function findOptimalSlotsForDay(array $load, int $day, int $lessonsNeeded, bool $consecutive): array
    {
        $sessions = [];
        $availableSlots = $this->getAvailableSlotsForDay($day);
        
        // Filter based on teacher and class availability
        $viableSlots = array_filter($availableSlots, function ($slot) use ($load) {
            return $this->isSlotViableForLoad($day, $slot, $load);
        });

        if (count($viableSlots) < $lessonsNeeded) {
            $this->addConflict([
                'type' => 'insufficient_slots',
                'load_id' => $load['id'],
                'day' => $day,
                'needed' => $lessonsNeeded,
                'available' => count($viableSlots)
            ]);
            return [];
        }

        // If consecutive lessons are needed, find consecutive slots
        if ($consecutive && $lessonsNeeded > 1) {
            $consecutiveSlots = $this->findConsecutiveSlots($viableSlots, $lessonsNeeded);
            if ($consecutiveSlots) {
                return $this->createSessionsForSlots($load, $day, $consecutiveSlots);
            }
        }

        // Otherwise, pick the best available slots
        $selectedSlots = array_slice($viableSlots, 0, $lessonsNeeded);
        return $this->createSessionsForSlots($load, $day, $selectedSlots);
    }

    /**
     * Check if a time slot is viable for a teaching load.
     */
    private function isSlotViableForLoad(int $day, int $period, array $load): bool
    {
        // Check if slot is available
        if (!$this->timeMatrix[$day][$period]['available']) {
            return false;
        }

        // Check teacher availability
        foreach ($this->timeMatrix[$day][$period]['assignments'] as $assignment) {
            if ($assignment['teacher_id'] === $load['teacher']['id']) {
                return false;
            }
        }

        // Check class availability  
        foreach ($this->timeMatrix[$day][$period]['assignments'] as $assignment) {
            if ($assignment['class_id'] === $load['class']['id']) {
                return false;
            }
        }

        // Check teacher preferences
        if (!empty($load['unavailable_periods'])) {
            $slotKey = $day . '_' . $period;
            if (in_array($slotKey, $load['unavailable_periods'])) {
                return false;
            }
        }

        return true;
    }

    /**
     * Find consecutive available slots.
     */
    private function findConsecutiveSlots(array $availableSlots, int $needed): ?array
    {
        sort($availableSlots);
        
        for ($i = 0; $i <= count($availableSlots) - $needed; $i++) {
            $consecutive = [$availableSlots[$i]];
            
            for ($j = $i + 1; $j < count($availableSlots); $j++) {
                if ($availableSlots[$j] === end($consecutive) + 1) {
                    $consecutive[] = $availableSlots[$j];
                    
                    if (count($consecutive) === $needed) {
                        return $consecutive;
                    }
                } else {
                    break;
                }
            }
        }

        return null;
    }

    /**
     * Create schedule sessions for given slots.
     */
    private function createSessionsForSlots(array $load, int $day, array $slots): array
    {
        $sessions = [];
        $dayName = $this->convertDayToString($day);

        foreach ($slots as $period) {
            $timeSlot = $this->timeMatrix[$day][$period]['time_slot'];
            $assignedRoomId = $this->roomAssignmentService->assignRoom($load, $dayName, $timeSlot);

            $session = [
                'teaching_load_id' => $load['id'],
                'subject_id' => $load['subject']['id'],
                'teacher_id' => $load['teacher']['id'],
                'room_id' => $assignedRoomId,
                'day_of_week' => $dayName,
                'period_number' => $period,
                'start_time' => $timeSlot['start_time'],
                'end_time' => $timeSlot['end_time'],
                'duration_minutes' => $timeSlot['duration'],
                'session_type' => 'regular',
                'status' => 'scheduled'
            ];

            // Mark slot as occupied
            $this->timeMatrix[$day][$period]['assignments'][] = [
                'teacher_id' => $load['teacher']['id'],
                'class_id' => $load['class']['id'],
                'subject_id' => $load['subject']['id'],
                'room_id' => $assignedRoomId,
                'teaching_load_id' => $load['id']
            ];

            $sessions[] = $session;
        }

        return $sessions;
    }

    /**
     * Get available slots for a day.
     */
    private function getAvailableSlotsForDay(int $day): array
    {
        $available = [];
        
        if (isset($this->timeMatrix[$day])) {
            foreach ($this->timeMatrix[$day] as $period => $slot) {
                if ($slot['available']) {
                    $available[] = $period;
                }
            }
        }

        return $available;
    }

    /**
     * Schedule remaining hours that couldn't be distributed according to ideal pattern.
     */
    private function scheduleRemainingHours(array $load, int $remainingHours, Schedule $schedule): array
    {
        $sessions = [];
        
        // Try to fit remaining hours in any available slots
        foreach ($this->timeMatrix as $day => $periods) {
            if ($remainingHours <= 0) break;
            
            foreach ($periods as $period => $slot) {
                if ($remainingHours <= 0) break;
                
                if ($this->isSlotViableForLoad($day, $period, $load)) {
                    $sessionData = $this->createSessionsForSlots($load, $day, [$period]);
                    $sessions = array_merge($sessions, $sessionData);
                    $remainingHours--;
                }
            }
        }

        if ($remainingHours > 0) {
            $this->addConflict([
                'type' => 'unscheduled_hours',
                'load_id' => $load['id'],
                'teacher' => $load['teacher']['name'],
                'subject' => $load['subject']['name'],
                'unscheduled_hours' => $remainingHours
            ]);
        }

        return $sessions;
    }

    /**
     * Add conflict to the conflicts array.
     */
    private function addConflict(array $conflict): void
    {
        $this->conflicts[] = array_merge($conflict, [
            'timestamp' => now()->toISOString()
        ]);
    }

    /**
     * Detect conflicts in the generated schedule.
     */
    private function detectConflicts(): void
    {
        // Teacher conflicts
        $this->detectTeacherConflicts();
        
        // Class conflicts
        $this->detectClassConflicts();
        
        // Room conflicts (if rooms are assigned)
        $this->detectRoomConflicts();
    }

    /**
     * Detect teacher scheduling conflicts.
     */
    private function detectTeacherConflicts(): void
    {
        foreach ($this->timeMatrix as $day => $periods) {
            foreach ($periods as $period => $slot) {
                $teachers = [];
                
                foreach ($slot['assignments'] as $assignment) {
                    $teacherId = $assignment['teacher_id'];
                    
                    if (isset($teachers[$teacherId])) {
                        $this->addConflict([
                            'type' => 'teacher_double_booking',
                            'teacher_id' => $teacherId,
                            'day' => $day,
                            'period' => $period,
                            'conflicting_loads' => [$teachers[$teacherId], $assignment['teaching_load_id']]
                        ]);
                    } else {
                        $teachers[$teacherId] = $assignment['teaching_load_id'];
                    }
                }
            }
        }
    }

    /**
     * Detect class scheduling conflicts.
     */
    private function detectClassConflicts(): void
    {
        foreach ($this->timeMatrix as $day => $periods) {
            foreach ($periods as $period => $slot) {
                $classes = [];
                
                foreach ($slot['assignments'] as $assignment) {
                    $classId = $assignment['class_id'];
                    
                    if (isset($classes[$classId])) {
                        $this->addConflict([
                            'type' => 'class_double_booking',
                            'class_id' => $classId,
                            'day' => $day,
                            'period' => $period,
                            'conflicting_loads' => [$classes[$classId], $assignment['teaching_load_id']]
                        ]);
                    } else {
                        $classes[$classId] = $assignment['teaching_load_id'];
                    }
                }
            }
        }
    }

    /**
     * Detect room conflicts (placeholder).
     */
    private function detectRoomConflicts(): void
    {
        foreach ($this->timeMatrix as $day => $periods) {
            foreach ($periods as $period => $slot) {
                $roomAssignments = [];
                
                foreach ($slot['assignments'] as $assignment) {
                    $roomId = $assignment['room_id'] ?? null;
                    if (!$roomId) {
                        continue;
                    }

                    if (isset($roomAssignments[$roomId])) {
                        $this->addConflict([
                            'type' => 'room_double_booking',
                            'room_id' => $roomId,
                            'day' => $day,
                            'period' => $period,
                            'conflicting_loads' => [
                                $roomAssignments[$roomId],
                                $assignment['teaching_load_id']
                            ]
                        ]);
                    } else {
                        $roomAssignments[$roomId] = $assignment['teaching_load_id'];
                    }
                }
            }
        }
    }

    /**
     * Attempt to resolve conflicts.
     */
    private function resolveConflicts(array $settings): array
    {
        $resolved = [];
        
        // For now, just log conflicts - advanced resolution will be implemented in Phase 2
        foreach ($this->conflicts as $conflict) {
            $this->log("Conflict detected", $conflict);
        }

        return $resolved;
    }

    /**
     * Save schedule sessions to database.
     */
    private function saveScheduleSessions(array $sessions, Schedule $schedule): void
    {
        foreach ($sessions as $session) {
            $session['schedule_id'] = $schedule->id;
            ScheduleSession::create($session);
        }

        $this->log('Schedule sessions saved', ['count' => count($sessions)]);
    }

    /**
     * Update teaching loads status after scheduling.
     */
    private function updateTeachingLoadsStatus(array $teachingLoads, int $scheduleId): void
    {
        $loadIds = array_column($teachingLoads, 'id');
        $this->integrationService->markTeachingLoadsAsScheduled($loadIds, $scheduleId);
        
        $this->log('Teaching loads marked as scheduled', ['count' => count($loadIds)]);
    }

    /**
     * Calculate final statistics.
     */
    private function calculateFinalStatistics(Schedule $schedule, float $durationMs, int $startMemory): array
    {
        $totalSessions = $schedule->sessions()->count();
        $conflictCount = count($this->conflicts);
        $memoryUsage = max(memory_get_usage() - $startMemory, 0);
        $successRate = $totalSessions > 0
            ? round((($totalSessions - $conflictCount) / $totalSessions) * 100, 2)
            : 0;

        return [
            'total_sessions' => $totalSessions,
            'conflicts_count' => $conflictCount,
            'success_rate' => $successRate,
            'generation_duration_ms' => round($durationMs, 2),
            'memory_usage_bytes' => $memoryUsage,
            'efficiency_score' => $this->calculateEfficiencyScore($totalSessions, $conflictCount)
        ];
    }

    private function calculateEfficiencyScore(int $totalSessions, int $conflictCount): float
    {
        if ($totalSessions === 0) {
            return 0.0;
        }

        $conflictPenalty = min(1, $conflictCount / max($totalSessions, 1));
        $score = (1 - $conflictPenalty) * 100;

        return round($score, 2);
    }

    /**
     * Convert day number to string.
     */
    private function convertDayToString(int $day): string
    {
        $days = [
            1 => 'monday',
            2 => 'tuesday', 
            3 => 'wednesday',
            4 => 'thursday',
            5 => 'friday',
            6 => 'saturday',
            7 => 'sunday'
        ];

        return $days[$day] ?? 'monday';
    }

    /**
     * Log generation events.
     */
    private function log(string $message, array $context = []): void
    {
        $this->generationLog[] = [
            'timestamp' => now()->toISOString(),
            'message' => $message,
            'context' => $context
        ];

        Log::info("Schedule Generation: {$message}", $context);
    }
}
