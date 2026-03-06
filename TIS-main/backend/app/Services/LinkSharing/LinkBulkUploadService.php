<?php

namespace App\Services\LinkSharing;

use App\Imports\LinkBulkUploadImport;
use App\Models\Institution;
use App\Services\LinkSharing\Domains\Crud\LinkCrudManager;
use App\Services\LinkSharing\Domains\Permission\LinkPermissionService;
use App\Services\LoggingService;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Facades\Excel;

class LinkBulkUploadService
{
    protected int $maxRows;

    protected array $allowedLinkTypes;

    public function __construct(
        protected LinkCrudManager $crudManager,
        protected LinkPermissionService $permissionService
    ) {
        $this->maxRows = (int) config('link_bulk.max_rows', 500);
        $this->allowedLinkTypes = config('link_bulk.allowed_link_types', ['external', 'video', 'form', 'document']);
    }

    /**
     * Import links from Excel/CSV and create them via the existing CRUD manager.
     */
    public function importFromExcel(UploadedFile $file, array $overrides, $user): array
    {
        $import = new LinkBulkUploadImport;
        Excel::import($import, $file);

        $rows = $import->getRows();
        $rowCount = $rows->count();

        if ($rowCount === 0) {
            throw ValidationException::withMessages([
                'file' => 'Fayl boşdur və ya məlumat tapılmadı.',
            ]);
        }

        if ($rowCount > $this->maxRows) {
            throw ValidationException::withMessages([
                'file' => "Faylda maksimum {$this->maxRows} sətr ola bilər.",
            ]);
        }

        $rowPreparationErrors = [];
        $preparedRows = [];
        foreach ($rows as $index => $row) {
            $rowArray = $this->normalizeRow($row);
            if ($this->isRowEmpty($rowArray)) {
                continue;
            }

            $rowNumber = $index + 2; // +2 because heading row is 1

            try {
                $payload = $this->buildPayload($rowArray, $overrides, $user);
                $preparedRows[] = [
                    'row_number' => $rowNumber,
                    'payload' => $payload,
                ];
            } catch (\Throwable $e) {
                $rowPreparationErrors[] = "Sətir {$rowNumber}: " . $e->getMessage();
            }
        }

        if (empty($preparedRows)) {
            return [
                'processed' => $rowCount,
                'created' => 0,
                'failed' => $rowCount,
                'errors' => $rowPreparationErrors,
                'links' => [],
            ];
        }

        $payloads = array_map(fn ($item) => $item['payload'], $preparedRows);
        $result = $this->crudManager->bulkCreateLinks($payloads, $user);

        $enhancedErrors = $this->mergeErrorsWithRowNumbers(
            $result['errors'] ?? [],
            $preparedRows
        );

        $summary = [
            'processed' => $rowCount,
            'created' => $result['created'] ?? 0,
            'failed' => ($result['failed'] ?? 0) + count($rowPreparationErrors),
            'errors' => array_merge($rowPreparationErrors, $enhancedErrors),
            'links' => $result['links'] ?? [],
        ];

        LoggingService::bulkOperation('link_bulk_upload', [
            'user_id' => $user->id ?? null,
            'processed' => $summary['processed'],
            'created' => $summary['created'],
            'failed' => $summary['failed'],
            'file_name' => $file->getClientOriginalName(),
            'template_version' => config('link_bulk.template_version'),
        ]);

        return $summary;
    }

    protected function mergeErrorsWithRowNumbers(array $errors, array $preparedRows): array
    {
        if (empty($errors)) {
            return [];
        }

        $messages = [];
        foreach ($errors as $error) {
            $rowMatch = null;
            if (preg_match('/Link\s+(\d+)/i', $error, $matches)) {
                $index = (int) $matches[1] - 1;
                $rowMeta = $preparedRows[$index] ?? null;
                if ($rowMeta) {
                    $rowMatch = $rowMeta['row_number'];
                }
            }

            if ($rowMatch) {
                $messages[] = "Sətir {$rowMatch}: " . trim($error);
            } else {
                $messages[] = $error;
            }
        }

        return $messages;
    }

