<?php

namespace App\Http\Controllers;

use App\Models\ReportTable;
use App\Models\ReportTableResponse;
use App\Services\ReportTableResponseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class ReportTableResponseController extends BaseController
{
    public function __construct(
        private readonly ReportTableResponseService $service,
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
            $updated = $this->service->approveRow($response, $validated['row_index'], Auth::user());

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
            $updated = $this->service->rejectRow($response, $validated['row_index'], Auth::user(), $validated['reason']);

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
            $updated = $this->service->returnRowToDraft($response, $validated['row_index'], Auth::user());

            return $this->successResponse($this->formatResponse($updated), 'Sətir redaktəyə qaytarıldı.');
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
        $data = $this->service->getApprovalQueue($request->user());

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

        $result = $this->service->bulkRowAction(
            $table,
            $request->row_specs,
            $request->action,
            $request->reason,
            $request->user()
        );

        return response()->json([
            'message'    => "{$result['successful']} sətir emal edildi.",
            'successful' => $result['successful'],
            'failed'     => $result['failed'],
            'errors'     => $result['errors'],
        ]);
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
