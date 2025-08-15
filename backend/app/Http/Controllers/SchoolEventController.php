<?php

namespace App\Http\Controllers;

use App\Models\SchoolEvent;
use App\Models\EventRegistration;
use App\Models\EventResource;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class SchoolEventController extends Controller
{
    /**
     * Display a listing of events with filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'institution_id' => 'sometimes|exists:institutions,id',
            'event_type' => 'sometimes|in:academic,administrative,cultural,sports,social,meeting,conference,workshop,ceremony,competition,examination,other',
            'event_category' => 'sometimes|in:academic,administrative,cultural,sports,social,meeting,conference,workshop,ceremony,competition,examination,other',
            'status' => 'sometimes|in:draft,pending,approved,active,completed,cancelled',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'organizer_id' => 'sometimes|exists:users,id',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'time_filter' => 'sometimes|in:upcoming,past,today,this_week,this_month',
            'is_public' => 'sometimes|boolean',
            'registration_required' => 'sometimes|boolean',
            'has_capacity' => 'sometimes|boolean',
            'search' => 'sometimes|string|max:255',
            'tags' => 'sometimes|array',
            'tags.*' => 'string|max:50',
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

        $query = SchoolEvent::query();

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

        if ($request->has('event_type')) {
            $query->where('event_type', $request->event_type);
        }

        if ($request->has('event_category')) {
            $query->where('event_category', $request->event_category);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->has('organizer_id')) {
            $query->where('organizer_id', $request->organizer_id);
        }

        if ($request->has('start_date')) {
            $query->whereDate('start_date', '>=', $request->start_date);
        }

        if ($request->has('end_date')) {
            $query->whereDate('end_date', '<=', $request->end_date);
        }

        if ($request->has('time_filter')) {
            switch ($request->time_filter) {
                case 'upcoming':
                    $query->upcoming();
                    break;
                case 'past':
                    $query->past();
                    break;
                case 'today':
                    $query->today();
                    break;
                case 'this_week':
                    $query->whereBetween('start_date', [
                        now()->startOfWeek(),
                        now()->endOfWeek()
                    ]);
                    break;
                case 'this_month':
                    $query->whereBetween('start_date', [
                        now()->startOfMonth(),
                        now()->endOfMonth()
                    ]);
                    break;
            }
        }

        if ($request->has('is_public')) {
            $query->where('is_public', $request->boolean('is_public'));
        }

        if ($request->has('registration_required')) {
            $query->where('registration_required', $request->boolean('registration_required'));
        }

        if ($request->has('has_capacity')) {
            if ($request->boolean('has_capacity')) {
                $query->whereRaw('(max_participants IS NULL OR (SELECT COUNT(*) FROM event_registrations WHERE event_id = school_events.id AND status = ?) < max_participants)', ['confirmed']);
            } else {
                $query->whereRaw('max_participants IS NOT NULL AND (SELECT COUNT(*) FROM event_registrations WHERE event_id = school_events.id AND status = ?) >= max_participants', ['confirmed']);
            }
        }

        if ($request->has('search')) {
            $query->search($request->search);
        }

        if ($request->has('tags')) {
            foreach ($request->tags as $tag) {
                $query->whereJsonContains('tags', $tag);
            }
        }

        // Handle includes
        $includes = $request->get('include', '');
        $with = ['institution', 'organizer.profile'];
        
        if (str_contains($includes, 'registrations')) {
            $with[] = 'activeRegistrations.participant.profile';
        }
        if (str_contains($includes, 'resources')) {
            $with[] = 'resources';
        }
        if (str_contains($includes, 'approver')) {
            $with[] = 'approver.profile';
        }

        $query->with($with);

        $perPage = $request->get('per_page', 20);
        $events = $query->orderBy('start_date', 'desc')
                       ->orderBy('priority', 'desc')
                       ->paginate($perPage);

        // Transform the data
        $transformedEvents = $events->through(function ($event) {
            $data = [
                'id' => $event->id,
                'title' => $event->title,
                'full_title' => $event->full_title,
                'description' => $event->description,
                'event_type' => $event->event_type,
                'event_category' => $event->event_category,
                'category_label' => $event->category_label,
                'start_date' => $event->start_date,
                'end_date' => $event->end_date,
                'start_time' => $event->start_time?->format('H:i'),
                'end_time' => $event->end_time?->format('H:i'),
                'duration' => $event->duration,
                'location' => $event->location,
                'status' => $event->status,
                'status_label' => $event->status_label,
                'priority' => $event->priority,
                'priority_label' => $event->priority_label,
                'is_public' => $event->is_public,
                'registration_required' => $event->registration_required,
                'max_participants' => $event->max_participants,
                'registration_count' => $event->activeRegistrations()->count(),
                'remaining_capacity' => $event->getRemainingCapacity(),
                'registration_rate' => $event->getRegistrationRate(),
                'can_register' => $event->canRegister(),
                'is_upcoming' => $event->isUpcoming(),
                'is_today' => $event->isToday(),
                'tags' => $event->tags,
                'institution' => [
                    'id' => $event->institution->id,
                    'name' => $event->institution->name,
                    'type' => $event->institution->type,
                ],
                'organizer' => [
                    'id' => $event->organizer->id,
                    'full_name' => $event->organizer->profile 
                        ? "{$event->organizer->profile->first_name} {$event->organizer->profile->last_name}"
                        : $event->organizer->username,
                    'email' => $event->organizer->email,
                ],
                'created_at' => $event->created_at,
                'updated_at' => $event->updated_at,
            ];

            // Add registrations if included
            if ($event->relationLoaded('activeRegistrations')) {
                $data['registrations'] = $event->activeRegistrations->map(function ($registration) {
                    return [
                        'id' => $registration->id,
                        'participant' => [
                            'id' => $registration->participant->id,
                            'full_name' => $registration->participant->profile 
                                ? "{$registration->participant->profile->first_name} {$registration->participant->profile->last_name}"
                                : $registration->participant->username,
                            'email' => $registration->participant->email,
                        ],
                        'status' => $registration->status,
                        'registered_at' => $registration->registered_at,
                        'attended' => $registration->attended,
                    ];
                });
            }

            // Add resources if included
            if ($event->relationLoaded('resources')) {
                $data['resources'] = $event->resources->map(function ($resource) {
                    return [
                        'id' => $resource->id,
                        'resource_type' => $resource->resource_type,
                        'resource_name' => $resource->resource_name,
                        'quantity_needed' => $resource->quantity_needed,
                        'status' => $resource->status,
                        'total_cost' => $resource->total_cost,
                    ];
                });
            }

            // Add approver if included
            if ($event->relationLoaded('approver') && $event->approver) {
                $data['approver'] = [
                    'id' => $event->approver->id,
                    'full_name' => $event->approver->profile 
                        ? "{$event->approver->profile->first_name} {$event->approver->profile->last_name}"
                        : $event->approver->username,
                    'email' => $event->approver->email,
                ];
                $data['approved_at'] = $event->approved_at;
            }

            return $data;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'events' => $transformedEvents->items(),
                'pagination' => [
                    'current_page' => $events->currentPage(),
                    'per_page' => $events->perPage(),
                    'total' => $events->total(),
                    'total_pages' => $events->lastPage(),
                    'from' => $events->firstItem(),
                    'to' => $events->lastItem(),
                ],
            ],
            'message' => 'Tədbir siyahısı uğurla alındı',
        ]);
    }

    /**
     * Store a newly created event.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'event_type' => 'required|in:academic,administrative,cultural,sports,social,meeting,conference,workshop,ceremony,competition,examination,other',
            'event_category' => 'nullable|in:academic,administrative,cultural,sports,social,meeting,conference,workshop,ceremony,competition,examination,other',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'location' => 'nullable|string|max:255',
            'institution_id' => 'required|exists:institutions,id',
            'max_participants' => 'nullable|integer|min:1|max:10000',
            'registration_required' => 'boolean',
            'registration_deadline' => 'nullable|date|before:start_date',
            'priority' => 'required|in:low,medium,high,urgent',
            'is_public' => 'boolean',
            'is_recurring' => 'boolean',
            'recurrence_pattern' => 'nullable|array',
            'target_audience' => 'nullable|array',
            'requirements' => 'nullable|array',
            'materials_needed' => 'nullable|array',
            'budget' => 'nullable|numeric|min:0',
            'contact_person' => 'nullable|string|max:255',
            'contact_info' => 'nullable|array',
            'external_link' => 'nullable|url',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'notes' => 'nullable|string|max:1000',
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

        try {
            DB::beginTransaction();

            $event = SchoolEvent::create([
                'title' => $request->title,
                'description' => $request->description,
                'event_type' => $request->event_type,
                'event_category' => $request->event_category ?? $request->event_type,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'start_time' => $request->start_time ? Carbon::createFromFormat('H:i', $request->start_time) : null,
                'end_time' => $request->end_time ? Carbon::createFromFormat('H:i', $request->end_time) : null,
                'location' => $request->location,
                'institution_id' => $request->institution_id,
                'organizer_id' => $user->id,
                'max_participants' => $request->max_participants,
                'registration_required' => $request->boolean('registration_required'),
                'registration_deadline' => $request->registration_deadline,
                'status' => $user->hasAnyRole(['superadmin', 'schooladmin', 'regionadmin']) ? 'approved' : 'pending',
                'priority' => $request->priority,
                'is_public' => $request->boolean('is_public'),
                'is_recurring' => $request->boolean('is_recurring'),
                'recurrence_pattern' => $request->recurrence_pattern,
                'target_audience' => $request->target_audience ?? [],
                'requirements' => $request->requirements ?? [],
                'materials_needed' => $request->materials_needed ?? [],
                'budget' => $request->budget,
                'contact_person' => $request->contact_person,
                'contact_info' => $request->contact_info ?? [],
                'external_link' => $request->external_link,
                'tags' => $request->tags ?? [],
                'notes' => $request->notes,
                'metadata' => [],
            ]);

            // Generate recurring events if needed
            if ($event->is_recurring && $event->recurrence_pattern) {
                $recurringEvents = $event->generateRecurringEvents();
                foreach ($recurringEvents as $recurringEventData) {
                    SchoolEvent::create($recurringEventData);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $event->id,
                    'title' => $event->title,
                    'full_title' => $event->full_title,
                    'status' => $event->status,
                    'status_label' => $event->status_label,
                    'duration' => $event->duration,
                    'created_at' => $event->created_at,
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
     * Display the specified event.
     */
    public function show(Request $request, SchoolEvent $event): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($event->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu tədbir üçün icazəniz yoxdur',
                ], 403);
            }
        }

        $event->load([
            'institution',
            'organizer.profile',
            'approver.profile',
            'activeRegistrations.participant.profile',
            'resources.requester.profile',
            'resources.approver.profile',
        ]);

        $registrationsData = $event->activeRegistrations->map(function ($registration) {
            return [
                'id' => $registration->id,
                'participant' => [
                    'id' => $registration->participant->id,
                    'full_name' => $registration->participant->profile 
                        ? "{$registration->participant->profile->first_name} {$registration->participant->profile->last_name}"
                        : $registration->participant->username,
                    'email' => $registration->participant->email,
                ],
                'status' => $registration->status,
                'status_label' => $registration->status_label,
                'registered_at' => $registration->registered_at,
                'attended' => $registration->attended,
                'feedback' => $registration->feedback,
                'rating' => $registration->rating,
            ];
        });

        $resourcesData = $event->resources->map(function ($resource) {
            return [
                'id' => $resource->id,
                'resource_type' => $resource->resource_type,
                'resource_type_label' => $resource->resource_type_label,
                'resource_name' => $resource->resource_name,
                'description' => $resource->description,
                'quantity_needed' => $resource->quantity_needed,
                'quantity_available' => $resource->quantity_available,
                'availability_status' => $resource->availability_status,
                'unit' => $resource->unit,
                'cost_per_unit' => $resource->cost_per_unit,
                'total_cost' => $resource->total_cost,
                'status' => $resource->status,
                'status_label' => $resource->status_label,
                'requester' => $resource->requester ? [
                    'id' => $resource->requester->id,
                    'full_name' => $resource->requester->profile 
                        ? "{$resource->requester->profile->first_name} {$resource->requester->profile->last_name}"
                        : $resource->requester->username,
                ] : null,
            ];
        });

        $data = [
            'id' => $event->id,
            'title' => $event->title,
            'full_title' => $event->full_title,
            'description' => $event->description,
            'event_type' => $event->event_type,
            'event_category' => $event->event_category,
            'category_label' => $event->category_label,
            'start_date' => $event->start_date,
            'end_date' => $event->end_date,
            'start_time' => $event->start_time?->format('H:i'),
            'end_time' => $event->end_time?->format('H:i'),
            'duration' => $event->duration,
            'location' => $event->location,
            'status' => $event->status,
            'status_label' => $event->status_label,
            'priority' => $event->priority,
            'priority_label' => $event->priority_label,
            'is_public' => $event->is_public,
            'is_recurring' => $event->is_recurring,
            'recurrence_pattern' => $event->recurrence_pattern,
            'registration_required' => $event->registration_required,
            'registration_deadline' => $event->registration_deadline,
            'max_participants' => $event->max_participants,
            'registration_count' => $event->activeRegistrations->count(),
            'remaining_capacity' => $event->getRemainingCapacity(),
            'registration_rate' => $event->getRegistrationRate(),
            'can_register' => $event->canRegister(),
            'is_upcoming' => $event->isUpcoming(),
            'is_today' => $event->isToday(),
            'target_audience' => $event->target_audience,
            'requirements' => $event->requirements,
            'materials_needed' => $event->materials_needed,
            'budget' => $event->budget,
            'contact_person' => $event->contact_person,
            'contact_info' => $event->contact_info,
            'external_link' => $event->external_link,
            'tags' => $event->tags,
            'notes' => $event->notes,
            'institution' => [
                'id' => $event->institution->id,
                'name' => $event->institution->name,
                'type' => $event->institution->type,
            ],
            'organizer' => [
                'id' => $event->organizer->id,
                'full_name' => $event->organizer->profile 
                    ? "{$event->organizer->profile->first_name} {$event->organizer->profile->last_name}"
                    : $event->organizer->username,
                'email' => $event->organizer->email,
            ],
            'approver' => $event->approver ? [
                'id' => $event->approver->id,
                'full_name' => $event->approver->profile 
                    ? "{$event->approver->profile->first_name} {$event->approver->profile->last_name}"
                    : $event->approver->username,
                'email' => $event->approver->email,
            ] : null,
            'approved_at' => $event->approved_at,
            'registrations' => $registrationsData,
            'resources' => $resourcesData,
            'total_resources_cost' => $event->resources->sum('total_cost'),
            'metadata' => $event->metadata,
            'created_at' => $event->created_at,
            'updated_at' => $event->updated_at,
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Tədbir məlumatları uğurla alındı',
        ]);
    }

    /**
     * Update the specified event.
     */
    public function update(Request $request, SchoolEvent $event): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($event->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu tədbir üçün icazəniz yoxdur',
                ], 403);
            }
        }

        // Check if user can edit this event
        if (!$user->hasAnyRole(['superadmin', 'schooladmin', 'regionadmin']) && $event->organizer_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tədbiri redaktə etmək icazəniz yoxdur',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string|max:2000',
            'event_type' => 'sometimes|in:academic,administrative,cultural,sports,social,meeting,conference,workshop,ceremony,competition,examination,other',
            'event_category' => 'sometimes|nullable|in:academic,administrative,cultural,sports,social,meeting,conference,workshop,ceremony,competition,examination,other',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'start_time' => 'sometimes|nullable|date_format:H:i',
            'end_time' => 'sometimes|nullable|date_format:H:i',
            'location' => 'sometimes|nullable|string|max:255',
            'max_participants' => 'sometimes|nullable|integer|min:1|max:10000',
            'registration_required' => 'sometimes|boolean',
            'registration_deadline' => 'sometimes|nullable|date',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'is_public' => 'sometimes|boolean',
            'target_audience' => 'sometimes|nullable|array',
            'requirements' => 'sometimes|nullable|array',
            'materials_needed' => 'sometimes|nullable|array',
            'budget' => 'sometimes|nullable|numeric|min:0',
            'contact_person' => 'sometimes|nullable|string|max:255',
            'contact_info' => 'sometimes|nullable|array',
            'external_link' => 'sometimes|nullable|url',
            'tags' => 'sometimes|nullable|array',
            'tags.*' => 'string|max:50',
            'notes' => 'sometimes|nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $updateData = $request->only([
                'title', 'description', 'event_type', 'event_category',
                'start_date', 'end_date', 'location', 'max_participants',
                'registration_required', 'registration_deadline', 'priority',
                'is_public', 'target_audience', 'requirements', 'materials_needed',
                'budget', 'contact_person', 'contact_info', 'external_link',
                'tags', 'notes'
            ]);

            // Handle time fields
            if ($request->has('start_time')) {
                $updateData['start_time'] = $request->start_time ? Carbon::createFromFormat('H:i', $request->start_time) : null;
            }
            if ($request->has('end_time')) {
                $updateData['end_time'] = $request->end_time ? Carbon::createFromFormat('H:i', $request->end_time) : null;
            }

            $event->update($updateData);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $event->id,
                    'title' => $event->title,
                    'full_title' => $event->full_title,
                    'status' => $event->status,
                    'status_label' => $event->status_label,
                    'duration' => $event->duration,
                    'updated_at' => $event->updated_at,
                ],
                'message' => 'Tədbir məlumatları uğurla yeniləndi',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Tədbir yenilənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified event.
     */
    public function destroy(Request $request, SchoolEvent $event): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($event->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu tədbir üçün icazəniz yoxdur',
                ], 403);
            }
        }

        // Check if user can delete this event
        if (!$user->hasAnyRole(['superadmin', 'schooladmin', 'regionadmin']) && $event->organizer_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tədbiri silmək icazəniz yoxdur',
            ], 403);
        }

        // Check if event has active registrations
        $activeRegistrations = $event->activeRegistrations()->count();
        if ($activeRegistrations > 0) {
            return response()->json([
                'success' => false,
                'message' => "Bu tədbirdə {$activeRegistrations} aktiv qeydiyyat var. Əvvəlcə onları ləğv edin",
            ], 422);
        }

        try {
            $event->delete();

            return response()->json([
                'success' => true,
                'message' => 'Tədbir uğurla silindi',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Tədbir silinərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Approve an event.
     */
    public function approve(Request $request, SchoolEvent $event): JsonResponse
    {
        $user = $request->user();

        // Check if user can approve events
        if (!$user->hasAnyRole(['superadmin', 'schooladmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Tədbir təsdiqləmək icazəniz yoxdur',
            ], 403);
        }

        // Check regional access
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($event->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu tədbir üçün icazəniz yoxdur',
                ], 403);
            }
        }

        if ($event->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Yalnız gözləmədə olan tədbirlər təsdiqlənə bilər',
            ], 422);
        }

        try {
            $event->approve($user->id);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $event->id,
                    'title' => $event->title,
                    'status' => $event->status,
                    'status_label' => $event->status_label,
                    'approved_at' => $event->approved_at,
                ],
                'message' => 'Tədbir uğurla təsdiqləndi',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Tədbir təsdiqləndirilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel an event.
     */
    public function cancel(Request $request, SchoolEvent $event): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        // Check if user can cancel this event
        if (!$user->hasAnyRole(['superadmin', 'schooladmin', 'regionadmin']) && $event->organizer_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tədbiri ləğv etmək icazəniz yoxdur',
            ], 403);
        }

        if ($event->status === 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'Bu tədbir artıq ləğv edilib',
            ], 422);
        }

        try {
            $event->cancel($request->reason);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $event->id,
                    'title' => $event->title,
                    'status' => $event->status,
                    'status_label' => $event->status_label,
                    'cancelled_at' => $event->cancelled_at,
                    'cancelled_reason' => $event->cancelled_reason,
                ],
                'message' => 'Tədbir uğurla ləğv edildi',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Tədbir ləğv edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get event statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = SchoolEvent::query();

        // Apply regional access control
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            $query->whereIn('institution_id', $accessibleInstitutions);
        }

        // Filter by date range if provided
        if ($request->has('start_date')) {
            $query->whereDate('start_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->whereDate('end_date', '<=', $request->end_date);
        }

        $totalEvents = $query->count();
        $upcomingEvents = $query->upcoming()->count();
        $pastEvents = $query->past()->count();
        $todayEvents = $query->today()->count();

        // Status distribution
        $statusDistribution = $query->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                return [
                    'status' => $item->status,
                    'count' => $item->count,
                ];
            });

        // Type distribution
        $typeDistribution = $query->select('event_type', DB::raw('count(*) as count'))
            ->groupBy('event_type')
            ->get()
            ->map(function ($item) {
                return [
                    'event_type' => $item->event_type,
                    'count' => $item->count,
                ];
            });

        // Registration statistics
        $registrationStats = $query->where('registration_required', true)
            ->withCount(['activeRegistrations'])
            ->get()
            ->groupBy(function ($event) {
                if ($event->max_participants) {
                    $rate = ($event->active_registrations_count / $event->max_participants) * 100;
                    if ($rate >= 90) return 'high_demand';
                    if ($rate >= 50) return 'medium_demand';
                    return 'low_demand';
                }
                return 'unlimited';
            })
            ->map->count();

        return response()->json([
            'success' => true,
            'data' => [
                'overview' => [
                    'total_events' => $totalEvents,
                    'upcoming_events' => $upcomingEvents,
                    'past_events' => $pastEvents,
                    'today_events' => $todayEvents,
                    'events_requiring_registration' => $query->where('registration_required', true)->count(),
                    'public_events' => $query->where('is_public', true)->count(),
                ],
                'status_distribution' => $statusDistribution,
                'type_distribution' => $typeDistribution,
                'registration_demand' => $registrationStats,
            ],
            'message' => 'Tədbir statistikaları uğurla alındı',
        ]);
    }

    /**
     * Helper methods
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