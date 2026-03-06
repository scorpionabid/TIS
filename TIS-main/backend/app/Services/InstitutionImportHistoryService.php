<?php

namespace App\Services;

use App\Models\InstitutionImportHistory;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class InstitutionImportHistoryService
{
    /**
     * Create a new import history record
     */
    public function createImportRecord(
        string $institutionType,
        string $fileName,
        int $fileSize,
        array $options = [],
        ?Request $request = null
    ): InstitutionImportHistory {
        $user = Auth::user();
        $fileHash = $this->generateFileHash($fileName, $fileSize, $user->id);

        return InstitutionImportHistory::create([
            'user_id' => $user->id,
            'institution_type' => $institutionType,
            'file_name' => $fileName,
            'file_size' => (string) $fileSize,
            'file_hash' => $fileHash,
            'import_options' => $options,
            'status' => 'pending',
            'started_at' => now(),
            'ip_address' => $request ? $request->ip() : null,
            'user_agent' => $request ? $request->userAgent() : null,
        ]);
    }

    /**
     * Update import record with results
     */
    public function updateImportRecord(
        InstitutionImportHistory $record,
        array $results,
        ?int $processingTimeMs = null
    ): void {
        $errorSummary = $this->categorizeErrors($results['errors'] ?? []);

        $record->update([
            'total_rows' => $results['total_rows'] ?? 0,
            'successful_imports' => $results['success'] ?? 0,
            'failed_imports' => count($results['errors'] ?? []),
            'skipped_duplicates' => $results['skipped'] ?? 0,
            'warnings_count' => count($results['warnings'] ?? []),
            'import_results' => $results,
            'duplicate_analysis' => $results['duplicates'] ?? null,
            'error_summary' => $errorSummary,
            'status' => $this->determineStatus($results),
            'completed_at' => now(),
            'processing_time_ms' => $processingTimeMs,
        ]);
    }

    /**
     * Mark import as failed
     */
    public function markAsFailed(InstitutionImportHistory $record, string $error): void
    {
        $record->update([
            'status' => 'failed',
            'completed_at' => now(),
            'error_summary' => [
                'fatal_error' => [$error],
            ],
        ]);
    }

    /**
     * Get import history for user with pagination
     */
    public function getUserImportHistory(int $userId, array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $query = InstitutionImportHistory::with(['user', 'institutionType'])
            ->byUser($userId)
            ->orderBy('created_at', 'desc');

        // Apply filters
        if (isset($filters['institution_type'])) {
            $query->byInstitutionType($filters['institution_type']);
        }

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to']);
        }

        return $query->paginate(20);
    }

    /**
     * Get import analytics
     */
    public function getImportAnalytics(?int $userId = null, int $days = 30): array
    {
        $query = InstitutionImportHistory::recent($days);

        if ($userId) {
            $query->byUser($userId);
        }

        $records = $query->get();

        return [
            'total_imports' => $records->count(),
            'successful_imports' => $records->where('status', 'completed')->count(),
            'failed_imports' => $records->where('status', 'failed')->count(),
            'total_institutions_created' => $records->sum('successful_imports'),
            'total_errors' => $records->sum('failed_imports'),
            'average_processing_time' => $records->avg('processing_time_ms'),
            'most_common_errors' => $this->getMostCommonErrors($records),
            'institution_type_breakdown' => $records->groupBy('institution_type')
                ->map(function ($group) {
                    return [
                        'count' => $group->count(),
                        'success_rate' => $group->avg('success_rate'),
                    ];
                }),
            'daily_imports' => $this->getDailyImportStats($records),
        ];
    }

    /**
     * Check if file was recently imported
     */
    public function isDuplicateFile(string $fileName, int $fileSize, int $userId): ?InstitutionImportHistory
    {
        $fileHash = $this->generateFileHash($fileName, $fileSize, $userId);

        return InstitutionImportHistory::where('file_hash', $fileHash)
            ->where('user_id', $userId)
            ->where('created_at', '>=', now()->subHours(24)) // Check last 24 hours
            ->where('status', 'completed')
            ->first();
    }

    /**
     * Generate file hash for duplicate detection
     */
    private function generateFileHash(string $fileName, int $fileSize, int $userId): string
    {
        return hash('sha256', $fileName . '|' . $fileSize . '|' . $userId);
    }

    /**
     * Categorize errors by type
     */
    private function categorizeErrors(array $errors): array
    {
        $categories = [
            'validation_errors' => [],
            'duplicate_errors' => [],
            'database_errors' => [],
            'format_errors' => [],
            'other_errors' => [],
        ];

        foreach ($errors as $error) {
            $errorLower = strtolower($error);

            if (str_contains($errorLower, 'duplicate') || str_contains($errorLower, 'unique')) {
                $categories['duplicate_errors'][] = $error;
            } elseif (str_contains($errorLower, 'validation') || str_contains($errorLower, 'required') || str_contains($errorLower, 'invalid')) {
                $categories['validation_errors'][] = $error;
            } elseif (str_contains($errorLower, 'sqlstate') || str_contains($errorLower, 'database')) {
                $categories['database_errors'][] = $error;
            } elseif (str_contains($errorLower, 'format') || str_contains($errorLower, 'parse')) {
                $categories['format_errors'][] = $error;
            } else {
                $categories['other_errors'][] = $error;
            }
        }

        // Remove empty categories
        return array_filter($categories, function ($category) {
            return ! empty($category);
        });
    }

    /**
     * Determine import status based on results
     */
    private function determineStatus(array $results): string
    {
        $success = $results['success'] ?? 0;
        $errors = count($results['errors'] ?? []);

        if ($success > 0 && $errors === 0) {
            return 'completed';
        } elseif ($success > 0 && $errors > 0) {
            return 'completed'; // Partial success is still completed
        } elseif ($success === 0 && $errors > 0) {
            return 'failed';
        }

        return 'completed'; // No data processed, but completed
    }

    /**
     * Get most common errors from records
     */
    private function getMostCommonErrors($records): array
    {
        $errorCounts = [];

        foreach ($records as $record) {
            $errorSummary = $record->error_summary ?? [];
            foreach ($errorSummary as $category => $errors) {
                foreach ($errors as $error) {
                    // Normalize error message
                    $normalizedError = preg_replace('/Sətir \d+:/', 'Sətir X:', $error);
                    $errorCounts[$normalizedError] = ($errorCounts[$normalizedError] ?? 0) + 1;
                }
            }
        }

        arsort($errorCounts);

        return array_slice($errorCounts, 0, 10, true);
    }

    /**
     * Get daily import statistics
     */
    private function getDailyImportStats($records): array
    {
        return $records->groupBy(function ($record) {
            return $record->created_at->format('Y-m-d');
        })->map(function ($group) {
            return [
                'imports' => $group->count(),
                'success_rate' => $group->avg('success_rate'),
                'total_created' => $group->sum('successful_imports'),
            ];
        })->sortBy(function ($value, $key) {
            return $key;
        });
    }
}
