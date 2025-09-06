<?php

namespace App\Services\Import;

use App\Models\InstitutionType;

class InstitutionTypeProcessorFactory
{
    private array $processors = [];
    private ?GenericTypeProcessor $genericProcessor = null;

    public function __construct()
    {
        $this->initializeProcessors();
    }

    /**
     * Initialize all available processors
     */
    private function initializeProcessors(): void
    {
        $this->processors = [
            new SchoolTypeProcessor(),
            new KindergartenTypeProcessor(),
            new AdministrativeTypeProcessor(),
        ];

        $this->genericProcessor = new GenericTypeProcessor();
    }

    /**
     * Get processor for specific institution type
     */
    public function getProcessor(string $institutionTypeKey): InstitutionTypeProcessorInterface
    {
        // Find specific processor first
        foreach ($this->processors as $processor) {
            if ($processor->canHandle($institutionTypeKey)) {
                return $processor;
            }
        }

        // Return generic processor as fallback
        return $this->genericProcessor;
    }

    /**
     * Get processor for institution type model
     */
    public function getProcessorForType(InstitutionType $institutionType): InstitutionTypeProcessorInterface
    {
        return $this->getProcessor($institutionType->key);
    }

    /**
     * Get all available processors
     */
    public function getAllProcessors(): array
    {
        return array_merge($this->processors, [$this->genericProcessor]);
    }

    /**
     * Get handled types by all processors
     */
    public function getAllHandledTypes(): array
    {
        $allTypes = [];
        
        foreach ($this->processors as $processor) {
            $allTypes = array_merge($allTypes, $processor->getHandledTypes());
        }
        
        // Add generic types
        $allTypes = array_merge($allTypes, $this->genericProcessor->getHandledTypes());
        
        return array_unique($allTypes);
    }

    /**
     * Check if a type has a specific processor (not generic)
     */
    public function hasSpecificProcessor(string $institutionTypeKey): bool
    {
        foreach ($this->processors as $processor) {
            if ($processor->canHandle($institutionTypeKey)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get processor type name for debugging/logging
     */
    public function getProcessorName(string $institutionTypeKey): string
    {
        $processor = $this->getProcessor($institutionTypeKey);
        return get_class($processor);
    }

    /**
     * Register a new processor (for extensibility)
     */
    public function registerProcessor(InstitutionTypeProcessorInterface $processor): void
    {
        $this->processors[] = $processor;
    }

    /**
     * Get headers for specific institution type
     */
    public function getHeadersForType(string $institutionTypeKey): array
    {
        $processor = $this->getProcessor($institutionTypeKey);
        return $processor->getHeaders();
    }

    /**
     * Get sample data for specific institution type
     */
    public function getSampleDataForType(string $institutionTypeKey): array
    {
        $processor = $this->getProcessor($institutionTypeKey);
        return $processor->getSampleData();
    }

    /**
     * Process row data for specific institution type
     */
    public function processRowForType(array $row, string $institutionTypeKey, int $rowNum): array
    {
        $processor = $this->getProcessor($institutionTypeKey);
        
        // Special handling for generic processor with explicit type
        if ($processor instanceof GenericTypeProcessor && !$this->hasSpecificProcessor($institutionTypeKey)) {
            return $processor->processRowDataWithType($row, $institutionTypeKey, $rowNum);
        }
        
        return $processor->processRowData($row, $rowNum);
    }
}