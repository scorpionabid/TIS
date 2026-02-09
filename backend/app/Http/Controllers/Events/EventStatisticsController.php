<?php

namespace App\Http\Controllers\Events;

use App\Http\Controllers\BaseController;
use App\Models\Institution;
use App\Models\SchoolEvent;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EventStatisticsController extends BaseController
{
    /**
     * Get event statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = SchoolEvent::query();

        // Apply regional access control
        if (! $user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            $query->whereIn('institution_id', $accessibleInstitutions);
        }

        // Filter by institution if specified
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        // Filter by date range if provided
        if ($request->has('start_date')) {
            $query->whereDate('start_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->whereDate('end_date', '<=', $request->end_date);
        }

        try {
            // Basic counts
            $baseQuery = clone $query;
            $totalEvents = $baseQuery->count();
            $upcomingEvents = (clone $query)->upcoming()->count();
            $pastEvents = (clone $query)->past()->count();
            $todayEvents = (clone $query)->today()->count();

            // Status distribution
            $statusDistribution = (clone $query)
                ->select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->get()
                ->map(function ($item) {
                    return [
                        'status' => $item->status,
                        'status_label' => ucfirst($item->status), // You might want to use a proper status label mapping
                        'count' => $item->count,
                    ];
                });

            // Event type distribution
            $typeDistribution = (clone $query)
                ->select('event_type', DB::raw('count(*) as count'))
                ->groupBy('event_type')
                ->get()
                ->map(function ($item) {
                    return [
                        'type' => $item->event_type,
                        'type_label' => ucfirst(str_replace('_', ' ', $item->event_type)),
                        'count' => $item->count,
                    ];
                });

            // Priority distribution
            $priorityDistribution = (clone $query)
                ->select('priority', DB::raw('count(*) as count'))
                ->groupBy('priority')
                ->get()
                ->map(function ($item) {
                    return [
                        'priority' => $item->priority,
                        'priority_label' => ucfirst($item->priority),
                        'count' => $item->count,
                    ];
                });

            // Monthly trends (last 12 months)
            $monthlyTrends = $this->getMonthlyTrends($query);

            // Institution-wise statistics (if user has access to multiple institutions)
            $institutionStats = [];
            if ($user->hasRole(['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin'])) {
                $institutionStats = $this->getInstitutionStatistics($query);
            }

            // Registration statistics (for events with registration)
            $registrationStats = $this->getRegistrationStatistics($query);

            // Popular tags
            $popularTags = $this->getPopularTags($query);

            // Recent activity
            $recentActivity = $this->getRecentActivity($query);

            return response()->json([
                'success' => true,
                'data' => [
                    'overview' => [
                        'total_events' => $totalEvents,
                        'upcoming_events' => $upcomingEvents,
                        'past_events' => $pastEvents,
                        'today_events' => $todayEvents,
                        'active_events' => (clone $query)->where('status', 'active')->count(),
                        'pending_approval' => (clone $query)->where('status', 'pending')->count(),
                    ],
                    'distributions' => [
                        'by_status' => $statusDistribution,
                        'by_type' => $typeDistribution,
                        'by_priority' => $priorityDistribution,
                    ],
                    'trends' => [
                        'monthly' => $monthlyTrends,
                    ],
                    'institutions' => $institutionStats,
                    'registrations' => $registrationStats,
                    'tags' => $popularTags,
                    'recent_activity' => $recentActivity,
                ],
                'message' => 'Event statistics retrieved successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Tədbir statistikası alınarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get detailed statistics for a specific time period.
     */
    public function periodStatistics(Request $request): JsonResponse
    {
        $validator = \Validator::make($request->all(), [
            'period' => 'required|in:week,month,quarter,year',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $period = $request->period;
        $now = now();

        // Set date range based on period
        switch ($period) {
            case 'week':
                $startDate = $request->start_date ? Carbon::parse($request->start_date) : $now->startOfWeek()->copy();
                $endDate = $request->end_date ? Carbon::parse($request->end_date) : $now->endOfWeek()->copy();
                break;
            case 'month':
                $startDate = $request->start_date ? Carbon::parse($request->start_date) : $now->startOfMonth()->copy();
                $endDate = $request->end_date ? Carbon::parse($request->end_date) : $now->endOfMonth()->copy();
                break;
            case 'quarter':
                $startDate = $request->start_date ? Carbon::parse($request->start_date) : $now->startOfQuarter()->copy();
                $endDate = $request->end_date ? Carbon::parse($request->end_date) : $now->endOfQuarter()->copy();
                break;
            case 'year':
                $startDate = $request->start_date ? Carbon::parse($request->start_date) : $now->startOfYear()->copy();
                $endDate = $request->end_date ? Carbon::parse($request->end_date) : $now->endOfYear()->copy();
                break;
        }

        $user = $request->user();
        $query = SchoolEvent::query();

        // Apply access control
        if (! $user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            $query->whereIn('institution_id', $accessibleInstitutions);
        }

        // Apply date filter
        $query->whereBetween('start_date', [$startDate->toDateString(), $endDate->toDateString()]);

        $events = $query->with(['institution:id,name', 'organizer:id,name'])->get();

        $statistics = [
            'period' => $period,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'total_events' => $events->count(),
            'events_by_day' => $this->getEventsByDay($events, $startDate, $endDate),
            'busiest_days' => $this->getBusiestDays($events),
            'most_active_organizers' => $this->getMostActiveOrganizers($events),
            'most_active_institutions' => $this->getMostActiveInstitutions($events),
        ];

        return response()->json([
            'success' => true,
            'data' => $statistics,
            'message' => 'Period statistics retrieved successfully',
        ]);
    }

    /**
     * Get monthly trends for the last 12 months.
     */
    private function getMonthlyTrends($query): array
    {
        $trends = [];
        $startDate = now()->subMonths(11)->startOfMonth();

        for ($i = 0; $i < 12; $i++) {
            $monthStart = $startDate->copy()->addMonths($i);
            $monthEnd = $monthStart->copy()->endOfMonth();

            $count = (clone $query)
                ->whereBetween('start_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
                ->count();

            $trends[] = [
                'month' => $monthStart->format('Y-m'),
                'month_name' => $monthStart->format('F Y'),
                'count' => $count,
            ];
        }

        return $trends;
    }

    /**
     * Get institution-wise statistics.
     */
    private function getInstitutionStatistics($query): array
    {
        return (clone $query)
            ->select('institution_id', DB::raw('count(*) as events_count'))
            ->with('institution:id,name,type')
            ->groupBy('institution_id')
            ->orderByDesc('events_count')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'institution' => [
                        'id' => $item->institution->id,
                        'name' => $item->institution->name,
                        'type' => $item->institution->type,
                    ],
                    'events_count' => $item->events_count,
                ];
            })
            ->toArray();
    }

    /**
     * Get registration statistics.
     */
    private function getRegistrationStatistics($query): array
    {
        $eventsWithRegistration = (clone $query)->where('registration_required', true);

        return [
            'total_events_with_registration' => $eventsWithRegistration->count(),
            'total_registrations' => $eventsWithRegistration->withCount('registrations')->get()->sum('registrations_count'),
            'average_registrations_per_event' => $eventsWithRegistration->withCount('registrations')->get()->avg('registrations_count') ?: 0,
        ];
    }

    /**
     * Get popular tags.
     */
    private function getPopularTags($query): array
    {
        $events = (clone $query)->whereNotNull('tags')->get();
        $tagCounts = [];

        foreach ($events as $event) {
            if (is_array($event->tags)) {
                foreach ($event->tags as $tag) {
                    $tagCounts[$tag] = ($tagCounts[$tag] ?? 0) + 1;
                }
            }
        }

        arsort($tagCounts);

        return array_map(function ($tag, $count) {
            return ['tag' => $tag, 'count' => $count];
        }, array_keys(array_slice($tagCounts, 0, 10)), array_slice($tagCounts, 0, 10));
    }

    /**
     * Get recent activity.
     */
    private function getRecentActivity($query): array
    {
        return (clone $query)
            ->with(['institution:id,name', 'organizer:id,name'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($event) {
                return [
                    'id' => $event->id,
                    'title' => $event->title,
                    'status' => $event->status,
                    'start_date' => $event->start_date,
                    'institution' => $event->institution->name,
                    'organizer' => $event->organizer->name,
                    'created_at' => $event->created_at,
                ];
            })
            ->toArray();
    }

    /**
     * Get events grouped by day for a period.
     */
    private function getEventsByDay($events, $startDate, $endDate): array
    {
        $eventsByDay = [];
        $current = $startDate->copy();

        while ($current <= $endDate) {
            $dayEvents = $events->filter(function ($event) use ($current) {
                return Carbon::parse($event->start_date)->isSameDay($current);
            });

            $eventsByDay[] = [
                'date' => $current->toDateString(),
                'day_name' => $current->format('l'),
                'count' => $dayEvents->count(),
                'events' => $dayEvents->map(function ($event) {
                    return [
                        'id' => $event->id,
                        'title' => $event->title,
                        'start_time' => $event->start_time,
                        'status' => $event->status,
                    ];
                })->values()->toArray(),
            ];

            $current->addDay();
        }

        return $eventsByDay;
    }

    /**
     * Get busiest days of the week.
     */
    private function getBusiestDays($events): array
    {
        $dayCount = [];
        $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        foreach ($events as $event) {
            $dayOfWeek = Carbon::parse($event->start_date)->dayOfWeek;
            $dayCount[$dayOfWeek] = ($dayCount[$dayOfWeek] ?? 0) + 1;
        }

        $result = [];
        for ($i = 0; $i < 7; $i++) {
            $result[] = [
                'day' => $dayNames[$i],
                'day_number' => $i,
                'count' => $dayCount[$i] ?? 0,
            ];
        }

        // Sort by count descending
        usort($result, function ($a, $b) {
            return $b['count'] - $a['count'];
        });

        return $result;
    }

    /**
     * Get most active organizers.
     */
    private function getMostActiveOrganizers($events): array
    {
        $organizerCount = [];

        foreach ($events as $event) {
            $organizer = $event->organizer;
            $organizerId = $organizer->id;

            if (! isset($organizerCount[$organizerId])) {
                $organizerCount[$organizerId] = [
                    'organizer' => [
                        'id' => $organizer->id,
                        'name' => $organizer->name,
                    ],
                    'count' => 0,
                ];
            }
            $organizerCount[$organizerId]['count']++;
        }

        $result = array_values($organizerCount);
        usort($result, function ($a, $b) {
            return $b['count'] - $a['count'];
        });

        return array_slice($result, 0, 5);
    }

    /**
     * Get most active institutions.
     */
    private function getMostActiveInstitutions($events): array
    {
        $institutionCount = [];

        foreach ($events as $event) {
            $institution = $event->institution;
            $institutionId = $institution->id;

            if (! isset($institutionCount[$institutionId])) {
                $institutionCount[$institutionId] = [
                    'institution' => [
                        'id' => $institution->id,
                        'name' => $institution->name,
                    ],
                    'count' => 0,
                ];
            }
            $institutionCount[$institutionId]['count']++;
        }

        $result = array_values($institutionCount);
        usort($result, function ($a, $b) {
            return $b['count'] - $a['count'];
        });

        return array_slice($result, 0, 5);
    }

    /**
     * Get institutions accessible by the user based on their role and hierarchy.
     */
    private function getUserAccessibleInstitutions($user): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }

        $userInstitution = $user->institution;
        if (! $userInstitution) {
            return [];
        }

        $accessible = [$userInstitution->id];

        // Add child institutions based on user's role and level
        if ($user->hasRole(['regionadmin', 'regionoperator'])) {
            // Region level users can see sector and school events
            $childInstitutions = Institution::where('parent_id', $userInstitution->id)
                ->orWhere('path', 'like', $userInstitution->path . '%')
                ->pluck('id')
                ->toArray();
            $accessible = array_merge($accessible, $childInstitutions);
        } elseif ($user->hasRole('sektoradmin')) {
            // Sector level users can see school events in their sector
            $schoolIds = Institution::where('parent_id', $userInstitution->id)
                ->where('level', 4) // School level
                ->pluck('id')
                ->toArray();
            $accessible = array_merge($accessible, $schoolIds);
        }
        // School level users (teachers, schooladmin) can only see their own school events

        return $accessible;
    }
}
