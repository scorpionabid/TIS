<?php

namespace App\Services\Import\Domains\Formatting;

use App\Models\Institution;

/**
 * Message Formatter Service
 *
 * Formats log messages for import results with emojis and user-friendly text.
 * Translates technical errors to Azerbaijani.
 */
class MessageFormatter
{
    /**
     * Format skip message with detailed reason
     */
    public function formatSkipMessage(array $rowData, string $reason): string
    {
        return "⏭️ {$rowData['row']}: Keçildi ({$reason})";
    }

    /**
     * Format duplicate message with existing institution info
     */
    public function formatDuplicateMessage(array $rowData, ?Institution $existingInstitution): string
    {
        return "⚠️ {$rowData['row']}: Dublikat UTIS kodu";
    }

    /**
     * Format success message with detailed information
     */
    public function formatSuccessMessage(array $rowData, Institution $institution, ?array $schoolAdminInfo = null): string
    {
        $message = "✅ {$rowData['row']}: {$institution->name}";

        if ($schoolAdminInfo && $schoolAdminInfo['username'] !== $schoolAdminInfo['original_username']) {
            $message .= " + Admin({$schoolAdminInfo['username']})";
        } elseif ($schoolAdminInfo) {
            $message .= ' + Admin';
        }

        return $message;
    }

    /**
     * Format error message with user-friendly explanation
     *
     * Translates technical database errors to Azerbaijani:
     * - UNIQUE constraint failures
     * - NOT NULL constraint failures
     * - Role assignment errors
     */
    public function formatErrorMessage(array $rowData, \Exception $e): string
    {
        $errorMessage = $e->getMessage();

        if (strpos($errorMessage, 'UNIQUE constraint failed: institutions.utis_code') !== false) {
            return "❌ {$rowData['row']}: UTIS kodu dublkatı";
        }

        if (strpos($errorMessage, 'UNIQUE constraint failed: institutions.institution_code') !== false) {
            return "❌ {$rowData['row']}: Müəssisə kodu dublkatı";
        }

        if (strpos($errorMessage, 'NOT NULL constraint failed: institutions.contact_info') !== false) {
            return "❌ {$rowData['row']}: Əlaqə məlumatı tələb olunur";
        }

        if (strpos($errorMessage, 'There is no role named') !== false) {
            return "❌ {$rowData['row']}: Admin rol problemi";
        }

        if (strpos($errorMessage, 'UNIQUE constraint failed: users.username') !== false) {
            return "❌ {$rowData['row']}: İstifadəçi adı dublkatı";
        }

        if (strpos($errorMessage, 'UNIQUE constraint failed: users.email') !== false) {
            return "❌ {$rowData['row']}: Email dublkatı";
        }

        return "❌ {$rowData['row']}: Xəta";
    }
}
