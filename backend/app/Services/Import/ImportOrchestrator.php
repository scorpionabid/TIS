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
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Central orchestrator for all import operations
 *
 * REFACTORED: Sprint 2 - Modular service architecture with dependency injection
 *
 * Coordinates between different domain services:
 * - FileOperations: Excel loading and parsing
 * - Parsing: Data type conversions
 * - Validation: Laravel validation
 * - Duplicates: Duplicate detection
 * - Processing: Import execution and chunking
 * - UserManagement: SchoolAdmin creation
 * - Formatting: Response building
 * - Analytics: Statistics generation
 * - StateManagement: State tracking
 */
class ImportOrchestrator
{
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
     * PUBLIC API: This method signature MUST remain unchanged for backward compatibility.
     *
     * Workflow:
     * 1. Reset state
     * 2. Load Excel file
     * 3. Parse data
     * 4. Validate data
     * 5. Execute import (dispatcher: small vs chunked)
     * 6. Build response
     *
     * @return array API response
     */
    public function importInstitutionsByType(UploadedFile $file, string $institutionTypeKey): array
    {
        try {
            // 1. Reset import state
            $this->resetImportState();

            // 2. Get institution type
            $institutionType = InstitutionType::where('key', $institutionTypeKey)->firstOrFail();

            // 3. Load and validate Excel file
            $spreadsheet = $this->fileLoader->loadExcelFile($file);

            // 4. Parse Excel data
            $data = $this->dataParser->parseExcelData($spreadsheet, $institutionType);

            Log::info('Excel data parsed', [
                'institution_type' => $institutionTypeKey,
                'institution_level' => $institutionType->level ?? $institutionType->default_level,
                'parsed_rows' => count($data),
                'sample_data' => $data ? array_slice($data, 0, 2) : [],
            ]);

            // Check if data is empty
            if (empty($data)) {
                Log::warning('No data parsed from Excel file');

                return $this->responseBuilder->buildErrorResponse(
                    'Excel faylından məlumat oxuna bilmədi və ya fayl boşdur',
                    [],
                    []
                );
            }

            // 5. Validate parsed data
            $this->validator->validateImportData($data, $institutionType);

            Log::info('Validation completed', [
                'validation_errors_count' => count($this->validator->getValidationErrors()),
                'validation_errors' => $this->validator->getValidationErrors(),
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
                'data_count' => count($data),
                'institution_level' => $institutionType->level ?? $institutionType->default_level,
            ]);

            $importResult = $this->executeImport($data, $institutionType);
            $importedCount = $importResult['imported_count'];
            $duplicateCount = $importResult['duplicate_count'];

            Log::info('Import execution completed', [
                'imported_count' => $importedCount,
                'duplicate_count' => $duplicateCount,
                'import_results' => $this->stateManager->getImportResults(),
            ]);

            // 7. Build success response
            return $this->responseBuilder->buildSuccessResponse(
                $importedCount,
                $this->stateManager->getImportResults()
            );
        } catch (\Exception $e) {
            Log::error('Institution import error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
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
                'imported_count' => $importedCount,
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
        $importedCount = 0;
        $duplicateCount = 0;
        $institutionLevel = $institutionType->level ?? $institutionType->default_level;

        Log::info('Processing small dataset', [
            'row_count' => count($data),
            'institution_level' => $institutionLevel,
            'first_row_sample' => $data[0] ?? null,
        ]);

        foreach ($data as $index => $rowData) {
            try {
                Log::info('Processing row', [
                    'row_index' => $index,
                    'row_number' => $rowData['row'] ?? 'unknown',
                    'name' => $rowData['name'] ?? 'N/A',
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

                // Check for duplicate UTIS codes
                if ($this->duplicateDetector->isDuplicateUtisCode($rowData['utis_code'])) {
                    $existingInstitution = $this->duplicateDetector->getInstitutionByUtisCode($rowData['utis_code']);
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
                        'username' => $schoolAdmin->username,
                        'email' => $schoolAdmin->email,
                        'original_username' => $rowData['schooladmin']['username'] ?? '',
                        'original_email' => $rowData['schooladmin']['email'] ?? '',
                    ];
                }

                // Create PreschoolAdmin user if level 5
                if ($institutionLevel == 5 && isset($rowData['preschooladmin'])) {
                    $preschoolAdmin = $this->schoolAdminCreator->createPreschoolAdmin(
                        $rowData['preschooladmin'],
                        $institution
                    );
                    $schoolAdminInfo = [
                        'username' => $preschoolAdmin->username,
                        'email' => $preschoolAdmin->email,
                        'original_username' => $rowData['preschooladmin']['username'] ?? '',
                        'original_email' => $rowData['preschooladmin']['email'] ?? '',
                    ];
                }

                $importedCount++;
                $this->stateManager->addResult(
                    $this->messageFormatter->formatSuccessMessage($rowData, $institution, $schoolAdminInfo)
                );
            } catch (\Exception $e) {
                Log::error('Institution import row error', [
                    'row' => $rowData['row'],
                    'error' => $e->getMessage(),
                    'institution_name' => $rowData['name'] ?? 'N/A',
                ]);

                $this->stateManager->addResult(
                    $this->messageFormatter->formatErrorMessage($rowData, $e)
                );
            }
        }

        Log::info('processSmallDataset completed', [
            'total_imported' => $importedCount,
            'total_rows' => count($data),
        ]);

        return [
            'imported_count' => $importedCount,
            'duplicate_count' => $duplicateCount,
        ];
    }

    /**
     * Reset import state for new operation
     *
     * Resets:
     * - Import results (via ImportStateManager)
     * - Validation errors (via ImportDataValidator)
     * - Batch caches (via BatchOptimizer and DuplicateDetector)
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
        // Add helpful context for common errors
        $errorMessage = 'Excel faylında validasiya xətaları tapıldı. Zəhmət olmasa düzəltdikdən sonra yenidən cəhd edin.';

        // Check if parent_id errors are common and add specific help
        $parentIdErrors = 0;
        foreach ($validationErrors as $rowErrors) {
            if (isset($rowErrors['parent_id'])) {
                $parentIdErrors++;
            }
        }

        if ($parentIdErrors > 0) {
            $errorMessage .= "\n\n📋 KÖMƏK - ÜST MÜƏSSİSƏ ID PROBLEMİ:";
            $errorMessage .= "\n1. Excel faylında 'Üst Müəssisələr' sheet-ini açın";
            $errorMessage .= "\n2. Lazımi müəssisənin ID-sini (A sütunu) kopyalayın";
            $errorMessage .= "\n3. Əsas sheet-də J sütununa yapışdırın";
            $errorMessage .= "\n4. Həmçinin müəssisə adını da yaza bilərsiniz (sistem avtomatik tapacaq)";
        }

        return $this->responseBuilder->buildErrorResponse(
            $errorMessage,
            $validationErrors,
            $this->stateManager->getImportResults()
        );
    }
}
