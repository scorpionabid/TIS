<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\SchoolAttendance;
use App\Models\Institution;
use App\Services\Attendance\AttendanceRankingService;
use App\Services\Attendance\SchoolAttendanceCrudService;
use App\Services\Attendance\SchoolAttendanceCsvExportService;
use App\Services\Attendance\SchoolAttendanceReportsService;
use App\Services\Attendance\SchoolAttendanceScopeFilter;
use App\Services\Attendance\SchoolAttendanceStatsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class SchoolAttendanceController extends BaseController
{
    public function __construct(
        private readonly SchoolAttendanceCrudService $crudService,
        private readonly SchoolAttendanceStatsService $statsService,
        private readonly SchoolAttendanceReportsService $reportsService,
        private readonly SchoolAttendanceCsvExportService $exportService,
        private readonly AttendanceRankingService $rankingsService,
        private readonly SchoolAttendanceScopeFilter $scope,
    ) {
        $this->middleware('auth:sanctum');
    }

    // -------------------------------------------------------------------------
    // CRUD
    // -------------------------------------------------------------------------

    /**
     * Display a listing of attendance records
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = SchoolAttendance::with(['school:id,name,type']);

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

            $this->scope->apply($query, Auth::user());

            $sortField = $request->get('sort_field', 'date');
            $sortDirection = $request->get('sort_direction', 'desc');
            $query->orderBy($sortField, $sortDirection);

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
            $result = $this->crudService->store($validator->validated(), Auth::id());

            if ($result['error']) {
                return response()->json(['success' => false, 'message' => $result['error']], $result['status']);
            }

            return response()->json([
                'success' => true,
                'message' => 'Davamiyyət qeydi uğurla yaradıldı',
                'data' => $result['record'],
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

            return response()->json(['success' => true, 'data' => $schoolAttendance]);
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
            $result = $this->crudService->update($schoolAttendance, $validator->validated());

            if ($result['error']) {
                return response()->json(['success' => false, 'message' => $result['error']], $result['status']);
            }

            return response()->json([
                'success' => true,
                'message' => 'Davamiyyət qeydi uğurla yeniləndi',
                'data' => $result['record'],
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

            return response()->json(['success' => true, 'message' => 'Davamiyyət qeydi uğurla silindi']);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Davamiyyət qeydi silinərkən xəta baş verdi',
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
            $result = $this->crudService->bulkStore($request->records, Auth::id());

            return response()->json([
                'success' => true,
                'message' => "{$result['created']} qeyd yaradıldı",
                'data' => [
                    'created_count' => $result['created'],
                    'error_count' => count($result['errors']),
                    'errors' => $result['errors'],
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

    // -------------------------------------------------------------------------
    // Utility
    // -------------------------------------------------------------------------

    /**
     * Get available classes for a school
     */
    public function getSchoolClasses($schoolId): JsonResponse
    {
        $classes = Grade::where('institution_id', $schoolId)
            ->orderBy('class_level')
            ->orderBy('name')
            ->get(['class_level', 'name'])
            ->map(fn ($g) => $g->class_level . '-' . $g->name)
            ->values();

        return response()->json([
            'success' => true,
            'data' => $classes,
            'message' => 'Sinif məlumatları alındı',
        ]);
    }

    // -------------------------------------------------------------------------
    // Statistics
    // -------------------------------------------------------------------------

    /**
     * Get attendance statistics
     */
    public function stats(Request $request): JsonResponse
    {
        try {
            $filters = $request->only(['school_id', 'start_date', 'end_date']);
            $startDate = $filters['start_date'] ?? Carbon::now()->startOfMonth()->format('Y-m-d');
            $endDate = $filters['end_date'] ?? Carbon::now()->format('Y-m-d');

            $stats = $this->statsService->getStats($filters, Auth::user());

            return response()->json([
                'success' => true,
                'data' => $stats,
                'period' => ['start_date' => $startDate, 'end_date' => $endDate],
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
     * Get daily report
     */
    public function getDailyReport(Request $request): JsonResponse
    {
        try {
            $date = $request->get('date', now()->format('Y-m-d'));
            $summary = $this->statsService->getDailyReport($date, Auth::user());

            return response()->json([
                'success' => true,
                'data' => ['summary' => $summary, 'records' => []],
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

            $summary = $this->statsService->getWeeklySummary($startDate, $endDate, Auth::user());

            return response()->json(['success' => true, 'data' => $summary]);
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
            $month = (int) $request->get('month', now()->month);
            $year = (int) $request->get('year', now()->year);

            $statistics = $this->statsService->getMonthlyStatistics($month, $year, Auth::user());

            return response()->json(['success' => true, 'data' => $statistics]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Aylıq statistika alınarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get school grade-level statistics for detailed breakdown
     */
    public function schoolGradeStats(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $schoolId = $user?->institution?->id;

            if (! $schoolId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Məktəb məlumatları tapılmadı',
                ], 400);
            }

            $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $endDate = $request->get('end_date', Carbon::now()->format('Y-m-d'));

            $data = $this->statsService->getSchoolGradeStats($startDate, $endDate, $schoolId, $user);

            return response()->json(['success' => true, 'data' => $data]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sinif statistikaları yüklənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    // -------------------------------------------------------------------------
    // Reports
    // -------------------------------------------------------------------------

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
            'per_page' => 'nullable|integer|min:1|max:500',
            'page' => 'nullable|integer|min:1',
            'sort_field' => 'nullable|in:date,class_name,attendance_rate,first_lesson,last_lesson',
            'sort_direction' => 'nullable|in:asc,desc',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Filter parametrləri yanlışdır',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->reportsService->getReports($validator->validated(), Auth::user());

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'meta' => $result['meta'],
                'context' => $result['context'],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Davamiyyət hesabatları hazırlanarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    // -------------------------------------------------------------------------
    // Export
    // -------------------------------------------------------------------------

    /**
     * Export attendance data
     */
    public function export(Request $request)
    {
        try {
            return $this->exportService->export($request, Auth::user());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Export zamanı xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    // -------------------------------------------------------------------------
    // Rankings
    // -------------------------------------------------------------------------

    /**
     * Get rankings for all schools in the same sector.
     *
     * Supports single-day and date-range queries.
     */
    public function rankings(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $schoolId = $user?->institution?->id;
            $sectorId = $user?->institution?->parent_id;

            if (! $schoolId || ! $sectorId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Məktəb və ya sektor məlumatları tapılmadı',
                ], 400);
            }

            $validated = $request->validate([
                'start_date' => ['nullable', 'date'],
                'end_date'   => ['nullable', 'date'],
                'shift_type' => ['nullable', 'string', 'in:morning,evening,all'],
            ]);

            $startDate = $validated['start_date'] ?? Carbon::now()->format('Y-m-d');
            $endDate   = $validated['end_date']   ?? $startDate;
            $shiftType = $validated['shift_type'] ?? 'all';

            $sector = Institution::find($sectorId);

            $schoolIds = Institution::where('parent_id', $sectorId)
                ->whereIn('type', ['secondary_school', 'lyceum', 'gymnasium', 'vocational_school'])
                ->where('is_active', true)
                ->pluck('id')
                ->toArray();

            $scope = [
                'start_date'    => $startDate,
                'end_date'      => $endDate,
                'school_ids'    => $schoolIds,
                'region'        => $sector?->parent?->level === 2 ? $sector->parent : null,
                'active_sector' => $sector,
            ];

            $filters = [
                'shift_type' => $shiftType,
                'school_id'  => $schoolId,
            ];

            $data = $this->rankingsService->getRankings($user, $filters, $scope);

            return response()->json(['success' => true, 'data' => $data]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Reytinq məlumatları yüklənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
