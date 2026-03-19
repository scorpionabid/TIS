<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\TeacherAvailability;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TeacherAvailabilityApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'teacher_id' => ['nullable', 'integer', 'exists:users,id'],
            'academic_year_id' => ['nullable', 'integer', 'exists:academic_years,id'],
            'day_of_week' => ['nullable', 'string', Rule::in(array_keys(TeacherAvailability::DAYS_OF_WEEK))],
            'availability_type' => ['nullable', 'string', Rule::in(array_keys(TeacherAvailability::AVAILABILITY_TYPES))],
            'status' => ['nullable', 'string', Rule::in(array_keys(TeacherAvailability::STATUSES))],
        ]);

        $query = TeacherAvailability::query()->with(['teacher', 'creator', 'approver']);

        if (!empty($validated['teacher_id'])) {
            $query->where('teacher_id', $validated['teacher_id']);
        }

        if (!empty($validated['academic_year_id'])) {
            $query->where('academic_year_id', $validated['academic_year_id']);
        }

        if (!empty($validated['day_of_week'])) {
            $query->where('day_of_week', $validated['day_of_week']);
        }

        if (!empty($validated['availability_type'])) {
            $query->where('availability_type', $validated['availability_type']);
        }

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        // Institution scoping: non-superadmin is restricted to their institution
        if ($user?->institution_id) {
            $query->whereHas('teacher', function ($q) use ($user) {
                $q->where('institution_id', $user->institution_id);
            });
        }

        $items = $query
            ->orderBy('teacher_id')
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'teacher_id' => ['required', 'integer', 'exists:users,id'],
            'academic_year_id' => ['required', 'integer', 'exists:academic_years,id'],
            'day_of_week' => ['required', 'string', Rule::in(array_keys(TeacherAvailability::DAYS_OF_WEEK))],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'availability_type' => ['required', 'string', Rule::in(array_keys(TeacherAvailability::AVAILABILITY_TYPES))],
            'recurrence_type' => ['nullable', 'string', Rule::in(array_keys(TeacherAvailability::RECURRENCE_TYPES))],
            'priority' => ['nullable', 'integer', 'min:1', 'max:10'],
            'is_flexible' => ['nullable', 'boolean'],
            'is_mandatory' => ['nullable', 'boolean'],
            'reason' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'metadata' => ['nullable', 'array'],
        ]);

        // Institution scoping for non-superadmin
        if ($user?->institution_id) {
            $teacher = User::query()->where('id', $validated['teacher_id'])->first();
            if (!$teacher || $teacher->institution_id !== $user->institution_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden',
                ], 403);
            }
        }

        $year = AcademicYear::query()->find($validated['academic_year_id']);

        $availability = TeacherAvailability::query()->create([
            'teacher_id' => $validated['teacher_id'],
            'academic_year_id' => $validated['academic_year_id'],
            'day_of_week' => $validated['day_of_week'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'availability_type' => $validated['availability_type'],
            'recurrence_type' => $validated['recurrence_type'] ?? 'weekly',
            'effective_date' => $year?->start_date ?? today(),
            'end_date' => $year?->end_date,
            'priority' => $validated['priority'] ?? 5,
            'is_flexible' => $validated['is_flexible'] ?? true,
            'is_mandatory' => $validated['is_mandatory'] ?? false,
            'reason' => $validated['reason'] ?? null,
            'description' => $validated['description'] ?? null,
            'location' => $validated['location'] ?? null,
            'created_by' => $user->id,
            'status' => 'active',
            'metadata' => $validated['metadata'] ?? null,
            'allow_emergency_override' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Teacher availability created successfully',
            'data' => $availability->load(['teacher', 'creator', 'approver']),
        ]);
    }

    public function update(Request $request, TeacherAvailability $teacherAvailability): JsonResponse
    {
        $user = $request->user();

        // Institution scoping for non-superadmin
        if ($user?->institution_id && $teacherAvailability->teacher?->institution_id !== $user->institution_id) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden',
            ], 403);
        }

        $validated = $request->validate([
            'academic_year_id' => ['sometimes', 'integer', 'exists:academic_years,id'],
            'day_of_week' => ['sometimes', 'string', Rule::in(array_keys(TeacherAvailability::DAYS_OF_WEEK))],
            'start_time' => ['sometimes', 'date_format:H:i'],
            'end_time' => ['sometimes', 'date_format:H:i'],
            'availability_type' => ['sometimes', 'string', Rule::in(array_keys(TeacherAvailability::AVAILABILITY_TYPES))],
            'recurrence_type' => ['sometimes', 'string', Rule::in(array_keys(TeacherAvailability::RECURRENCE_TYPES))],
            'priority' => ['sometimes', 'integer', 'min:1', 'max:10'],
            'is_flexible' => ['sometimes', 'boolean'],
            'is_mandatory' => ['sometimes', 'boolean'],
            'reason' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'string', Rule::in(array_keys(TeacherAvailability::STATUSES))],
            'metadata' => ['nullable', 'array'],
        ]);

        if (array_key_exists('start_time', $validated) || array_key_exists('end_time', $validated)) {
            $start = $validated['start_time'] ?? $teacherAvailability->start_time?->format('H:i');
            $end = $validated['end_time'] ?? $teacherAvailability->end_time?->format('H:i');
            if ($start && $end && $start >= $end) {
                return response()->json([
                    'success' => false,
                    'message' => 'end_time must be after start_time',
                ], 422);
            }
        }

        if (array_key_exists('academic_year_id', $validated)) {
            $year = AcademicYear::query()->find($validated['academic_year_id']);
            if ($year) {
                $validated['effective_date'] = $year->start_date;
                $validated['end_date'] = $year->end_date;
            }
        }

        $teacherAvailability->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Teacher availability updated successfully',
            'data' => $teacherAvailability->refresh()->load(['teacher', 'creator', 'approver']),
        ]);
    }

    public function destroy(Request $request, TeacherAvailability $teacherAvailability): JsonResponse
    {
        $user = $request->user();

        // Institution scoping for non-superadmin
        if ($user?->institution_id && $teacherAvailability->teacher?->institution_id !== $user->institution_id) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden',
            ], 403);
        }

        $teacherAvailability->delete();

        return response()->json([
            'success' => true,
            'message' => 'Teacher availability deleted successfully',
        ]);
    }
}
