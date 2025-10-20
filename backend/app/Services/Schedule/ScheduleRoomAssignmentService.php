<?php

namespace App\Services\Schedule;

use App\Models\Room;
use App\Models\Institution;
use Illuminate\Support\Collection;

class ScheduleRoomAssignmentService
{
    /**
     * Find an available room matching class/slot requirements.
     */
    public function assignRoom(array $load, string $dayOfWeek, array $timeSlot): ?int
    {
        $institutionId = $load['class']['institution_id'] ?? null;
        if (!$institutionId) {
            return null;
        }

        $rooms = $this->getRoomsForInstitution($institutionId);

        foreach ($rooms as $room) {
            if ($this->roomSatisfiesConstraints($room, $load, $timeSlot)) {
                return $room->id;
            }
        }

        return null;
    }

    /**
     * Fetch rooms for institution with basic filters.
     */
    protected function getRoomsForInstitution(int $institutionId): Collection
    {
        return Room::query()
            ->where('institution_id', $institutionId)
            ->where('is_active', true)
            ->orderBy('capacity', 'desc')
            ->get();
    }

    /**
     * Validate room against load requirements.
     */
    protected function roomSatisfiesConstraints(Room $room, array $load, array $timeSlot): bool
    {
        $targetCapacity = $load['class']['expected_students'] ?? null;

        if ($targetCapacity && $room->capacity && $room->capacity < $targetCapacity) {
            return false;
        }

        $requiresLab = $load['constraints']['requires_lab'] ?? ($load['subject']['requires_lab'] ?? false);
        if ($requiresLab && $room->room_type !== 'lab') {
            return false;
        }

        return true;
    }
}
