<?php

namespace App\Http\Controllers;

use App\Models\ReportTableResponse;
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
            'status'    => 'nullable|string|in:draft,published,archived,deleted',
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

            $institutionId = $user->institution_id;
            $statusesByTableId = [];
            $rowStatsByTableId = [];
            if ($institutionId && $tables->isNotEmpty()) {
                $responses = ReportTableResponse::query()
                    ->where('institution_id', $institutionId)
                    ->whereIn('report_table_id', $tables->pluck('id')->all())
                    ->get(['id', 'report_table_id', 'status', 'row_statuses']);
                
                foreach ($responses as $response) {
                    $statusesByTableId[$response->report_table_id] = $response->status;
                    
                    // Calculate row stats
                    $rowStatuses = $response->row_statuses ?? [];
                    $totalRows = count($rowStatuses);
                    $completedRows = 0;
                    foreach ($rowStatuses as $idx => $meta) {
                        if (($meta['status'] ?? null) === 'submitted' || ($meta['status'] ?? null) === 'approved') {
                            $completedRows++;
                        }
                    }
                    $rowStatsByTableId[$response->report_table_id] = [
                        'total' => $totalRows,
                        'completed' => $completedRows,
                    ];
                }
            }

            $formatted = $tables->map(function ($table) use ($statusesByTableId, $rowStatsByTableId) {
                return array_merge($this->formatTable($table), [
                    'my_response_status' => $statusesByTableId[$table->id] ?? null,
                    'my_response_row_stats' => $rowStatsByTableId[$table->id] ?? ['total' => 0, 'completed' => 0],
                ]);
            });

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
            'notes'                  => 'nullable|string|max:5000',
            'columns'                => 'required|array|min:1',
            'columns.*.key'          => 'required|string|max:64',
            'columns.*.label'        => 'required|string|max:255',
            'columns.*.type'         => 'required|string|in:text,number,date,select,boolean,calculated,file,signature,gps',
            'columns.*.hint'         => 'nullable|string|max:500',
            'columns.*.required'     => 'nullable|boolean',
            'columns.*.min'          => 'nullable|numeric',
            'columns.*.max'          => 'nullable|numeric',
            'columns.*.min_length'   => 'nullable|integer|min:0|max:10000',
            'columns.*.max_length'   => 'nullable|integer|min:0|max:10000',
            'columns.*.options'      => 'nullable|array',
            'columns.*.options.*'    => 'string|max:255',
            'columns.*.formula'      => 'nullable|string|max:2000',
            'columns.*.format'       => 'nullable|string|in:number,currency,percent',
            'columns.*.decimals'     => 'nullable|integer|min:0|max:10',
            'columns.*.accepted_types'   => 'nullable|array',
            'columns.*.accepted_types.*' => 'string|max:100',
            'columns.*.max_file_size'    => 'nullable|numeric|min:0|max:1000',
            'columns.*.signature_width'  => 'nullable|integer|min:50|max:3000',
            'columns.*.signature_height' => 'nullable|integer|min:50|max:3000',
            'columns.*.gps_precision'    => 'nullable|string|in:high,medium,low',
            'columns.*.gps_radius'       => 'nullable|numeric|min:0|max:100000',
            'max_rows'               => 'nullable|integer|min:1|max:500',
            'fixed_rows'             => 'nullable|array',
            'fixed_rows.*.id'        => 'required|string|max:64',
            'fixed_rows.*.label'     => 'required|string|max:255',
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
            'notes'                  => 'nullable|string|max:5000',
            'columns'                => 'sometimes|required|array|min:1',
            'columns.*.key'          => 'required_with:columns|string|max:64',
            'columns.*.label'        => 'required_with:columns|string|max:255',
            'columns.*.type'         => 'required_with:columns|string|in:text,number,date,select,boolean,calculated,file,signature,gps',
            'columns.*.hint'         => 'nullable|string|max:500',
            'columns.*.required'     => 'nullable|boolean',
            'columns.*.min'          => 'nullable|numeric',
            'columns.*.max'          => 'nullable|numeric',
            'columns.*.min_length'   => 'nullable|integer|min:0|max:10000',
            'columns.*.max_length'   => 'nullable|integer|min:0|max:10000',
            'columns.*.options'      => 'nullable|array',
            'columns.*.options.*'    => 'string|max:255',
            'columns.*.formula'      => 'nullable|string|max:2000',
            'columns.*.format'       => 'nullable|string|in:number,currency,percent',
            'columns.*.decimals'     => 'nullable|integer|min:0|max:10',
            'columns.*.accepted_types'   => 'nullable|array',
            'columns.*.accepted_types.*' => 'string|max:100',
            'columns.*.max_file_size'    => 'nullable|numeric|min:0|max:1000',
            'columns.*.signature_width'  => 'nullable|integer|min:50|max:3000',
            'columns.*.signature_height' => 'nullable|integer|min:50|max:3000',
            'columns.*.gps_precision'    => 'nullable|string|in:high,medium,low',
            'columns.*.gps_radius'       => 'nullable|numeric|min:0|max:100000',
            'max_rows'               => 'nullable|integer|min:1|max:500',
            'fixed_rows'             => 'nullable|array',
            'fixed_rows.*.id'        => 'required|string|max:64',
            'fixed_rows.*.label'     => 'required|string|max:255',
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

    // ─── Restore / Force Delete ──────────────────────────────────────────────

    /**
     * POST /api/report-tables/{tableId}/restore
     * Soft-deleted cədvəli bərpa edir (SuperAdmin only).
     * Raw int param — Route Model Binding soft-deleted-ləri buraxmır.
     */
    public function restore(int $tableId): JsonResponse
    {
        try {
            $table = $this->service->restoreTable($tableId);

            return $this->successResponse($this->formatTableDetailed($table), 'Hesabat cədvəli uğurla bərpa edildi.');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return $this->errorResponse('Cədvəl tapılmadı.', 404);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/report-tables/{tableId}/force
     * Cədvəli birdəfəlik silir (SuperAdmin only).
     * Raw int param — Route Model Binding soft-deleted-ləri buraxmır.
     */
    public function forceDestroy(int $tableId): JsonResponse
    {
        try {
            $this->service->forceDeleteTable($tableId);

            return $this->successResponse(null, 'Hesabat cədvəli birdəfəlik silindi.');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return $this->errorResponse('Cədvəl tapılmadı.', 404);
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

    /**
     * POST /api/report-tables/{table}/unarchive
     */
    public function unarchive(ReportTable $table): JsonResponse
    {
        try {
            $updated = $this->service->unarchiveTable($table);

            return $this->successResponse($this->formatTableDetailed($updated), 'Hesabat cədvəli uğurla arxivdən çıxarıldı.');
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    // ─── Responses: Admin View ────────────────────────────────────────────────

    /**
     * GET /api/report-tables/{table}/responses/all
     * Bir cədvəl üçün bütün cavabların siyahısı (paginasyon olmadan).
     * Analytics üçün istifadə olunur.
     */
    public function getAllResponses(Request $request, ReportTable $table): JsonResponse
    {
        $user = Auth::user();

        try {
            $responses = $this->responseService->getAllResponsesForTable($table, $user);

            return $this->successResponse($responses, 'Bütün cavablar uğurla alındı.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * GET /api/report-tables/{table}/responses
     * Bir cədvəl üçün bütün cavabların siyahısı (admin).
     * SektorAdmin yalnız öz sektorunun məktəblərinin cavablarını görür.
     */
    public function responses(Request $request, ReportTable $table): JsonResponse
    {
        $filters = $request->validate([
            'status'         => 'nullable|string|in:draft,submitted',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'per_page'       => 'nullable|integer|min:1|max:200',
        ]);

        $perPage = $filters['per_page'] ?? 50;
        $user = Auth::user();

        try {
            $responses = $this->responseService->getResponsesForTable($table, $filters, $perPage, $user);

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
            // Check if there are any responses to export
            $responses = $this->responseService->getAllResponsesForExport($table);
            
            if ($responses->isEmpty()) {
                return $this->errorResponse('Export üçün cavab tapılmadı. Məktəblər hələ cavab göndərməyib.', 404);
            }
            
            return $this->exportService->export($table);
        } catch (\Exception $e) {
            \Log::error('Export error: ' . $e->getMessage());
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * GET /api/report-tables/{table}/export/approved
     * Yalnız təsdiqlənmiş (approved) sətirləri Excel formatında export edir (Hazır tabı üçün).
     */
    public function exportApproved(ReportTable $table): mixed
    {
        try {
            return $this->exportService->exportApprovedRows($table);
        } catch (\Exception $e) {
            \Log::error('Export approved rows error: ' . $e->getMessage());
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * GET /api/report-tables/{table}/export/my
     * Məktəbin öz cavabını Excel formatında export edir.
     */
    public function exportMyResponse(ReportTable $table): mixed
    {
        try {
            $user = Auth::user();
            $institutionId = $user->institution_id;
            
            if (!$institutionId) {
                return $this->errorResponse('Müəssisə tapılmadı.', 403);
            }
            
            // Check if response exists
            $response = $table->responses()
                ->where('institution_id', $institutionId)
                ->first();
                
            if (!$response) {
                return $this->errorResponse('Bu cədvəl üçün cavab tapılmadı.', 404);
            }
            
            return $this->exportService->exportSingleInstitution($table, $institutionId);
        } catch (\Exception $e) {
            \Log::error('Single institution export error: ' . $e->getMessage());
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * GET /api/report-tables/{table}/analytics
     * Cədvəl üçün hesablanmış analytics metrikləri (sürətli summary endpoint)
     */
    public function analyticsSummary(ReportTable $table): mixed
    {
        try {
            $user = Auth::user();
            
            // İcazə yoxlaması:
            // - Admin: report_tables.read -> full analytics
            // - School: report_table_responses.write -> only own institution analytics
            $canReadAll = $user->hasPermission('report_tables.read');
            $canSchoolWrite = $user->hasPermission('report_table_responses.write');
            if (! $canReadAll && ! $canSchoolWrite) {
                return $this->errorResponse('Bu əməliyyat üçün icazəniz yoxdur.', 403);
            }

            $institutionId = $user->institution_id;
            if (! $canReadAll) {
                if (! $institutionId) {
                    return $this->errorResponse('Müəssisə tapılmadı.', 403);
                }
            }

            // Hədəf müəssisələri
            $targetInstitutionIds = $table->target_institutions ?? [];
            $targetCount = count($targetInstitutionIds);
            
            // Cavabları yüklə (yalnız lazım olan sütunlar)
            $responsesQuery = $table->responses()
                ->with(['institution:id,name,parent_id', 'institution.parent:id,name'])
                ->select(['id', 'report_table_id', 'institution_id', 'status', 'rows', 'row_statuses', 'submitted_at'])
                ;

            if (! $canReadAll) {
                // School user: only own institution response
                $responsesQuery->where('institution_id', $institutionId);
            }

            $responses = $responsesQuery->get();

            // Statistikalar hesabla
            $institutionIdsWithResponses = $responses->pluck('institution_id')->unique()->toArray();
            $institutionCount = count($institutionIdsWithResponses);
            
            // Status breakdown
            $submittedCount = $responses->where('status', 'submitted')->count();
            $draftCount = $responses->where('status', 'draft')->count();
            $approvedCount = $responses->where('status', 'approved')->count();
            
            // Sətir səviyyəsində statistikalar
            $totalRows = 0;
            $submittedRows = 0;
            $approvedRows = 0;
            $rejectedRows = 0;
            
            foreach ($responses as $response) {
                $rows = $response->rows ?? [];
                $rowStatuses = $response->row_statuses ?? [];
                $totalRows += count($rows);
                
                foreach ($rowStatuses as $status) {
                    $statusValue = is_array($status) ? ($status['status'] ?? null) : null;
                    if ($statusValue === 'submitted') $submittedRows++;
                    elseif ($statusValue === 'approved') $approvedRows++;
                    elseif ($statusValue === 'rejected') $rejectedRows++;
                }
            }
            
            // İştirak faizi
            if (! $canReadAll) {
                $targetCount = 1;
                $participationRate = $institutionCount > 0 ? 100.0 : 0.0;
            } else {
                $participationRate = $targetCount > 0 
                    ? round(($institutionCount / $targetCount) * 100, 1) 
                    : 0;
            }
            
            // Sektorlar üzrə qruplaşdırma
            $sectorStats = [];
            foreach ($responses as $response) {
                $institution = $response->institution;
                if (! $institution) continue;
                
                $sectorId = $institution->parent_id ?? 0;
                $sectorName = $institution->parent?->name ?? 'Sektorsuz';
                
                if (! isset($sectorStats[$sectorId])) {
                    $sectorStats[$sectorId] = [
                        'id' => $sectorId,
                        'name' => $sectorName,
                        'total_schools' => 0,
                        'responded' => 0,
                        'submitted' => 0,
                        'draft' => 0,
                    ];
                }
                
                $sectorStats[$sectorId]['responded']++;
                if ($response->status === 'submitted') {
                    $sectorStats[$sectorId]['submitted']++;
                } elseif ($response->status === 'draft') {
                    $sectorStats[$sectorId]['draft']++;
                }
            }
            
            // Hədəf sektorlardakı bütün məktəbləri say (əgər target_institutions varsa)
            if ($canReadAll && ! empty($targetInstitutionIds)) {
                $targetInstitutions = \App\Models\Institution::whereIn('id', $targetInstitutionIds)
                    ->with('parent:id,name')
                    ->select(['id', 'parent_id'])
                    ->get();
                    
                foreach ($targetInstitutions as $inst) {
                    $sectorId = $inst->parent_id ?? 0;
                    if (isset($sectorStats[$sectorId])) {
                        $sectorStats[$sectorId]['total_schools']++;
                    } else {
                        // Hədəf müəssisə cavab verməyibsə, statistikaya əks etdirmək lazımdır
                        $sectorName = $inst->parent?->name ?? 'Sektorsuz';
                        $sectorStats[$sectorId] = [
                            'id' => $sectorId,
                            'name' => $sectorName,
                            'total_schools' => 1,
                            'responded' => 0,
                            'submitted' => 0,
                            'draft' => 0,
                        ];
                    }
                }
            }
            
            // Doldurmayan məktəblər
            $nonFillingSchools = [];
            if ($canReadAll && ! empty($targetInstitutionIds)) {
                $respondingIds = $responses->pluck('institution_id')->toArray();
                $nonFillingIds = array_diff($targetInstitutionIds, $respondingIds);
                
                if (! empty($nonFillingIds)) {
                    $nonFillingSchools = \App\Models\Institution::whereIn('id', $nonFillingIds)
                        ->with('parent:id,name')
                        ->select(['id', 'name', 'parent_id'])
                        ->get()
                        ->map(fn ($inst) => [
                            'id' => $inst->id,
                            'name' => $inst->name,
                            'sector' => $inst->parent?->name ?? 'Sektorsuz',
                        ])
                        ->toArray();
                }
            }

            return $this->successResponse([
                'table_id' => $table->id,
                'table_title' => $table->title,
                'generated_at' => now()->toISOString(),
                'summary' => [
                    'target_institutions' => $targetCount,
                    'responded_institutions' => $institutionCount,
                    'participation_rate' => $participationRate,
                    'responses' => [
                        'total' => $responses->count(),
                        'draft' => $draftCount,
                        'submitted' => $submittedCount,
                        'approved' => $approvedCount,
                    ],
                    'rows' => [
                        'total' => $totalRows,
                        'submitted' => $submittedRows,
                        'approved' => $approvedRows,
                        'rejected' => $rejectedRows,
                        'pending_approval' => $submittedRows - $approvedRows - $rejectedRows,
                    ],
                ],
                'sectors' => array_values($sectorStats),
                'non_filling_schools' => $nonFillingSchools,
            ], 'Analytics summary');
            
        } catch (\Exception $e) {
            \Log::error('Analytics summary error: ' . $e->getMessage());
            return $this->errorResponse('Analytics məlumatları əldə edilə bilmədi: ' . $e->getMessage(), 500);
        }
    }

    // ─── Template Methods ───────────────────────────────────────────────────

    /**
     * POST /api/report-tables/{table}/save-as-template
     * Cədvəli şablon kimi saxla
     */
    public function saveAsTemplate(ReportTable $table): mixed
    {
        try {
            $category = request('category', null);
            $template = $this->service->saveAsTemplate($table, $category);
            
            return $this->successResponse(
                $this->formatTable($template),
                'Cədvəl şablon kimi saxlanıldı.'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * POST /api/report-tables/templates
     * Şablondan yeni cədvəl yarat
     */
    public function createFromTemplate(): mixed
    {
        try {
            $data = request()->validate([
                'template_id' => 'required|integer|exists:report_tables,id',
                'title' => 'required|string|max:300',
            ]);

            $template = ReportTable::findOrFail($data['template_id']);
            $user = Auth::user();

            $newTable = $this->service->cloneFromTemplate($template, $data['title'], $user->id);

            return $this->successResponse(
                $this->formatTable($newTable),
                'Yeni cədvəl şablondan yaradıldı.',
                201
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * GET /api/report-tables/templates/list
     * Bütün şablonları gətir
     */
    public function getTemplates(): mixed
    {
        try {
            $category = request('category', null);
            $user = Auth::user();
            
            $templates = $this->service->getTemplates($category, $user->id);

            return $this->successResponse($templates, 'Şablonlar siyahısı.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/report-tables/{table}/remove-template
     * Şablon statusunu sil
     */
    public function removeTemplateStatus(ReportTable $table): mixed
    {
        try {
            $table = $this->service->removeTemplateStatus($table);
            
            return $this->successResponse(
                $this->formatTable($table),
                'Şablon statusu silindi.'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    // ─── Formatters ──────────────────────────────────────────────────────────

    private function formatTable(ReportTable $table): array
    {
        return [
            'id'                  => $table->id,
            'title'               => $table->title,
            'description'         => $table->description,
            'notes'               => $table->notes,
            'status'              => $table->status,
            'is_template'         => $table->is_template,
            'cloned_from_id'      => $table->cloned_from_id,
            'template_category'   => $table->template_category,
            'columns'             => $table->columns,
            'fixed_rows'          => $table->fixed_rows,
            'max_rows'            => $table->max_rows,
            'target_institutions' => $table->target_institutions,
            'deadline'            => $table->deadline,
            'published_at'        => $table->published_at,
            'archived_at'         => $table->archived_at,
            'deleted_at'          => $table->deleted_at?->toISOString(),
            'is_deleted'          => $table->trashed(),
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
