<?php

namespace App\Services\Import\Domains\StateManagement;

/**
 * Import State Manager Service
 *
 * Manages import state and result tracking.
 * Provides centralized state reset for new import operations.
 */
class ImportStateManager
{
    /**
     * Import results array
     */
    protected array $importResults = [];

    /**
     * Reset import state for new operation
     *
     * Clears:
     * - Import results array
     *
     * Note: Validation errors managed by ImportDataValidator
     * Note: Batch caches managed by BatchOptimizer and DuplicateDetector
     */
    public function resetImportState(): void
    {
        $this->importResults = [];
    }

    /**
     * Get import results
     */
    public function getImportResults(): array
    {
        return $this->importResults;
    }

    /**
     * Add result message
     */
    public function addResult(string $message): void
    {
        $this->importResults[] = $message;
    }

    /**
     * Add multiple result messages
     */
    public function addResults(array $messages): void
    {
        $this->importResults = array_merge($this->importResults, $messages);
    }

    /**
     * Get results count
     */
    public function getResultsCount(): int
    {
        return count($this->importResults);
    }
}
