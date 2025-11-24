<?php

namespace App\Services\Import\Domains\Processing;

use App\Models\Institution;
use App\Models\User;

/**
 * Batch Optimizer Service
 *
 * Preloads data in batches to prevent N+1 queries during import processing.
 * Critical for performance when importing large datasets.
 */
class BatchOptimizer
{
    /**
     * Cache arrays for batch processing
     */
    protected array $existingInstitutionsByUtis = [];

    protected array $existingInstitutionsByCode = [];

    protected array $existingUsersByUsername = [];

    protected array $existingUsersByEmail = [];

    /**
     * Pre-load existing data to avoid N+1 queries
     *
     * Loads all relevant data for a chunk using whereIn() queries.
     * This is called before processing each chunk.
     */
    public function preloadExistingData(array $chunk): void
    {
        // Get all UTIS codes from chunk
        $utisCodes = array_filter(array_column($chunk, 'utis_code'));

        // Get all institution codes from chunk
        $institutionCodes = array_filter(array_column($chunk, 'institution_code'));

        // Get all usernames and emails from chunk
        $usernames = [];
        $emails = [];
        foreach ($chunk as $rowData) {
            if (isset($rowData['schooladmin']['username'])) {
                $usernames[] = $rowData['schooladmin']['username'];
            }
            if (isset($rowData['schooladmin']['email'])) {
                $emails[] = $rowData['schooladmin']['email'];
            }
        }

        // Batch load existing institutions
        if (! empty($utisCodes)) {
            $this->existingInstitutionsByUtis = Institution::whereIn('utis_code', $utisCodes)
                ->get()
                ->keyBy('utis_code')
                ->toArray();
        }

        if (! empty($institutionCodes)) {
            $this->existingInstitutionsByCode = Institution::whereIn('institution_code', $institutionCodes)
                ->get()
                ->keyBy('institution_code')
                ->toArray();
        }

        // Batch load existing users
        if (! empty($usernames)) {
            $this->existingUsersByUsername = User::whereIn('username', $usernames)
                ->get()
                ->keyBy('username')
                ->toArray();
        }

        if (! empty($emails)) {
            $this->existingUsersByEmail = User::whereIn('email', $emails)
                ->get()
                ->keyBy('email')
                ->toArray();
        }
    }

    /**
     * Get cache arrays
     */
    public function getCacheArrays(): array
    {
        return [
            'institutions_by_utis' => $this->existingInstitutionsByUtis,
            'institutions_by_code' => $this->existingInstitutionsByCode,
            'users_by_username' => $this->existingUsersByUsername,
            'users_by_email' => $this->existingUsersByEmail,
        ];
    }

    /**
     * Check if username exists in cache
     */
    public function isUsernameCached(string $username): bool
    {
        return isset($this->existingUsersByUsername[$username]);
    }

    /**
     * Check if email exists in cache
     */
    public function isEmailCached(string $email): bool
    {
        return isset($this->existingUsersByEmail[$email]);
    }

    /**
     * Add username to cache
     */
    public function addUsernameToCache(string $username): void
    {
        $this->existingUsersByUsername[$username] = true;
    }

    /**
     * Add email to cache
     */
    public function addEmailToCache(string $email): void
    {
        $this->existingUsersByEmail[$email] = true;
    }

    /**
     * Reset cache arrays
     */
    public function resetCache(): void
    {
        $this->existingInstitutionsByUtis = [];
        $this->existingInstitutionsByCode = [];
        $this->existingUsersByUsername = [];
        $this->existingUsersByEmail = [];
    }
}
