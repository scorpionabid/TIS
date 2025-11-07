<?php

namespace App\Services\Import\Domains\Formatting;

use App\Services\Import\Domains\Analytics\ImportAnalyzer;

/**
 * Response Builder Service
 *
 * Builds API responses with statistics and user-friendly messages.
 * Formats success and error responses for frontend consumption.
 */
class ResponseBuilder
{
    public function __construct(
        protected ImportAnalyzer $importAnalyzer
    ) {}

    /**
     * Build success response with detailed statistics
     *
     * @param int $importedCount
     * @param array $importResults
     * @return array
     */
    public function buildSuccessResponse(int $importedCount, array $importResults): array
    {
        $statistics = $this->importAnalyzer->analyzeImportResults($importResults);

        $summaryMessage = $this->buildSummaryMessage($importedCount, $statistics);

        return [
            'success' => true,
            'message' => $summaryMessage,
            'imported_count' => $importedCount,
            'statistics' => $statistics,
            'details' => $importResults
        ];
    }

    /**
     * Build comprehensive summary message
     *
     * @param int $importedCount
     * @param array $statistics
     * @return string
     */
    public function buildSummaryMessage(int $importedCount, array $statistics): string
    {
        $totalProcessed = $statistics['total_processed'];

        if ($totalProcessed > 50) {
            $chunkCount = ceil($totalProcessed / 25);
            $message = "🚀 Böyük idxal tamamlandı ({$chunkCount} chunk): {$importedCount} müəssisə əlavə edildi";
        } else {
            $message = "📊 İdxal tamamlandı: {$importedCount} müəssisə əlavə edildi";
        }

        if ($statistics['school_admin_count'] > 0) {
            $message .= " ({$statistics['school_admin_count']} admin)";
        }

        if ($statistics['skip_count'] > 0) {
            $message .= ", {$statistics['skip_count']} keçildi";
        }

        if ($statistics['error_count'] > 0) {
            $message .= ", {$statistics['error_count']} xəta";
        }

        // Add performance note for large imports
        if ($totalProcessed > 50) {
            $message .= "\n💡 Böyük dataset chunk məntiqilə işləndi (25 sətir/chunk)";
        }

        return $message;
    }

    /**
     * Build error response
     *
     * Flattens nested validation errors for frontend consumption.
     *
     * @param string $message
     * @param array $errors
     * @param array $importResults
     * @return array
     */
    public function buildErrorResponse(string $message, array $errors = [], array $importResults = []): array
    {
        // Convert associative validation errors to simple array for frontend
        $simpleErrors = [];
        if (!empty($errors)) {
            foreach ($errors as $key => $errorList) {
                if (is_array($errorList)) {
                    // Nested validation errors (like from Validator)
                    foreach ($errorList as $field => $messages) {
                        if (is_array($messages)) {
                            $simpleErrors[] = "{$key} - {$field}: " . implode(', ', $messages);
                        } else {
                            $simpleErrors[] = "{$key} - {$field}: {$messages}";
                        }
                    }
                } else {
                    // Simple error messages
                    $simpleErrors[] = is_string($key) ? "{$key}: {$errorList}" : $errorList;
                }
            }
        }

        return [
            'success' => false,
            'message' => $message,
            'errors' => $simpleErrors,
            'details' => $importResults
        ];
    }
}
