<?php

namespace App\Services\Import;

use App\Models\InstitutionType;
use App\Services\Import\Domains\Duplicates\DuplicateDetector;
use App\Services\Import\Domains\FileOperations\ExcelDataParser;
use App\Services\Import\Domains\FileOperations\ExcelFileLoader;
use App\Services\Import\Domains\Formatting\MessageFormatter;
use App\Services\Import\Domains\Formatting\ResponseBuilder;
use App\Services\Import\Domains\Parsing\DataTypeParser;
use App\Services\Import\Domains\Processing\BatchOptimizer;
use App\Services\Import\Domains\Processing\ChunkProcessor;
use App\Services\Import\Domains\Processing\InstitutionCreator;
use App\Services\Import\Domains\StateManagement\ImportStateManager;
use App\Services\Import\Domains\UserManagement\SchoolAdminCreator;
use App\Services\Import\Domains\Validation\ImportDataValidator;
use App\Services\Import\InstitutionCsvParserService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Central orchestrator for all import operations
 *
 * REFACTORED: Sprint 2 - Modular service architecture with dependency injection
 *
 * Coordinates between different domain services:
 * - FileOperations: Excel loading and parsing / CSV parsing
 * - Parsing: Data type conversions
 * - Validation: Laravel validation
 * - Duplicates: Duplicate detection + upsert support
 * - Processing: Import execution and chunking
 * - UserManagement: SchoolAdmin creation
 * - Formatting: Response building
 * - Analytics: Statistics generation
 * - StateManagement: State tracking
 */
class ImportOrchestrator
{
    /** @internal UTIS kodu eyniliyi olarsa yeniləmə rejimi */
    protected bool $upsertOnUtis = false;

    /**
     * Constructor with dependency injection
     *
     * All domain services injected via constructor for testability and modularity.
     */
    public function __construct(
        protected ExcelFileLoader $fileLoader,
        protected ExcelDataParser $dataParser,
        protected ImportDataValidator $validator,
        protected DuplicateDetector $duplicateDetector,
        protected InstitutionCreator $institutionCreator,
        protected SchoolAdminCreator $schoolAdminCreator,
        protected ChunkProcessor $chunkProcessor,
        protected BatchOptimizer $batchOptimizer,
        protected DataTypeParser $dataTypeParser,
        protected MessageFormatter $messageFormatter,
        protected ResponseBuilder $responseBuilder,
        protected ImportStateManager $stateManager
    ) {}

    /**
     * Main entry point for institution import by type
     *
     * PUBLIC API: Backward compatible — signature genişləndi, amma köhnə çağırışlar işləyir.
     *
     * @param  array $options  ['delimiter' => ',', 'upsert_on_utis' => false]
     * @return array           API response
     */
    public function importInstitutionsByType(
        UploadedFile $file,
        string $institutionTypeKey,
        array $options = []
    ): array {
        try {
            // 1. Reset import state
            $this->resetImportState();
            $this->upsertOnUtis = $options['upsert_on_utis'] ?? false;

            // 2. Get institution type
            $institutionType = InstitutionType::where('key', $institutionTypeKey)->firstOrFail();

            // 3. Fayl növünə görə parser seç
            $extension = strtolower($file->getClientOriginalExtension());

            if ($extension === 'csv') {
                $delimiter = $options['delimiter'] ?? ',';
                $csvParser = app(InstitutionCsvParserService::class);
                $data      = $csvParser->parseCsvFile($file, $institutionType, $delimiter);
            } else {
                // Excel axını — köhnə davranış
                $spreadsheet = $this->fileLoader->loadExcelFile($file);
                $data        = $this->dataParser->parseExcelData($spreadsheet, $institutionType);
            }

            Log::info('Data parsed', [
                'institution_type' => $institutionTypeKey,
                'institution_level' => $institutionType->level ?? $institutionType->default_level,
                'parsed_rows'  => count($data),
                'file_type'    => $extension,
                'upsert_on_utis' => $this->upsertOnUtis,
            ]);

            // Check if data is empty
            if (empty($data)) {
                Log::warning('No data parsed from file');

                return $this->responseBuilder->buildErrorResponse(
                    'Fayldan məlumat oxuna bilmədi və ya fayl boşdur',
                    [],
                    []
                );
            }

            // 5. Validate parsed data
            $this->validator->validateImportData($data, $institutionType);

            Log::info('Validation completed', [
                'validation_errors_count' => count($this->validator->getValidationErrors()),
                'validation_errors'       => $this->validator->getValidationErrors(),
            ]);

            // Check for validation errors
            if ($this->validator->hasValidationErrors()) {
                Log::warning('Validation failed', [
                    'errors' => $this->validator->getValidationErrors(),
                ]);

                return $this->buildValidationErrorResponse($this->validator->getValidationErrors());
            }

            // 6. Import institutions with transaction
            Log::info('Starting import execution', [
                'data_count'       => count($data),
                'institution_level' => $institutionType->level ?? $institutionType->default_level,
            ]);

            $importResult  = $this->executeImport($data, $institutionType);
            $importedCount = $importResult['imported_count'];
            $duplicateCount = $importResult['duplicate_count'];

            Log::info('Import execution completed', [
                'imported_count'  => $importedCount,
                'duplicate_count' => $duplicateCount,
                'import_results'  => $this->stateManager->getImportResults(),
            ]);

            // 7. Build success response
            return $this->responseBuilder->buildSuccessResponse(
                $importedCount,
                $this->stateManager->getImportResults()
            );
        } catch (\Exception $e) {
            Log::error('Institution import error', [
                'error'            => $e->getMessage(),
                'trace'            => $e->getTraceAsString(),
                'institution_type' => $institutionTypeKey,
            ]);

            return $this->responseBuilder->buildErrorResponse(
                'İdxal zamanı səhv: ' . $e->getMessage(),
                [],
                $this->stateManager->getImportResults()
            );
        }
    }

