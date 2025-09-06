<?php

namespace App\Services\Import;

use App\Models\Institution;
use App\Models\InstitutionType;
use App\Services\BaseService;
use App\Services\InstitutionDuplicateDetector;
use App\Services\InstitutionImportHistoryService;
use App\Services\InstitutionImportPermissionService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Exception;

class InstitutionImportOrchestrator extends BaseService
{
    protected InstitutionExcelTemplateService $templateService;
    protected InstitutionExcelParserService $parserService;
    protected InstitutionImportValidationService $validationService;
    protected InstitutionTypeProcessorFactory $processorFactory;
    protected InstitutionImportHistoryService $historyService;
    protected InstitutionImportPermissionService $permissionService;
    protected InstitutionDuplicateDetector $duplicateDetector;
    protected InstitutionAdminCreatorService $adminCreatorService;

    public function __construct()
    {
        $this->templateService = new InstitutionExcelTemplateService();
        $this->parserService = new InstitutionExcelParserService();
        $this->validationService = new InstitutionImportValidationService();
        $this->processorFactory = new InstitutionTypeProcessorFactory();
        $this->historyService = new InstitutionImportHistoryService();
        $this->permissionService = new InstitutionImportPermissionService();
        $this->duplicateDetector = new InstitutionDuplicateDetector();
        $this->adminCreatorService = new InstitutionAdminCreatorService();
    }

    /**
     * Process import file with full enterprise workflow
     */
    public function processImport(
        UploadedFile $file, 
        InstitutionType $institutionType, 
        array $options = [], 
        ?Request $request = null
    ): array {
        $startTime = microtime(true);
        
        // Create history record
        $historyRecord = $this->historyService->createImportRecord(
            $institutionType->key,
            $file->getClientOriginalName(),
            $file->getSize(),
            $options,
            $request
        );
        
        try {
            // Step 1: Parse Excel file
            $parseResult = $this->parserService->parseExcelFile($file);
            if (!$parseResult['success']) {
                throw new Exception($parseResult['error']);
            }
            
            $dataRows = $parseResult['data_rows'];
            if (empty($dataRows)) {
                throw new Exception("Faylda emal ediləcək məlumat tapılmadı");
            }
            
            // Step 2: Batch validation
            $validationResult = $this->validationService->validateBatch($dataRows, $institutionType);
            
            // Step 3: Duplicate detection (if enabled)
            $duplicateResults = null;
            if (!($options['skip_duplicate_detection'] ?? false)) {
                $duplicateResults = $this->performDuplicateDetection($dataRows, $institutionType);
            }
            
            // Step 4: Process each row with type-specific logic
            $importResults = $this->processDataRows(
                $dataRows, 
                $institutionType, 
                $validationResult, 
                $duplicateResults, 
                $options
            );
            
            // Step 5: Calculate processing time and update history
            $processingTimeMs = (int)((microtime(true) - $startTime) * 1000);
            
            $finalResults = [
                'success' => $importResults['success'],
                'total_rows' => count($dataRows),
                'errors' => $importResults['errors'],
                'warnings' => array_merge(
                    $this->extractWarnings($validationResult),
                    $importResults['warnings']
                ),
                'created_institutions' => $importResults['created_institutions'],
                'created_admins' => $importResults['created_admins'],
                'admin_statistics' => $importResults['admin_statistics'],
                'duplicates' => $duplicateResults ?? [],
                'skipped' => $importResults['skipped'],
                'validation_summary' => [
                    'valid_rows' => $validationResult['valid_rows'],
                    'invalid_rows' => $validationResult['invalid_rows'],
                    'total_errors' => $validationResult['total_errors'],
                    'total_warnings' => $validationResult['total_warnings']
                ],
                // Enhanced error details
                'detailed_summary' => [
                    'institutions_processed' => count($dataRows),
                    'institutions_created' => $importResults['success'],
                    'institutions_failed' => count($importResults['errors']),
                    'institutions_skipped' => $importResults['skipped'],
                    'admins_created' => $importResults['admin_statistics']['admins_created'],
                    'admins_skipped' => $importResults['admin_statistics']['admins_skipped'],
                    'admin_errors' => $importResults['admin_statistics']['admin_errors'],
                    'validation_errors' => $validationResult['total_errors'],
                    'validation_warnings' => $validationResult['total_warnings'],
                    'processing_time_ms' => $processingTimeMs,
                    'file_name' => $file->getClientOriginalName(),
                    'institution_type' => $institutionType->key
                ]
            ];
            
            $this->historyService->updateImportRecord($historyRecord, $finalResults, $processingTimeMs);
            
            // Comprehensive import completion logging
            \Log::info('Import prosesi tamamlandı', [
                'import_id' => $historyRecord,
                'file_name' => $file->getClientOriginalName(),
                'institution_type' => $institutionType->key,
                'total_rows' => count($dataRows),
                'institutions_created' => $importResults['success'],
                'institutions_failed' => count($importResults['errors']),
                'institutions_skipped' => $importResults['skipped'],
                'admins_created' => $importResults['admin_statistics']['admins_created'],
                'admins_skipped' => $importResults['admin_statistics']['admins_skipped'],
                'admin_errors' => $importResults['admin_statistics']['admin_errors'],
                'validation_errors' => $validationResult['total_errors'],
                'validation_warnings' => $validationResult['total_warnings'],
                'processing_time_ms' => $processingTimeMs,
                'errors_detail' => $importResults['errors'],
                'warnings_detail' => array_merge(
                    $this->extractWarnings($validationResult),
                    $importResults['warnings']
                )
            ]);
            
            return $finalResults;
            
        } catch (Exception $e) {
            $this->historyService->markAsFailed($historyRecord, $e->getMessage());
            throw $e;
        }
    }

