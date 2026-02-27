<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\ReportTable;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReportTableService
{
    // ─── List / Query ─────────────────────────────────────────────────────────

    /**
     * Admin/operator üçün hesabat cədvəllərinin siyahısını qaytarır.
     * Rol iyerarxiyasına görə filtrləmə tətbiq olunur.
     */
    public function getPaginatedList(array $filters, User $user, int $perPage = 15): LengthAwarePaginator
    {
        $query = ReportTable::with(['creator']);

        // Rol-based filtrləmə
        if ($user->hasRole('superadmin')) {
            // Hər şeyi görür
        } elseif ($user->hasRole(['regionadmin', 'regionoperator'])) {
            // Öz yaratdıqları + öz hierarchy-sindəki müəssisələrə göndərilənlər
            $query->where(function ($q) use ($user) {
                $q->where('creator_id', $user->id)
                    ->orWhere(function ($sq) use ($user) {
                        $childIds = $this->getInstitutionChildIds($user->institution_id);
                        $sq->whereNotNull('target_institutions')
                            ->where(function ($jsq) use ($childIds) {
                                foreach ($childIds as $id) {
                                    $jsq->orWhereJsonContains('target_institutions', $id);
                                }
                            });
                    });
            });
        } elseif ($user->hasRole('sektoradmin')) {
            $query->where('creator_id', $user->id);
        } else {
            // Digər rollar heç nə görməməlidir (schooladmin vs)
            $query->whereRaw('1=0');
        }

        // Axtarış filtri
        if (! empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('title', 'ILIKE', '%' . $filters['search'] . '%')
                    ->orWhere('description', 'ILIKE', '%' . $filters['search'] . '%');
            });
        }

        // Status filtri
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $query->orderBy('created_at', 'desc');

        return $query->paginate($perPage);
    }

    /**
     * Məktəb istifadəçisi üçün ona aid edilmiş, published cədvəlləri qaytarır.
     */
    public function getMyTablesForSchool(User $user): \Illuminate\Database\Eloquent\Collection
    {
        $institutionId = $user->institution_id;

        if (! $institutionId) {
            return collect();
        }

        return ReportTable::published()
            ->whereJsonContains('target_institutions', $institutionId)
            ->with(['creator'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    // ─── CRUD ────────────────────────────────────────────────────────────────

    /**
     * Yeni hesabat cədvəli yaradır.
     */
    public function createTable(array $data, User $user): ReportTable
    {
        $this->validateColumns($data['columns'] ?? []);

        return DB::transaction(function () use ($data, $user) {
            return ReportTable::create([
                'title'               => $data['title'],
                'description'         => $data['description'] ?? null,
                'creator_id'          => $user->id,
                'status'              => 'draft',
                'columns'             => $data['columns'],
                'max_rows'            => $data['max_rows'] ?? 50,
                'target_institutions' => $data['target_institutions'] ?? [],
                'deadline'            => $data['deadline'] ?? null,
            ]);
        });
    }

    /**
     * Mövcud cədvəli yeniləyir (yalnız draft statusunda).
     */
    public function updateTable(ReportTable $table, array $data): ReportTable
    {
        if (! $table->canEdit()) {
            throw new \InvalidArgumentException('Yalnız qaralama statusundakı cədvəllər redaktə edilə bilər.');
        }

        $updateData = array_filter([
            'title'               => $data['title'] ?? null,
            'description'         => $data['description'] ?? null,
            'max_rows'            => $data['max_rows'] ?? null,
            'target_institutions' => $data['target_institutions'] ?? null,
            'deadline'            => $data['deadline'] ?? null,
        ], fn ($v) => $v !== null);

        // Sütunlar yalnız draft-da dəyişdirilə bilər
        if (isset($data['columns'])) {
            $this->validateColumns($data['columns']);
            $updateData['columns'] = $data['columns'];
        }

        return DB::transaction(function () use ($table, $updateData) {
            $table->update($updateData);

            return $table->fresh(['creator']);
        });
    }

    /**
     * Cədvəli publish edir.
     */
    public function publishTable(ReportTable $table): ReportTable
    {
        if (! $table->isDraft()) {
            throw new \InvalidArgumentException('Yalnız qaralama statusundakı cədvəllər dərc edilə bilər.');
        }

        if (empty($table->columns)) {
            throw new \InvalidArgumentException('Dərc etmək üçün ən azı bir sütun əlavə edilməlidir.');
        }

        if (empty($table->target_institutions)) {
            throw new \InvalidArgumentException('Dərc etmək üçün ən azı bir müəssisə seçilməlidir.');
        }

        DB::transaction(function () use ($table) {
            $table->publish();
        });

        return $table->fresh(['creator']);
    }

    /**
     * Cədvəli arxivləyir.
     */
    public function archiveTable(ReportTable $table): ReportTable
    {
        if (! $table->isPublished()) {
            throw new \InvalidArgumentException('Yalnız dərc edilmiş cədvəllər arxivlənə bilər.');
        }

        DB::transaction(function () use ($table) {
            $table->archive();
        });

        return $table->fresh(['creator']);
    }

    /**
     * Cədvəli silir (yalnız draft statusunda).
     */
    public function deleteTable(ReportTable $table): void
    {
        if (! $table->isDraft()) {
            throw new \InvalidArgumentException('Yalnız qaralama statusundakı cədvəllər silinə bilər.');
        }

        $table->delete();
    }

    // ─── Column Validation ────────────────────────────────────────────────────

    /**
     * Sütun strukturunu yoxlayır.
     * Format: [{key: 'col_1', label: 'Ad', type: 'text|number|date'}, ...]
     */
    public function validateColumns(array $columns): void
    {
        if (empty($columns)) {
            throw ValidationException::withMessages([
                'columns' => ['Ən azı bir sütun əlavə edilməlidir.'],
            ]);
        }

        $validTypes = ['text', 'number', 'date'];
        $keys = [];
        $errors = [];

        foreach ($columns as $index => $column) {
            $pos = $index + 1;

            if (empty($column['key'])) {
                $errors["columns.{$index}.key"] = ["{$pos}. sütunun açar adı boş ola bilməz."];
            } elseif (! preg_match('/^[a-z_][a-z0-9_]*$/', $column['key'])) {
                $errors["columns.{$index}.key"] = ["{$pos}. sütunun açar adı yalnız kiçik hərf, rəqəm və alt xəttdən ibarət olmalıdır."];
            }

            if (empty($column['label'])) {
                $errors["columns.{$index}.label"] = ["{$pos}. sütunun etiketi boş ola bilməz."];
            }

            if (empty($column['type']) || ! in_array($column['type'], $validTypes, true)) {
                $errors["columns.{$index}.type"] = ["{$pos}. sütunun tipi 'text', 'number' və ya 'date' olmalıdır."];
            }

            if (! empty($column['key'])) {
                if (in_array($column['key'], $keys, true)) {
                    $errors["columns.{$index}.key"] = ["{$pos}. sütunun açar adı unikal olmalıdır."];
                }
                $keys[] = $column['key'];
            }
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Müəssisənin bütün alt uşaq ID-lərini qaytarır (özü daxil).
     */
    private function getInstitutionChildIds(?int $institutionId): array
    {
        if (! $institutionId) {
            return [];
        }

        $institution = Institution::find($institutionId);
        if (! $institution) {
            return [];
        }

        $ids = $institution->getAllChildrenIds();
        $ids[] = $institutionId;

        return array_unique($ids);
    }
}
