<?php

namespace App\Services;

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

        $existing = ReportTableResponse::where('report_table_id', $table->id)
            ->where('institution_id', $institutionId)
            ->first();

        if ($existing) {
            return $existing->load(['reportTable', 'institution', 'respondent']);
        }

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
     * Əgər cədvəldə allow_additional_rows_after_confirmation aktivdirsə, təsdiqləndikdən sonra da yeni sətir əlavə etməyə icazə verilir.
     */
    public function save(ReportTableResponse $response, array $rows, User $user): ReportTableResponse
    {
        if ($response->respondent_id !== $user->id) {
            throw new \InvalidArgumentException('Yalnız öz cavabınızı yeniləyə bilərsiniz.');
        }

        // Status yoxlaması: əgər əlavə sətir icazəsi varsa, submitted status-da da saxlamağa icazə ver
        $response->loadMissing(['reportTable']);
        $table = $response->reportTable;
        $canAddRowsAfterConfirmation = $table && $table->canAddRowsAfterConfirmation();

        if (! in_array($response->status, ['draft', 'submitted'], true)) {
            // Əgər əlavə sətir icazəsi varsa və status submitted-dirsə, icazə ver
            if (! ($canAddRowsAfterConfirmation && $response->status === 'submitted')) {
                throw new \InvalidArgumentException('Cavab statusu dəyişdirilə bilmir.');
            }
        }

        $existingStatuses = $response->row_statuses ?? [];
        $existingRows     = $response->rows ?? [];
        $mergedRows       = $rows;

        foreach ($rows as $idx => $row) {
            $rowStatus = $existingStatuses[$idx]['status'] ?? null;
            if (in_array($rowStatus, ['submitted', 'approved'], true)) {
                $mergedRows[$idx] = $existingRows[$idx] ?? $row;
            }
        }

        $this->validateRows($mergedRows, $table->columns ?? [], $table->max_rows ?? 50, $table->fixed_rows ?? null);

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
        $rows  = $response->rows ?? [];

        if (empty($rows)) {
            throw ValidationException::withMessages([
                'rows' => ['Göndərmək üçün ən azı bir sətir daxil edilməlidir.'],
            ]);
        }

        $this->validateRows($rows, $table->columns ?? [], $table->max_rows ?? 50, $table->fixed_rows ?? null);

        return DB::transaction(function () use ($response, $rows, $user) {
            // Bütün qaralama/rejected sətirləri 'submitted' kimi işarələ.
            // Artıq 'submitted' və ya 'approved' olanları toxunma.
            $statuses = $response->row_statuses ?? [];
            foreach ($rows as $idx => $row) {
                $current = $statuses[$idx]['status'] ?? null;
                if (! in_array($current, ['submitted', 'approved'], true)) {
                    $statuses[$idx] = [
                        'status'       => 'submitted',
                        'submitted_by' => $user->id,
                        'submitted_at' => now()->toISOString(),
                    ];
                }
            }
            $response->row_statuses = $statuses;
            $response->submit();

            return $response->fresh(['reportTable', 'institution', 'respondent']);
        });
    }

    // ─── Row Actions (School) ─────────────────────────────────────────────────

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

        $hasContent = collect($rows[$rowIndex])->some(fn ($v) => $v !== null && $v !== '');
        if (! $hasContent) {
            throw new \InvalidArgumentException('Boş sətiri göndərmək olmaz.');
        }

        $response->submitRow($rowIndex, $user->id);

        return $response->fresh(['reportTable', 'institution', 'respondent']);
    }

    // ─── Admin Response Queries ───────────────────────────────────────────────

    /**
     * Bir cədvəl üçün bütün cavabları qaytarır (admin baxışı).
     */
    public function getResponsesForTable(ReportTable $table, array $filters = [], int $perPage = 50, ?User $user = null): \Illuminate\Pagination\LengthAwarePaginator
    {
        $query = ReportTableResponse::with(['institution.parent', 'respondent.profile'])
            ->where('report_table_id', $table->id);

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['institution_id'])) {
            $query->where('institution_id', $filters['institution_id']);
        }

        if ($user && $user->hasRole('sektoradmin')) {
            $approvalService = app(ReportTableApprovalService::class);
            $allowedInstitutionIds = $approvalService->getReviewableInstitutionIds($user);
            if (! empty($allowedInstitutionIds)) {
                $query->whereIn('institution_id', $allowedInstitutionIds);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        $query->orderBy('updated_at', 'desc');

        return $query->paginate($perPage);
    }

    /**
     * Analytics/ready-view üçün bütün cavabları qaytarır (paginate yoxdur).
     * SektorAdmin yalnız öz sektorunun məktəblərini görür.
     */
    public function getAllResponsesForTable(ReportTable $table, User $user): \Illuminate\Database\Eloquent\Collection
    {
        $query = ReportTableResponse::with(['institution.parent', 'respondent.profile'])
            ->where('report_table_id', $table->id);

        if ($user->hasRole('sektoradmin')) {
            $approvalService = app(ReportTableApprovalService::class);
            $allowedIds = $approvalService->getReviewableInstitutionIds($user);
            $query->whereIn('institution_id', $allowedIds ?: [-1]);
        }

        return $query->orderBy('institution_id')->get();
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

    // ─── Row Validation ──────────────────────────────────────────────────────

    /**
     * Sətirləri cədvəlin sütun strukturuna uyğun yoxlayır.
     */
    public function validateRows(array $rows, array $columns, int $maxRows, ?array $fixedRows = null): void
    {
        $errors = [];

        if (! empty($fixedRows)) {
            $expectedCount = count($fixedRows);
            $actualCount   = count($rows);
            if ($actualCount !== $expectedCount) {
                throw ValidationException::withMessages([
                    'rows' => ["Bu cədvəldə dəqiq {$expectedCount} sətir olmalıdır (siz {$actualCount} göndərdiniz)."],
                ]);
            }
        } elseif (count($rows) > $maxRows) {
            throw ValidationException::withMessages([
                'rows' => ["Maksimum {$maxRows} sətir əlavə edilə bilər."],
            ]);
        }

        $validKeys     = array_column($columns, 'key');
        $columnTypes   = [];
        $columnLabels  = [];
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
                    continue;
                }

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
