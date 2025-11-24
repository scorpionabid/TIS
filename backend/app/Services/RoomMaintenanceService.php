<?php

namespace App\Services;

use App\Models\Room;
use Illuminate\Support\Facades\DB;

class RoomMaintenanceService extends BaseService
{
    /**
     * Manage room facilities
     */
    public function manageFacilities(Room $room, string $action, array $facilities): array
    {
        $currentFacilities = $room->facilities ?? [];
        $newFacilities = $facilities;

        switch ($action) {
            case 'add':
                $updatedFacilities = array_unique(array_merge($currentFacilities, $newFacilities));
                break;
            case 'remove':
                $updatedFacilities = array_diff($currentFacilities, $newFacilities);
                break;
            case 'replace':
                $updatedFacilities = $newFacilities;
                break;
            default:
                throw new \InvalidArgumentException('Geçersiz işlem türü');
        }

        $room->update(['facilities' => array_values($updatedFacilities)]);

        return [
            'room_id' => $room->id,
            'facilities' => $room->fresh()->facilities,
            'action_performed' => $action,
        ];
    }

    /**
     * Get comprehensive room statistics
     */
    public function getRoomStatistics(array $roomIds = []): array
    {
        $query = Room::query();

        if (! empty($roomIds)) {
            $query->whereIn('id', $roomIds);
        }

        $totalRooms = $query->count();
        $activeRooms = $query->where('is_active', true)->count();
        $inactiveRooms = $totalRooms - $activeRooms;

        // Room type distribution
        $typeDistribution = $query->where('is_active', true)
            ->select('room_type', DB::raw('count(*) as count'))
            ->groupBy('room_type')
            ->get()
            ->map(function ($item) {
                return [
                    'room_type' => $item->room_type,
                    'count' => $item->count,
                    'display_name' => $this->getRoomTypeDisplayName($item->room_type),
                ];
            });

        // Capacity statistics
        $capacityStats = $query->where('is_active', true)
            ->selectRaw('
                AVG(capacity) as average_capacity,
                MIN(capacity) as min_capacity,
                MAX(capacity) as max_capacity,
                SUM(capacity) as total_capacity
            ')
            ->first();

        // Utilization statistics
        $rooms = $query->where('is_active', true)->with('grades')->get();
        $occupiedRooms = $rooms->filter(function ($room) {
            return $room->grades->count() > 0;
        })->count();

        $totalOccupancy = $rooms->sum(function ($room) {
            return $room->grades->sum('student_count');
        });

        $utilizationRate = $capacityStats->total_capacity > 0
            ? round(($totalOccupancy / $capacityStats->total_capacity) * 100, 2)
            : 0;

        // Building and floor statistics
        $buildingStats = $query->where('is_active', true)
            ->whereNotNull('building')
            ->select('building', DB::raw('count(*) as count'))
            ->groupBy('building')
            ->get()
            ->map(function ($item) {
                return [
                    'building' => $item->building,
                    'count' => $item->count,
                ];
            });

        // Facility statistics
        $facilityStats = $this->getFacilityStatistics($rooms);

        return [
            'overview' => [
                'total_rooms' => $totalRooms,
                'active_rooms' => $activeRooms,
                'inactive_rooms' => $inactiveRooms,
                'occupied_rooms' => $occupiedRooms,
                'available_rooms' => $activeRooms - $occupiedRooms,
                'occupancy_rate' => $activeRooms > 0
                    ? round(($occupiedRooms / $activeRooms) * 100, 2)
                    : 0,
            ],
            'capacity' => [
                'total_capacity' => (int) $capacityStats->total_capacity,
                'average_capacity' => round($capacityStats->average_capacity, 1),
                'min_capacity' => (int) $capacityStats->min_capacity,
                'max_capacity' => (int) $capacityStats->max_capacity,
                'total_occupancy' => $totalOccupancy,
                'utilization_rate' => $utilizationRate,
            ],
            'room_type_distribution' => $typeDistribution->toArray(),
            'building_distribution' => $buildingStats->toArray(),
            'facility_statistics' => $facilityStats,
        ];
    }

    /**
     * Get facility usage statistics
     */
    private function getFacilityStatistics($rooms): array
    {
        $allFacilities = [];

        foreach ($rooms as $room) {
            if (! empty($room->facilities)) {
                $allFacilities = array_merge($allFacilities, $room->facilities);
            }
        }

        $facilityCount = array_count_values($allFacilities);
        arsort($facilityCount);

        return array_map(function ($count, $facility) use ($rooms) {
            return [
                'facility' => $facility,
                'count' => $count,
                'percentage' => round(($count / $rooms->count()) * 100, 2),
            ];
        }, $facilityCount, array_keys($facilityCount));
    }

    /**
     * Get room type display names
     */
    private function getRoomTypeDisplayName(string $roomType): string
    {
        $displayNames = [
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

        return $displayNames[$roomType] ?? $roomType;
    }

    /**
     * Get room maintenance recommendations
     */
    public function getMaintenanceRecommendations(array $roomIds = []): array
    {
        $query = Room::with(['grades', 'institution']);

        if (! empty($roomIds)) {
            $query->whereIn('id', $roomIds);
        }

        $rooms = $query->where('is_active', true)->get();
        $recommendations = [];

        foreach ($rooms as $room) {
            $roomRecommendations = [];

            // Check capacity utilization
            $currentOccupancy = $room->grades->sum('student_count');
            $utilizationRate = $room->capacity > 0 ? ($currentOccupancy / $room->capacity) * 100 : 0;

            if ($utilizationRate > 90) {
                $roomRecommendations[] = [
                    'type' => 'overcrowding',
                    'priority' => 'high',
                    'message' => 'Otaq həddindən artıq doludur. Tutumu artırmağı və ya əlavə otaq tapməğı nəzərə alın.',
                    'current_rate' => round($utilizationRate, 2),
                ];
            } elseif ($utilizationRate < 50 && $currentOccupancy > 0) {
                $roomRecommendations[] = [
                    'type' => 'underutilization',
                    'priority' => 'medium',
                    'message' => 'Otaq kifayət qədər istifadə olunmur. Tutumu azaltmağı və ya digər məqsədlər üçün istifadə etməyi nəzərə alın.',
                    'current_rate' => round($utilizationRate, 2),
                ];
            }

            // Check facility adequacy
            if (empty($room->facilities)) {
                $roomRecommendations[] = [
                    'type' => 'missing_facilities',
                    'priority' => 'low',
                    'message' => 'Otaq üçün imkanlar (avadanlıqlar) qeyd edilməmişdir.',
                ];
            }

            // Check room type appropriateness
            $classroomTypes = $room->grades->pluck('specialty')->unique();
            if ($classroomTypes->count() > 1 && $room->room_type === 'classroom') {
                $roomRecommendations[] = [
                    'type' => 'mixed_usage',
                    'priority' => 'medium',
                    'message' => 'Otaq müxtəlif ixtisaslar üçün istifadə olunur. Daha spesifik təyinat nəzərə alın.',
                ];
            }

            if (! empty($roomRecommendations)) {
                $recommendations[] = [
                    'room' => [
                        'id' => $room->id,
                        'name' => $room->name,
                        'full_identifier' => $room->full_identifier,
                        'institution' => $room->institution->name,
                        'capacity' => $room->capacity,
                        'current_occupancy' => $currentOccupancy,
                    ],
                    'recommendations' => $roomRecommendations,
                ];
            }
        }

        // Sort by priority (high, medium, low)
        usort($recommendations, function ($a, $b) {
            $priorityOrder = ['high' => 1, 'medium' => 2, 'low' => 3];
            $aMaxPriority = min(array_map(function ($rec) use ($priorityOrder) {
                return $priorityOrder[$rec['priority']] ?? 4;
            }, $a['recommendations']));
            $bMaxPriority = min(array_map(function ($rec) use ($priorityOrder) {
                return $priorityOrder[$rec['priority']] ?? 4;
            }, $b['recommendations']));

            return $aMaxPriority <=> $bMaxPriority;
        });

        return [
            'total_rooms_analyzed' => $rooms->count(),
            'rooms_with_recommendations' => count($recommendations),
            'recommendations' => $recommendations,
        ];
    }

    /**
     * Generate room usage report
     */
    public function generateUsageReport(array $roomIds, string $startDate, string $endDate): array
    {
        $rooms = Room::whereIn('id', $roomIds)
            ->with(['institution', 'grades'])
            ->get();

        $report = [];

        foreach ($rooms as $room) {
            // Get schedule data for the period (assuming Schedule model exists)
            $scheduleCount = 0; // Would query actual schedule data
            $totalHours = 0; // Would calculate from actual schedule data

            $currentOccupancy = $room->grades->sum('student_count');
            $utilizationRate = $room->capacity > 0 ? ($currentOccupancy / $room->capacity) * 100 : 0;

            $report[] = [
                'room_info' => [
                    'id' => $room->id,
                    'name' => $room->name,
                    'full_identifier' => $room->full_identifier,
                    'institution' => $room->institution->name,
                    'room_type' => $room->room_type,
                    'capacity' => $room->capacity,
                ],
                'usage_data' => [
                    'current_occupancy' => $currentOccupancy,
                    'utilization_rate' => round($utilizationRate, 2),
                    'assigned_grades' => $room->grades->count(),
                    'total_students' => $currentOccupancy,
                    'schedule_count' => $scheduleCount,
                    'total_hours' => $totalHours,
                ],
                'efficiency_metrics' => [
                    'space_efficiency' => round($utilizationRate, 2),
                    'capacity_match' => $this->calculateCapacityMatch($room),
                    'facility_utilization' => $this->calculateFacilityUtilization($room),
                ],
            ];
        }

        // Sort by utilization rate descending
        usort($report, function ($a, $b) {
            return $b['usage_data']['utilization_rate'] <=> $a['usage_data']['utilization_rate'];
        });

        return [
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'summary' => [
                'total_rooms' => count($report),
                'average_utilization' => round(array_sum(array_column(array_column($report, 'usage_data'), 'utilization_rate')) / count($report), 2),
                'highest_utilization' => max(array_column(array_column($report, 'usage_data'), 'utilization_rate')),
                'lowest_utilization' => min(array_column(array_column($report, 'usage_data'), 'utilization_rate')),
            ],
            'room_reports' => $report,
        ];
    }

    /**
     * Calculate capacity match score
     */
    private function calculateCapacityMatch(Room $room): float
    {
        $currentOccupancy = $room->grades->sum('student_count');

        if ($currentOccupancy === 0) {
            return 0;
        }

        // Ideal utilization is around 80%
        $idealOccupancy = $room->capacity * 0.8;
        $difference = abs($currentOccupancy - $idealOccupancy);
        $maxDifference = max($idealOccupancy, $room->capacity - $idealOccupancy);

        return round((1 - ($difference / $maxDifference)) * 100, 2);
    }

    /**
     * Calculate facility utilization score
     */
    private function calculateFacilityUtilization(Room $room): float
    {
        // This is a simplified calculation
        // In practice, you would analyze how well the facilities match the room's usage
        $facilityCount = count($room->facilities ?? []);
        $expectedFacilities = $this->getExpectedFacilitiesForRoomType($room->room_type);

        if (empty($expectedFacilities)) {
            return 100; // No specific requirements
        }

        $matches = array_intersect($room->facilities ?? [], $expectedFacilities);

        return round((count($matches) / count($expectedFacilities)) * 100, 2);
    }

    /**
     * Get expected facilities for room type
     */
    private function getExpectedFacilitiesForRoomType(string $roomType): array
    {
        $expectedFacilities = [
            'classroom' => ['projector', 'whiteboard', 'desks', 'chairs'],
            'laboratory' => ['lab_equipment', 'safety_equipment', 'ventilation', 'sinks'],
            'library' => ['bookshelves', 'reading_desks', 'computers', 'quiet_space'],
            'gym' => ['sports_equipment', 'changing_rooms', 'safety_mats'],
            'auditorium' => ['sound_system', 'projector', 'stage', 'seating'],
        ];

        return $expectedFacilities[$roomType] ?? [];
    }
}
