<?php

namespace App\Services;

use App\Models\Room;
use App\Models\Grade;
use App\Models\Schedule;
use Illuminate\Support\Facades\DB;

class RoomScheduleService extends BaseService
{
    /**
     * Check room availability for a time slot
     */
    public function isRoomAvailable(int $roomId, string $date, string $startTime, string $endTime, ?int $excludeScheduleId = null): bool
    {
        $query = Schedule::where('room_id', $roomId)
            ->where('date', $date)
            ->where(function ($q) use ($startTime, $endTime) {
                $q->whereBetween('start_time', [$startTime, $endTime])
                  ->orWhereBetween('end_time', [$startTime, $endTime])
                  ->orWhere(function ($q2) use ($startTime, $endTime) {
                      $q2->where('start_time', '<=', $startTime)
                         ->where('end_time', '>=', $endTime);
                  });
            });

        if ($excludeScheduleId) {
            $query->where('id', '!=', $excludeScheduleId);
        }

        return !$query->exists();
    }

    /**
     * Get room schedule for a specific date
     */
    public function getRoomSchedule(int $roomId, string $date): array
    {
        $schedules = Schedule::where('room_id', $roomId)
            ->where('date', $date)
            ->with(['grade', 'subject', 'teacher.profile'])
            ->orderBy('start_time')
            ->get();

        return $schedules->map(function ($schedule) {
            return [
                'id' => $schedule->id,
                'start_time' => $schedule->start_time,
                'end_time' => $schedule->end_time,
                'duration' => $schedule->duration_minutes,
                'grade' => $schedule->grade ? [
                    'id' => $schedule->grade->id,
                    'name' => $schedule->grade->name,
                    'full_name' => $schedule->grade->full_name,
                    'class_level' => $schedule->grade->class_level,
                ] : null,
                'subject' => $schedule->subject ? [
                    'id' => $schedule->subject->id,
                    'name' => $schedule->subject->name,
                    'code' => $schedule->subject->code,
                ] : null,
                'teacher' => $schedule->teacher ? [
                    'id' => $schedule->teacher->id,
                    'full_name' => $schedule->teacher->profile 
                        ? "{$schedule->teacher->profile->first_name} {$schedule->teacher->profile->last_name}"
                        : $schedule->teacher->username,
                ] : null,
                'schedule_type' => $schedule->schedule_type,
                'notes' => $schedule->notes,
            ];
        })->toArray();
    }

    /**
     * Get room schedule for a week
     */
    public function getRoomWeeklySchedule(int $roomId, string $startDate): array
    {
        $endDate = date('Y-m-d', strtotime($startDate . ' +6 days'));
        
        $schedules = Schedule::where('room_id', $roomId)
            ->whereBetween('date', [$startDate, $endDate])
            ->with(['grade', 'subject', 'teacher.profile'])
            ->orderBy('date')
            ->orderBy('start_time')
            ->get();

        $weeklySchedule = [];
        
        for ($i = 0; $i < 7; $i++) {
            $currentDate = date('Y-m-d', strtotime($startDate . " +{$i} days"));
            $dayName = date('l', strtotime($currentDate));
            
            $daySchedules = $schedules->where('date', $currentDate);
            
            $weeklySchedule[$dayName] = [
                'date' => $currentDate,
                'day_name' => $dayName,
                'schedules' => $daySchedules->map(function ($schedule) {
                    return [
                        'id' => $schedule->id,
                        'start_time' => $schedule->start_time,
                        'end_time' => $schedule->end_time,
                        'grade_name' => $schedule->grade?->full_name,
                        'subject_name' => $schedule->subject?->name,
                        'teacher_name' => $schedule->teacher?->profile 
                            ? "{$schedule->teacher->profile->first_name} {$schedule->teacher->profile->last_name}"
                            : $schedule->teacher?->username,
                        'schedule_type' => $schedule->schedule_type,
                    ];
                })->values()->toArray(),
                'total_hours' => $daySchedules->sum('duration_minutes') / 60,
            ];
        }

        return $weeklySchedule;
    }

