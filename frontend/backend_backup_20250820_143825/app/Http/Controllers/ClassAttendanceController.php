<?php

namespace App\Http\Controllers;

use App\Models\ClassAttendance;
use App\Models\Classes;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class ClassAttendanceController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Display a listing of class attendance records
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = ClassAttendance::with([
                'class:id,name,grade_level,section,current_enrollment',
                'subject:id,name,short_name,code',
                'teacher:id,first_name,last_name,username',
                'approvedBy:id,first_name,last_name'
            ]);

            // Apply filters
            if ($request->has('class_id') && $request->class_id) {
                $query->where('class_id', $request->class_id);
            }

            if ($request->has('subject_id') && $request->subject_id) {
                $query->where('subject_id', $request->subject_id);
            }

            if ($request->has('teacher_id') && $request->teacher_id) {
                $query->where('teacher_id', $request->teacher_id);
            }

            if ($request->has('date') && $request->date) {
                $query->whereDate('attendance_date', $request->date);
            }

            if ($request->has('approval_status') && $request->approval_status) {
                $query->where('approval_status', $request->approval_status);
            }

            // Date range filter
            if ($request->has('start_date') && $request->start_date) {
                $query->whereDate('attendance_date', '>=', $request->start_date);
            }

            if ($request->has('end_date') && $request->end_date) {
                $query->whereDate('attendance_date', '<=', $request->end_date);
            }

            // Apply sorting
            $sortField = $request->get('sort_field', 'attendance_date');
            $sortDirection = $request->get('sort_direction', 'desc');
            $query->orderBy($sortField, $sortDirection);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $attendanceRecords = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $attendanceRecords->items(),
                'pagination' => [
                    'current_page' => $attendanceRecords->currentPage(),
                    'total_pages' => $attendanceRecords->lastPage(),
                    'per_page' => $attendanceRecords->perPage(),
                    'total' => $attendanceRecords->total()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Davamiyyət qeydləri yüklənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Store a newly created attendance record
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'class_id' => 'required|exists:classes,id',
            'subject_id' => 'required|exists:subjects,id',
            'attendance_date' => 'required|date',
            'period_number' => 'required|integer|min:1|max:10',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'total_students_registered' => 'required|integer|min:0',
            'students_present' => 'required|integer|min:0',
            'students_absent_excused' => 'integer|min:0',
            'students_absent_unexcused' => 'integer|min:0',
            'students_late' => 'integer|min:0',
            'lesson_status' => 'required|in:completed,cancelled,partial,substituted',
            'notes' => 'nullable|string|max:1000'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Check for duplicate attendance record
            $existingRecord = ClassAttendance::where([
                'class_id' => $request->class_id,
                'subject_id' => $request->subject_id,
                'attendance_date' => $request->attendance_date,
                'period_number' => $request->period_number
            ])->first();

            if ($existingRecord) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu tarix və dərs üçün artıq davamiyyət qeydi mövcuddur'
                ], 409);
            }

            // Validate attendance numbers
            $totalAccounted = $request->students_present + 
                            $request->students_absent_excused + 
                            $request->students_absent_unexcused;

            if ($totalAccounted > $request->total_students_registered) {
                return response()->json([
                    'success' => false,
                    'message' => 'İştirak edən və qayıb şagirdlərin cəmi qeydiyyatlı şagird sayından çox ola bilməz'
                ], 422);
            }

            $attendanceData = $validator->validated();
            $attendanceData['teacher_id'] = Auth::id();
            $attendanceData['approval_status'] = 'pending';

            // Add metadata
            $attendanceData['attendance_metadata'] = json_encode([
                'created_by_ip' => $request->ip(),
                'created_by_user_agent' => $request->userAgent(),
                'total_accounted' => $totalAccounted,
                'attendance_percentage' => $request->total_students_registered > 0 ? 
                    round(($request->students_present / $request->total_students_registered) * 100, 2) : 0
            ]);

            $attendance = ClassAttendance::create($attendanceData);

            $attendance->load([
                'class:id,name,grade_level,section',
                'subject:id,name,short_name,code',
                'teacher:id,first_name,last_name'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Davamiyyət qeydi uğurla yaradıldı',
                'data' => $attendance
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Davamiyyət qeydi yaradılarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Display the specified attendance record
     */
    public function show(ClassAttendance $classAttendance): JsonResponse
    {
        try {
            $classAttendance->load([
                'class:id,name,grade_level,section,current_enrollment,classroom_location',
                'subject:id,name,short_name,code,default_weekly_hours',
                'teacher:id,first_name,last_name,username',
                'approvedBy:id,first_name,last_name'
            ]);

            return response()->json([
                'success' => true,
                'data' => $classAttendance
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Davamiyyət qeydi yüklənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Update the specified attendance record
     */
    public function update(Request $request, ClassAttendance $classAttendance): JsonResponse
    {
        // Check if user can edit this record
        if ($classAttendance->approval_status === 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Təsdiqlənmiş davamiyyət qeydini dəyişmək mümkün deyil'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'class_id' => 'sometimes|required|exists:classes,id',
            'subject_id' => 'sometimes|required|exists:subjects,id',
            'attendance_date' => 'sometimes|required|date',
            'period_number' => 'sometimes|required|integer|min:1|max:10',
            'start_time' => 'sometimes|required|date_format:H:i',
            'end_time' => 'sometimes|required|date_format:H:i|after:start_time',
            'total_students_registered' => 'sometimes|required|integer|min:0',
            'students_present' => 'sometimes|required|integer|min:0',
            'students_absent_excused' => 'sometimes|integer|min:0',
            'students_absent_unexcused' => 'sometimes|integer|min:0',
            'students_late' => 'sometimes|integer|min:0',
            'lesson_status' => 'sometimes|required|in:completed,cancelled,partial,substituted',
            'notes' => 'nullable|string|max:1000'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $validatedData = $validator->validated();

            // Validate attendance numbers if provided
            if (isset($validatedData['students_present']) || 
                isset($validatedData['students_absent_excused']) || 
                isset($validatedData['students_absent_unexcused']) ||
                isset($validatedData['total_students_registered'])) {
                
                $present = $validatedData['students_present'] ?? $classAttendance->students_present;
                $excused = $validatedData['students_absent_excused'] ?? $classAttendance->students_absent_excused;
                $unexcused = $validatedData['students_absent_unexcused'] ?? $classAttendance->students_absent_unexcused;
                $total = $validatedData['total_students_registered'] ?? $classAttendance->total_students_registered;

                if (($present + $excused + $unexcused) > $total) {
                    return response()->json([
                        'success' => false,
                        'message' => 'İştirak edən və qayıb şagirdlərin cəmi qeydiyyatlı şagird sayından çox ola bilməz'
                    ], 422);
                }
            }

            // Check for duplicate if key fields are being changed
            if (isset($validatedData['class_id']) || 
                isset($validatedData['subject_id']) || 
                isset($validatedData['attendance_date']) || 
                isset($validatedData['period_number'])) {
                
                $checkFields = [
                    'class_id' => $validatedData['class_id'] ?? $classAttendance->class_id,
                    'subject_id' => $validatedData['subject_id'] ?? $classAttendance->subject_id,
                    'attendance_date' => $validatedData['attendance_date'] ?? $classAttendance->attendance_date,
                    'period_number' => $validatedData['period_number'] ?? $classAttendance->period_number
                ];

                $existingRecord = ClassAttendance::where($checkFields)
                    ->where('id', '!=', $classAttendance->id)
                    ->first();

                if ($existingRecord) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu tarix və dərs üçün artıq davamiyyət qeydi mövcuddur'
                    ], 409);
                }
            }

            // Reset approval status if significant changes are made
            if (isset($validatedData['students_present']) || 
                isset($validatedData['students_absent_excused']) || 
                isset($validatedData['students_absent_unexcused'])) {
                $validatedData['approval_status'] = 'pending';
                $validatedData['approved_by'] = null;
                $validatedData['approved_at'] = null;
            }

            $classAttendance->update($validatedData);

            $classAttendance->load([
                'class:id,name,grade_level,section',
                'subject:id,name,short_name,code',
                'teacher:id,first_name,last_name'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Davamiyyət qeydi uğurla yeniləndi',
                'data' => $classAttendance
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Davamiyyət qeydi yenilənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Remove the specified attendance record
     */
    public function destroy(ClassAttendance $classAttendance): JsonResponse
    {
        try {
            // Check if user can delete this record
            if ($classAttendance->approval_status === 'approved') {
                return response()->json([
                    'success' => false,
                    'message' => 'Təsdiqlənmiş davamiyyət qeydini silmək mümkün deyil'
                ], 403);
            }

            $classAttendance->delete();

            return response()->json([
                'success' => true,
                'message' => 'Davamiyyət qeydi uğurla silindi'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Davamiyyət qeydi silinərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get attendance statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        try {
            $query = ClassAttendance::query();

            // Apply filters
            if ($request->has('class_id') && $request->class_id) {
                $query->where('class_id', $request->class_id);
            }

            if ($request->has('subject_id') && $request->subject_id) {
                $query->where('subject_id', $request->subject_id);
            }

            if ($request->has('teacher_id') && $request->teacher_id) {
                $query->where('teacher_id', $request->teacher_id);
            }

            // Date range
            $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $endDate = $request->get('end_date', Carbon::now()->endOfMonth()->format('Y-m-d'));
            
            $query->whereBetween('attendance_date', [$startDate, $endDate]);

            $records = $query->get();

            $statistics = [
                'total_lessons' => $records->count(),
                'total_students_registered' => $records->sum('total_students_registered'),
                'total_students_present' => $records->sum('students_present'),
                'total_absent_excused' => $records->sum('students_absent_excused'),
                'total_absent_unexcused' => $records->sum('students_absent_unexcused'),
                'total_late' => $records->sum('students_late'),
                'avg_attendance_rate' => 0,
                'lessons_by_status' => [
                    'completed' => $records->where('lesson_status', 'completed')->count(),
                    'cancelled' => $records->where('lesson_status', 'cancelled')->count(),
                    'partial' => $records->where('lesson_status', 'partial')->count(),
                    'substituted' => $records->where('lesson_status', 'substituted')->count()
                ],
                'approval_status' => [
                    'pending' => $records->where('approval_status', 'pending')->count(),
                    'approved' => $records->where('approval_status', 'approved')->count(),
                    'rejected' => $records->where('approval_status', 'rejected')->count(),
                    'needs_review' => $records->where('approval_status', 'needs_review')->count()
                ]
            ];

            // Calculate average attendance rate
            if ($statistics['total_students_registered'] > 0) {
                $statistics['avg_attendance_rate'] = round(
                    ($statistics['total_students_present'] / $statistics['total_students_registered']) * 100, 
                    2
                );
            }

            // Daily breakdown
            $dailyStats = $records->groupBy('attendance_date')->map(function ($dayRecords, $date) {
                return [
                    'date' => $date,
                    'lessons' => $dayRecords->count(),
                    'total_registered' => $dayRecords->sum('total_students_registered'),
                    'total_present' => $dayRecords->sum('students_present'),
                    'attendance_rate' => $dayRecords->sum('total_students_registered') > 0 ? 
                        round(($dayRecords->sum('students_present') / $dayRecords->sum('total_students_registered')) * 100, 2) : 0
                ];
            })->values();

            $statistics['daily_breakdown'] = $dailyStats;

            return response()->json([
                'success' => true,
                'data' => $statistics,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Statistikalar hesablanarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Approve attendance record
     */
    public function approve(Request $request, ClassAttendance $classAttendance): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'approval_status' => 'required|in:approved,rejected,needs_review',
            'comments' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $classAttendance->update([
                'approval_status' => $request->approval_status,
                'approved_by' => Auth::id(),
                'approved_at' => now()
            ]);

            $message = match($request->approval_status) {
                'approved' => 'Davamiyyət qeydi təsdiqləndi',
                'rejected' => 'Davamiyyət qeydi rədd edildi',
                'needs_review' => 'Davamiyyət qeydi yenidən baxış üçün işarələndi'
            };

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $classAttendance->fresh([
                    'class:id,name,grade_level,section',
                    'subject:id,name,short_name,code',
                    'teacher:id,first_name,last_name',
                    'approvedBy:id,first_name,last_name'
                ])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Təsdiq əməliyyatı yerinə yetirilərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Bulk operations
     */
    public function bulkAction(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'action' => 'required|in:approve,reject,delete',
            'attendance_ids' => 'required|array|min:1',
            'attendance_ids.*' => 'integer|exists:class_attendance,id',
            'comments' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $attendanceRecords = ClassAttendance::whereIn('id', $request->attendance_ids)->get();
            $processedCount = 0;
            $errorCount = 0;

            foreach ($attendanceRecords as $record) {
                try {
                    switch ($request->action) {
                        case 'approve':
                            if ($record->approval_status !== 'approved') {
                                $record->update([
                                    'approval_status' => 'approved',
                                    'approved_by' => Auth::id(),
                                    'approved_at' => now()
                                ]);
                                $processedCount++;
                            }
                            break;

                        case 'reject':
                            if ($record->approval_status !== 'rejected') {
                                $record->update([
                                    'approval_status' => 'rejected',
                                    'approved_by' => Auth::id(),
                                    'approved_at' => now()
                                ]);
                                $processedCount++;
                            }
                            break;

                        case 'delete':
                            if ($record->approval_status !== 'approved') {
                                $record->delete();
                                $processedCount++;
                            } else {
                                $errorCount++;
                            }
                            break;
                    }
                } catch (\Exception $e) {
                    $errorCount++;
                }
            }

            $message = "Toplu əməliyyat tamamlandı. {$processedCount} qeyd emal edildi.";
            if ($errorCount > 0) {
                $message .= " {$errorCount} qeydi emal edilə bilmədi.";
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'processed_count' => $processedCount,
                'error_count' => $errorCount
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Toplu əməliyyat yerinə yetirilərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}