<?php

namespace App\Http\Controllers;

use App\Models\ReportTable;
use App\Models\ReportTableResponse;
use App\Services\ReportTableApprovalService;
use App\Services\ReportTableResponseService;
use App\Services\ReportTableStatisticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class ReportTableResponseController extends BaseController
{
    public function __construct(
        private readonly ReportTableResponseService $service,
        private readonly ReportTableApprovalService $approvalService,
        private readonly ReportTableStatisticsService $statisticsService,
    ) {}

    // ─── Start or Get ─────────────────────────────────────────────────────────

    /**
     * POST /api/report-tables/{table}/response/start
     * Mövcud cavabı qaytarır, yoxdursa draft yaradır.
     */
    public function start(ReportTable $table): JsonResponse
    {
        $user = Auth::user();

        try {
            $response = $this->service->startOrGet($table, $user);

            return $this->successResponse(
                $this->formatResponse($response),
                'Cavab uğurla başladıldı.'
            );
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    // ─── My Response ─────────────────────────────────────────────────────────

    /**
     * GET /api/report-tables/{table}/response/my
     * Cari istifadəçinin cavabını qaytarır.
     */
    public function my(ReportTable $table): JsonResponse
    {
        $user = Auth::user();
        $institutionId = $user->institution_id;

        if (! $institutionId) {
            return $this->errorResponse('Müəssisəyə aid deyilsiniz.', 422);
        }

        $response = ReportTableResponse::where('report_table_id', $table->id)
            ->where('institution_id', $institutionId)
            ->with(['reportTable', 'institution', 'respondent.profile'])
            ->first();

        if (! $response) {
            return $this->successResponse(null, 'Cavab tapılmadı.');
        }

        return $this->successResponse($this->formatResponse($response), 'Cavab uğurla alındı.');
    }

    // ─── Save ────────────────────────────────────────────────────────────────

    /**
     * PUT /api/report-tables/responses/{response}
     * Cavab sətirlerini saxlayır (auto-save üçün).
     */
    public function save(Request $request, ReportTableResponse $response): JsonResponse
    {
        $validated = $request->validate([
            'rows'    => 'required|array',
            'rows.*'  => 'array',
        ]);

        $user = Auth::user();

        try {
            $updated = $this->service->save($response, $validated['rows'], $user);

            return $this->successResponse(
                $this->formatResponse($updated),
                'Cavab uğurla saxlanıldı.'
            );
        } catch (ValidationException $e) {
            return $this->errorResponse('Validasiya xətası.', 422, $e->errors());
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    // ─── Submit ──────────────────────────────────────────────────────────────

    /**
     * POST /api/report-tables/responses/{response}/submit
     * Cavabı submit edir.
     */
    public function submit(ReportTableResponse $response): JsonResponse
    {
        $user = Auth::user();

        try {
            $submitted = $this->service->submit($response, $user);

            return $this->successResponse(
                $this->formatResponse($submitted),
                'Cavab uğurla göndərildi.'
            );
        } catch (ValidationException $e) {
            return $this->errorResponse('Validasiya xətası.', 422, $e->errors());
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    // ─── Row Actions ─────────────────────────────────────────────────────────

    /**
     * POST /api/report-tables/{table}/responses/{response}/rows/submit
     * Sətiri təsdiq üçün göndərir (məktəb tərəfindən).
     */
    public function submitRow(ReportTable $table, ReportTableResponse $response, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'row_index' => 'required|integer|min:0',
        ]);

        try {
            $updated = $this->service->submitRow($response, $validated['row_index'], Auth::user());

            return $this->successResponse($this->formatResponse($updated), 'Sətir uğurla göndərildi.');
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * POST /api/report-tables/{table}/responses/{response}/rows/approve
     * Sətiri təsdiqləyir (admin tərəfindən).
     */
    public function approveRow(ReportTable $table, ReportTableResponse $response, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'row_index' => 'required|integer|min:0',
        ]);

        try {
            $updated = $this->approvalService->approveRow($response, $validated['row_index'], Auth::user());

            return $this->successResponse($this->formatResponse($updated), 'Sətir uğurla təsdiqləndi.');
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * POST /api/report-tables/{table}/responses/{response}/rows/reject
     * Sətiri rədd edir (admin tərəfindən).
     */
    public function rejectRow(ReportTable $table, ReportTableResponse $response, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'row_index' => 'required|integer|min:0',
            'reason'    => 'required|string|max:500',
        ]);

        try {
            $updated = $this->approvalService->rejectRow($response, $validated['row_index'], Auth::user(), $validated['reason']);

            return $this->successResponse($this->formatResponse($updated), 'Sətir rədd edildi.');
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * POST /api/report-tables/{table}/responses/{response}/rows/return
     * Sətiri qaralamaya qaytarır (admin tərəfindən).
     */
    public function returnRow(ReportTable $table, ReportTableResponse $response, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'row_index' => 'required|integer|min:0',
        ]);

        try {
            $updated = $this->approvalService->returnRowToDraft($response, $validated['row_index'], Auth::user());

            return $this->successResponse($this->formatResponse($updated), 'Sətir redaktəyə qaytarıldı.');
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/report-tables/{table}/responses/{response}/rows/delete
     * Sətiri tamamilə silir (admin tərəfindən — məktəbin cədvəlindən sətir silinir).
     */
    public function deleteRow(ReportTable $table, ReportTableResponse $response, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'row_index' => 'required|integer|min:0',
        ]);

        try {
            $updated = $this->approvalService->deleteRow($response, $validated['row_index'], Auth::user());

            return $this->successResponse($this->formatResponse($updated), 'Sətir uğurla silindi.');
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    // ─── Approval Queue ──────────────────────────────────────────────────────

    /**
     * GET /api/report-tables/approval-queue
     * Reviewer-in hüquqlu olduğu bütün gözləyən sətirləri qaytarır.
     */
    public function approvalQueue(Request $request): JsonResponse
    {
        $data = $this->approvalService->getApprovalQueue($request->user());

        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/report-tables/approval-queue/grouped
     * Reviewer-in hüquqlu olduğu bütün gözləyən (submitted) sətirləri
     * Cədvəl -> Sektor -> Məktəb qruplamasında qaytarır.
     */
    public function approvalQueueGrouped(Request $request): JsonResponse
    {
        $data = $this->approvalService->getApprovalQueueGrouped($request->user());

        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/report-tables/ready/grouped
     * Reviewer-in hüquqlu olduğu bütün təsdiqlənmiş (approved) sətirləri
     * Cədvəl -> Sektor -> Məktəb qruplamasında qaytarır.
     */
    public function readyGrouped(Request $request): JsonResponse
    {
        $data = $this->approvalService->getReadyGrouped($request->user());

        return response()->json(['data' => $data]);
    }

    /**
     * POST /api/report-tables/{table}/responses/bulk-row-action
     * Bir cədvəl üçün seçilmiş sətirləri toplu şəkildə emal edir.
     */
    public function bulkRowAction(ReportTable $table, Request $request): JsonResponse
    {
        $request->validate([
            'row_specs'                  => 'required|array|min:1',
            'row_specs.*.response_id'    => 'required|integer',
            'row_specs.*.row_indices'    => 'required|array|min:1',
            'row_specs.*.row_indices.*'  => 'integer|min:0',
            'action'                     => 'required|in:approve,reject,return',
            'reason'                     => 'required_if:action,reject|nullable|string|max:500',
        ]);

        $result = $this->approvalService->bulkRowAction(
            $table,
            $request->row_specs,
            $request->action,
            $request->reason,
            $request->user(),
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'message'    => "{$result['successful']} sətir emal edildi.",
            'successful' => $result['successful'],
            'failed'     => $result['failed'],
            'errors'     => $result['errors'],
        ]);
    }

    /**
     * GET /api/report-tables/bulk-action-logs
     * Toplu əməliyyat tarixçəsini qaytarır.
     */
    public function bulkActionLogs(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Yalnız admin və superadmin görməlidir
        if (!$user->hasRole(['superadmin', 'admin', 'sectoradmin', 'regionadmin'])) {
            return $this->errorResponse('Bu əməliyyat üçün icazəniz yoxdur.', 403);
        }

        $logs = \App\Models\ReportTableBulkActionLog::with(['user', 'reportTable'])
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'user' => $log->user?->name ?? 'Unknown',
                'table_title' => $log->reportTable?->title ?? 'Unknown',
                'action' => $log->action,
                'action_label' => $log->action_label,
                'row_count' => $log->row_count,
                'successful_count' => $log->successful_count,
                'failed_count' => $log->failed_count,
                'created_at' => $log->created_at->toISOString(),
            ]);

        return response()->json(['data' => $logs]);
    }

    /**
     * GET /api/report-tables/{table}/fill-statistics
     * Bir cədvəl üçün bütün məktəblərin doldurma statistikası.
     */
    public function tableFillStatistics(ReportTable $table, Request $request): JsonResponse
    {
        $user = $request->user();
        
        // DEBUG: Log user roles
        $userRoles = $user->getRoleNames()->toArray();
        Log::info('tableFillStatistics - User roles: ' . json_encode($userRoles));
        
        // Yalnız admin, superadmin, sektoradmin, regionadmin və regionoperator görməlidir
        if (!$user->hasRole(['superadmin', 'admin', 'sectoradmin', 'regionadmin', 'regionoperator'])) {
            Log::warning('tableFillStatistics - Permission denied for user: ' . $user->id . ' with roles: ' . json_encode($userRoles));
            return $this->errorResponse('Bu əməliyyat üçün icazəniz yoxdur.', 403);
        }

        $data = $this->statisticsService->getTableFillStatistics($table, $user);

        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/report-tables/school-fill-statistics
     * Bütün məktəblərin cədvəl doldurma statistikası.
     */
    public function schoolFillStatistics(Request $request): JsonResponse
    {
        $user = $request->user();

        // Yalnız admin, superadmin, sektoradmin, regionadmin və regionoperator görməlidir
        if (!$user->hasRole(['superadmin', 'admin', 'sectoradmin', 'regionadmin', 'regionoperator'])) {
            return $this->errorResponse('Bu əməliyyat üçün icazəniz yoxdur.', 403);
        }

        $data = $this->statisticsService->getSchoolFillStatistics($user);

        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/report-tables/{table}/statistics/export
     * Cədvəl doldurma statistikalarını Excel formatında export etmək.
     */
    public function exportStatistics(ReportTable $table, Request $request)
    {
        $user = $request->user();
        
        // Yalnız admin, superadmin, sektoradmin, regionadmin və regionoperator export edə bilər
        if (!$user->hasRole(['superadmin', 'admin', 'sectoradmin', 'regionadmin', 'regionoperator'])) {
            return $this->errorResponse('Bu əməliyyat üçün icazəniz yoxdur.', 403);
        }

        $data = $this->statisticsService->getTableFillStatistics($table, $user);

        // Generate Excel file
        $exportData = [];
        $exportData[] = ['Məktəb', 'Sektor', 'Status', 'Sətir sayı', 'Təsdiqlənib', 'Gözləyir'];
        
        foreach ($data['schools'] as $school) {
            $statusMap = [
                'not_started' => 'Başlanmayıb',
                'draft' => 'Qaralama',
                'pending' => 'Gözləyir',
                'partial' => 'Qismən',
                'completed' => 'Tamamlanıb',
            ];
            
            $exportData[] = [
                $school['institution_name'],
                $school['sector_name'] ?? 'Sektor yoxdur',
                $statusMap[$school['status']] ?? $school['status'],
                $school['row_count'],
                $school['approved_count'],
                $school['pending_count'],
            ];
        }
        
        // Create simple CSV/Excel response
        $filename = $table->title . '_statistika_' . date('Y-m-d') . '.xlsx';
        
        // Use Laravel Excel package if available, otherwise return CSV
        if (class_exists('Maatwebsite\Excel\Facades\Excel')) {
            $export = new class($exportData) implements \Maatwebsite\Excel\Concerns\FromArray {
                private $data;
                public function __construct($data) { $this->data = $data; }
                public function array(): array { return $this->data; }
            };
            
            return \Maatwebsite\Excel\Facades\Excel::download($export, $filename);
        }
        
        // Fallback to CSV
        $csv = '';
        foreach ($exportData as $row) {
            $csv .= implode(',', array_map(fn($item) => '"' . str_replace('"', '""', $item) . '"', $row)) . "\n";
        }
        
        return response($csv)
            ->header('Content-Type', 'text/csv; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="' . str_replace('.xlsx', '.csv', $filename) . '"');
    }

    // ─── Show (admin) ────────────────────────────────────────────────────────

    /**
     * GET /api/report-tables/responses/{response}
     * Tək bir cavabın detalları (admin baxışı).
     */
    public function show(ReportTableResponse $response): JsonResponse
    {
        $response->load(['reportTable', 'institution', 'respondent.profile']);

        return $this->successResponse($this->formatResponseDetailed($response), 'Cavab uğurla alındı.');
    }

    // ─── Formatters ──────────────────────────────────────────────────────────

    private function formatResponse(ReportTableResponse $response): array
    {
        return [
            'id'              => $response->id,
            'report_table_id' => $response->report_table_id,
            'institution_id'  => $response->institution_id,
            'respondent_id'   => $response->respondent_id,
            'rows'            => $response->rows,
            'status'          => $response->status,
            'submitted_at'    => $response->submitted_at,
            'row_statuses'    => $response->row_statuses ?? [],
            'created_at'      => $response->created_at,
            'updated_at'      => $response->updated_at,
            'report_table'    => $response->relationLoaded('reportTable') && $response->reportTable ? [
                'id'      => $response->reportTable->id,
                'title'   => $response->reportTable->title,
                'columns' => $response->reportTable->columns,
                'max_rows'=> $response->reportTable->max_rows,
                'status'  => $response->reportTable->status,
                'deadline'=> $response->reportTable->deadline,
            ] : null,
            'institution'     => $response->relationLoaded('institution') && $response->institution ? [
                'id'   => $response->institution->id,
                'name' => $response->institution->name,
            ] : null,
        ];
    }

    private function formatResponseDetailed(ReportTableResponse $response): array
    {
        return array_merge($this->formatResponse($response), [
            'respondent' => $response->relationLoaded('respondent') && $response->respondent ? [
                'id'   => $response->respondent->id,
                'name' => $response->respondent->profile?->full_name ?? $response->respondent->username,
            ] : null,
        ]);
    }
}
