<?php

namespace App\Http\Controllers\Events;

use App\Http\Controllers\Controller;
use App\Models\SchoolEvent;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class EventQueryController extends Controller
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

        $this->applyFilters($query, $request);

        // Handle includes
        $includes = $request->get('include', '');
        $with = ['institution', 'organizer.profile'];

        if (str_contains($includes, 'registrations')) {
            $with[] = 'registrations';
        }
        if (str_contains($includes, 'resources')) {
            $with[] = 'resources';
        }

        $query->with($with);

        // Sorting
        $query->orderBy('start_date', 'asc')
              ->orderBy('created_at', 'desc');

        // Pagination
        $perPage = min($request->get('per_page', 15), 100);
        $events = $query->paginate($perPage);

        // Transform data
        $events->getCollection()->transform(function ($event) {
            return [
                'id' => $event->id,
                'title' => $event->title,
                'description' => $event->description,
                'event_type' => $event->event_type,
                'event_type_label' => $event->event_type_label,
                'event_category' => $event->event_category,
                'event_category_label' => $event->event_category_label,
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
                'registration_deadline' => $event->registration_deadline,
                'is_public' => $event->is_public,
                'is_recurring' => $event->is_recurring,
                'recurrence_rule' => $event->recurrence_rule,
                'tags' => $event->tags,
                'notes' => $event->notes,
                'created_at' => $event->created_at,
                'updated_at' => $event->updated_at,
                'institution' => [
                    'id' => $event->institution->id,
                    'name' => $event->institution->name,
                    'type' => $event->institution->type,
                ],
                'organizer' => [
                    'id' => $event->organizer->id,
                    'name' => $event->organizer->name,
                    'email' => $event->organizer->email,
                ],
                'registrations_count' => $event->registrations_count ?? 0,
                'resources_count' => $event->resources_count ?? 0,
                'is_past' => $event->is_past,
                'is_upcoming' => $event->is_upcoming,
                'is_today' => $event->is_today,
                'can_register' => $event->can_register,
                'days_until_event' => $event->days_until_event,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $events,
            'message' => 'Events retrieved successfully',
        ]);
    }

    /**
     * Show a specific event.
     */
    public function show(Request $request, SchoolEvent $event): JsonResponse
    {
        // Check access permissions
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($event->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu tədbiri görmək üçün icazəniz yoxdur',
                ], 403);
            }
        }

        // Load relationships
        $event->load([
            'institution:id,name,type,address,phone,email',
            'organizer:id,name,email',
            'organizer.profile:user_id,first_name,last_name,phone,department',
            'registrations' => function ($query) {
                $query->with(['user:id,name,email', 'user.profile:user_id,first_name,last_name,phone'])
                      ->orderBy('created_at', 'desc');
            },
            'resources' => function ($query) {
                $query->orderBy('created_at', 'desc');
            },
        ]);

        // Get registration statistics
        $registrationStats = [
            'total' => $event->registrations->count(),
            'confirmed' => $event->registrations->where('status', 'confirmed')->count(),
            'pending' => $event->registrations->where('status', 'pending')->count(),
            'cancelled' => $event->registrations->where('status', 'cancelled')->count(),
        ];

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
                    'event_category_label' => $event->event_category_label,
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
                    'registration_deadline' => $event->registration_deadline,
                    'is_public' => $event->is_public,
                    'is_recurring' => $event->is_recurring,
                    'recurrence_rule' => $event->recurrence_rule,
                    'tags' => $event->tags,
                    'notes' => $event->notes,
                    'metadata' => $event->metadata,
                    'created_at' => $event->created_at,
                    'updated_at' => $event->updated_at,
                    'approved_at' => $event->approved_at,
                    'cancelled_at' => $event->cancelled_at,
                    'cancelled_reason' => $event->cancelled_reason,
                ],
                'institution' => $event->institution,
                'organizer' => [
                    'id' => $event->organizer->id,
                    'name' => $event->organizer->name,
                    'email' => $event->organizer->email,
                    'profile' => $event->organizer->profile,
                ],
                'registrations' => $event->registrations->map(function ($registration) {
                    return [
                        'id' => $registration->id,
                        'status' => $registration->status,
                        'status_label' => $registration->status_label,
                        'registered_at' => $registration->created_at,
                        'notes' => $registration->notes,
                        'user' => [
                            'id' => $registration->user->id,
                            'name' => $registration->user->name,
                            'email' => $registration->user->email,
                            'profile' => $registration->user->profile,
                        ],
                    ];
                }),
                'resources' => $event->resources->map(function ($resource) {
                    return [
                        'id' => $resource->id,
                        'title' => $resource->title,
                        'description' => $resource->description,
                        'file_type' => $resource->file_type,
                        'file_size' => $resource->file_size,
                        'file_path' => $resource->file_path,
                        'is_public' => $resource->is_public,
                        'download_count' => $resource->download_count,
                        'created_at' => $resource->created_at,
                    ];
                }),
                'statistics' => [
                    'registrations' => $registrationStats,
                    'is_past' => $event->is_past,
                    'is_upcoming' => $event->is_upcoming,
                    'is_today' => $event->is_today,
                    'can_register' => $event->can_register,
                    'days_until_event' => $event->days_until_event,
                    'capacity_filled_percentage' => $event->max_participants ? 
                        round(($registrationStats['confirmed'] / $event->max_participants) * 100, 1) : 0,
                ],
            ],
            'message' => 'Event details retrieved successfully',
        ]);
    }

    /**
     * Apply filters to the query based on request parameters.
     */
    private function applyFilters($query, Request $request): void
    {
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
    }

    /**
     * Get institutions accessible by the user based on their role and hierarchy.
     */
    private function getUserAccessibleInstitutions($user): array
    {
        if ($user->hasRole('superadmin')) {
            return \App\Models\Institution::pluck('id')->toArray();
        }

        $userInstitution = $user->institution;
        if (!$userInstitution) {
            return [];
        }

        $accessible = [$userInstitution->id];

        // Add child institutions based on user's role and level
        if ($user->hasRole(['regionadmin', 'regionoperator'])) {
            // Region level users can see sector and school events
            $childInstitutions = \App\Models\Institution::where('parent_id', $userInstitution->id)
                ->orWhere('path', 'like', $userInstitution->path . '%')
                ->pluck('id')
                ->toArray();
            $accessible = array_merge($accessible, $childInstitutions);
        } elseif ($user->hasRole('sektoradmin')) {
            // Sector level users can see school events in their sector
            $schoolIds = \App\Models\Institution::where('parent_id', $userInstitution->id)
                ->where('level', 4) // School level
                ->pluck('id')
                ->toArray();
            $accessible = array_merge($accessible, $schoolIds);
        }
        // School level users (teachers, schooladmin) can only see their own school events

        return $accessible;
    }
}