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
    // ─── Logging Helper ─────────────────────────────────────────────────────

    private function log(string $level, string $message, array $context = []): void
    {
        $context['service'] = 'ReportTableService';
        $context['user_id'] = Auth::id();
        Log::channel('report_tables')->$level($message, $context);
    }

    // ─── List / Query ─────────────────────────────────────────────────────────

    /**
     * Admin/operator üçün hesabat cədvəllərinin siyahısını qaytarır.
     * Rol iyerarxiyasına görə filtrləmə tətbiq olunur.
     */
    public function getPaginatedList(array $filters, User $user, int $perPage = 15): LengthAwarePaginator
    {
        $query = ReportTable::with(['creator'])
            ->withCount(['responses' => function ($q) {
                // Only count submitted and approved responses (not draft)
                $q->whereIn('status', ['submitted', 'approved']);
            }]);

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
            // Sektor admin: öz yaratdıqları + sektorundakı məktəblərə göndərilənlər
            $sectorId = $user->institution_id;
            $schoolIds = Institution::where('parent_id', $sectorId)->where('level', 4)->pluck('id')->toArray();
            $allIds = array_merge([$sectorId], $schoolIds);
            
            $query->where(function ($q) use ($user, $allIds) {
                $q->where('creator_id', $user->id)
                    ->orWhere(function ($sq) use ($allIds) {
                        $sq->whereNotNull('target_institutions')
                            ->where(function ($jsq) use ($allIds) {
                                foreach ($allIds as $id) {
                                    $jsq->orWhereJsonContains('target_institutions', $id);
                                }
                            });
                    });
            });
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

        // Status filtri — 'deleted' xüsusi hal: soft-deleted cədvəllər
        if (! empty($filters['status'])) {
            if ($filters['status'] === 'deleted') {
                $query->onlyTrashed();
            } else {
                $query->where('status', $filters['status']);
            }
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
                'notes'               => $data['notes'] ?? null,
                'creator_id'          => $user->id,
                'status'              => 'draft',
                'columns'             => $data['columns'],
                'fixed_rows'          => $data['fixed_rows'] ?? null,
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
            'notes'               => $data['notes'] ?? null,
            'max_rows'            => $data['max_rows'] ?? null,
            'target_institutions' => $data['target_institutions'] ?? null,
            'deadline'            => $data['deadline'] ?? null,
            'fixed_rows'          => $data['fixed_rows'] ?? null,
        ], fn ($v) => $v !== null);

        // Sütunlar və fixed_rows yalnız draft-da dəyişdirilə bilər
        if (isset($data['columns'])) {
            $this->validateColumns($data['columns']);
            $updateData['columns'] = $data['columns'];
        }

        if (isset($data['fixed_rows'])) {
            $this->validateFixedRows($data['fixed_rows']);
            $updateData['fixed_rows'] = $data['fixed_rows'];
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
     * Cədvəli arxivdən çıxarır.
     */
    public function unarchiveTable(ReportTable $table): ReportTable
    {
        if (! $table->isArchived()) {
            throw new \InvalidArgumentException('Yalnız arxivdə olan cədvəllər arxivdən çıxarıla bilər.');
        }

        DB::transaction(function () use ($table) {
            $table->unarchive();
        });

        return $table->fresh(['creator']);
    }

    /**
     * Cədvəli soft-delete ilə silir (istənilən statusda işləyir).
     */
    public function deleteTable(ReportTable $table): void
    {
        $table->delete();
    }

    /**
     * Soft-deleted cədvəli bərpa edir.
     * Route Model Binding soft-deleted-ləri göstərmədiyi üçün raw ID ilə işləyir.
     */
    public function restoreTable(int $tableId): ReportTable
    {
        $table = ReportTable::onlyTrashed()->findOrFail($tableId);
        $table->restore();

        return $table->fresh(['creator']);
    }

    /**
     * Cədvəli birdəfəlik silir (SuperAdmin only).
     * Route Model Binding soft-deleted-ləri göstərmədiyi üçün raw ID ilə işləyir.
     */
    public function forceDeleteTable(int $tableId): void
    {
        $table = ReportTable::withTrashed()->findOrFail($tableId);
        $table->forceDelete();
    }

    // ─── Column Validation ────────────────────────────────────────────────────

    /**
     * Sütun strukturunu yoxlayır.
     * Format: [{key: 'col_1', label: 'Ad', type: 'text|number|date|select|boolean', options?: [...]}, ...]
     */
    public function validateColumns(array $columns): void
    {
        if (empty($columns)) {
            throw ValidationException::withMessages([
                'columns' => ['Ən azı bir sütun əlavə edilməlidir.'],
            ]);
        }

        $validTypes = ['text', 'number', 'date', 'select', 'boolean', 'calculated', 'file', 'signature', 'gps'];
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

            $colType = $column['type'] ?? '';
            if (empty($colType) || ! in_array($colType, $validTypes, true)) {
                $errors["columns.{$index}.type"] = ["{$pos}. sütunun tipi düzgün deyil."];
            } elseif ($colType === 'select') {
                $opts = $column['options'] ?? [];
                if (empty($opts) || ! is_array($opts)) {
                    $errors["columns.{$index}.options"] = ["{$pos}. sütun üçün ən azı bir seçim variantı əlavə edilməlidir."];
                } else {
                    foreach ($opts as $optIdx => $opt) {
                        if (! is_string($opt) || trim($opt) === '') {
                            $errors["columns.{$index}.options.{$optIdx}"] = ["{$pos}. sütunun " . ($optIdx + 1) . ". variantı boş ola bilməz."];
                        }
                    }
                }
            } elseif ($colType === 'calculated') {
                $formula = $column['formula'] ?? null;
                if (! is_string($formula) || trim($formula) === '') {
                    $errors["columns.{$index}.formula"] = ["{$pos}. hesablama sütunu üçün formula tələb olunur."];
                }
                $format = $column['format'] ?? null;
                if ($format !== null && ! in_array($format, ['number', 'currency', 'percent'], true)) {
                    $errors["columns.{$index}.format"] = ["{$pos}. hesablama sütunu üçün format düzgün deyil."];
                }
                $decimals = $column['decimals'] ?? null;
                if ($decimals !== null) {
                    if (! is_numeric($decimals)) {
                        $errors["columns.{$index}.decimals"] = ["{$pos}. hesablama sütunu üçün onluq sayı düzgün deyil."];
                    } else {
                        $d = (int) $decimals;
                        if ($d < 0 || $d > 10) {
                            $errors["columns.{$index}.decimals"] = ["{$pos}. hesablama sütunu üçün onluq sayı düzgün deyil."];
                        }
                    }
                }
            } elseif ($colType === 'file') {
                $accepted = $column['accepted_types'] ?? null;
                if ($accepted !== null && ! is_array($accepted)) {
                    $errors["columns.{$index}.accepted_types"] = ["{$pos}. fayl sütunu üçün accepted_types array olmalıdır."];
                }
                $maxSize = $column['max_file_size'] ?? null;
                if ($maxSize !== null && ! is_numeric($maxSize)) {
                    $errors["columns.{$index}.max_file_size"] = ["{$pos}. fayl sütunu üçün max_file_size rəqəm olmalıdır."];
                }
            } elseif ($colType === 'signature') {
                $w = $column['signature_width'] ?? null;
                $h = $column['signature_height'] ?? null;
                if ($w !== null) {
                    if (! is_numeric($w)) {
                        $errors["columns.{$index}.signature_width"] = ["{$pos}. imza eni düzgün deyil."];
                    } else {
                        $wi = (int) $w;
                        if ($wi < 50 || $wi > 3000) {
                            $errors["columns.{$index}.signature_width"] = ["{$pos}. imza eni düzgün deyil."];
                        }
                    }
                }
                if ($h !== null) {
                    if (! is_numeric($h)) {
                        $errors["columns.{$index}.signature_height"] = ["{$pos}. imza hündürlüyü düzgün deyil."];
                    } else {
                        $hi = (int) $h;
                        if ($hi < 50 || $hi > 3000) {
                            $errors["columns.{$index}.signature_height"] = ["{$pos}. imza hündürlüyü düzgün deyil."];
                        }
                    }
                }
            } elseif ($colType === 'gps') {
                $precision = $column['gps_precision'] ?? null;
                if ($precision !== null && ! in_array($precision, ['high', 'medium', 'low'], true)) {
                    $errors["columns.{$index}.gps_precision"] = ["{$pos}. GPS precision düzgün deyil."];
                }
                $radius = $column['gps_radius'] ?? null;
                if ($radius !== null && ! is_numeric($radius)) {
                    $errors["columns.{$index}.gps_radius"] = ["{$pos}. GPS radius rəqəm olmalıdır."];
                }
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

    /**
     * Fixed rows strukturunu yoxlayır.
     * Format: [{id: 'row_1', label: '9-cu sinif'}, ...]
     * Əgər null/empty göndərilirsə, cədvəl dinamik (köhnə) rejimdə işləyir.
     */
    public function validateFixedRows(?array $fixedRows): void
    {
        if (empty($fixedRows)) {
            return; // null/empty = dinamik rejim
        }

        $errors = [];
        $ids = [];

        foreach ($fixedRows as $index => $row) {
            $pos = $index + 1;

            if (empty($row['id'])) {
                $errors["fixed_rows.{$index}.id"] = ["{$pos}. sətirin ID-si boş ola bilməz."];
            } elseif (! preg_match('/^[a-z_][a-z0-9_]*$/', $row['id'])) {
                $errors["fixed_rows.{$index}.id"] = ["{$pos}. sətirin ID-si yalnız kiçik hərf, rəqəm və alt xəttdən ibarət olmalıdır."];
            }

            if (empty($row['label'])) {
                $errors["fixed_rows.{$index}.label"] = ["{$pos}. sətirin adı boş ola bilməz."];
            }

            if (! empty($row['id'])) {
                if (in_array($row['id'], $ids, true)) {
                    $errors["fixed_rows.{$index}.id"] = ["{$pos}. sətirin ID-si unikal olmalıdır."];
                }
                $ids[] = $row['id'];
            }
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    // ─── Template Methods ────────────────────────────────────────────────────

    /**
     * Save a table as template
     */
    public function saveAsTemplate(ReportTable $table, ?string $category = null): ReportTable
    {
        // Only draft or published tables can be saved as templates
        if (! $table->isDraft() && ! $table->isPublished()) {
            throw new \InvalidArgumentException('Yalnız draft və ya published cədvəllər şablon kimi saxlanıla bilər.');
        }

        $table->saveAsTemplate($category);

        return $table->fresh();
    }

    /**
     * Clone a table from template
     */
    public function cloneFromTemplate(ReportTable $template, string $newTitle, int $creatorId): ReportTable
    {
        if (! $template->isTemplate()) {
            throw new \InvalidArgumentException('Bu cədvəl şablon deyil.');
        }

        return $template->cloneAsNew($newTitle, $creatorId);
    }

    /**
     * Get all available templates
     */
    public function getTemplates(?string $category = null, ?int $creatorId = null): array
    {
        $query = ReportTable::templates()->notTemplates(); // Templates scope only
        $query = ReportTable::where('is_template', true);

        if ($category) {
            $query->where('template_category', $category);
        }

        if ($creatorId) {
            $query->where(function ($q) use ($creatorId) {
                $q->where('creator_id', $creatorId)
                  ->orWhereNull('template_category'); // Public templates
            });
        }

        return $query->orderBy('title')->get()->toArray();
    }

    /**
     * Remove template status
     */
    public function removeTemplateStatus(ReportTable $table): ReportTable
    {
        $table->removeTemplateStatus();
        return $table->fresh();
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
