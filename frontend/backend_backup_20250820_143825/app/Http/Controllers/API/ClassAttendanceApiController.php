<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ClassAttendanceApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $institutionId = $request->user()->institution_id;
        
        $attendanceData = DB::table('class_attendance')
            ->join('classes', 'class_attendance.class_id', '=', 'classes.id')
            ->where('classes.institution_id', $institutionId)
            ->whereDate('class_attendance.attendance_date', Carbon::today())
            ->select([
                'classes.name as class_name',
                'class_attendance.*'
            ])
            ->get();
            
        return response()->json([
            'success' => true,
            'data' => $attendanceData
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'class_id' => 'required|exists:classes,id',
            'subject_id' => 'required|exists:subjects,id',
            'teacher_id' => 'required|exists:users,id',
            'attendance_date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
            'total_students_registered' => 'required|integer|min:0',
            'students_present' => 'required|integer|min:0',
            'students_absent_excused' => 'nullable|integer|min:0',
            'students_absent_unexcused' => 'nullable|integer|min:0',
            'students_late' => 'nullable|integer|min:0',
            'lesson_status' => 'nullable|in:completed,cancelled,partial,substituted',
            'notes' => 'nullable|string'
        ]);

        $attendance = DB::table('class_attendance')->updateOrInsert(
            [
                'class_id' => $validated['class_id'],
                'subject_id' => $validated['subject_id'],
                'attendance_date' => $validated['attendance_date'],
                'period_number' => $request->input('period_number', 1)
            ],
            array_merge($validated, [
                'period_number' => $request->input('period_number', 1),
                'lesson_status' => $validated['lesson_status'] ?? 'completed',
                'approval_status' => 'pending',
                'updated_at' => now(),
                'created_at' => now()
            ])
        );

        return response()->json([
            'success' => true,
            'message' => 'Attendance updated successfully'
        ]);
    }

    public function getClassStats(Request $request): JsonResponse
    {
        $institutionId = $request->user()->institution_id;
        
        $stats = DB::table('classes')
            ->leftJoin('class_attendance', function($join) {
                $join->on('classes.id', '=', 'class_attendance.class_id')
                     ->whereDate('class_attendance.attendance_date', Carbon::today());
            })
            ->where('classes.institution_id', $institutionId)
            ->select([
                'classes.id',
                'classes.name',
                'classes.max_capacity as capacity',
                'classes.current_enrollment',
                DB::raw('COALESCE(SUM(class_attendance.students_present), 0) as total_present'),
                DB::raw('COALESCE(SUM(class_attendance.students_absent_excused), 0) as total_absent_excused'),
                DB::raw('COALESCE(SUM(class_attendance.students_absent_unexcused), 0) as total_absent_unexcused')
            ])
            ->groupBy('classes.id', 'classes.name', 'classes.max_capacity', 'classes.current_enrollment')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    public function show(string $classId): JsonResponse
    {
        $attendance = DB::table('class_attendance')
            ->join('classes', 'class_attendance.class_id', '=', 'classes.id')
            ->where('class_attendance.class_id', $classId)
            ->orderBy('class_attendance.attendance_date', 'desc')
            ->limit(30)
            ->select([
                'class_attendance.*',
                'classes.name as class_name'
            ])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $attendance
        ]);
    }
}
