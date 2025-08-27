<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Services\RoomCrudService;
use App\Services\RoomScheduleService;
use App\Services\RoomMaintenanceService;
use App\Services\ClassPermissionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class RoomControllerRefactored extends Controller
{
    protected RoomCrudService $crudService;
    protected RoomScheduleService $scheduleService;
    protected RoomMaintenanceService $maintenanceService;
    protected ClassPermissionService $permissionService;

    public function __construct(
        RoomCrudService $crudService,
        RoomScheduleService $scheduleService,
        RoomMaintenanceService $maintenanceService,
        ClassPermissionService $permissionService
    ) {
        $this->crudService = $crudService;
        $this->scheduleService = $scheduleService;
        $this->maintenanceService = $maintenanceService;
        $this->permissionService = $permissionService;
    }

    /**
     * Display a listing of rooms with filtering and pagination
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

        try {
            $user = $request->user();
            $filters = $request->only([
                'institution_id', 'room_type', 'building', 'floor',
                'min_capacity', 'max_capacity', 'facility', 'is_active',
                'availability', 'search', 'include'
            ]);

            // Apply regional filtering
            if (!$user->hasRole('superadmin')) {
                $accessibleInstitutions = $this->permissionService->getAccessibleInstitutions($user);
                $filters['accessible_institutions'] = collect($accessibleInstitutions)->pluck('id')->toArray();
            }

            $perPage = $request->get('per_page', 20);
            $result = $this->crudService->getRooms($filters, $perPage);

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Otaq siyahısı uğurla alındı',
            ]);

        } catch (\Exception $e) {
            return $this->handleError($e, 'Otaq siyahısı alınarkən xəta baş verdi');
        }
    }

    /**
     * Store a newly created room
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
            $accessibleInstitutions = collect($this->permissionService->getAccessibleInstitutions($user))->pluck('id')->toArray();
            if (!in_array($request->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu təşkilat üçün icazəniz yoxdur',
                ], 403);
            }
        }

        try {
            $room = $this->crudService->createRoom($request->validated());

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

        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Otaq yaradılarkən xəta baş verdi');
        }
    }

    /**
     * Display the specified room
     */
    public function show(Request $request, Room $room): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = collect($this->permissionService->getAccessibleInstitutions($user))->pluck('id')->toArray();
            if (!in_array($room->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu otaq üçün icazəniz yoxdur',
                ], 403);
            }
        }

        try {
            $data = $this->crudService->getRoomDetails($room);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Otaq məlumatları uğurla alındı',
            ]);

        } catch (\Exception $e) {
            return $this->handleError($e, 'Otaq məlumatları alınarkən xəta baş verdi');
        }
    }

    /**
     * Update the specified room
     */
    public function update(Request $request, Room $room): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = collect($this->permissionService->getAccessibleInstitutions($user))->pluck('id')->toArray();
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

        try {
            $updatedRoom = $this->crudService->updateRoom($room, $request->validated());

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $updatedRoom->id,
                    'name' => $updatedRoom->name,
                    'room_number' => $updatedRoom->room_number,
                    'full_identifier' => $updatedRoom->full_identifier,
                    'room_type' => $updatedRoom->room_type,
                    'capacity' => $updatedRoom->capacity,
                    'is_active' => $updatedRoom->is_active,
                    'updated_at' => $updatedRoom->updated_at,
                ],
                'message' => 'Otaq məlumatları uğurla yeniləndi',
            ]);

        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Otaq yenilənərkən xəta baş verdi');
        }
    }

    /**
     * Remove the specified room (soft delete)
     */
    public function destroy(Request $request, Room $room): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = collect($this->permissionService->getAccessibleInstitutions($user))->pluck('id')->toArray();
            if (!in_array($room->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu otaq üçün icazəniz yoxdur',
                ], 403);
            }
        }

        try {
            $this->crudService->deactivateRoom($room);

            return response()->json([
                'success' => true,
                'message' => 'Otaq uğurla deaktiv edildi',
            ]);

        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Otaq deaktiv edilərkən xəta baş verdi');
        }
    }

    /**
     * Get room statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $roomIds = [];

            // Apply regional filtering
            if (!$user->hasRole('superadmin')) {
                $accessibleInstitutions = collect($this->permissionService->getAccessibleInstitutions($user))->pluck('id')->toArray();
                $roomIds = Room::whereIn('institution_id', $accessibleInstitutions)->pluck('id')->toArray();
            }

            $data = $this->maintenanceService->getRoomStatistics($roomIds);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Otaq statistikaları uğurla alındı',
            ]);

        } catch (\Exception $e) {
            return $this->handleError($e, 'Statistikalar alınarkən xəta baş verdi');
        }
    }

    /**
     * Manage room facilities
     */
    public function manageFacilities(Request $request, Room $room): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = collect($this->permissionService->getAccessibleInstitutions($user))->pluck('id')->toArray();
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
            $result = $this->maintenanceService->manageFacilities(
                $room,
                $request->action,
                $request->facilities
            );

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Otaq imkanları uğurla yeniləndi',
            ]);

        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return $this->handleError($e, 'İmkanlar yenilənərkən xəta baş verdi');
        }
    }

    /**
     * Get available rooms for assignment
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

        try {
            $user = $request->user();
            $filters = $request->only([
                'institution_id', 'min_capacity', 'room_type', 'required_facilities'
            ]);

            // Apply regional filtering
            if (!$user->hasRole('superadmin')) {
                $accessibleInstitutions = collect($this->permissionService->getAccessibleInstitutions($user))->pluck('id')->toArray();
                $filters['accessible_institutions'] = $accessibleInstitutions;
            }

            $result = $this->crudService->getAvailableRooms($filters);

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Boş otaqlar uğurla alındı',
            ]);

        } catch (\Exception $e) {
            return $this->handleError($e, 'Boş otaqlar alınarkən xəta baş verdi');
        }
    }

    /**
     * Get room schedule
     */
    public function getSchedule(Request $request, Room $room): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
            'type' => 'sometimes|in:daily,weekly',
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
            $accessibleInstitutions = collect($this->permissionService->getAccessibleInstitutions($user))->pluck('id')->toArray();
            if (!in_array($room->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu otaq üçün icazəniz yoxdur',
                ], 403);
            }
        }

        try {
            $type = $request->get('type', 'daily');
            
            if ($type === 'weekly') {
                $data = $this->scheduleService->getRoomWeeklySchedule($room->id, $request->date);
            } else {
                $data = $this->scheduleService->getRoomSchedule($room->id, $request->date);
            }

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Otaq cədvəli uğurla alındı',
            ]);

        } catch (\Exception $e) {
            return $this->handleError($e, 'Cədvəl alınarkən xəta baş verdi');
        }
    }

    /**
     * Get maintenance recommendations
     */
    public function getMaintenanceRecommendations(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $roomIds = [];

            // Apply regional filtering
            if (!$user->hasRole('superadmin')) {
                $accessibleInstitutions = collect($this->permissionService->getAccessibleInstitutions($user))->pluck('id')->toArray();
                $roomIds = Room::whereIn('institution_id', $accessibleInstitutions)->pluck('id')->toArray();
            }

            $data = $this->maintenanceService->getMaintenanceRecommendations($roomIds);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Bakım tövsiyələri uğurla alındı',
            ]);

        } catch (\Exception $e) {
            return $this->handleError($e, 'Tövsiyələr alınarkən xəta baş verdi');
        }
    }

    /**
     * Handle errors consistently
     */
    private function handleError(\Exception $e, string $defaultMessage): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $defaultMessage,
            'error' => config('app.debug') ? $e->getMessage() : 'Server error',
        ], 500);
    }
}