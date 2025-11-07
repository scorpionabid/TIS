<?php

namespace App\Services\Import\Domains\Duplicates;

use App\Models\Institution;

/**
 * Duplicate Detector Service
 *
 * Detects duplicate institutions by UTIS code.
 * Supports both database queries and batch cache lookups for performance.
 */
class DuplicateDetector
{
    /**
     * Batch cache for existing institutions by UTIS code
     *
     * @var array
     */
    protected array $existingInstitutionsByUtis = [];

    /**
     * Check if UTIS code already exists in database
     *
     * Used for small dataset imports (<50 rows).
     *
     * @param string $utisCode
     * @return bool
     */
    public function isDuplicateUtisCode(string $utisCode): bool
    {
        if (empty($utisCode)) {
            return false;
        }

        return Institution::where('utis_code', $utisCode)->exists();
    }

    /**
     * Get institution by UTIS code from database
     *
     * @param string $utisCode
     * @return Institution|null
     */
    public function getInstitutionByUtisCode(string $utisCode): ?Institution
    {
        return Institution::where('utis_code', $utisCode)->first();
    }

    /**
     * Batch check for duplicate UTIS codes using pre-loaded cache
     *
     * Used for large dataset imports (>50 rows) to avoid N+1 queries.
     *
     * @param string $utisCode
     * @return bool
     */
    public function isDuplicateUtisCodeBatch(string $utisCode): bool
    {
        if (empty($utisCode)) {
            return false;
        }

        return isset($this->existingInstitutionsByUtis[$utisCode]);
    }

    /**
     * Get institution by UTIS code from batch cache
     *
     * @param string $utisCode
     * @return Institution|null
     */
    public function getInstitutionByUtisCodeBatch(string $utisCode): ?Institution
    {
        if (empty($utisCode) || !isset($this->existingInstitutionsByUtis[$utisCode])) {
            return null;
        }

        $data = $this->existingInstitutionsByUtis[$utisCode];
        $institution = new Institution();
        $institution->fill($data);
        return $institution;
    }

    /**
     * Preload institutions by UTIS codes for batch processing
     *
     * Loads institutions in bulk using whereIn() to prevent N+1 queries.
     *
     * @param array $utisCodes
     * @return void
     */
    public function preloadInstitutionsByUtis(array $utisCodes): void
    {
        if (empty($utisCodes)) {
            return;
        }

        $this->existingInstitutionsByUtis = Institution::whereIn('utis_code', $utisCodes)
            ->get()
            ->keyBy('utis_code')
            ->toArray();
    }

    /**
     * Reset batch cache
     *
     * @return void
     */
    public function resetBatchCache(): void
    {
        $this->existingInstitutionsByUtis = [];
    }

    /**
     * Get batch cache
     *
     * @return array
     */
    public function getBatchCache(): array
    {
        return $this->existingInstitutionsByUtis;
    }
}
