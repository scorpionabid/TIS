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
        $institutionId = $request->user()->institution_id;
        
        $teachingLoads = DB::table('teaching_loads')
            ->join('users', 'teaching_loads.teacher_id', '=', 'users.id')
            ->join('subjects', 'teaching_loads.subject_id', '=', 'subjects.id')
            ->join('classes', 'teaching_loads.class_id', '=', 'classes.id')
            ->where('classes.institution_id', $institutionId)
            ->select([
                'teaching_loads.*',
                'users.full_name as teacher_name',
                'subjects.name as subject_name',
                'classes.name as class_name'
            ])
            ->orderBy('users.full_name')
            ->get();

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
            'hours_per_week' => 'required|numeric|min:1|max:40',
            'academic_year_id' => 'required|exists:academic_years,id'
        ]);

        $teachingLoadId = DB::table('teaching_loads')->insertGetId(array_merge($validated, [
            'created_at' => now(),
            'updated_at' => now()
        ]));

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

        $totalHours = $workload->sum('hours_per_week');
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
            'hours_per_week' => 'required|numeric|min:1|max:40'
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
}
