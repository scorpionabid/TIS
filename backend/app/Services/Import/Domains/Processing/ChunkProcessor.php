<?php

namespace App\Services\Import\Domains\Processing;

use App\Models\InstitutionType;
use App\Services\Import\Domains\Duplicates\DuplicateDetector;
use App\Services\Import\Domains\Formatting\MessageFormatter;
use App\Services\Import\Domains\Parsing\DataTypeParser;
use App\Services\Import\Domains\UserManagement\SchoolAdminCreator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Chunk Processor Service
 *
 * Processes large datasets (>50 rows) in chunks to prevent timeouts.
 * Each chunk runs in its own transaction with batch optimization.
 *
 * CRITICAL: This service contains production-critical chunked processing logic.
 * Preserve transaction boundaries and chunk size (25 rows).
 */
class ChunkProcessor
{
    /**
     * Chunk size for processing
     */
    protected const CHUNK_SIZE = 25;

    /**
     * Delay between chunks in microseconds (100ms)
     */
    protected const CHUNK_DELAY = 100000;

    public function __construct(
        protected BatchOptimizer $batchOptimizer,
        protected DataTypeParser $dataTypeParser,
        protected DuplicateDetector $duplicateDetector,
        protected InstitutionCreator $institutionCreator,
        protected SchoolAdminCreator $schoolAdminCreator,
        protected MessageFormatter $messageFormatter
    ) {}

    /**
     * Execute chunked import for large datasets to prevent timeouts
     *
     * Processes data in chunks of 25 rows with:
     * - Separate transaction per chunk
     * - Batch optimization (N+1 prevention)
     * - 100ms delay between chunks
     *
     * @param array $data
     * @param InstitutionType $institutionType
     * @param array &$importResults Reference to results array
     * @return int Total imported count
     */
    public function executeChunkedImport(array $data, InstitutionType $institutionType, array &$importResults): int
    {
        $totalRows = count($data);
        $totalImported = 0;
        $chunks = array_chunk($data, self::CHUNK_SIZE);
        $totalChunks = count($chunks);

        Log::info('Starting chunked import', [
            'total_rows' => $totalRows,
            'chunk_size' => self::CHUNK_SIZE,
            'total_chunks' => $totalChunks,
            'institution_type' => $institutionType->key
        ]);

        foreach ($chunks as $chunkIndex => $chunk) {
            $chunkNumber = $chunkIndex + 1;

            try {
                Log::info("Processing chunk {$chunkNumber}/{$totalChunks}", [
                    'chunk_size' => count($chunk),
                    'rows' => array_column($chunk, 'row')
                ]);

                // Process each chunk in its own transaction
                $chunkImported = DB::transaction(function () use ($chunk, $institutionType, &$importResults) {
                    return $this->processChunk($chunk, $institutionType, $importResults);
                });

                $totalImported += $chunkImported;

                Log::info("Chunk {$chunkNumber} completed", [
                    'imported_in_chunk' => $chunkImported,
                    'total_imported_so_far' => $totalImported
                ]);

                // Add a small delay between chunks to prevent resource exhaustion
                if ($chunkNumber < $totalChunks) {
                    usleep(self::CHUNK_DELAY);
                }

            } catch (\Exception $e) {
                Log::error("Chunk {$chunkNumber} failed", [
                    'error' => $e->getMessage(),
                    'chunk_data' => array_column($chunk, 'name')
                ]);

                // Add error messages for this chunk
                foreach ($chunk as $rowData) {
                    $importResults[] = "❌ {$rowData['row']}: Chunk işleme xətası";
                }
            }
        }

        Log::info('Chunked import completed', [
            'total_imported' => $totalImported,
            'total_chunks_processed' => $totalChunks
        ]);

        return $totalImported;
    }

    /**
     * Process a single chunk of data with optimized batch queries
     *
     * Steps:
     * 1. Preload existing data (N+1 prevention)
     * 2. Loop through rows
     * 3. Skip sample rows
     * 4. Check duplicates (batch)
     * 5. Create institution + SchoolAdmin
     * 6. Format result messages
     *
     * @param array $chunk
     * @param InstitutionType $institutionType
     * @param array &$importResults Reference to results array
     * @return int Imported count in this chunk
     */
    public function processChunk(array $chunk, InstitutionType $institutionType, array &$importResults): int
    {
        $importedCount = 0;
        $institutionLevel = $institutionType->level ?? $institutionType->default_level;

        // Pre-load existing data to avoid N+1 queries
        $this->batchOptimizer->preloadExistingData($chunk);

        // Extract UTIS codes and preload for duplicate detector
        $utisCodes = array_filter(array_column($chunk, 'utis_code'));
        if (!empty($utisCodes)) {
            $this->duplicateDetector->preloadInstitutionsByUtis($utisCodes);
        }

        foreach ($chunk as $rowData) {
            try {
                // Skip sample data rows
                if ($this->dataTypeParser->isSampleRow($rowData)) {
                    $importResults[] = $this->messageFormatter->formatSkipMessage($rowData, "Nümunə sətri");
                    continue;
                }

                // Check for duplicate UTIS codes using batch cache
                if ($this->duplicateDetector->isDuplicateUtisCodeBatch($rowData['utis_code'])) {
                    $existingInstitution = $this->duplicateDetector->getInstitutionByUtisCodeBatch($rowData['utis_code']);
                    $importResults[] = $this->messageFormatter->formatDuplicateMessage($rowData, $existingInstitution);
                    continue;
                }

                // Create institution
                $institution = $this->institutionCreator->createInstitution($rowData, $institutionType);

                // Create SchoolAdmin user if level 4
                $schoolAdminInfo = null;
                if ($institutionLevel == 4 && isset($rowData['schooladmin'])) {
                    $schoolAdmin = $this->schoolAdminCreator->createSchoolAdmin(
                        $rowData['schooladmin'],
                        $institution,
                        $this->batchOptimizer
                    );
                    $schoolAdminInfo = [
                        'username' => $schoolAdmin->username,
                        'email' => $schoolAdmin->email,
                        'original_username' => $rowData['schooladmin']['username'] ?? '',
                        'original_email' => $rowData['schooladmin']['email'] ?? ''
                    ];
                }

                $importedCount++;
                $importResults[] = $this->messageFormatter->formatSuccessMessage($rowData, $institution, $schoolAdminInfo);

            } catch (\Exception $e) {
                Log::error("Institution import row error in chunk", [
                    'row' => $rowData['row'],
                    'error' => $e->getMessage(),
                    'institution_name' => $rowData['name'] ?? 'N/A'
                ]);

                $importResults[] = $this->messageFormatter->formatErrorMessage($rowData, $e);
            }
        }

        return $importedCount;
    }
}
