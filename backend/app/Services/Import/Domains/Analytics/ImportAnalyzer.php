<?php

namespace App\Services\Import\Domains\Analytics;

/**
 * Import Analyzer Service
 *
 * Analyzes import results to generate statistics.
 * Parses emoji-prefixed log messages to extract metrics.
 */
class ImportAnalyzer
{
    /**
     * Analyze import results to generate statistics
     *
     * Parses import result messages by emoji prefixes:
     * - ✅ Success
     * - ⏭️/⚠️ Skip
     * - ❌ Error
     *
     * @return array Statistics array with counts and breakdowns
     */
    public function analyzeImportResults(array $importResults): array
    {
        $successCount = 0;
        $skipCount = 0;
        $errorCount = 0;
        $schoolAdminCount = 0;
        $skipReasons = [];
        $errorTypes = [];

        foreach ($importResults as $result) {
            if (strpos($result, '✅') === 0) {
                $successCount++;
                // Check if school admin was created
                if (strpos($result, '👤 Məktəb Administratoru:') !== false) {
                    $schoolAdminCount++;
                }
            } elseif (strpos($result, '✋') === 0 || strpos($result, '⏭️') === 0 || strpos($result, '⚠️') === 0) {
                $skipCount++;
                // Extract skip reason
                if (strpos($result, 'Nümunə məlumat') !== false) {
                    $skipReasons['sample'] = ($skipReasons['sample'] ?? 0) + 1;
                } elseif (strpos($result, 'UTIS kodu') !== false && strpos($result, 'artıq') !== false) {
                    $skipReasons['duplicate_utis'] = ($skipReasons['duplicate_utis'] ?? 0) + 1;
                } else {
                    $skipReasons['other'] = ($skipReasons['other'] ?? 0) + 1;
                }
            } elseif (strpos($result, '❌') === 0) {
                $errorCount++;
                // Extract error types
                if (strpos($result, 'UTIS kodu') !== false) {
                    $errorTypes['utis_duplicate'] = ($errorTypes['utis_duplicate'] ?? 0) + 1;
                } elseif (strpos($result, 'Müəssisə kodu') !== false) {
                    $errorTypes['code_duplicate'] = ($errorTypes['code_duplicate'] ?? 0) + 1;
                } elseif (strpos($result, 'İstifadəçi adı') !== false) {
                    $errorTypes['username_duplicate'] = ($errorTypes['username_duplicate'] ?? 0) + 1;
                } elseif (strpos($result, 'Email') !== false) {
                    $errorTypes['email_duplicate'] = ($errorTypes['email_duplicate'] ?? 0) + 1;
                } else {
                    $errorTypes['other'] = ($errorTypes['other'] ?? 0) + 1;
                }
            }
        }

        return [
            'total_processed' => count($importResults),
            'success_count' => $successCount,
            'skip_count' => $skipCount,
            'error_count' => $errorCount,
            'school_admin_count' => $schoolAdminCount,
            'skip_reasons' => $skipReasons,
            'error_types' => $errorTypes,
        ];
    }
}
