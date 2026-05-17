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
     * @param  \PhpOffice\PhpSpreadsheet\Cell\Cell $cell
     * @return string|null                         Y-m-d format
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
     * Parse date from plain string (CSV üçün — Excel cell yoxdur)
     *
     * @param  string $value  YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY formatları
     * @return string|null    Y-m-d format
     */
    public function parseDateFromString(string $value): ?string
    {
        if (empty(trim($value))) {
            return null;
        }

        try {
            return \Carbon\Carbon::parse($value)->format('Y-m-d');
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Check if row contains sample data
     *
     * Detects common sample indicators:
     * - "nümunə", "sample", "example", "test" in name
     * - "INST001" in institution code
     * - "12345678" as UTIS code
     */
    public function isSampleRow(array $rowData): bool
    {
        // Check for clear sample indicators - be less aggressive
        $sampleIndicators = ['sample', 'example', 'test'];

        $name = strtolower($rowData['name'] ?? '');
        $code = $rowData['institution_code'] ?? '';
        $utisCode = $rowData['utis_code'] ?? '';

        foreach ($sampleIndicators as $indicator) {
            if (stripos($name, $indicator) !== false ||
                stripos($code, $indicator) !== false) {
                return true;
            }
        }

        // Only skip if UTIS is exactly the common sample code
        if ($utisCode === '12345678' || $utisCode === '123456789') {
            return true;
        }

        // Check for INST001 pattern only if it's exactly INST001 (not BAG001, etc.)
        if ($code === 'INST001') {
            return true;
        }

        return false;
    }
}
