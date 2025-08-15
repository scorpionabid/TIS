<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\Institution;
use App\Models\Grade;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class RoomController extends Controller
{
    /**
     * Display a listing of rooms with filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'institution_id' => 'sometimes|exists:institutions,id',
            'room_type' => 'sometimes|in:classroom,laboratory,library,gym,office,auditorium,kitchen,storage,other',
            'building' => 'sometimes|string|max:100',
            'floor' => 'sometimes|integer|min:0|max:20',
            'min_capacity' => 'sometimes|integer|min:1',
            'max_capacity' => 'sometimes|integer|min:1',
            'facility' => 'sometimes|string|max:100',
            'is_active' => 'sometimes|boolean',
            'availability' => 'sometimes|in:available,occupied,all',
            'search' => 'sometimes|string|max:255',
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'include' => 'sometimes|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $query = Room::query();

        // Apply regional access control
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            $query->whereIn('institution_id', $accessibleInstitutions);
        }

        // Apply filters
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->has('room_type')) {
            $query->where('room_type', $request->room_type);
        }

        if ($request->has('building')) {
            $query->where('building', $request->building);
        }

        if ($request->has('floor')) {
            $query->where('floor', $request->floor);
        }

        if ($request->has('min_capacity')) {
            $query->where('capacity', '>=', $request->min_capacity);
        }

        if ($request->has('max_capacity')) {
            $query->where('capacity', '<=', $request->max_capacity);
        }

        if ($request->has('facility')) {
            $query->withFacility($request->facility);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('availability')) {
            if ($request->availability === 'available') {
                $query->whereDoesntHave('grades');
            } elseif ($request->availability === 'occupied') {
                $query->whereHas('grades');
            }
        }

        if ($request->has('search')) {
            $query->search($request->search);
        }

        // Handle includes
        $includes = $request->get('include', '');
        if (str_contains($includes, 'institution')) {
            $query->with(['institution']);
        }
        if (str_contains($includes, 'grades')) {
            $query->with(['grades.students']);
        }

        $perPage = $request->get('per_page', 20);
        $rooms = $query->orderBy('building')
                      ->orderBy('floor')
                      ->orderBy('room_number')
                      ->paginate($perPage);

        // Transform the data
        $transformedRooms = $rooms->through(function ($room) {
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
        });

        return response()->json([
            'success' => true,
            'data' => [
                'rooms' => $transformedRooms->items(),
                'pagination' => [
                    'current_page' => $rooms->currentPage(),
                    'per_page' => $rooms->perPage(),
                    'total' => $rooms->total(),
                    'total_pages' => $rooms->lastPage(),
                    'from' => $rooms->firstItem(),
                    'to' => $rooms->lastItem(),
                ],
            ],
            'message' => 'Otaq siyahısı uğurla alındı',
        ]);
    }

    /**
     * Store a newly created room.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'room_number' => 'nullable|string|max:50',
            'institution_id' => 'required|exists:institutions,id',
            'building' => 'nullable|string|max:100',
            'floor' => 'nullable|integer|min:0|max:20',
            'room_type' => 'required|in:classroom,laboratory,library,gym,office,auditorium,kitchen,storage,other',
            'capacity' => 'required|integer|min:1|max:500',
            'facilities' => 'nullable|array',
            'facilities.*' => 'string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($request->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu təşkilat üçün icazəniz yoxdur',
                ], 403);
            }
        }

        // Check for unique room number within institution
        if ($request->room_number) {
            $existingRoom = Room::where('institution_id', $request->institution_id)
                                ->where('room_number', $request->room_number)
                                ->first();
            if ($existingRoom) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu təşkilatda həmin nömrəli otaq mövcuddur',
                ], 422);
            }
        }

        try {
            $room = Room::create([
                'name' => $request->name,
                'room_number' => $request->room_number,
                'institution_id' => $request->institution_id,
                'building' => $request->building,
                'floor' => $request->floor,
                'room_type' => $request->room_type,
                'capacity' => $request->capacity,
                'facilities' => $request->facilities ?? [],
                'is_active' => true,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $room->id,
                    'name' => $room->name,
                    'room_number' => $room->room_number,
                    'full_identifier' => $room->full_identifier,
                    'room_type' => $room->room_type,
                    'capacity' => $room->capacity,
                    'is_active' => $room->is_active,
                    'created_at' => $room->created_at,
                ],
                'message' => 'Otaq uğurla yaradıldı',
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Otaq yaradılarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified room.
     */
    public function show(Request $request, Room $room): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($room->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu otaq üçün icazəniz yoxdur',
                ], 403);
            }
        }

        $room->load([
            'institution',
            'grades.homeroom_teacher.profile',
            'grades.students',
        ]);

        $gradesData = $room->grades->map(function ($grade) {
            return [
                'id' => $grade->id,
                'name' => $grade->name,
                'full_name' => $grade->full_name,
                'class_level' => $grade->class_level,
                'student_count' => $grade->relationLoaded('students') ? $grade->students->count() : $grade->student_count,
                'homeroom_teacher' => $grade->homeroom_teacher ? [
                    'id' => $grade->homeroom_teacher->id,
                    'full_name' => $grade->homeroom_teacher->profile 
                        ? "{$grade->homeroom_teacher->profile->first_name} {$grade->homeroom_teacher->profile->last_name}"
                        : $grade->homeroom_teacher->username,
                    'email' => $grade->homeroom_teacher->email,
                ] : null,
            ];
        });

        $data = [
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
            'total_students' => $room->grades->sum(function ($grade) {
                return $grade->relationLoaded('students') ? $grade->students->count() : $grade->student_count;
            }),
            'utilization_rate' => $room->capacity > 0 
                ? round(($room->grades->sum(function ($grade) {
                    return $grade->relationLoaded('students') ? $grade->students->count() : $grade->student_count;
                }) / $room->capacity) * 100, 2)
                : 0,
            'is_available' => $room->grades->count() === 0,
            'created_at' => $room->created_at,
            'updated_at' => $room->updated_at,
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Otaq məlumatları uğurla alındı',
        ]);
    }

    /**
     * Update the specified room.
     */
    public function update(Request $request, Room $room): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($room->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu otaq üçün icazəniz yoxdur',
                ], 403);
            }
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'room_number' => 'sometimes|nullable|string|max:50',
            'building' => 'sometimes|nullable|string|max:100',
            'floor' => 'sometimes|nullable|integer|min:0|max:20',
            'room_type' => 'sometimes|in:classroom,laboratory,library,gym,office,auditorium,kitchen,storage,other',
            'capacity' => 'sometimes|integer|min:1|max:500',
            'facilities' => 'sometimes|nullable|array',
            'facilities.*' => 'string|max:100',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check for unique room number within institution if room_number is being updated
        if ($request->has('room_number') && $request->room_number) {
            $existingRoom = Room::where('institution_id', $room->institution_id)
                                ->where('room_number', $request->room_number)
                                ->where('id', '!=', $room->id)
                                ->first();
            if ($existingRoom) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu təşkilatda həmin nömrəli otaq mövcuddur',
                ], 422);
            }
        }

        // Check if capacity reduction affects existing grades
        if ($request->has('capacity') && $request->capacity < $room->capacity) {
            $currentOccupancy = $room->grades()->sum('student_count');
            if ($request->capacity < $currentOccupancy) {
                return response()->json([
                    'success' => false,
                    'message' => "Otaqda hazırda {$currentOccupancy} şagird var. Tutum {$request->capacity}-ə endirə bilməzsiniz",
                ], 422);
            }
        }

        try {
            $updateData = $request->only([
                'name', 'room_number', 'building', 'floor', 
                'room_type', 'capacity', 'facilities', 'is_active'
            ]);

            $room->update($updateData);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $room->id,
                    'name' => $room->name,
                    'room_number' => $room->room_number,
                    'full_identifier' => $room->full_identifier,
                    'room_type' => $room->room_type,
                    'capacity' => $room->capacity,
                    'is_active' => $room->is_active,
                    'updated_at' => $room->updated_at,
                ],
                'message' => 'Otaq məlumatları uğurla yeniləndi',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Otaq yenilənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified room (soft delete).
     */
    public function destroy(Request $request, Room $room): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($room->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu otaq üçün icazəniz yoxdur',
                ], 403);
            }
        }

        // Check if room has active grades
        $activeGrades = $room->grades()->count();
        if ($activeGrades > 0) {
            return response()->json([
                'success' => false,
                'message' => "Bu otaqda {$activeGrades} aktiv sinif var. Əvvəlcə onları başqa otağa köçürün",
            ], 422);
        }

        try {
            // Deactivate instead of hard delete
            $room->update(['is_active' => false]);

            return response()->json([
                'success' => true,
                'message' => 'Otaq uğurla deaktiv edildi',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Otaq deaktiv edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get room statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Room::query();

        // Apply regional access control
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            $query->whereIn('institution_id', $accessibleInstitutions);
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
            return $room->grades->sum('current_student_count');
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

        return response()->json([
            'success' => true,
            'data' => [
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
                    'total_capacity' => (int)$capacityStats->total_capacity,
                    'average_capacity' => round($capacityStats->average_capacity, 1),
                    'min_capacity' => (int)$capacityStats->min_capacity,
                    'max_capacity' => (int)$capacityStats->max_capacity,
                    'total_occupancy' => $totalOccupancy,
                    'utilization_rate' => $utilizationRate,
                ],
                'room_type_distribution' => $typeDistribution,
                'building_distribution' => $buildingStats,
            ],
            'message' => 'Otaq statistikaları uğurla alındı',
        ]);
    }

    /**
     * Manage room facilities.
     */
    public function manageFacilities(Request $request, Room $room): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($room->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu otaq üçün icazəniz yoxdur',
                ], 403);
            }
        }

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:add,remove,replace',
            'facilities' => 'required|array|min:1',
            'facilities.*' => 'string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $currentFacilities = $room->facilities ?? [];
            $newFacilities = $request->facilities;

            switch ($request->action) {
                case 'add':
                    $facilities = array_unique(array_merge($currentFacilities, $newFacilities));
                    break;
                case 'remove':
                    $facilities = array_diff($currentFacilities, $newFacilities);
                    break;
                case 'replace':
                    $facilities = $newFacilities;
                    break;
            }

            $room->update(['facilities' => array_values($facilities)]);

            return response()->json([
                'success' => true,
                'data' => [
                    'room_id' => $room->id,
                    'facilities' => $room->fresh()->facilities,
                    'action_performed' => $request->action,
                ],
                'message' => 'Otaq imkanları uğurla yeniləndi',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İmkanlar yenilənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get available rooms for assignment.
     */
    public function getAvailableRooms(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'institution_id' => 'sometimes|exists:institutions,id',
            'min_capacity' => 'sometimes|integer|min:1',
            'room_type' => 'sometimes|in:classroom,laboratory,library,gym,office,auditorium,kitchen,storage,other',
            'required_facilities' => 'sometimes|array',
            'required_facilities.*' => 'string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $query = Room::active()->whereDoesntHave('grades');

        // Apply regional access control
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            $query->whereIn('institution_id', $accessibleInstitutions);
        }

        // Apply filters
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->has('min_capacity')) {
            $query->where('capacity', '>=', $request->min_capacity);
        }

        if ($request->has('room_type')) {
            $query->where('room_type', $request->room_type);
        }

        if ($request->has('required_facilities')) {
            foreach ($request->required_facilities as $facility) {
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

        return response()->json([
            'success' => true,
            'data' => [
                'available_rooms' => $availableRooms,
                'total_count' => $availableRooms->count(),
            ],
            'message' => 'Boş otaqlar uğurla alındı',
        ]);
    }

    /**
     * Helper method to get user accessible institutions.
     */
    private function getUserAccessibleInstitutions($user): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }

        $institutions = [];
        
        if ($user->hasRole('regionadmin')) {
            $institutions = Institution::where('parent_id', $user->institution_id)->pluck('id')->toArray();
            $institutions[] = $user->institution_id;
        } elseif ($user->hasRole('sektoradmin')) {
            $institutions = Institution::where('parent_id', $user->institution_id)->pluck('id')->toArray();
            $institutions[] = $user->institution_id;
        } else {
            $institutions = [$user->institution_id];
        }

        return $institutions;
    }
}