<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\BaseController;
use App\Models\Institution;
use App\Services\Attendance\RegionalAttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RegionalAttendanceController extends BaseController
{
    public function __construct(private RegionalAttendanceService $attendanceService)
    {
        $this->middleware(['auth:sanctum', 'role:superadmin|regionadmin|sektoradmin']);
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
}
