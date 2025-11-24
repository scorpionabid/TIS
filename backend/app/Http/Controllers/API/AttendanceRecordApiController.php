<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\BaseController;
use App\Models\AttendanceRecord;
use App\Models\DailyAttendanceSummary;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AttendanceRecordApiController extends BaseController
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Display a listing of attendance records
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = AttendanceRecord::with([
                'student:id,first_name,last_name,student_number',
                'subject:id,name,code',
                'teacher:id,first_name,last_name',
                'academicYear:id,name,start_date,end_date',
                'academicTerm:id,name',
            ]);

            // Apply filters
            if ($request->has('student_id')) {
                $query->where('student_id', $request->student_id);
            }

            if ($request->has('subject_id')) {
                $query->where('subject_id', $request->subject_id);
            }

            if ($request->has('teacher_id')) {
                $query->where('teacher_id', $request->teacher_id);
            }

            if ($request->has('class_id')) {
                // Get students in the class and filter by them
                $students = User::whereHas('grades', function ($q) use ($request) {
                    $q->where('id', $request->class_id);
                })->pluck('id');
                $query->whereIn('student_id', $students);
            }

            if ($request->has('date')) {
                $query->whereDate('attendance_date', $request->date);
            }

            if ($request->has('start_date')) {
                $query->whereDate('attendance_date', '>=', $request->start_date);
            }

            if ($request->has('end_date')) {
                $query->whereDate('attendance_date', '<=', $request->end_date);
            }

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Apply user-based filtering
            $this->applyUserFiltering($query, Auth::user());

            // Sorting
            $sortField = $request->get('sort_field', 'attendance_date');
            $sortDirection = $request->get('sort_direction', 'desc');
            $query->orderBy($sortField, $sortDirection);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $records = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $records->items(),
                'meta' => [
                    'current_page' => $records->currentPage(),
                    'last_page' => $records->lastPage(),
                    'per_page' => $records->perPage(),
                    'total' => $records->total(),
                    'from' => $records->firstItem(),
                    'to' => $records->lastItem(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Davamiyyət qeydləri alınarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Store a new attendance record
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:users,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'teacher_id' => 'required|exists:users,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'academic_term_id' => 'nullable|exists:academic_terms,id',
            'attendance_date' => 'required|date|before_or_equal:today',
            'period_number' => 'nullable|integer|min:1|max:10',
            'period_start_time' => 'nullable|date_format:H:i',
            'period_end_time' => 'nullable|date_format:H:i|after:period_start_time',
            'status' => 'required|in:present,absent,late,excused,medical,authorized,suspended,early_dismissal',
            'arrival_time' => 'nullable|date_format:H:i',
            'departure_time' => 'nullable|date_format:H:i|after:arrival_time',
            'recording_method' => 'nullable|in:manual,rfid_card,biometric,qr_code,mobile_app,automated',
            'absence_reason' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Check for duplicate record
            $existing = AttendanceRecord::where([
                'student_id' => $request->student_id,
                'subject_id' => $request->subject_id,
                'attendance_date' => $request->attendance_date,
                'period_number' => $request->period_number ?? 1,
            ])->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu şagird və dərs üçün artıq davamiyyət qeydi mövcuddur',
                ], 409);
            }

            $recordData = $validator->validated();
            $recordData['recorded_by'] = Auth::id();
            $recordData['recording_method'] = $recordData['recording_method'] ?? 'manual';

            // Calculate timing details
            if ($request->arrival_time && $request->period_start_time) {
                $startTime = Carbon::parse($request->period_start_time);
                $arrivalTime = Carbon::parse($request->arrival_time);
                if ($arrivalTime->greaterThan($startTime)) {
                    $recordData['minutes_late'] = $arrivalTime->diffInMinutes($startTime);
                }
            }

            $record = AttendanceRecord::create($recordData);
            $record->load([
                'student:id,first_name,last_name,student_number',
                'subject:id,name,code',
                'teacher:id,first_name,last_name',
            ]);

            // Trigger daily summary update
            $this->updateDailySummary($record->student_id, $record->attendance_date);

            return response()->json([
                'success' => true,
                'message' => 'Davamiyyət qeydi yaradıldı',
                'data' => $record,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Davamiyyət qeydi yaradılarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Bulk create attendance records for a class
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'class_id' => 'required|exists:grades,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'teacher_id' => 'required|exists:users,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'academic_term_id' => 'nullable|exists:academic_terms,id',
            'attendance_date' => 'required|date|before_or_equal:today',
            'period_number' => 'nullable|integer|min:1|max:10',
            'period_start_time' => 'nullable|date_format:H:i',
            'period_end_time' => 'nullable|date_format:H:i|after:period_start_time',
            'attendance_records' => 'required|array|min:1',
            'attendance_records.*.student_id' => 'required|exists:users,id',
            'attendance_records.*.status' => 'required|in:present,absent,late,excused,medical,authorized,suspended,early_dismissal',
            'attendance_records.*.arrival_time' => 'nullable|date_format:H:i',
            'attendance_records.*.departure_time' => 'nullable|date_format:H:i',
            'attendance_records.*.notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $created = 0;
            $updated = 0;
            $errors = [];

            DB::transaction(function () use ($request, &$created, &$updated, &$errors) {
                foreach ($request->attendance_records as $index => $attendanceData) {
                    try {
                        $recordData = [
                            'student_id' => $attendanceData['student_id'],
                            'subject_id' => $request->subject_id,
                            'teacher_id' => $request->teacher_id,
                            'academic_year_id' => $request->academic_year_id,
                            'academic_term_id' => $request->academic_term_id,
                            'attendance_date' => $request->attendance_date,
                            'period_number' => $request->period_number ?? 1,
                            'period_start_time' => $request->period_start_time,
                            'period_end_time' => $request->period_end_time,
                            'status' => $attendanceData['status'],
                            'arrival_time' => $attendanceData['arrival_time'] ?? null,
                            'departure_time' => $attendanceData['departure_time'] ?? null,
                            'notes' => $attendanceData['notes'] ?? null,
                            'recorded_by' => Auth::id(),
                            'recording_method' => 'manual',
                        ];

                        // Calculate timing
                        if ($attendanceData['arrival_time'] && $request->period_start_time) {
                            $startTime = Carbon::parse($request->period_start_time);
                            $arrivalTime = Carbon::parse($attendanceData['arrival_time']);
                            if ($arrivalTime->greaterThan($startTime)) {
                                $recordData['minutes_late'] = $arrivalTime->diffInMinutes($startTime);
                            }
                        }

                        // Try to find existing record
                        $existing = AttendanceRecord::where([
                            'student_id' => $attendanceData['student_id'],
                            'subject_id' => $request->subject_id,
                            'attendance_date' => $request->attendance_date,
                            'period_number' => $request->period_number ?? 1,
                        ])->first();

                        if ($existing) {
                            $existing->update($recordData);
                            $updated++;
                        } else {
                            AttendanceRecord::create($recordData);
                            $created++;
                        }

                        // Update daily summary for this student
                        $this->updateDailySummary($attendanceData['student_id'], $request->attendance_date);
                    } catch (\Exception $e) {
                        $errors[] = [
                            'student_id' => $attendanceData['student_id'],
                            'error' => $e->getMessage(),
                        ];
                    }
                }
            });

            return response()->json([
                'success' => true,
                'message' => "Davamiyyət qeydləri: {$created} yaradıldı, {$updated} yeniləndi",
                'data' => [
                    'created_count' => $created,
                    'updated_count' => $updated,
                    'error_count' => count($errors),
                    'errors' => $errors,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Toplu davamiyyət qeydi yaradılarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Display the specified attendance record
     */
    public function show(AttendanceRecord $attendanceRecord): JsonResponse
    {
        try {
            $attendanceRecord->load([
                'student:id,first_name,last_name,student_number',
                'student.profile',
                'subject:id,name,code,description',
                'teacher:id,first_name,last_name',
                'academicYear:id,name,start_date,end_date',
                'academicTerm:id,name',
                'recordedBy:id,first_name,last_name',
                'approvedBy:id,first_name,last_name',
            ]);

            return response()->json([
                'success' => true,
                'data' => $attendanceRecord,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Davamiyyət qeydi yüklənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Update attendance record
     */
    public function update(Request $request, AttendanceRecord $attendanceRecord): JsonResponse
    {
        // Check if user can edit this record
        if ($attendanceRecord->isApproved()) {
            return response()->json([
                'success' => false,
                'message' => 'Təsdiqlənmiş davamiyyət qeydini dəyişmək olmaz',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'sometimes|in:present,absent,late,excused,medical,authorized,suspended,early_dismissal',
            'arrival_time' => 'nullable|date_format:H:i',
            'departure_time' => 'nullable|date_format:H:i|after:arrival_time',
            'absence_reason' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $updateData = $validator->validated();

            // Recalculate timing if needed
            if (isset($updateData['arrival_time']) && $attendanceRecord->period_start_time) {
                $startTime = Carbon::parse($attendanceRecord->period_start_time);
                $arrivalTime = Carbon::parse($updateData['arrival_time']);
                if ($arrivalTime->greaterThan($startTime)) {
                    $updateData['minutes_late'] = $arrivalTime->diffInMinutes($startTime);
                } else {
                    $updateData['minutes_late'] = 0;
                }
            }

            $attendanceRecord->update($updateData);

            // Update daily summary
            $this->updateDailySummary($attendanceRecord->student_id, $attendanceRecord->attendance_date);

            return response()->json([
                'success' => true,
                'message' => 'Davamiyyət qeydi yeniləndi',
                'data' => $attendanceRecord->fresh([
                    'student:id,first_name,last_name',
                    'subject:id,name,code',
                    'teacher:id,first_name,last_name',
                ]),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Davamiyyət qeydi yenilənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Remove attendance record
     */
    public function destroy(AttendanceRecord $attendanceRecord): JsonResponse
    {
        try {
            if ($attendanceRecord->isApproved()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Təsdiqlənmiş davamiyyət qeydini silmək olmaz',
                ], 403);
            }

            $studentId = $attendanceRecord->student_id;
            $date = $attendanceRecord->attendance_date;

            $attendanceRecord->delete();

            // Update daily summary
            $this->updateDailySummary($studentId, $date);

            return response()->json([
                'success' => true,
                'message' => 'Davamiyyət qeydi silindi',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Davamiyyət qeydi silinərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get attendance statistics for a class/period
     */
    public function getClassStatistics(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'class_id' => 'required|exists:grades,id',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'subject_id' => 'nullable|exists:subjects,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Get students in class
            $students = User::whereHas('grades', function ($q) use ($request) {
                $q->where('id', $request->class_id);
            })->pluck('id');

            $query = AttendanceRecord::whereIn('student_id', $students)
                ->whereBetween('attendance_date', [$request->start_date, $request->end_date]);

            if ($request->subject_id) {
                $query->where('subject_id', $request->subject_id);
            }

            $records = $query->get();

            $statistics = [
                'total_records' => $records->count(),
                'total_students' => $students->count(),
                'present_count' => $records->where('status', 'present')->count(),
                'absent_count' => $records->where('status', 'absent')->count(),
                'late_count' => $records->where('status', 'late')->count(),
                'excused_count' => $records->whereIn('status', ['excused', 'medical', 'authorized'])->count(),
                'attendance_rate' => 0,
            ];

            if ($statistics['total_records'] > 0) {
                $statistics['attendance_rate'] = round(
                    ($statistics['present_count'] / $statistics['total_records']) * 100, 2
                );
            }

            return response()->json([
                'success' => true,
                'data' => $statistics,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Statistikalar alınarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Apply user-based filtering
     */
    private function applyUserFiltering($query, $user): void
    {
        $userRole = $user->roles->first()?->name;

        switch ($userRole) {
            case 'superadmin':
                // SuperAdmin sees all
                break;

            case 'regionadmin':
            case 'sektoradmin':
                // Filter by institution hierarchy
                $userInstitution = $user->institution;
                if ($userInstitution) {
                    $institutionIds = [$userInstitution->id];
                    // Add child institutions
                    $childInstitutions = \App\Models\Institution::where('parent_id', $userInstitution->id)
                        ->pluck('id')->toArray();
                    $institutionIds = array_merge($institutionIds, $childInstitutions);

                    // Filter by students in these institutions
                    $studentIds = User::whereIn('institution_id', $institutionIds)->pluck('id');
                    $query->whereIn('student_id', $studentIds);
                }
                break;

            case 'schooladmin':
            case 'müəllim':
                // Filter by school
                if ($user->institution_id) {
                    $studentIds = User::where('institution_id', $user->institution_id)->pluck('id');
                    $query->whereIn('student_id', $studentIds);
                }

                // Teachers see only their subjects
                if ($userRole === 'müəllim') {
                    $query->where('teacher_id', $user->id);
                }
                break;

            default:
                $query->where('id', -1); // No access
                break;
        }
    }

    /**
     * Update daily summary for a student
     */
    private function updateDailySummary(int $studentId, string $date): void
    {
        try {
            // This will trigger the generation or update of daily summary
            DailyAttendanceSummary::generateDailySummary($studentId, Carbon::parse($date));
        } catch (\Exception $e) {
            // Log the error but don't fail the main operation
            \Log::warning("Failed to update daily summary for student {$studentId} on {$date}: " . $e->getMessage());
        }
    }
}