    /**
     * Execute the import process (dispatcher: small vs chunked)
     *
     * Chooses import strategy based on dataset size:
     * - Small (<50 rows): Single transaction
     * - Large (>50 rows): Chunked processing with batch optimization
     *
     * @return array ['imported_count' => int, 'duplicate_count' => int]
     */
    protected function executeImport(array $data, InstitutionType $institutionType): array
    {
        $totalRows = count($data);

        // For large datasets (>50 rows), use chunked processing
        if ($totalRows > 50) {
            $importResults = $this->stateManager->getImportResults();
            $importedCount = $this->chunkProcessor->executeChunkedImport($data, $institutionType, $importResults);

            return [
                'imported_count'  => $importedCount,
                'duplicate_count' => 0, // ChunkProcessor doesn't track duplicates yet
            ];
        }

        // For small datasets, use single transaction
        return DB::transaction(function () use ($data, $institutionType) {
            return $this->processSmallDataset($data, $institutionType);
        });
    }

    /**
     * Process small dataset in single transaction
     *
     * @return array ['imported_count' => int, 'duplicate_count' => int]
     */
    protected function processSmallDataset(array $data, InstitutionType $institutionType): array
    {
        $importedCount   = 0;
        $duplicateCount  = 0;
        $institutionLevel = $institutionType->level ?? $institutionType->default_level;

        Log::info('Processing small dataset', [
            'row_count'        => count($data),
            'institution_level' => $institutionLevel,
            'first_row_sample' => $data[0] ?? null,
        ]);

        foreach ($data as $index => $rowData) {
            try {
                Log::info('Processing row', [
                    'row_index'         => $index,
                    'row_number'        => $rowData['row'] ?? 'unknown',
                    'name'              => $rowData['name'] ?? 'N/A',
                    'has_preschooladmin' => isset($rowData['preschooladmin']),
                ]);

                // Skip sample data rows
                if ($this->dataTypeParser->isSampleRow($rowData)) {
                    Log::info('Skipping sample row', ['row' => $rowData['row'] ?? 'unknown']);
                    $this->stateManager->addResult(
                        $this->messageFormatter->formatSkipMessage($rowData, 'Nümunə sətri')
                    );

                    continue;
                }

                // UTIS kodu yoxlaması — upsert vs conflict
                $utisCode = $rowData['utis_code'] ?? '';
                if (! empty($utisCode) && $this->duplicateDetector->isDuplicateUtisCode($utisCode)) {
                    $existingInstitution = $this->duplicateDetector->getInstitutionByUtisCode($utisCode);

                    if ($this->upsertOnUtis && $existingInstitution) {
                        // Upsert: mövcud institutu yenilə
                        $updateData = array_filter([
                            'name'             => $rowData['name'] ?: null,
                            'short_name'       => $rowData['short_name'] ?: null,
                            'institution_code' => $rowData['institution_code'] ?: null,
                            'region_code'      => $rowData['region_code'] ?: null,
                            'contact_info'     => $rowData['contact_info'] ?: null,
                            'location'         => $rowData['location'] ?: null,
                            'established_date' => $rowData['established_date'] ?? null,
                            'is_active'        => $rowData['is_active'] ?? true,
                        ], fn ($v) => $v !== null && $v !== '');

                        $existingInstitution->update($updateData);
                        $importedCount++;
                        $this->stateManager->addResult(
                            "✏️ Sətir {$rowData['row']}: '{$existingInstitution->name}' yenil\u0259ndi (UTIS: {$utisCode})"
                        );
                        continue;
                    }

                    // Upsert deyilsə — conflict olaraq qeyd et
                    $this->stateManager->addResult(
                        $this->messageFormatter->formatDuplicateMessage($rowData, $existingInstitution)
                    );
                    $duplicateCount++;
                    continue;
                }

                // Create institution
                $institution = $this->institutionCreator->createInstitution($rowData, $institutionType);

                // Create SchoolAdmin user if level 4
                $schoolAdminInfo = null;
                if ($institutionLevel == 4 && isset($rowData['schooladmin'])) {
                    $schoolAdmin = $this->schoolAdminCreator->createSchoolAdmin(
                        $rowData['schooladmin'],
                        $institution
                    );
                    $schoolAdminInfo = [
                        'username'          => $schoolAdmin->username,
                        'email'             => $schoolAdmin->email,
                        'original_username' => $rowData['schooladmin']['username'] ?? '',
                        'original_email'    => $rowData['schooladmin']['email'] ?? '',
                    ];
                }

                // Create PreschoolAdmin user if level 5
                if ($institutionLevel == 5 && isset($rowData['preschooladmin'])) {
                    $preschoolAdmin = $this->schoolAdminCreator->createPreschoolAdmin(
                        $rowData['preschooladmin'],
                        $institution
                    );
                    $schoolAdminInfo = [
                        'username'          => $preschoolAdmin->username,
                        'email'             => $preschoolAdmin->email,
                        'original_username' => $rowData['preschooladmin']['username'] ?? '',
                        'original_email'    => $rowData['preschooladmin']['email'] ?? '',
                    ];
                }

                $importedCount++;
                $this->stateManager->addResult(
                    $this->messageFormatter->formatSuccessMessage($rowData, $institution, $schoolAdminInfo)
                );
            } catch (\Exception $e) {
                $rowNum = $rowData['row'] ?? $index;
                Log::error('Institution import row error', [
                    'row'              => $rowNum,
                    'error'            => $e->getMessage(),
                    'institution_name' => $rowData['name'] ?? 'N/A',
                    'utis_code'        => $rowData['utis_code'] ?? '',
                    'parent_id'        => $rowData['parent_id'] ?? null,
                ]);

                // Dəqiq xəta mesajı — sahə ipucunu da əlavə et
                $hint = $this->resolveErrorHint($e->getMessage(), $rowData);
                $this->stateManager->addResult(
                    "❌ Sətir {$rowNum}: {$e->getMessage()}{$hint}"
                );
            }
        }

        Log::info('processSmallDataset completed', [
            'total_imported' => $importedCount,
            'total_rows'     => count($data),
        ]);

        return [
            'imported_count'  => $importedCount,
            'duplicate_count' => $duplicateCount,
        ];
    }

