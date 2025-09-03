<?php

namespace App\Http\Controllers\School;

use App\Http\Controllers\Controller;
use App\Models\ClassBulkAttendance;
use App\Models\Grade;
use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class BulkAttendanceController extends Controller
{
    /**
     * Get all classes for bulk attendance entry
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (!$school) {
                return response()->json(['error' => 'Məktəb məlumatları tapılmadı'], 400);
            }

            $date = $request->get('date', now()->format('Y-m-d'));
            $academicYear = AcademicYear::current()->first();

            // Get all classes for this school
            $classes = Grade::with(['homeroomTeacher', 'room'])
                ->byInstitution($school->id)
                ->orderBy('class_level')
                ->orderBy('name')
                ->get();

            // Get existing bulk attendance records for the date
            $existingRecords = ClassBulkAttendance::whereIn('grade_id', $classes->pluck('id'))
                ->where('attendance_date', $date)
                ->get()
                ->keyBy('grade_id');

            // Transform classes data
            $classesData = $classes->map(function ($class) use ($existingRecords, $academicYear) {
                $studentCount = $class->student_count ?? 30; // Use student_count field or default to 30
                $existingRecord = $existingRecords->get($class->id);

                return [
                    'id' => $class->id,
                    'name' => $class->name,
                    'level' => $class->class_level,
                    'description' => $class->description,
                    'total_students' => $studentCount,
                    'homeroom_teacher' => $class->homeroomTeacher ? [
                        'id' => $class->homeroomTeacher->id,
                        'name' => $class->homeroomTeacher->name,
                    ] : null,
                    'room' => $class->room ? [
                        'id' => $class->room->id,
                        'name' => $class->room->name,
                        'building' => $class->room->building,
                    ] : null,
                    'attendance' => $existingRecord ? [
                        'id' => $existingRecord->id,
                        'morning_present' => $existingRecord->morning_present,
                        'morning_excused' => $existingRecord->morning_excused,
                        'morning_unexcused' => $existingRecord->morning_unexcused,
                        'evening_present' => $existingRecord->evening_present,
                        'evening_excused' => $existingRecord->evening_excused,
                        'evening_unexcused' => $existingRecord->evening_unexcused,
                        'morning_attendance_rate' => $existingRecord->morning_attendance_rate,
                        'evening_attendance_rate' => $existingRecord->evening_attendance_rate,
                        'daily_attendance_rate' => $existingRecord->daily_attendance_rate,
                        'morning_notes' => $existingRecord->morning_notes,
                        'evening_notes' => $existingRecord->evening_notes,
                        'is_complete' => $existingRecord->is_complete,
                        'morning_recorded_at' => $existingRecord->morning_recorded_at,
                        'evening_recorded_at' => $existingRecord->evening_recorded_at,
                    ] : null
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'classes' => $classesData,
                    'date' => $date,
                    'academic_year' => $academicYear ? [
                        'id' => $academicYear->id,
                        'name' => $academicYear->name,
                    ] : null,
                    'school' => [
                        'id' => $school->id,
                        'name' => $school->name,
                    ]
                ],
                'message' => count($classesData) . ' sinif tapıldı'
            ]);

        } catch (\Exception $e) {
            Log::error('Bulk attendance index error: ' . $e->getMessage());
            return response()->json(['error' => 'Səhv baş verdi: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Store or update bulk attendance data
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (!$school) {
                return response()->json(['error' => 'Məktəb məlumatları tapılmadı'], 400);
            }

            $validator = Validator::make($request->all(), [
                'attendance_date' => 'required|date',
                'academic_year_id' => 'required|exists:academic_years,id',
                'classes' => 'required|array',
                'classes.*.grade_id' => 'required|exists:grades,id',
                'classes.*.morning_present' => 'nullable|integer|min:0',
                'classes.*.morning_excused' => 'nullable|integer|min:0',
                'classes.*.morning_unexcused' => 'nullable|integer|min:0',
                'classes.*.evening_present' => 'nullable|integer|min:0',
                'classes.*.evening_excused' => 'nullable|integer|min:0',
                'classes.*.evening_unexcused' => 'nullable|integer|min:0',
                'classes.*.morning_notes' => 'nullable|string|max:500',
                'classes.*.evening_notes' => 'nullable|string|max:500',
                'classes.*.session' => 'required|in:morning,evening,both',
            ]);

            if ($validator->fails()) {
                return response()->json(['error' => $validator->errors()->first()], 400);
            }

            $attendanceDate = Carbon::parse($request->attendance_date);
            $academicYear = AcademicYear::findOrFail($request->academic_year_id);
            $savedRecords = [];

            foreach ($request->classes as $classData) {
                // Verify class belongs to this school
                $grade = Grade::where('id', $classData['grade_id'])
                    ->where('institution_id', $school->id)
                    ->first();

                if (!$grade) {
                    continue; // Skip classes not belonging to this school
                }

                // Get or create record
                $record = ClassBulkAttendance::getOrCreate(
                    $grade->id,
                    $attendanceDate,
                    $academicYear->id,
                    $user->id
                );

                // Update the record based on session
                $session = $classData['session'];
                $now = now();

                if ($session === 'morning' || $session === 'both') {
                    $record->morning_present = $classData['morning_present'] ?? 0;
                    $record->morning_excused = $classData['morning_excused'] ?? 0;
                    $record->morning_unexcused = $classData['morning_unexcused'] ?? 0;
                    $record->morning_notes = $classData['morning_notes'] ?? null;
                    $record->morning_recorded_at = $now;
                }

                if ($session === 'evening' || $session === 'both') {
                    $record->evening_present = $classData['evening_present'] ?? 0;
                    $record->evening_excused = $classData['evening_excused'] ?? 0;
                    $record->evening_unexcused = $classData['evening_unexcused'] ?? 0;
                    $record->evening_notes = $classData['evening_notes'] ?? null;
                    $record->evening_recorded_at = $now;
                }

                // Update completion status
                $record->is_complete = $record->morning_recorded_at && $record->evening_recorded_at;

                // Validate counts
                if (!$record->isValidAttendanceCount()) {
                    return response()->json([
                        'error' => "Sinif {$grade->name} üçün davamiyyət sayı yanlışdır (ümumi şagird sayından çoxdur)"
                    ], 400);
                }

                // Calculate rates
                $record->updateAllRates();
                $record->save();

                $savedRecords[] = $record;
            }

            return response()->json([
                'success' => true,
                'message' => count($savedRecords) . ' sinifdə davamiyyət qeyd edildi',
                'data' => collect($savedRecords)->map(function ($record) {
                    return [
                        'id' => $record->id,
                        'grade_name' => $record->grade->name,
                        'morning_attendance_rate' => $record->morning_attendance_rate,
                        'evening_attendance_rate' => $record->evening_attendance_rate,
                        'daily_attendance_rate' => $record->daily_attendance_rate,
                        'is_complete' => $record->is_complete,
                    ];
                })
            ]);

        } catch (\Exception $e) {
            Log::error('Bulk attendance store error: ' . $e->getMessage());
            return response()->json(['error' => 'Səhv baş verdi: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get daily attendance report
     */
    public function getDailyReport(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (!$school) {
                return response()->json(['error' => 'Məktəb məlumatları tapılmadı'], 400);
            }

            $date = $request->get('date', now()->format('Y-m-d'));

            $records = ClassBulkAttendance::with(['grade', 'academicYear'])
                ->byInstitution($school->id)
                ->where('attendance_date', $date)
                ->orderBy('grade_id')
                ->get();

            $summary = [
                'total_classes' => $records->count(),
                'completed_classes' => $records->where('is_complete', true)->count(),
                'total_students' => $records->sum('total_students'),
                'morning_present_total' => $records->sum('morning_present'),
                'morning_absent_total' => $records->sum('morning_excused') + $records->sum('morning_unexcused'),
                'evening_present_total' => $records->sum('evening_present'),
                'evening_absent_total' => $records->sum('evening_excused') + $records->sum('evening_unexcused'),
                'overall_morning_rate' => $records->avg('morning_attendance_rate'),
                'overall_evening_rate' => $records->avg('evening_attendance_rate'),
                'overall_daily_rate' => $records->avg('daily_attendance_rate'),
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => $summary,
                    'classes' => $records->map(function ($record) {
                        return [
                            'grade_name' => $record->grade->name,
                            'total_students' => $record->total_students,
                            'morning_present' => $record->morning_present,
                            'morning_excused' => $record->morning_excused,
                            'morning_unexcused' => $record->morning_unexcused,
                            'evening_present' => $record->evening_present,
                            'evening_excused' => $record->evening_excused,
                            'evening_unexcused' => $record->evening_unexcused,
                            'morning_attendance_rate' => $record->morning_attendance_rate,
                            'evening_attendance_rate' => $record->evening_attendance_rate,
                            'daily_attendance_rate' => $record->daily_attendance_rate,
                            'is_complete' => $record->is_complete,
                        ];
                    })
                ],
                'date' => $date
            ]);

        } catch (\Exception $e) {
            Log::error('Daily report error: ' . $e->getMessage());
            return response()->json(['error' => 'Səhv baş verdi: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get weekly attendance summary
     */
    public function getWeeklySummary(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (!$school) {
                return response()->json(['error' => 'Məktəb məlumatları tapılmadı'], 400);
            }

            $startDate = $request->get('start_date', now()->startOfWeek()->format('Y-m-d'));
            $endDate = $request->get('end_date', now()->endOfWeek()->format('Y-m-d'));

            $records = ClassBulkAttendance::with(['grade'])
                ->byInstitution($school->id)
                ->byDateRange($startDate, $endDate)
                ->orderBy('attendance_date')
                ->get()
                ->groupBy('attendance_date');

            $dailySummaries = [];
            foreach ($records as $date => $dayRecords) {
                $dailySummaries[$date] = [
                    'date' => $date,
                    'total_classes' => $dayRecords->count(),
                    'completed_classes' => $dayRecords->where('is_complete', true)->count(),
                    'total_students' => $dayRecords->sum('total_students'),
                    'morning_present_total' => $dayRecords->sum('morning_present'),
                    'evening_present_total' => $dayRecords->sum('evening_present'),
                    'overall_daily_rate' => $dayRecords->avg('daily_attendance_rate'),
                    'classes' => $dayRecords->map(function ($record) {
                        return [
                            'grade_name' => $record->grade->name,
                            'daily_attendance_rate' => $record->daily_attendance_rate,
                            'is_complete' => $record->is_complete,
                        ];
                    })
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'summaries' => $dailySummaries,
                    'period' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                    ],
                    'school' => [
                        'id' => $school->id,
                        'name' => $school->name,
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Weekly summary error: ' . $e->getMessage());
            return response()->json(['error' => 'Səhv baş verdi: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Export bulk attendance data to CSV
     */
    public function exportData(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (!$school) {
                return response()->json(['error' => 'Məktəb məlumatları tapılmadı'], 400);
            }

            $startDate = $request->get('start_date', now()->subDays(30)->format('Y-m-d'));
            $endDate = $request->get('end_date', now()->format('Y-m-d'));

            $records = ClassBulkAttendance::with(['grade', 'recordedBy'])
                ->byInstitution($school->id)
                ->byDateRange($startDate, $endDate)
                ->orderBy('attendance_date')
                ->orderBy('grade_id')
                ->get();

            $exportData = $records->map(function ($record) {
                return [
                    'Tarix' => $record->attendance_date->format('d.m.Y'),
                    'Sinif' => $record->grade->name,
                    'Ümumi Şagird' => $record->total_students,
                    'Səhər - Dərsdə' => $record->morning_present,
                    'Səhər - Üzürlü' => $record->morning_excused,
                    'Səhər - Üzürsüz' => $record->morning_unexcused,
                    'Axşam - Dərsdə' => $record->evening_present,
                    'Axşam - Üzürlü' => $record->evening_excused,
                    'Axşam - Üzürsüz' => $record->evening_unexcused,
                    'Səhər Davamiyyəti (%)' => $record->morning_attendance_rate,
                    'Axşam Davamiyyəti (%)' => $record->evening_attendance_rate,
                    'Günlük Davamiyyət (%)' => $record->daily_attendance_rate,
                    'Tamamlanıb' => $record->is_complete ? 'Bəli' : 'Xeyr',
                    'Qeyd edən' => $record->recordedBy->name,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $exportData,
                'filename' => 'toplu_davamiyyət_' . $startDate . '_' . $endDate . '.csv'
            ]);

        } catch (\Exception $e) {
            Log::error('Export error: ' . $e->getMessage());
            return response()->json(['error' => 'Səhv baş verdi: ' . $e->getMessage()], 500);
        }
    }
}
