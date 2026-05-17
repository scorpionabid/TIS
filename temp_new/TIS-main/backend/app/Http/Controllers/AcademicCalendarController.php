<?php

namespace App\Http\Controllers;

use App\Models\AcademicCalendar;
use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AcademicCalendarController extends Controller
{
    /**
     * Display a listing of academic calendars (filtered by institution_id = 1 for global)
     */
    public function index(Request $request)
    {
        $institutionId = $request->get('institution_id', 1);
        $academicYearId = $request->get('academic_year_id');

        $query = AcademicCalendar::with(['academicYear'])
            ->where('institution_id', $institutionId);

        if ($academicYearId) {
            $query->where('academic_year_id', $academicYearId);
        }

        $calendars = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $calendars
        ]);
    }

    /**
     * Store a newly created academic calendar
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'institution_id' => 'required|exists:institutions,id',
            'name' => 'required|string|max:255',
            'calendar_type' => 'required|in:school,exam,holiday,event,training',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'status' => 'nullable|in:draft,pending_approval,approved,active,archived',
            'is_default' => 'nullable|boolean',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        // Set default holidays if not provided
        if (!$request->has('holidays')) {
            $academicYear = AcademicYear::find($validated['academic_year_id']);
            // Access defined standard holidays if needed
            // $validated['holidays'] = AcademicCalendar::getStandardHolidays($academicYear);
        }

        $calendar = AcademicCalendar::create($validated);

        return response()->json([
            'success' => true,
            'data' => $calendar,
            'message' => 'Tədris təqvimi uğurla yaradıldı'
        ], 201);
    }

    /**
     * Display the specified academic calendar
     */
    public function show(AcademicCalendar $academicCalendar)
    {
        $academicCalendar->load('academicYear');
        return response()->json([
            'success' => true,
            'data' => $academicCalendar
        ]);
    }

    /**
     * Update the specified academic calendar
     */
    public function update(Request $request, AcademicCalendar $academicCalendar)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'calendar_type' => 'sometimes|in:school,exam,holiday,event,training',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'holidays' => 'nullable|array',
            'special_events' => 'nullable|array',
            'status' => 'sometimes|in:draft,pending_approval,approved,active,archived',
            'is_default' => 'sometimes|boolean',
            'notes' => 'nullable|string',
        ]);

        $academicCalendar->update($validated);

        return response()->json([
            'success' => true,
            'data' => $academicCalendar,
            'message' => 'Tədris təqvimi uğurla yeniləndi'
        ]);
    }

    /**
     * Remove the specified academic calendar
     */
    public function destroy(AcademicCalendar $academicCalendar)
    {
        $academicCalendar->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tədris təqvimi uğurla silindi'
        ]);
    }

    /**
     * Toggle holiday status for a specific date
     */
    public function toggleDate(Request $request, AcademicCalendar $academicCalendar)
    {
        $request->validate([
            'date' => 'required|date',
            'name' => 'nullable|string',
            'type' => 'required|string|in:holiday,vacation,mourning,non_teaching',
            'is_set' => 'required|boolean'
        ]);

        $date = $request->input('date');
        $name = $request->input('name', 'General Holiday');
        $type = $request->input('type');
        $isSet = $request->input('is_set');

        $holidays = $academicCalendar->holidays ?? [];
        $specialEvents = $academicCalendar->special_events ?? [];

        if ($isSet) {
            // Check if already exists, update or add
            $exists = false;
            foreach ($holidays as &$h) {
                if ($h['date'] === $date) {
                    $h['name'] = $name;
                    $h['type'] = $type;
                    $exists = true;
                    break;
                }
            }
            if (!$exists) {
                $holidays[] = [
                    'date' => $date,
                    'name' => $name,
                    'type' => $type
                ];
            }
        } else {
            // Remove from holidays
            $holidays = array_values(array_filter($holidays, function($h) use ($date) {
                return $h['date'] !== $date;
            }));
        }

        $academicCalendar->update(['holidays' => $holidays]);

        return response()->json([
            'success' => true,
            'data' => $academicCalendar,
            'message' => 'Tarix statusu uğurla yeniləndi'
        ]);
    }
}
