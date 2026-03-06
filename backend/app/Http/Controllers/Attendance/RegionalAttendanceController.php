<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\BaseController;
use App\Models\Institution;
use App\Services\Attendance\RegionalAttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\RegionalAttendanceExport;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class RegionalAttendanceController extends BaseController
{
    public function __construct(private RegionalAttendanceService $attendanceService)
    {
        $this->middleware(['auth:sanctum', 'role:superadmin|regionadmin|regionoperator|sektoradmin']);
    }

    public function overview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'region_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'sector_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'school_id' => ['nullable', 'integer', 'exists:institutions,id'],
        ]);

        $data = $this->attendanceService->getOverview($request->user(), $validated);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function export(Request $request): BinaryFileResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'region_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'sector_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'school_id' => ['nullable', 'integer', 'exists:institutions,id'],
        ]);

        $data = $this->attendanceService->getOverview($request->user(), $validated);

        return Excel::download(
            new RegionalAttendanceExport($data, $validated),
            'regional_attendance_report_' . now()->format('Y_m_d_His') . '.xlsx'
        );
    }

    public function schoolClasses(Request $request, Institution $school): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
        ]);

        $data = $this->attendanceService->getSchoolClassBreakdown($request->user(), $school, $validated);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Get grade level statistics for attendance.
     */
    public function gradeLevelStats(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'region_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'sector_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'education_program' => ['nullable', 'string', 'in:umumi,xususi,mektebde_ferdi,evde_ferdi,all'],
        ]);

        $data = $this->attendanceService->getGradeLevelStats($request->user(), $validated);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Export grade level statistics to Excel.
     */
    public function exportGradeLevelStats(Request $request): BinaryFileResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'region_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'sector_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'education_program' => ['nullable', 'string', 'in:umumi,xususi,mektebde_ferdi,evde_ferdi,all'],
        ]);

        $exportData = $this->attendanceService->exportGradeLevelStats($request->user(), $validated);

        // Create a simple array export
        $export = new class($exportData['data']) implements \Maatwebsite\Excel\Concerns\FromArray {
            private array $data;

            public function __construct(array $data)
            {
                $this->data = $data;
            }

            public function array(): array
            {
                return $this->data;
            }
        };

        return Excel::download($export, $exportData['filename']);
    }

    /**
     * Get schools that have not submitted attendance reports.
     */
    public function getSchoolsWithMissingReports(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'region_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'sector_id' => ['nullable', 'integer', 'exists:institutions,id'],
        ]);

        $data = $this->attendanceService->getSchoolsWithMissingReports($request->user(), $validated);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}
