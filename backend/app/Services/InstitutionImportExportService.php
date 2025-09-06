<?php

namespace App\Services;

use App\Models\InstitutionType;
use App\Services\Import\InstitutionImportOrchestrator;
use Illuminate\Http\Request;

/**
 * Refactored Institution Import/Export Service
 * 
 * This service acts as a facade/proxy to the new modular import system
 * while maintaining backward compatibility with existing controller code.
 * 
 * The original 828-line monolithic service has been decomposed into:
 * - InstitutionExcelTemplateService (template generation)
 * - InstitutionExcelParserService (Excel parsing)
 * - InstitutionImportValidationService (data validation)  
 * - Type-specific processors (business logic)
 * - InstitutionImportOrchestrator (main coordinator)
 */
class InstitutionImportExportService extends BaseService
{
    protected InstitutionImportOrchestrator $orchestrator;

    public function __construct()
    {
        $this->orchestrator = new InstitutionImportOrchestrator();
    }

    /**
     * Generate import template for institutions (Legacy compatibility)
     */
    public function generateImportTemplate($institutions, $fileName): string
    {
        return $this->orchestrator->generateBasicTemplate($institutions, $fileName);
    }

    /**
     * Process import file and create institutions (Legacy compatibility)
     */
    public function processImportFile($file, $institutionIds): array
    {
        // For legacy calls without institution type, use generic processing
        $genericType = InstitutionType::where('key', 'secondary_school')->first();
        if (!$genericType) {
            throw new \Exception("Default institution type not found. Please specify institution type.");
        }

        return $this->orchestrator->processImport($file, $genericType, [
            'skip_duplicate_detection' => false,
            'duplicate_handling' => [
                'high_severity' => 'skip',
                'medium_severity' => 'warn', 
                'name_conflict' => 'skip',
                'code_conflict' => 'skip'
            ]
        ]);
    }

    /**
     * Generate export file for institutions (Legacy compatibility)
     */
    public function generateExportFile($institutions, $fileName): string
    {
        return $this->orchestrator->exportInstitutions($institutions, $fileName);
    }

    /**
     * Generate template by institution type
     */
    public function generateTemplateByType(InstitutionType $institutionType, string $fileName): string
    {
        return $this->orchestrator->generateTemplate($institutionType, $fileName);
    }

    /**
     * Process import file by type with full enterprise features
     */
    public function processImportFileByType(
        $file, 
        InstitutionType $institutionType, 
        array $options = [], 
        ?Request $request = null
    ): array {
        // Set default options if not provided
        $defaultOptions = [
            'skip_duplicate_detection' => false,
            'duplicate_handling' => [
                'high_severity' => 'skip',
                'medium_severity' => 'warn',
                'name_conflict' => 'auto_rename', 
                'code_conflict' => 'auto_generate'
            ],
            'validation_level' => 'strict',
            'max_errors_before_abort' => 100
        ];

        $mergedOptions = array_merge($defaultOptions, $options);

        // Process the import with enhanced error handling
        $results = $this->orchestrator->processImport($file, $institutionType, $mergedOptions, $request);
        
        // Add detailed error analysis for better user feedback
        if (!empty($results['errors']) || !empty($results['warnings'])) {
            $analyzer = app(\App\Services\Import\ImportErrorAnalyzerService::class);
            $analysis = $analyzer->analyzeImportResults($results);
            
            // Enhance results with analysis
            $results['error_analysis'] = $analysis;
            $results['detailed_report'] = $analyzer->generateErrorReport($results);
            
            \Log::info('Import completed with detailed error analysis', [
                'institution_type' => $institutionType->key,
                'success_count' => $results['success'] ?? 0,
                'error_count' => count($results['errors'] ?? []),
                'warning_count' => count($results['warnings'] ?? []),
                'success_rate' => $analysis['overall_success']['success_rate'] ?? 0
            ]);
        }

        return $results;
    }

    /**
     * Get orchestrator statistics (New method)
     */
    public function getStatistics(): array
    {
        return $this->orchestrator->getStatistics();
    }

    /**
     * Validate file before processing (New method) 
     */
    public function validateImportFile($file): array
    {
        $parser = new \App\Services\Import\InstitutionExcelParserService();
        return $parser->validateFileStructure($file);
    }

    /**
     * Get file information (New method)
     */
    public function getFileInfo($file): array
    {
        $parser = new \App\Services\Import\InstitutionExcelParserService();
        return $parser->getFileInfo($file);
    }

    /**
     * Get available processors and their handled types (New method)
     */
    public function getProcessorInfo(): array
    {
        $factory = new \App\Services\Import\InstitutionTypeProcessorFactory();
        return [
            'processors' => count($factory->getAllProcessors()),
            'handled_types' => $factory->getAllHandledTypes(),
            'processor_mapping' => $this->getProcessorMapping($factory)
        ];
    }

    /**
     * Get processor mapping for different institution types
     */
    private function getProcessorMapping($factory): array
    {
        $mapping = [];
        $allTypes = InstitutionType::all();
        
        foreach ($allTypes as $type) {
            $mapping[$type->key] = [
                'processor' => $factory->getProcessorName($type->key),
                'has_specific_processor' => $factory->hasSpecificProcessor($type->key),
                'headers' => $factory->getHeadersForType($type->key)
            ];
        }
        
        return $mapping;
    }
}