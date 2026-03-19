<?php

declare(strict_types=1);

namespace App\Http\Controllers\Preschool;

use App\Http\Controllers\BaseController;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\PreschoolAttendance;
use App\Models\PreschoolAttendancePhoto;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class PreschoolAttendanceReportController extends BaseController
{
    private const PRESCHOOL_TYPES = ['kindergarten', 'preschool_center', 'nursery'];

    public function index(Request $request): JsonResponse
    {
        $user      = Auth::user();
        $startDate = $request->get('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate   = $request->get('end_date', now()->format('Y-m-d'));

        $institutionsQuery = Institution::whereIn('type', self::PRESCHOOL_TYPES)
            ->where('level', 4)
            ->where('is_active', true);

        $this->applyHierarchyScope($institutionsQuery, $user);

        if ($request->filled('sector_id')) {
            $institutionsQuery->where('parent_id', $request->sector_id);
        }

        if ($request->filled('institution_id')) {
            $institutionsQuery->where('id', $request->institution_id);
        }

        $institutions   = $institutionsQuery->with('parent')->get();
        $institutionIds = $institutions->pluck('id');

        $startCarbon = Carbon::parse($startDate);
        $endCarbon   = Carbon::parse($endDate);
        $totalDays   = $startCarbon->diffInDays($endCarbon) + 1;

        $attendanceStats = PreschoolAttendance::whereIn('institution_id', $institutionIds)
            ->whereBetween('attendance_date', [$startDate, $endDate])
            ->selectRaw('institution_id, COUNT(DISTINCT attendance_date) as reported_days, COUNT(*) as total_records, SUM(total_enrolled) as sum_enrolled, SUM(present_count) as sum_present, AVG(attendance_rate) as avg_rate')
            ->groupBy('institution_id')
            ->get()
            ->keyBy('institution_id');

        $groupCounts = Grade::whereIn('institution_id', $institutionIds)
            ->where('is_active', true)
            ->selectRaw('institution_id, COUNT(*) as group_count')
            ->groupBy('institution_id')
            ->pluck('group_count', 'institution_id');

        $summaryData = $institutions->map(function (Institution $inst) use ($attendanceStats, $groupCounts, $totalDays) {
            $stats          = $attendanceStats->get($inst->id);
            $groupCount     = (int) ($groupCounts->get($inst->id) ?? 0);
            $reportedDays   = $stats ? (int) $stats->reported_days : 0;
            $completionRate = $totalDays > 0 ? round(($reportedDays / $totalDays) * 100, 2) : 0;

            return [
                'institution_id'    => $inst->id,
                'institution_name'  => $inst->name,
                'sector_name'       => $inst->parent?->name,
                'type'              => $inst->type,
                'group_count'       => $groupCount,
                'total_enrolled'    => $stats ? (int) $stats->sum_enrolled : 0,
                'total_present'     => $stats ? (int) $stats->sum_present : 0,
                'average_rate'      => $stats ? round((float) $stats->avg_rate, 2) : 0,
                'records_submitted' => $reportedDays,
                'records_expected'  => $totalDays,
                'completion_rate'   => $completionRate,
            ];
        });

        $totals = [
            'institution_count' => $institutions->count(),
            'total_enrolled'    => $summaryData->sum('total_enrolled'),
            'total_present'     => $summaryData->sum('total_present'),
            'average_rate'      => $summaryData->avg('average_rate') ? round((float) $summaryData->avg('average_rate'), 2) : 0,
            'avg_completion'    => $summaryData->avg('completion_rate') ? round((float) $summaryData->avg('completion_rate'), 2) : 0,
        ];

        return response()->json([
            'success' => true,
            'data'    => [
                'period'       => ['start_date' => $startDate, 'end_date' => $endDate],
                'institutions' => $summaryData->values(),
                'totals'       => $totals,
            ],
            'message' => 'Hesabat uğurla yükləndi.',
        ]);
    }

    public function exportPhotosZip(Request $request): StreamedResponse|JsonResponse
    {
        $user      = Auth::user();
        $startDate = $request->get('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate   = $request->get('end_date', now()->format('Y-m-d'));

        $photosQuery = PreschoolAttendancePhoto::whereBetween('photo_date', [$startDate, $endDate]);

        if ($request->filled('institution_id')) {
            $photosQuery->where('institution_id', $request->institution_id);
        } else {
            $institutionsQuery = Institution::whereIn('type', self::PRESCHOOL_TYPES)->where('level', 4);
            $this->applyHierarchyScope($institutionsQuery, $user);
            $photosQuery->whereIn('institution_id', $institutionsQuery->pluck('id'));
        }

        $photos = $photosQuery->get();

        if ($photos->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Seçilən dövr üçün şəkil tapılmadı.',
            ], 404);
        }

        $zipFilename = "preschool_photos_{$startDate}_{$endDate}.zip";
        $tempPath    = sys_get_temp_dir() . '/' . $zipFilename;

        $zip = new ZipArchive();
        if ($zip->open($tempPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            Log::error('Failed to create ZIP archive', ['path' => $tempPath]);

            return response()->json(['success' => false, 'message' => 'ZIP arxivi yaradıla bilmədi.'], 500);
        }

        foreach ($photos as $photo) {
            $filePath = Storage::disk('local')->path($photo->file_path);

            if (file_exists($filePath)) {
                $zipEntry = $photo->photo_date->format('Y-m-d') . '/' . $photo->institution_id . '/' . $photo->original_filename;
                $zip->addFile($filePath, $zipEntry);
            }
        }

        $zip->close();

        return response()->streamDownload(function () use ($tempPath): void {
            readfile($tempPath);
            @unlink($tempPath);
        }, $zipFilename, [
            'Content-Type'        => 'application/zip',
            'Content-Disposition' => "attachment; filename=\"{$zipFilename}\"",
        ]);
    }

    private function applyHierarchyScope(Builder $query, User $user): void
    {
        if ($user->hasRole('superadmin')) {
            return;
        }

        if ($user->hasRole('regionadmin') || $user->hasRole('regionoperator')) {
            $regionId = $user->institution_id;
            $query->whereHas('parent', function (Builder $q) use ($regionId): void {
                $q->where('parent_id', $regionId);
            });

            return;
        }

        if ($user->hasRole('sektoradmin')) {
            $query->where('parent_id', $user->institution_id);

            return;
        }

        // Default: only own institution
        $query->where('id', $user->institution_id);
    }
}
