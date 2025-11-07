<?php

namespace App\Services\Import\Domains\Parsing;

use App\Models\Institution;
use PhpOffice\PhpSpreadsheet\Shared\Date;

/**
 * Data Type Parser Service
 *
 * Converts Excel cell values to proper PHP data types.
 * Handles dates, booleans, parent IDs, and sample data detection.
 */
class DataTypeParser
{
    /**
     * Parse date from Excel cell
     *
     * @param \PhpOffice\PhpSpreadsheet\Cell\Cell $cell
     * @return string|null Y-m-d format
     */
    public function parseDate($cell): ?string
    {
        $value = $cell->getCalculatedValue();

        if (empty($value)) {
            return null;
        }

        // Check if it's an Excel date serial number
        if (Date::isDateTime($cell)) {
            return Date::excelToDateTimeObject($value)->format('Y-m-d');
        }

        // Try to parse as string date
        try {
            return \Carbon\Carbon::parse($value)->format('Y-m-d');
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Parse active status from text
     *
     * @param mixed $value
     * @return bool
     */
    public function parseActiveStatus($value): bool
    {
        $value = strtolower(trim($value));
        return in_array($value, ['aktiv', 'active', '1', 'true', 'yes']);
    }

    /**
     * Extract parent ID from text (supports both ID and name)
     *
     * Handles formats:
     * - "73" → 73
     * - "73 // Sektor ID" → 73
     * - "Institution Name" → search by name
     *
     * @param string $value
     * @return int|null
     */
    public function parseParentId(string $value): ?int
    {
        if (empty($value)) {
            return null;
        }

        // First, try to extract numeric ID (handles "73 // Sektor ID" format)
        preg_match('/\d+/', $value, $matches);
        if (isset($matches[0])) {
            $potentialId = (int) $matches[0];
            // Verify this ID exists
            if (Institution::where('id', $potentialId)->exists()) {
                return $potentialId;
            }
        }

        // If no valid ID found, try to find by name
        $cleanName = trim($value);
        $institution = Institution::where('name', 'LIKE', "%{$cleanName}%")
            ->orWhere('short_name', 'LIKE', "%{$cleanName}%")
            ->where('is_active', true)
            ->first();

        return $institution ? $institution->id : null;
    }

    /**
     * Check if row contains sample data
     *
     * Detects common sample indicators:
     * - "nümunə", "sample", "example", "test" in name
     * - "INST001" in institution code
     * - "12345678" as UTIS code
     *
     * @param array $rowData
     * @return bool
     */
    public function isSampleRow(array $rowData): bool
    {
        // Check for common sample indicators
        $sampleIndicators = ['nümunə', 'sample', 'example', 'test', 'INST001'];

        $name = strtolower($rowData['name'] ?? '');
        $code = $rowData['institution_code'] ?? '';
        $utisCode = $rowData['utis_code'] ?? '';

        foreach ($sampleIndicators as $indicator) {
            if (stripos($name, $indicator) !== false ||
                stripos($code, $indicator) !== false ||
                $utisCode === '12345678') { // Common sample UTIS code
                return true;
            }
        }

        return false;
    }
}
