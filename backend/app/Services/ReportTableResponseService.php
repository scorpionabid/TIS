<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\ReportTable;
use App\Models\ReportTableResponse;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReportTableResponseService
{
    // ─── Start or Get ─────────────────────────────────────────────────────────

    /**
     * Mövcud cavabı qaytarır, yoxdursa yeni draft yaradır.
     * Bir məktəb bir cədvəl üçün yalnız bir cavab verə bilər (UNIQUE constraint).
     */
    public function startOrGet(ReportTable $table, User $user): ReportTableResponse
    {
        $institutionId = $user->institution_id;

        if (! $institutionId) {
            throw new \InvalidArgumentException('Cavab vermək üçün müəssisəyə aid olmalısınız.');
        }

        if (! $table->canInstitutionRespond($institutionId)) {
            throw new \InvalidArgumentException('Bu cədvəl sizin müəssisənizə əlçatan deyil və ya dərc edilməyib.');
        }

        // Mövcud cavabı qaytarır (istənilən statusda)
        $existing = ReportTableResponse::where('report_table_id', $table->id)
            ->where('institution_id', $institutionId)
            ->first();

        if ($existing) {
            return $existing->load(['reportTable', 'institution', 'respondent']);
        }

        // Yeni draft yaradır
        return DB::transaction(function () use ($table, $user, $institutionId) {
            $response = ReportTableResponse::create([
                'report_table_id' => $table->id,
                'institution_id'  => $institutionId,
                'respondent_id'   => $user->id,
                'rows'            => [],
                'status'          => 'draft',
            ]);

            return $response->load(['reportTable', 'institution', 'respondent']);
        });
    }

    // ─── Save ────────────────────────────────────────────────────────────────

    /**
     * Cavabı saxlayır.
     * Təsdiqlənmiş (submitted/approved) sətirləri qoruyur — onlar üzərindən yazılmır.
     */
    public function save(ReportTableResponse $response, array $rows, User $user): ReportTableResponse
    {
        if ($response->respondent_id !== $user->id) {
            throw new \InvalidArgumentException('Yalnız öz cavabınızı yeniləyə bilərsiniz.');
        }

        if (! in_array($response->status, ['draft', 'submitted'], true)) {
            throw new \InvalidArgumentException('Cavab statusu dəyişdirilə bilmir.');
        }

        $response->loadMissing(['reportTable']);
        $table = $response->reportTable;

        // Kilidlənmiş sətirləri qoru (submitted/approved)
        $existingStatuses = $response->row_statuses ?? [];
        $existingRows     = $response->rows ?? [];
        $mergedRows       = $rows;

        foreach ($rows as $idx => $row) {
            $rowStatus = $existingStatuses[$idx]['status'] ?? null;
            if (in_array($rowStatus, ['submitted', 'approved'], true)) {
                $mergedRows[$idx] = $existingRows[$idx] ?? $row;
            }
        }

        $this->validateRows($mergedRows, $table->columns ?? [], $table->max_rows ?? 50);

        return DB::transaction(function () use ($response, $mergedRows) {
            $response->rows = $mergedRows;
            $response->save();

            return $response->fresh(['reportTable', 'institution', 'respondent']);
        });
    }

    // ─── Submit ──────────────────────────────────────────────────────────────

    /**
     * Cavabı submit edir.
     */
    public function submit(ReportTableResponse $response, User $user): ReportTableResponse
    {
        if ($response->respondent_id !== $user->id) {
            throw new \InvalidArgumentException('Yalnız öz cavabınızı göndərə bilərsiniz.');
        }

        if (! $response->isDraft()) {
            throw new \InvalidArgumentException('Cavab artıq göndərilib.');
        }

        $response->loadMissing(['reportTable']);
        $table = $response->reportTable;

        $rows = $response->rows ?? [];

        if (empty($rows)) {
            throw ValidationException::withMessages([
                'rows' => ['Göndərmək üçün ən azı bir sətir daxil edilməlidir.'],
            ]);
        }

        $this->validateRows($rows, $table->columns ?? [], $table->max_rows ?? 50);

        return DB::transaction(function () use ($response) {
            $response->submit();

            return $response->fresh(['reportTable', 'institution', 'respondent']);
        });
    }

    // ─── Admin: Get Responses for a Table ─────────────────────────────────────

    /**
     * Bir cədvəl üçün bütün cavabları qaytarır (admin baxışı).
     * SektorAdmin yalnız öz sektorunun məktəblərinin cavablarını görür.
     */
    public function getResponsesForTable(ReportTable $table, array $filters = [], int $perPage = 50, ?User $user = null): \Illuminate\Pagination\LengthAwarePaginator
    {
        $query = ReportTableResponse::with(['institution.parent', 'respondent.profile'])
            ->where('report_table_id', $table->id);

        // Filter by status if provided
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Filter by institution_id if provided
        if (! empty($filters['institution_id'])) {
            $query->where('institution_id', $filters['institution_id']);
        }

        // SECTOR FILTER: If user is sektoradmin, only show responses from their sector's schools
        if ($user && $user->hasRole('sektoradmin')) {
            $allowedInstitutionIds = $this->getReviewableInstitutionIds($user);
            if (!empty($allowedInstitutionIds)) {
                $query->whereIn('institution_id', $allowedInstitutionIds);
            } else {
                // If no allowed institutions, return empty result
                $query->whereRaw('1 = 0');
            }
        }

        $query->orderBy('updated_at', 'desc');

        return $query->paginate($perPage);
    }

    /**
     * Bütün cavabları export üçün qaytarır (paginate yoxdur).
     */
    public function getAllResponsesForExport(ReportTable $table): \Illuminate\Database\Eloquent\Collection
    {
        return ReportTableResponse::with(['institution', 'respondent.profile'])
            ->where('report_table_id', $table->id)
            ->orderBy('institution_id')
            ->get();
    }

    // ─── Row Actions ─────────────────────────────────────────────────────────

    /**
     * Sətiri təsdiq üçün göndərir (məktəb tərəfindən).
     */
    public function submitRow(ReportTableResponse $response, int $rowIndex, User $user): ReportTableResponse
    {
        if ($response->respondent_id !== $user->id) {
            throw new \InvalidArgumentException('Yalnız öz cavabınızın sətirini göndərə bilərsiniz.');
        }

        if (! $response->isRowEditable($rowIndex)) {
            throw new \InvalidArgumentException('Bu sətir artıq göndərilib və ya təsdiqlənib.');
        }

        $rows = $response->rows ?? [];
        if (! isset($rows[$rowIndex])) {
            throw new \InvalidArgumentException('Sətir tapılmadı.');
        }

        // Sətir ən azı bir qeyri-boş dəyər olmalıdır
        $hasContent = collect($rows[$rowIndex])->some(fn ($v) => $v !== null && $v !== '');
        if (! $hasContent) {
            throw new \InvalidArgumentException('Boş sətiri göndərmək olmaz.');
        }

        $response->submitRow($rowIndex, $user->id);

        return $response->fresh(['reportTable', 'institution', 'respondent']);
    }

    /**
     * Sətiri təsdiqləyir (admin tərəfindən).
     */
    public function approveRow(ReportTableResponse $response, int $rowIndex, User $reviewer): ReportTableResponse
    {
        $this->checkReviewerHierarchyAccess($response, $reviewer);

        $status = $response->getRowStatus($rowIndex)['status'] ?? null;
        if ($status !== 'submitted') {
            throw new \InvalidArgumentException('Sətir təsdiq üçün göndərilməyib.');
        }

        $response->approveRow($rowIndex, $reviewer->id);

        return $response->fresh(['reportTable', 'institution', 'respondent']);
    }

    /**
     * Sətiri rədd edir (admin tərəfindən).
     */
    public function rejectRow(ReportTableResponse $response, int $rowIndex, User $reviewer, string $reason): ReportTableResponse
    {
        $this->checkReviewerHierarchyAccess($response, $reviewer);

        $status = $response->getRowStatus($rowIndex)['status'] ?? null;
        if ($status !== 'submitted') {
            throw new \InvalidArgumentException('Sətir təsdiq üçün göndərilməyib.');
        }

        $response->rejectRow($rowIndex, $reviewer->id, $reason);

        return $response->fresh(['reportTable', 'institution', 'respondent']);
    }

    /**
     * Sətiri qaralamaya qaytarır (admin tərəfindən — məktəb yenidən redaktə edə bilsin).
     */
    public function returnRowToDraft(ReportTableResponse $response, int $rowIndex, User $reviewer): ReportTableResponse
    {
        $this->checkReviewerHierarchyAccess($response, $reviewer);

        $response->returnRowToDraft($rowIndex);

        return $response->fresh(['reportTable', 'institution', 'respondent']);
    }

    // ─── Approval Queue ──────────────────────────────────────────────────────

    /**
     * Reviewer-in hüquqlu olduğu bütün cədvəllərdəki gözləyən sətirləri
     * Cədvəl → Cavab (məktəb) qruplamasında qaytarır.
     */
    public function getApprovalQueue(User $user): array
    {
        $institutionIds = $this->getReviewableInstitutionIds($user);

        if (empty($institutionIds)) {
            return [];
        }

        $responses = ReportTableResponse::with(['reportTable', 'institution.parent'])
            ->whereIn('institution_id', $institutionIds)
            ->whereNotNull('row_statuses')
            ->whereRaw("EXISTS (
                SELECT 1 FROM (
                    SELECT jsonb_array_elements(row_statuses) AS element
                    WHERE jsonb_typeof(row_statuses) = 'array'
                    UNION ALL
                    SELECT value AS element FROM jsonb_each(row_statuses)
                    WHERE jsonb_typeof(row_statuses) = 'object'
                ) sub
                WHERE element->>'status' = 'submitted'
            )")
            ->whereHas('reportTable', fn ($q) => $q->whereNull('deleted_at')->where('status', 'published'))
            ->get();

        $grouped = [];

        foreach ($responses as $response) {
            $tableId = $response->report_table_id;

            if (! isset($grouped[$tableId])) {
                $table = $response->reportTable;
                $grouped[$tableId] = [
                    'table' => [
                        'id'       => $table->id,
                        'title'    => $table->title,
                        'deadline' => $table->deadline?->toISOString(),
                        'columns'  => $table->columns ?? [],
                    ],
                    'pending_count' => 0,
                    'responses'     => [],
                ];
            }

            $pendingIndices = [];
            foreach ($response->row_statuses as $idx => $meta) {
                if (($meta['status'] ?? null) === 'submitted') {
                    $pendingIndices[] = (int) $idx;
                    $grouped[$tableId]['pending_count']++;
                }
            }

            $institution = $response->institution;
            $grouped[$tableId]['responses'][] = [
                'id'                  => $response->id,
                'institution_id'      => $response->institution_id,
                'institution'         => [
                    'id'     => $institution->id,
                    'name'   => $institution->name,
                    'parent' => $institution->parent
                        ? ['id' => $institution->parent->id, 'name' => $institution->parent->name]
                        : null,
                ],
                'rows'                => $response->rows ?? [],
                'row_statuses'        => $response->row_statuses ?? [],
                'pending_row_indices' => $pendingIndices,
            ];
        }

        return array_values($grouped);
    }

    /**
     * Bir cədvəl üçün seçilmiş sətirləri toplu şəkildə emal edir (approve/reject/return).
     * Hər rowSpec: {response_id, row_indices[]}.
     * Returns: {successful, failed, errors[]}.
     */
    public function bulkRowAction(
        ReportTable $table,
        array $rowSpecs,
        string $action,
        ?string $reason,
        User $reviewer
    ): array {
        $successful = 0;
        $errors     = [];

        DB::transaction(function () use ($table, $rowSpecs, $action, $reason, $reviewer, &$successful, &$errors) {
            foreach ($rowSpecs as $spec) {
                $responseId = $spec['response_id'] ?? null;
                $rowIndices = $spec['row_indices'] ?? [];

                $response = ReportTableResponse::find($responseId);
                if (! $response || $response->report_table_id !== $table->id) {
                    $errors[] = ['response_id' => $responseId, 'error' => 'Cavab tapılmadı'];
                    continue;
                }

                try {
                    $this->checkReviewerHierarchyAccess($response, $reviewer);
                } catch (\Throwable $e) {
                    $errors[] = ['response_id' => $responseId, 'error' => $e->getMessage()];
                    continue;
                }

                foreach ($rowIndices as $rowIndex) {
                    $idx    = (int) $rowIndex;
                    $status = $response->getRowStatus($idx)['status'] ?? null;

                    if ($status !== 'submitted') {
                        $errors[] = [
                            'response_id' => $responseId,
                            'row_index'   => $idx,
                            'error'       => 'Sətir submitted statusunda deyil',
                        ];
                        continue;
                    }

                    match ($action) {
                        'approve' => $response->approveRow($idx, $reviewer->id),
                        'reject'  => $response->rejectRow($idx, $reviewer->id, $reason ?? ''),
                        'return'  => $response->returnRowToDraft($idx),
                    };

                    $successful++;
                }
            }
        });

        return ['successful' => $successful, 'failed' => count($errors), 'errors' => $errors];
    }

    /**
     * Reviewer-in bu responsa baxmaq hüququnu yoxlayır.
     * SektorAdmin: yalnız birbaşa öz sektoruna aid məktəblər.
     * RegionAdmin/Operator: öz region hierarchiyasındakı bütün məktəblər.
     * SuperAdmin: məhdudiyyətsiz.
     */
    private function checkReviewerHierarchyAccess(ReportTableResponse $response, User $reviewer): void
    {
        if ($reviewer->hasRole('superadmin')) {
            return;
        }

        $response->loadMissing('institution');
        $responseInstitutionId = $response->institution_id;

        $allowedIds = $this->getReviewableInstitutionIds($reviewer);

        if (! in_array($responseInstitutionId, $allowedIds, true)) {
            abort(403, 'Bu məktəbin məlumatlarını təsdiqləmək icazəniz yoxdur.');
        }
    }

    /**
     * Reviewer-in hüquqlu olduğu müəssisə ID-lərini qaytarır.
     */
    private function getReviewableInstitutionIds(User $user): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }

        $institution = $user->institution;
        if (! $institution) {
            return [];
        }

        if ($user->hasRole('sektoradmin')) {
            // Sektor admin: yalnız birbaşa öz sektorunun altındakı məktəblər
            return Institution::where('parent_id', $institution->id)->pluck('id')->toArray();
        }

        // regionadmin / regionoperator: bütün hierarchiyadakı məktəblər (özü daxil olmadan)
        $allChildrenIds = $institution->getAllChildrenIds();
        
        // Öz ID-sini çıxar (region özü məktəb deyil, cavabı olmamalı)
        return array_values(array_diff($allChildrenIds, [$institution->id]));
    }

    // ─── Row Validation ──────────────────────────────────────────────────────

    /**
     * Sətirləri cədvəlin sütun strukturuna uyğun yoxlayır.
     */
    public function validateRows(array $rows, array $columns, int $maxRows): void
    {
        $errors = [];

        if (count($rows) > $maxRows) {
            throw ValidationException::withMessages([
                'rows' => ["Maksimum {$maxRows} sətir əlavə edilə bilər."],
            ]);
        }

        $validKeys = array_column($columns, 'key');
        $columnTypes = [];
        $columnLabels = [];

        $columnOptions = [];

        foreach ($columns as $col) {
            $columnTypes[$col['key']]   = $col['type'] ?? 'text';
            $columnLabels[$col['key']]  = $col['label'] ?? $col['key'];
            $columnOptions[$col['key']] = $col['options'] ?? [];
        }

        foreach ($rows as $rowIndex => $row) {
            $pos = $rowIndex + 1;

            if (! is_array($row)) {
                $errors["rows.{$rowIndex}"] = ["{$pos}. sətir düzgün formatda deyil."];
                continue;
            }

            foreach ($row as $colKey => $cellValue) {
                if (! in_array($colKey, $validKeys, true)) {
                    continue; // Naməlum sütunları keç
                }

                // Boş dəyərləri keç
                if ($cellValue === null || $cellValue === '') {
                    continue;
                }

                $colType    = $columnTypes[$colKey] ?? 'text';
                $colLabel   = $columnLabels[$colKey] ?? $colKey;
                $colOptions = $columnOptions[$colKey] ?? [];

                switch ($colType) {
                    case 'number':
                        if (! is_numeric($cellValue)) {
                            $errors["rows.{$rowIndex}.{$colKey}"] = ["{$pos}. sətir, \"{$colLabel}\" sütununda rəqəm gözlənilir."];
                        }
                        break;
                    case 'date':
                        if (! $this->isValidDate((string) $cellValue)) {
                            $errors["rows.{$rowIndex}.{$colKey}"] = ["{$pos}. sətir, \"{$colLabel}\" sütununda düzgün tarix formatı gözlənilir (YYYY-MM-DD)."];
                        }
                        break;
                    case 'select':
                        if (! empty($colOptions) && ! in_array($cellValue, $colOptions, true)) {
                            $errors["rows.{$rowIndex}.{$colKey}"] = ["{$pos}. sətir, \"{$colLabel}\" sütununda yanlış seçim: {$cellValue}"];
                        }
                        break;
                    case 'boolean':
                        $booleanValues = ['bəli', 'xeyr', 'true', 'false', '1', '0', 'yes', 'no'];
                        if (! in_array(strtolower((string) $cellValue), $booleanValues, true)) {
                            $errors["rows.{$rowIndex}.{$colKey}"] = ["{$pos}. sətir, \"{$colLabel}\" sütununda 'Bəli' və ya 'Xeyr' seçin."];
                        }
                        break;
                    case 'text':
                    default:
                        if (! is_string($cellValue) && ! is_numeric($cellValue)) {
                            $errors["rows.{$rowIndex}.{$colKey}"] = ["{$pos}. sətir, \"{$colLabel}\" sütununda mətn gözlənilir."];
                        }
                        break;
                }
            }
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function isValidDate(string $value): bool
    {
        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return false;
        }

        [$year, $month, $day] = explode('-', $value);

        return checkdate((int) $month, (int) $day, (int) $year);
    }
}
