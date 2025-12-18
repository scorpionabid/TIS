<?php

namespace App\Http\Controllers;

use App\Models\Institution;
use App\Models\SchoolAttendance;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class SchoolAttendanceController extends BaseController
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
            $query = SchoolAttendance::with(['school:id,name,type']);

            // Apply filters
            if ($request->has('school_id') && $request->school_id) {
                $query->where('school_id', $request->school_id);
            }

            if ($request->has('class_name') && $request->class_name) {
                $query->where('class_name', $request->class_name);
            }

            if ($request->has('date') && $request->date) {
                $query->whereDate('date', $request->date);
            }

            if ($request->has('start_date') && $request->start_date) {
                $query->whereDate('date', '>=', $request->start_date);
            }

            if ($request->has('end_date') && $request->end_date) {
                $query->whereDate('date', '<=', $request->end_date);
            }

            // Apply user-based filtering
            $this->applyUserFiltering($query, Auth::user());

            // Sorting
            $sortField = $request->get('sort_field', 'date');
            $sortDirection = $request->get('sort_direction', 'desc');
            $query->orderBy($sortField, $sortDirection);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $attendanceRecords = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $attendanceRecords->items(),
                'meta' => [
                    'current_page' => $attendanceRecords->currentPage(),
                    'last_page' => $attendanceRecords->lastPage(),
                    'per_page' => $attendanceRecords->perPage(),
                    'total' => $attendanceRecords->total(),
                    'from' => $attendanceRecords->firstItem(),
                    'to' => $attendanceRecords->lastItem(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Davamiyyət qeydləri yüklənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Store a newly created attendance record
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'school_id' => 'required|exists:institutions,id',
            'class_name' => 'required|string|max:10',
            'date' => 'required|date|before_or_equal:today',
            'start_count' => 'required|integer|min:0',
            'end_count' => 'required|integer|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Validate that end_count <= start_count
            if ($request->end_count > $request->start_count) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gün sonu sayı gün əvvəli sayından çox ola bilməz',
                ], 422);
            }

            // Check for duplicate attendance record
            $existingRecord = SchoolAttendance::where([
                'school_id' => $request->school_id,
                'class_name' => $request->class_name,
                'date' => $request->date,
            ])->first();

            if ($existingRecord) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu tarix və sinif üçün artıq davamiyyət qeydi mövcuddur',
                ], 409);
            }

            $attendanceData = $validator->validated();
            $attendanceData['created_by'] = Auth::id();

            // Calculate attendance rate
            $attendanceData['attendance_rate'] = $request->start_count > 0
                ? round(($request->end_count / $request->start_count) * 100, 2)
                : 0;

            $attendance = SchoolAttendance::create($attendanceData);

            $attendance->load('school:id,name,type');

            return response()->json([
                'success' => true,
                'message' => 'Davamiyyət qeydi uğurla yaradıldı',
                'data' => $attendance,
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
     * Display the specified attendance record
     */
    public function show(SchoolAttendance $schoolAttendance): JsonResponse
    {
        try {
            $schoolAttendance->load('school:id,name,type');

            return response()->json([
                'success' => true,
                'data' => $schoolAttendance,
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
     * Update the specified attendance record
     */
    public function update(Request $request, SchoolAttendance $schoolAttendance): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'school_id' => 'sometimes|required|exists:institutions,id',
            'class_name' => 'sometimes|required|string|max:10',
            'date' => 'sometimes|required|date|before_or_equal:today',
            'start_count' => 'sometimes|required|integer|min:0',
            'end_count' => 'sometimes|required|integer|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $validatedData = $validator->validated();

            // Validate end_count <= start_count if both are provided
            $startCount = $validatedData['start_count'] ?? $schoolAttendance->start_count;
            $endCount = $validatedData['end_count'] ?? $schoolAttendance->end_count;

            if ($endCount > $startCount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gün sonu sayı gün əvvəli sayından çox ola bilməz',
                ], 422);
            }

            // Check for duplicate if key fields are being changed
            if (isset($validatedData['school_id']) ||
                isset($validatedData['class_name']) ||
                isset($validatedData['date'])) {
                $checkFields = [
                    'school_id' => $validatedData['school_id'] ?? $schoolAttendance->school_id,
                    'class_name' => $validatedData['class_name'] ?? $schoolAttendance->class_name,
                    'date' => $validatedData['date'] ?? $schoolAttendance->date,
                ];

                $existingRecord = SchoolAttendance::where($checkFields)
                    ->where('id', '!=', $schoolAttendance->id)
                    ->first();

                if ($existingRecord) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu tarix və sinif üçün artıq davamiyyət qeydi mövcuddur',
                    ], 409);
                }
            }

            // Recalculate attendance rate if counts are updated
            if (isset($validatedData['start_count']) || isset($validatedData['end_count'])) {
                $validatedData['attendance_rate'] = $startCount > 0
                    ? round(($endCount / $startCount) * 100, 2)
                    : 0;
            }

            $schoolAttendance->update($validatedData);

            $schoolAttendance->load('school:id,name,type');

            return response()->json([
                'success' => true,
                'message' => 'Davamiyyət qeydi uğurla yeniləndi',
                'data' => $schoolAttendance,
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
     * Remove the specified attendance record
     */
    public function destroy(SchoolAttendance $schoolAttendance): JsonResponse
    {
        try {
            $schoolAttendance->delete();

            return response()->json([
                'success' => true,
                'message' => 'Davamiyyət qeydi uğurla silindi',
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
     * Get attendance statistics
     */
    public function stats(Request $request): JsonResponse
    {
        try {
            $query = SchoolAttendance::query();

            // Apply filters
            if ($request->has('school_id') && $request->school_id) {
                $query->where('school_id', $request->school_id);
            }

            // Date range
            $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $endDate = $request->get('end_date', Carbon::now()->format('Y-m-d'));

            $query->whereDate('date', '>=', $startDate)
                ->whereDate('date', '<=', $endDate);

            // Apply user-based filtering
            $this->applyUserFiltering($query, Auth::user());

            $records = $query->get();

            $stats = [
                'total_students' => $records->sum('start_count'),
                'total_present' => $records->sum('end_count'),
                'total_absent' => $records->sum('start_count') - $records->sum('end_count'),
                'average_attendance' => 0,
                'total_days' => $records->count(),
                'total_records' => $records->count(),
            ];

            // Calculate average attendance rate
            if ($stats['total_students'] > 0) {
                $stats['average_attendance'] = round(
                    ($stats['total_present'] / $stats['total_students']) * 100,
                    2
                );
            }

            // Determine trend (simplified)
            $stats['trend_direction'] = $stats['average_attendance'] >= 90 ? 'up' :
                                      ($stats['average_attendance'] >= 80 ? 'stable' : 'down');

            return response()->json([
                'success' => true,
                'data' => $stats,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Statistikalar hesablanarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get normalized attendance reports with optional aggregation
     */
    public function reports(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'group_by' => 'nullable|in:daily,weekly,monthly',
            'school_id' => 'nullable|exists:institutions,id',
            'class_name' => 'nullable|string|max:50',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'per_page' => 'nullable|integer|min:1|max:200',
            'page' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Filter parametrləri yanlışdır',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $validated = $validator->validated();
            $groupBy = $validated['group_by'] ?? 'daily';
            $startDate = $validated['start_date'] ?? Carbon::now()->startOfMonth()->format('Y-m-d');
            $endDate = $validated['end_date'] ?? Carbon::now()->format('Y-m-d');

            $query = SchoolAttendance::with(['school:id,name,type']);

            if (! empty($validated['school_id'])) {
                $query->where('school_id', $validated['school_id']);
            }

            if (! empty($validated['class_name'])) {
                $query->where('class_name', $validated['class_name']);
            }

            $query->whereDate('date', '>=', $startDate)
                ->whereDate('date', '<=', $endDate);
            $this->applyUserFiltering($query, Auth::user());

            if ($groupBy === 'daily') {
                $perPage = $validated['per_page'] ?? 20;
                $records = $query->orderBy('date', 'desc')->paginate($perPage);

                $dailyData = collect($records->items())->map(function ($record) {
                    return [
                        'id' => $record->id,
                        'date' => $record->date,
                        'date_label' => Carbon::parse($record->date)->format('Y-m-d'),
                        'school_name' => $record->school?->name,
                        'class_name' => $record->class_name,
                        'start_count' => $record->start_count,
                        'end_count' => $record->end_count,
                        'attendance_rate' => $record->attendance_rate,
                        'notes' => $record->notes,
                        'school' => $record->school ? [
                            'id' => $record->school->id,
                            'name' => $record->school->name,
                            'type' => $record->school->type,
                        ] : null,
                    ];
                });

                return response()->json([
                    'success' => true,
                    'data' => $dailyData,
                    'meta' => [
                        'current_page' => $records->currentPage(),
                        'last_page' => $records->lastPage(),
                        'per_page' => $records->perPage(),
                        'total' => $records->total(),
                        'from' => $records->firstItem(),
                        'to' => $records->lastItem(),
                    ],
                    'context' => [
                        'group_by' => $groupBy,
                        'range' => [
                            'start_date' => $startDate,
                            'end_date' => $endDate,
                        ],
                    ],
                ]);
            }

            $allRecords = $query->orderBy('date', 'desc')->get();
            $schoolLabel = 'Bütün məktəblər';
            $classLabel = $validated['class_name'] ?? 'Bütün siniflər';
            $schoolContext = null;

            if (! empty($validated['school_id'])) {
                $school = Institution::find($validated['school_id']);
                if ($school) {
                    $schoolLabel = $school->name;
                    $schoolContext = [
                        'id' => $school->id,
                        'name' => $school->name,
                        'type' => $school->type,
                    ];
                }
            } elseif (Auth::user()?->institution) {
                $schoolLabel = Auth::user()->institution->name;
                $schoolContext = [
                    'id' => Auth::user()->institution->id,
                    'name' => Auth::user()->institution->name,
                    'type' => Auth::user()->institution->type,
                ];
            }

            $grouped = $allRecords->groupBy(function ($record) use ($groupBy) {
                $date = Carbon::parse($record->date);

                if ($groupBy === 'weekly') {
                    return $date->copy()->startOfWeek(Carbon::MONDAY)->format('Y-m-d');
                }

                return $date->format('Y-m');
            })->map(function ($items, $key) use ($groupBy, $schoolLabel, $classLabel) {
                if ($groupBy === 'weekly') {
                    $rangeStart = Carbon::parse($key)->startOfWeek(Carbon::MONDAY);
                    $rangeEnd = $rangeStart->copy()->endOfWeek(Carbon::SUNDAY);
                    $dateLabel = $rangeStart->format('d.m') . ' - ' . $rangeEnd->format('d.m.Y');
                } else {
                    $rangeStart = Carbon::createFromFormat('Y-m', $key)->startOfMonth();
                    $rangeEnd = $rangeStart->copy()->endOfMonth();
                    $dateLabel = $rangeStart->translatedFormat('F Y');
                }

                $totalStart = $items->sum('start_count');
                $totalEnd = $items->sum('end_count');
                $recordCount = $items->count();

                return [
                    'id' => md5($key . $classLabel . $schoolLabel),
                    'date' => $rangeStart->toDateString(),
                    'date_label' => $dateLabel,
                    'range_start' => $rangeStart->toDateString(),
                    'range_end' => $rangeEnd->toDateString(),
                    'school_name' => $schoolLabel,
                    'class_name' => $classLabel,
                    'start_count' => $totalStart,
                    'end_count' => $totalEnd,
                    'attendance_rate' => $totalStart > 0 ? round(($totalEnd / $totalStart) * 100, 2) : 0,
                    'notes' => $recordCount . ' qeyd',
                    'record_count' => $recordCount,
                ];
            })->values()->sortByDesc('date')->values();

            return response()->json([
                'success' => true,
                'data' => $grouped,
                'meta' => [
                    'total' => $grouped->count(),
                ],
                'context' => [
                    'group_by' => $groupBy,
                    'range' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                    ],
                    'school' => $schoolContext,
                    'class' => $classLabel,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Davamiyyət hesabatları hazırlanarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get available classes for a school
     */
    public function getSchoolClasses($schoolId): JsonResponse
    {
        try {
            $classes = SchoolAttendance::where('school_id', $schoolId)
                ->distinct()
                ->pluck('class_name')
                ->sort()
                ->values();

            return response()->json([
                'success' => true,
                'data' => $classes,
                'message' => 'Sinif məlumatları alındı',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sinif məlumatları alınarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Bulk create attendance records
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'records' => 'required|array|min:1',
            'records.*.school_id' => 'required|exists:institutions,id',
            'records.*.class_name' => 'required|string|max:10',
            'records.*.date' => 'required|date|before_or_equal:today',
            'records.*.start_count' => 'required|integer|min:0',
            'records.*.end_count' => 'required|integer|min:0',
            'records.*.notes' => 'nullable|string|max:500',
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
            $errors = [];
            $userId = Auth::id();

            foreach ($request->records as $index => $recordData) {
                try {
                    // Validate end_count <= start_count
                    if ($recordData['end_count'] > $recordData['start_count']) {
                        $errors[] = [
                            'index' => $index,
                            'error' => 'Gün sonu sayı gün əvvəli sayından çox ola bilməz',
                        ];

                        continue;
                    }

                    // Check for existing record
                    $existing = SchoolAttendance::where([
                        'school_id' => $recordData['school_id'],
                        'class_name' => $recordData['class_name'],
                        'date' => $recordData['date'],
                    ])->exists();

                    if ($existing) {
                        $errors[] = [
                            'index' => $index,
                            'error' => 'Bu tarix və sinif üçün artıq qeyd mövcuddur',
                        ];

                        continue;
                    }

                    // Calculate attendance rate
                    $attendanceRate = $recordData['start_count'] > 0
                        ? round(($recordData['end_count'] / $recordData['start_count']) * 100, 2)
                        : 0;

                    SchoolAttendance::create([
                        'school_id' => $recordData['school_id'],
                        'class_name' => $recordData['class_name'],
                        'date' => $recordData['date'],
                        'start_count' => $recordData['start_count'],
                        'end_count' => $recordData['end_count'],
                        'attendance_rate' => $attendanceRate,
                        'notes' => $recordData['notes'] ?? null,
                        'created_by' => $userId,
                    ]);

                    $created++;
                } catch (\Exception $e) {
                    $errors[] = [
                        'index' => $index,
                        'error' => $e->getMessage(),
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'message' => "{$created} qeyd yaradıldı",
                'data' => [
                    'created_count' => $created,
                    'error_count' => count($errors),
                    'errors' => $errors,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Toplu yaratma əməliyyatında xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Export attendance data
     */
    public function export(Request $request)
    {
        try {
            $query = SchoolAttendance::with(['school:id,name']);

            // Apply same filters as index method
            if ($request->has('school_id') && $request->school_id) {
                $query->where('school_id', $request->school_id);
            }

            if ($request->has('class_name') && $request->class_name) {
                $query->where('class_name', $request->class_name);
            }

            if ($request->has('start_date') && $request->start_date) {
                $query->whereDate('date', '>=', $request->start_date);
            }

            if ($request->has('end_date') && $request->end_date) {
                $query->whereDate('date', '<=', $request->end_date);
            }

            $this->applyUserFiltering($query, Auth::user());

            $records = $query->orderBy('date', 'desc')->get();

            // Generate CSV content
            $csvData = [];
            $csvData[] = ['Tarix', 'Məktəb', 'Sinif', 'Başlanğıc Sayı', 'Son Sayı', 'Qayıblar', 'Davamiyyət %', 'Qeydlər'];

            foreach ($records as $record) {
                $csvData[] = [
                    $record->date->format('d.m.Y'),
                    $record->school->name,
                    $record->class_name,
                    $record->start_count,
                    $record->end_count,
                    $record->absent_count,
                    $record->attendance_rate . '%',
                    $record->notes ?? '',
                ];
            }

            // Convert to CSV
            $csv = '';
            foreach ($csvData as $row) {
                $csv .= implode(',', array_map(function ($field) {
                    return '"' . str_replace('"', '""', $field) . '"';
                }, $row)) . "\n";
            }

            return response($csv)
                ->header('Content-Type', 'text/csv; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="davamiyyat-' . date('Y-m-d') . '.csv"')
                ->header('Content-Length', strlen($csv));
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Export zamanı xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get daily report
     */
    public function getDailyReport(Request $request): JsonResponse
    {
        try {
            $date = $request->get('date', now()->format('Y-m-d'));

            $query = SchoolAttendance::with(['school:id,name'])
                ->whereDate('date', $date);

            $this->applyUserFiltering($query, Auth::user());

            $records = $query->get();

            $summary = [
                'date' => $date,
                'total_records' => $records->count(),
                'total_students' => $records->sum('start_count'),
                'total_present' => $records->sum('end_count'),
                'total_absent' => $records->sum('start_count') - $records->sum('end_count'),
                'average_attendance' => $records->avg('attendance_rate') ?? 0,
                'schools_reported' => $records->pluck('school_id')->unique()->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => $summary,
                    'records' => $records,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Günlük hesabat alınarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get weekly summary
     */
    public function getWeeklySummary(Request $request): JsonResponse
    {
        try {
            $startDate = $request->get('start_date', now()->startOfWeek()->format('Y-m-d'));
            $endDate = $request->get('end_date', now()->endOfWeek()->format('Y-m-d'));

            $query = SchoolAttendance::with(['school:id,name'])
                ->whereBetween('date', [$startDate, $endDate]);

            $this->applyUserFiltering($query, Auth::user());

            $records = $query->get();

            // Group by date for daily breakdown
            $dailyData = $records->groupBy(function ($record) {
                return $record->date->format('Y-m-d');
            })->map(function ($dayRecords) {
                return [
                    'total_students' => $dayRecords->sum('start_count'),
                    'total_present' => $dayRecords->sum('end_count'),
                    'attendance_rate' => $dayRecords->avg('attendance_rate') ?? 0,
                    'schools_count' => $dayRecords->count(),
                ];
            });

            $summary = [
                'period' => ['start' => $startDate, 'end' => $endDate],
                'total_records' => $records->count(),
                'total_students' => $records->sum('start_count'),
                'total_present' => $records->sum('end_count'),
                'average_attendance' => $records->avg('attendance_rate') ?? 0,
                'daily_breakdown' => $dailyData,
            ];

            return response()->json([
                'success' => true,
                'data' => $summary,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Həftəlik xülasə alınarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get monthly statistics
     */
    public function getMonthlyStatistics(Request $request): JsonResponse
    {
        try {
            $month = $request->get('month', now()->month);
            $year = $request->get('year', now()->year);

            $startDate = Carbon::create($year, $month, 1)->startOfMonth();
            $endDate = Carbon::create($year, $month, 1)->endOfMonth();

            $query = SchoolAttendance::with(['school:id,name'])
                ->whereBetween('date', [$startDate, $endDate]);

            $this->applyUserFiltering($query, Auth::user());

            $records = $query->get();

            $statistics = [
                'period' => $startDate->format('F Y'),
                'total_school_days' => $records->pluck('date')->unique()->count(),
                'total_records' => $records->count(),
                'total_students' => $records->sum('start_count'),
                'total_present' => $records->sum('end_count'),
                'total_absent' => $records->sum('start_count') - $records->sum('end_count'),
                'average_attendance' => round($records->avg('attendance_rate') ?? 0, 2),
                'best_day' => null,
                'worst_day' => null,
                'schools_participating' => $records->pluck('school_id')->unique()->count(),
            ];

            // Find best and worst days
            $dailyAverages = $records->groupBy(function ($record) {
                return $record->date->format('Y-m-d');
            })->map(function ($dayRecords, $date) {
                return [
                    'date' => $date,
                    'attendance_rate' => round($dayRecords->avg('attendance_rate') ?? 0, 2),
                ];
            })->sortBy('attendance_rate');

            if ($dailyAverages->isNotEmpty()) {
                $statistics['worst_day'] = $dailyAverages->first();
                $statistics['best_day'] = $dailyAverages->last();
            }

            return response()->json([
                'success' => true,
                'data' => $statistics,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Aylıq statistika alınarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Apply user-based filtering based on role and institution
     */
    private function applyUserFiltering($query, $user): void
    {
        $userRole = $user->roles->first()?->name;

        switch ($userRole) {
            case 'superadmin':
                // SuperAdmin can see all records
                break;

            case 'regionadmin':
                // RegionAdmin can see records from their region's schools
                $regionInstitutions = Institution::where(function ($q) use ($user) {
                    $q->where('id', $user->institution_id)
                        ->orWhere('parent_id', $user->institution_id);
                })->pluck('id');

                $schoolInstitutions = Institution::whereIn('parent_id', $regionInstitutions)
                    ->whereIn('type', ['secondary_school', 'lyceum', 'gymnasium', 'vocational_school'])
                    ->pluck('id');

                $allSchoolIds = $regionInstitutions->merge($schoolInstitutions)
                    ->filter(function ($id) {
                        return Institution::where('id', $id)
                            ->whereIn('type', ['secondary_school', 'lyceum', 'gymnasium', 'vocational_school'])
                            ->exists();
                    });

                $query->whereIn('school_id', $allSchoolIds);
                break;

            case 'sektoradmin':
                // SektorAdmin can see records from their sector's schools
                $sektorSchools = Institution::where('parent_id', $user->institution_id)
                    ->whereIn('type', ['secondary_school', 'lyceum', 'gymnasium', 'vocational_school'])
                    ->pluck('id');

                $query->whereIn('school_id', $sektorSchools);
                break;

            case 'məktəbadmin':
            case 'müəllim':
                // School admin and teachers can only see their school's records
                $query->where('school_id', $user->institution_id);
                break;

            default:
                // Unknown role - no access
                $query->where('id', -1); // Force empty result
                break;
        }
    }
}
