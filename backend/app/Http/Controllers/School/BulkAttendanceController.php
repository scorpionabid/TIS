<?php

namespace App\Http\Controllers\School;

use App\Http\Controllers\BaseController;
use App\Models\AcademicYear;
use App\Models\ClassBulkAttendance;
use App\Models\Grade;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class BulkAttendanceController extends BaseController
{
    /**
     * Get all classes for bulk attendance entry
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (! $school) {
                return response()->json(['error' => 'Məktəb məlumatları tapılmadı'], 400);
            }

            $date = $request->get('date', now()->format('Y-m-d'));
            $academicYear = $this->resolveAcademicYear();

            if (! $academicYear) {
                Log::warning('Bulk attendance requested without academic year', [
                    'user_id' => $user->id,
                    'school_id' => $school->id,
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Aktiv tədris ili tapılmadı. Zəhmət olmasa tədris ili yaradın və ya aktivləşdirin.',
                ], 422);
            }

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
            $classesData = $classes->map(function ($class) use ($existingRecords) {
                $studentCount = (int) ($class->student_count ?? 0);
                $requiresStudentCount = $studentCount <= 0;
                $existingRecord = $existingRecords->get($class->id);

                return [
                    'id' => $class->id,
                    'name' => $class->name,
                    'level' => $class->class_level,
                    'description' => $class->description,
                    'total_students' => $studentCount,
                    'requires_student_count' => $requiresStudentCount,
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
                    ] : null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'classes' => $classesData,
                    'date' => $date,
                    'academic_year' => [
                        'id' => $academicYear->id,
                        'name' => $academicYear->name,
                    ],
                    'school' => [
                        'id' => $school->id,
                        'name' => $school->name,
                    ],
                ],
                'message' => count($classesData) . ' sinif tapıldı',
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

            if (! $school) {
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
            $failedRecords = [];

            foreach ($request->classes as $classData) {
                // Verify class belongs to this school
                $grade = Grade::where('id', $classData['grade_id'])
                    ->where('institution_id', $school->id)
                    ->first();

                if (! $grade) {
                    continue; // Skip classes not belonging to this school
                }

                $studentCount = (int) ($grade->student_count ?? 0);
                if ($studentCount <= 0) {
                    $failedRecords[] = [
                        'grade_id' => $grade->id,
                        'grade_name' => $grade->name,
                        'reason' => 'Sinif üçün şagird sayı təyin edilməyib',
                        'type' => 'missing_student_count',
                    ];

                    continue;
                }

                // Get or create record
                $record = ClassBulkAttendance::getOrCreate(
                    $grade->id,
                    $attendanceDate,
                    $academicYear->id,
                    $user->id
                );

                // Ensure total students is up to date
                if ($record->total_students !== $studentCount) {
                    $record->total_students = $studentCount;
                }

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
                if (! $record->isValidAttendanceCount()) {
                    $failedRecords[] = [
                        'grade_id' => $grade->id,
                        'grade_name' => $grade->name,
                        'reason' => 'Ümumi işarələnən şagird sayı sinifdəki şagird sayından çoxdur',
                        'type' => 'invalid_totals',
                        'details' => [
                            'total_students' => $record->total_students,
                            'morning_total' => $record->morning_present + $record->morning_excused + $record->morning_unexcused,
                            'evening_total' => $record->evening_present + $record->evening_excused + $record->evening_unexcused,
                        ],
                    ];

                    // Revert unsaved changes for this record to avoid persisting invalid data
                    $record->refresh();

                    continue;
                }

                // Calculate rates
                $record->updateAllRates();
                $record->save();

                $savedRecords[] = $record;
            }

            $status = match (true) {
                count($savedRecords) > 0 && count($failedRecords) === 0 => 'completed',
                count($savedRecords) > 0 && count($failedRecords) > 0 => 'partial',
                default => 'failed',
            };

            $responseMessage = match ($status) {
                'completed' => count($savedRecords) . ' sinifdə davamiyyət qeyd edildi',
                'partial' => count($savedRecords) . ' sinifdə davamiyyət saxlanıldı, ' . count($failedRecords) . ' sinifdə səhv tapıldı',
                default => 'Heç bir sinif üçün davamiyyət saxlanılmadı',
            };

            $httpStatus = $status === 'completed' ? 200 : 207;

            return response()->json([
                'success' => $status === 'completed',
                'status' => $status,
                'message' => $responseMessage,
                'data' => [
                    'saved' => collect($savedRecords)->map(function ($record) {
                        return [
                            'id' => $record->id,
                            'grade_id' => $record->grade_id,
                            'grade_name' => optional($record->grade)->name,
                            'morning_attendance_rate' => $record->morning_attendance_rate,
                            'evening_attendance_rate' => $record->evening_attendance_rate,
                            'daily_attendance_rate' => $record->daily_attendance_rate,
                            'is_complete' => $record->is_complete,
                        ];
                    })->values(),
                    'errors' => $failedRecords,
                ],
            ], $httpStatus);
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

            if (! $school) {
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
                    }),
                ],
                'date' => $date,
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

            if (! $school) {
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
                    }),
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
                    ],
                ],
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

            if (! $school) {
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

            if ($records->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seçilmiş aralıq üçün davamiyyət tapılmadı',
                ], 404);
            }

            $filename = 'toplu_davamiyyet_' . $startDate . '_' . $endDate . '.csv';
            $headers = [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Cache-Control' => 'no-store, no-cache',
            ];

            $columns = [
                'Tarix',
                'Sinif',
                'Şagird sayı',
                'Səhər - Dərsdə',
                'Səhər - Üzürlü',
                'Səhər - Üzürsüz',
                'Axşam - Dərsdə',
                'Axşam - Üzürlü',
                'Axşam - Üzürsüz',
                'Səhər Davamiyyəti (%)',
                'Axşam Davamiyyəti (%)',
                'Günlük Davamiyyət (%)',
                'Tamamlanıb',
                'Qeyd edən',
            ];

            $callback = function () use ($records, $columns) {
                $handle = fopen('php://output', 'w');

                // UTF-8 BOM for Excel compatibility
                fwrite($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

                fputcsv($handle, $columns, ';');

                foreach ($records as $record) {
                    fputcsv($handle, [
                        $record->attendance_date->format('d.m.Y'),
                        optional($record->grade)->name,
                        $record->total_students,
                        $record->morning_present,
                        $record->morning_excused,
                        $record->morning_unexcused,
                        $record->evening_present,
                        $record->evening_excused,
                        $record->evening_unexcused,
                        $record->morning_attendance_rate,
                        $record->evening_attendance_rate,
                        $record->daily_attendance_rate,
                        $record->is_complete ? 'Bəli' : 'Xeyr',
                        optional($record->recordedBy)->name,
                    ], ';');
                }

                fclose($handle);
            };

            return response()->streamDownload($callback, $filename, $headers);
        } catch (\Exception $e) {
            Log::error('Export error: ' . $e->getMessage());

            return response()->json(['error' => 'Səhv baş verdi: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Resolve the academic year for attendance operations.
     */
    private function resolveAcademicYear(): ?AcademicYear
    {
        return AcademicYear::current()->first()
            ?? AcademicYear::active()->orderByDesc('start_date')->first()
            ?? AcademicYear::orderByDesc('start_date')->first();
    }
}
