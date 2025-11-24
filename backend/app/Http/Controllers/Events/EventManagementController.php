<?php

namespace App\Http\Controllers\Events;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\SchoolEvent;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class EventManagementController extends Controller
{
    /**
     * Store a new event.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'required|string|max:5000',
            'event_type' => 'required|in:academic,administrative,cultural,sports,social,meeting,conference,workshop,ceremony,competition,examination,other',
            'event_category' => 'sometimes|in:academic,administrative,cultural,sports,social,meeting,conference,workshop,ceremony,competition,examination,other',
            'status' => 'sometimes|in:draft,pending,approved,active',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'institution_id' => 'required|exists:institutions,id',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i|after:start_time',
            'location' => 'required|string|max:500',
            'max_participants' => 'sometimes|integer|min:1|max:10000',
            'registration_required' => 'sometimes|boolean',
            'registration_deadline' => 'sometimes|date|before_or_equal:start_date',
            'is_public' => 'sometimes|boolean',
            'is_recurring' => 'sometimes|boolean',
            'recurrence_rule' => 'sometimes|string|max:1000',
            'tags' => 'sometimes|array|max:10',
            'tags.*' => 'string|max:50',
            'notes' => 'sometimes|string|max:2000',
            'metadata' => 'sometimes|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Doğrulama xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        // Check if user can create events for this institution
        if (! $this->canManageEventForInstitution($user, $request->institution_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu təşkilat üçün tədbir yaratmaq üçün icazəniz yoxdur',
            ], 403);
        }

        try {
            DB::beginTransaction();

            $eventData = $request->only([
                'title', 'description', 'event_type', 'event_category', 'status', 'priority',
                'institution_id', 'start_date', 'end_date', 'start_time', 'end_time',
                'location', 'max_participants', 'registration_required', 'registration_deadline',
                'is_public', 'is_recurring', 'recurrence_rule', 'tags', 'notes', 'metadata',
            ]);

            // Set defaults
            $eventData['status'] = $eventData['status'] ?? 'draft';
            $eventData['priority'] = $eventData['priority'] ?? 'medium';
            $eventData['event_category'] = $eventData['event_category'] ?? $eventData['event_type'];
            $eventData['organizer_id'] = $user->id;
            $eventData['is_public'] = $eventData['is_public'] ?? false;
            $eventData['registration_required'] = $eventData['registration_required'] ?? false;
            $eventData['is_recurring'] = $eventData['is_recurring'] ?? false;

            // Validate date/time combination
            if (isset($eventData['start_time']) && isset($eventData['end_time'])) {
                $startDateTime = Carbon::parse($eventData['start_date'] . ' ' . $eventData['start_time']);
                $endDateTime = Carbon::parse($eventData['end_date'] . ' ' . $eventData['end_time']);

                if ($startDateTime >= $endDateTime) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bitiş tarixi və vaxtı başlama tarixindən sonra olmalıdır',
                    ], 422);
                }
            }

            $event = SchoolEvent::create($eventData);

            DB::commit();

            // Load relationships for response
            $event->load(['institution:id,name,type', 'organizer:id,name,email']);

            return response()->json([
                'success' => true,
                'data' => [
                    'event' => [
                        'id' => $event->id,
                        'title' => $event->title,
                        'description' => $event->description,
                        'event_type' => $event->event_type,
                        'event_type_label' => $event->event_type_label,
                        'event_category' => $event->event_category,
                        'status' => $event->status,
                        'status_label' => $event->status_label,
                        'priority' => $event->priority,
                        'priority_label' => $event->priority_label,
                        'start_date' => $event->start_date,
                        'end_date' => $event->end_date,
                        'start_time' => $event->start_time,
                        'end_time' => $event->end_time,
                        'location' => $event->location,
                        'max_participants' => $event->max_participants,
                        'registration_required' => $event->registration_required,
                        'is_public' => $event->is_public,
                        'created_at' => $event->created_at,
                        'institution' => $event->institution,
                        'organizer' => $event->organizer,
                    ],
                ],
                'message' => 'Tədbir uğurla yaradıldı',
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Tədbir yaradılarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update an existing event.
     */
    public function update(Request $request, SchoolEvent $event): JsonResponse
    {
        $user = $request->user();

        // Check permissions
        if (! $this->canManageEvent($user, $event)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tədbiri redaktə etmək üçün icazəniz yoxdur',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string|max:5000',
            'event_type' => 'sometimes|in:academic,administrative,cultural,sports,social,meeting,conference,workshop,ceremony,competition,examination,other',
            'event_category' => 'sometimes|in:academic,administrative,cultural,sports,social,meeting,conference,workshop,ceremony,competition,examination,other',
            'status' => ['sometimes', Rule::in(['draft', 'pending', 'approved', 'active', 'completed', 'cancelled'])],
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i',
            'location' => 'sometimes|string|max:500',
            'max_participants' => 'sometimes|integer|min:1|max:10000',
            'registration_required' => 'sometimes|boolean',
            'registration_deadline' => 'sometimes|date',
            'is_public' => 'sometimes|boolean',
            'is_recurring' => 'sometimes|boolean',
            'recurrence_rule' => 'sometimes|string|max:1000',
            'tags' => 'sometimes|array|max:10',
            'tags.*' => 'string|max:50',
            'notes' => 'sometimes|string|max:2000',
            'metadata' => 'sometimes|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Doğrulama xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Prevent changes to certain fields if event is approved/active
            if (in_array($event->status, ['approved', 'active', 'completed'])) {
                $restrictedFields = ['start_date', 'end_date', 'start_time', 'end_time', 'location', 'max_participants'];
                foreach ($restrictedFields as $field) {
                    if ($request->has($field) && $request->$field != $event->$field) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Təsdiqlənmiş və ya aktiv tədbirlər üçün bu məlumatları dəyişmək olmaz',
                        ], 422);
                    }
                }
            }

            $updateData = $request->only([
                'title', 'description', 'event_type', 'event_category', 'status', 'priority',
                'start_date', 'end_date', 'start_time', 'end_time', 'location',
                'max_participants', 'registration_required', 'registration_deadline',
                'is_public', 'is_recurring', 'recurrence_rule', 'tags', 'notes', 'metadata',
            ]);

            // Validate updated date/time combination
            $startDate = $request->start_date ?? $event->start_date;
            $endDate = $request->end_date ?? $event->end_date;
            $startTime = $request->start_time ?? $event->start_time;
            $endTime = $request->end_time ?? $event->end_time;

            if ($startTime && $endTime) {
                $startDateTime = Carbon::parse($startDate . ' ' . $startTime);
                $endDateTime = Carbon::parse($endDate . ' ' . $endTime);

                if ($startDateTime >= $endDateTime) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bitiş tarixi və vaxtı başlama tarixindən sonra olmalıdır',
                    ], 422);
                }
            }

            $event->update($updateData);

            DB::commit();

            // Load relationships for response
            $event->load(['institution:id,name,type', 'organizer:id,name,email']);

            return response()->json([
                'success' => true,
                'data' => [
                    'event' => [
                        'id' => $event->id,
                        'title' => $event->title,
                        'description' => $event->description,
                        'event_type' => $event->event_type,
                        'event_type_label' => $event->event_type_label,
                        'event_category' => $event->event_category,
                        'status' => $event->status,
                        'status_label' => $event->status_label,
                        'priority' => $event->priority,
                        'priority_label' => $event->priority_label,
                        'start_date' => $event->start_date,
                        'end_date' => $event->end_date,
                        'start_time' => $event->start_time,
                        'end_time' => $event->end_time,
                        'location' => $event->location,
                        'max_participants' => $event->max_participants,
                        'registration_required' => $event->registration_required,
                        'is_public' => $event->is_public,
                        'updated_at' => $event->updated_at,
                        'institution' => $event->institution,
                        'organizer' => $event->organizer,
                    ],
                ],
                'message' => 'Tədbir məlumatları uğurla yeniləndi',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Tədbir yenilənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete an event.
     */
    public function destroy(Request $request, SchoolEvent $event): JsonResponse
    {
        $user = $request->user();

        // Check permissions
        if (! $this->canManageEvent($user, $event)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tədbiri silmək üçün icazəniz yoxdur',
            ], 403);
        }

        // Prevent deletion of active or completed events
        if (in_array($event->status, ['active', 'completed'])) {
            return response()->json([
                'success' => false,
                'message' => 'Aktiv və ya tamamlanmış tədbirləri silmək olmaz',
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Check for registrations
            $registrationsCount = $event->registrations()->where('status', 'confirmed')->count();
            if ($registrationsCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Təsdiqlənmiş qeydiyyatları olan tədbiri silmək olmaz',
                    'registrations_count' => $registrationsCount,
                ], 422);
            }

            // Delete related data
            $event->registrations()->delete();
            $event->resources()->delete();

            $event->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tədbir uğurla silindi',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Tədbir silinərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check if user can manage event for specific institution.
     */
    private function canManageEventForInstitution($user, $institutionId): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        $userInstitution = $user->institution;
        if (! $userInstitution) {
            return false;
        }

        // Direct institution match
        if ($userInstitution->id == $institutionId) {
            return true;
        }

        // Check if institution is under user's hierarchy
        $targetInstitution = Institution::find($institutionId);
        if (! $targetInstitution) {
            return false;
        }

        // Regional admin can create for sectors and schools in their region
        if ($user->hasRole(['regionadmin', 'regionoperator']) && $userInstitution->level <= 2) {
            return str_starts_with($targetInstitution->path, $userInstitution->path);
        }

        // Sector admin can create for schools in their sector
        if ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            return $targetInstitution->parent_id == $userInstitution->id;
        }

        return false;
    }

    /**
     * Check if user can manage (edit/delete) specific event.
     */
    private function canManageEvent($user, SchoolEvent $event): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Event organizer can always manage their event
        if ($event->organizer_id == $user->id) {
            return true;
        }

        // Check hierarchical permissions
        return $this->canManageEventForInstitution($user, $event->institution_id);
    }
}
