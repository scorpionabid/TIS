<?php

namespace App\Http\Controllers\School;

use App\Http\Controllers\BaseController;
use App\Models\AcademicYear;
use App\Models\ClassBulkAttendance;
use App\Models\Grade;
use App\Services\Attendance\BulkAttendanceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class BulkAttendanceController extends BaseController
{
    protected $attendanceService;

    public function __construct(BulkAttendanceService $attendanceService)
    {
        $this->attendanceService = $attendanceService;
    }

    /**
     * Get all classes for bulk attendance entry
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;
            if (! $school) return response()->json(['error' => 'Məktəb tapılmadı'], 400);

            $date = $request->get('date', now()->format('Y-m-d'));
            $academicYear = $this->resolveAcademicYear();

            if (! $academicYear) {
                return response()->json(['success' => false, 'error' => 'Aktiv tədris ili tapılmadı.'], 422);
            }

            $classes = Grade::with(['homeroomTeacher', 'room'])
                ->byInstitution($school->id)
                ->active()
                ->orderBy('class_level')
                ->orderBy('name')
                ->get();

            $existingRecords = ClassBulkAttendance::whereIn('grade_id', $classes->pluck('id'))
                ->where('attendance_date', $date)
                ->get()
                ->keyBy('grade_id');

            $classesData = $classes->map(function ($class) use ($existingRecords) {
                $record = $existingRecords->get($class->id);
                return [
                    'id' => $class->id,
                    'name' => $class->name,
                    'level' => $class->class_level,
                    'total_students' => (int) ($class->student_count ?? 0),
                    'attendance' => $record ? [
                        'morning_present' => (int) $record->morning_present,
                        'morning_excused' => (int) $record->morning_excused,
                        'morning_unexcused' => (int) $record->morning_unexcused,
                        'evening_present' => (int) $record->evening_present,
                        'evening_excused' => (int) $record->evening_excused,
                        'evening_unexcused' => (int) $record->evening_unexcused,
                        'uniform_violation' => (int) $record->uniform_violation,
                        'morning_notes' => $record->morning_notes,
                        'evening_notes' => $record->evening_notes,
                        'morning_recorded_at' => $record->morning_recorded_at,
                        'evening_recorded_at' => $record->evening_recorded_at,
                        'is_complete' => $record->is_complete,
                        'morning_attendance_rate' => $record->morning_attendance_rate,
                        'evening_attendance_rate' => $record->evening_attendance_rate,
                        'daily_attendance_rate' => $record->daily_attendance_rate,
                    ] : null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => ['classes' => $classesData, 'date' => $date, 'academic_year' => $academicYear],
            ]);
        } catch (\Exception $e) {
            Log::error('Bulk attendance index error: ' . $e->getMessage());
            return response()->json(['error' => 'Səhv baş verdi'], 500);
        }
    }

    /**
     * Store or update bulk attendance data
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'attendance_date' => 'required|date',
                'academic_year_id' => 'required|exists:academic_years,id',
                'classes' => 'required|array',
                'classes.*.grade_id' => 'required|exists:grades,id',
                'classes.*.session' => 'required|in:morning,evening,both',
            ]);

            if ($validator->fails()) {
                return response()->json(['error' => $validator->errors()->first()], 400);
            }

            $result = $this->attendanceService->storeAttendance(Auth::user(), $request->all());

            $status = count($result['saved']) > 0 ? (count($result['errors']) > 0 ? 'partial' : 'completed') : 'failed';
            $httpStatus = $status === 'completed' ? 200 : 207;

            return response()->json([
                'success' => $status === 'completed',
                'status' => $status,
                'data' => $result,
            ], $httpStatus);
        } catch (\Exception $e) {
            Log::error('Bulk attendance store error: ' . $e->getMessage());
            return response()->json(['error' => 'Səhv baş verdi: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Resolve the academic year for attendance operations.
     */
    private function resolveAcademicYear(): ?AcademicYear
    {
        return AcademicYear::current()->first() ?? AcademicYear::active()->orderByDesc('start_date')->first();
    }
}
