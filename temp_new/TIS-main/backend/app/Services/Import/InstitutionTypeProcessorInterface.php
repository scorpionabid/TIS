<?php

namespace App\Services\Import;

interface InstitutionTypeProcessorInterface
{
    /**
     * Get headers specific to this institution type
     */
    public function getHeaders(): array;

    /**
     * Get sample data for this institution type
     */
    public function getSampleData(): array;

    /**
     * Process row data and convert to institution data array
     */
    public function processRowData(array $row, int $rowNum): array;

    /**
     * Get the institution types this processor handles
     */
    public function getHandledTypes(): array;

    /**
     * Check if this processor can handle the given institution type
     */
    public function canHandle(string $institutionTypeKey): bool;
}