    /**
     * Get room utilization statistics
     */
    public function getRoomUtilization(int $roomId, string $startDate, string $endDate): array
    {
        $room = Room::findOrFail($roomId);
        
        $schedules = Schedule::where('room_id', $roomId)
            ->whereBetween('date', [$startDate, $endDate])
            ->get();

        $totalMinutes = $schedules->sum('duration_minutes');
        $totalHours = round($totalMinutes / 60, 2);
        
        // Calculate working hours (assuming 8 hours per day, 5 days per week)
        $startDateTime = new \DateTime($startDate);
        $endDateTime = new \DateTime($endDate);
        $interval = $startDateTime->diff($endDateTime);
        $totalDays = $interval->days + 1;
        $workingDays = ceil($totalDays * 5/7); // Approximate working days
        $availableHours = $workingDays * 8;
        
        $utilizationRate = $availableHours > 0 ? round(($totalHours / $availableHours) * 100, 2) : 0;

        // Daily breakdown
        $dailyBreakdown = $schedules->groupBy('date')->map(function ($daySchedules, $date) {
            $dayMinutes = $daySchedules->sum('duration_minutes');
            return [
                'date' => $date,
                'day_name' => date('l', strtotime($date)),
                'total_hours' => round($dayMinutes / 60, 2),
                'schedule_count' => $daySchedules->count(),
                'utilization_rate' => round(($dayMinutes / (8 * 60)) * 100, 2), // 8 hours = 480 minutes
            ];
        });

        return [
            'room_info' => [
                'id' => $room->id,
                'name' => $room->name,
                'full_identifier' => $room->full_identifier,
                'capacity' => $room->capacity,
            ],
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'total_days' => $totalDays,
                'working_days' => $workingDays,
            ],
            'utilization' => [
                'total_hours' => $totalHours,
                'available_hours' => $availableHours,
                'utilization_rate' => $utilizationRate,
                'total_schedules' => $schedules->count(),
                'average_session_duration' => $schedules->count() > 0 
                    ? round($totalMinutes / $schedules->count(), 2) 
                    : 0,
            ],
            'daily_breakdown' => $dailyBreakdown->values()->toArray(),
        ];
    }

    /**
     * Find available time slots in a room
     */
    public function findAvailableTimeSlots(int $roomId, string $date, int $durationMinutes = 45): array
    {
        $existingSchedules = Schedule::where('room_id', $roomId)
            ->where('date', $date)
            ->orderBy('start_time')
            ->get();

        // Define working hours (8:00 AM to 6:00 PM)
        $workingStart = '08:00:00';
        $workingEnd = '18:00:00';
        
        $availableSlots = [];
        $currentTime = $workingStart;
        
        foreach ($existingSchedules as $schedule) {
            // Check if there's time between current time and this schedule
            $timeBeforeSchedule = strtotime($schedule->start_time) - strtotime($currentTime);
            
            if ($timeBeforeSchedule >= ($durationMinutes * 60)) {
                $slotEnd = date('H:i:s', strtotime($currentTime) + ($durationMinutes * 60));
                if (strtotime($slotEnd) <= strtotime($schedule->start_time)) {
                    $availableSlots[] = [
                        'start_time' => $currentTime,
                        'end_time' => $slotEnd,
                        'duration_minutes' => $durationMinutes,
                    ];
                }
            }
            
            $currentTime = $schedule->end_time;
        }
        
        // Check if there's time after the last schedule
        $timeAfterLastSchedule = strtotime($workingEnd) - strtotime($currentTime);
        if ($timeAfterLastSchedule >= ($durationMinutes * 60)) {
            $slotEnd = date('H:i:s', strtotime($currentTime) + ($durationMinutes * 60));
            if (strtotime($slotEnd) <= strtotime($workingEnd)) {
                $availableSlots[] = [
                    'start_time' => $currentTime,
                    'end_time' => $slotEnd,
                    'duration_minutes' => $durationMinutes,
                ];
            }
        }

        return $availableSlots;
    }

    /**
     * Get room conflict analysis
     */
    public function getRoomConflicts(int $roomId, string $startDate, string $endDate): array
    {
        $schedules = Schedule::where('room_id', $roomId)
            ->whereBetween('date', [$startDate, $endDate])
            ->orderBy('date')
            ->orderBy('start_time')
            ->get();

        $conflicts = [];
        
        for ($i = 0; $i < $schedules->count() - 1; $i++) {
            $current = $schedules[$i];
            $next = $schedules[$i + 1];
            
            // Check if schedules are on the same date
            if ($current->date === $next->date) {
                // Check for overlap
                if (strtotime($current->end_time) > strtotime($next->start_time)) {
                    $conflicts[] = [
                        'date' => $current->date,
                        'conflict_type' => 'overlap',
                        'first_schedule' => [
                            'id' => $current->id,
                            'time' => $current->start_time . ' - ' . $current->end_time,
                            'grade' => $current->grade?->full_name,
                            'subject' => $current->subject?->name,
                        ],
                        'second_schedule' => [
                            'id' => $next->id,
                            'time' => $next->start_time . ' - ' . $next->end_time,
                            'grade' => $next->grade?->full_name,
                            'subject' => $next->subject?->name,
                        ],
                        'overlap_minutes' => (strtotime($current->end_time) - strtotime($next->start_time)) / 60,
                    ];
                }
            }
        }

        return [
            'total_conflicts' => count($conflicts),
            'conflicts' => $conflicts,
        ];
    }

    /**
     * Get rooms with highest utilization
     */
    public function getMostUtilizedRooms(array $roomIds, string $startDate, string $endDate, int $limit = 10): array
    {
        $utilizationData = [];
        
        foreach ($roomIds as $roomId) {
            $utilization = $this->getRoomUtilization($roomId, $startDate, $endDate);
            $utilizationData[] = [
                'room_id' => $roomId,
                'room_name' => $utilization['room_info']['name'],
                'full_identifier' => $utilization['room_info']['full_identifier'],
                'utilization_rate' => $utilization['utilization']['utilization_rate'],
                'total_hours' => $utilization['utilization']['total_hours'],
                'total_schedules' => $utilization['utilization']['total_schedules'],
            ];
        }
        
        // Sort by utilization rate descending
        usort($utilizationData, function ($a, $b) {
            return $b['utilization_rate'] <=> $a['utilization_rate'];
        });
        
        return array_slice($utilizationData, 0, $limit);
    }

    /**
     * Suggest optimal room for a schedule
     */
    public function suggestOptimalRoom(array $availableRoomIds, int $expectedStudents, string $roomType = null): ?array
    {
        $rooms = Room::whereIn('id', $availableRoomIds)
            ->where('is_active', true)
            ->when($roomType, function ($query, $roomType) {
                return $query->where('room_type', $roomType);
            })
            ->get();

        $suitableRooms = $rooms->filter(function ($room) use ($expectedStudents) {
            return $room->capacity >= $expectedStudents;
        });

        if ($suitableRooms->isEmpty()) {
            return null;
        }

        // Sort by capacity (prefer smallest room that fits)
        $optimalRoom = $suitableRooms->sortBy('capacity')->first();

        return [
            'id' => $optimalRoom->id,
            'name' => $optimalRoom->name,
            'full_identifier' => $optimalRoom->full_identifier,
            'capacity' => $optimalRoom->capacity,
            'room_type' => $optimalRoom->room_type,
            'facilities' => $optimalRoom->facilities,
            'efficiency_score' => $expectedStudents > 0 
                ? round(($expectedStudents / $optimalRoom->capacity) * 100, 2) 
                : 0,
        ];
    }
}