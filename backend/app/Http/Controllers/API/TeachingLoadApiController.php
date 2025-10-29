<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class TeachingLoadApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $institutionId = $user->institution_id;
        
        $query = DB::table('teaching_loads')
            ->join('users', 'teaching_loads.teacher_id', '=', 'users.id')
            ->join('subjects', 'teaching_loads.subject_id', '=', 'subjects.id')
            ->join('classes', 'teaching_loads.class_id', '=', 'classes.id')
            ->select([
                'teaching_loads.*',
                'users.username as teacher_name',
                'subjects.name as subject_name',
                'classes.name as class_name'
            ])
            ->orderBy('users.username');

        // If user has institution_id, filter by it. SuperAdmin (null institution_id) sees all
        if ($institutionId !== null) {
            $query->where('classes.institution_id', $institutionId);
        }

        $teachingLoads = $query->get();

        return response()->json([
            'success' => true,
            'data' => $teachingLoads
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'teacher_id' => 'required|exists:users,id',
            'subject_id' => 'required|exists:subjects,id',
            'class_id' => 'required|exists:classes,id',
            'weekly_hours' => 'required|numeric|min:1|max:40',
            'academic_year_id' => 'required|exists:academic_years,id'
        ]);

        // Add default values for required fields that might be missing
        $data = array_merge($validated, [
            'total_hours' => $validated['weekly_hours'], // Default total_hours to weekly_hours
            'status' => 'active', // Default status
            'start_date' => now()->startOfYear(), // Default to current academic year start
            'end_date' => now()->endOfYear(), // Default to current academic year end
            'schedule_slots' => json_encode([]), // Empty array for schedule slots
            'metadata' => json_encode([]), // Empty metadata
            'created_at' => now(),
            'updated_at' => now()
        ]);

        $teachingLoadId = DB::table('teaching_loads')->insertGetId($data);

        return response()->json([
            'success' => true,
            'message' => 'Teaching load created successfully',
            'data' => ['id' => $teachingLoadId]
        ]);
    }

    public function getTeacherWorkload(Request $request, string $teacherId): JsonResponse
    {
        $workload = DB::table('teaching_loads')
            ->join('subjects', 'teaching_loads.subject_id', '=', 'subjects.id')
            ->join('classes', 'teaching_loads.class_id', '=', 'classes.id')
            ->where('teaching_loads.teacher_id', $teacherId)
            ->select([
                'teaching_loads.*',
                'subjects.name as subject_name',
                'classes.name as class_name'
            ])
            ->get();

        $totalHours = $workload->sum('weekly_hours');
        $maxHours = 24;

        return response()->json([
            'success' => true,
            'data' => [
                'loads' => $workload,
                'total_hours' => $totalHours,
                'max_hours' => $maxHours,
                'remaining_hours' => max(0, $maxHours - $totalHours),
                'is_overloaded' => $totalHours > $maxHours
            ]
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'weekly_hours' => 'required|numeric|min:1|max:40'
        ]);

        $updated = DB::table('teaching_loads')
            ->where('id', $id)
            ->update(array_merge($validated, [
                'updated_at' => now()
            ]));

        if (!$updated) {
            return response()->json([
                'success' => false,
                'message' => 'Teaching load not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Teaching load updated successfully'
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $deleted = DB::table('teaching_loads')->where('id', $id)->delete();

        if (!$deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Teaching load not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Teaching load deleted successfully'
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $teachingLoad = DB::table('teaching_loads')
            ->join('users', 'teaching_loads.teacher_id', '=', 'users.id')
            ->join('subjects', 'teaching_loads.subject_id', '=', 'subjects.id')
            ->join('classes', 'teaching_loads.class_id', '=', 'classes.id')
            ->where('teaching_loads.id', $id)
            ->select([
                'teaching_loads.*',
                'users.username as teacher_name',
                'subjects.name as subject_name',
                'classes.name as class_name'
            ])
            ->first();

        if (!$teachingLoad) {
            return response()->json([
                'success' => false,
                'message' => 'Teaching load not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $teachingLoad
        ]);
    }

    public function getByTeacher(string $teacherId): JsonResponse
    {
        return $this->getTeacherWorkload(request(), $teacherId);
    }

    public function getByInstitution(string $institutionId): JsonResponse
    {
        $teachingLoads = DB::table('teaching_loads')
            ->join('users', 'teaching_loads.teacher_id', '=', 'users.id')
            ->join('subjects', 'teaching_loads.subject_id', '=', 'subjects.id')
            ->join('classes', 'teaching_loads.class_id', '=', 'classes.id')
            ->where('classes.institution_id', $institutionId)
            ->select([
                'teaching_loads.*',
                'users.username as teacher_name',
                'subjects.name as subject_name',
                'classes.name as class_name'
            ])
            ->orderBy('users.username')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $teachingLoads
        ]);
    }

    public function bulkAssign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'assignments' => 'required|array',
            'assignments.*.teacher_id' => 'required|exists:users,id',
            'assignments.*.subject_id' => 'required|exists:subjects,id',
            'assignments.*.class_id' => 'required|exists:classes,id',
            'assignments.*.weekly_hours' => 'required|numeric|min:1|max:40',
            'assignments.*.academic_year_id' => 'required|exists:academic_years,id'
        ]);

        $insertData = [];
        foreach ($validated['assignments'] as $assignment) {
            $insertData[] = array_merge($assignment, [
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        DB::table('teaching_loads')->insert($insertData);

        return response()->json([
            'success' => true,
            'message' => 'Teaching loads assigned successfully',
            'data' => ['count' => count($insertData)]
        ]);
    }

    public function getAnalytics(): JsonResponse
    {
        $totalTeachers = DB::table('users')
            ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->where('roles.name', 'müəllim')
            ->where('model_has_roles.model_type', 'App\\Models\\User')
            ->count();

        $totalHoursAssigned = DB::table('teaching_loads')->sum('weekly_hours');

        $overloadedTeachers = DB::table('teaching_loads')
            ->select('teacher_id', DB::raw('SUM(weekly_hours) as total_hours'))
            ->groupBy('teacher_id')
            ->having('total_hours', '>', 24)
            ->count();

        $averageLoadPerTeacher = $totalTeachers > 0 ? $totalHoursAssigned / $totalTeachers : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'total_teachers' => $totalTeachers,
                'overloaded_teachers' => $overloadedTeachers,
                'total_hours_assigned' => $totalHoursAssigned,
                'average_load_per_teacher' => round($averageLoadPerTeacher, 2)
            ]
        ]);
    }

    /**
     * Get teacher's assigned subjects with details
     */
    public function getTeacherSubjects(string $teacherId): JsonResponse
    {
        $teacherSubjects = DB::table('teacher_subjects')
            ->join('subjects', 'teacher_subjects.subject_id', '=', 'subjects.id')
            ->where('teacher_subjects.teacher_id', $teacherId)
            ->where('teacher_subjects.is_active', true)
            ->select([
                'teacher_subjects.id',
                'teacher_subjects.subject_id',
                'subjects.name as subject_name',
                'subjects.code as subject_code',
                'teacher_subjects.grade_levels',
                'teacher_subjects.specialization_level',
                'teacher_subjects.is_primary_subject',
                'teacher_subjects.max_hours_per_week'
            ])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $teacherSubjects
        ]);
    }
}
