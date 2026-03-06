<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\Room;

class RoomCrudService extends BaseService
{
    /**
     * Get paginated rooms with filtering
     */
    public function getRooms(array $filters, int $perPage = 20): array
    {
        $query = Room::query();

        // Apply filters
        if (! empty($filters['institution_id'])) {
            $query->where('institution_id', $filters['institution_id']);
        }

        if (! empty($filters['room_type'])) {
            $query->where('room_type', $filters['room_type']);
        }

        if (! empty($filters['building'])) {
            $query->where('building', $filters['building']);
        }

        if (isset($filters['floor'])) {
            $query->where('floor', $filters['floor']);
        }

        if (! empty($filters['min_capacity'])) {
            $query->where('capacity', '>=', $filters['min_capacity']);
        }

        if (! empty($filters['max_capacity'])) {
            $query->where('capacity', '<=', $filters['max_capacity']);
        }

        if (! empty($filters['facility'])) {
            $query->withFacility($filters['facility']);
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        if (! empty($filters['availability'])) {
            if ($filters['availability'] === 'available') {
                $query->whereDoesntHave('grades');
            } elseif ($filters['availability'] === 'occupied') {
                $query->whereHas('grades');
            }
        }

        if (! empty($filters['search'])) {
            $query->search($filters['search']);
        }

        // Handle includes
        if (! empty($filters['include'])) {
            $includes = $filters['include'];
            if (str_contains($includes, 'institution')) {
                $query->with(['institution']);
            }
            if (str_contains($includes, 'grades')) {
                $query->with(['grades.students']);
            }
        }

        $rooms = $query->orderBy('building')
            ->orderBy('floor')
            ->orderBy('room_number')
            ->paginate($perPage);

        return [
            'rooms' => $rooms->through(function ($room) {
                return $this->formatRoomForList($room);
            }),
            'pagination' => [
                'current_page' => $rooms->currentPage(),
                'per_page' => $rooms->perPage(),
                'total' => $rooms->total(),
                'total_pages' => $rooms->lastPage(),
                'from' => $rooms->firstItem(),
                'to' => $rooms->lastItem(),
            ],
        ];
    }

    /**
     * Create new room
     */
    public function createRoom(array $data): Room
    {
        // Check for unique room number within institution
        if (! empty($data['room_number'])) {
            $existingRoom = Room::where('institution_id', $data['institution_id'])
                ->where('room_number', $data['room_number'])
                ->first();

            if ($existingRoom) {
                throw new \InvalidArgumentException('Bu təşkilatda həmin nömrəli otaq mövcuddur');
            }
        }

        return Room::create([
            'name' => $data['name'],
            'room_number' => $data['room_number'] ?? null,
            'institution_id' => $data['institution_id'],
            'building' => $data['building'] ?? null,
            'floor' => $data['floor'] ?? null,
            'room_type' => $data['room_type'],
            'capacity' => $data['capacity'],
            'facilities' => $data['facilities'] ?? [],
            'is_active' => true,
        ]);
    }

    /**
     * Update room
     */
    public function updateRoom(Room $room, array $data): Room
    {
        // Check for unique room number within institution if room_number is being updated
        if (isset($data['room_number']) && $data['room_number']) {
            $existingRoom = Room::where('institution_id', $room->institution_id)
                ->where('room_number', $data['room_number'])
                ->where('id', '!=', $room->id)
                ->first();

            if ($existingRoom) {
                throw new \InvalidArgumentException('Bu təşkilatda həmin nömrəli otaq mövcuddur');
            }
        }

        // Check if capacity reduction affects existing grades
        if (isset($data['capacity']) && $data['capacity'] < $room->capacity) {
            $currentOccupancy = $room->grades()->sum('student_count');
            if ($data['capacity'] < $currentOccupancy) {
                throw new \InvalidArgumentException("Otaqda hazırda {$currentOccupancy} şagird var. Tutum {$data['capacity']}-ə endirə bilməzsiniz");
            }
        }

        $updateData = collect($data)->only([
            'name', 'room_number', 'building', 'floor',
            'room_type', 'capacity', 'facilities', 'is_active',
        ])->filter()->toArray();

        $room->update($updateData);

        return $room;
    }

    /**
     * Deactivate room (soft delete)
     */
    public function deactivateRoom(Room $room): void
    {
        // Check if room has active grades
        $activeGrades = $room->grades()->count();
        if ($activeGrades > 0) {
            throw new \InvalidArgumentException("Bu otaqda {$activeGrades} aktiv sinif var. Əvvəlcə onları başqa otağa köçürün");
        }

        $room->update(['is_active' => false]);
    }

    /**
     * Get room with full details
     */
    public function getRoomDetails(Room $room): array
    {
        $room->load([
            'institution',
            'grades.homeroomTeacher.profile',
            'grades.students',
        ]);

        $gradesData = $room->grades->map(function ($grade) {
            return [
                'id' => $grade->id,
                'name' => $grade->name,
                'full_name' => $grade->full_name,
                'class_level' => $grade->class_level,
                'student_count' => $grade->relationLoaded('students')
                    ? $grade->students->count()
                    : $grade->student_count,
                'homeroom_teacher' => $grade->homeroomTeacher ? [
                    'id' => $grade->homeroomTeacher->id,
                    'full_name' => $grade->homeroomTeacher->profile
                        ? "{$grade->homeroomTeacher->profile->first_name} {$grade->homeroomTeacher->profile->last_name}"
                        : $grade->homeroomTeacher->username,
                    'email' => $grade->homeroomTeacher->email,
                ] : null,
            ];
        });

        $totalStudents = $room->grades->sum(function ($grade) {
            return $grade->relationLoaded('students')
                ? $grade->students->count()
                : $grade->student_count;
        });

        return [
            'id' => $room->id,
            'name' => $room->name,
            'room_number' => $room->room_number,
            'full_identifier' => $room->full_identifier,
            'institution' => [
                'id' => $room->institution->id,
                'name' => $room->institution->name,
                'type' => $room->institution->type,
            ],
            'building' => $room->building,
            'floor' => $room->floor,
            'room_type' => $room->room_type,
            'capacity' => $room->capacity,
            'facilities' => $room->facilities,
            'is_active' => $room->is_active,
            'grades' => $gradesData,
            'grades_count' => $room->grades->count(),
            'total_students' => $totalStudents,
            'utilization_rate' => $room->capacity > 0
                ? round(($totalStudents / $room->capacity) * 100, 2)
                : 0,
            'is_available' => $room->grades->count() === 0,
            'created_at' => $room->created_at,
            'updated_at' => $room->updated_at,
        ];
    }

    /**
     * Get available rooms for assignment
     */
    public function getAvailableRooms(array $filters = []): array
    {
        $query = Room::active()->whereDoesntHave('grades');

        // Apply filters
        if (! empty($filters['institution_id'])) {
            $query->where('institution_id', $filters['institution_id']);
        }

        if (! empty($filters['min_capacity'])) {
            $query->where('capacity', '>=', $filters['min_capacity']);
        }

        if (! empty($filters['room_type'])) {
            $query->where('room_type', $filters['room_type']);
        }

        if (! empty($filters['required_facilities'])) {
            foreach ($filters['required_facilities'] as $facility) {
                $query->withFacility($facility);
            }
        }

        $availableRooms = $query->with('institution')
            ->orderBy('institution_id')
            ->orderBy('building')
            ->orderBy('floor')
            ->orderBy('room_number')
            ->get()
            ->map(function ($room) {
                return [
                    'id' => $room->id,
                    'name' => $room->name,
                    'room_number' => $room->room_number,
                    'full_identifier' => $room->full_identifier,
                    'institution' => [
                        'id' => $room->institution->id,
                        'name' => $room->institution->name,
                    ],
                    'building' => $room->building,
                    'floor' => $room->floor,
                    'room_type' => $room->room_type,
                    'capacity' => $room->capacity,
                    'facilities' => $room->facilities,
                ];
            });

        return [
            'available_rooms' => $availableRooms,
            'total_count' => $availableRooms->count(),
        ];
    }

    /**
     * Format room data for list display
     */
    private function formatRoomForList(Room $room): array
    {
        $data = [
            'id' => $room->id,
            'name' => $room->name,
            'room_number' => $room->room_number,
            'full_identifier' => $room->full_identifier,
            'institution_id' => $room->institution_id,
            'building' => $room->building,
            'floor' => $room->floor,
            'room_type' => $room->room_type,
            'capacity' => $room->capacity,
            'facilities' => $room->facilities,
            'is_active' => $room->is_active,
            'grades_count' => $room->grades()->count(),
            'current_occupancy' => $room->grades()->sum('student_count'),
            'utilization_rate' => $room->capacity > 0
                ? round(($room->grades()->sum('student_count') / $room->capacity) * 100, 2)
                : 0,
            'is_available' => $room->grades()->count() === 0,
            'created_at' => $room->created_at,
            'updated_at' => $room->updated_at,
        ];

        // Add institution if included
        if ($room->relationLoaded('institution')) {
            $data['institution'] = [
                'id' => $room->institution->id,
                'name' => $room->institution->name,
                'type' => $room->institution->type,
            ];
        }

        // Add grades if included
        if ($room->relationLoaded('grades')) {
            $data['grades'] = $room->grades->map(function ($grade) {
                return [
                    'id' => $grade->id,
                    'name' => $grade->name,
                    'full_name' => $grade->full_name,
                    'class_level' => $grade->class_level,
                    'student_count' => $grade->relationLoaded('students')
                        ? $grade->students->count()
                        : $grade->student_count,
                ];
            });
        }

        return $data;
    }

    /**
     * Get room type options
     */
    public function getRoomTypes(): array
    {
        return [
            'classroom' => 'Sinif otağı',
            'laboratory' => 'Laboratoriya',
            'library' => 'Kitabxana',
            'gym' => 'İdman zalı',
            'office' => 'Ofis',
            'auditorium' => 'Auditoriya',
            'kitchen' => 'Mətbəx',
            'storage' => 'Anbar',
            'other' => 'Digər',
        ];
    }

    /**
     * Validate room capacity against current usage
     */
    public function validateCapacityReduction(Room $room, int $newCapacity): bool
    {
        $currentOccupancy = $room->grades()->sum('student_count');

        return $newCapacity >= $currentOccupancy;
    }

    /**
     * Check if room number is unique within institution
     */
    public function isRoomNumberUnique(string $roomNumber, int $institutionId, ?int $excludeRoomId = null): bool
    {
        $query = Room::where('institution_id', $institutionId)
            ->where('room_number', $roomNumber);

        if ($excludeRoomId) {
            $query->where('id', '!=', $excludeRoomId);
        }

        return ! $query->exists();
    }
}
