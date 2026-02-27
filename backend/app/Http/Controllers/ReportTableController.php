<?php

namespace App\Http\Controllers;

use App\Models\ReportTable;
use App\Services\ReportTableExportService;
use App\Services\ReportTableResponseService;
use App\Services\ReportTableService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class ReportTableController extends BaseController
{
    public function __construct(
        private readonly ReportTableService $service,
        private readonly ReportTableResponseService $responseService,
        private readonly ReportTableExportService $exportService,
    ) {}

    // ─── Admin: Siyahı ────────────────────────────────────────────────────────

    /**
     * GET /api/report-tables
     * Admin üçün hesabat cədvəllərinin siyahısı.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search'    => 'nullable|string|max:255',
            'status'    => 'nullable|string|in:draft,published,archived',
            'per_page'  => 'nullable|integer|min:1|max:100',
        ]);

        $perPage = $filters['per_page'] ?? 15;
        $user = Auth::user();

        try {
            $tables = $this->service->getPaginatedList($filters, $user, $perPage);

            // Məlumatları formatlayırıq ki, can_edit kimi attributlar gəlsin
            $tables->getCollection()->transform(fn ($table) => $this->formatTableDetailed($table));

            return $this->paginatedResponse($tables, 'Hesabat cədvəlləri uğurla alındı.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    // ─── Məktəb: Mənə aid cədvəllər ──────────────────────────────────────────

    /**
     * GET /api/report-tables/my
     * Məktəb istifadəçisi üçün ona aid edilmiş cədvəllər.
     */
    public function my(): JsonResponse
    {
        $user = Auth::user();

        try {
            $tables = $this->service->getMyTablesForSchool($user);

            $formatted = $tables->map(fn ($table) => $this->formatTable($table));

            return $this->successResponse($formatted, 'Hesabat cədvəlləri uğurla alındı.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    // ─── Show ────────────────────────────────────────────────────────────────

    /**
     * GET /api/report-tables/{table}
     */
    public function show(ReportTable $table): JsonResponse
    {
        $table->load(['creator']);
        $table->loadCount('responses');

        return $this->successResponse($this->formatTableDetailed($table), 'Hesabat cədvəli uğurla alındı.');
    }

    // ─── Create ──────────────────────────────────────────────────────────────

    /**
     * POST /api/report-tables
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'                  => 'required|string|max:300',
            'description'            => 'nullable|string|max:2000',
            'columns'                => 'required|array|min:1',
            'columns.*.key'          => 'required|string|max:64',
            'columns.*.label'        => 'required|string|max:255',
            'columns.*.type'         => 'required|string|in:text,number,date',
            'max_rows'               => 'nullable|integer|min:1|max:500',
            'target_institutions'    => 'nullable|array',
            'target_institutions.*'  => 'integer|exists:institutions,id',
            'deadline'               => 'nullable|date|after:now',
        ]);

        try {
            $table = $this->service->createTable($validated, Auth::user());

            return $this->successResponse($this->formatTableDetailed($table), 'Hesabat cədvəli uğurla yaradıldı.', 201);
        } catch (ValidationException $e) {
            return $this->errorResponse('Validasiya xətası.', 422, $e->errors());
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    // ─── Update ──────────────────────────────────────────────────────────────

    /**
     * PUT /api/report-tables/{table}
     */
    public function update(Request $request, ReportTable $table): JsonResponse
    {
        $validated = $request->validate([
            'title'                  => 'sometimes|required|string|max:300',
            'description'            => 'nullable|string|max:2000',
            'columns'                => 'sometimes|required|array|min:1',
            'columns.*.key'          => 'required_with:columns|string|max:64',
            'columns.*.label'        => 'required_with:columns|string|max:255',
            'columns.*.type'         => 'required_with:columns|string|in:text,number,date',
            'max_rows'               => 'nullable|integer|min:1|max:500',
            'target_institutions'    => 'nullable|array',
            'target_institutions.*'  => 'integer|exists:institutions,id',
            'deadline'               => 'nullable|date',
        ]);

        try {
            $updated = $this->service->updateTable($table, $validated);

            return $this->successResponse($this->formatTableDetailed($updated), 'Hesabat cədvəli uğurla yeniləndi.');
        } catch (ValidationException $e) {
            return $this->errorResponse('Validasiya xətası.', 422, $e->errors());
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    // ─── Delete ──────────────────────────────────────────────────────────────

    /**
     * DELETE /api/report-tables/{table}
     */
    public function destroy(ReportTable $table): JsonResponse
    {
        try {
            $this->service->deleteTable($table);

            return $this->successResponse(null, 'Hesabat cədvəli uğurla silindi.');
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    // ─── Publish / Archive ───────────────────────────────────────────────────

    /**
     * POST /api/report-tables/{table}/publish
     */
    public function publish(ReportTable $table): JsonResponse
    {
        try {
            $updated = $this->service->publishTable($table);

            return $this->successResponse($this->formatTableDetailed($updated), 'Hesabat cədvəli uğurla dərc edildi.');
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * POST /api/report-tables/{table}/archive
     */
    public function archive(ReportTable $table): JsonResponse
    {
        try {
            $updated = $this->service->archiveTable($table);

            return $this->successResponse($this->formatTableDetailed($updated), 'Hesabat cədvəli uğurla arxivləndi.');
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    // ─── Responses: Admin View ────────────────────────────────────────────────

    /**
     * GET /api/report-tables/{table}/responses
     * Bir cədvəl üçün bütün cavabların siyahısı (admin).
     */
    public function responses(Request $request, ReportTable $table): JsonResponse
    {
        $filters = $request->validate([
            'status'         => 'nullable|string|in:draft,submitted',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'per_page'       => 'nullable|integer|min:1|max:200',
        ]);

        $perPage = $filters['per_page'] ?? 50;

        try {
            $responses = $this->responseService->getResponsesForTable($table, $filters, $perPage);

            return $this->paginatedResponse($responses, 'Cavablar uğurla alındı.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    // ─── Export ──────────────────────────────────────────────────────────────

    /**
     * GET /api/report-tables/{table}/export
     * Bütün cavabları Excel formatında export edir.
     */
    public function export(ReportTable $table): mixed
    {
        try {
            return $this->exportService->export($table);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    // ─── Formatters ──────────────────────────────────────────────────────────

    private function formatTable(ReportTable $table): array
    {
        return [
            'id'                  => $table->id,
            'title'               => $table->title,
            'description'         => $table->description,
            'status'              => $table->status,
            'columns'             => $table->columns,
            'max_rows'            => $table->max_rows,
            'target_institutions' => $table->target_institutions,
            'deadline'            => $table->deadline,
            'published_at'        => $table->published_at,
            'archived_at'         => $table->archived_at,
            'creator'             => $table->creator ? [
                'id'   => $table->creator->id,
                'name' => $table->creator->profile?->full_name ?? $table->creator->username,
            ] : null,
            'created_at'          => $table->created_at,
            'updated_at'          => $table->updated_at,
        ];
    }

    private function formatTableDetailed(ReportTable $table): array
    {
        return array_merge($this->formatTable($table), [
            'responses_count' => $table->responses_count ?? null,
            'can_edit'        => $table->canEdit(),
            'can_edit_columns'=> $table->canEditColumns(),
        ]);
    }
}
