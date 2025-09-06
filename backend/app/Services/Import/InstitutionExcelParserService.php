<?php

namespace App\Services\Import;

use PhpOffice\PhpSpreadsheet\IOFactory;
use App\Services\BaseService;
use Illuminate\Http\UploadedFile;
use Exception;

class InstitutionExcelParserService extends BaseService
{
    /**
     * Parse Excel file and extract clean data
     */
    public function parseExcelFile(UploadedFile $file): array
    {
        try {
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $rawData = $sheet->toArray();
            
            $headerRowIndex = $this->findHeaderRow($rawData);
            $dataRows = $this->extractDataRows($rawData, $headerRowIndex);
            
            return [
                'success' => true,
                'header_row' => $headerRowIndex,
                'data_rows' => $dataRows,
                'total_rows' => count($dataRows),
                'raw_data' => $rawData // Keep for debugging if needed
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Fayl oxunarkən xəta: ' . $e->getMessage(),
                'header_row' => -1,
                'data_rows' => [],
                'total_rows' => 0
            ];
        }
    }

    /**
     * Find header row in the Excel data
     */
    public function findHeaderRow(array $data): int
    {
        foreach ($data as $index => $row) {
            // Look for data start marker
            if (isset($row[0]) && strpos($row[0], 'DATA BAŞLANĞICI') !== false) {
                return $index + 1; // Next row should be headers
            }
            
            // Alternative: look for first row starting with "ID" 
            if (isset($row[0]) && strpos($row[0], 'ID (avtomatik)') !== false) {
                return $index;
            }
            
            // Fallback: look for typical header patterns
            if (isset($row[1]) && strpos($row[1], 'Ad') !== false && 
                isset($row[3]) && (strpos($row[3], 'Valideyn') !== false || strpos($row[3], 'Növ') !== false)) {
                return $index;
            }
        }
        
        // If no specific markers found, assume first row is header
        return 0;
    }

    /**
     * Extract data rows after header
     */
    public function extractDataRows(array $data, int $headerRowIndex): array
    {
        if ($headerRowIndex === -1) {
            throw new Exception("Header sətiri tapılmadı. Template formatını yoxlayın.");
        }
        
        // Data starts after header row
        $dataStartIndex = $headerRowIndex + 1;
        $dataRows = array_slice($data, $dataStartIndex);
        
        // Filter out empty rows and clean data
        $cleanedRows = [];
        foreach ($dataRows as $index => $row) {
            $cleanedRow = $this->cleanRow($row, $index + $dataStartIndex + 1);
            if ($cleanedRow !== null) {
                $cleanedRows[] = [
                    'original_row_number' => $index + $dataStartIndex + 1,
                    'excel_row_number' => $index + $dataStartIndex + 2, // Excel rows start from 1, +1 for header
                    'data' => $cleanedRow
                ];
            }
        }
        
        return $cleanedRows;
    }

    /**
     * Clean and validate row data
     */
    private function cleanRow(array $row, int $rowNumber): ?array
    {
        // Skip completely empty rows
        $hasData = false;
        foreach ($row as $cell) {
            if (!empty(trim($cell ?? ''))) {
                $hasData = true;
                break;
            }
        }
        
        if (!$hasData) {
            return null; // Skip empty rows
        }
        
        // Clean each cell - trim whitespace and handle null values
        $cleanedRow = [];
        foreach ($row as $index => $cell) {
            $cleanedValue = trim($cell ?? '');
            
            // Convert empty strings to null for consistency
            $cleanedRow[$index] = $cleanedValue === '' ? null : $cleanedValue;
        }
        
        return $cleanedRow;
    }

    /**
     * Validate file structure before processing
     */
    public function validateFileStructure(UploadedFile $file): array
    {
        $errors = [];
        $warnings = [];
        
        // Check file extension
        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, ['xlsx', 'xls'])) {
            $errors[] = "Fayl formatı dəstəklənmir. Yalnız .xlsx və .xls faylları qəbul edilir.";
        }
        
        // Check file size (50MB max for superadmin, less for others - will be handled by permission service)
        $maxSize = 50 * 1024 * 1024; // 50MB in bytes
        if ($file->getSize() > $maxSize) {
            $warnings[] = "Fayl ölçüsü böyükdür ({$this->formatFileSize($file->getSize())}). İstifadəçi icazələri yoxlanılacaq.";
        }
        
        // Try to parse file structure
        try {
            $parseResult = $this->parseExcelFile($file);
            if (!$parseResult['success']) {
                $errors[] = $parseResult['error'];
            } else {
                if ($parseResult['total_rows'] === 0) {
                    $warnings[] = "Faylda emal ediləcək məlumat tapılmadı.";
                }
                if ($parseResult['header_row'] === -1) {
                    $errors[] = "Header sətiri tapılmadı. Template formatını yoxlayın.";
                }
            }
        } catch (Exception $e) {
            $errors[] = "Fayl strukturu yoxlanarkən xəta: " . $e->getMessage();
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings
        ];
    }

    /**
     * Get file information for logging and analysis
     */
    public function getFileInfo(UploadedFile $file): array
    {
        return [
            'original_name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'size_formatted' => $this->formatFileSize($file->getSize()),
            'mime_type' => $file->getMimeType(),
            'extension' => $file->getClientOriginalExtension(),
            'uploaded_at' => now()->toISOString()
        ];
    }

    /**
     * Format file size in human readable format
     */
    private function formatFileSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= (1 << (10 * $pow));
        
        return round($bytes, 1) . ' ' . $units[$pow];
    }

    /**
     * Extract headers from parsed data for validation
     */
    public function extractHeaders(array $parseResult): array
    {
        if (!$parseResult['success'] || $parseResult['header_row'] === -1) {
            return [];
        }
        
        $headerRowIndex = $parseResult['header_row'];
        $rawData = $parseResult['raw_data'];
        
        if (!isset($rawData[$headerRowIndex])) {
            return [];
        }
        
        $headers = [];
        foreach ($rawData[$headerRowIndex] as $index => $header) {
            $cleanHeader = trim($header ?? '');
            if (!empty($cleanHeader)) {
                $headers[$index] = $cleanHeader;
            }
        }
        
        return $headers;
    }

    /**
     * Detect template type from headers
     */
    public function detectTemplateType(array $headers): ?string
    {
        // Convert headers to lowercase for comparison
        $lowerHeaders = array_map('strtolower', $headers);
        $headerString = implode(' ', $lowerHeaders);
        
        // Check for institution-specific fields
        if (strpos($headerString, 'şagird') !== false || strpos($headerString, 'sinif') !== false) {
            return 'school'; // secondary_school, primary_school, etc.
        }
        
        if (strpos($headerString, 'uşaq') !== false || strpos($headerString, 'tərbiyəçi') !== false) {
            return 'kindergarten';
        }
        
        if (strpos($headerString, 'regional') !== false || strpos($headerString, 'idarə') !== false) {
            return 'regional_department';
        }
        
        if (strpos($headerString, 'sektor') !== false) {
            return 'sector_office';
        }
        
        return 'generic'; // Default template type
    }
}