    protected function buildPayload(array $row, array $overrides, $user): array
    {
        $title = trim($row['link_title'] ?? $row['title'] ?? '');
        if (empty($title)) {
            throw new \InvalidArgumentException('Link başlığı boş ola bilməz.');
        }

        $url = trim($row['url'] ?? '');
        if (empty($url) || ! filter_var($url, FILTER_VALIDATE_URL)) {
            throw new \InvalidArgumentException('URL düzgün formatda deyil.');
        }

        $description = trim($row['description'] ?? '');

        $institutionUniqueName = $row['institution_unique_name']
            ?? $row['institution_name']
            ?? $row['müəssisə adı (unique)']
            ?? $row['institution']
            ?? null;

        if (empty($institutionUniqueName)) {
            throw new \InvalidArgumentException('“Müəssisə adı (unique)” sütunu tələb olunur.');
        }

        $institutionId = $this->resolveInstitutionIdByUniqueName($institutionUniqueName);
        $targetInstitutions = [$institutionId];

        $shareScope = strtolower($overrides['share_scope'] ?? 'institutional');
        if (! in_array($shareScope, ['public', 'regional', 'sectoral', 'institutional', 'specific_users'], true)) {
            $shareScope = 'institutional';
        }

        if (! $this->permissionService->canCreateLinkWithScope($user, $shareScope)) {
            throw new \InvalidArgumentException("{$shareScope} paylaşım sahəsi üçün icazəniz yoxdur.");
        }

        $linkType = strtolower($row['link_type'] ?? '');
        if (! in_array($linkType, $this->allowedLinkTypes, true)) {
            $linkType = $this->guessLinkType($url);
        }

        $expiresAt = $this->parseDateTime($row['expires_at'] ?? null);
        $isFeatured = isset($overrides['is_featured'])
            ? $this->castBoolean($overrides['is_featured'])
            : false;

        Log::debug('Preparing bulk link row', [
            'title' => $title,
            'share_scope' => $shareScope,
            'link_type' => $linkType,
            'institution' => $institutionUniqueName,
        ]);

        return array_filter([
            'title' => $title,
            'description' => $description ?: null,
            'url' => $url,
            'link_type' => $linkType,
            'share_scope' => $shareScope,
            'target_institutions' => $targetInstitutions,
            'expires_at' => $expiresAt,
            'is_featured' => $isFeatured,
        ], function ($value) {
            return ! is_null($value);
        });
    }

    protected function normalizeRow($row): array
    {
        if (is_array($row)) {
            return $row;
        }

        if ($row instanceof \Illuminate\Support\Collection) {
            return $row->toArray();
        }

        return (array) $row;
    }

    protected function isRowEmpty(array $row): bool
    {
        foreach ($row as $value) {
            if ($value !== null && trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    protected function resolveInstitutionIdByUniqueName(string $value): int
    {
        $clean = trim($value);
        if ($clean === '') {
            throw new \InvalidArgumentException('“Müəssisə adı (unique)” dəyəri boş ola bilməz.');
        }

        $institution = Institution::withTrashed()
            ->where('name', $clean)
            ->orWhere('short_name', $clean)
            ->orWhere('institution_code', $clean)
            ->orWhere('utis_code', $clean)
            ->first();

        if (! $institution) {
            throw new \InvalidArgumentException("{$clean} adlı müəssisə tapılmadı.");
        }

        return $institution->id;
    }

    protected function guessLinkType(string $url): string
    {
        $url = strtolower($url);
        if (Str::contains($url, ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com'])) {
            return 'video';
        }

        if (Str::contains($url, ['forms.gle', 'docs.google.com/forms', 'typeform.com'])) {
            return 'form';
        }

        if (Str::contains($url, ['docs.google.com', 'dropbox.com', 'onedrive.live.com']) ||
            Str::endsWith($url, ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'])) {
            return 'document';
        }

        return 'external';
    }

    protected function parseDateTime($value): ?string
    {
        if (empty($value)) {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateTimeString();
        } catch (\Throwable $e) {
            throw new \InvalidArgumentException('Tarix formatı düzgün deyil.');
        }
    }

    protected function castBoolean($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        $normalized = strtolower((string) $value);

        return in_array($normalized, ['1', 'true', 'bəli', 'yes', 'hə', 'on'], true);
    }
}
