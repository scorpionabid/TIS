<?php

namespace App\Http\Controllers\Attendance;

use App\Exports\RegionalAttendanceExport;
use App\Http\Controllers\BaseController;
use App\Models\Institution;
use App\Services\Attendance\RegionalAttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class RegionalAttendanceController extends BaseController
{
    public function __construct(private RegionalAttendanceService $attendanceService)
    {
        $this->middleware(['auth:sanctum', 'role:superadmin|regionadmin|regionoperator|sektoradmin|schooladmin|məktəbadmin']);
    }

    public function overview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'region_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'sector_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'school_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'education_program' => ['nullable', 'string', 'in:umumi,xususi,mektebde_ferdi,evde_ferdi,all'],
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
            'education_program' => ['nullable', 'string', 'in:umumi,xususi,mektebde_ferdi,evde_ferdi,all'],
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
            'education_program' => ['nullable', 'string', 'in:umumi,xususi,mektebde_ferdi,evde_ferdi,all'],
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
     * Get school and grade level statistics for attendance.
     */
    public function schoolGradeStats(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'region_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'sector_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'education_program' => ['nullable', 'string', 'in:umumi,xususi,mektebde_ferdi,evde_ferdi,all'],
        ]);

        $data = $this->attendanceService->getSchoolGradeStats($request->user(), $validated);

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
        $export = new class($exportData['data']) implements \Maatwebsite\Excel\Concerns\FromArray
        {
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
     * Export school and grade level statistics to Excel.
     */
    public function exportSchoolGradeStats(Request $request): BinaryFileResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'region_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'sector_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'education_program' => ['nullable', 'string', 'in:umumi,xususi,mektebde_ferdi,evde_ferdi,all'],
        ]);

        $exportData = $this->attendanceService->exportSchoolGradeStats($request->user(), $validated);

        // Create a simple array export
        $export = new class($exportData['data']) implements \Maatwebsite\Excel\Concerns\FromArray, \Maatwebsite\Excel\Concerns\ShouldAutoSize
        {
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
            'education_program' => ['nullable', 'string', 'in:umumi,xususi,mektebde_ferdi,evde_ferdi,all'],
        ]);

        $data = $this->attendanceService->getSchoolsWithMissingReports($request->user(), $validated);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Export schools with missing reports to Excel.
     */
    public function exportMissingReports(Request $request): BinaryFileResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'region_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'sector_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'education_program' => ['nullable', 'string', 'in:umumi,xususi,mektebde_ferdi,evde_ferdi,all'],
        ]);

        $exportData = $this->attendanceService->exportMissingReports($request->user(), $validated);

        $export = new class($exportData['data']) implements \Maatwebsite\Excel\Concerns\FromArray, \Maatwebsite\Excel\Concerns\ShouldAutoSize
        {
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

        return \Maatwebsite\Excel\Facades\Excel::download($export, $exportData['filename']);
    }

    /**
     * Get attendance rankings for schools based on submission time.
     */
    public function rankings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['nullable', 'date'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'region_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'sector_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'school_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'shift_type' => ['nullable', 'string', 'in:morning,evening,all'],
        ]);

        $data = $this->attendanceService->getRankings($request->user(), $validated);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}