    /**
     * Generate template file
     */
    public function generateTemplate(InstitutionType $institutionType, string $fileName): string
    {
        return $this->templateService->generateTypeSpecificTemplate($institutionType, $fileName);
    }

    /**
     * Generate basic template (legacy support)
     */
    public function generateBasicTemplate($institutions, string $fileName): string
    {
        return $this->templateService->generateBasicTemplate($institutions, $fileName);
    }

    /**
     * Export institutions to Excel
     */
    public function exportInstitutions($institutions, string $fileName): string
    {
        // Create export service or add to template service as needed
        // For now, delegating to template service for consistency
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set headers
        $headers = [
            'ID', 'Ad', 'Qısa Ad', 'Növ', 'Valideyn', 'Səviyyə',
            'Region Kodu', 'Qurum Kodu', 'UTIS Kodu', 'Telefon',
            'Email', 'Ünvan', 'Qurulma Tarixi', 'Status', 'Yaradılma Tarixi'
        ];

        foreach ($headers as $index => $header) {
            $sheet->setCellValue(chr(65 + $index) . '1', $header);
            $sheet->getStyle(chr(65 + $index) . '1')->getFont()->setBold(true);
        }

        // Add data rows
        foreach ($institutions as $index => $institution) {
            $row = $index + 2;
            $contactInfo = is_string($institution->contact_info) ? 
                json_decode($institution->contact_info, true) : $institution->contact_info;
            $location = is_string($institution->location) ? 
                json_decode($institution->location, true) : $institution->location;

            $sheet->setCellValue('A' . $row, $institution->id);
            $sheet->setCellValue('B' . $row, $institution->name);
            $sheet->setCellValue('C' . $row, $institution->short_name);
            $sheet->setCellValue('D' . $row, $institution->institutionType->name ?? $institution->type);
            $sheet->setCellValue('E' . $row, $institution->parent->name ?? '');
            $sheet->setCellValue('F' . $row, $institution->level);
            $sheet->setCellValue('G' . $row, $institution->region_code);
            $sheet->setCellValue('H' . $row, $institution->institution_code);
            $sheet->setCellValue('I' . $row, $institution->utis_code);
            $sheet->setCellValue('J' . $row, $contactInfo['phone'] ?? '');
            $sheet->setCellValue('K' . $row, $contactInfo['email'] ?? '');
            $sheet->setCellValue('L' . $row, $location['address'] ?? '');
            $sheet->setCellValue('M' . $row, $institution->established_date);
            $sheet->setCellValue('N' . $row, $institution->is_active ? 'Aktiv' : 'Qeyri-aktiv');
            $sheet->setCellValue('O' . $row, $institution->created_at);
        }

        // Auto-size columns
        foreach (range('A', 'O') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        // Save to temporary file
        $filePath = storage_path('app/temp/' . $fileName);
        if (!is_dir(dirname($filePath))) {
            mkdir(dirname($filePath), 0755, true);
        }

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * Perform duplicate detection
     */
    private function performDuplicateDetection(array $dataRows, InstitutionType $institutionType): array
    {
        $institutionData = [];
        foreach ($dataRows as $rowData) {
            $row = $rowData['data'];
            if (empty(trim($row[1] ?? ''))) continue;
            
            $institutionData[] = [
                'name' => trim($row[1]),
                'institution_code' => trim($row[6] ?? ''),
                'parent_id' => trim($row[3] ?? ''),
                'type' => $institutionType->key,
                'row_number' => $rowData['excel_row_number']
            ];
        }
        
        return $this->duplicateDetector->detectDuplicates($institutionData, $institutionType);
    }

    /**
     * Process data rows with type-specific processing
     */
    private function processDataRows(
        array $dataRows, 
        InstitutionType $institutionType, 
        array $validationResult,
        ?array $duplicateResults,
        array $options
    ): array {
        $results = [
            'success' => 0,
            'errors' => [],
            'warnings' => [],
            'created_institutions' => [],
            'created_admins' => [],
            'admin_statistics' => [
                'admins_created' => 0,
                'admins_skipped' => 0,
                'admin_errors' => 0
            ],
            'skipped' => 0
        ];

        foreach ($dataRows as $rowData) {
            $rowNum = $rowData['excel_row_number'];
            $row = $rowData['data'];
            
            try {
                // Skip empty rows
                if (empty(trim($row[1] ?? ''))) {
                    continue;
                }
                
                // Check validation results
                if (isset($validationResult['row_results'][$rowNum]) && 
                    !$validationResult['row_results'][$rowNum]['valid']) {
                    // Add validation errors to results
                    $results['errors'] = array_merge(
                        $results['errors'], 
                        $validationResult['row_results'][$rowNum]['errors']
                    );
                    continue;
                }
                
                // Check duplicate handling
                if ($this->shouldSkipDueToDuplicates($rowNum, $duplicateResults, $options)) {
                    $results['skipped']++;
                    continue;
                }
                
                // Process with type-specific processor
                $institutionData = $this->processorFactory->processRowForType(
                    $row, 
                    $institutionType->key, 
                    $rowNum
                );
                
                // Apply duplicate resolution if needed
                if ($duplicateResults && isset($options['duplicate_handling'])) {
                    $institutionData = $this->applyDuplicateResolution(
                        $institutionData, 
                        $rowNum, 
                        $duplicateResults, 
                        $options['duplicate_handling']
                    );
                }
                
                // Extract admin data before creating institution
                $adminData = $institutionData['admin_data'] ?? null;
                unset($institutionData['admin_data']); // Remove from institution data
                
                // Create institution
                $institution = Institution::create($institutionData);
                
                // Attempt to create admin if admin data provided
                $adminResult = null;
                if ($adminData || $options['create_admin_always'] ?? false) {
                    $adminResult = $this->adminCreatorService->createAdminForInstitution(
                        $institution, 
                        $adminData, 
                        $institutionType->key
                    );
                    
                    // Update admin statistics
                    if ($adminResult['admin_created']) {
                        $results['admin_statistics']['admins_created']++;
                        $results['created_admins'][] = $adminResult['admin'];
                    } elseif ($adminResult['success']) {
                        $results['admin_statistics']['admins_skipped']++;
                    } else {
                        $results['admin_statistics']['admin_errors']++;
                        // Add admin error as warning, don't fail institution creation
                        $results['warnings'][] = "Sətir {$rowNum}: Admin xətası - " . $adminResult['message'];
                    }
                }
                
                $results['success']++;
                $results['created_institutions'][] = [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'type' => $institution->type,
                    'level' => $institution->level,
                    'admin_result' => $adminResult
                ];
                
            } catch (Exception $e) {
                $errorMessage = "Sətir {$rowNum}: " . $e->getMessage();
                $results['errors'][] = $errorMessage;
                
                // Enhanced error logging
                \Log::error('Institution import row error', [
                    'row_number' => $rowNum,
                    'error_message' => $e->getMessage(),
                    'row_data' => array_slice($row, 0, 5), // First 5 columns for context
                    'institution_type' => $institutionType->key,
                    'stack_trace' => $e->getTraceAsString()
                ]);
            }
        }
        
        return $results;
    }

    /**
     * Check if row should be skipped due to duplicate handling settings
     */
    private function shouldSkipDueToDuplicates(?int $rowNum, ?array $duplicateResults, array $options): bool
    {
        if (!$duplicateResults || !isset($options['duplicate_handling'])) {
            return false;
        }
        
        $handling = $options['duplicate_handling'];
        
        foreach ($duplicateResults['recommendations'] ?? [] as $recommendation) {
            if ($recommendation['row'] === $rowNum) {
                if ($recommendation['severity'] === 'high' && $handling['high_severity'] === 'skip') {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Apply duplicate resolution strategies
     */
    private function applyDuplicateResolution(
        array $institutionData, 
        int $rowNum, 
        array $duplicateResults, 
        array $handling
    ): array {
        foreach ($duplicateResults['recommendations'] ?? [] as $recommendation) {
            if ($recommendation['row'] !== $rowNum) {
                continue;
            }
            
            switch ($recommendation['type']) {
                case 'exact_duplicate':
                case 'similar_duplicate':
                    if ($handling['name_conflict'] === 'auto_rename') {
                        $institutionData['name'] = $this->generateUniqueName($institutionData['name']);
                    }
                    break;
                    
                case 'code_conflict':
                    if ($handling['code_conflict'] === 'auto_generate') {
                        $institutionData['institution_code'] = $this->generateUniqueInstitutionCode(
                            $institutionData['institution_code'] ?? null
                        );
                    }
                    break;
            }
        }
        
        return $institutionData;
    }

    /**
     * Generate unique institution name
     */
    private function generateUniqueName(string $baseName): string
    {
        $counter = 1;
        $originalName = $baseName;
        
        do {
            $newName = $originalName . " ({$counter})";
            $exists = Institution::where('name', $newName)->exists();
            $counter++;
        } while ($exists && $counter < 100);
        
        return $newName;
    }

    /**
     * Generate unique institution code
     */
    private function generateUniqueInstitutionCode(?string $baseCode = null): string
    {
        if (!$baseCode) {
            $baseCode = 'INST';
        }
        
        // Remove existing numbers at the end
        $cleanBase = preg_replace('/\d+$/', '', $baseCode);
        $counter = 1;
        
        do {
            $newCode = $cleanBase . sprintf('%03d', $counter);
            $exists = Institution::where('institution_code', $newCode)->exists();
            $counter++;
        } while ($exists && $counter < 1000);
        
        return $newCode;
    }

    /**
     * Extract warnings from validation results
     */
    private function extractWarnings(array $validationResult): array
    {
        $warnings = [];
        
        foreach ($validationResult['row_results'] ?? [] as $rowResult) {
            $warnings = array_merge($warnings, $rowResult['warnings'] ?? []);
        }
        
        return $warnings;
    }

    /**
     * Get orchestrator statistics for monitoring
     */
    public function getStatistics(): array
    {
        return [
            'available_processors' => count($this->processorFactory->getAllProcessors()),
            'handled_types' => $this->processorFactory->getAllHandledTypes(),
            'admin_creation_enabled' => true,
            'services' => [
                'template_service' => get_class($this->templateService),
                'parser_service' => get_class($this->parserService),
                'validation_service' => get_class($this->validationService),
                'processor_factory' => get_class($this->processorFactory),
                'history_service' => get_class($this->historyService),
                'permission_service' => get_class($this->permissionService),
                'duplicate_detector' => get_class($this->duplicateDetector),
                'admin_creator_service' => get_class($this->adminCreatorService)
            ]
        ];
    }
}