    /**
     * Reset import state for new operation
     */
    protected function resetImportState(): void
    {
        $this->stateManager->resetImportState();
        $this->validator->resetValidationErrors();
        $this->batchOptimizer->resetCache();
        $this->duplicateDetector->resetBatchCache();
    }

    /**
     * Build validation error response with contextual help
     */
    protected function buildValidationErrorResponse(array $validationErrors): array
    {
        $errorMessage = 'Faylda validasiya xətaları tapıldı. Zəhmət olmasa düzəltdikdən sonra yenidən cəhd edin.';

        $parentIdErrors = 0;
        foreach ($validationErrors as $rowErrors) {
            if (isset($rowErrors['parent_id'])) {
                $parentIdErrors++;
            }
        }

        if ($parentIdErrors > 0) {
            $errorMessage .= "\n\n📋 KÖMƏK - ÜST MÜƏSSİSƏ ID PROBLEMİ:";
            $errorMessage .= "\n1. Faylda üst müəssisə ID-sini düzgün daxil edin";
            $errorMessage .= "\n2. CSV-də J sütununa yalnız rəqəm (ID) yazın";
            $errorMessage .= "\n3. Excel-də 'Üst Müəssisələr' sheet-indən ID götürün";
        }

        return $this->responseBuilder->buildErrorResponse(
            $errorMessage,
            $validationErrors,
            $this->stateManager->getImportResults()
        );
    }

    /**
     * Xəta mətnindən istifadəçi üçün düzəliş ipucunu təyin et.
     */
    protected function resolveErrorHint(string $message, array $rowData): string
    {
        $msg = strtolower($message);

        if (str_contains($msg, 'parent_id') || str_contains($msg, '"parent"')) {
            $val = $rowData['parent_id'] ?? null;

            return " → J sütununda üst müəssisə ID-si düzgün deyil (dəyər: " . ($val ?? 'boş') . ')';
        }

        if (str_contains($msg, 'utis_code') || str_contains($msg, 'utis')) {
            return " → UTIS kodu " . ($rowData['utis_code'] ?? 'boş') . ": 7-10 rəqəmli olmalıdır";
        }

        if (str_contains($msg, 'name') && str_contains($msg, 'unique')) {
            return " → '" . ($rowData['name'] ?? '') . "' adında müəssisə artıq mövcuddur. Fərqli ad seçin";
        }

        if (str_contains($msg, 'email')) {
            $email = $rowData['schooladmin']['email'] ?? $rowData['preschooladmin']['email'] ?? 'bilinməz';

            return " → Email ({$email}) artıq mövcuddur və ya düzgün deyil";
        }

        return '';
    }
}
