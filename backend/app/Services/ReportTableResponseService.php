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
     * Cavabı saxlayır (yalnız draft statusunda).
     */
    public function save(ReportTableResponse $response, array $rows, User $user): ReportTableResponse
    {
        if ($response->respondent_id !== $user->id) {
            throw new \InvalidArgumentException('Yalnız öz cavabınızı yeniləyə bilərsiniz.');
        }

        if (! $response->isDraft()) {
            throw new \InvalidArgumentException('Göndərilmiş cavabları dəyişmək olmaz.');
        }

        $response->loadMissing(['reportTable']);
        $table = $response->reportTable;

        $this->validateRows($rows, $table->columns ?? [], $table->max_rows ?? 50);

        return DB::transaction(function () use ($response, $rows) {
            $response->rows = $rows;
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
     */
    public function getResponsesForTable(ReportTable $table, array $filters = [], int $perPage = 50): \Illuminate\Pagination\LengthAwarePaginator
    {
        $query = ReportTableResponse::with(['institution', 'respondent.profile'])
            ->where('report_table_id', $table->id);

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['institution_id'])) {
            $query->where('institution_id', $filters['institution_id']);
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
            ->submitted()
            ->orderBy('institution_id')
            ->get();
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

        foreach ($columns as $col) {
            $columnTypes[$col['key']] = $col['type'] ?? 'text';
            $columnLabels[$col['key']] = $col['label'] ?? $col['key'];
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

                $colType = $columnTypes[$colKey] ?? 'text';
                $colLabel = $columnLabels[$colKey] ?? $colKey;

                switch ($colType) {
                    case 'number':
                        if (! is_numeric($cellValue)) {
                            $errors["rows.{$rowIndex}.{$colKey}"] = ["{$pos}. sətir, \"{$colLabel}\" sütununda rəqəm gözlənilir."];
                        }
                        break;
                    case 'date':
                        if (! $this->isValidDate($cellValue)) {
                            $errors["rows.{$rowIndex}.{$colKey}"] = ["{$pos}. sətir, \"{$colLabel}\" sütununda düzgün tarix formatı gözlənilir (YYYY-MM-DD)."];
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
